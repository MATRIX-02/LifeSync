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

const ACCOUNT_PATTERN = /(?:a\/c|ac|acct|account)[:\s]*[xX*]*(\d{4})/i;
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
function getBankName(sender: string): string | undefined {
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

/**
 * Determine if transaction is credit or debit
 */
function getTransactionType(text: string): "credit" | "debit" | null {
	const lowerText = text.toLowerCase();

	// Check for credit keywords
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
		/(?:to|at|for|@)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+upi|\s+via|\.\s|$)/i,
		/(?:from)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\.\s|$)/i,
		/VPA\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const merchant = match[1].trim();
			// Filter out common non-merchant words
			if (merchant.length > 2 && merchant.length < 50) {
				return merchant;
			}
		}
	}

	return undefined;
}

/**
 * Check if this is a transaction SMS (not OTP/promotional)
 */
export function isTransactionSms(sms: SmsData): boolean {
	const text = sms.body.toLowerCase();

	// Skip OTP messages
	if (
		text.includes("otp") ||
		text.includes("one time password") ||
		text.includes("verification code")
	) {
		return false;
	}

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
			(k) => text.includes(k)
		);
		if (!hasTransactionKeyword) {
			return false;
		}
	}

	// Must contain transaction keywords and amount
	const hasTransactionKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(
		(k) => text.includes(k)
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
		(sms) => isBankSms(sms.address) && isTransactionSms(sms)
	);
}
