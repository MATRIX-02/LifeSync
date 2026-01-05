// Finance Tracker - Main Screen

import { useSubscriptionCheck } from "@/src/components/PremiumFeatureGate";
import { SharedDrawer } from "@/src/components/SharedDrawer";
import { useFinanceStore } from "@/src/context/financeStore";
import { useHabitStore } from "@/src/context/habitStore";
import { useModuleStore } from "@/src/context/moduleContext";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Animated,
	Dimensions,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Import Finance Components
import BudgetManager from "@/src/components/finance/BudgetManager";
import FinanceAnalytics from "@/src/components/finance/FinanceAnalytics";
import FinanceDashboard from "@/src/components/finance/FinanceDashboard";
import SplitWise from "@/src/components/finance/SplitWise";
import TransactionList from "@/src/components/finance/TransactionList";

const { width, height } = Dimensions.get("window");

type FinanceTab =
	| "dashboard"
	| "transactions"
	| "budgets"
	| "split"
	| "analytics";

export default function FinanceScreen() {
	const router = useRouter();
	const { isDark, toggleTheme } = useTheme();
	const theme = useColors();
	const { profile } = useHabitStore();
	const { currency, accounts, transactions, budgets, savingsGoals } =
		useFinanceStore();
	const { isModuleEnabled, getFirstEnabledModule, _hasHydrated } =
		useModuleStore();

	// Subscription checks for finance limits
	const subscriptionCheck = useSubscriptionCheck();

	// Check if module is disabled
	const isFinanceEnabled = isModuleEnabled("finance");
	const firstEnabledModule = getFirstEnabledModule();

	const styles = createStyles(theme);

	const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));

	const userName = profile?.name || "User";

	// Redirect if module is disabled - MUST be a hook, cannot be conditional
	useEffect(() => {
		// Only redirect after store has hydrated to avoid false redirects
		if (_hasHydrated && !isFinanceEnabled) {
			if (firstEnabledModule === "habits") {
				router.replace("/(tabs)");
			} else if (firstEnabledModule === "workout") {
				router.replace("/(tabs)/workout");
			}
		}
	}, [isFinanceEnabled, firstEnabledModule, router, _hasHydrated]);

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	// Show nothing while store is hydrating to prevent flash
	if (!_hasHydrated) {
		return null;
	}

	if (!isFinanceEnabled) {
		return null;
	}

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 17) return "Good Afternoon";
		return "Good Evening";
	};

	// Get current month transactions count for limit checking
	const getCurrentMonthTransactionCount = () => {
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();
		return transactions.filter((t) => {
			const txDate = new Date(t.date);
			return (
				txDate.getMonth() === currentMonth &&
				txDate.getFullYear() === currentYear
			);
		}).length;
	};

	const tabs: { id: FinanceTab; label: string; icon: string }[] = [
		{ id: "dashboard", label: "Home", icon: "home" },
		{ id: "transactions", label: "Transactions", icon: "swap-horizontal" },
		{ id: "budgets", label: "Budgets", icon: "pie-chart" },
		{ id: "split", label: "Split", icon: "people" },
		{ id: "analytics", label: "Analytics", icon: "stats-chart" },
	];

	const openDrawer = () => setDrawerOpen(true);

	const renderContent = () => {
		switch (activeTab) {
			case "dashboard":
				return (
					<FinanceDashboard
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
					/>
				);
			case "transactions":
				return (
					<TransactionList
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentMonthTransactionCount={getCurrentMonthTransactionCount()}
					/>
				);
			case "budgets":
				return (
					<BudgetManager
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
						currentBudgetCount={budgets.length}
						currentGoalCount={savingsGoals.length}
					/>
				);
			case "split":
				return (
					<SplitWise
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
					/>
				);
			case "analytics":
				return (
					<FinanceAnalytics
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
						subscriptionCheck={subscriptionCheck}
					/>
				);
			default:
				return (
					<FinanceDashboard
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
					/>
				);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Main Content */}
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
				currentModule="finance"
				onCloseDrawer={() => setDrawerOpen(false)}
			/>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Finance Tracker</Text>
				<TouchableOpacity onPress={() => setDrawerOpen(true)}>
					<Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
				</TouchableOpacity>
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
								color={activeTab === tab.id ? theme.primary : theme.textMuted}
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
			backgroundColor: theme.primary + "20",
			borderRadius: 10,
		},
		tabLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		tabLabelActive: {
			color: theme.primary,
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
			backgroundColor: theme.warning + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemActive: {
			backgroundColor: theme.warning + "15",
			borderWidth: 1,
			borderColor: theme.warning + "30",
		},
		drawerItemTextActive: {
			color: theme.warning,
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
