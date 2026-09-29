/**
 * Offline write queue.
 *
 * Every store in this app is database-first: mutators write straight to
 * Supabase. Before this existed, a failed write was swallowed
 * (`console.error(...); return;`) with no retry and no message, so anything
 * logged without a connection was simply lost.
 *
 * This queue persists failed writes and replays them when the network comes
 * back. It is wired in at the Supabase client (see `config/supabase.ts`), so
 * it covers every write in every store without each call site knowing.
 *
 * IMPORTANT: only *transport* failures are queued. A rejection from PostgREST
 * itself - an unknown column, an RLS denial, a bad uuid - will fail again just
 * as hard on replay, so those are reported instead of retried forever.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@lifesync/write_queue_v1";
const MAX_ATTEMPTS = 8;
const MAX_ENTRIES = 500;

export type WriteOp = "insert" | "update" | "upsert" | "delete" | "rpc";

/** A replayable description of a single write. */
export interface QueuedWrite {
	id: string;
	/** For op "rpc", the function name rather than a table. */
	table: string;
	op: WriteOp;
	/** Arguments passed to the op, e.g. the row(s) for insert. */
	args: any[];
	/** Chained calls recorded after the op, e.g. [["eq", ["id", "…"]], …]. */
	filters: [string, any[]][];
	createdAt: number;
	attempts: number;
	lastError?: string;
}

type Listener = (state: QueueState) => void;

export interface QueueState {
	pending: number;
	pendingDetails: QueueChange[];
	/** Set once a write has been queued; cleared when the queue drains. */
	offline: boolean;
	flushing: boolean;
	/** Writes abandoned because the server rejected them outright. */
	failed: number;
	failedDetails: QueueChange[];
	lastFlushAt: number | null;
}

export interface QueueChange {
	id: string;
	summary: string;
	fields: string[];
	error?: string;
}

let state: QueueState = {
	pending: 0,
	pendingDetails: [],
	offline: false,
	flushing: false,
	failed: 0,
	failedDetails: [],
	lastFlushAt: null,
};

const listeners = new Set<Listener>();

const emit = () => {
	const snapshot = { ...state };
	listeners.forEach((l) => {
		try {
			l(snapshot);
		} catch (err) {
			console.error("writeQueue listener threw:", err);
		}
	});
};

export const subscribe = (listener: Listener): (() => void) => {
	listeners.add(listener);
	listener({ ...state });
	return () => listeners.delete(listener);
};

export const getQueueState = (): QueueState => ({ ...state });

const tableLabels: Record<string, string> = {
	finance_accounts: "Account",
	finance_transactions: "Transaction",
	finance_add_transaction: "Transaction",
	finance_update_transaction: "Transaction",
	finance_delete_transactions: "Transaction",
	user_habits: "Habit",
	habit_logs: "Habit log",
	workout_plans: "Workout plan",
	workout_sessions: "Workout session",
	study_goals: "Study goal",
	study_subjects: "Study subject",
	study_sessions: "Study session",
};

const toChangeDetail = (
	item: Pick<QueuedWrite, "id" | "table" | "op" | "args" | "filters">,
	error?: string,
): QueueChange => {
	// rpc args are [fnName, params]; the row lives inside the params object.
	const payload =
		item.op === "rpc"
			? (item.args[1]?.p_row ?? item.args[1]?.p_updates ?? item.args[1])
			: item.args[0];
	const record = Array.isArray(payload) ? payload[0] : payload;
	const fields =
		record && typeof record === "object"
			? Object.keys(record)
					.filter(
						(key) =>
							![
								"id",
								"user_id",
								"created_at",
								"updated_at",
								"createdAt",
								"updatedAt",
							].includes(key),
					)
					.map((key) => key.replace(/([A-Z])/g, " $1").replace(/_/g, " "))
					.slice(0, 4)
			: [];
	const recordLabel =
		record && typeof record === "object"
			? [record.name, record.title, record.person_name].find(
					(value) => typeof value === "string" && value.trim(),
				)
			: undefined;
	const idFilter = item.filters.find(
		([method, args]) => method === "eq" && args[0] === "id",
	);
	const recordId = record?.id ?? idFilter?.[1][1];
	const rpcVerb = item.op === "rpc" ? item.table.split("_")[1] : "";
	const operation =
		item.op === "insert" || rpcVerb === "add"
			? "Add"
			: item.op === "delete" || rpcVerb === "delete"
				? "Delete"
				: item.op === "update" || rpcVerb === "update"
					? "Update"
					: "Save";
	const tableLabel =
		tableLabels[item.table] ??
		item.table
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	const label = typeof recordLabel === "string" ? recordLabel.trim() : "";
	const idSuffix = typeof recordId === "string" ? recordId.slice(-6) : "";
	const suffix = label
		? `: ${label.slice(0, 48)}`
		: idSuffix
			? ` #${idSuffix}`
			: "";
	return {
		id: item.id,
		summary: `${operation} ${tableLabel}${suffix}`,
		fields,
		error: error?.replace(/\s+/g, " ").slice(0, 160),
	};
};

