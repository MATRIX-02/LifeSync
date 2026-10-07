/**
 * Bank SMS Parser
 * Parses SMS messages from banks to extract transaction details
 */

import { BANK_SENDER_IDS, ParsedBankSms, SmsData } from "./types";

// Regex patterns for bank SMS parsing
const AMOUNT_PATTERNS = [
	/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
	/(?:debited|credited|withdrawn|deposited|sent|received)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
	/([\d,]+(?:\.\d{2})?)\s*(?:Rs\.?|INR|₹)?\s*(?:debited|credited|withdrawn|deposited)/i,
];

// "A/c XX1234", "acct *1234", "Card XX1234", "card ending 1234".
const ACCOUNT_PATTERN =
	/(?:a\/c|\bac\b|acct|account|card)(?:\s*(?:no\.?|number|ending(?:\s+in)?|ending\s+with))?[:\s]*[xX*.]*\s*(\d{4})\b/i;
const BALANCE_PATTERN =
	/(?:bal(?:ance)?|avl bal|available)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i;
const REFERENCE_PATTERN = /(?:ref(?:erence)?|txn|utr|rrn)[:\s#]*([A-Z0-9]+)/i;
const UPI_PATTERN = /(?:upi|imps|neft|rtgs)/i;

const DEBIT_KEYWORDS = [
	"debited",
	"withdrawn",
	"sent",
	"paid",
	"purchase",
	"payment",
	"transfer",
	"txn",
	"debit",
	"spent",
	"used",
	"atm",
	"pos",
];

const CREDIT_KEYWORDS = [
	"credited",
	"received",
	"deposited",
	"refund",
	"cashback",
	"credit",
	"salary",
	"interest",
];

// Bank name extraction patterns
const BANK_NAMES: Record<string, string> = {
	SBI: "State Bank of India",
	SBIINB: "State Bank of India",
	SBIPSG: "State Bank of India",
	HDFC: "HDFC Bank",
	HDFCBK: "HDFC Bank",
	ICICI: "ICICI Bank",
	ICICIB: "ICICI Bank",
	AXIS: "Axis Bank",
	AXISBK: "Axis Bank",
	KOTAK: "Kotak Bank",
	KOTAKB: "Kotak Bank",
	YESBNK: "Yes Bank",
	YESBK: "Yes Bank",
	PNBSMS: "Punjab National Bank",
	PUNBNK: "Punjab National Bank",
	BOBSMS: "Bank of Baroda",
	BOIIND: "Bank of India",
	CANBNK: "Canara Bank",
	UBOI: "Union Bank of India",
	IDFCFB: "IDFC First Bank",
	INDUSB: "IndusInd Bank",
	FEDBNK: "Federal Bank",
	RBLBNK: "RBL Bank",
	AUBANK: "AU Small Finance Bank",
	PAYTMB: "Paytm Payments Bank",
};

/**
 * Check if SMS is from a known bank
 */
export function isBankSms(sender: string): boolean {
	const normalizedSender = sender.replace(/[^A-Za-z]/g, "").toUpperCase();
	// A phone number normalises to "" (and a short name to "AU"), which every
	// bank ID "includes" - so the reverse check needs a real sender ID.
	if (normalizedSender.length < 4) return false;

	return BANK_SENDER_IDS.some((bankId) => {
		const normalizedBankId = bankId.toUpperCase();
		return (
			normalizedSender.includes(normalizedBankId) ||
			normalizedBankId.includes(normalizedSender)
		);
	});
}

/**
 * Get bank name from sender
 */
export function getBankName(sender: string): string | undefined {
	const normalizedSender = sender.replace(/[^A-Za-z]/g, "").toUpperCase();

	for (const [key, name] of Object.entries(BANK_NAMES)) {
		if (normalizedSender.includes(key.toUpperCase())) {
			return name;
		}
	}

	return undefined;
}

/**
 * Extract amount from SMS text
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

// Verbs that say which way the money moved. The FIRST one in the message
// wins: "Rs 250 debited from A/c XX1234 and credited to SWIGGY" is a debit
// for the user, though it contains "credited". Checking credit words first
// (the old behaviour) read every such message, and any "credit card" spend,
// as income.
const DEBIT_VERBS =
	/\b(debited|spent|withdrawn|paid|sent|purchase[d]?|transferred|deducted|used at|charged)\b/i;
const CREDIT_VERBS =
	/\b(credited|received|deposited|refund(?:ed)?|cashback|reversed|added to)\b/i;

/** "debit" | "credit" by whichever direction verb appears first. */
export function detectDirection(text: string): "credit" | "debit" | null {
	// "credit card" / "debit card" name the instrument, not the direction.
	const t = text.replace(/\b(credit|debit)\s+card\b/gi, "card");
	const d = t.search(DEBIT_VERBS);
	const c = t.search(CREDIT_VERBS);
	if (d === -1 && c === -1) return null;
	if (d === -1) return "credit";
	if (c === -1) return "debit";
	return d < c ? "debit" : "credit";
}

/** Card payments report as card spends rather than bank transfers. */
export function extractCardType(
	text: string,
): "credit_card" | "debit_card" | undefined {
	if (/\bcredit\s+card\b/i.test(text)) return "credit_card";
	if (/\bdebit\s+card\b/i.test(text)) return "debit_card";
	return undefined;
}

// Alerts that mention money but aren't a completed transaction.
const NOT_COMPLETED =
	/\b(will be (?:debited|credited|deducted)|is due|due (?:on|by|date)|requested|request(?:ing)? (?:money|payment|rs|₹|inr)|collect request|declined|failed|unsuccessful|reversal initiated|otp|one time password|verification code|e-?mandate|autopay (?:set|registered)|minimum amount due|total amount due|statement)\b/i;

/** True for "will be debited", payment requests, failures, bills due, OTPs. */
export function isNotCompletedTransaction(text: string): boolean {
	return NOT_COMPLETED.test(text);
}

/**
 * Determine if transaction is credit or debit
 */
function getTransactionType(text: string): "credit" | "debit" | null {
	const direction = detectDirection(text);
	if (direction) return direction;
	// Weaker nouns ("txn", "pos", "atm") only when no verb said otherwise.
	const lowerText = text.toLowerCase();
	if (CREDIT_KEYWORDS.some((k) => lowerText.includes(k))) return "credit";
	if (DEBIT_KEYWORDS.some((k) => lowerText.includes(k))) return "debit";
	return null;
}

/**
 * Extract last 4 digits of account number
 */
function extractAccountDigits(text: string): string | undefined {
	const match = text.match(ACCOUNT_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Extract available balance after transaction
 */
function extractBalance(text: string): number | undefined {
	const match = text.match(BALANCE_PATTERN);
	if (match) {
		const balanceStr = match[1].replace(/,/g, "");
		const balance = parseFloat(balanceStr);
		if (!isNaN(balance)) {
			return balance;
		}
	}
	return undefined;
}

/**
 * Extract reference number
 */
function extractReferenceId(text: string): string | undefined {
	const match = text.match(REFERENCE_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Extract merchant/payee name from SMS
 */
function extractMerchant(text: string): string | undefined {
	// Common patterns for merchant extraction
	const patterns = [
		// "from rahul@okaxis", "to VPA swiggy@icici" - a UPI ID beats the
		// generic pattern below, which stops at the "@".
		/(?:from|to)\s+(?:VPA\s+)?([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
		/(?:to|at|for|@)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+upi|\s+via|\.\s|$)/i,
		/(?:from)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\.\s|$)/i,
		/VPA\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const merchant = cleanMerchant(match[1]);
			// Filter out common non-merchant words
			if (merchant && merchant.length > 2 && merchant.length < 50) {
				return merchant;
			}
		}
	}

	return undefined;
}

/**
 * "swiggy@icici" -> "swiggy"; "VPA zomato.order@hdfc" -> "zomato order".
 * A UPI ID's handle is the bank, not the payee, so keep the local part.
 */
export function cleanMerchant(raw: string): string | undefined {
	let m = raw.trim().replace(/^VPA\s+/i, "");
	if (m.includes("@")) m = m.split("@")[0].replace(/[._-]+/g, " ");
	m = m.replace(/\s+/g, " ").trim();
	return m || undefined;
}

/**
 * Check if this is a transaction SMS (not OTP/promotional)
 */
export function isTransactionSms(sms: SmsData): boolean {
	const text = sms.body.toLowerCase();

	// OTPs, payment requests, failed/declined, "will be debited", bills due.
	if (isNotCompletedTransaction(text)) return false;

	// Skip promotional messages
	if (
		text.includes("offer") ||
		text.includes("discount") ||
		text.includes("win") ||
		text.includes("click here") ||
		text.includes("apply now")
	) {
		// Allow if it also contains transaction keywords
		const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
			(k) => text.includes(k),
		);
		if (!hasTransactionKeyword) {
			return false;
		}
	}

	// Must contain transaction keywords and amount
	const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
		(k) => text.includes(k),
	);
	const hasAmount = AMOUNT_PATTERNS.some((p) => p.test(sms.body));

	return hasTransactionKeyword && hasAmount;
}

/**
 * Parse a bank SMS into transaction details
 */
export function parseBankSms(sms: SmsData): ParsedBankSms | null {
	if (!isTransactionSms(sms)) {
		return null;
	}

	const text = sms.body;

	const amount = extractAmount(text);
	if (!amount) {
		return null;
	}

	const type = getTransactionType(text);
	if (!type) {
		return null;
	}

	const accountLastDigits = extractAccountDigits(text);
	const bankName = getBankName(sms.address);
	const merchant = extractMerchant(text);
	const balance = extractBalance(text);
	const referenceId = extractReferenceId(text);

	return {
		type,
		amount,
		accountLastDigits,
		bankName,
		merchant,
		balance,
		referenceId,
	};
}

/**
 * Get all transaction SMS from a list
 */
export function filterTransactionSms(smsList: SmsData[]): SmsData[] {
	return smsList.filter(
		(sms) => isBankSms(sms.address) && isTransactionSms(sms),
	);
}
