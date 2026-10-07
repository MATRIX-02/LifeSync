/**
 * UPI Notification Parser
 * Parses notifications from UPI apps to extract transaction details
 */

import {
	cleanMerchant,
	detectDirection,
	isNotCompletedTransaction,
} from "./bankSmsParser";
import {
	NotificationData,
	ParsedUpiTransaction,
	UPI_APP_PACKAGES,
} from "./types";

// Regex patterns for parsing UPI notifications
const AMOUNT_PATTERNS = [
	/₹\s*([\d,]+(?:\.\d{2})?)/i,
	/Rs\.?\s*([\d,]+(?:\.\d{2})?)/i,
	/INR\s*([\d,]+(?:\.\d{2})?)/i,
	/(?:paid|received|sent|debited|credited)\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i,
];

const DEBIT_KEYWORDS = [
	"paid",
	"sent",
	"debited",
	"transferred",
	"payment successful",
	"money sent",
	"paid to",
	"sent to",
	"payment of",
	"debit",
];

const CREDIT_KEYWORDS = [
	"received",
	"credited",
	"got",
	"money received",
	"received from",
	"credit",
	"cashback",
	"refund",
];

const UPI_ID_PATTERN = /([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/;
const REFERENCE_PATTERN =
	/(?:ref|upi ref|txn id|transaction id|utr)[:\s]*([A-Z0-9]+)/i;

/**
 * Check if a notification is from a UPI app
 */
export function isUpiNotification(packageName: string): boolean {
	return Object.values(UPI_APP_PACKAGES).includes(packageName as any);
}

/**
 * Get the app name from package name
 */
export function getAppName(packageName: string): string {
	const appEntry = Object.entries(UPI_APP_PACKAGES).find(
		([, pkg]) => pkg === packageName
	);
	if (appEntry) {
		const names: Record<string, string> = {
			phonepe: "PhonePe",
			gpay: "Google Pay",
			paytm: "Paytm",
			bharatpe: "BharatPe",
			amazonpay: "Amazon Pay",
			cred: "CRED",
			mobikwik: "MobiKwik",
			freecharge: "Freecharge",
			whatsapp: "WhatsApp Pay",
			bhim: "BHIM",
			paytmbusiness: "Paytm for Business",
			airtel: "Airtel Thanks",
			navi: "Navi",
			supermoney: "super.money",
			jupiter: "Jupiter",
			fi: "Fi",
			slice: "slice",
		};
		return names[appEntry[0]] || appEntry[0];
	}
	// An app outside UPI_APP_PACKAGES, picked up by the strict UPI fallback.
	return "UPI app";
}

/**
 * Extract amount from notification text
 */
function extractAmount(text: string): number | null {
	for (const pattern of AMOUNT_PATTERNS) {
		const match = text.match(pattern);
		if (match) {
			const amountStr = match[1].replace(/,/g, "");
			const amount = parseFloat(amountStr);
			if (!isNaN(amount) && amount > 0) {
				return amount;
			}
		}
	}
	return null;
}

/**
 * Determine if transaction is credit or debit
 */
function getTransactionType(text: string): "credit" | "debit" {
	// First direction verb wins (see detectDirection) - "paid ... cashback
	// received" is a payment, not income.
	const direction = detectDirection(text);
	if (direction) return direction;
	const lowerText = text.toLowerCase();

	// Check for credit keywords first (refunds, cashback)
	for (const keyword of CREDIT_KEYWORDS) {
		if (lowerText.includes(keyword)) {
			return "credit";
		}
	}

	// Check for debit keywords
	for (const keyword of DEBIT_KEYWORDS) {
		if (lowerText.includes(keyword)) {
			return "debit";
		}
	}

	// Default to debit as most UPI notifications are payments
	return "debit";
}

/**
 * Extract merchant/recipient name from notification
 */
// A name ends at the first word that starts a new clause ("in your bank
// account", "successfully", "on 07-Oct", "via UPI") or at punctuation/amount.
const NAME_END = String.raw`(?=\s+(?:in|into|to your|on|via|using|with|for|successfully|has|have|is|was|and|ref|upi|txn)\b|\s*[.,!|@₹(]|\s+Rs\b|\s+INR\b|$)`;
// Starts with a letter and has no "." - otherwise "₹1.00 received. Mayank"
// yields "00 received. Mayank" via the decimal point.
const NAME = String.raw`([A-Za-z][A-Za-z0-9 &'-]{0,48}?)`;

// Words that end up captured but aren't a payee ("Tap to view", "your account").
const NOT_A_NAME = /^(you|your|your account|your bank|your bank account|bank account|account|the|a|an|view|details|see details|check|it|money|me|us)$/i;

/**
 * Payee (expense) or payer (income). Direction picks which side to look at:
 * "Paid ₹10 to Zomato", "₹1 received from Mayank Singh", "Rahul paid you ₹50".
 */
function extractMerchant(
	text: string,
	direction: "credit" | "debit",
): string | undefined {
	const patterns =
		direction === "credit"
			? [
					new RegExp(String.raw`(?:received from|from)\s+${NAME}${NAME_END}`, "i"),
					// "Rahul Kumar paid you ₹50", "Rahul sent you money"
					new RegExp(String.raw`(?:^|[.!]\s*)${NAME}\s+(?:has\s+)?(?:paid|sent)\s+you\b`, "i"),
				]
			: [
					new RegExp(String.raw`(?:paid to|sent to|payment to|transferred to|to)\s+${NAME}${NAME_END}`, "i"),
					new RegExp(String.raw`(?:at|for)\s+${NAME}${NAME_END}`, "i"),
				];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		const merchant = match?.[1] ? cleanMerchant(match[1]) ?? "" : "";
		if (merchant.length > 1 && !NOT_A_NAME.test(merchant)) {
			return merchant.slice(0, 50);
		}
	}
	return undefined;
}

/**
 * Extract UPI ID from notification
 */
function extractUpiId(text: string): string | undefined {
	const match = text.match(UPI_ID_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Extract reference/transaction ID
 */
function extractReferenceId(text: string): string | undefined {
	const match = text.match(REFERENCE_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Parse a UPI notification into transaction details
 */
export function parseUpiNotification(
	notification: NotificationData
): ParsedUpiTransaction | null {
	// Title and body are separate sentences - keep them apart, or "paid to
	// Netflix" + "You also won ..." reads as one merchant name.
	const fullText = [
		notification.title,
		notification.text,
		notification.bigText,
		notification.subText,
	]
		.filter(Boolean)
		.join(". ");

	// Skip non-transaction notifications
	const skipKeywords = [
		"offer",
		"cashback offer",
		"rewards",
		"check out",
		"discover",
		"shop now",
		"update",
		"download",
		"new feature",
		"reminder",
		"rate us",
		"feedback",
	];

	// Collect requests ("X requested ₹500"), failures and reminders.
	if (isNotCompletedTransaction(fullText)) return null;

	const lowerText = fullText.toLowerCase();
	if (skipKeywords.some((keyword) => lowerText.includes(keyword))) {
		// Allow if it also contains transaction keywords
		const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
			(k) => lowerText.includes(k)
		);
		if (!hasTransactionKeyword) {
			return null;
		}
	}

	const amount = extractAmount(fullText);
	if (!amount) {
		return null; // No valid amount found
	}

	const type = getTransactionType(fullText);
	const merchant = extractMerchant(fullText, type);
	const upiId = extractUpiId(fullText);
	const referenceId = extractReferenceId(fullText);
	const app = getAppName(notification.packageName);

	return {
		type,
		amount,
		merchant,
		upiId,
		referenceId,
		app,
	};
}

/**
 * Check if this is a transaction notification (not promotional)
 */
export function isTransactionNotification(
	notification: NotificationData
): boolean {
	const fullText = [notification.title, notification.text, notification.bigText]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (isNotCompletedTransaction(fullText)) return false;

	// Must contain amount
	const hasAmount = AMOUNT_PATTERNS.some((p) => p.test(fullText));
	if (!hasAmount) return false;

	// Must contain transaction keywords
	const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
		(k) => fullText.includes(k)
	);

	return hasTransactionKeyword;
}
