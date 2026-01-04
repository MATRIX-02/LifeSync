import { useFinanceStore } from "@/src/context/financeStore";
import { useHabitStore } from "@/src/context/habitStore";
import { ModuleType, useModuleStore } from "@/src/context/moduleContext";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { NotificationService } from "@/src/services/notificationService";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
	Alert,
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
	const moduleStore = useModuleStore();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [vibrationEnabled, setVibrationEnabled] = useState(true);
	const [isExporting, setIsExporting] = useState<ModuleType | null>(null);
	const [isImporting, setIsImporting] = useState<ModuleType | null>(null);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const [scheduledNotifications, setScheduledNotifications] = useState<any[]>(
		[]
	);

	const styles = createStyles(theme);

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
		const moduleName =
			module === "habits"
				? "Habits"
				: module === "workout"
				? "Workout"
				: "Finance";

		Alert.alert(
			`Clear ${moduleName} Data`,
			`This will permanently delete ALL your ${moduleName} data. This action cannot be undone!`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						if (module === "habits") {
							habitStore.clearAllData();
						} else if (module === "workout") {
							workoutStore.clearAllData();
						} else if (module === "finance") {
							financeStore.clearAllData();
						}
						Alert.alert("Success", `All ${moduleName} data has been cleared.`);
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
		Alert.alert(
			"Clear All Data",
			"This will permanently delete ALL your habits, workouts, and finance data. This action cannot be undone!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete Everything",
					style: "destructive",
					onPress: () => {
						// Clear all stores using their methods
						habitStore.clearAllData();
						workoutStore.clearAllData();
						financeStore.clearAllData();

						Alert.alert("Success", "All data has been cleared.");
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
							router.replace(`/${from}` as any);
						} else if (router.canGoBack()) {
							router.back();
						} else {
							router.replace("/");
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
							icon="sparkles"
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
							icon="flame"
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
							icon="trending-up"
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
									Send a test to verify notifications work
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

				{/* Data Management Section - All Data */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>DATA MANAGEMENT - ALL DATA</Text>

					<View style={styles.settingCard}>
						<TouchableOpacity
							style={[
								styles.settingRow,
								isExporting === "habits" && { opacity: 0.5 },
							]}
							onPress={handleExportAllData}
							disabled={isExporting !== null}
						>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.primary + "20" },
								]}
							>
								<Ionicons
									name="download-outline"
									size={20}
									color={theme.primary}
								/>
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>
									{isExporting ? "Exporting..." : "Export All Data"}
								</Text>
								<Text style={styles.settingDescription}>
									Backup all habits, workouts & finance data
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
							style={[
								styles.settingRow,
								isImporting === "habits" && { opacity: 0.5 },
							]}
							onPress={handleImportAllData}
							disabled={isImporting !== null}
						>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.accent + "20" },
								]}
							>
								<Ionicons
									name="cloud-upload-outline"
									size={20}
									color={theme.accent}
								/>
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>
									{isImporting ? "Importing..." : "Import All Data"}
								</Text>
								<Text style={styles.settingDescription}>
									Restore from a complete backup file
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
							onPress={handleClearAllData}
						>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.error + "20" },
								]}
							>
								<Ionicons name="trash-outline" size={20} color={theme.error} />
							</View>
							<View style={styles.settingContent}>
								<Text style={[styles.settingLabel, { color: theme.error }]}>
									Clear All Data
								</Text>
								<Text style={styles.settingDescription}>
									Delete all data from all modules
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

				{/* Data Management - Habits */}
				{moduleStore.isModuleEnabled("habits") && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>DATA MANAGEMENT - HABITS</Text>

						<View style={styles.settingCard}>
							<TouchableOpacity
								style={[
									styles.settingRow,
									isExporting === "habits" && { opacity: 0.5 },
								]}
								onPress={() => handleExportModuleData("habits")}
								disabled={isExporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.primary + "20" },
									]}
								>
									<Ionicons
										name="download-outline"
										size={20}
										color={theme.primary}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isExporting === "habits"
											? "Exporting..."
											: "Export Habits"}
									</Text>
									<Text style={styles.settingDescription}>
										Backup all your habits and logs
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
								style={[
									styles.settingRow,
									isImporting === "habits" && { opacity: 0.5 },
								]}
								onPress={() => handleImportModuleData("habits")}
								disabled={isImporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.accent + "20" },
									]}
								>
									<Ionicons
										name="cloud-upload-outline"
										size={20}
										color={theme.accent}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isImporting === "habits"
											? "Importing..."
											: "Import Habits"}
									</Text>
									<Text style={styles.settingDescription}>
										Restore habits from backup
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
								onPress={() => handleClearModuleData("habits")}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.error + "20" },
									]}
								>
									<Ionicons
										name="trash-outline"
										size={20}
										color={theme.error}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={[styles.settingLabel, { color: theme.error }]}>
										Clear Habits Data
									</Text>
									<Text style={styles.settingDescription}>
										Delete all habits and logs
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

				{/* Data Management - Workout */}
				{moduleStore.isModuleEnabled("workout") && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>DATA MANAGEMENT - FITZONE</Text>

						<View style={styles.settingCard}>
							<TouchableOpacity
								style={[
									styles.settingRow,
									isExporting === "workout" && { opacity: 0.5 },
								]}
								onPress={() => handleExportModuleData("workout")}
								disabled={isExporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.primary + "20" },
									]}
								>
									<Ionicons
										name="download-outline"
										size={20}
										color={theme.primary}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isExporting === "workout"
											? "Exporting..."
											: "Export Workouts"}
									</Text>
									<Text style={styles.settingDescription}>
										Backup all your fitness data
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
								style={[
									styles.settingRow,
									isImporting === "workout" && { opacity: 0.5 },
								]}
								onPress={() => handleImportModuleData("workout")}
								disabled={isImporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.accent + "20" },
									]}
								>
									<Ionicons
										name="cloud-upload-outline"
										size={20}
										color={theme.accent}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isImporting === "workout"
											? "Importing..."
											: "Import Workouts"}
									</Text>
									<Text style={styles.settingDescription}>
										Restore workouts from backup
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
								onPress={() => handleClearModuleData("workout")}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.error + "20" },
									]}
								>
									<Ionicons
										name="trash-outline"
										size={20}
										color={theme.error}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={[styles.settingLabel, { color: theme.error }]}>
										Clear Workout Data
									</Text>
									<Text style={styles.settingDescription}>
										Delete all fitness data
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

				{/* Data Management - Finance */}
				{moduleStore.isModuleEnabled("finance") && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>DATA MANAGEMENT - FINANCE</Text>

						<View style={styles.settingCard}>
							<TouchableOpacity
								style={[
									styles.settingRow,
									isExporting === "finance" && { opacity: 0.5 },
								]}
								onPress={() => handleExportModuleData("finance")}
								disabled={isExporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.primary + "20" },
									]}
								>
									<Ionicons
										name="download-outline"
										size={20}
										color={theme.primary}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isExporting === "finance"
											? "Exporting..."
											: "Export Finance"}
									</Text>
									<Text style={styles.settingDescription}>
										Backup all financial data
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
								style={[
									styles.settingRow,
									isImporting === "finance" && { opacity: 0.5 },
								]}
								onPress={() => handleImportModuleData("finance")}
								disabled={isImporting !== null}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.accent + "20" },
									]}
								>
									<Ionicons
										name="cloud-upload-outline"
										size={20}
										color={theme.accent}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={styles.settingLabel}>
										{isImporting === "finance"
											? "Importing..."
											: "Import Finance"}
									</Text>
									<Text style={styles.settingDescription}>
										Restore finance data from backup
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
								onPress={() => handleClearModuleData("finance")}
							>
								<View
									style={[
										styles.settingIcon,
										{ backgroundColor: theme.error + "20" },
									]}
								>
									<Ionicons
										name="trash-outline"
										size={20}
										color={theme.error}
									/>
								</View>
								<View style={styles.settingContent}>
									<Text style={[styles.settingLabel, { color: theme.error }]}>
										Clear Finance Data
									</Text>
									<Text style={styles.settingDescription}>
										Delete all financial data
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

				{/* Developer Section */}
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
					</View>
				</View>

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
								<Text style={styles.settingDescription}>1.0.0 (Build 1)</Text>
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
								<Text style={styles.settingLabel}>Made with ❤️</Text>
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
