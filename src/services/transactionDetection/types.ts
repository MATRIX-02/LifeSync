/**
 * Transaction Detection Types
 * Types for notification listener and SMS reader services
 */

export interface DetectedTransaction {
	id: string;
	source: "notification" | "sms";
	sourceApp?: string; // PhonePe, GPay, Paytm, etc.
	type: "income" | "expense" | "transfer";
	amount: number;
	merchant?: string;
	upiId?: string;
	accountNumber?: string; // Last 4 digits
	bankName?: string;
	referenceId?: string;
	timestamp: Date;
	rawText: string;
	isProcessed: boolean;
	isDismissed: boolean;
}

export interface NotificationData {
	app: string;
	title: string;
	text: string;
	subText?: string;
	bigText?: string;
	timestamp: number;
	packageName: string;
}

export interface SmsData {
	id: string;
	address: string; // Sender
	body: string;
	date: number;
	read: boolean;
}

export interface ParsedUpiTransaction {
	type: "credit" | "debit";
	amount: number;
	merchant?: string;
	upiId?: string;
	referenceId?: string;
	app: string;
}

export interface ParsedBankSms {
	type: "credit" | "debit";
	amount: number;
	accountLastDigits?: string;
	bankName?: string;
	merchant?: string;
	balance?: number;
	referenceId?: string;
}

// UPI App package names for notification filtering
export const UPI_APP_PACKAGES = {
	phonepe: "com.phonepe.app",
	gpay: "com.google.android.apps.nbu.paisa.user",
	paytm: "net.one97.paytm",
	bharatpe: "com.bharatpe.app",
	amazonpay: "in.amazon.mShop.android.shopping",
	cred: "com.dreamplug.androidapp",
	mobikwik: "com.mobikwik_new",
	freecharge: "com.freecharge.android",
	whatsapp: "com.whatsapp", // WhatsApp Pay
} as const;

// Bank SMS sender IDs
export const BANK_SENDER_IDS = [
	// SBI
	"SBIINB",
	"SBIPSG",
	"SBISMS",
	"ATMSBI",
	"SBIYONO",
	// HDFC
	"HDFCBK",
	"HDFCBN",
	"HDFCSMS",
	// ICICI
	"ICICIB",
	"ICICI",
	"ICICISMS",
	// Axis
	"AXISBK",
	"AXISBNK",
	// Kotak
	"KOTAKB",
	"KOTAK",
	// Yes Bank
	"YESBK",
	"YESBNK",
	// PNB
	"PNBSMS",
	"PUNBNK",
	// BOB
	"BOIIND",
	"BOBSMS",
	// Canara
	"CANBNK",
	// Union Bank
	"UBOI",
	// IDFC
	"IDFCFB",
	// IndusInd
	"INDUSB",
	// Federal
	"FEDBNK",
	// RBL
	"RBLBNK",
	// AU Bank
	"AUBANK",
	// Generic UPI
	"JIOPAY",
	"PAYTMB",
	"PHONPE",
	"GPAY",
];

export type UpiAppKey = keyof typeof UPI_APP_PACKAGES;
