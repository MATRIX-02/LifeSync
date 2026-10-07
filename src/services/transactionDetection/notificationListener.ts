/**
 * Notification listener: turns Android notifications into detected
 * transactions.
 *
 * How it works (the same mechanism Truecaller-style apps use): once the user
 * grants Notification access, Android binds the NotificationListenerService
 * from react-native-android-notification-listener and keeps it running even
 * when LifeSync is closed. For every notification posted on the phone it
 * starts the headless JS task registered in /index.js, which calls
 * handleIncomingNotification (./headlessTask) -> parseNotification (here).
 *
 * Sources understood:
 *   - UPI apps (GPay, PhonePe, Paytm, ...) - their own payment notifications
 *   - SMS apps - every bank SMS arrives as a Messages notification, so bank
 *     alerts are seen live without SMS permission
 *   - bank apps - their own transaction alerts
 */

import { Platform } from "react-native";
import {
	extractCardType,
	getBankName,
	isBankSms,
	isTransactionSms,
	parseBankSms,
} from "./bankSmsParser";
import {
	BANK_APP_PACKAGES,
	DetectedTransaction,
	NotificationData,
	SMS_APP_PACKAGES,
} from "./types";
import {
	getAppName,
	isTransactionNotification,
	isUpiNotification,
	parseUpiNotification,
} from "./upiParser";

/** Raw payload from the library (a JSON string in the headless task). */
export interface RawNotification {
	app?: string;
	title?: string;
	titleBig?: string;
	text?: string;
	subText?: string;
	summaryText?: string;
	bigText?: string;
	time?: string;
	groupedMessages?: { title?: string; text?: string }[];
}

let listenerModule: any = null;

async function loadModule(): Promise<any> {
	if (Platform.OS !== "android") return null;
	if (listenerModule) return listenerModule;
	try {
		listenerModule = (await import("react-native-android-notification-listener"))
			.default;
		return listenerModule;
	} catch (error) {
		console.warn("Notification listener unavailable (needs a dev build):", error);
		return null;
	}
}

/** Has the user granted Notification access to LifeSync? */
export async function checkNotificationPermission(): Promise<boolean> {
	const mod = await loadModule();
	if (!mod) return false;
	try {
		return (await mod.getPermissionStatus()) === "authorized";
	} catch {
		return false;
	}
}

/**
 * Opens Android's "Notification access" settings page. Returns immediately;
 * call checkNotificationPermission again when the app comes back to the
 * foreground.
 */
export async function requestNotificationPermission(): Promise<void> {
	const mod = await loadModule();
	mod?.requestPermission();
}

/**
 * The native service runs whenever access is granted - there is nothing to
 * start in JS. Detection on/off is a setting the headless task checks
 * (see detectionQueue settings), so these only report availability.
 */
export async function startNotificationListener(
	_onTransaction?: (transaction: DetectedTransaction) => void,
): Promise<boolean> {
	return checkNotificationPermission();
}

