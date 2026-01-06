/**
 * Type declarations for react-native-get-sms-android
 */

declare module "react-native-get-sms-android" {
	export interface SmsFilter {
		box?: "inbox" | "sent" | "draft" | "outbox" | "failed" | "queued" | "";
		minDate?: number;
		maxDate?: number;
		bodyRegex?: string;
		indexFrom?: number;
		maxCount?: number;
		address?: string;
	}

	export interface SmsAndroid {
		list(
			filter: string,
			fail: (error: string) => void,
			success: (count: number, smsList: string) => void
		): void;

		autoSend(
			phoneNumber: string,
			message: string,
			fail: (error: string) => void,
			success: () => void
		): void;
	}

	const SmsAndroid: SmsAndroid;
	export default SmsAndroid;
}
