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

export type WriteOp = "insert" | "update" | "upsert" | "delete";

/** A replayable description of a single write. */
export interface QueuedWrite {
	id: string;
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
	/** Set once a write has been queued; cleared when the queue drains. */
	offline: boolean;
	flushing: boolean;
	/** Writes abandoned because the server rejected them outright. */
	failed: number;
	lastFlushAt: number | null;
}

let state: QueueState = {
	pending: 0,
	offline: false,
	flushing: false,
	failed: 0,
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
			message
		)
	);
};

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

export const enqueue = async (
	entry: Omit<QueuedWrite, "id" | "createdAt" | "attempts">
): Promise<void> => {
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
	state = { ...state, pending: queue.length, offline: true };
	emit();
};

/** Rebuild and run one queued write against the raw (unwrapped) client. */
const replay = async (rawClient: any, item: QueuedWrite): Promise<any> => {
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

	let queue = await readQueue();
	if (queue.length === 0) {
		if (state.offline || state.pending !== 0) {
			state = { ...state, pending: 0, offline: false };
			emit();
		}
		return;
	}

	state = { ...state, flushing: true };
	emit();

	let abandoned = 0;

	try {
		while (queue.length > 0) {
			const item = queue[0];
			let result: any;

			try {
				result = await replay(rawClient, item);
			} catch (err: any) {
				result = { error: { message: String(err?.message || err) }, status: 0 };
			}

			if (isOfflineFailure(result)) {
				// Still offline. Keep this and everything after it, in order.
				item.attempts += 1;
				item.lastError = result.error?.message;
				if (item.attempts >= MAX_ATTEMPTS) {
					console.warn(
						`writeQueue: giving up on ${item.op} ${item.table} after ${item.attempts} attempts`
					);
					queue.shift();
					abandoned += 1;
					await writeQueueToDisk(queue);
					continue;
				}
				await writeQueueToDisk(queue);
				break;
			}

			if (result?.error) {
				// The server understood it and said no. Retrying cannot help.
				console.error(
					`writeQueue: dropping ${item.op} on ${item.table} - server rejected it:`,
					result.error.message
				);
				abandoned += 1;
			}

			queue.shift();
			await writeQueueToDisk(queue);
		}
	} finally {
		const remaining = (await readQueue()).length;
		state = {
			...state,
			flushing: false,
			pending: remaining,
			offline: remaining > 0,
			failed: state.failed + abandoned,
			lastFlushAt: Date.now(),
		};
		emit();
	}
};

/** Called once at startup so the badge reflects writes queued in a past run. */
export const hydrateQueueState = async (): Promise<void> => {
	const queue = await readQueue();
	state = { ...state, pending: queue.length, offline: queue.length > 0 };
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
	message: string
): void => {
	console.error(`writeQueue: ${op} on ${table} rejected by server:`, message);
	state = { ...state, failed: state.failed + 1 };
	emit();
};

export const clearFailedCount = (): void => {
	state = { ...state, failed: 0 };
	emit();
};

/** Drops everything. Only for an explicit user "discard pending changes". */
export const discardQueue = async (): Promise<void> => {
	await AsyncStorage.removeItem(QUEUE_KEY);
	state = { ...state, pending: 0, offline: false, failed: 0 };
	emit();
};
