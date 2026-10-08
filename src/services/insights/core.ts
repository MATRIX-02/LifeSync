/**
 * Shared Groq client and analysis schema used by every module's insights.
 *
 * The Groq key ships inside the app bundle (EXPO_PUBLIC_*), so its free-tier
 * quota is shared by every install, not per user. Keep call volume low: cache
 * results in the UI and gate the feature behind a subscription check.
 */

import { captureQuotaFromHeaders, GROQ_MODEL, groqFetch } from "./quota";

export { GROQ_MODEL };

const REQUEST_TIMEOUT_MS = 45000;

// ===================== DATE WINDOWS =====================

export type InsightRange = "last_30" | "last_90" | "this_year" | "custom";

export const RANGE_LABELS: Record<InsightRange, string> = {
	last_30: "Last 30 Days",
	last_90: "Last 90 Days",
	this_year: "This Year",
	custom: "Custom",
};

export interface DateWindow {
	/** Inclusive, YYYY-MM-DD. */
	start: string;
	/** Inclusive, YYYY-MM-DD. */
	end: string;
}

export const toISODate = (d: Date) => {
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return local.toISOString().split("T")[0];
};

/** Windows are inclusive of both endpoints. */
export function resolveDateWindow(
	range: InsightRange,
	custom?: DateWindow,
): DateWindow {
	const now = new Date();
	const end = toISODate(now);

	switch (range) {
		case "last_30": {
			const start = new Date(now);
			start.setDate(start.getDate() - 29);
			return { start: toISODate(start), end };
		}
		case "last_90": {
			const start = new Date(now);
			start.setDate(start.getDate() - 89);
			return { start: toISODate(start), end };
		}
		case "this_year":
			return { start: toISODate(new Date(now.getFullYear(), 0, 1)), end };
		case "custom":
			return custom ?? { start: end, end };
	}
}

export function describeWindow(
	range: InsightRange,
	window: DateWindow,
): string {
	if (range === "custom") return `${window.start} to ${window.end}`;
	return RANGE_LABELS[range];
}

export function countDays(window: DateWindow): number {
	const start = new Date(window.start);
	const end = new Date(window.end);
	const diff = Math.floor(
		(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
	);
	return Math.max(1, diff + 1);
}

export const round = (n: number) => Math.round(n * 100) / 100;

// ===================== ERRORS =====================

export type AiInsightsErrorCode =
	| "missing_key"
	| "rate_limited"
	| "timeout"
	| "network"
	| "server"
	| "empty_response"
	| "no_data";

export interface AiInsightsError {
	ok: false;
	code: AiInsightsErrorCode;
	message: string;
}

// ===================== ANALYSIS SCHEMA =====================

export type Severity = "critical" | "warning" | "good" | "info";

export interface HeadlineMetric {
	label: string;
	value: string;
	/** Short explanation of what the number means, in plain words. */
	caption: string;
	severity: Severity;
}

export interface ScoreBreakdown {
	label: string;
	/** 0-100. */
	score: number;
	verdict: string;
}

export interface DeepFinding {
	title: string;
	detail: string;
	severity: Severity;
	/** Real names from the user's own data that this finding refers to. */
	evidence: string[];
	impactAmount?: number;
}

export interface BreakdownVerdict {
	/** Category, habit or muscle group depending on the module. */
	label: string;
	value: number;
	share: number;
	verdict: string;
	namedItems: string[];
	severity: Severity;
}

export interface ActionItem {
	action: string;
	reason: string;
	estimatedSaving?: number;
	priority: "high" | "medium" | "low";
}

export interface DeepAnalysis {
	headline: string;
	healthScore: number;
	scoreBreakdown: ScoreBreakdown[];
	headlineMetrics: HeadlineMetric[];
	findings: DeepFinding[];
	breakdowns: BreakdownVerdict[];
	/** Two free-form note groups whose meaning is set per module. */
	noteGroups: { title: string; notes: string[] }[];
	actions: ActionItem[];
}

export type DeepAnalysisResult =
	| { ok: true; analysis: DeepAnalysis; generatedAt: string }
	| AiInsightsError;

// ===================== GROQ CLIENT =====================

type RawCallResult =
	| { ok: true; text: string }
	| { ok: false; code: AiInsightsErrorCode; message: string };

export async function callGroq(opts: {
	systemPrompt: string;
	payload: unknown;
	maxTokens: number;
	jsonMode?: boolean;
}): Promise<RawCallResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await groqFetch(
			{
				model: GROQ_MODEL,
				temperature: opts.jsonMode ? 0.2 : 0.4,
				max_completion_tokens: opts.maxTokens,
				...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
				messages: [
					{ role: "system", content: opts.systemPrompt },
					{ role: "user", content: JSON.stringify(opts.payload) },
				],
			},
			controller.signal,
		);

		if (response.status === 503) {
			return {
				ok: false,
				code: "missing_key",
				message: "AI insights are not set up on the server yet.",
			};
		}
		if (response.status === 401) {
			return {
				ok: false,
				code: "server",
				message: "Please sign in to use AI insights.",
			};
		}

		// Headers are present on rejections too, which is when quota matters most.
		captureQuotaFromHeaders(response.headers);

		if (response.status === 429) {
			return {
				ok: false,
				code: "rate_limited",
				message:
					"AI insights are busy right now. Please try again in a few minutes.",
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				code: "server",
				message: `Insights service returned an error (${response.status}). Please try again later.`,
			};
		}

		const data = await response.json();
		const text: string | undefined = data?.choices?.[0]?.message?.content;

		if (!text || !text.trim()) {
			return {
				ok: false,
				code: "empty_response",
				message: "No insights were generated. Please try again.",
			};
		}

		return { ok: true, text: text.trim() };
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return {
				ok: false,
				code: "timeout",
				message: "Generating insights took too long. Please try again.",
			};
		}
		return {
			ok: false,
			code: "network",
			message:
				"Could not reach the insights service. Check your connection and try again.",
		};
	} finally {
		clearTimeout(timer);
	}
}

