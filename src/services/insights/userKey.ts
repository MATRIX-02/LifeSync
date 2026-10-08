/**
 * The user's own Gemini API key. When set, AI calls go straight from the
 * device to Gemini on that key's free quota instead of through the shared
 * `ai-proxy`. The key lives in the OS keystore (SecureStore), never in
 * Supabase, so it only ever leaves the device to reach Google.
 */

import * as SecureStore from "expo-secure-store";

const STORE_KEY = "gemini_api_key";

// Gemini's OpenAI-compatible endpoint, so request/response shapes match Groq's.
export const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// Alias that Google moves to its newest Flash model, so this never goes stale.
export const GEMINI_MODEL = "gemini-flash-latest";
export const GEMINI_KEY_URL = "https://aistudio.google.com/apikey";

let cached: string | null | undefined;
const listeners = new Set<(key: string | null) => void>();

export async function getUserGeminiKey(): Promise<string | null> {
	if (cached !== undefined) return cached;
	try {
		cached = (await SecureStore.getItemAsync(STORE_KEY)) || null;
	} catch {
		cached = null;
	}
	return cached;
}

export async function setUserGeminiKey(key: string | null): Promise<void> {
	if (key) await SecureStore.setItemAsync(STORE_KEY, key);
	else await SecureStore.deleteItemAsync(STORE_KEY);
	cached = key;
	listeners.forEach((fn) => fn(key));
}

export function subscribeToUserKey(
	listener: (key: string | null) => void,
): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function geminiFetch(
	key: string,
	body: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<Response> {
	return fetch(GEMINI_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
		signal,
	});
}

export type KeyTestResult = { ok: true } | { ok: false; message: string };

/** Sends the smallest possible request so a pasted key is verified on save. */
export async function testGeminiKey(key: string): Promise<KeyTestResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 20000);
	try {
		const response = await geminiFetch(
			key,
			{
				model: GEMINI_MODEL,
				max_tokens: 1,
				messages: [{ role: "user", content: "." }],
			},
			controller.signal,
		);
		// A rate-limited key is still a valid key.
		if (response.ok || response.status === 429) return { ok: true };
		// Google reports a bad key as a 400, so tell it apart from a 400 about
		// the probe itself (e.g. the 1-token cap), which still proves the key.
		const text = response.status === 400 ? await response.text() : "";
		if (response.status === 400 && !/api[_ ]?key/i.test(text)) return { ok: true };
		if (response.status === 400 || response.status === 401 || response.status === 403) {
			return {
				ok: false,
				message:
					"Google rejected this key. Check you copied all of it, or create a new one.",
			};
		}
		return {
			ok: false,
			message: `Gemini returned an error (${response.status}). Try again in a moment.`,
		};
	} catch {
		return {
			ok: false,
			message: "Could not reach Gemini. Check your connection and try again.",
		};
	} finally {
		clearTimeout(timer);
	}
}
