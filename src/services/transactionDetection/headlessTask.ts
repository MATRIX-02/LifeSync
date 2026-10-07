/**
 * Headless task: runs for every notification posted on the phone, even when
 * LifeSync is closed (registered in /index.js).
 *
 * "Ask first": it only parses, queues and posts a "Tap to add" notification.
 * Nothing is saved to the database here - the user confirms in the app
 * (TransactionPrompt). That keeps this task fast, and means no auth/session
 * or store setup is needed in the background.
 *
 * Notifications from payment sources (UPI, bank and SMS apps) are also logged
 * with the decision, for Settings → Auto-detect → "Recent alerts seen".
 * Everything else (chats, other apps) is ignored and never stored.
 */

import { NotificationService } from "../notificationService";
import {
	DETECTION_TEST_TITLE,
	enqueue,
	getDetectionSettings,
	markTestReceived,
	recordSeen,
	SeenOutcome,
} from "./detectionQueue";
import {
	isPaymentSource,
	parseNotification,
	RawNotification,
	sourceLabel,
} from "./notificationListener";

/** Our own notifications also reach the listener; never parse those. */
const OWN_PACKAGE = "com.matrix122001.HabitTrackerApp";

export async function handleIncomingNotification({
	notification,
}: {
	notification?: string;
}): Promise<void> {
	if (!notification) return;
	try {
		const raw: RawNotification =
			typeof notification === "string" ? JSON.parse(notification) : notification;
		if (!raw?.app) return;
		if (raw.app === OWN_PACKAGE) {
			// Our own notifications are never payments - except the one the
			// "Test detection" button posts to check this pipeline is alive.
			if (raw.title === DETECTION_TEST_TITLE) await markTestReceived();
			return;
		}
		if (!isPaymentSource(raw)) return;

		// Android posts a text-less "group summary" alongside grouped
		// notifications. From SMS apps that's pure noise; from a UPI/bank app
		// an empty notification is worth logging - it means the app draws a
		// custom layout we can't read.
		const hasText = !!(raw.title || raw.text || raw.bigText || raw.groupedMessages?.length);
		if (!hasText && sourceLabel(raw.app) === "SMS") return;
		if (!hasText && sourceLabel(raw.app) === "Test (adb)") return;

		const log = (outcome: SeenOutcome, summary?: string) =>
			recordSeen({
				time: Date.now(),
				app: sourceLabel(raw.app!),
				title: raw.title ?? "",
				text: raw.bigText || raw.text || "",
				outcome,
				summary,
			});

		const settings = await getDetectionSettings();
		if (!settings.enabled) {
			await log("disabled");
			return;
		}

		const detected = parseNotification(raw);
		if (detected.length === 0) {
			await log("not_payment");
			return;
		}
		for (const tx of detected) {
			const summary = `₹${tx.amount} ${tx.type === "income" ? "received" : "spent"}`;
			const stored = await enqueue(tx);
			await log(stored ? "queued" : "duplicate", summary);
			if (stored && settings.notify) {
				await NotificationService.showDetectedTransaction(stored);
			}
		}
	} catch (error) {
		// A headless task must never throw - that crashes the task service.
		console.warn("Transaction detection failed for a notification:", error);
	}
}