// ===================== RESPONSE VALIDATION =====================

function clampScore(n: unknown): number {
	const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}

const SEVERITIES: Severity[] = ["critical", "warning", "good", "info"];

function asSeverity(value: unknown): Severity {
	return SEVERITIES.includes(value as Severity) ? (value as Severity) : "info";
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((v): v is string => typeof v === "string")
		: [];
}

/** The model returns free-form JSON, so every field is validated before it reaches the UI. */
export function normaliseAnalysis(raw: any): DeepAnalysis {
	return {
		headline: typeof raw?.headline === "string" ? raw.headline : "",
		healthScore: clampScore(raw?.healthScore),
		scoreBreakdown: Array.isArray(raw?.scoreBreakdown)
			? raw.scoreBreakdown.slice(0, 6).map((s: any) => ({
					label: String(s?.label ?? ""),
					score: clampScore(s?.score),
					verdict: String(s?.verdict ?? ""),
				}))
			: [],
		headlineMetrics: Array.isArray(raw?.headlineMetrics)
			? raw.headlineMetrics.slice(0, 6).map((m: any) => ({
					label: String(m?.label ?? ""),
					value: String(m?.value ?? ""),
					caption: String(m?.caption ?? ""),
					severity: asSeverity(m?.severity),
				}))
			: [],
		findings: Array.isArray(raw?.findings)
			? raw.findings.slice(0, 8).map((f: any) => ({
					title: String(f?.title ?? ""),
					detail: String(f?.detail ?? ""),
					severity: asSeverity(f?.severity),
					evidence: asStringArray(f?.evidence),
					impactAmount:
						typeof f?.impactAmount === "number" ? f.impactAmount : undefined,
				}))
			: [],
		breakdowns: Array.isArray(raw?.breakdowns)
			? raw.breakdowns.slice(0, 8).map((c: any) => ({
					label: String(c?.label ?? ""),
					value: typeof c?.value === "number" ? c.value : 0,
					share: typeof c?.share === "number" ? c.share : 0,
					verdict: String(c?.verdict ?? ""),
					namedItems: asStringArray(c?.namedItems),
					severity: asSeverity(c?.severity),
				}))
			: [],
		noteGroups: Array.isArray(raw?.noteGroups)
			? raw.noteGroups.slice(0, 3).map((g: any) => ({
					title: String(g?.title ?? ""),
					notes: asStringArray(g?.notes),
				}))
			: [],
		actions: Array.isArray(raw?.actions)
			? raw.actions.slice(0, 6).map((a: any) => ({
					action: String(a?.action ?? ""),
					reason: String(a?.reason ?? ""),
					estimatedSaving:
						typeof a?.estimatedSaving === "number"
							? a.estimatedSaving
							: undefined,
					priority:
						a?.priority === "high" || a?.priority === "low"
							? a.priority
							: "medium",
				}))
			: [],
	};
}

