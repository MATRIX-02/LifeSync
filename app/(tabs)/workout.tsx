// Workout Tracker Main Screen - Tab-based navigation

import { useSubscriptionCheck } from "@/src/components/PremiumFeatureGate";
import { SharedDrawer } from "@/src/components/SharedDrawer";
import {
	ActiveWorkoutScreen,
	NutriPlan,
	WorkoutDashboard,
	WorkoutHistory,
	WorkoutPlans,
	WorkoutStatistics,
} from "@/src/components/workout";
import { useAuthStore } from "@/src/context/authStore";
import { useModuleStore } from "@/src/context/moduleContext";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import { useTabPersistence } from "@/src/hooks/useNavigationPersistence";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Animated,
	Dimensions,
	Image,
	Modal,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type TabType = "dashboard" | "nutrition" | "statistics" | "plans" | "history";

const tabs: { key: TabType; label: string; icon: string }[] = [
	{ key: "dashboard", label: "Dashboard", icon: "home" },
	{ key: "nutrition", label: "Nutrition", icon: "nutrition" },
	{ key: "statistics", label: "Stats", icon: "stats-chart" },
	{ key: "plans", label: "Plans", icon: "clipboard" },
	{ key: "history", label: "History", icon: "time" },
];

export default function WorkoutTrackerScreen() {
	const router = useRouter();
	const { isDark, toggleTheme } = useTheme();
	const theme = useColors();
	const { fitnessProfile, currentSession, workoutPlans, workoutSessions } =
		useWorkoutStore();
	const { profile: authProfile, user } = useAuthStore();
	const { isModuleEnabled, getFirstEnabledModule, _hasHydrated } =
		useModuleStore();

	// Subscription checks for workout limits
	const subscriptionCheck = useSubscriptionCheck();

	// Check if module is disabled
	const isWorkoutEnabled = isModuleEnabled("workout");
	const firstEnabledModule = getFirstEnabledModule();

	// Persist active tab locally
	const [activeTab, setActiveTab, tabLoaded] = useTabPersistence<TabType>(
		"workout",
		"dashboard"
	);
	const [tabIndicatorAnim] = useState(new Animated.Value(0));
	const [showActiveWorkout, setShowActiveWorkout] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));

	const userName =
		authProfile?.full_name || user?.email?.split("@")[0] || "User";
	const styles = createStyles(theme);

	// Get current month workout count for limit checking
	const getCurrentMonthWorkoutCount = () => {
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();
		return workoutSessions.filter((s) => {
			const sessionDate = new Date(s.date);
			return (
				sessionDate.getMonth() === currentMonth &&
				sessionDate.getFullYear() === currentYear
			);
		}).length;
	};

	// Redirect if module is disabled - MUST be a hook, cannot be conditional
	useEffect(() => {
		// Only redirect after store has hydrated to avoid false redirects
		if (_hasHydrated && !isWorkoutEnabled) {
			if (firstEnabledModule === "habits") {
				router.replace("/(tabs)");
			} else if (firstEnabledModule === "finance") {
				router.replace("/(tabs)/finance");
			}
		}
	}, [isWorkoutEnabled, firstEnabledModule, router, _hasHydrated]);

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	// Initialize tab indicator position only once when tab is loaded
	useEffect(() => {
		if (tabLoaded && activeTab) {
			const tabIndex = tabs.findIndex((t) => t.key === activeTab);
			if (tabIndex >= 0) {
				tabIndicatorAnim.setValue(tabIndex);
			}
		}
	}, [tabLoaded]); // Only run once when tabLoaded changes

	// Show nothing while store is hydrating or tab state is loading
	if (!_hasHydrated || !tabLoaded) {
		return null;
	}

	if (!isWorkoutEnabled) {
		return null;
	}

	const handleTabChange = (tab: TabType) => {
		const tabIndex = tabs.findIndex((t) => t.key === tab);
		Animated.timing(tabIndicatorAnim, {
			toValue: tabIndex,
			duration: 200,
			useNativeDriver: true,
		}).start();
		setActiveTab(tab);
	};

	// Check if user can start a new workout based on subscription
	const handleStartWorkout = () => {
		const monthlyCount = getCurrentMonthWorkoutCount();
		if (!subscriptionCheck.canLogWorkout(monthlyCount)) {
			subscriptionCheck.showUpgradeAlert(
				"Workout Limit Reached",
				`Your plan allows ${subscriptionCheck.limits.maxWorkouts} workouts per month. Upgrade for unlimited workouts.`
			);
			return;
		}
		setShowActiveWorkout(true);
	};

	const renderTabContent = () => {
		const gender = fitnessProfile?.gender || "male";
		switch (activeTab) {
			case "dashboard":
				return (
					<WorkoutDashboard
						theme={theme}
						onStartWorkout={handleStartWorkout}
						onNavigateToTab={handleTabChange}
						subscriptionCheck={subscriptionCheck}
					/>
				);
			case "nutrition":
				return <NutriPlan theme={theme} />;
			case "statistics":
				return (
					<WorkoutStatistics
						theme={theme}
						gender={gender}
						subscriptionCheck={subscriptionCheck}
					/>
				);
			case "plans":
				return (
					<WorkoutPlans
						theme={theme}
						onStartWorkout={handleStartWorkout}
						subscriptionCheck={subscriptionCheck}
						currentPlanCount={workoutPlans.length}
					/>
				);
			case "history":
				return (
					<WorkoutHistory theme={theme} subscriptionCheck={subscriptionCheck} />
				);
			default:
				return (
					<WorkoutDashboard
						theme={theme}
						onStartWorkout={handleStartWorkout}
						onNavigateToTab={handleTabChange}
						subscriptionCheck={subscriptionCheck}
					/>
				);
		}
	};

	const tabWidth = (width - 32) / tabs.length;
	const translateX = tabIndicatorAnim.interpolate({
		inputRange: tabs.map((_, i) => i),
		outputRange: tabs.map((_, i) => i * tabWidth),
	});

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Drawer Overlay */}
			{drawerOpen && (
				<TouchableOpacity
					style={[styles.drawerOverlay, { zIndex: 15 }]}
					activeOpacity={1}
					onPress={() => setDrawerOpen(false)}
				/>
			)}

			{/* Shared Drawer Component */}
			<SharedDrawer
				theme={theme}
				isDark={isDark}
				toggleTheme={toggleTheme}
				drawerAnim={drawerAnim}
				currentModule="workout"
				onCloseDrawer={() => setDrawerOpen(false)}
			/>

			{/* Header - Same style as Habits page */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Workout Tracker</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						onPress={() =>
							router.push({
								pathname: "/(tabs)/profile",
								params: { from: "workout" },
							})
						}
					>
						{authProfile?.avatar_url ? (
							<Image
								source={{ uri: authProfile.avatar_url }}
								style={styles.headerAvatar}
							/>
						) : (
							<Ionicons
								name="person-circle-outline"
								size={28}
								color={theme.text}
							/>
						)}
					</TouchableOpacity>
					<TouchableOpacity onPress={() => setDrawerOpen(true)}>
						<Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Tab Bar */}
			<View style={styles.tabBar}>
				<Animated.View
					style={[
						styles.tabIndicator,
						{
							width: tabWidth - 8,
							transform: [{ translateX }],
						},
					]}
				/>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={styles.tab}
						onPress={() => handleTabChange(tab.key)}
					>
						<Ionicons
							name={tab.icon as any}
							size={20}
							color={activeTab === tab.key ? theme.primary : theme.textMuted}
						/>
						<Text
							style={[
								styles.tabLabel,
								activeTab === tab.key && styles.tabLabelActive,
							]}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Tab Content */}
			<View style={styles.content}>{renderTabContent()}</View>

			{/* Active Workout Modal */}
			<Modal
				visible={showActiveWorkout || !!currentSession}
				animationType="slide"
				presentationStyle="fullScreen"
			>
				<SafeAreaView style={styles.container}>
					<ActiveWorkoutScreen
						theme={theme}
						onClose={() => setShowActiveWorkout(false)}
					/>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		headerTitle: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		headerAvatar: {
			width: 28,
			height: 28,
			borderRadius: 14,
		},
		tabBar: {
			flexDirection: "row",
			marginHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 4,
			marginBottom: 16,
			position: "relative",
		},
		tabIndicator: {
			position: "absolute",
			top: 4,
			left: 4,
			height: "100%",
			backgroundColor: theme.primary + "20",
			borderRadius: 12,
		},
		tab: {
			flex: 1,
			alignItems: "center",
			paddingVertical: 12,
			gap: 4,
		},
		tabLabel: {
			fontSize: 11,
			fontWeight: "500",
			color: theme.textMuted,
		},
		tabLabelActive: {
			color: theme.primary,
			fontWeight: "600",
		},
		content: {
			flex: 1,
		},
		// Drawer styles
		drawerOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.5)",
			zIndex: 10,
		},
		drawer: {
			position: "absolute",
			top: 0,
			left: 0,
			bottom: 0,
			width: width * 0.8,
			backgroundColor: theme.background,
			zIndex: 20,
			paddingTop: 50,
			shadowColor: "#000",
			shadowOffset: { width: 2, height: 0 },
			shadowOpacity: 0.25,
			shadowRadius: 10,
			elevation: 10,
		},
		drawerHeader: {
			alignItems: "center",
			paddingVertical: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		drawerAvatar: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		drawerAvatarImage: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 12,
		},
		drawerName: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		drawerEmail: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		drawerContent: {
			flex: 1,
			paddingTop: 16,
			paddingHorizontal: 16,
		},
		drawerSectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.textMuted,
			letterSpacing: 1,
			marginBottom: 12,
			marginLeft: 4,
		},
		drawerItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 14,
			paddingVertical: 14,
			gap: 14,
			borderRadius: 16,
			marginBottom: 8,
			backgroundColor: theme.surfaceLight,
		},
		drawerItemIconNew: {
			width: 42,
			height: 42,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemContent: {
			flex: 1,
		},
		drawerItemText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		drawerItemSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		drawerItemBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.success + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemActive: {
			backgroundColor: theme.success + "15",
			borderWidth: 1,
			borderColor: theme.success + "30",
		},
		drawerItemTextActive: {
			color: theme.success,
			fontWeight: "600",
		},
		drawerDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 16,
			marginHorizontal: 4,
		},
		drawerFooter: {
			padding: 20,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		themeToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		themeToggleLabel: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		themeToggleText: {
			fontSize: 14,
			color: theme.text,
		},
		toggle: {
			width: 50,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.surface,
			padding: 2,
			justifyContent: "center",
		},
		toggleOn: {
			backgroundColor: theme.primary,
		},
		toggleThumb: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.textMuted,
		},
		toggleThumbOn: {
			backgroundColor: "#fff",
			alignSelf: "flex-end",
		},
	});
