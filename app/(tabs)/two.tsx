import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	StatusBar,
	Switch,
	Linking,
	Share,
	Platform,
	Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { NotificationService } from "@/src/services/notificationService";
import { useTheme, useColors, Theme } from "@/src/context/themeContext";
import { useHabitStore } from "@/src/context/habitStore";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { useFinanceStore } from "@/src/context/financeStore";

export default function SettingsScreen() {
	const router = useRouter();
	const { from } = useLocalSearchParams<{ from?: string }>();
	const { isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
	const theme = useColors();
	const habitStore = useHabitStore();
	const workoutStore = useWorkoutStore();
	const financeStore = useFinanceStore();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [vibrationEnabled, setVibrationEnabled] = useState(true);
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	const styles = createStyles(theme);

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

	// Export all data
	const handleExportData = async () => {
		setIsExporting(true);
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
			setIsExporting(false);
		}
	};

	// Import data
	const handleImportData = async () => {
		Alert.alert(
			"Import Data",
			"This will replace your current data with the imported backup. Are you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Import",
					onPress: async () => {
						setIsImporting(true);
						try {
							const result = await DocumentPicker.getDocumentAsync({
								type: "application/json",
								copyToCacheDirectory: true,
							});

							if (result.canceled || !result.assets?.[0]) {
								setIsImporting(false);
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
								setIsImporting(false);
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
							setIsImporting(false);
						}
					},
				},
			]
		);
	};

	// Clear all data
	const handleClearData = () => {
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

				{/* Data Management Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

					<View style={styles.settingCard}>
						<TouchableOpacity
							style={[styles.settingRow, isExporting && { opacity: 0.5 }]}
							onPress={handleExportData}
							disabled={isExporting}
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
									{isExporting ? "Exporting..." : "Export Data"}
								</Text>
								<Text style={styles.settingDescription}>
									Backup all your habits, workouts & finance data
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
							style={[styles.settingRow, isImporting && { opacity: 0.5 }]}
							onPress={handleImportData}
							disabled={isImporting}
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
									{isImporting ? "Importing..." : "Import Data"}
								</Text>
								<Text style={styles.settingDescription}>
									Restore from a LifeSync backup file
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
							/>
						</TouchableOpacity>

						<View style={styles.divider} />

						<View style={styles.settingRow}>
							<View
								style={[
									styles.settingIcon,
									{ backgroundColor: theme.success + "20" },
								]}
							>
								<Ionicons name="sync-outline" size={20} color={theme.success} />
							</View>
							<View style={styles.settingContent}>
								<Text style={styles.settingLabel}>Cloud Sync</Text>
								<Text style={styles.settingDescription}>
									Sync across devices
								</Text>
							</View>
							<View style={styles.badge}>
								<Text style={styles.badgeText}>Soon</Text>
							</View>
						</View>

						<View style={styles.divider} />

						<TouchableOpacity
							style={styles.settingRow}
							onPress={handleClearData}
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
									Delete all habits, workouts & finance data
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
								<Text style={styles.settingLabel}>Developer</Text>
								<Text style={styles.settingDescription}>
									Made with ❤️ for personal productivity
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
	});
