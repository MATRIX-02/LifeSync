// AI proxy: forwards a chat completion to Groq with a key that never leaves
// the server. Callers must be signed in (Supabase verifies the JWT before this
// runs, and we confirm the user below).
//
// Deploy: Supabase dashboard > Edge Functions > Create "ai-proxy", paste this
// file, then Edge Functions > Secrets > add GROQ_API_KEY. Run the SQL in
// docs/AI_SETUP.md first: the per-user daily cap needs `consume_ai_request`.
// Optional secret AI_DAILY_LIMIT (default 20) sets that cap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ALLOWED_MODELS = new Set(["qwen/qwen3.8-27b"]);
const MAX_TOKENS = 2048;
const MAX_BODY_BYTES = 64 * 1024;
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT")) || 20;

// The app reads quota from these. Request counts are replaced with the
// caller's own daily allowance; Groq's token budget passes through.
const PASSTHROUGH_HEADERS = [
	"x-ratelimit-limit-tokens",
	"x-ratelimit-remaining-tokens",
	"x-ratelimit-reset-requests",
	"x-ratelimit-reset-tokens",
];

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...extra },
	});

const quotaHeaders = (used: number) => ({
	"x-ratelimit-limit-requests": String(DAILY_LIMIT),
	"x-ratelimit-remaining-requests": String(Math.max(0, DAILY_LIMIT - used)),
});

const today = () => new Date().toISOString().slice(0, 10);

Deno.serve(async (req) => {
	if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

	const apiKey = Deno.env.get("GROQ_API_KEY");
	if (!apiKey) return json(503, { error: "not_configured" });

	// Confirm the caller is a real, signed-in user - not just the anon key.
	const authHeader = req.headers.get("Authorization") ?? "";
	const supabase = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_ANON_KEY")!,
		{ global: { headers: { Authorization: authHeader } } },
	);
	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData?.user) return json(401, { error: "unauthorized" });

	const raw = await req.text();
	if (raw.length > MAX_BODY_BYTES) return json(413, { error: "too_large" });

	let body: any;
	try {
		body = JSON.parse(raw);
	} catch {
		return json(400, { error: "bad_json" });
	}

	// Only forward what the app actually uses, so the proxy cannot be turned
	// into a general-purpose Groq account for whoever holds a login.
	// Service role: ai_usage has RLS on and no policies, so users can neither
	// read nor reset their own count.
	const admin = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	);
	const userId = userData.user.id;

	// "How much is left?" without spending a request or calling Groq.
	if (body?.probe === true) {
		const { data } = await admin
			.from("ai_usage")
			.select("count")
			.eq("user_id", userId)
			.eq("day", today())
			.maybeSingle();
		return json(200, { ok: true }, quotaHeaders(data?.count ?? 0));
	}

	if (!ALLOWED_MODELS.has(body?.model)) return json(400, { error: "model_not_allowed" });
	if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > 10) {
		return json(400, { error: "bad_messages" });
	}

	// Counted before the call, so a failed upstream request still uses one.
	// Null means the cap was already reached; nothing was incremented.
	const { data: used, error: usageError } = await admin.rpc("consume_ai_request", {
		p_user: userId,
		p_limit: DAILY_LIMIT,
	});
	if (usageError) return json(500, { error: "usage_unavailable" });
	if (used === null) return json(429, { error: "daily_limit" }, quotaHeaders(DAILY_LIMIT));

	const upstream = await fetch(GROQ_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: body.model,
			messages: body.messages,
			temperature: typeof body.temperature === "number" ? body.temperature : 0.4,
			max_completion_tokens: Math.min(Number(body.max_completion_tokens) || 512, MAX_TOKENS),
			...(body.response_format?.type === "json_object"
				? { response_format: { type: "json_object" } }
				: {}),
		}),
	});

	const headers = new Headers({ "Content-Type": "application/json", ...quotaHeaders(used) });
	for (const name of PASSTHROUGH_HEADERS) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(await upstream.text(), { status: upstream.status, headers });
});
