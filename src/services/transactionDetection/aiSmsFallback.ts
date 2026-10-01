/**
 * LLM fallback for bank SMS the regex parser could not read.
 *
 * This sends message text to Groq, a third party, so it is OFF by default and
 * must be explicitly enabled by the user. Only messages the regex rejected are
 * ever sent, and account numbers are masked to the last four digits first.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGroq } from "../insights/core";
import { ParsedBankSms, SmsData } from "./types";

const ENABLED_KEY = "ai_sms_fallback_enabled";

/** Output tokens are capped per minute, so batches stay small. */
const BATCH_SIZE = 5;
const MAX_BODY_CHARS = 320;

export async function isAiSmsFallbackEnabled(): Promise<boolean> {
	try {
		return (await AsyncStorage.getItem(ENABLED_KEY)) === "true";
	} catch {
		return false;
	}
}

export async function setAiSmsFallbackEnabled(enabled: boolean): Promise<void> {
	await AsyncStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

/**
 * Strips long digit runs down to their last four so full card and account
 * numbers never leave the device.
 */
export function redactSms(body: string): string {
	return body
		.replace(/\b[Xx*]{2,}\s?(\d{4})\b/g, "XXXX$1")
		.replace(/\b\d{6,}\b/g, (m) => `XXXX${m.slice(-4)}`)
		.slice(0, MAX_BODY_CHARS);
}

const SYSTEM_PROMPT = `You extract bank transaction details from SMS text. You output JSON only.

You receive an array of objects, each with "id" and "text". For each one, decide whether it describes a completed bank or wallet transaction that moved money.

Return exactly:
{ "results": [{ "id": "...", "isTransaction": true, "type": "debit", "amount": 0, "merchant": "...", "accountLastDigits": "1234", "balance": 0, "referenceId": "..." }] }

RULES:
- One result per input id, in the same order. Never invent an id.
- "type" is "debit" when money left the account, "credit" when it arrived.
- "amount" is a plain number. No currency symbols, no commas.
- Set "isTransaction" false for OTPs, balance enquiries, promotions, EMI reminders, failed or declined payments, and payment requests. Set the other fields to null when false.
- "merchant" is the payee or sender name only. Omit bank names and reference codes. Use null when absent.
- Digits shown as XXXX1234 are masked. Report only the trailing 4 digits.
- Use null for anything not clearly stated. Never guess an amount.
- No markdown, no commentary.`;

interface AiParsedSms extends ParsedBankSms {
	smsId: string;
}

function coerce(raw: any, bankName?: string): AiParsedSms | null {
	if (!raw || raw.isTransaction !== true) return null;

	const amount = typeof raw.amount === "number" ? raw.amount : NaN;
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const type =
		raw.type === "credit" ? "credit" : raw.type === "debit" ? "debit" : null;
	if (!type) return null;

	return {
		smsId: String(raw.id ?? ""),
		type,
		amount,
		bankName,
		merchant: typeof raw.merchant === "string" ? raw.merchant : undefined,
		accountLastDigits:
			typeof raw.accountLastDigits === "string"
				? raw.accountLastDigits.slice(-4)
				: undefined,
		balance: typeof raw.balance === "number" ? raw.balance : undefined,
		referenceId:
			typeof raw.referenceId === "string" ? raw.referenceId : undefined,
	};
}

/**
 * Parses messages the regex could not. Returns a map of SMS id to result;
 * ids absent from the map were judged not to be transactions.
 */
export async function parseSmsWithAi(
	messages: SmsData[],
	bankNameFor: (sms: SmsData) => string | undefined,
): Promise<Map<string, ParsedBankSms>> {
	const out = new Map<string, ParsedBankSms>();

	if (messages.length === 0 || !(await isAiSmsFallbackEnabled())) {
		return out;
	}

	for (let i = 0; i < messages.length; i += BATCH_SIZE) {
		const batch = messages.slice(i, i + BATCH_SIZE);

		const result = await callGroq({
			systemPrompt: SYSTEM_PROMPT,
			payload: batch.map((sms) => ({
				id: sms.id,
				text: redactSms(sms.body),
			})),
			maxTokens: 700,
			jsonMode: true,
		});

		// A rate limit or network failure just means no extra detections.
		if (!result.ok) break;

		try {
			const parsed = JSON.parse(result.text);
			const rows: any[] = Array.isArray(parsed?.results) ? parsed.results : [];

			for (const row of rows) {
				const source = batch.find((s) => s.id === String(row?.id));
				if (!source) continue;

				const coerced = coerce(row, bankNameFor(source));
				if (coerced) out.set(source.id, coerced);
			}
		} catch {
			// Malformed batch — skip it rather than failing the whole scan.
		}
	}

	return out;
}