export function stopNotificationListener(): void {
	// No-op: turning detection off is handled by the enabled setting.
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const isSmsApp = (pkg: string) =>
	(SMS_APP_PACKAGES as readonly string[]).includes(pkg);

/** adb `cmd notification post` comes from the shell; accept it while testing. */
const isDevTestSource = (pkg: string) =>
	typeof __DEV__ !== "undefined" && __DEV__ && pkg === "com.android.shell";

const nonEmpty = (...values: (string | undefined)[]) =>
	values.find((v) => v && v.trim().length > 0)?.trim();

/**
 * Indian commercial SMS come from sender IDs like "AX-HDFCBK" or "VM-SBIINB-S"
 * (DLT format), shown by SMS apps as the title. Contacts show as names or
 * phone numbers.
 */
function looksLikeInstitution(sender: string): boolean {
	const s = sender.trim();
	return isBankSms(s) || /^[A-Z]{2}-[A-Z0-9]{3,9}(?:-[A-Z])?$/i.test(s);
}

/**
 * Android 15+ "sensitive notification protection": when the system's
 * notification assistant classifies a notification as sensitive (OTPs, and in
 * practice many payment alerts - Paytm's, for one), listeners without the
 * RECEIVE_SENSITIVE_NOTIFICATIONS app-op get placeholder text instead of the
 * content. That permission is signature/role-only, so LifeSync can't request
 * it; the user can stop the redaction (Enhanced notifications off, or
 * `adb shell appops set <pkg> RECEIVE_SENSITIVE_NOTIFICATIONS allow`), and the
 * headless task falls back to the matching bank SMS.
 */
export function isContentHidden(raw: RawNotification): boolean {
	const text = [raw.title, raw.text, raw.bigText].filter(Boolean).join(" ");
	return /sensitive notification content hidden|content hidden|sensitive content/i.test(
		text,
	);
}

/** Human name for the app that posted a notification (for the log). */
export function sourceLabel(pkg: string): string {
	if (isUpiNotification(pkg)) return getAppName(pkg);
	if (BANK_APP_PACKAGES[pkg]) return BANK_APP_PACKAGES[pkg];
	if (isSmsApp(pkg)) return "SMS";
	if (isDevTestSource(pkg)) return "Test (adb)";
	return pkg;
}

/** Is this a notification source detection looks at at all? (For the log.) */
export function isPaymentSource(raw: RawNotification): boolean {
	const pkg = raw.app ?? "";
	return (
		isSmsApp(pkg) ||
		!!BANK_APP_PACKAGES[pkg] ||
		isUpiNotification(pkg) ||
		isDevTestSource(pkg) ||
		looksLikeUpiAlert(raw)
	);
}

/**
 * A UPI payment alert from an app not in UPI_APP_PACKAGES (there are dozens
 * of UPI apps). Deliberately strict so chat messages like "I paid you via
 * UPI" don't qualify: it must say UPI, carry an amount, AND quote a
 * reference number or account digits, which only real payment alerts do.
 */
function looksLikeUpiAlert(raw: RawNotification): boolean {
	const text = [raw.title, raw.bigText || raw.text].filter(Boolean).join(" ");
	return (
		/\bUPI\b/i.test(text) &&
		/(?:₹|Rs\.?|INR)\s*[\d,]+/i.test(text) &&
		/(?:\b(?:ref|rrn|utr|txn)\b[\s.:#no]*\d{6,}|\ba\/c\b|\bacc(?:oun)?t\b[^\d]{0,12}\d{4})/i.test(text)
	);
}

/** Stable id so the same alert seen twice (re-posted, grouped) dedupes. */
function makeId(source: string, text: string, amount: number): string {
	let hash = 0;
	const key = `${source}|${amount}|${text}`;
	for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
	return `ntf_${(hash >>> 0).toString(36)}`;
}

function fromBankText(
	sender: string,
	body: string,
	timestamp: Date,
	source: "notification",
	sourceApp: string,
	bankNameOverride?: string,
): DetectedTransaction | null {
	const sms = { id: "", address: sender, body, date: timestamp.getTime(), read: false };
	if (!isTransactionSms(sms)) return null;
	const parsed = parseBankSms(sms);
	if (!parsed) return null;
	return {
		id: makeId(sourceApp, body, parsed.amount),
		source,
		sourceApp,
		type: parsed.type === "credit" ? "income" : "expense",
		amount: parsed.amount,
		merchant: parsed.merchant,
		accountNumber: parsed.accountLastDigits,
		bankName: bankNameOverride ?? parsed.bankName ?? getBankName(sender),
		referenceId: parsed.referenceId,
		timestamp,
		rawText: body,
		isProcessed: false,
		isDismissed: false,
		cardType: extractCardType(body),
	};
}

/**
 * One notification can carry several messages (Messages groups SMS from the
 * same sender), so this returns a list.
 */
export function parseNotification(raw: RawNotification): DetectedTransaction[] {
	const pkg = raw.app ?? "";
	const timestamp = raw.time ? new Date(Number(raw.time) || raw.time) : new Date();
	const when = isNaN(timestamp.getTime()) ? new Date() : timestamp;

	// --- SMS apps (and adb tests): title = sender, body = message ---------
	if (isSmsApp(pkg) || isDevTestSource(pkg)) {
		const messages =
			raw.groupedMessages && raw.groupedMessages.length > 0
				? raw.groupedMessages.map((m) => ({
						sender: nonEmpty(m.title, raw.title) ?? "",
						body: nonEmpty(m.text) ?? "",
					}))
				: [
						{
							sender: nonEmpty(raw.title, raw.titleBig) ?? "",
							body: nonEmpty(raw.bigText, raw.text) ?? "",
						},
					];
		const sourceApp = isDevTestSource(pkg) ? "Test" : "SMS";
		return messages
			.map((m) => {
				const tx = fromBankText(m.sender, m.body, when, "notification", sourceApp);
				// A friend texting "I paid Rs 500" isn't a bank alert: require a
				// bank/business sender ID or an account/card number in the text.
				if (!tx) return null;
				return looksLikeInstitution(m.sender) || tx.accountNumber ? tx : null;
			})
			.filter((t): t is DetectedTransaction => t !== null);
	}

	// --- Bank apps ----------------------------------------------------------
	if (BANK_APP_PACKAGES[pkg]) {
		const body = [raw.title, nonEmpty(raw.bigText, raw.text)].filter(Boolean).join(" ");
		const tx = fromBankText(
			raw.title ?? "",
			body,
			when,
			"notification",
			BANK_APP_PACKAGES[pkg],
			BANK_APP_PACKAGES[pkg],
		);
		return tx ? [tx] : [];
	}

	// --- UPI apps (known), plus a strict fallback for ones we don't know ----
	if (isUpiNotification(pkg) || looksLikeUpiAlert(raw)) {
		const data: NotificationData = {
			app: getAppName(pkg),
			title: raw.title ?? "",
			text: raw.text ?? "",
			bigText: raw.bigText,
			subText: raw.subText,
			timestamp: when.getTime(),
			packageName: pkg,
		};
		if (!isTransactionNotification(data)) return [];
		const parsed = parseUpiNotification(data);
		if (!parsed) return [];
		const text = [data.title, data.bigText || data.text].filter(Boolean).join(" ");
		return [
			{
				id: makeId(pkg, text, parsed.amount),
				source: "notification",
				sourceApp: parsed.app,
				type: parsed.type === "credit" ? "income" : "expense",
				amount: parsed.amount,
				merchant: parsed.merchant,
				upiId: parsed.upiId,
				referenceId: parsed.referenceId,
				timestamp: when,
				rawText: text,
				isProcessed: false,
				isDismissed: false,
			},
		];
	}

	return [];
}
