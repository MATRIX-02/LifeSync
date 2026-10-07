/**
 * Transaction Detection Store - UI layer over the shared detection queue.
 *
 * Detection itself runs in the background headless task
 * (services/transactionDetection/headlessTask.ts), which writes to an
 * AsyncStorage queue. This store mirrors that queue for the UI, handles
 * permissions, and runs the SMS inbox catch-up scan when the app opens.
 *
 * Not persisted with zustand: the queue in AsyncStorage is the single source
 * of truth, shared with the headless task.
 */

import { AppState, Platform } from "react-native";
import { create } from "zustand";
import { NotificationService } from "../services/notificationService";
import {
	checkNotificationPermission,
	checkSmsPermission,
	DetectedTransaction,
	getRecentTransactionSms,
	requestNotificationPermission,
	requestSmsPermission,
} from "../services/transactionDetection";
import {
	clearPending as clearQueue,
	DetectionSettings,
	enqueue,
	getDetectionSettings,
	listPending,
	markHandled,
	updateDetectionSettings,
} from "../services/transactionDetection/detectionQueue";

/** Don't rescan the SMS inbox more often than this. */
const INBOX_SCAN_INTERVAL_MS = 15 * 60 * 1000;

interface TransactionDetectionState {
	pendingTransactions: DetectedTransaction[];
	settings: DetectionSettings;
	notificationAccess: boolean;
	smsAccess: boolean;
	/** Set when the app was opened from a detection notification. */
	focusId: string | null;

	/** Reload queue, settings and permission status. */
	refresh: () => Promise<void>;
	setEnabled: (enabled: boolean) => Promise<void>;
	setNotify: (notify: boolean) => Promise<void>;
	requestNotificationAccess: () => Promise<void>;
	requestSmsAccess: () => Promise<boolean>;
	/** Catch-up: scan recent bank SMS for anything the listener missed. */
	scanRecentSms: (force?: boolean) => Promise<number>;
	markAsProcessed: (id: string) => Promise<void>;
	dismissTransaction: (id: string) => Promise<void>;
	clearPending: () => Promise<void>;
	setFocusId: (id: string | null) => void;
}

export const useTransactionDetectionStore = create<TransactionDetectionState>()(
	(set, get) => ({
		pendingTransactions: [],
		settings: { enabled: false, notify: true, lastInboxScan: 0 },
		notificationAccess: false,
		smsAccess: false,
		focusId: null,

		refresh: async () => {
			if (Platform.OS !== "android") return;
			const [pendingTransactions, settings, notificationAccess, smsAccess] =
				await Promise.all([
					listPending(),
					getDetectionSettings(),
					checkNotificationPermission(),
					checkSmsPermission(),
				]);
			set({ pendingTransactions, settings, notificationAccess, smsAccess });
		},

		setEnabled: async (enabled) => {
			const settings = await updateDetectionSettings({ enabled });
			set({ settings });
			if (enabled) await get().scanRecentSms(true);
		},

		setNotify: async (notify) => {
			set({ settings: await updateDetectionSettings({ notify }) });
		},

		requestNotificationAccess: async () => {
			// Opens system settings; refreshed when the app returns (AppState).
			await requestNotificationPermission();
		},

		requestSmsAccess: async () => {
			const granted = await requestSmsPermission();
			set({ smsAccess: granted });
			if (granted && get().settings.enabled) await get().scanRecentSms(true);
			return granted;
		},

		scanRecentSms: async (force = false) => {
			if (Platform.OS !== "android") return 0;
			const settings = await getDetectionSettings();
			if (!settings.enabled || !(await checkSmsPermission())) return 0;
			if (!force && Date.now() - settings.lastInboxScan < INBOX_SCAN_INTERVAL_MS) {
				return 0;
			}
			await updateDetectionSettings({ lastInboxScan: Date.now() });

			let added = 0;
			try {
				const found = await getRecentTransactionSms({ maxCount: 100, hoursBack: 48 });
				for (const tx of found) if (await enqueue(tx)) added++;
			} catch (error) {
				console.warn("SMS catch-up scan failed:", error);
			}
			set({ pendingTransactions: await listPending() });
			return added;
		},

		markAsProcessed: async (id) => {
			await markHandled(id, "added");
			void NotificationService.cancelDetectedTransaction(id);
			set({ pendingTransactions: await listPending() });
		},

		dismissTransaction: async (id) => {
			await markHandled(id, "ignored");
			void NotificationService.cancelDetectedTransaction(id);
			set({ pendingTransactions: await listPending() });
		},

		clearPending: async () => {
			const ids = get().pendingTransactions.map((t) => t.id);
			await clearQueue();
			ids.forEach((id) => void NotificationService.cancelDetectedTransaction(id));
			set({ pendingTransactions: [] });
		},

		setFocusId: (focusId) => set({ focusId }),
	}),
);

/**
 * Keep the store in step with the background task: refresh (and run the
 * throttled inbox catch-up) whenever the app comes to the foreground.
 * Call once from the root layout; returns an unsubscribe.
 */
export function watchDetectionQueue(): () => void {
	if (Platform.OS !== "android") return () => {};
	const store = useTransactionDetectionStore.getState();
	const sync = async () => {
		await store.refresh();
		await store.scanRecentSms();
	};
	void sync();
	const sub = AppState.addEventListener("change", (state) => {
		if (state === "active") void sync();
	});
	return () => sub.remove();
}
