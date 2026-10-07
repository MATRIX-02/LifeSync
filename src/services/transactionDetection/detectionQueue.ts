/**
 * Detected-transaction queue, shared by the headless task and the app.
 *
 * The headless task (app closed) and the UI run in separate JS contexts, so
 * they can't share a zustand store in memory. Both go through AsyncStorage
 * here instead:
 *
 *   detected_txn_queue     pending detections waiting for the user (max 50)
 *   detected_txn_log       fingerprints of handled ones, so an inbox re-scan
 *                          or a re-posted notification doesn't bring them back
 *   detected_txn_settings  user settings the headless task must read
 *
 * Writes are serialised through a promise chain (read-modify-write), and
 * dates are stored as ISO strings and revived on read.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DetectedTransaction } from "./types";

const QUEUE_KEY = "detected_txn_queue";
const LOG_KEY = "detected_txn_log";
const SETTINGS_KEY = "detected_txn_settings";

const MAX_QUEUE = 50;
const MAX_LOG = 300;
/** Same amount + direction this close together = the same payment. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export interface DetectionSettings {
	/** Master switch, read by the headless task. */
	enabled: boolean;
	/** Post a "Tap to add" notification for each detection. */
	notify: boolean;
	/** Last SMS inbox catch-up scan (ms). */
	lastInboxScan: number;
}

const DEFAULT_SETTINGS: DetectionSettings = {
	enabled: false,
	notify: true,
	lastInboxScan: 0,
};

interface LogEntry {
	id: string;
	referenceId?: string;
	amount: number;
	type: DetectedTransaction["type"];
	time: number;
	outcome: "added" | "ignored";
}

// ---------- storage helpers ----------

let chain: Promise<unknown> = Promise.resolve();
/** Run read-modify-write operations one at a time. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
	const next = chain.then(fn, fn);
	chain = next.catch(() => undefined);
	return next;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

const revive = (t: any): DetectedTransaction => ({
	...t,
	timestamp: new Date(t.timestamp),
});

// ---------- "Recent alerts seen" (troubleshooting) ----------
//
// The last few notifications from payment sources (UPI apps, bank apps, SMS
// apps) and what detection decided, shown in Settings → Auto-detect. Without
// it there is no way to tell "the alert never reached LifeSync" (access off,
// app killed) from "it arrived but didn't look like a payment".

const SEEN_KEY = "detected_txn_seen";
const MAX_SEEN = 25;

export type SeenOutcome =
	| "queued" // offered to the user
	| "duplicate" // same payment already waiting or handled
	| "not_payment" // from a payment app, but not a completed payment
	| "hidden" // Android redacted the content (sensitive notification protection)
	| "from_sms" // found in the bank SMS after a hidden alert
	| "disabled"; // detection switched off

export interface SeenAlert {
	time: number;
	app: string;
	title: string;
	text: string;
	outcome: SeenOutcome;
	/** e.g. "₹250 expense" when queued/duplicate */
	summary?: string;
}

export function recordSeen(entry: SeenAlert): Promise<void> {
	return serial(async () => {
		const seen = await readJson<SeenAlert[]>(SEEN_KEY, []);
		seen.unshift({
			...entry,
			// Enough to recognise the alert; no need to keep whole messages.
			title: entry.title.slice(0, 80),
			text: entry.text.slice(0, 160),
		});
		await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(0, MAX_SEEN)));
	});
}

export const listSeen = () => readJson<SeenAlert[]>(SEEN_KEY, []);

export function clearSeen(): Promise<void> {
	return serial(() => AsyncStorage.removeItem(SEEN_KEY));
}

// ---------- "Test detection" ----------
//
// Settings posts a notification titled DETECTION_TEST_TITLE from LifeSync
// itself; the headless task, which ignores LifeSync's own notifications,
// makes an exception for this one and stamps the time here. Seeing the stamp
// proves the whole chain - Android → listener service → headless JS - works.

export const DETECTION_TEST_TITLE = "LifeSync detection test";
const TEST_KEY = "detected_txn_test_received";

export const markTestReceived = () =>
	AsyncStorage.setItem(TEST_KEY, String(Date.now())).catch(() => undefined);

