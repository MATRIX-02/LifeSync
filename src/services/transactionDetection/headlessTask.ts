/**
 * Headless task: runs for every notification posted on the phone, even when
 * LifeSync is closed (registered in /index.js).
 *
 * "Ask first": it only parses, queues and posts a "Tap to add" notification.
 * Nothing is saved to the database here - the user confirms in the app
 * (TransactionPrompt). That keeps this task fast, and means no auth/session
 * or store setup is needed in the background.
 */

import { NotificationService } from "../notificationService";
import { enqueue, getDetectionSettings } from "./detectionQueue";
import { parseNotification, RawNotification } from "./notificationListener";

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
		if (!raw?.app || raw.app === OWN_PACKAGE) return;

		const settings = await getDetectionSettings();
		if (!settings.enabled) return;

		for (const detected of parseNotification(raw)) {
			const stored = await enqueue(detected);
			if (stored && settings.notify) {
				await NotificationService.showDetectedTransaction(stored);
			}
		}
	} catch (error) {
		// A headless task must never throw - that crashes the task service.
		console.warn("Transaction detection failed for a notification:", error);
	}
}
