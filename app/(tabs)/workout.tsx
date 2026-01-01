// Workout Tracker Main Screen - Tab-based navigation

import React, { useState, useCallback, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	StatusBar,
	Dimensions,
	Animated,
	Modal,
	Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTheme, useColors, Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { useHabitStore } from "@/src/context/habitStore";
import {
	WorkoutDashboard,
	WorkoutStatistics,
	WorkoutPlans,
	WorkoutHistory,
	ActiveWorkoutScreen,
} from "@/src/components/workout";

const { width } = Dimensions.get("window");

type TabType = "dashboard" | "statistics" | "plans" | "history";

const tabs: { key: TabType; label: string; icon: string }[] = [
	{ key: "dashboard", label: "Dashboard", icon: "home" },
	{ key: "statistics", label: "Statistics", icon: "stats-chart" },
	{ key: "plans", label: "Plans", icon: "clipboard" },
	{ key: "history", label: "History", icon: "time" },
];

export default function WorkoutTrackerScreen() {
	const router = useRouter();
	const { isDark, toggleTheme } = useTheme();
	const theme = useColors();
	const { fitnessProfile, currentSession } = useWorkoutStore();
	const { profile } = useHabitStore();
	const [activeTab, setActiveTab] = useState<TabType>("dashboard");
	const [tabIndicatorAnim] = useState(new Animated.Value(0));
	const [showActiveWorkout, setShowActiveWorkout] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));

	const userName = profile?.name || "User";
	const styles = createStyles(theme);

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	const handleTabChange = (tab: TabType) => {
		const tabIndex = tabs.findIndex((t) => t.key === tab);
		Animated.spring(tabIndicatorAnim, {
			toValue: tabIndex,
			useNativeDriver: true,
			tension: 100,
			friction: 10,
		}).start();
		setActiveTab(tab);
	};

	const renderTabContent = () => {
		const gender = fitnessProfile?.gender || "male";
		switch (activeTab) {
			case "dashboard":
				return (
					<WorkoutDashboard
						theme={theme}
						onStartWorkout={() => setShowActiveWorkout(true)}
						onNavigateToTab={handleTabChange}
					/>
				);
			case "statistics":
				return <WorkoutStatistics theme={theme} gender={gender} />;
			case "plans":
				return (
					<WorkoutPlans
						theme={theme}
						onStartWorkout={() => setShowActiveWorkout(true)}
					/>
				);
			case "history":
				return <WorkoutHistory theme={theme} />;
			default:
				return (
					<WorkoutDashboard
						theme={theme}
						onStartWorkout={() => setShowActiveWorkout(true)}
						onNavigateToTab={handleTabChange}
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
					style={styles.drawerOverlay}
					activeOpacity={1}
					onPress={() => setDrawerOpen(false)}
				/>
			)}

			{/* Animated Drawer */}
			<Animated.View
				style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
			>
				<TouchableOpacity
					style={styles.drawerHeader}
					onPress={() => {
						setDrawerOpen(false);
						router.push({
							pathname: "/(tabs)/profile",
							params: { from: "workout" },
						} as any);
					}}
					activeOpacity={0.7}
				>
					{profile?.avatar ? (
						<Image
							source={{ uri: profile.avatar }}
							style={styles.drawerAvatarImage}
						/>
					) : (
						<View style={styles.drawerAvatar}>
							<Ionicons name="person" size={32} color={theme.textSecondary} />
						</View>
					)}
					<Text style={styles.drawerName}>{userName}</Text>
					<Text style={styles.drawerEmail}>
						{profile?.email || "Tap to set up profile"}
					</Text>
				</TouchableOpacity>

				<View style={styles.drawerContent}>
					<Text style={styles.drawerSectionTitle}>MODULES</Text>

					<TouchableOpacity
						style={styles.drawerItem}
						onPress={() => {
							setDrawerOpen(false);
							router.push("/(tabs)/" as any);
						}}
					>
						<View
							style={[
								styles.drawerItemIconNew,
								{ backgroundColor: theme.primary },
							]}
						>
							<Ionicons name="sparkles" size={20} color="#fff" />
						</View>
						<View style={styles.drawerItemContent}>
							<Text style={styles.drawerItemText}>Daily Rituals</Text>
							<Text style={styles.drawerItemSubtext}>Build better habits</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textMuted}
						/>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.drawerItem, styles.drawerItemActive]}
						onPress={() => setDrawerOpen(false)}
					>
						<View
							style={[
								styles.drawerItemIconNew,
								{ backgroundColor: theme.success },
							]}
						>
							<Ionicons name="flame" size={20} color="#fff" />
						</View>
						<View style={styles.drawerItemContent}>
							<Text
								style={[styles.drawerItemText, styles.drawerItemTextActive]}
							>
								FitZone
							</Text>
							<Text style={styles.drawerItemSubtext}>Track your workouts</Text>
						</View>
						<View style={styles.drawerItemBadge}>
							<Ionicons name="checkmark" size={16} color={theme.success} />
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.drawerItem}
						onPress={() => {
							setDrawerOpen(false);
							router.push("/(tabs)/finance" as any);
						}}
					>
						<View
							style={[
								styles.drawerItemIconNew,
								{ backgroundColor: theme.warning },
							]}
						>
							<Ionicons name="trending-up" size={20} color="#fff" />
						</View>
						<View style={styles.drawerItemContent}>
							<Text style={styles.drawerItemText}>Money Hub</Text>
							<Text style={styles.drawerItemSubtext}>Manage your finances</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textMuted}
						/>
					</TouchableOpacity>

					<View style={styles.drawerDivider} />

					<Text style={styles.drawerSectionTitle}>GENERAL</Text>

					<TouchableOpacity
						style={styles.drawerItem}
						onPress={() => {
							setDrawerOpen(false);
							router.push("/two?from=workout");
						}}
					>
						<View
							style={[
								styles.drawerItemIconNew,
								{ backgroundColor: theme.accent },
							]}
						>
							<Ionicons name="cog" size={20} color="#fff" />
						</View>
						<View style={styles.drawerItemContent}>
							<Text style={styles.drawerItemText}>Preferences</Text>
							<Text style={styles.drawerItemSubtext}>Customize your app</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textMuted}
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.drawerFooter}>
					<View style={styles.themeToggle}>
						<View style={styles.themeToggleLabel}>
							<Ionicons
								name={isDark ? "moon" : "sunny"}
								size={20}
								color={theme.text}
							/>
							<Text style={styles.themeToggleText}>
								{isDark ? "Dark Mode" : "Light Mode"}
							</Text>
						</View>
						<TouchableOpacity
							style={[styles.toggle, isDark && styles.toggleOn]}
							onPress={toggleTheme}
						>
							<View
								style={[styles.toggleThumb, isDark && styles.toggleThumbOn]}
							/>
						</TouchableOpacity>
					</View>
				</View>
			</Animated.View>

			{/* Header - Same style as Habits page */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Workout Tracker</Text>
				<TouchableOpacity onPress={() => setDrawerOpen(true)}>
					<Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
				</TouchableOpacity>
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
