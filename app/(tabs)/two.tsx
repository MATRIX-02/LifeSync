import { Alert } from "@/src/components/CustomAlert";
import Constants from "expo-constants";
import { useAuthStore } from "@/src/context/authStore";
import FinanceCategorySettings from "@/src/components/finance/FinanceCategorySettings";
import TransactionDetectionSettings from "@/src/components/finance/TransactionDetectionSettings";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { ModuleType, useModuleStore } from "@/src/context/moduleContext";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import {
	describeDailyReset,
	getQuotaSnapshot,
	QuotaSnapshot,
	refreshQuota,
	subscribeToQuota,
} from "@/src/services/insights/quota";
import { NotificationService } from "@/src/services/notificationService";
import { buildSyncPayload } from "@/src/services/syncPayload";
import {
	deleteAllCloudData,
	getAutoSyncInterval,
	getSyncStatus,
	isAutoSyncRunning,
	setAutoSyncInterval,
	startAutoSync,
	stopAutoSync,
	syncAllToCloud,
	syncFinanceToCloud,
	syncHabitsToCloud,
	SyncModule,
	syncWorkoutsToCloud,
} from "@/src/services/syncService";
import {
	isAiSmsFallbackEnabled,
	setAiSmsFallbackEnabled,
} from "@/src/services/transactionDetection/aiSmsFallback";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
	Modal,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createStyles } from "@/src/styles/settingsScreen.styles";

// Scheduled-reminders view model
//
// The raw list is one entry per trigger, so a single "8 times a day" habit
// produces eight identical-looking cards and a handful of habits fills the
// screen with noise. These helpers fold that list into one row per source, with
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TriggerInfo = {
	label: string;
	/** Minutes past midnight, for sorting. Null when not a clock trigger. */
	timeOfDay: number | null;
	nextAt: number;
};

const describeTrigger = (trigger: any): TriggerInfo => {
	const now = Date.now();
	const pad = (n: number) => String(n).padStart(2, "0");

	if (!trigger) {
		return {
			label: "Unknown",
			timeOfDay: null,
			nextAt: Number.MAX_SAFE_INTEGER,
		};
	}

	const hour = Number(trigger.hour ?? 0);
	const minute = Number(trigger.minute ?? 0);
	const clock = `${pad(hour)}:${pad(minute)}`;

	// Daily: expo reports "daily", older builds report the numeric enum 0.
	if (trigger.type === "daily" || trigger.type === 0) {
		const next = new Date();
		next.setHours(hour, minute, 0, 0);
		if (next.getTime() <= now) next.setDate(next.getDate() + 1);
		return {
			label: clock,
			timeOfDay: hour * 60 + minute,
			nextAt: next.getTime(),
		};
	}

	// Weekly - what "specific days" habits produce. The old UI called these
	// "One-time trigger", which was simply wrong.
	if (trigger.type === "weekly" || trigger.weekday != null) {
		const weekday = Number(trigger.weekday ?? 1); // expo: 1 = Sunday
		const next = new Date();
		const targetDow = (weekday - 1 + 7) % 7;
		next.setHours(hour, minute, 0, 0);
		let delta = (targetDow - next.getDay() + 7) % 7;
		if (delta === 0 && next.getTime() <= now) delta = 7;
		next.setDate(next.getDate() + delta);
		return {
			label: `${WEEKDAYS[targetDow]} ${clock}`,
			timeOfDay: hour * 60 + minute,
			nextAt: next.getTime(),
		};
	}

	if (trigger.date) {
		const d = new Date(trigger.date);
		if (!isNaN(d.getTime())) {
			return {
				label: d.toLocaleString([], {
					day: "numeric",
					month: "short",
					hour: "2-digit",
					minute: "2-digit",
				}),
				timeOfDay: null,
				nextAt: d.getTime(),
			};
		}
	}

	if (trigger.seconds) {
		const secs = Number(trigger.seconds);
		return {
			label: secs >= 60 ? `in ${Math.round(secs / 60)}m` : `in ${secs}s`,
			timeOfDay: null,
			nextAt: now + secs * 1000,
		};
	}

	return { label: "One-off", timeOfDay: null, nextAt: Number.MAX_SAFE_INTEGER };
};

