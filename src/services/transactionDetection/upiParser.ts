/**
 * UPI Notification Parser
 * Parses notifications from UPI apps to extract transaction details
 */

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
		};
		return names[appEntry[0]] || appEntry[0];
	}
	return packageName;
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
function extractMerchant(text: string): string | undefined {
	// Common patterns
	const patterns = [
		/(?:paid to|sent to|to)\s+([A-Za-z0-9\s]+?)(?:\s*@|\s*₹|\s*Rs|\.|$)/i,
		/(?:received from|from)\s+([A-Za-z0-9\s]+?)(?:\s*@|\s*₹|\s*Rs|\.|$)/i,
		/(?:at|for)\s+([A-Za-z0-9\s]+?)(?:\s*₹|\s*Rs|\.|$)/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const merchant = match[1].trim();
			// Filter out common non-merchant words
			if (
				merchant.length > 1 &&
				!["you", "your", "the", "a", "an"].includes(merchant.toLowerCase())
			) {
				return merchant.slice(0, 50); // Limit length
			}
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
	const fullText = [
		notification.title,
		notification.text,
		notification.bigText,
		notification.subText,
	]
		.filter(Boolean)
		.join(" ");

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
	const merchant = extractMerchant(fullText);
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

	// Must contain amount
	const hasAmount = AMOUNT_PATTERNS.some((p) => p.test(fullText));
	if (!hasAmount) return false;

	// Must contain transaction keywords
	const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
		(k) => fullText.includes(k)
	);

	return hasTransactionKeyword;
}
