/**
 * Reads a bill photo into line items with Gemini (vision), using the user's
 * own key from Settings > AI Usage. The shared proxy only serves a text model,
 * so scanning needs a personal key.
 */

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { GEMINI_MODEL, geminiFetch, getUserGeminiKey } from "./insights/userKey";

export interface ScannedReceipt {
	merchant: string;
	items: { name: string; price: number }[];
	/** Tax, service charge, delivery etc. combined. */
	extraCharges: number;
	total: number;
}

export type ScanResult =
	| { ok: true; receipt: ScannedReceipt }
	| { ok: false; code: "no_key" | "cancelled" | "failed"; message: string };

const PROMPT = `You read restaurant and shop bills. Return ONLY JSON:
{"merchant": string, "items": [{"name": string, "price": number}], "extraCharges": number, "total": number}
- "price" is the line total (quantity x unit price), as printed.
- Put tax, GST, service charge, delivery and tip together in "extraCharges"; subtract discounts from it.
- "total" is the final amount payable.
- Numbers only, no currency symbols. If unreadable, return {"merchant":"","items":[],"extraCharges":0,"total":0}.`;

/** Lets the user take or pick a photo, then scans it. */
export async function scanReceipt(source: "camera" | "library"): Promise<ScanResult> {
	const key = await getUserGeminiKey();
	if (!key) {
		return {
			ok: false,
			code: "no_key",
			message:
				"Scanning uses your own free Gemini key. Add one in Settings > AI Usage > Your Gemini Key.",
		};
	}

	if (source === "camera") {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			return { ok: false, code: "failed", message: "Camera permission is needed to scan a bill." };
		}
	}
	const picked =
		source === "camera"
			? await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8 })
			: await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
	if (picked.canceled || !picked.assets?.[0]) {
		return { ok: false, code: "cancelled", message: "" };
	}

	try {
		// Bills stay legible at 1280px; smaller uploads are much faster.
		const resized = await ImageManipulator.manipulateAsync(
			picked.assets[0].uri,
			[{ resize: { width: 1280 } }],
			{ compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
		);
		if (!resized.base64) throw new Error("no image data");

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 60000);
		const response = await geminiFetch(
			key,
			{
				model: GEMINI_MODEL,
				temperature: 0,
				reasoning_effort: "low",
				max_tokens: 4096,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: PROMPT },
							{
								type: "image_url",
								image_url: { url: `data:image/jpeg;base64,${resized.base64}` },
							},
						],
					},
				],
			},
			controller.signal,
		).finally(() => clearTimeout(timer));

		if (response.status === 429) {
			return { ok: false, code: "failed", message: "Your Gemini key hit its limit. Try again in a minute." };
		}
		if (!response.ok) {
			return { ok: false, code: "failed", message: `Gemini returned an error (${response.status}).` };
		}
		const data = await response.json();
		const text: string = data?.choices?.[0]?.message?.content ?? "";
		const raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));

		const num = (v: unknown) => {
			const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
			return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
		};
		const items = (Array.isArray(raw?.items) ? raw.items : [])
			.map((it: any) => ({ name: String(it?.name ?? "").trim() || "Item", price: num(it?.price) }))
			.filter((it: { price: number }) => it.price > 0);
		if (items.length === 0) {
			return { ok: false, code: "failed", message: "Couldn't read any items. Try a clearer, flatter photo." };
		}
		const subtotal = items.reduce((s: number, it: { price: number }) => s + it.price, 0);
		let total = num(raw?.total);
		let extraCharges = num(raw?.extraCharges);
		// Trust the printed total when it's consistent; otherwise derive it.
		if (total <= 0) total = Math.round((subtotal + extraCharges) * 100) / 100;
		else extraCharges = Math.round((total - subtotal) * 100) / 100;

		return {
			ok: true,
			receipt: {
				merchant: String(raw?.merchant ?? "").trim(),
				items,
				extraCharges,
				total,
			},
		};
	} catch (error: any) {
		const aborted = error?.name === "AbortError";
		return {
			ok: false,
			code: "failed",
			message: aborted ? "Scanning took too long. Please try again." : "Couldn't read that bill. Please try again.",
		};
	}
}
