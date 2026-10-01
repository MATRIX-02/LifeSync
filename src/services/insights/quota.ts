/**
 * Tracks the Groq free-tier quota left, read from the rate-limit headers Groq
 * returns on every call. There is no standalone quota endpoint, so this is only
 * as fresh as the last request the app made.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ai_quota_snapshot";

export interface QuotaSnapshot {
	limitRequests?: number;
	remainingRequests?: number;
	limitTokens?: number;
	remainingTokens?: number;
	/** Groq's duration strings, e.g. "5m45.6s". */
	resetRequests?: string;
	resetTokens?: string;
	capturedAt: string;
}

let cached: QuotaSnapshot | null = null;
const listeners = new Set<(snapshot: QuotaSnapshot) => void>();

const toNumber = (value: string | null): number | undefined => {
	if (!value) return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
};

export function captureQuotaFromHeaders(headers: Headers): void {
	const snapshot: QuotaSnapshot = {
		limitRequests: toNumber(headers.get("x-ratelimit-limit-requests")),
		remainingRequests: toNumber(headers.get("x-ratelimit-remaining-requests")),
		limitTokens: toNumber(headers.get("x-ratelimit-limit-tokens")),
		remainingTokens: toNumber(headers.get("x-ratelimit-remaining-tokens")),
		resetRequests: headers.get("x-ratelimit-reset-requests") ?? undefined,
		resetTokens: headers.get("x-ratelimit-reset-tokens") ?? undefined,
		capturedAt: new Date().toISOString(),
	};

	if (
		snapshot.remainingRequests === undefined &&
		snapshot.remainingTokens === undefined
	) {
		return;
	}

	cached = snapshot;
	AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
	listeners.forEach((fn) => fn(snapshot));
}

export async function getQuotaSnapshot(): Promise<QuotaSnapshot | null> {
	if (cached) return cached;

	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (raw) {
			cached = JSON.parse(raw) as QuotaSnapshot;
			return cached;
		}
	} catch {
		// A corrupt snapshot just means we show "unknown" until the next call.
	}

	return null;
}

export function subscribeToQuota(
	listener: (snapshot: QuotaSnapshot) => void,
): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Groq's daily request allowance resets at midnight UTC. */
export function describeDailyReset(): string {
	const now = new Date();
	const midnightUtc = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate() + 1,
	);
	const hoursLeft = Math.max(
		0,
		Math.round((midnightUtc - now.getTime()) / 3600000),
	);
	return hoursLeft <= 1 ? "resets within the hour" : `resets in ${hoursLeft}h`;
}
