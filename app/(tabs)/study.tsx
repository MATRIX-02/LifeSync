// Study Hub - Main Screen for all types of learning and exam preparation

import { useSubscriptionCheck } from "@/src/components/PremiumFeatureGate";
import { SharedDrawer } from "@/src/components/SharedDrawer";
import RevisionScheduler from "@/src/components/study/RevisionScheduler";
import StudyAnalytics from "@/src/components/study/StudyAnalytics";
import StudyDashboard from "@/src/components/study/StudyDashboard";
import StudySession from "@/src/components/study/StudySession";
import SubjectManager from "@/src/components/study/SubjectManager";
import { useAuthStore } from "@/src/context/authStore";
import { useModuleStore } from "@/src/context/moduleContext";
import { useStudyStore } from "@/src/context/studyStoreDB/index";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useTabPersistence } from "@/src/hooks/useNavigationPersistence";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Animated,
	Dimensions,
	Image,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Import Study Components

const { width, height } = Dimensions.get("window");

type StudyTab = "dashboard" | "subjects" | "session" | "revision" | "analytics";

export default function StudyScreen() {
	const router = useRouter();
	const { isDark, toggleTheme } = useTheme();
	const theme = useColors();
	const { profile: authProfile, user } = useAuthStore();
	const { isLoading, initialize } = useStudyStore();
	const { isModuleEnabled, getFirstEnabledModule, _hasHydrated } =
		useModuleStore();

	// Subscription checks for study limits
	const subscriptionCheck = useSubscriptionCheck();

	// Check if module is disabled
	const isStudyEnabled = isModuleEnabled("study");
	const firstEnabledModule = getFirstEnabledModule();

	const styles = createStyles(theme);

	// Persist active tab locally
	const [activeTab, setActiveTab, tabLoaded] = useTabPersistence<StudyTab>(
		"study",
		"dashboard"
	);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));

	const userName =
		authProfile?.full_name || user?.email?.split("@")[0] || "User";

	// Redirect if module is disabled - MUST be a hook, cannot be conditional
	useEffect(() => {
		// Only redirect after store has hydrated to avoid false redirects
		if (_hasHydrated && !isStudyEnabled) {
			if (firstEnabledModule === "habits") {
				router.replace("/(tabs)");
			} else if (firstEnabledModule === "workout") {
				router.replace("/(tabs)/workout");
			} else if (firstEnabledModule === "finance") {
				router.replace("/(tabs)/finance");
			}
		}
	}, [isStudyEnabled, firstEnabledModule, router, _hasHydrated]);

	// Initialize study store when user is available
	useEffect(() => {
		if (user?.id && isStudyEnabled) {
			console.log("📚 Initializing study store for user:", user.id);
			initialize(user.id).catch((err) =>
				console.log("⚠️ Could not initialize store:", err.message)
			);
		}
	}, [user?.id, isStudyEnabled, initialize]);

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	// Show nothing while store is hydrating or tab state is loading
	if (!_hasHydrated || !tabLoaded) {
		return null;
	}

	if (!isStudyEnabled) {
		return null;
	}

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 17) return "Good Afternoon";
		return "Good Evening";
	};

	// Get current month study sessions count for limit checking
	const getCurrentMonthSessionCount = () => {
		const { studySessions } = useStudyStore.getState();
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();
		return studySessions.filter((s) => {
			const sessionDate = new Date(s.startTime);
			return (
				sessionDate.getMonth() === currentMonth &&
				sessionDate.getFullYear() === currentYear
			);
		}).length;
	};

	const tabs: { id: StudyTab; label: string; icon: string }[] = [
		{ id: "dashboard", label: "Home", icon: "home" },
		{ id: "subjects", label: "Subjects", icon: "library" },
		{ id: "session", label: "Study", icon: "timer" },
		{ id: "revision", label: "Revision", icon: "calendar" },
		{ id: "analytics", label: "Analytics", icon: "stats-chart" },
	];

	const openDrawer = () => setDrawerOpen(true);

	const renderContent = () => {
		switch (activeTab) {
			case "dashboard":
				return (
					<StudyDashboard
						theme={theme}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
					/>
				);
			case "subjects":
				return (
					<SubjectManager
						theme={theme}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentSubjectCount={0}
					/>
				);
			case "session":
				return (
					<StudySession
						theme={theme}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentMonthSessionCount={getCurrentMonthSessionCount()}
					/>
				);
			case "revision":
				return (
					<RevisionScheduler
						theme={theme}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentMonthSessionCount={getCurrentMonthSessionCount()}
					/>
				);
			case "analytics":
				return (
					<StudyAnalytics
						theme={theme}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentMonthSessionCount={getCurrentMonthSessionCount()}
					/>
				);
			default:
				return <StudyDashboard theme={theme} onOpenDrawer={openDrawer} />;
		}
	};

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
				currentModule="study"
				onCloseDrawer={() => setDrawerOpen(false)}
			/>

			<View style={styles.header}>
				<Text style={styles.headerTitle}>Study Hub</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						onPress={() =>
							router.push({
								pathname: "/(tabs)/profile",
								params: { from: "study" },
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

			{/* Bottom Tab Bar */}
			<View style={styles.tabBar}>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab.id}
						style={styles.tabItem}
						onPress={() => setActiveTab(tab.id)}
					>
						<View
							style={[
								styles.tabIconContainer,
								activeTab === tab.id && styles.tabIconContainerActive,
							]}
						>
							<Ionicons
								name={tab.icon as any}
								size={22}
								color={activeTab === tab.id ? theme.accent : theme.textMuted}
							/>
						</View>
						<Text
							style={[
								styles.tabLabel,
								activeTab === tab.id && styles.tabLabelActive,
							]}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Tab Content */}
			<View style={styles.content}>{renderContent()}</View>
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
		content: {
			flex: 1,
		},
		tabBar: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			paddingVertical: 8,
			paddingBottom: 12,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		tabItem: {
			flex: 1,
			alignItems: "center",
			gap: 4,
		},
		tabIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		tabIconContainerActive: {
			backgroundColor: theme.accent + "20",
			borderRadius: 10,
		},
		tabLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		tabLabelActive: {
			color: theme.accent,
			fontWeight: "600",
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
	});
