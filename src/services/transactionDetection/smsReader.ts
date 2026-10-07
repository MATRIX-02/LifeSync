/**
 * SMS Reader Service
 * Reads SMS messages from banks and parses transaction details
 *
 * This service uses react-native-get-sms-android
 * Requires SMS read permission
 */

import { PermissionsAndroid, Platform } from "react-native";
import { parseSmsWithAi } from "./aiSmsFallback";
import {
	extractCardType,
	getBankName,
	isBankSms,
	isTransactionSms,
	parseBankSms,
} from "./bankSmsParser";
import { DetectedTransaction, ParsedBankSms, SmsData } from "./types";

// We'll use dynamic imports for the native module
let SmsAndroid: any = null;

/**
 * Initialize the SMS reader module
 */
export async function initSmsReader(): Promise<boolean> {
	if (Platform.OS !== "android") {
		console.log("SMS reader is only available on Android");
		return false;
	}

	try {
		// Dynamic import to prevent iOS crashes
		const module = await import("react-native-get-sms-android");
		SmsAndroid = module.default;
		return true;
	} catch (error) {
		console.error("Failed to load SMS reader module:", error);
		return false;
	}
}

/**
 * Check if SMS read permission is granted
 */
export async function checkSmsPermission(): Promise<boolean> {
	if (Platform.OS !== "android") {
		return false;
	}

	try {
		const granted = await PermissionsAndroid.check(
			PermissionsAndroid.PERMISSIONS.READ_SMS,
		);
		return granted;
	} catch (error) {
		console.error("Error checking SMS permission:", error);
		return false;
	}
}

/**
 * Request SMS read permission
 */
export async function requestSmsPermission(): Promise<boolean> {
	if (Platform.OS !== "android") {
		return false;
	}

	try {
		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.READ_SMS,
			{
				title: "SMS Permission",
				message:
					"LifeSync needs access to read SMS to automatically detect bank transactions and help you track expenses.",
				buttonNeutral: "Ask Me Later",
				buttonNegative: "Cancel",
				buttonPositive: "OK",
			},
		);
		return granted === PermissionsAndroid.RESULTS.GRANTED;
	} catch (error) {
		console.error("Error requesting SMS permission:", error);
		return false;
	}
}

/**
 * Read SMS messages from the device
 */
export async function readSmsMessages(options?: {
	maxCount?: number;
	minDate?: Date;
}): Promise<SmsData[]> {
	if (Platform.OS !== "android" || !SmsAndroid) {
		return [];
	}

	const hasPermission = await checkSmsPermission();
	if (!hasPermission) {
		console.log("SMS read permission not granted");
		return [];
	}

	return new Promise((resolve) => {
		const filter: any = {
			box: "inbox",
			maxCount: options?.maxCount || 100,
		};

		if (options?.minDate) {
			filter.minDate = options.minDate.getTime();
		}

		// Build address filter for bank senders
		// We'll filter after reading since the API doesn't support multiple address filters well

		SmsAndroid.list(
			JSON.stringify(filter),
			(fail: string) => {
				console.error("Failed to read SMS:", fail);
				resolve([]);
			},
			(count: number, smsList: string) => {
				try {
					const messages: any[] = JSON.parse(smsList);
					const smsData: SmsData[] = messages.map((msg) => ({
						id: msg._id?.toString() || Date.now().toString(),
						address: msg.address || "",
						body: msg.body || "",
						date: msg.date || Date.now(),
						read: msg.read === 1,
					}));
					resolve(smsData);
				} catch (error) {
					console.error("Error parsing SMS:", error);
					resolve([]);
				}
			},
		);
	});
}

/**
 * Get recent bank transaction SMS
 */
export async function getRecentTransactionSms(options?: {
	maxCount?: number;
	hoursBack?: number;
}): Promise<DetectedTransaction[]> {
	// Initialize if needed
	if (!SmsAndroid) {
		const initialized = await initSmsReader();
		if (!initialized) {
			return [];
		}
	}

	const hoursBack = options?.hoursBack || 24;
	const minDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

	// Read all SMS
	const allSms = await readSmsMessages({
		maxCount: options?.maxCount || 200,
		minDate,
	});

	// Filter to bank SMS only
	const bankSms = allSms.filter((sms) => isBankSms(sms.address));

	// Filter to transaction SMS and parse
	const transactions: DetectedTransaction[] = [];

	const toTransaction = (
		sms: SmsData,
		parsed: ParsedBankSms,
	): DetectedTransaction => ({
		// Stable per SMS, so re-scanning the inbox recognises what it has seen.
		id: `sms_${sms.id}`,
		source: "sms",
		type: parsed.type === "credit" ? "income" : "expense",
		amount: parsed.amount,
		merchant: parsed.merchant,
		accountNumber: parsed.accountLastDigits,
		bankName: parsed.bankName,
		referenceId: parsed.referenceId,
		timestamp: new Date(sms.date),
		rawText: sms.body,
		isProcessed: false,
		isDismissed: false,
		cardType: extractCardType(sms.body),
	});

	const unparsed: SmsData[] = [];

	for (const sms of bankSms) {
		const parsed = isTransactionSms(sms) ? parseBankSms(sms) : null;

		if (parsed) {
			transactions.push(toTransaction(sms, parsed));
		} else {
			unparsed.push(sms);
		}
	}

	// Opt-in only; returns an empty map unless the user enabled it.
	if (unparsed.length > 0) {
		const aiResults = await parseSmsWithAi(unparsed, (sms) =>
			getBankName(sms.address),
		);
		for (const sms of unparsed) {
			const parsed = aiResults.get(sms.id);
			if (parsed) transactions.push(toTransaction(sms, parsed));
		}
	}

	// Sort by date, newest first
	transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

	return transactions;
}

// Live detection is the notification listener (see notificationListener.ts):
// each bank SMS shows up as a Messages notification, even with the app closed.
// getRecentTransactionSms above is the catch-up scan run when the app opens.
