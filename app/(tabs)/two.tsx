import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { ModuleType, useModuleStore } from "@/src/context/moduleContext";
import { useStudyStore } from "@/src/context/studyStoreDB/index";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import { NotificationService } from "@/src/services/notificationService";
import {
	deleteAllCloudData,
	getSyncStatus,
	syncAllToCloud,
	syncFinanceToCloud,
	syncHabitsToCloud,
	SyncModule,
	syncStudyToCloud,
	syncWorkoutsToCloud,
} from "@/src/services/syncService";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
	Modal,
	ScrollView,
	StatusBar,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
	const router = useRouter();
	const { from } = useLocalSearchParams<{ from?: string }>();
	const { isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
	const theme = useColors();
	const habitStore = useHabitStore();
	const workoutStore = useWorkoutStore();
	const financeStore = useFinanceStore();
	const studyStore = useStudyStore();
	const moduleStore = useModuleStore();
	const { user, isAdmin } = useAuthStore();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [vibrationEnabled, setVibrationEnabled] = useState(true);
	const [isExporting, setIsExporting] = useState<ModuleType | null>(null);
	const [isImporting, setIsImporting] = useState<ModuleType | null>(null);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const [scheduledNotifications, setScheduledNotifications] = useState<any[]>(
		[]
	);

	// Cloud sync states
	const [isSyncing, setIsSyncing] = useState<SyncModule | null>(null);
	const [isRestoring, setIsRestoring] = useState<SyncModule | null>(null);
	const [syncStatus, setSyncStatus] = useState<{
		habits_synced_at?: string;
		workouts_synced_at?: string;
		finance_synced_at?: string;
		study_synced_at?: string;
	}>({});

	const styles = createStyles(theme);

	// Fetch sync status on mount
	useEffect(() => {
		if (user?.id) {
			getSyncStatus(user.id).then(setSyncStatus);
		}
	}, [user?.id]);

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
				"Please sign in to sync your data to the cloud."
			);
			return;
		}

		setIsSyncing(module);
		try {
			if (module === "all") {
				const results = await syncAllToCloud(user.id, {
					habits: {
						habits: habitStore.habits,
						logs: habitStore.logs,
						settings: habitStore.settings,
					},
					workouts: {
						fitnessProfile: workoutStore.fitnessProfile,
						bodyMeasurements: workoutStore.bodyMeasurements,
						bodyWeights: workoutStore.bodyWeights,
						customExercises: workoutStore.customExercises,
						workoutPlans: workoutStore.workoutPlans,
						workoutSessions: workoutStore.workoutSessions,
						personalRecords: workoutStore.personalRecords,
					},
					finance: {
						accounts: financeStore.accounts,
						transactions: financeStore.transactions,
						recurringTransactions: financeStore.recurringTransactions,
						budgets: financeStore.budgets,
						savingsGoals: financeStore.savingsGoals,
						billReminders: financeStore.billReminders,
						debts: financeStore.debts,
					},
					study: {
						studyGoals: studyStore.studyGoals,
						subjects: studyStore.subjects,
						studySessions: studyStore.studySessions,
						flashcardDecks: studyStore.flashcardDecks,
						flashcards: studyStore.flashcards,
						revisionSchedule: studyStore.revisionSchedule,
						mockTests: studyStore.mockTests,
						dailyPlans: studyStore.dailyPlans,
					},
				});
				const failed = results.filter((r) => !r.success);
				if (failed.length > 0) {
					Alert.alert(
						"Partial Sync",
						`Some modules failed to sync: ${failed
							.map((f) => f.module)
							.join(", ")}`
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
			} else if (module === "study") {
				const result = await syncStudyToCloud(user.id, {
					studyGoals: studyStore.studyGoals,
					subjects: studyStore.subjects,
					studySessions: studyStore.studySessions,
					flashcardDecks: studyStore.flashcardDecks,
					flashcards: studyStore.flashcards,
					revisionSchedule: studyStore.revisionSchedule,
					mockTests: studyStore.mockTests,
					dailyPlans: studyStore.dailyPlans,
					studyNotes: studyStore.studyNotes,
				});
				if (!result.success) throw new Error(result.error);
				Alert.alert("Success", "Study data synced to cloud!");
			}

			// Refresh sync status
			const newStatus = await getSyncStatus(user.id);
			setSyncStatus(newStatus);
		} catch (error: any) {
			Alert.alert(
				"Sync Failed",
				error.message || "Failed to sync data to cloud."
			);
		} finally {
			setIsSyncing(null);
		}
	};

	const handleRestoreFromCloud = async (module: SyncModule) => {
		if (!user?.id) {
			Alert.alert(
				"Sign In Required",
				"Please sign in to restore your data from the cloud."
			);
			return;
		}

		// Habits and Study are database-first - just refresh from DB
		if (module === "habits" || module === "study") {
			Alert.alert(
				"Refresh Data",
				`This will refresh your ${
					module === "habits" ? "habits" : "study"
				} data from the database.`,
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Refresh",
						onPress: async () => {
							setIsRestoring(module);
							try {
								if (module === "habits") {
									await habitStore.refreshFromDatabase();
								} else {
									await studyStore.initialize(user.id);
								}
								Alert.alert("Success", "Data refreshed from database!");
							} catch (error: any) {
								Alert.alert(
									"Refresh Failed",
									error.message || "Failed to refresh data."
								);
							} finally {
								setIsRestoring(null);
							}
						},
					},
				]
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
							// Note: Habits and Study have their own refresh methods
							// and are not part of the SyncModule type

							Alert.alert("Success", "Data refreshed from database!");
						} catch (error: any) {
							Alert.alert(
								"Refresh Failed",
								error.message || "Failed to refresh data."
							);
						} finally {
							setIsRestoring(null);
						}
					},
				},
			]
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
								error.message || "Failed to delete cloud data."
							);
						}
					},
				},
			]
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
					]
				);
				return;
			}
		}
		setNotificationsEnabled(!notificationsEnabled);
	};

	// Export module-specific data
	const handleExportModuleData = async (module: ModuleType) => {
		setIsExporting(module);
		try {
			let exportData: any = {
				version: "1.0.0",
				exportedAt: new Date().toISOString(),
				appName: "LifeSync",
				module: module,
				data: {},
			};

			if (module === "habits") {
				exportData.data = {
					habits: habitStore.habits,
					logs: habitStore.logs,
					profile: habitStore.profile,
					settings: habitStore.settings,
				};
			} else if (module === "workout") {
				exportData.data = {
					fitnessProfile: workoutStore.fitnessProfile,
					bodyMeasurements: workoutStore.bodyMeasurements,
					bodyWeights: workoutStore.bodyWeights,
					customExercises: workoutStore.customExercises,
					workoutPlans: workoutStore.workoutPlans,
					workoutSessions: workoutStore.workoutSessions,
					personalRecords: workoutStore.personalRecords,
					activePlanId: workoutStore.activePlanId,
				};
			} else if (module === "finance") {
				exportData.data = {
					accounts: financeStore.accounts,
					transactions: financeStore.transactions,
					recurringTransactions: financeStore.recurringTransactions,
					budgets: financeStore.budgets,
					savingsGoals: financeStore.savingsGoals,
					billReminders: financeStore.billReminders,
					debts: financeStore.debts,
					splitGroups: financeStore.splitGroups,
					currency: financeStore.currency,
				};
			} else if (module === "study") {
				exportData.data = {
					studyGoals: studyStore.studyGoals,
					subjects: studyStore.subjects,
					studySessions: studyStore.studySessions,
					flashcardDecks: studyStore.flashcardDecks,
					flashcards: studyStore.flashcards,
					revisionSchedule: studyStore.revisionSchedule,
					mockTests: studyStore.mockTests,
					dailyPlans: studyStore.dailyPlans,
					studyNotes: studyStore.studyNotes,
				};
			}

			const jsonString = JSON.stringify(exportData, null, 2);
			const fileName = `lifesync_${module}_backup_${
				new Date().toISOString().split("T")[0]
			}.json`;
			const filePath = `${FileSystem.documentDirectory}${fileName}`;

			await FileSystem.writeAsStringAsync(filePath, jsonString);

			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(filePath, {
					mimeType: "application/json",
					dialogTitle: `Export ${module} Data`,
					UTI: "public.json",
				});
			} else {
				Alert.alert("Success", `Data exported to: ${fileName}`);
			}
		} catch (error) {
			console.error("Export error:", error);
			Alert.alert("Export Failed", `Failed to export ${module} data.`);
		} finally {
			setIsExporting(null);
		}
	};

	// Import module-specific data
	const handleImportModuleData = async (module: ModuleType) => {
		Alert.alert(
			`Import ${module} Data`,
			`This will replace your current ${module} data with the imported backup. Are you sure?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Import",
					onPress: async () => {
						setIsImporting(module);
						try {
							const result = await DocumentPicker.getDocumentAsync({
								type: "application/json",
								copyToCacheDirectory: true,
							});

							if (result.canceled || !result.assets?.[0]) {
								setIsImporting(null);
								return;
							}

							const fileUri = result.assets[0].uri;
							const jsonString = await FileSystem.readAsStringAsync(fileUri);
							const importData = JSON.parse(jsonString);

							if (
								importData.appName !== "LifeSync" ||
								importData.module !== module
							) {
								Alert.alert(
									"Invalid File",
									`This doesn't appear to be a valid ${module} backup file.`
								);
								setIsImporting(null);
								return;
							}

							if (module === "habits") {
								habitStore.importData(importData.data);
							} else if (module === "workout") {
								workoutStore.importData(importData.data);
							} else if (module === "finance") {
								financeStore.importData(importData.data);
							} else if (module === "study") {
								studyStore.importData(importData.data);
							}

							Alert.alert("Success", `${module} data imported successfully!`);
						} catch (error) {
							console.error("Import error:", error);
							Alert.alert("Import Failed", `Failed to import ${module} data.`);
						} finally {
							setIsImporting(null);
						}
					},
				},
			]
		);
	};

	// Clear module-specific data
	const handleClearModuleData = (module: ModuleType) => {
		if (!user?.id) {
			Alert.alert("Sign In Required", "Please sign in to clear your data.");
			return;
		}

		const moduleName =
			module === "habits"
				? "Habits"
				: module === "workout"
				? "Workout"
				: module === "finance"
				? "Finance"
				: "Study";

		Alert.alert(
			`Clear ${moduleName} Data`,
			`This will permanently delete ALL your ${moduleName} data. This action cannot be undone!`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							if (module === "habits") {
								await habitStore.clearAllData();
							} else if (module === "workout") {
								await workoutStore.clearAllData();
							} else if (module === "finance") {
								await financeStore.clearAllData();
							} else if (module === "study") {
								await studyStore.clearAllData();
							}
							Alert.alert(
								"Success",
								`All ${moduleName} data has been cleared.`
							);
						} catch (error: any) {
							Alert.alert("Error", `Failed to clear ${moduleName} data.`);
						}
					},
				},
			]
		);
	};

	// Export all data
	const handleExportAllData = async () => {
		setIsExporting("habits");
		try {
			const exportData = {
				version: "1.0.0",
				exportedAt: new Date().toISOString(),
				appName: "LifeSync",
				data: {
					habits: {
						habits: habitStore.habits,
						logs: habitStore.logs,
						profile: habitStore.profile,
						settings: habitStore.settings,
					},
					workouts: {
						fitnessProfile: workoutStore.fitnessProfile,
						bodyMeasurements: workoutStore.bodyMeasurements,
						bodyWeights: workoutStore.bodyWeights,
						customExercises: workoutStore.customExercises,
						workoutPlans: workoutStore.workoutPlans,
						workoutSessions: workoutStore.workoutSessions,
						personalRecords: workoutStore.personalRecords,
						activePlanId: workoutStore.activePlanId,
					},
					finance: {
						accounts: financeStore.accounts,
						transactions: financeStore.transactions,
						recurringTransactions: financeStore.recurringTransactions,
						budgets: financeStore.budgets,
						savingsGoals: financeStore.savingsGoals,
						billReminders: financeStore.billReminders,
						debts: financeStore.debts,
						splitGroups: financeStore.splitGroups,
						currency: financeStore.currency,
					},
					study: {
						studyGoals: studyStore.studyGoals,
						subjects: studyStore.subjects,
						studySessions: studyStore.studySessions,
						flashcardDecks: studyStore.flashcardDecks,
						flashcards: studyStore.flashcards,
						revisionSchedule: studyStore.revisionSchedule,
						mockTests: studyStore.mockTests,
						dailyPlans: studyStore.dailyPlans,
						studyNotes: studyStore.studyNotes,
					},
				},
			};

			const jsonString = JSON.stringify(exportData, null, 2);
			const fileName = `lifesync_backup_${
				new Date().toISOString().split("T")[0]
			}.json`;
			const filePath = `${FileSystem.documentDirectory}${fileName}`;

			await FileSystem.writeAsStringAsync(filePath, jsonString);

			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(filePath, {
					mimeType: "application/json",
					dialogTitle: "Export LifeSync Data",
					UTI: "public.json",
				});
			} else {
				Alert.alert("Success", `Data exported to: ${fileName}`);
			}
		} catch (error) {
			console.error("Export error:", error);
			Alert.alert("Export Failed", "An error occurred while exporting data.");
		} finally {
			setIsExporting(null);
		}
	};

	// Import all data
	const handleImportAllData = async () => {
		Alert.alert(
			"Import All Data",
			"This will replace your current data with the imported backup. Are you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Import",
					onPress: async () => {
						setIsImporting("habits");
						try {
							const result = await DocumentPicker.getDocumentAsync({
								type: "application/json",
								copyToCacheDirectory: true,
							});

							if (result.canceled || !result.assets?.[0]) {
								setIsImporting(null);
								return;
							}

							const fileUri = result.assets[0].uri;
							const jsonString = await FileSystem.readAsStringAsync(fileUri);

							const importData = JSON.parse(jsonString);

							// Validate the import data
							if (!importData.appName || importData.appName !== "LifeSync") {
								Alert.alert(
									"Invalid File",
									"This doesn't appear to be a valid LifeSync backup file."
								);
								setIsImporting(null);
								return;
							}

							// Import Habits data
							if (importData.data?.habits) {
								habitStore.importData(importData.data.habits);
							}

							// Import Workout data
							if (importData.data?.workouts) {
								workoutStore.importData(importData.data.workouts);
							}

							// Import Finance data
							if (importData.data?.finance) {
								financeStore.importData(importData.data.finance);
							}

							// Import Study data
							if (importData.data?.study) {
								studyStore.importData(importData.data.study);
							}

							Alert.alert("Success", "Data imported successfully!");
						} catch (error) {
							console.error("Import error:", error);
							Alert.alert(
								"Import Failed",
								"An error occurred while importing data. Please check the file format."
							);
						} finally {
							setIsImporting(null);
						}
					},
				},
			]
		);
	};

	// Clear all data
	const handleClearAllData = () => {
		if (!user?.id) {
			Alert.alert("Sign In Required", "Please sign in to clear your data.");
			return;
		}

		Alert.alert(
			"Clear All Data",
			"This will permanently delete ALL your habits, workouts, finance, and study data. This action cannot be undone!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete Everything",
					style: "destructive",
					onPress: async () => {
						try {
							// Clear all stores using their methods (all now filter by user_id)
							await Promise.all([
								habitStore.clearAllData(),
								workoutStore.clearAllData(),
								financeStore.clearAllData(),
								studyStore.clearAllData(),
							]);

							Alert.alert("Success", "All data has been cleared.");
						} catch (error: any) {
							Alert.alert(
								"Error",
								"Failed to clear some data. Please try again."
							);
						}
					},
				},
			]
		);
	};

	return (
		<SafeAreaView style={styles.container}>
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
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>APPEARANCE</Text>

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
				</View>

				{/* Modules Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>MODULES</Text>

					<View style={styles.settingCard}>
						<SettingRow
							icon="checkmark-circle"
							iconColor={theme.primary}
							iconBg={theme.primary + "20"}
							label="Daily Rituals"
							description="Track and manage your habits"
							theme={theme}
							rightElement={
								<Switch
									value={moduleStore.isModuleEnabled("habits")}
									onValueChange={(enabled) =>
										moduleStore.toggleModule("habits", enabled)
									}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>

						<View style={styles.divider} />

						<SettingRow
							icon="barbell"
							iconColor={theme.success}
							iconBg={theme.success + "20"}
							label="FitZone"
							description="Track your workouts and fitness"
							theme={theme}
							rightElement={
								<Switch
									value={moduleStore.isModuleEnabled("workout")}
									onValueChange={(enabled) =>
										moduleStore.toggleModule("workout", enabled)
									}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>

						<View style={styles.divider} />

						<SettingRow
							icon="wallet"
							iconColor={theme.warning}
							iconBg={theme.warning + "20"}
							label="Money Hub"
							description="Manage your finances and budgets"
							theme={theme}
							rightElement={
								<Switch
									value={moduleStore.isModuleEnabled("finance")}
									onValueChange={(enabled) =>
										moduleStore.toggleModule("finance", enabled)
									}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>

						<View style={styles.divider} />

						<SettingRow
							icon="book"
							iconColor="#06B6D4"
							iconBg="#06B6D420"
							label="Study Hub"
							description="Track your study sessions and goals"
							theme={theme}
							rightElement={
								<Switch
									value={moduleStore.isModuleEnabled("study")}
									onValueChange={(enabled) =>
										moduleStore.toggleModule("study", enabled)
									}
									trackColor={{ false: theme.border, true: theme.primary }}
									thumbColor="#FFFFFF"
								/>
							}
						/>
					</View>
				</View>

				{/* Notifications Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

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
				</View>

				{/* Cloud Sync Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>CLOUD SYNC</Text>

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

									<TouchableOpacity
										style={styles.compactButton}
										onPress={() => handleDeleteCloudData("all")}
									>
										<View
											style={[
												styles.compactIcon,
												{ backgroundColor: theme.error + "20" },
											]}
										>
											<Ionicons
												name="cloud-offline"
												size={18}
												color={theme.error}
											/>
										</View>
										<Text
											style={[styles.compactButtonText, { color: theme.error }]}
										>
											Delete Cloud
										</Text>
									</TouchableOpacity>
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
													<Text style={styles.moduleLabel}>Habits</Text>
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
													<Text style={styles.moduleLabel}>Finance</Text>
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

								{/* Study Hub Cloud */}
								{moduleStore.isModuleEnabled("study") && (
									<>
										<View style={styles.thinDivider} />
										<View style={styles.moduleRow}>
											<View style={styles.moduleInfo}>
												<Ionicons name="book" size={16} color="#06B6D4" />
												<View>
													<Text style={styles.moduleLabel}>Study Hub</Text>
													<Text style={styles.syncTimeText}>
														{formatSyncTime(syncStatus.study_synced_at)}
													</Text>
												</View>
											</View>
											<View style={styles.moduleActions}>
												<TouchableOpacity
													style={styles.iconButton}
													onPress={() => handleSyncToCloud("study")}
													disabled={isSyncing !== null}
												>
													{isSyncing === "study" ? (
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
													onPress={() => handleRestoreFromCloud("study")}
													disabled={isRestoring !== null}
												>
													{isRestoring === "study" ? (
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
									Your data is stored locally. Sign in to backup and sync across
									devices.
								</Text>
								<View style={styles.signInButton}>
									<Text style={styles.signInButtonText}>Sign In</Text>
								</View>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Local Data Management Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>LOCAL DATA</Text>

					{/* All Data - Compact Actions */}
					<View style={styles.settingCard}>
						<View style={styles.compactHeader}>
							<Text style={styles.compactHeaderText}>
								Export / Import (Local Files)
							</Text>
						</View>
						<View style={styles.compactActions}>
							<TouchableOpacity
								style={[
									styles.compactButton,
									isExporting === "habits" && { opacity: 0.5 },
								]}
								onPress={handleExportAllData}
								disabled={isExporting !== null}
							>
								<View
									style={[
										styles.compactIcon,
										{ backgroundColor: theme.primary + "20" },
									]}
								>
									<Ionicons
										name="download-outline"
										size={18}
										color={theme.primary}
									/>
								</View>
								<Text style={styles.compactButtonText}>Export All</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.compactButton,
									isImporting === "habits" && { opacity: 0.5 },
								]}
								onPress={handleImportAllData}
								disabled={isImporting !== null}
							>
								<View
									style={[
										styles.compactIcon,
										{ backgroundColor: theme.accent + "20" },
									]}
								>
									<Ionicons
										name="folder-open-outline"
										size={18}
										color={theme.accent}
									/>
								</View>
								<Text style={styles.compactButtonText}>Import</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.compactButton}
								onPress={handleClearAllData}
							>
								<View
									style={[
										styles.compactIcon,
										{ backgroundColor: theme.error + "20" },
									]}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={theme.error}
									/>
								</View>
								<Text
									style={[styles.compactButtonText, { color: theme.error }]}
								>
									Clear All
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Module-Specific Data */}
					{(moduleStore.isModuleEnabled("habits") ||
						moduleStore.isModuleEnabled("workout") ||
						moduleStore.isModuleEnabled("finance") ||
						moduleStore.isModuleEnabled("study")) && (
						<View style={[styles.settingCard, { marginTop: 12 }]}>
							<View style={styles.compactHeader}>
								<Text style={styles.compactHeaderText}>By Module (Local)</Text>
							</View>

							{/* Habits */}
							{moduleStore.isModuleEnabled("habits") && (
								<>
									<View style={styles.moduleRow}>
										<View style={styles.moduleInfo}>
											<Ionicons
												name="checkmark-circle"
												size={16}
												color={theme.primary}
											/>
											<Text style={styles.moduleLabel}>Habits</Text>
										</View>
										<View style={styles.moduleActions}>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleExportModuleData("habits")}
												disabled={isExporting !== null}
											>
												<Ionicons
													name="download-outline"
													size={18}
													color={
														isExporting === "habits"
															? theme.textMuted
															: theme.primary
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleImportModuleData("habits")}
												disabled={isImporting !== null}
											>
												<Ionicons
													name="cloud-upload-outline"
													size={18}
													color={
														isImporting === "habits"
															? theme.textMuted
															: theme.accent
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleClearModuleData("habits")}
											>
												<Ionicons
													name="trash-outline"
													size={18}
													color={theme.error}
												/>
											</TouchableOpacity>
										</View>
									</View>
									{(moduleStore.isModuleEnabled("workout") ||
										moduleStore.isModuleEnabled("finance")) && (
										<View style={styles.thinDivider} />
									)}
								</>
							)}

							{/* Workout */}
							{moduleStore.isModuleEnabled("workout") && (
								<>
									<View style={styles.moduleRow}>
										<View style={styles.moduleInfo}>
											<Ionicons
												name="barbell"
												size={16}
												color={theme.success}
											/>
											<Text style={styles.moduleLabel}>FitZone</Text>
										</View>
										<View style={styles.moduleActions}>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleExportModuleData("workout")}
												disabled={isExporting !== null}
											>
												<Ionicons
													name="download-outline"
													size={18}
													color={
														isExporting === "workout"
															? theme.textMuted
															: theme.primary
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleImportModuleData("workout")}
												disabled={isImporting !== null}
											>
												<Ionicons
													name="cloud-upload-outline"
													size={18}
													color={
														isImporting === "workout"
															? theme.textMuted
															: theme.accent
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleClearModuleData("workout")}
											>
												<Ionicons
													name="trash-outline"
													size={18}
													color={theme.error}
												/>
											</TouchableOpacity>
										</View>
									</View>
									{moduleStore.isModuleEnabled("finance") && (
										<View style={styles.thinDivider} />
									)}
								</>
							)}

							{/* Finance */}
							{moduleStore.isModuleEnabled("finance") && (
								<View style={styles.moduleRow}>
									<View style={styles.moduleInfo}>
										<Ionicons name="wallet" size={16} color={theme.warning} />
										<Text style={styles.moduleLabel}>Finance</Text>
									</View>
									<View style={styles.moduleActions}>
										<TouchableOpacity
											style={styles.iconButton}
											onPress={() => handleExportModuleData("finance")}
											disabled={isExporting !== null}
										>
											<Ionicons
												name="download-outline"
												size={18}
												color={
													isExporting === "finance"
														? theme.textMuted
														: theme.primary
												}
											/>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.iconButton}
											onPress={() => handleImportModuleData("finance")}
											disabled={isImporting !== null}
										>
											<Ionicons
												name="cloud-upload-outline"
												size={18}
												color={
													isImporting === "finance"
														? theme.textMuted
														: theme.accent
												}
											/>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.iconButton}
											onPress={() => handleClearModuleData("finance")}
										>
											<Ionicons
												name="trash-outline"
												size={18}
												color={theme.error}
											/>
										</TouchableOpacity>
									</View>
								</View>
							)}

							{/* Study Hub */}
							{moduleStore.isModuleEnabled("study") && (
								<>
									<View style={styles.thinDivider} />
									<View style={styles.moduleRow}>
										<View style={styles.moduleInfo}>
											<Ionicons name="book" size={16} color="#06B6D4" />
											<Text style={styles.moduleLabel}>Study Hub</Text>
										</View>
										<View style={styles.moduleActions}>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleExportModuleData("study")}
												disabled={isExporting !== null}
											>
												<Ionicons
													name="download-outline"
													size={18}
													color={
														isExporting === "study"
															? theme.textMuted
															: theme.primary
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleImportModuleData("study")}
												disabled={isImporting !== null}
											>
												<Ionicons
													name="cloud-upload-outline"
													size={18}
													color={
														isImporting === "study"
															? theme.textMuted
															: theme.accent
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.iconButton}
												onPress={() => handleClearModuleData("study")}
											>
												<Ionicons
													name="trash-outline"
													size={18}
													color={theme.error}
												/>
											</TouchableOpacity>
										</View>
									</View>
								</>
							)}
						</View>
					)}
				</View>

				{/* Developer Section - Admin Only */}
				{isAdmin() && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>DEVELOPER</Text>

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
												"Please enable notifications in your device settings."
											);
											return;
										}
										await NotificationService.scheduleInstantNotification(
											"🔔 Test Notification",
											"Notifications are working! Your habit reminders will appear like this.",
											{ type: "test" }
										);
										Alert.alert(
											"Success!",
											"A test notification has been sent. Check your notification tray!"
										);
									} catch (error) {
										Alert.alert(
											"Error",
											"Failed to send notification. Make sure you're on a real device, not Expo Go."
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
										const granted =
											await NotificationService.requestPermissions();
										if (!granted) {
											Alert.alert(
												"Permission Denied",
												"Please enable notifications in your device settings."
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
											}
										);
										Alert.alert(
											"Success!",
											"A test invite notification has been sent. Tap it to test navigation to invitations!"
										);
									} catch (error) {
										Alert.alert(
											"Error",
											"Failed to send notification. Make sure you're on a real device, not Expo Go."
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
					</View>
				)}

				{/* About Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>ABOUT</Text>

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
								<Text style={styles.settingDescription}>2.1.0 (Build 2)</Text>
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
				</View>

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
								{scheduledNotifications.map((reminder, index) => (
									<View key={index} style={styles.reminderCard}>
										<View style={styles.reminderIndex}>
											<Text style={styles.reminderIndexText}>{index + 1}</Text>
										</View>
										<View style={{ flex: 1 }}>
											<Text style={styles.reminderTitle}>
												{reminder.content.title}
											</Text>
											<Text style={styles.reminderBody}>
												{reminder.content.body}
											</Text>

											<View style={styles.reminderDetails}>
												<View style={styles.detailRow}>
													<Text style={styles.detailLabel}>ID:</Text>
													<Text style={styles.detailValue}>
														{reminder.identifier}
													</Text>
												</View>

												{reminder.trigger && (
													<View style={styles.detailRow}>
														<Text style={styles.detailLabel}>Trigger:</Text>
														<Text style={styles.detailValue}>
															{reminder.trigger.type === "daily" ||
															reminder.trigger.type === 0
																? `Daily at ${String(
																		reminder.trigger.hour
																  ).padStart(2, "0")}:${String(
																		reminder.trigger.minute
																  ).padStart(2, "0")}`
																: "One-time trigger"}
														</Text>
													</View>
												)}
											</View>
										</View>
									</View>
								))}
							</View>
						)}
						<View style={{ height: 40 }} />
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
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

// Dynamic styles
const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},

		// Header
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		backButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		placeholder: {
			width: 44,
		},

		// Sections
		section: {
			marginTop: 24,
			paddingHorizontal: 20,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.textMuted,
			marginBottom: 12,
			letterSpacing: 1.2,
		},

		// Setting Cards
		settingCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			overflow: "hidden",
		},
		settingRow: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		settingIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		settingContent: {
			flex: 1,
			marginLeft: 14,
		},
		settingLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		settingDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		divider: {
			height: 1,
			backgroundColor: theme.border,
			marginLeft: 74,
		},
		thinDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginHorizontal: 12,
		},

		// Compact Data Management
		compactHeader: {
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 8,
		},
		compactHeaderText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		compactActions: {
			flexDirection: "row",
			padding: 12,
			gap: 8,
		},
		compactButton: {
			flex: 1,
			flexDirection: "column",
			alignItems: "center",
			padding: 12,
			borderRadius: 12,
			backgroundColor: theme.background,
			gap: 6,
		},
		compactIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		compactButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
		},
		moduleRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		moduleInfo: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		moduleLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		moduleActions: {
			flexDirection: "row",
			gap: 16,
		},
		iconButton: {
			padding: 4,
		},

		// Cloud Sync Styles
		cloudHeaderRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		cloudBadge: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#10B981" + "20",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12,
			gap: 4,
		},
		cloudBadgeText: {
			fontSize: 11,
			fontWeight: "600",
			color: "#10B981",
		},
		syncTimeText: {
			fontSize: 10,
			color: theme.textMuted,
			marginTop: 1,
		},
		signInPrompt: {
			alignItems: "center",
			padding: 24,
		},
		signInPromptTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginTop: 12,
		},
		signInPromptText: {
			fontSize: 13,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 8,
			lineHeight: 18,
		},
		signInButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 12,
			marginTop: 16,
		},
		signInButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFFFFF",
		},

		// Badge
		badge: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
		},
		badgeText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},

		// Footer
		footer: {
			alignItems: "center",
			marginVertical: 40,
			paddingHorizontal: 24,
		},
		logoContainer: {
			width: 72,
			height: 72,
			borderRadius: 20,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
			overflow: "hidden",
		},
		logoImage: {
			width: 64,
			height: 64,
			borderRadius: 16,
		},
		footerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		footerSubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 6,
			textAlign: "center",
		},
		footerCopyright: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 16,
		},

		// Modal Styles
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		modalContent: {
			flex: 1,
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		emptyState: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 60,
		},
		emptyStateText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			textAlign: "center",
		},
		emptyStateSubtext: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 8,
			textAlign: "center",
			maxWidth: "80%",
		},
		remindersList: {
			gap: 12,
		},
		reminderCard: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			gap: 12,
			marginBottom: 12,
			borderLeftWidth: 4,
			borderLeftColor: "#8B5CF6",
		},
		reminderIndex: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: "#8B5CF6" + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		reminderIndexText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#8B5CF6",
		},
		reminderTitle: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 4,
		},
		reminderBody: {
			fontSize: 13,
			color: theme.textSecondary,
			marginBottom: 8,
		},
		reminderDetails: {
			backgroundColor: theme.background,
			borderRadius: 8,
			padding: 8,
			gap: 6,
		},
		detailRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 8,
		},
		detailLabel: {
			fontSize: 11,
			fontWeight: "600",
			color: theme.textMuted,
			minWidth: 40,
		},
		detailValue: {
			fontSize: 11,
			color: theme.text,
			flex: 1,
		},
	});
