/**
 * Notification Listener Service
 * Listens for UPI app notifications and parses transaction details
 *
 * This service uses react-native-android-notification-listener
 * Requires user to enable Notification Access in device settings
 */

import { Platform } from "react-native";
import {
	DetectedTransaction,
	NotificationData,
	UPI_APP_PACKAGES,
} from "./types";
import {
	getAppName,
	isTransactionNotification,
	isUpiNotification,
	parseUpiNotification,
} from "./upiParser";

// We'll use dynamic imports for the native module to avoid crashes on iOS
let RNAndroidNotificationListener: any = null;

/**
 * Initialize the notification listener module
 */
export async function initNotificationListener(): Promise<boolean> {
	if (Platform.OS !== "android") {
		console.log("Notification listener is only available on Android");
		return false;
	}

	try {
		// Dynamic import to prevent iOS crashes
		const module = await import("react-native-android-notification-listener");
		RNAndroidNotificationListener = module.default;
		return true;
	} catch (error) {
		console.error("Failed to load notification listener module:", error);
		return false;
	}
}

/**
 * Check if notification access permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
	if (Platform.OS !== "android" || !RNAndroidNotificationListener) {
		return false;
	}

	try {
		const status = await RNAndroidNotificationListener.getPermissionStatus();
		return status === "authorized";
	} catch (error) {
		console.error("Error checking notification permission:", error);
		return false;
	}
}

/**
 * Request notification access permission (opens settings)
 */
export async function requestNotificationPermission(): Promise<void> {
	if (Platform.OS !== "android" || !RNAndroidNotificationListener) {
		return;
	}

	try {
		await RNAndroidNotificationListener.requestPermission();
	} catch (error) {
		console.error("Error requesting notification permission:", error);
	}
}

/**
 * Callback type for notification handler
 */
type NotificationCallback = (transaction: DetectedTransaction) => void;

let notificationCallback: NotificationCallback | null = null;
let isListening = false;

/**
 * Handle incoming notification
 */
function handleNotification(notification: NotificationData): void {
	// Only process UPI app notifications
	if (!isUpiNotification(notification.packageName)) {
		return;
	}

	// Check if it's a transaction notification
	if (!isTransactionNotification(notification)) {
		return;
	}

	// Parse the notification
	const parsed = parseUpiNotification(notification);
	if (!parsed) {
		return;
	}

	// Create detected transaction
	const transaction: DetectedTransaction = {
		id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		source: "notification",
		sourceApp: parsed.app,
		type: parsed.type === "credit" ? "income" : "expense",
		amount: parsed.amount,
		merchant: parsed.merchant,
		upiId: parsed.upiId,
		referenceId: parsed.referenceId,
		timestamp: new Date(notification.timestamp),
		rawText: [notification.title, notification.text, notification.bigText]
			.filter(Boolean)
			.join(" | "),
		isProcessed: false,
		isDismissed: false,
	};

	// Call the callback
	if (notificationCallback) {
		notificationCallback(transaction);
	}
}

/**
 * Start listening for notifications
 */
export async function startNotificationListener(
	callback: NotificationCallback
): Promise<boolean> {
	if (Platform.OS !== "android") {
		console.log("Notification listener is only available on Android");
		return false;
	}

	// Initialize if needed
	if (!RNAndroidNotificationListener) {
		const initialized = await initNotificationListener();
		if (!initialized) {
			return false;
		}
	}

	// Check permission
	const hasPermission = await checkNotificationPermission();
	if (!hasPermission) {
		console.log("Notification access permission not granted");
		return false;
	}

	// Set callback
	notificationCallback = callback;

	// Start listening
	if (!isListening) {
		try {
			RNAndroidNotificationListener.onNotificationReceived(
				(notification: any) => {
					const notifData: NotificationData = {
						app: notification.app || "",
						title: notification.title || "",
						text: notification.text || "",
						subText: notification.subText,
						bigText: notification.bigText,
						timestamp: notification.time || Date.now(),
						packageName: notification.package || notification.app || "",
					};
					handleNotification(notifData);
				}
			);
			isListening = true;
			console.log("Notification listener started");
			return true;
		} catch (error) {
			console.error("Error starting notification listener:", error);
			return false;
		}
	}

	return true;
}

/**
 * Stop listening for notifications
 */
export function stopNotificationListener(): void {
	notificationCallback = null;
	isListening = false;
}

/**
 * Get list of UPI apps to monitor
 */
export function getMonitoredApps(): {
	key: string;
	name: string;
	packageName: string;
}[] {
	return Object.entries(UPI_APP_PACKAGES).map(([key, packageName]) => ({
		key,
		name: getAppName(packageName),
		packageName,
	}));
}
