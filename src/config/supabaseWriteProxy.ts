/**
 * Makes every Supabase write queue-aware.
 *
 * The stores call `supabase.from(t).insert(x).eq(...)` in ~115 places. Rather
 * than change each one, this wraps `from()` so write builders record what they
 * are doing; if the request fails for transport reasons the write is persisted
 * to the offline queue and replayed later.
 *
 * Reads are left completely alone - a failed read should surface as a failed
 * read, and `financeStoreDB.initialize` already handles that.
 */

import {
	enqueue,
	isOfflineFailure,
	noteRejectedWrite,
	QueuedWrite,
	WriteOp,
} from "../services/writeQueue";

const WRITE_OPS: WriteOp[] = ["insert", "update", "upsert", "delete"];

/**
 * Builder methods that narrow *which rows* a write touches, or shape its
 * response. These must be replayed with the write or an `update` meant for one
 * row would hit the whole table. Anything not on this list is passed straight
 * through and, if the write ends up queued, is recorded so replay matches.
 */
const REPLAYABLE = new Set([
	"eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
	"contains", "containedBy", "not", "or", "filter", "match",
	"select", "order", "limit", "single", "maybeSingle", "range", "csv",
]);

type Pending = { table: string; op: WriteOp; args: any[]; filters: [string, any[]][] };

const describe = (p: Pending) =>
	`${p.op} on ${p.table}${p.filters.length ? ` (${p.filters.length} filters)` : ""}`;

/**
 * Wraps a PostgREST builder so the chain is recorded and the final await is
 * intercepted. Filter methods return the same builder instance, which is what
 * lets one proxy follow the whole chain.
 */
const wrapBuilder = (builder: any, pending: Pending): any =>
	new Proxy(builder, {
		get(target, prop) {
			// Intercept the await. Note `target` is the RAW builder, so calling
			// its own `then` here does not re-enter this proxy.
			if (prop === "then") {
				return (onFulfilled?: any, onRejected?: any) =>
					execute(target, pending).then(onFulfilled, onRejected);
			}

			// Read against the target, never the proxy: passing the proxy as the
			// receiver breaks any accessor that expects the real instance.
			const value = Reflect.get(target, prop);
			if (typeof value !== "function") return value;

			return (...args: any[]) => {
				const result = value.apply(target, args);
				// Chainable call: same builder back, so keep following it.
				if (result === target) {
					if (typeof prop === "string" && REPLAYABLE.has(prop)) {
						pending.filters.push([prop, args]);
					}
					return wrapBuilder(target, pending);
				}
				return result;
			};
		},
	});

const execute = async (rawBuilder: any, pending: Pending): Promise<any> => {
	let result: any;

	try {
		result = await Promise.resolve(rawBuilder);
	} catch (err: any) {
		// postgrest-js normally resolves rather than throws, but a polyfill or
		// an aborted request can still reject. Treat it as a transport failure.
		result = { data: null, error: { message: String(err?.message || err), code: "" }, status: 0 };
	}

	if (!isOfflineFailure(result)) {
		// Understood and refused. The caller still gets its error (stores bail on
		// it as before), but now the user is told instead of only the console.
		if (result?.error) {
			noteRejectedWrite(pending.table, pending.op, result.error.message);
		}
		return result;
	}

	// Offline: keep the write for later and tell the caller it succeeded, so
	// the store applies its optimistic local state instead of discarding the
	// user's action.
	try {
		await enqueue({
			table: pending.table,
			op: pending.op,
			args: pending.args,
			filters: pending.filters,
		} as Omit<QueuedWrite, "id" | "createdAt" | "attempts">);
		console.warn(`writeQueue: offline, queued ${describe(pending)}`);
	} catch (err) {
		console.error("writeQueue: failed to queue write, data will be lost:", err);
		return result;
	}

	return { data: null, error: null, status: 202, statusText: "Queued", count: null };
};

/**
 * Returns a client whose writes are queue-aware. The original client is kept
 * for replaying the queue, so replays never re-enter this wrapper.
 */
export const withWriteQueue = <T extends { from: (t: string) => any }>(
	client: T
): T => {
	const originalFrom = client.from.bind(client);

	const patchedFrom = (table: string) => {
		const base = originalFrom(table);

		return new Proxy(base, {
			get(target, prop) {
				const value = Reflect.get(target, prop);
				if (
					typeof value !== "function" ||
					typeof prop !== "string" ||
					!WRITE_OPS.includes(prop as WriteOp)
				) {
					return typeof value === "function" ? value.bind(target) : value;
				}

				return (...args: any[]) => {
					const builder = value.apply(target, args);
					return wrapBuilder(builder, {
						table,
						op: prop as WriteOp,
						args,
						filters: [],
					});
				};
			},
		});
	};

	return new Proxy(client, {
		get(target, prop) {
			if (prop === "from") return patchedFrom;
			const value = Reflect.get(target, prop);
			return typeof value === "function" ? value.bind(target) : value;
		},
	}) as T;
};