const relativeTime = (timestamp: number): string => {
	if (timestamp === Number.MAX_SAFE_INTEGER) return "unscheduled";
	const diff = timestamp - Date.now();
	if (diff <= 0) return "due now";
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `in ${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `in ${hours}h ${mins % 60}m`;
	return `in ${Math.round(hours / 24)}d`;
};

/** Human label + icon + colour for each notification `data.type`. */
const REMINDER_KINDS: Record<
	string,
	{ label: string; icon: string; color: string }
> = {
	habit_reminder: {
		label: "Habits",
		icon: "checkmark-circle",
		color: "#A78BFA",
	},
	bill_reminder: { label: "Bills", icon: "receipt", color: "#FBBF24" },
	water_reminder: { label: "Hydration", icon: "water", color: "#60A5FA" },
	water_reminder_single: {
		label: "Hydration",
		icon: "water",
		color: "#60A5FA",
	},
	pomodoro_end: { label: "Pomodoro", icon: "timer", color: "#F87171" },
	break_end: { label: "Breaks", icon: "cafe", color: "#F87171" },
	fasting_milestone: { label: "Fasting", icon: "hourglass", color: "#FB923C" },
	fasting_complete: { label: "Fasting", icon: "hourglass", color: "#FB923C" },
	timer_progress: { label: "Timers", icon: "time", color: "#94A3B8" },
	alarm_test: { label: "Test", icon: "flask", color: "#94A3B8" },
	test: { label: "Test", icon: "flask", color: "#94A3B8" },
};

const kindFor = (type?: string) =>
	REMINDER_KINDS[type || ""] || {
		label: "Other",
		icon: "notifications",
		color: "#94A3B8",
	};

const MODULE_OPTIONS: Record<
	ModuleType,
	{ label: string; description: string; icon: string; color: keyof Theme }
> = {
	habits: {
		label: "Daily Rituals",
		description: "Track and manage your habits",
		icon: "checkmark-circle",
		color: "primary",
	},
	workout: {
		label: "FitZone",
		description: "Track your workouts and fitness",
		icon: "barbell",
		color: "success",
	},
	finance: {
		label: "Money Hub",
		description: "Manage your finances and budgets",
		icon: "wallet",
		color: "warning",
	},
};

interface ModuleSettingRowProps {
	index: number;
	count: number;
	config: (typeof MODULE_OPTIONS)[ModuleType];
	enabled: boolean;
	theme: Theme;
	onToggle: (enabled: boolean) => void;
	onMove: (index: number, offset: number) => void;
}

const ModuleSettingRow: React.FC<ModuleSettingRowProps> = ({
	index,
	count,
	config,
	enabled,
	theme,
	onToggle,
	onMove,
}) => {
	const styles = createStyles(theme);
	const color = theme[config.color] as string;

	return (
		<View style={styles.moduleRowContainer}>
			<SettingRow
				icon={config.icon}
				iconColor={color}
				iconBg={color + "20"}
				label={config.label}
				description={config.description}
				theme={theme}
				rightElement={
					<View style={styles.moduleRowControls}>
						<View style={styles.moduleMoveButtons}>
							<TouchableOpacity
								style={[
									styles.moduleMoveButton,
									index === 0 && styles.moduleMoveButtonDisabled,
								]}
								disabled={index === 0}
								onPress={() => onMove(index, -1)}
								accessibilityRole="button"
								accessibilityLabel={`Move ${config.label} up`}
							>
								<Ionicons name="chevron-up" size={16} color={theme.textMuted} />
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.moduleMoveButton,
									index === count - 1 && styles.moduleMoveButtonDisabled,
								]}
								disabled={index === count - 1}
								onPress={() => onMove(index, 1)}
								accessibilityRole="button"
								accessibilityLabel={`Move ${config.label} down`}
							>
								<Ionicons
									name="chevron-down"
									size={16}
									color={theme.textMuted}
								/>
							</TouchableOpacity>
						</View>
						<Switch
							value={enabled}
							onValueChange={onToggle}
							trackColor={{ false: theme.border, true: theme.primary }}
							thumbColor="#FFFFFF"
						/>
					</View>
				}
			/>
			{index < count - 1 && <View style={styles.divider} />}
		</View>
	);
};

export default function SettingsScreen() {
	const router = useRouter();
	const { from } = useLocalSearchParams<{ from?: string }>();
	const { isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
	const theme = useColors();
	const habitStore = useHabitStore();
	const workoutStore = useWorkoutStore();
	const financeStore = useFinanceStore();
	const moduleStore = useModuleStore();
	const { user, isAdmin, profile: authProfile } = useAuthStore();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [showCategorySettings, setShowCategorySettings] = useState(false);
	const [showDetectionSettings, setShowDetectionSettings] = useState(false);
	const detectionEnabled = useTransactionDetectionStore((s) => s.settings.enabled);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [vibrationEnabled, setVibrationEnabled] = useState(true);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const [scheduledNotifications, setScheduledNotifications] = useState<any[]>(
		[],
	);
	const [aiQuota, setAiQuota] = useState<QuotaSnapshot | null>(null);
	const [isCheckingQuota, setIsCheckingQuota] = useState(false);
	const [aiSmsEnabled, setAiSmsEnabled] = useState(false);

	useEffect(() => {
		getQuotaSnapshot().then(setAiQuota);
		isAiSmsFallbackEnabled().then(setAiSmsEnabled);
		return subscribeToQuota(setAiQuota);
	}, []);

	const handleCheckQuota = async () => {
		setIsCheckingQuota(true);
		const snapshot = await refreshQuota();
		setIsCheckingQuota(false);

		if (!snapshot) {
			Alert.error(
				"Could not check usage",
				"The AI service could not be reached. Check your connection and try again.",
			);
		}
	};

	const handleToggleAiSms = (next: boolean) => {
		if (!next) {
			setAiSmsEnabled(false);
			setAiSmsFallbackEnabled(false);
			return;
		}

		Alert.alert(
			"Send SMS text to AI?",
			"Only bank messages LifeSync cannot read on its own will be sent to Groq, an external AI service, to extract the amount and merchant.\n\nLong digit runs are masked to the last 4 first. Messages are not stored by LifeSync, but they do leave your device.\n\nLeave this off if you would rather no message text leave your phone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Enable",
					onPress: () => {
						setAiSmsEnabled(true);
						setAiSmsFallbackEnabled(true);
					},
				},
			],
		);
	};

	// Cloud sync states
	const [isSyncing, setIsSyncing] = useState<SyncModule | null>(null);
	const [isRestoring, setIsRestoring] = useState<SyncModule | null>(null);
	const [syncStatus, setSyncStatus] = useState<{
		habits_synced_at?: string;
		workouts_synced_at?: string;
		finance_synced_at?: string;
	}>({});

	const styles = createStyles(theme);

	const moveModule = React.useCallback((index: number, offset: number) => {
		const { moduleOrder: order, reorderModules } = useModuleStore.getState();
		const destination = Math.max(0, Math.min(order.length - 1, index + offset));
		if (destination === index) return;

		const nextOrder = [...order];
		const [movedModule] = nextOrder.splice(index, 1);
		nextOrder.splice(destination, 0, movedModule);
		reorderModules(nextOrder);
	}, []);

	// Fetch sync status on mount
	useEffect(() => {
		if (user?.id) {
			getSyncStatus(user.id).then(setSyncStatus);
		}
	}, [user?.id]);

	// Auto-sync state
	const [autoSyncInterval, setAutoSyncIntervalState] = useState<number | null>(
		null,
	);
	const [autoSyncRunning, setAutoSyncRunning] = useState(false);
	const [showAutoSyncModal, setShowAutoSyncModal] = useState(false);
	const [tempInterval, setTempInterval] = useState<number | null>(null);

	useEffect(() => {
		let mounted = true;
		getAutoSyncInterval()
			.then((m) => {
				if (!mounted) return;
				setAutoSyncIntervalState(m);
			})
			.catch((e) => console.error(e));
		// The timer lives in syncService module scope, so read the real state
		// instead of assuming "off" every time this screen mounts.
		setAutoSyncRunning(isAutoSyncRunning());
		return () => {
			mounted = false;
		};
	}, []);

	const handleChooseInterval = () => {
		setTempInterval(autoSyncInterval ?? 5);
		setShowAutoSyncModal(true);
	};

	const selectTempInterval = (m: number) => {
		setTempInterval(m);
	};

	const applyTempInterval = async () => {
		if (tempInterval == null) {
			setShowAutoSyncModal(false);
			return;
		}
		try {
			await setAutoSyncInterval(tempInterval);
			setAutoSyncIntervalState(tempInterval);
			Alert.alert("Saved", `Auto-sync interval set to ${tempInterval} minutes`);
		} catch (err) {
			console.error(err);
			Alert.alert("Error", "Failed to set interval");
		} finally {
			setShowAutoSyncModal(false);
		}
	};

	const cancelTempInterval = () => {
		setShowAutoSyncModal(false);
	};

	const handleStartStopAutoSync = async () => {
		if (autoSyncRunning) {
			stopAutoSync();
			setAutoSyncRunning(false);
			Alert.alert("Auto-sync", "Auto-sync stopped");
			return;
		}
		const userId = user?.id;
		if (!userId) {
			Alert.alert("Not signed in", "Please sign in to enable auto-sync");
			return;
		}
		try {
			await startAutoSync(userId, buildSyncPayload, true);
			setAutoSyncRunning(true);
			Alert.alert("Auto-sync", "Auto-sync started");
		} catch (err) {
			console.error("startAutoSync error:", err);
			Alert.alert("Error", "Failed to start auto-sync");
		}
	};

	// Format last sync time
	const formatSyncTime = (timestamp?: string) => {
		if (!timestamp) return "Never synced";
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	};

	// ============ CLOUD SYNC HANDLERS ============
	const handleSyncToCloud = async (module: SyncModule) => {
		if (!user?.id) {
			Alert.alert(
				"Sign In Required",
				"Please sign in to sync your data to the cloud.",
			);
			return;
		}

		setIsSyncing(module);
		try {
			if (module === "all") {
				// Same payload auto-sync uses, so "Sync All" can't push less.
				const results = await syncAllToCloud(user.id, await buildSyncPayload());
				const failed = results.filter((r) => !r.success);
				if (failed.length > 0) {
					Alert.alert(
						"Partial Sync",
						`Some modules failed to sync:\n\n${failed
							.map((f) => `• ${f.module}: ${f.error || "unknown error"}`)
							.join("\n")}`,
					);
				} else {
					Alert.alert("Success", "All data synced to cloud!");
				}
			} else if (module === "habits") {
				const result = await syncHabitsToCloud(user.id, {
					habits: habitStore.habits,
					logs: habitStore.logs,
					settings: habitStore.settings,
				});
				if (!result.success) throw new Error(result.error);
				Alert.alert("Success", "Habits synced to cloud!");
			} else if (module === "workouts") {
				const result = await syncWorkoutsToCloud(user.id, {
					fitnessProfile: workoutStore.fitnessProfile,
					bodyMeasurements: workoutStore.bodyMeasurements,
					bodyWeights: workoutStore.bodyWeights,
					customExercises: workoutStore.customExercises,
					workoutPlans: workoutStore.workoutPlans,
					workoutSessions: workoutStore.workoutSessions,
					personalRecords: workoutStore.personalRecords,
				});
				if (!result.success) throw new Error(result.error);
				Alert.alert("Success", "Workouts synced to cloud!");
			} else if (module === "finance") {
				const result = await syncFinanceToCloud(user.id, {
					accounts: financeStore.accounts,
					transactions: financeStore.transactions,
					recurringTransactions: financeStore.recurringTransactions,
					budgets: financeStore.budgets,
					savingsGoals: financeStore.savingsGoals,
					billReminders: financeStore.billReminders,
					debts: financeStore.debts,
					splitGroups: financeStore.splitGroups,
					currency: financeStore.currency,
				});
				if (!result.success) throw new Error(result.error);
				Alert.alert("Success", "Finance data synced to cloud!");
			}

			// Refresh sync status
			const newStatus = await getSyncStatus(user.id);
			setSyncStatus(newStatus);
		} catch (error: any) {
			Alert.alert(
				"Sync Failed",
				error.message || "Failed to sync data to cloud.",
			);
		} finally {
			setIsSyncing(null);
		}
	};

	const handleRestoreFromCloud = async (module: SyncModule) => {
		if (!user?.id) {
			Alert.alert(
				"Sign In Required",
				"Please sign in to restore your data from the cloud.",
			);
			return;
		}

		// Habits are database-first - just refresh from DB
		if (module === "habits") {
			Alert.alert(
				"Refresh Data",
				"This will refresh your habits data from the database.",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Refresh",
						onPress: async () => {
							setIsRestoring(module);
							try {
								await habitStore.refreshFromDatabase();
								Alert.alert("Success", "Data refreshed from database!");
							} catch (error: any) {
								Alert.alert(
									"Refresh Failed",
									error.message || "Failed to refresh data.",
								);
							} finally {
								setIsRestoring(null);
							}
						},
					},
				],
			);
			return;
		}

		// All modules are database-first - just refresh from DB
		Alert.alert(
			"Refresh Data",
			"This will refresh your data from the database.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Refresh",
					onPress: async () => {
						setIsRestoring(module);
						try {
							if (module === "workouts" || module === "all") {
								await workoutStore.initialize(user.id);
							}
							if (module === "finance" || module === "all") {
								await financeStore.initialize(user.id);
							}
							// Note: Habits have their own refresh method
							// and are not part of the SyncModule type

							Alert.alert("Success", "Data refreshed from database!");
						} catch (error: any) {
							Alert.alert(
								"Refresh Failed",
								error.message || "Failed to refresh data.",
							);
						} finally {
							setIsRestoring(null);
						}
					},
				},
			],
		);
		return;
	};

	const handleDeleteCloudData = (module: SyncModule) => {
		if (!user?.id) {
			Alert.alert("Sign In Required", "Please sign in to manage cloud data.");
			return;
		}

		Alert.alert(
			"Delete Cloud Data",
			`This will permanently delete your ${
				module === "all" ? "ALL" : module
			} data from the cloud. Your local data will remain. Continue?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							const result = await deleteAllCloudData(user.id, module);
							if (!result.success) throw new Error(result.error);

							// Refresh sync status
							const newStatus = await getSyncStatus(user.id);
							setSyncStatus(newStatus);

							Alert.alert("Success", "Cloud data deleted successfully.");
						} catch (error: any) {
							Alert.alert(
								"Delete Failed",
								error.message || "Failed to delete cloud data.",
							);
						}
					},
				},
			],
		);
	};

	const handleShowScheduledReminders = async () => {
		try {
			const reminders =
				await NotificationService.getAllScheduledNotifications();
			setScheduledNotifications(reminders);
			setShowDeveloper(true);
		} catch (error) {
			Alert.alert("Error", "Failed to fetch scheduled reminders");
		}
	};

	// One row per source (a habit, or a whole feature like Hydration) instead of
	// one row per trigger. Sorted so whatever fires next is at the top.
	const reminderGroups = useMemo(() => {
		type Group = {
			key: string;
			kindLabel: string;
			icon: string;
			color: string;
			title: string;
			body: string;
			times: { label: string; nextAt: number; timeOfDay: number | null }[];
			nextAt: number;
			ids: string[];
		};

		const groups = new Map<string, Group>();

		for (const notif of scheduledNotifications as any[]) {
			const data = notif?.content?.data || {};
			const kind = kindFor(data.type);
			// Habits group per habit; everything else groups per feature.
			const key = data.habitId
				? `habit:${data.habitId}`
				: `type:${data.type || "other"}`;
			const habitName = data.habitId
				? habitStore.habits.find((h) => h.id === data.habitId)?.name
				: undefined;
			const info = describeTrigger(notif?.trigger);

			const existing = groups.get(key);
			if (existing) {
				existing.times.push(info);
				existing.nextAt = Math.min(existing.nextAt, info.nextAt);
				existing.ids.push(notif.identifier);
			} else {
				groups.set(key, {
					key,
					kindLabel: kind.label,
					icon: kind.icon,
					color: kind.color,
					title: habitName || notif?.content?.title || kind.label,
					body: notif?.content?.body || "",
					times: [info],
					nextAt: info.nextAt,
					ids: [notif.identifier],
				});
			}
		}

		return Array.from(groups.values())
			.map((g) => ({
				...g,
				times: g.times.sort(
					(a, b) =>
						(a.timeOfDay ?? 0) - (b.timeOfDay ?? 0) || a.nextAt - b.nextAt,
				),
			}))
			.sort((a, b) => a.nextAt - b.nextAt);
	}, [scheduledNotifications, habitStore.habits]);

	// Counts per feature, for the summary strip.
	const reminderTotals = useMemo(() => {
		const totals = new Map<
			string,
			{ label: string; color: string; count: number }
		>();
		for (const notif of scheduledNotifications as any[]) {
			const kind = kindFor(notif?.content?.data?.type);
			const entry = totals.get(kind.label);
			if (entry) entry.count += 1;
			else
				totals.set(kind.label, {
					label: kind.label,
					color: kind.color,
					count: 1,
				});
		}
		return Array.from(totals.values()).sort((a, b) => b.count - a.count);
	}, [scheduledNotifications]);

	const handleToggleNotifications = async () => {
		if (!notificationsEnabled) {
			const granted = await NotificationService.requestPermissions();
			if (!granted) {
				Alert.alert(
					"Permission Required",
					"Please enable notifications in your device settings to receive habit reminders.",
					[
						{ text: "Cancel", style: "cancel" },
						{ text: "Open Settings", onPress: () => Linking.openSettings() },
					],
				);
				return;
			}
		}
		setNotificationsEnabled(!notificationsEnabled);
	};


	return (
		<View style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => {
						if (from) {
							// Map module names to correct routes
							const routeMap: Record<string, string> = {
								habits: "/(tabs)/",
								workout: "/(tabs)/workout",
								finance: "/(tabs)/finance",
							};
							const route = routeMap[from] || `/(tabs)/${from}`;
							router.replace(route as any);
						} else if (router.canGoBack()) {
							router.back();
						} else {
							router.replace("/(tabs)");
						}
					}}
				>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Settings</Text>
				<View style={styles.placeholder} />
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Appearance Section */}
				<SettingsSection title="APPEARANCE" styles={styles}>
					<View style={styles.settingCard}>
						<SettingRow
							icon="moon"
							iconColor={theme.primary}
							iconBg={theme.primary + "20"}
							label="Dark Mode"
							description="Switch between light and dark themes"
							theme={theme}
							rightElement={
								<Switch
									value={isDark}
									onValueChange={toggleTheme}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>
					</View>
				</SettingsSection>

				{/* Modules Section */}
				<SettingsSection title="MODULES" styles={styles}>
					<View style={styles.settingCard}>
						{moduleStore.moduleOrder.map((module, index) => (
							<ModuleSettingRow
								key={module}
								index={index}
								count={moduleStore.moduleOrder.length}
								config={MODULE_OPTIONS[module]}
								enabled={moduleStore.isModuleEnabled(module)}
								theme={theme}
								onToggle={(enabled) => {
									void moduleStore.toggleModule(module, enabled);
								}}
								onMove={moveModule}
							/>
						))}
					</View>
				</SettingsSection>

				{/* Finance Section */}
				{moduleStore.isModuleEnabled("finance") && (
					<SettingsSection title="FINANCE" styles={styles}>
						<View style={styles.settingCard}>
							<TouchableOpacity
								activeOpacity={0.7}
								onPress={() => setShowCategorySettings(true)}
							>
								<SettingRow
									icon="pricetags"
									iconColor={theme.primary}
									iconBg={theme.primary + "20"}
									label="Categories"
									description="Choose which expense and income categories you use, or add your own"
									theme={theme}
									rightElement={
										<Ionicons
											name="chevron-forward"
											size={20}
											color={theme.textMuted}
										/>
									}
								/>
							</TouchableOpacity>
						</View>

						{Platform.OS === "android" && (
							<View style={[styles.settingCard, { marginTop: 12 }]}>
								<TouchableOpacity
									activeOpacity={0.7}
									onPress={() => setShowDetectionSettings(true)}
								>
									<SettingRow
										icon="flash"
										iconColor={theme.success}
										iconBg={theme.success + "20"}
										label="Auto-detect Payments"
										description={
											detectionEnabled
												? "On - payments from bank SMS and UPI apps are offered for review"
												: "Spot payments from bank SMS and UPI apps, even when the app is closed"
										}
										theme={theme}
										rightElement={
											<Ionicons
												name="chevron-forward"
												size={20}
												color={theme.textMuted}
											/>
										}
									/>
								</TouchableOpacity>
							</View>
						)}

						<View style={[styles.settingCard, { marginTop: 12 }]}>
							<SettingRow
								icon="chatbox-ellipses-outline"
								iconColor={theme.warning}
								iconBg={theme.warning + "20"}
								label="AI Reading of Bank SMS"
								description="Send unreadable bank messages to AI to detect transactions"
								theme={theme}
								rightElement={
									<Switch
										value={aiSmsEnabled}
										onValueChange={handleToggleAiSms}
										trackColor={{
											false: theme.border,
											true: theme.primary + "80",
										}}
										thumbColor={aiSmsEnabled ? theme.primary : theme.textMuted}
									/>
								}
							/>
						</View>

						<Text style={styles.quotaNote}>
							Off by default. When on, only messages LifeSync cannot parse
							itself are sent to an external AI service, with long digit runs
							masked.
						</Text>

						<FinanceCategorySettings
							visible={showCategorySettings}
							onClose={() => setShowCategorySettings(false)}
							theme={theme}
						/>
						<TransactionDetectionSettings
							visible={showDetectionSettings}
							onClose={() => setShowDetectionSettings(false)}
							theme={theme}
						/>
					</SettingsSection>
				)}

				{/* Notifications Section */}
				<SettingsSection title="NOTIFICATIONS" styles={styles}>
					<View style={styles.settingCard}>
						<SettingRow
							icon="notifications"
							iconColor={theme.accent}
							iconBg={theme.accent + "20"}
							label="Push Notifications"
							description="Receive daily habit reminders"
							theme={theme}
							rightElement={
								<Switch
									value={notificationsEnabled}
									onValueChange={handleToggleNotifications}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>

						<View style={styles.divider} />

						<SettingRow
							icon="volume-high"
							iconColor={theme.success}
							iconBg={theme.success + "20"}
							label="Sound"
							description="Play sound with notifications"
							theme={theme}
							rightElement={
								<Switch
									value={soundEnabled}
									onValueChange={setSoundEnabled}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
									disabled={!notificationsEnabled}
								/>
							}
						/>

						<View style={styles.divider} />

						{/* Android owns the per-channel sound picker: the app can only
						    ship sounds bundled at build time, and a channel's settings
						    are frozen after creation. Sending the user to the system
						    screen is the supported way to choose any tone or audio
						    file, and their choice takes precedence over ours. */}
						{Platform.OS === "android" && (
							<>
								<TouchableOpacity
									style={styles.settingRow}
									onPress={() =>
										NotificationService.openChannelSettings("reminder")
									}
								>
									<View
										style={[
											styles.settingIcon,
											{ backgroundColor: theme.primary + "20" },
										]}
									>
										<Ionicons
											name="musical-notes"
											size={20}
											color={theme.primary}
										/>
									</View>
									<View style={styles.settingContent}>
										<Text style={styles.settingLabel}>Reminder Sound</Text>
										<Text style={styles.settingDescription}>
											Choose any tone or audio file on your device
										</Text>
									</View>
									<Ionicons
										name="open-outline"
										size={18}
										color={theme.textMuted}
									/>
								</TouchableOpacity>

								<View style={styles.divider} />

								<TouchableOpacity
									style={styles.settingRow}
									onPress={() =>
										NotificationService.openChannelSettings("alarm")
									}
								>
									<View
										style={[
											styles.settingIcon,
											{ backgroundColor: "#F87171" + "20" },
										]}
									>
										<Ionicons name="alarm" size={20} color="#F87171" />
									</View>
									<View style={styles.settingContent}>
										<Text style={styles.settingLabel}>Alarm Sound</Text>
										<Text style={styles.settingDescription}>
											Used by habits with Alarm switched on
										</Text>
									</View>
									<Ionicons
										name="open-outline"
										size={18}
										color={theme.textMuted}
									/>
								</TouchableOpacity>

								<View style={styles.divider} />
							</>
						)}

						<SettingRow
							icon="phone-portrait"
							iconColor={theme.warning}
							iconBg={theme.warning + "20"}
							label="Vibration"
							description="Vibrate with notifications"
							theme={theme}
							rightElement={
								<Switch
									value={vibrationEnabled}
									onValueChange={setVibrationEnabled}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
									disabled={!notificationsEnabled}
								/>
							}
						/>
					</View>
				</SettingsSection>

				{/* Cloud Sync Section */}
				<SettingsSection title="CLOUD SYNC" styles={styles}>
					{user ? (
						<>
							{/* Sync All */}
							<View style={styles.settingCard}>
								<View style={styles.compactHeader}>
									<View style={styles.cloudHeaderRow}>
										<Text style={styles.compactHeaderText}>Sync to Cloud</Text>
										<View style={styles.cloudBadge}>
											<Ionicons name="cloud-done" size={12} color="#10B981" />
											<Text style={styles.cloudBadgeText}>Connected</Text>
										</View>
									</View>
								</View>
								<View style={styles.compactActions}>
									<TouchableOpacity
										style={[
											styles.compactButton,
											isSyncing === "all" && { opacity: 0.5 },
										]}
										onPress={() => handleSyncToCloud("all")}
										disabled={isSyncing !== null}
									>
										<View
											style={[
												styles.compactIcon,
												{ backgroundColor: theme.success + "20" },
											]}
										>
											{isSyncing === "all" ? (
												<ActivityIndicator size="small" color={theme.success} />
											) : (
												<Ionicons
													name="cloud-upload"
													size={18}
													color={theme.success}
												/>
											)}
										</View>
										<Text style={styles.compactButtonText}>Backup All</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[
											styles.compactButton,
											isRestoring === "all" && { opacity: 0.5 },
										]}
										onPress={() => handleRestoreFromCloud("all")}
										disabled={isRestoring !== null}
									>
										<View
											style={[
												styles.compactIcon,
												{ backgroundColor: theme.primary + "20" },
											]}
										>
											{isRestoring === "all" ? (
												<ActivityIndicator size="small" color={theme.primary} />
											) : (
												<Ionicons
													name="cloud-download"
													size={18}
													color={theme.primary}
												/>
											)}
										</View>
										<Text style={styles.compactButtonText}>Restore All</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Auto-sync (new) */}
							<View style={[styles.settingCard, { marginTop: 12 }]}>
								<View style={styles.compactHeader}>
									<Text style={styles.compactHeaderText}>Auto-sync</Text>
								</View>
								<View style={styles.compactActions}>
									<View
										style={[
											styles.compactButton,
											{
												flexDirection: "row",
												justifyContent: "space-between",
												alignItems: "center",
											},
										]}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={[
													styles.compactIcon,
													{ backgroundColor: theme.primary + "20" },
												]}
											>
												<Ionicons
													name="sync-circle"
													size={18}
													color={theme.primary}
												/>
											</View>
											<View style={{ marginLeft: 12 }}>
												<Text style={styles.compactButtonText}>Interval</Text>
												<Text style={[styles.compactButtonSubText]}>
													{autoSyncInterval
														? `${autoSyncInterval} minutes`
														: "Default 5 minutes"}
												</Text>
											</View>
										</View>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<TouchableOpacity
												onPress={handleChooseInterval}
												style={{ marginRight: 12 }}
											>
												<Text style={{ color: theme.primary }}>Change</Text>
											</TouchableOpacity>
											<TouchableOpacity onPress={handleStartStopAutoSync}>
												<Text style={{ color: theme.primary }}>
													{autoSyncRunning ? "Stop" : "Start"}
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
							</View>

							{/* Module-Specific Cloud Sync */}
							<View style={[styles.settingCard, { marginTop: 12 }]}>
								<View style={styles.compactHeader}>
									<Text style={styles.compactHeaderText}>By Module</Text>
								</View>

								{/* Habits Cloud */}
								{moduleStore.isModuleEnabled("habits") && (
									<>
										<View style={styles.moduleRow}>
											<View style={styles.moduleInfo}>
												<Ionicons
													name="checkmark-circle"
													size={16}
													color={theme.primary}
												/>
												<View>
													<Text style={styles.moduleLabel}>Daily Rituals</Text>
													<Text style={styles.syncTimeText}>
														{formatSyncTime(syncStatus.habits_synced_at)}
													</Text>
												</View>
											</View>
											<View style={styles.moduleActions}>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleSyncToCloud("habits")}
													disabled={isSyncing !== null}
												>
													{isSyncing === "habits" ? (
														<ActivityIndicator
															size="small"
															color={theme.success}
														/>
													) : (
														<Ionicons
															name="cloud-upload"
															size={18}
															color={theme.success}
														/>
													)}
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleRestoreFromCloud("habits")}
													disabled={isRestoring !== null}
												>
													{isRestoring === "habits" ? (
														<ActivityIndicator
															size="small"
															color={theme.primary}
														/>
													) : (
														<Ionicons
															name="cloud-download"
															size={18}
															color={theme.primary}
														/>
													)}
												</TouchableOpacity>
											</View>
										</View>
										<View style={styles.thinDivider} />
									</>
								)}

								{/* Workouts Cloud */}
								{moduleStore.isModuleEnabled("workout") && (
									<>
										<View style={styles.moduleRow}>
											<View style={styles.moduleInfo}>
												<Ionicons
													name="barbell"
													size={16}
													color={theme.success}
												/>
												<View>
													<Text style={styles.moduleLabel}>FitZone</Text>
													<Text style={styles.syncTimeText}>
														{formatSyncTime(syncStatus.workouts_synced_at)}
													</Text>
												</View>
											</View>
											<View style={styles.moduleActions}>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleSyncToCloud("workouts")}
													disabled={isSyncing !== null}
												>
													{isSyncing === "workouts" ? (
														<ActivityIndicator
															size="small"
															color={theme.success}
														/>
													) : (
														<Ionicons
															name="cloud-upload"
															size={18}
															color={theme.success}
														/>
													)}
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleRestoreFromCloud("workouts")}
													disabled={isRestoring !== null}
												>
													{isRestoring === "workouts" ? (
														<ActivityIndicator
															size="small"
															color={theme.primary}
														/>
													) : (
														<Ionicons
															name="cloud-download"
															size={18}
															color={theme.primary}
														/>
													)}
												</TouchableOpacity>
											</View>
										</View>
										<View style={styles.thinDivider} />
									</>
								)}

								{/* Finance Cloud */}
								{moduleStore.isModuleEnabled("finance") && (
									<>
										<View style={styles.thinDivider} />
										<View style={styles.moduleRow}>
											<View style={styles.moduleInfo}>
												<Ionicons
													name="wallet"
													size={16}
													color={theme.warning}
												/>
												<View>
													<Text style={styles.moduleLabel}>Money Hub</Text>
													<Text style={styles.syncTimeText}>
														{formatSyncTime(syncStatus.finance_synced_at)}
													</Text>
												</View>
											</View>
											<View style={styles.moduleActions}>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleSyncToCloud("finance")}
													disabled={isSyncing !== null}
												>
													{isSyncing === "finance" ? (
														<ActivityIndicator
															size="small"
															color={theme.success}
														/>
													) : (
														<Ionicons
															name="cloud-upload"
															size={18}
															color={theme.success}
														/>
													)}
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleRestoreFromCloud("finance")}
													disabled={isRestoring !== null}
												>
													{isRestoring === "finance" ? (
														<ActivityIndicator
															size="small"
															color={theme.primary}
														/>
													) : (
														<Ionicons
															name="cloud-download"
															size={18}
															color={theme.primary}
														/>
													)}
												</TouchableOpacity>
											</View>
										</View>
									</>
								)}

							</View>

							{/* Destructive */}
							<View style={[styles.settingCard, { marginTop: 12 }]}>
								<TouchableOpacity
									style={styles.settingRow}
									onPress={() => handleDeleteCloudData("all")}
								>
									<View
										style={[
											styles.settingIcon,
											{ backgroundColor: theme.error + "20" },
										]}
									>
										<Ionicons name="cloud-offline" size={20} color={theme.error} />
									</View>
									<View style={styles.settingContent}>
										<Text style={[styles.settingLabel, { color: theme.error }]}>
											Delete Cloud Backup
										</Text>
										<Text style={styles.settingDescription}>
											Permanently remove your data from the cloud
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
								</TouchableOpacity>
							</View>
						</>
					) : (
						<View style={styles.settingCard}>
							<TouchableOpacity
								style={styles.signInPrompt}
								onPress={() => router.push("/auth/login")}
							>
								<Ionicons
									name="cloud-offline-outline"
									size={32}
									color={theme.textMuted}
								/>
								<Text style={styles.signInPromptTitle}>
									Sign In to Enable Cloud Sync
								</Text>
								<Text style={styles.signInPromptText}>
									Sign in to back up your data and sync it across
									devices.
								</Text>
								<View style={styles.signInButton}>
									<Text style={styles.signInButtonText}>Sign In</Text>
								</View>
							</TouchableOpacity>
						</View>
					)}
				</SettingsSection>

				{/* AI Usage Section */}
				<SettingsSection title="AI USAGE" styles={styles}>
					<View style={styles.settingCard}>
						{aiQuota ? (
							<>
								<SettingRow
									icon="sparkles-outline"
									iconColor={theme.primary}
									iconBg={theme.primary + "20"}
									label="Analyses Left Today"
									description={
										aiQuota.remainingRequests !== undefined &&
										aiQuota.limitRequests !== undefined
											? `${aiQuota.remainingRequests.toLocaleString()} of ${aiQuota.limitRequests.toLocaleString()} · ${describeDailyReset()}`
											: "Not reported"
									}
									theme={theme}
								/>

								<View style={styles.divider} />

								<SettingRow
									icon="speedometer-outline"
									iconColor={theme.accent}
									iconBg={theme.accent + "20"}
									label="Token Budget"
									description={
										aiQuota.remainingTokens !== undefined &&
										aiQuota.limitTokens !== undefined
											? `${aiQuota.remainingTokens.toLocaleString()} of ${aiQuota.limitTokens.toLocaleString()} this minute`
											: "Not reported"
									}
									theme={theme}
								/>

								<View style={styles.divider} />

								<SettingRow
									icon="time-outline"
									iconColor={theme.textSecondary}
									iconBg={theme.textSecondary + "20"}
									label="Last Checked"
									description={new Date(aiQuota.capturedAt).toLocaleString()}
									theme={theme}
								/>
							</>
						) : (
							<SettingRow
								icon="sparkles-outline"
								iconColor={theme.textMuted}
								iconBg={theme.textMuted + "20"}
								label="Analyses Left Today"
								description="Tap Check Usage below to see your remaining quota"
								theme={theme}
							/>
						)}

						<View style={styles.divider} />

						<TouchableOpacity
							style={styles.settingRow}
							onPress={handleCheckQuota}
							disabled={isCheckingQuota}
						>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.primary + "20" },
								]}
							>
								{isCheckingQuota ? (
									<ActivityIndicator size="small" color={theme.primary} />
								) : (
									<Ionicons name="refresh" size={20} color={theme.primary} />
								)}
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>Check Usage</Text>
								<Text style={styles.settingDescription}>
									{isCheckingQuota ? "Checking…" : "Fetch the latest quota"}
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={18}
								color={theme.textMuted}
							/>
						</TouchableOpacity>
					</View>

					<Text style={styles.quotaNote}>
						The AI allowance is shared across everyone using LifeSync, not
						reserved per account. Checking uses one request of your daily
						allowance.
					</Text>
				</SettingsSection>

				{/* About Section */}
				<SettingsSection title="ABOUT" styles={styles}>
					<View style={styles.settingCard}>
						<View style={styles.settingRow}>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.primary + "20" },
								]}
							>
								<Ionicons
									name="information-circle-outline"
									size={20}
									color={theme.primary}
								/>
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>App Version</Text>
								<Text style={styles.settingDescription}>
									{/* From app.json, which `npm run release` bumps. */}
									{Constants.expoConfig?.version ?? "?"}
									{Constants.expoConfig?.android?.versionCode
										? ` (Build ${Constants.expoConfig.android.versionCode})`
										: ""}
								</Text>
							</View>
						</View>

						<View style={styles.divider} />

						<View style={styles.settingRow}>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.accent + "20" },
								]}
							>
								<Ionicons name="code-slash" size={20} color={theme.accent} />
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>Made with ❤️ by Mayank</Text>
								<Text style={styles.settingDescription}>
									For personal productivity
								</Text>
							</View>
						</View>
					</View>
				</SettingsSection>

				{/* Developer Section - Admin Only */}
				{isAdmin() && (
					<SettingsSection title="DEVELOPER" styles={styles}>
						<View style={styles.settingCard}>
							<TouchableOpacity
								style={styles.settingRow}
								onPress={handleShowScheduledReminders}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: "#8B5CF6" + "20" },
									]}
								>
									<Ionicons name="bug" size={20} color="#8B5CF6" />
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										View Scheduled Reminders
									</Text>
									<Text style={styles.settingDescription}>
										Debug: View all scheduled notifications
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textMuted}
								/>
							</TouchableOpacity>

							<View style={styles.divider} />

							<TouchableOpacity
								style={styles.settingRow}
								onPress={async () => {
									try {
										const granted =
											await NotificationService.requestPermissions();
										if (!granted) {
											Alert.alert(
												"Permission Denied",
												"Please enable notifications in your device settings.",
											);
											return;
										}
										await NotificationService.scheduleInstantNotification(
											"🔔 Test Notification",
											"Notifications are working! Your habit reminders will appear like this.",
											{ type: "test" },
										);
										Alert.alert(
											"Success!",
											"A test notification has been sent. Check your notification tray!",
										);
									} catch (error) {
										Alert.alert(
											"Error",
											"Failed to send notification. Make sure you're on a real device, not Expo Go.",
										);
									}
								}}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.primary + "20" },
									]}
								>
									<Ionicons name="send" size={20} color={theme.primary} />
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>Test Notification</Text>
									<Text style={styles.settingDescription}>
										Send a test push notification
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textMuted}
								/>
							</TouchableOpacity>

							<View style={styles.divider} />

							<TouchableOpacity
								style={styles.settingRow}
								onPress={async () => {
									try {
										// requestPermissions() also (re)creates the "alarms" channel.
										const granted =
											await NotificationService.requestPermissions();
										if (!granted) {
											Alert.alert(
												"Permission Denied",
												"Enable notifications for LifeSync in your device settings, then try again.",
											);
											return;
										}

										const diag =
											await NotificationService.getAlarmDiagnostics();
										await NotificationService.scheduleTestAlarm(10);

										Alert.alert(
											"Test Alarm Scheduled",
											`Firing in 10 seconds on the "alarms" channel.

` +
												`Lock the screen now to check it wakes the device.

` +
												`Permission: ${diag.permission}
` +
												`Alarm channel: ${
													diag.channelExists ? "created" : "MISSING"
												}
` +
												`Channel importance: ${
													diag.channelImportance ?? "n/a"
												} (5 = max)
` +
												`Physical device: ${diag.isDevice ? "yes" : "NO"}

` +
												`If it is silent, check Android Settings > Apps > LifeSync > ` +
												`Notifications > Alarms, and Special app access > Alarms & reminders.`,
										);
									} catch (error) {
										Alert.alert(
											"Error",
											"Failed to schedule the test alarm. Make sure you're on a real device, not Expo Go.",
										);
									}
								}}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: "#F87171" + "20" },
									]}
								>
									<Ionicons name="alarm" size={20} color="#F87171" />
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>Test Alarm</Text>
									<Text style={styles.settingDescription}>
										Fire an alarm-channel notification in 10s
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textMuted}
								/>
							</TouchableOpacity>

							<View style={styles.divider} />

							<TouchableOpacity
								style={styles.settingRow}
								onPress={async () => {
									try {
										const granted =
											await NotificationService.requestPermissions();
										if (!granted) {
											Alert.alert(
												"Permission Denied",
												"Please enable notifications in your device settings.",
											);
											return;
										}
										await NotificationService.scheduleInstantNotification(
											"Group Invitation",
											'Test User invited you to join "Test Group" group',
											{
												type: "group_invitation",
												groupId: "test-group-id",
												groupName: "Test Group",
												invitedByName: "Test User",
												invitedByUserId: "test-user-id",
											},
										);
										Alert.alert(
											"Success!",
											"A test invite notification has been sent. Tap it to test navigation to invitations!",
										);
									} catch (error) {
										Alert.alert(
											"Error",
											"Failed to send notification. Make sure you're on a real device, not Expo Go.",
										);
									}
								}}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.warning + "20" },
									]}
								>
									<Ionicons
										name="people-outline"
										size={20}
										color={theme.warning}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										Test Invite Notification
									</Text>
									<Text style={styles.settingDescription}>
										Test group invitation notification flow
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textMuted}
								/>
							</TouchableOpacity>
						</View>
					</SettingsSection>
				)}

				{/* Footer */}
				<View style={styles.footer}>
					<View style={styles.logoContainer}>
						<Image
							source={require("@/assets/images/icon.png")}
							style={styles.logoImage}
						/>
					</View>
					<Text style={styles.footerTitle}>LifeSync</Text>
					<Text style={styles.footerSubtitle}>
						Your all-in-one life tracker{"\n"}
						Habits • Fitness • Finance
					</Text>
					<Text style={styles.footerCopyright}>© 2026 All rights reserved</Text>
				</View>
			</ScrollView>

			<Modal
				visible={showAutoSyncModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowAutoSyncModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Auto-sync Interval</Text>
							<View style={{ width: 24 }} />
						</View>
						<View
							style={[
								styles.modalContent,
								{ paddingHorizontal: 16, paddingVertical: 12 },
							]}
						>
							<Text style={{ color: theme.textMuted, marginBottom: 8 }}>
								Choose how often the app should auto-sync (minutes)
							</Text>
							{[1, 5, 15, 30, 60].map((m) => {
								const selected = tempInterval === m;
								return (
									<TouchableOpacity
										key={m}
										style={[
											styles.modalOption,
											{
												backgroundColor: selected
													? theme.primary + "10"
													: theme.surface,
											},
										]}
										onPress={() => selectTempInterval(m)}
									>
										<Text style={styles.compactButtonText}>{m} minutes</Text>
										{selected ? (
											<Ionicons
												name="checkmark-circle"
												size={20}
												color={theme.primary}
											/>
										) : (
											<View style={{ width: 20 }} />
										)}
									</TouchableOpacity>
								);
							})}
						</View>
						<View style={styles.modalActions}>
							<TouchableOpacity
								style={styles.modalActionBtn}
								onPress={cancelTempInterval}
							>
								<Text
									style={[styles.compactButtonText, { color: theme.textMuted }]}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modalActionBtn,
									{ backgroundColor: theme.primary },
								]}
								onPress={applyTempInterval}
							>
								<Text style={[styles.compactButtonText, { color: "#fff" }]}>
									Apply
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Developer Modal - Scheduled Reminders */}
			<Modal
				visible={showDeveloper}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowDeveloper(false)}
			>
				<SafeAreaView
					style={[styles.container, { backgroundColor: theme.background }]}
				>
					{/* Modal Header */}
					<View style={styles.modalHeader}>
						<TouchableOpacity onPress={() => setShowDeveloper(false)}>
							<Ionicons name="chevron-back" size={24} color={theme.text} />
						</TouchableOpacity>
						<Text style={styles.modalTitle}>Scheduled Reminders</Text>
						<View style={{ width: 24 }} />
					</View>

					{/* Summary strip: what is scheduled, and for which feature. The
					    notification queue is shared across every module, so the
					    breakdown matters. */}
					{scheduledNotifications.length > 0 && (
						<View style={styles.reminderSummary}>
							<Text style={styles.reminderSummaryCount}>
								{scheduledNotifications.length} scheduled
							</Text>
							<View style={styles.reminderChipRow}>
								{reminderTotals.map((t) => (
									<View
										key={t.label}
										style={[
											styles.reminderKindChip,
											{ backgroundColor: t.color + "22", borderColor: t.color },
										]}
									>
										<Text
											style={[styles.reminderKindChipText, { color: t.color }]}
										>
											{t.label} {t.count}
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Reminders List */}
					<ScrollView style={styles.modalContent}>
						{scheduledNotifications.length === 0 ? (
							<View style={styles.emptyState}>
								<Ionicons
									name="alarm-outline"
									size={64}
									color={theme.textMuted}
								/>
								<Text style={[styles.emptyStateText, { marginTop: 16 }]}>
									No reminders scheduled
								</Text>
								<Text style={styles.emptyStateSubtext}>
									Schedule some habits with reminders to see them here
								</Text>
							</View>
						) : (
							<View style={styles.remindersList}>
								{reminderGroups.map((group) => (
									<View key={group.key} style={styles.reminderCard}>
										<View style={styles.reminderCardHeader}>
											<View
												style={[
													styles.reminderKindIcon,
													{ backgroundColor: group.color + "22" },
												]}
											>
												<Ionicons
													name={group.icon as any}
													size={18}
													color={group.color}
												/>
											</View>
											<View style={{ flex: 1 }}>
												<Text style={styles.reminderTitle} numberOfLines={1}>
													{group.title}
												</Text>
												<Text style={styles.reminderBody} numberOfLines={2}>
													{group.body}
												</Text>
											</View>
											<View style={{ alignItems: "flex-end" }}>
												<Text style={styles.reminderNext}>
													{relativeTime(group.nextAt)}
												</Text>
												{group.times.length > 1 && (
													<Text style={styles.reminderCount}>
														{group.times.length}×/day
													</Text>
												)}
											</View>
										</View>

										{/* Every trigger this source owns, as compact chips. */}
										<View style={styles.reminderTimeRow}>
											{group.times.map((t, i) => (
												<View
													key={`${group.key}-${i}`}
													style={styles.reminderTimeChip}
												>
													<Text style={styles.reminderTimeChipText}>
														{t.label}
													</Text>
												</View>
											))}
										</View>
									</View>
								))}
							</View>
						)}
						<View style={{ height: 40 }} />
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</View>
	);
}

// Setting Row Component
interface SettingRowProps {
	icon: string;
	iconColor: string;
	iconBg: string;
	label: string;
	description: string;
	theme: Theme;
	rightElement?: React.ReactNode;
}

const SettingsSection: React.FC<{
	title: string;
	styles: ReturnType<typeof createStyles>;
	children: React.ReactNode;
}> = ({ title, styles, children }) => (
	<View style={styles.section}>
		<Text style={styles.sectionTitle}>{title}</Text>
		{children}
	</View>
);

const SettingRow: React.FC<SettingRowProps> = ({
	icon,
	iconColor,
	iconBg,
	label,
	description,
	theme,
	rightElement,
}) => {
	const styles = createStyles(theme);

	return (
		<View style={styles.settingRow}>
			<View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
				<Ionicons name={icon as any} size={20} color={iconColor} />
			</View>
			<View style={styles.settingContent}>
				<Text style={styles.settingLabel}>{label}</Text>
				<Text style={styles.settingDescription}>{description}</Text>
			</View>
			{rightElement}
		</View>
	);
};
