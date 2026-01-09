import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useFinanceStore } from "@/src/context/financeStore";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { useStudyStore } from "@/src/context/studyStoreDB";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import {
	getAutoSyncInterval,
	setAutoSyncInterval,
	startAutoSync,
	stopAutoSync,
} from "@/src/services/syncService";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { COLORS } from "../../../constants";
import {
	useModuleStore,
	type ModuleType,
} from "../../../context/moduleContext";

const SettingsScreen = () => {
	const { enabledModules, isModuleEnabled, toggleModule } = useModuleStore();
	const [loadingModule, setLoadingModule] = useState<ModuleType | null>(null);
	const [autoSyncInterval, setAutoSyncIntervalState] = useState<number | null>(
		null
	);
	const [autoSyncRunning, setAutoSyncRunning] = useState(false);

	useEffect(() => {
		let mounted = true;
		getAutoSyncInterval()
			.then((m) => {
				if (!mounted) return;
				setAutoSyncIntervalState(m);
			})
			.catch((e) => console.error(e));
		return () => {
			mounted = false;
		};
	}, []);

	const buildSyncPayload = async () => {
		// Gather data from stores via getState
		const auth = useAuthStore.getState();
		const habitState = useHabitStore.getState();
		const workoutState = useWorkoutStore.getState();
		const financeState = useFinanceStore.getState();
		const studyState = useStudyStore.getState();

		return {
			profile: auth.profile || null,
			habits: {
				habits: habitState.habits || [],
				logs: habitState.logs || [],
				settings: habitState.settings,
			},
			workouts: {
				fitnessProfile: workoutState.fitnessProfile,
				workoutPlans: workoutState.workoutPlans,
				workoutSessions: workoutState.workoutSessions,
				personalRecords: workoutState.personalRecords,
				bodyMeasurements: workoutState.bodyMeasurements,
				bodyWeights: workoutState.bodyWeights,
				customExercises: workoutState.customExercises,
			},
			finance: {
				accounts: financeState.accounts || [],
				transactions: financeState.transactions || [],
				recurringTransactions: financeState.recurringTransactions || [],
				budgets: financeState.budgets || [],
				savingsGoals: financeState.savingsGoals || [],
				billReminders: financeState.billReminders || [],
				debts: financeState.debts || [],
				splitGroups: financeState.splitGroups || [],
				currency: financeState.currency || "INR",
			},
			study: studyState.ssbData || {},
		};
	};

	const handleChooseInterval = () => {
		const options = [1, 5, 15, 30, 60];
		Alert.alert(
			"Auto-sync Interval",
			"Choose how often the app should auto-sync (minutes)",
			[
				...options.map((m) => ({
					text: `${m} minutes`,
					onPress: async () => {
						try {
							await setAutoSyncInterval(m);
							setAutoSyncIntervalState(m);
							Alert.alert("Saved", `Auto-sync interval set to ${m} minutes`);
						} catch (err) {
							console.error(err);
							Alert.alert("Error", "Failed to set interval");
						}
					},
				})),
				{ text: "Cancel", style: "cancel" },
			]
		);
	};

	const handleStartStopAutoSync = async () => {
		if (autoSyncRunning) {
			stopAutoSync();
			setAutoSyncRunning(false);
			Alert.alert("Auto-sync", "Auto-sync stopped");
			return;
		}
		const userId = useAuthStore.getState().user?.id;
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

	const handleModuleToggle = async (
		module: ModuleType,
		currentState: boolean
	) => {
		setLoadingModule(module);
		try {
			await toggleModule(module, !currentState);
			const action = !currentState ? "enabled" : "disabled";
			Alert.alert(
				"Success",
				`${
					module.charAt(0).toUpperCase() + module.slice(1)
				} module has been ${action}`
			);
		} catch (error) {
			Alert.alert("Error", `Failed to toggle ${module} module`);
			console.error(error);
		} finally {
			setLoadingModule(null);
		}
	};

	return (
		<ScrollView style={styles.container}>
			{/* Modules Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Modules</Text>
				<Text style={styles.sectionDescription}>
					Manage which modules are available in your app. Disabling a module
					will disable all associated notifications.
				</Text>
				<ModuleToggle
					icon="checkmark-circle"
					label="Habits"
					description="Track daily habits and build consistency"
					module="habits"
					enabled={isModuleEnabled("habits")}
					onToggle={() =>
						handleModuleToggle("habits", isModuleEnabled("habits"))
					}
					loading={loadingModule === "habits"}
				/>
				<ModuleToggle
					icon="barbell"
					label="Workout"
					description="Track your fitness and exercise routines"
					module="workout"
					enabled={isModuleEnabled("workout")}
					onToggle={() =>
						handleModuleToggle("workout", isModuleEnabled("workout"))
					}
					loading={loadingModule === "workout"}
				/>
				<ModuleToggle
					icon="wallet"
					label="Finance"
					description="Manage your budget and financial goals"
					module="finance"
					enabled={isModuleEnabled("finance")}
					onToggle={() =>
						handleModuleToggle("finance", isModuleEnabled("finance"))
					}
					loading={loadingModule === "finance"}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Notifications</Text>
				{/* Auto-sync controls */}
				<View style={{ height: 12 }} />
				<TouchableOpacity
					style={styles.settingItemContainer}
					onPress={handleChooseInterval}
				>
					<View style={styles.settingItemContent}>
						<Ionicons name="cloud-upload" size={24} color={COLORS.primary} />
						<View style={styles.settingItemText}>
							<Text style={styles.settingLabel}>Auto-sync Interval</Text>
							<Text style={styles.settingDescription}>
								{autoSyncInterval
									? `${autoSyncInterval} minutes`
									: "Not set (default 5 minutes)"}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						onPress={handleStartStopAutoSync}
						style={{ paddingHorizontal: 8 }}
					>
						<Text style={{ color: COLORS.primary }}>
							{autoSyncRunning ? "Stop" : "Start"}
						</Text>
					</TouchableOpacity>
				</TouchableOpacity>
				<SettingItem
					icon="notifications"
					label="Enable All Notifications"
					description="Get reminders for your active modules"
					value={true}
				/>
				<SettingItem
					icon="volume-high"
					label="Enable Sound"
					description="Play sound for notifications"
					value={true}
				/>
				<SettingItem
					icon="vibrate"
					label="Enable Vibration"
					description="Vibrate on notifications"
					value={true}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>About</Text>
				<TouchableOpacity style={styles.settingItemContainer}>
					<View style={styles.settingItemContent}>
						<Ionicons
							name="information-circle"
							size={24}
							color={COLORS.primary}
						/>
						<View style={styles.settingItemText}>
							<Text style={styles.settingLabel}>App Version</Text>
							<Text style={styles.settingDescription}>1.0.0</Text>
						</View>
					</View>
				</TouchableOpacity>
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Habit Tracker App</Text>
				<Text style={styles.footerSubtext}>
					Build better habits, one day at a time
				</Text>
			</View>
		</ScrollView>
	);
};

interface ModuleToggleProps {
	icon: string;
	label: string;
	description: string;
	module: ModuleType;
	enabled: boolean;
	onToggle: () => void;
	loading: boolean;
}

const ModuleToggle: React.FC<ModuleToggleProps> = ({
	icon,
	label,
	description,
	enabled,
	onToggle,
	loading,
}) => (
	<TouchableOpacity
		style={styles.moduleContainer}
		onPress={onToggle}
		disabled={loading}
		activeOpacity={0.7}
	>
		<View style={styles.moduleContent}>
			<View
				style={[
					styles.moduleIconContainer,
					{ backgroundColor: enabled ? COLORS.primary + "20" : COLORS.border },
				]}
			>
				<Ionicons
					name={icon as any}
					size={24}
					color={enabled ? COLORS.primary : COLORS.textSecondary}
				/>
			</View>
			<View style={styles.moduleText}>
				<Text style={styles.moduleLabel}>{label}</Text>
				<Text
					style={[
						styles.moduleDescription,
						{ color: enabled ? COLORS.textSecondary : COLORS.textSecondary },
					]}
				>
					{description}
				</Text>
			</View>
		</View>
		<View style={[styles.toggle, enabled && styles.toggleOn]}>
			<View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
		</View>
	</TouchableOpacity>
);

interface SettingItemProps {
	icon: string;
	label: string;
	description: string;
	value?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
	icon,
	label,
	description,
	value,
}) => (
	<TouchableOpacity style={styles.settingItemContainer} activeOpacity={0.7}>
		<View style={styles.settingItemContent}>
			<Ionicons name={icon as any} size={24} color={COLORS.primary} />
			<View style={styles.settingItemText}>
				<Text style={styles.settingLabel}>{label}</Text>
				<Text style={styles.settingDescription}>{description}</Text>
			</View>
		</View>
		<View style={[styles.toggle, value && styles.toggleOn]}>
			<View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
		</View>
	</TouchableOpacity>
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	section: {
		marginTop: 20,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.text,
		marginBottom: 8,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	sectionDescription: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginBottom: 12,
		lineHeight: 16,
	},
	moduleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.surface,
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 16,
		marginBottom: 8,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 1,
	},
	moduleContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	moduleIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	moduleText: {
		marginLeft: 12,
		flex: 1,
	},
	moduleLabel: {
		fontSize: 15,
		fontWeight: "600",
		color: COLORS.text,
	},
	moduleDescription: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginTop: 2,
		lineHeight: 16,
	},
	settingItemContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.surface,
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 8,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 1,
	},
	settingItemContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	settingItemText: {
		marginLeft: 12,
		flex: 1,
	},
	settingLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
	},
	settingDescription: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	toggle: {
		width: 48,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.border,
		padding: 2,
		justifyContent: "center",
	},
	toggleOn: {
		backgroundColor: COLORS.primary,
	},
	toggleThumb: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: COLORS.surface,
		alignSelf: "flex-start",
	},
	toggleThumbOn: {
		alignSelf: "flex-end",
	},
	footer: {
		alignItems: "center",
		marginVertical: 40,
	},
	footerText: {
		fontSize: 16,
		fontWeight: "600",
		color: COLORS.text,
	},
	footerSubtext: {
		fontSize: 13,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
});

export default SettingsScreen;
