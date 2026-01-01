// Finance Tracker - Main Screen

import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	StatusBar,
	Animated,
	Dimensions,
	Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTheme, useColors, Theme } from "@/src/context/themeContext";
import { useHabitStore } from "@/src/context/habitStore";
import { useFinanceStore } from "@/src/context/financeStore";

// Import Finance Components
import FinanceDashboard from "@/src/components/finance/FinanceDashboard";
import TransactionList from "@/src/components/finance/TransactionList";
import BudgetManager from "@/src/components/finance/BudgetManager";
import SplitWise from "@/src/components/finance/SplitWise";
import FinanceAnalytics from "@/src/components/finance/FinanceAnalytics";

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
	const { currency } = useFinanceStore();
	const styles = createStyles(theme);

	const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));

	const userName = profile?.name || "User";

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 17) return "Good Afternoon";
		return "Good Evening";
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
					/>
				);
			case "transactions":
				return (
					<TransactionList
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
					/>
				);
			case "budgets":
				return (
					<BudgetManager
						theme={theme}
						currency={currency}
						onOpenDrawer={openDrawer}
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
							params: { from: "finance" },
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
						style={styles.drawerItem}
						onPress={() => {
							setDrawerOpen(false);
							router.push("/(tabs)/workout" as any);
						}}
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
							<Text style={styles.drawerItemText}>FitZone</Text>
							<Text style={styles.drawerItemSubtext}>Track your workouts</Text>
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
								{ backgroundColor: theme.warning },
							]}
						>
							<Ionicons name="trending-up" size={20} color="#fff" />
						</View>
						<View style={styles.drawerItemContent}>
							<Text
								style={[styles.drawerItemText, styles.drawerItemTextActive]}
							>
								Money Hub
							</Text>
							<Text style={styles.drawerItemSubtext}>Manage your finances</Text>
						</View>
						<View style={styles.drawerItemBadge}>
							<Ionicons name="checkmark" size={16} color={theme.warning} />
						</View>
					</TouchableOpacity>

					<View style={styles.drawerDivider} />

					<Text style={styles.drawerSectionTitle}>GENERAL</Text>

					<TouchableOpacity
						style={styles.drawerItem}
						onPress={() => {
							setDrawerOpen(false);
							router.push("/two?from=finance");
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

			{/* Header - Same style as Workout page */}
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
			height: 32,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
		},
		tabIconContainerActive: {
			backgroundColor: theme.primary + "20",
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
