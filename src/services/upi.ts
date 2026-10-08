/**
 * "Pay via UPI": opens the phone's UPI app chooser (GPay, PhonePe, Paytm...)
 * with payee and amount filled in. Apps don't report back whether the payment
 * went through, so the caller asks the user before recording a settlement.
 */

import { Linking } from "react-native";

const VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

export const isValidUpiId = (vpa: string) => VPA_PATTERN.test(vpa.trim());

export function buildUpiUrl(opts: { vpa: string; name: string; amount: number; note?: string }): string {
	const params = [
		`pa=${encodeURIComponent(opts.vpa.trim())}`,
		`pn=${encodeURIComponent(opts.name)}`,
		`am=${opts.amount.toFixed(2)}`,
		"cu=INR",
		opts.note ? `tn=${encodeURIComponent(opts.note.slice(0, 50))}` : "",
	].filter(Boolean);
	return `upi://pay?${params.join("&")}`;
}

/** False when no UPI app is installed. */
export async function openUpiPayment(opts: {
	vpa: string;
	name: string;
	amount: number;
	note?: string;
}): Promise<boolean> {
	try {
		await Linking.openURL(buildUpiUrl(opts));
		return true;
	} catch {
		return false;
	}
}