export const isDuplicatePrimaryKeyInsert = (
	result: any,
	op: WriteOp,
	args: any[],
): boolean => {
	if (op !== "insert" || result?.error?.code !== "23505") return false;
	const payload = args[0];
	if (Array.isArray(payload) || !payload || typeof payload !== "object") {
		return false;
	}
	if (typeof payload.id !== "string") return false;
	const text = `${result.error.details || ""} ${result.error.message || ""}`;
	// PostgREST often returns `details: null`, leaving only the constraint name
	// in `message`, so the id itself can't be required here. It must still be
	// the PRIMARY key: any other unique violation is a genuine rejection.
	if (text.includes("Key (id)=(")) {
		return text.includes(`Key (id)=(${payload.id})`);
	}
	return /_pkey/i.test(text);
};

const isReplayOfCommittedInsert = (result: any, item: QueuedWrite): boolean =>
	isDuplicatePrimaryKeyInsert(result, item.op, item.args);

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const readQueue = async (): Promise<QueuedWrite[]> => {
	try {
		const raw = await AsyncStorage.getItem(QUEUE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		console.error("writeQueue: could not read queue:", err);
		return [];
	}
};

const writeQueueToDisk = async (queue: QueuedWrite[]): Promise<void> => {
	try {
		await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
	} catch (err) {
		console.error("writeQueue: could not persist queue:", err);
	}
};

/**
 * A transport failure. postgrest-js returns status 0 with an empty error code
 * only from its fetch-rejection branch, which makes this an exact test rather
 * than a guess at message text.
 */
export const isOfflineFailure = (result: any): boolean => {
	if (!result?.error) return false;
	if (result.status === 0) return true;
	const code = result.error.code;
	const message: string = result.error.message || "";
	return (
		(code === "" || code === undefined) &&
		/network request failed|failed to fetch|network error|timeout|ECONN/i.test(
			message,
		)
	);
};

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

/**
 * Serializes every read-modify-write of the persisted queue. Without this an
 * `enqueue` overlapping a `flushQueue` writes back a pre-shift snapshot and
 * resurrects entries that were already replayed, re-running committed writes.
 */
let diskLock: Promise<unknown> = Promise.resolve();
const withQueueLock = <T>(fn: () => Promise<T>): Promise<T> => {
	const run = diskLock.then(fn, fn);
	diskLock = run.catch(() => {});
	return run;
};

export const enqueue = async (
	entry: Omit<QueuedWrite, "id" | "createdAt" | "attempts">,
): Promise<void> =>
	withQueueLock(async () => {
		const queue = await readQueue();

		if (queue.length >= MAX_ENTRIES) {
			// Refuse silently-unbounded growth rather than filling the device.
			console.warn("writeQueue: queue is full, dropping oldest entry");
			queue.shift();
		}

		queue.push({
			...entry,
			id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
			createdAt: Date.now(),
			attempts: 0,
		});

		await writeQueueToDisk(queue);
		state = {
			...state,
			pending: queue.length,
			pendingDetails: queue.map((item) => toChangeDetail(item)),
			offline: true,
		};
		emit();
	});

/** Rebuild and run one queued write against the raw (unwrapped) client. */
const replay = async (rawClient: any, item: QueuedWrite): Promise<any> => {
	// The RPCs are written to be idempotent, so a replay of one that already
	// committed is a no-op rather than a double-apply.
	if (item.op === "rpc") return await rawClient.rpc(...item.args);

	let builder = rawClient.from(item.table)[item.op](...item.args);
	for (const [method, args] of item.filters) {
		if (typeof builder[method] !== "function") {
			throw new Error(`writeQueue: unknown builder method "${method}"`);
		}
		builder = builder[method](...args);
	}
	return await builder;
};

/**
 * Replay queued writes oldest-first, stopping at the first transport failure.
 *
 * Order matters: an update to a row whose insert is still queued must not run
 * first, so this never skips ahead past a network failure.
 */
export const flushQueue = async (rawClient: any): Promise<void> => {
	if (state.flushing) return;
	// Claim the guard synchronously: every caller below awaits, and overlapping
	// callers (startup, 30s interval, foreground, fetchFromCloud) would otherwise
	// both read the same queue and replay the same insert twice.
	state = { ...state, flushing: true };
	emit();

	let abandoned = 0;
	const abandonedDetails: QueueChange[] = [];

	// Mutate the persisted queue only under the lock, and always re-read it,
	// so a concurrent `enqueue` is never clobbered by a stale in-memory copy.
	const commit = (fn: (queue: QueuedWrite[]) => QueuedWrite[]): Promise<void> =>
		withQueueLock(async () => {
			await writeQueueToDisk(fn(await readQueue()));
		});
	const drop = (id: string) =>
		commit((queue) => queue.filter((entry) => entry.id !== id));

	try {
		while (true) {
			const head = (await withQueueLock(readQueue))[0];
			if (!head) break;

			let result: any;
			try {
				result = await replay(rawClient, head);
			} catch (err: any) {
				result = { error: { message: String(err?.message || err) }, status: 0 };
			}

			if (isOfflineFailure(result)) {
				// Still offline. Keep this and everything after it, in order.
				const lastError = result.error?.message;
				const attempts = head.attempts + 1;

				if (attempts >= MAX_ATTEMPTS) {
					console.warn(
						`writeQueue: giving up on ${head.op} ${head.table} after ${attempts} attempts`,
					);
					await drop(head.id);
					abandoned += 1;
					abandonedDetails.push(toChangeDetail(head, lastError));
					continue;
				}

				await commit((queue) =>
					queue.map((entry) =>
						entry.id === head.id ? { ...entry, attempts, lastError } : entry,
					),
				);
				break;
			}

			if (isReplayOfCommittedInsert(result, head)) {
				console.info(
					`writeQueue: ${head.op} on ${head.table} already exists; treating replay as saved`,
				);
			} else if (result?.error) {
				// The server understood it and said no. Retrying cannot help.
				console.error(
					`writeQueue: dropping ${head.op} on ${head.table} - server rejected it:`,
					result.error.message,
				);
				abandoned += 1;
				abandonedDetails.push(toChangeDetail(head, result.error.message));
			}

			await drop(head.id);
		}
	} finally {
		const remaining = await readQueue();
		state = {
			...state,
			flushing: false,
			pending: remaining.length,
			pendingDetails: remaining.map((item) => toChangeDetail(item)),
			offline: remaining.length > 0,
			failed: state.failed + abandoned,
			failedDetails: [...state.failedDetails, ...abandonedDetails].slice(-10),
			lastFlushAt: Date.now(),
		};
		emit();
	}
};

/** Called once at startup so the badge reflects writes queued in a past run. */
export const hydrateQueueState = async (): Promise<void> => {
	const queue = await readQueue();
	state = {
		...state,
		pending: queue.length,
		pendingDetails: queue.map((item) => toChangeDetail(item)),
		offline: queue.length > 0,
	};
	emit();
};

/**
 * A write the server understood and refused - a bad uuid, an unknown column,
 * an RLS denial. Retrying cannot help, so it is counted and surfaced rather
 * than queued. Before this, these failures only ever reached console.error.
 */
export const noteRejectedWrite = (
	table: string,
	op: WriteOp,
	message: string,
	args: any[] = [],
	filters: [string, any[]][] = [],
): void => {
	console.error(`writeQueue: ${op} on ${table} rejected by server:`, message);
	const item = {
		id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
		table,
		op,
		args,
		filters,
	};
	state = {
		...state,
		failed: state.failed + 1,
		failedDetails: [
			...state.failedDetails,
			toChangeDetail(item, message),
		].slice(-10),
	};
	emit();
};

export const clearFailedCount = (): void => {
	state = { ...state, failed: 0, failedDetails: [] };
	emit();
};

/** Drops everything. Only for an explicit user "discard pending changes". */
export const discardQueue = async (): Promise<void> => {
	await AsyncStorage.removeItem(QUEUE_KEY);
	state = {
		...state,
		pending: 0,
		pendingDetails: [],
		offline: false,
		failed: 0,
		failedDetails: [],
	};
	emit();
};