export async function testReceivedSince(since: number): Promise<boolean> {
	try {
		return Number(await AsyncStorage.getItem(TEST_KEY)) >= since;
	} catch {
		return false;
	}
}

// ---------- settings ----------

export async function getDetectionSettings(): Promise<DetectionSettings> {
	return { ...DEFAULT_SETTINGS, ...(await readJson(SETTINGS_KEY, {})) };
}

export function updateDetectionSettings(
	patch: Partial<DetectionSettings>,
): Promise<DetectionSettings> {
	return serial(async () => {
		const next = { ...(await getDetectionSettings()), ...patch };
		await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
		return next;
	});
}

// ---------- queue ----------

export async function listPending(): Promise<DetectedTransaction[]> {
	const items = await readJson<any[]>(QUEUE_KEY, []);
	return items.map(revive).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

const sameDirection = (a: { type: string }, b: { type: string }) => a.type === b.type;

function matches(
	a: { referenceId?: string; amount: number; type: string; time: number },
	b: { referenceId?: string; amount: number; type: string; time: number },
): boolean {
	if (a.referenceId && b.referenceId) return a.referenceId === b.referenceId;
	return (
		a.amount === b.amount &&
		sameDirection(a, b) &&
		Math.abs(a.time - b.time) < DUPLICATE_WINDOW_MS
	);
}

const toKey = (t: DetectedTransaction) => ({
	referenceId: t.referenceId,
	amount: t.amount,
	type: t.type,
	time: t.timestamp.getTime(),
});

/** Prefer the detection that tells us more (account digits, merchant, ref). */
const richness = (t: DetectedTransaction) =>
	(t.accountNumber ? 4 : 0) + (t.merchant ? 2 : 0) + (t.referenceId ? 1 : 0);

/**
 * Adds a detection unless it was already seen. One payment usually produces
 * a UPI-app notification AND a bank SMS: those merge, keeping the richer one
 * (but its original id, so an already-posted notification still maps to it).
 *
 * Returns the stored transaction if it is new, null if it was a duplicate.
 */
export function enqueue(tx: DetectedTransaction): Promise<DetectedTransaction | null> {
	return serial(async () => {
		const log = await readJson<LogEntry[]>(LOG_KEY, []);
		if (log.some((e) => e.id === tx.id || matches(e, toKey(tx)))) return null;

		const queue = (await readJson<any[]>(QUEUE_KEY, [])).map(revive);
		const dupIndex = queue.findIndex(
			(q) => q.id === tx.id || matches(toKey(q), toKey(tx)),
		);
		if (dupIndex >= 0) {
			const existing = queue[dupIndex];
			if (richness(tx) > richness(existing)) {
				queue[dupIndex] = {
					...existing,
					...tx,
					id: existing.id,
					merchant: tx.merchant ?? existing.merchant,
					upiId: existing.upiId ?? tx.upiId,
				};
				await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
			}
			return null;
		}

		const next = [tx, ...queue].slice(0, MAX_QUEUE);
		await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
		return tx;
	});
}

/** Remove from the queue and remember it, so it never comes back. */
export function markHandled(
	id: string,
	outcome: LogEntry["outcome"],
): Promise<void> {
	return serial(async () => {
		const queue = (await readJson<any[]>(QUEUE_KEY, [])).map(revive);
		const tx = queue.find((q) => q.id === id);
		await AsyncStorage.setItem(
			QUEUE_KEY,
			JSON.stringify(queue.filter((q) => q.id !== id)),
		);
		if (!tx) return;
		const log = await readJson<LogEntry[]>(LOG_KEY, []);
		log.push({ id, ...toKey(tx), outcome });
		await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_LOG)));
	});
}

/** Ignore everything pending (logged, so an inbox re-scan won't revive them). */
export function clearPending(): Promise<void> {
	return serial(async () => {
		const queue = (await readJson<any[]>(QUEUE_KEY, [])).map(revive);
		const log = await readJson<LogEntry[]>(LOG_KEY, []);
		for (const tx of queue) log.push({ id: tx.id, ...toKey(tx), outcome: "ignored" });
		await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_LOG)));
		await AsyncStorage.setItem(QUEUE_KEY, "[]");
	});
}