/** Shared JSON-shape contract appended to every module's domain prompt. */
export const SHARED_SCHEMA_RULES = `Return EXACTLY this shape, with no extra keys and no markdown. Emit the keys in this order:
{
  "headline": "verdict on the period",
  "healthScore": 0-100 integer,
  "scoreBreakdown": [{ "label": "...", "score": 0-100, "verdict": "..." }],
  "headlineMetrics": [{ "label": "...", "value": "...", "caption": "...", "severity": "good" }],
  "findings": [{ "title": "...", "detail": "...", "severity": "critical", "evidence": ["real name"] }],
  "actions": [{ "action": "...", "reason": "...", "priority": "high" }],
  "noteGroups": [{ "title": "...", "notes": ["..."] }],
  "breakdowns": [{ "label": "...", "value": 0, "share": 0, "verdict": "...", "namedItems": ["real name"], "severity": "warning" }]
}

SHARED RULES — the response is hard-capped, so brevity is mandatory:
- Every key is required. Emit them in the order shown.
- "severity" is one of: critical, warning, good, info. "priority" is one of: high, medium, low.
- scoreBreakdown: exactly 4 entries. "verdict" at most 7 words.
- headlineMetrics: exactly 3 entries. "caption" at most 5 words.
- findings: exactly 3 entries, hardest-hitting first. "detail" at most 12 words. "evidence" holds 1 or 2 real names from the input.
- actions: exactly 3 entries. "action" and "reason" at most 8 words each.
- noteGroups: exactly 2 groups, at most 2 notes each, each note at most 10 words.
- breakdowns: exactly 3 entries. "verdict" at most 6 words. "namedItems" at most 2.
- "headline" at most 14 words.
- Only use figures present in the input. Never invent a number.
- Plain everyday language, no jargon.
- If "windowDays" is under 7, say the period is short and the figures are early.`;

// Groq's free tier enforces 1000 output tokens per minute and rejects a request
// whose max_completion_tokens alone exceeds it, so this cannot be raised.
const MAX_ANALYSIS_TOKENS = 950;

export async function runDeepAnalysis(
	systemPrompt: string,
	payload: unknown,
): Promise<DeepAnalysisResult> {
	const result = await callGroq({
		systemPrompt,
		payload,
		maxTokens: MAX_ANALYSIS_TOKENS,
		jsonMode: true,
	});

	if (!result.ok) return result;

	const parsed = parseMaybeTruncated(result.text);

	if (!parsed) {
		return {
			ok: false,
			code: "empty_response",
			message: "The analysis came back in an unreadable format. Please retry.",
		};
	}

	return {
		ok: true,
		analysis: normaliseAnalysis(parsed),
		generatedAt: new Date().toISOString(),
	};
}

/**
 * The output-token ceiling can cut a response mid-object. Rather than losing
 * everything, drop the incomplete tail and close the structure so the sections
 * that did arrive still render.
 */
function parseMaybeTruncated(text: string): any | null {
	try {
		return JSON.parse(text);
	} catch {
		// Fall through to salvage.
	}

	for (let end = text.length - 1; end > 0; end--) {
		const ch = text[end];
		if (ch !== "}" && ch !== "]") continue;

		const candidate = text.slice(0, end + 1);
		let depthCurly = 0;
		let depthSquare = 0;
		let inString = false;
		let escaped = false;

		for (const c of candidate) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (c === "\\") {
				escaped = true;
				continue;
			}
			if (c === '"') inString = !inString;
			if (inString) continue;
			if (c === "{") depthCurly++;
			else if (c === "}") depthCurly--;
			else if (c === "[") depthSquare++;
			else if (c === "]") depthSquare--;
		}

		if (inString || depthCurly < 0 || depthSquare < 0) continue;

		const repaired =
			candidate + "]".repeat(depthSquare) + "}".repeat(depthCurly);

		try {
			return JSON.parse(repaired);
		} catch {
			// Keep walking back.
		}
	}

	return null;
}
