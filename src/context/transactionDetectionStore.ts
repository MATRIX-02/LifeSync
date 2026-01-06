/**
 * Transaction Detection Store
 * Zustand store for managing detected transactions from notifications and SMS
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	checkNotificationPermission,
	checkSmsPermission,
	DetectedTransaction,
	getRecentTransactionSms,
	requestNotificationPermission,
	requestSmsPermission,
	startNotificationListener,
	startSmsWatcher,
	stopNotificationListener,
	stopSmsWatcher,
} from "../services/transactionDetection";

interface TransactionDetectionState {
	// Detected transactions pending user action
	pendingTransactions: DetectedTransaction[];

	// Processed transaction IDs (to avoid duplicates)
	processedIds: string[];

	// Dismissed transaction IDs
	dismissedIds: string[];

	// Settings
	settings: {
		notificationListenerEnabled: boolean;
		smsReaderEnabled: boolean;
		autoShowPrompt: boolean;
		notificationPermissionGranted: boolean;
		smsPermissionGranted: boolean;
	};

	// Service status
	isListening: boolean;
	isSmsWatching: boolean;

	// Actions
	addDetectedTransaction: (transaction: DetectedTransaction) => void;
	markAsProcessed: (id: string) => void;
	dismissTransaction: (id: string) => void;
	clearPending: () => void;

	// Permission & service management
	checkPermissions: () => Promise<void>;
	requestNotificationAccess: () => Promise<boolean>;
	requestSmsAccess: () => Promise<boolean>;
	startListening: () => Promise<void>;
	stopListening: () => void;
	scanRecentSms: () => Promise<DetectedTransaction[]>;

	// Settings
	toggleNotificationListener: (enabled: boolean) => void;
	toggleSmsReader: (enabled: boolean) => void;
	toggleAutoShowPrompt: (enabled: boolean) => void;
}

export const useTransactionDetectionStore = create<TransactionDetectionState>()(
	persist(
		(set, get) => ({
			pendingTransactions: [],
			processedIds: [],
			dismissedIds: [],
			settings: {
				notificationListenerEnabled: true,
				smsReaderEnabled: true,
				autoShowPrompt: true,
				notificationPermissionGranted: false,
				smsPermissionGranted: false,
			},
			isListening: false,
			isSmsWatching: false,

			addDetectedTransaction: (transaction) => {
				const { processedIds, dismissedIds, pendingTransactions } = get();

				// Skip if already processed or dismissed
				if (
					processedIds.includes(transaction.id) ||
					dismissedIds.includes(transaction.id)
				) {
					return;
				}

				// Check for duplicate by reference ID
				if (transaction.referenceId) {
					const hasDuplicate = pendingTransactions.some(
						(t) => t.referenceId === transaction.referenceId
					);
					if (hasDuplicate) {
						return;
					}
				}

				// Check for very similar transaction (same amount and close timestamp)
				const twoMinutes = 2 * 60 * 1000;
				const hasSimilar = pendingTransactions.some(
					(t) =>
						t.amount === transaction.amount &&
						Math.abs(t.timestamp.getTime() - transaction.timestamp.getTime()) <
							twoMinutes
				);
				if (hasSimilar) {
					return;
				}

				set({
					pendingTransactions: [transaction, ...pendingTransactions].slice(
						0,
						50
					), // Keep max 50
				});
			},

			markAsProcessed: (id) => {
				const { pendingTransactions, processedIds } = get();
				set({
					pendingTransactions: pendingTransactions.filter((t) => t.id !== id),
					processedIds: [...processedIds, id].slice(-200), // Keep last 200
				});
			},

			dismissTransaction: (id) => {
				const { pendingTransactions, dismissedIds } = get();
				set({
					pendingTransactions: pendingTransactions.filter((t) => t.id !== id),
					dismissedIds: [...dismissedIds, id].slice(-200),
				});
			},

			clearPending: () => {
				set({ pendingTransactions: [] });
			},

			checkPermissions: async () => {
				if (Platform.OS !== "android") return;

				const notificationPermission = await checkNotificationPermission();
				const smsPermission = await checkSmsPermission();

				set({
					settings: {
						...get().settings,
						notificationPermissionGranted: notificationPermission,
						smsPermissionGranted: smsPermission,
					},
				});
			},

			requestNotificationAccess: async () => {
				if (Platform.OS !== "android") return false;

				await requestNotificationPermission();
				// Check again after returning from settings
				const granted = await checkNotificationPermission();

				set({
					settings: {
						...get().settings,
						notificationPermissionGranted: granted,
					},
				});

				return granted;
			},

			requestSmsAccess: async () => {
				if (Platform.OS !== "android") return false;

				const granted = await requestSmsPermission();

				set({
					settings: {
						...get().settings,
						smsPermissionGranted: granted,
					},
				});

				return granted;
			},

			startListening: async () => {
				if (Platform.OS !== "android") return;

				const { settings, addDetectedTransaction } = get();

				// Start notification listener
				if (
					settings.notificationListenerEnabled &&
					settings.notificationPermissionGranted
				) {
					const started = await startNotificationListener((transaction) => {
						addDetectedTransaction(transaction);
					});
					if (started) {
						set({ isListening: true });
					}
				}

				// Start SMS watcher
				if (settings.smsReaderEnabled && settings.smsPermissionGranted) {
					startSmsWatcher((transaction) => {
						addDetectedTransaction(transaction);
					}, 30000);
					set({ isSmsWatching: true });
				}
			},

			stopListening: () => {
				stopNotificationListener();
				stopSmsWatcher();
				set({ isListening: false, isSmsWatching: false });
			},

			scanRecentSms: async () => {
				if (Platform.OS !== "android") return [];

				const { settings, addDetectedTransaction } = get();

				if (!settings.smsPermissionGranted) {
					return [];
				}

				const transactions = await getRecentTransactionSms({
					maxCount: 50,
					hoursBack: 48, // Last 48 hours
				});

				// Add to pending
				for (const t of transactions) {
					addDetectedTransaction(t);
				}

				return transactions;
			},

			toggleNotificationListener: (enabled) => {
				set({
					settings: {
						...get().settings,
						notificationListenerEnabled: enabled,
					},
				});

				// Restart services if needed
				if (enabled) {
					get().startListening();
				} else {
					stopNotificationListener();
					set({ isListening: false });
				}
			},

			toggleSmsReader: (enabled) => {
				set({
					settings: {
						...get().settings,
						smsReaderEnabled: enabled,
					},
				});

				// Restart services if needed
				if (enabled) {
					get().startListening();
				} else {
					stopSmsWatcher();
					set({ isSmsWatching: false });
				}
			},

			toggleAutoShowPrompt: (enabled) => {
				set({
					settings: {
						...get().settings,
						autoShowPrompt: enabled,
					},
				});
			},
		}),
		{
			name: "transaction-detection-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				processedIds: state.processedIds,
				dismissedIds: state.dismissedIds,
				settings: state.settings,
			}),
		}
	)
);
