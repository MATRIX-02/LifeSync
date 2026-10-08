/**
 * Tracks the AI quota left for the shared proxy: the user's own daily request
 * allowance (counted by `ai-proxy`) and Groq's per-minute token budget, read
 * from the rate-limit headers on each call. Not used with the user's own key.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabaseDirect } from "../../config/supabase";

// The Groq key lives in the `ai-proxy` Edge Function (supabase/functions), not
// in the app: anything EXPO_PUBLIC_* ships inside the APK for anyone to read.
const AI_PROXY_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

/**
 * POST a chat completion through the proxy as the signed-in user. Returns the
 * raw Response so callers still see Groq's status codes and quota headers;
 * 401 means not signed in, 503 means the proxy has no key configured.
 */
export async function groqFetch(
	body: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<Response> {
	const {
		data: { session },
	} = await supabaseDirect.auth.getSession();
	return fetch(AI_PROXY_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${session?.access_token ?? ""}`,
			apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
		signal,
	});
}

// Declared here rather than imported from core.ts, which imports this module.
export const GROQ_MODEL = "qwen/qwen3.8-27b";

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

/**
 * Asks the proxy for this user's remaining daily allowance. A probe neither
 * calls Groq nor counts against the allowance. The token budget is only
 * refreshed by real analyses.
 */
export async function refreshQuota(): Promise<QuotaSnapshot | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15000);

	try {
		const response = await groqFetch({ probe: true }, controller.signal);
		if (!response.ok) return null;

		const limit = toNumber(response.headers.get("x-ratelimit-limit-requests"));
		const remaining = toNumber(
			response.headers.get("x-ratelimit-remaining-requests"),
		);
		if (remaining === undefined) return null;

		// Keep the last token reading rather than blanking it.
		const previous = await getQuotaSnapshot();
		const snapshot: QuotaSnapshot = {
			...previous,
			limitRequests: limit,
			remainingRequests: remaining,
			capturedAt: new Date().toISOString(),
		};
		cached = snapshot;
		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
		listeners.forEach((fn) => fn(snapshot));
		return snapshot;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** The proxy's daily allowance resets at midnight UTC. */
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
