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
	isContentHidden,
	isPaymentSource,
	parseNotification,
	RawNotification,
	sourceLabel,
} from "./notificationListener";
import { getRecentTransactionSms } from "./smsReader";

/** Our own notifications also reach the listener; never parse those. */
const OWN_PACKAGE = "com.matrix122001.HabitTrackerApp";

const isSmsSource = (pkg: string) => sourceLabel(pkg) === "SMS";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * After a hidden UPI/bank alert: the same payment normally lands as a bank
 * SMS within seconds, and reading the SMS inbox isn't affected by the
 * redaction. The task has 15 s (library HeadlessJsTaskConfig timeout), so
 * check a few times inside ~12 s. Anything later is still caught by the SMS
 * app's own notification or the catch-up scan when the app opens.
 */
async function catchUpFromBankSms(notify: boolean): Promise<void> {
	for (const wait of [1500, 4000, 5500]) {
		await sleep(wait);
		let found;
		try {
			found = await getRecentTransactionSms({ maxCount: 20, hoursBack: 0.25 });
		} catch {
			return; // no SMS permission / module - nothing more we can do
		}
		let added = false;
		for (const tx of found) {
			const stored = await enqueue(tx);
			if (!stored) continue;
			added = true;
			await recordSeen({
				time: Date.now(),
				app: tx.bankName ?? "Bank SMS",
				title: "",
				text: tx.rawText,
				outcome: "from_sms",
				summary: `₹${tx.amount} ${tx.type === "income" ? "received" : "spent"}`,
			});
			if (notify) await NotificationService.showDetectedTransaction(stored);
		}
		if (added) return;
	}
}

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

		// Android hid the content (sensitive notification protection). The
		// payment usually also arrives as a bank SMS - look for it.
		if (isContentHidden(raw)) {
			await log("hidden");
			if (!isSmsSource(raw.app)) await catchUpFromBankSms(settings.notify);
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
