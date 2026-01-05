import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Default limits for free plan (fallback if not fetched from DB)
const DEFAULT_FREE_LIMITS = {
	max_habits: 5,
	max_workouts: 5,
	max_accounts: 3,
	max_transactions_per_month: 50,
	max_budgets: 2,
	max_savings_goals: 2,
	max_workout_plans: 3,
	max_history_days: 30,
	has_analytics: false,
	has_export: false,
	has_sync: false,
	has_priority_support: false,
	has_custom_exercises: false,
	has_advanced_stats: false,
};

interface SubscriptionLimits {
	// Habits
	maxHabits: number; // -1 = unlimited
	// Workouts
	maxWorkouts: number; // -1 = unlimited (sessions per month)
	maxWorkoutPlans: number;
	maxHistoryDays: number; // -1 = unlimited
	hasCustomExercises: boolean;
	hasAdvancedStats: boolean;
	// Finance
	maxAccounts: number;
	maxTransactionsPerMonth: number; // -1 = unlimited
	maxBudgets: number;
	maxSavingsGoals: number;
	// General features
	hasAnalytics: boolean;
	hasExport: boolean;
	hasSync: boolean;
	hasPrioritySupport: boolean;
}

interface PremiumFeatureGateProps {
	children: React.ReactNode;
	feature: string;
	requiredPlan?: "pro" | "premium"; // Default: pro
	showUpgradePrompt?: boolean;
}

/**
 * Wraps premium features and shows upgrade prompt for free users
 */
export function PremiumFeatureGate({
	children,
	feature,
	requiredPlan = "pro",
	showUpgradePrompt = true,
}: PremiumFeatureGateProps) {
	const { subscription } = useAuthStore();
	const { theme } = useTheme();
	const router = useRouter();

	const currentPlan = subscription?.subscription_plans?.slug || "free";
	const planHierarchy = ["free", "basic", "pro", "premium", "enterprise"];
	const currentPlanIndex = planHierarchy.indexOf(currentPlan);
	const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

	const hasAccess = currentPlanIndex >= requiredPlanIndex;

	if (hasAccess) {
		return <>{children}</>;
	}

	if (!showUpgradePrompt) {
		return null;
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.surface }]}>
			<View
				style={[
					styles.iconContainer,
					{ backgroundColor: theme.warning + "20" },
				]}
			>
				<Ionicons name="diamond" size={32} color={theme.warning} />
			</View>
			<Text style={[styles.title, { color: theme.text }]}>
				{requiredPlan === "premium" ? "Premium" : "Pro"} Feature
			</Text>
			<Text style={[styles.description, { color: theme.textSecondary }]}>
				{feature} is available on the{" "}
				{requiredPlan === "premium" ? "Premium" : "Pro"} plan and above.
			</Text>
			<TouchableOpacity
				style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
				onPress={() => router.push("/subscription")}
			>
				<Ionicons name="arrow-up-circle" size={20} color="#fff" />
				<Text style={styles.upgradeButtonText}>Upgrade Now</Text>
			</TouchableOpacity>
		</View>
	);
}

/**
 * Type for subscription check return value
 * Export this so components can type their props
 */
export type SubscriptionCheckResult = ReturnType<typeof useSubscriptionCheck>;

/**
 * Hook to check subscription status and get dynamic limits
 * All limits are fetched from the subscription_plans table in the database
 */
export function useSubscriptionCheck() {
	const { subscription } = useAuthStore();
	const router = useRouter();

	const plan = subscription?.subscription_plans;
	const currentPlan = plan?.slug || "free";
	const planHierarchy = ["free", "basic", "pro", "premium", "enterprise"];
	const currentPlanIndex = planHierarchy.indexOf(currentPlan);

	// Get limits from the plan (with defaults for free if not available)
	const limits: SubscriptionLimits = {
		// Habits - from DB or default
		maxHabits: plan?.max_habits ?? DEFAULT_FREE_LIMITS.max_habits,
		// Workouts - from DB or default
		maxWorkouts: plan?.max_workouts ?? DEFAULT_FREE_LIMITS.max_workouts,
		maxWorkoutPlans:
			(plan as any)?.max_workout_plans ?? DEFAULT_FREE_LIMITS.max_workout_plans,
		maxHistoryDays:
			(plan as any)?.max_history_days ?? DEFAULT_FREE_LIMITS.max_history_days,
		hasCustomExercises:
			(plan as any)?.has_custom_exercises ??
			DEFAULT_FREE_LIMITS.has_custom_exercises,
		hasAdvancedStats:
			(plan as any)?.has_advanced_stats ??
			DEFAULT_FREE_LIMITS.has_advanced_stats,
		// Finance - from DB or default
		maxAccounts:
			(plan as any)?.max_accounts ?? DEFAULT_FREE_LIMITS.max_accounts,
		maxTransactionsPerMonth:
			(plan as any)?.max_transactions_per_month ??
			DEFAULT_FREE_LIMITS.max_transactions_per_month,
		maxBudgets: (plan as any)?.max_budgets ?? DEFAULT_FREE_LIMITS.max_budgets,
		maxSavingsGoals:
			(plan as any)?.max_savings_goals ?? DEFAULT_FREE_LIMITS.max_savings_goals,
		// General features - from DB
		hasAnalytics: plan?.has_analytics ?? DEFAULT_FREE_LIMITS.has_analytics,
		hasExport: plan?.has_export ?? DEFAULT_FREE_LIMITS.has_export,
		hasSync: plan?.has_sync ?? DEFAULT_FREE_LIMITS.has_sync,
		hasPrioritySupport:
			plan?.has_priority_support ?? DEFAULT_FREE_LIMITS.has_priority_support,
	};

	// Helper to check if a limit is unlimited (-1 means unlimited)
	const isUnlimited = (limit: number) => limit === -1;

	// Helper to check if user can add more items
	const canAddMore = (currentCount: number, maxLimit: number) => {
		if (maxLimit === -1) return true; // Unlimited
		return currentCount < maxLimit;
	};

	// Helper to show upgrade alert
	const showUpgradeAlert = (
		title: string,
		message: string,
		navigateToUpgrade: boolean = true
	) => {
		Alert.alert(title, message, [
			{ text: "Cancel", style: "cancel" },
			...(navigateToUpgrade
				? [
						{
							text: "Upgrade",
							onPress: () => router.push("/subscription"),
						},
				  ]
				: []),
		]);
	};

	return {
		// Plan info
		currentPlan,
		planName: plan?.name || "Free",
		isPro: currentPlanIndex >= 2, // pro or higher
		isPremium: currentPlanIndex >= 3, // premium or higher
		isEnterprise: currentPlanIndex >= 4,
		isFree: currentPlan === "free",
		isBasic: currentPlan === "basic",

		// All limits (dynamic from DB)
		limits,

		// Utility functions
		isUnlimited,
		canAddMore,
		showUpgradeAlert,

		// Quick checks for common features
		hasFeature: (requiredPlan: "basic" | "pro" | "premium" | "enterprise") => {
			const requiredIndex = planHierarchy.indexOf(requiredPlan);
			return currentPlanIndex >= requiredIndex;
		},

		// ============ HABITS CHECKS ============
		canAddHabit: (currentHabitCount: number) =>
			canAddMore(currentHabitCount, limits.maxHabits),
		getHabitsRemaining: (currentHabitCount: number) => {
			if (limits.maxHabits === -1) return Infinity;
			return Math.max(0, limits.maxHabits - currentHabitCount);
		},

		// ============ WORKOUT CHECKS ============
		canAddWorkoutPlan: (currentPlanCount: number) =>
			canAddMore(currentPlanCount, limits.maxWorkoutPlans),
		canLogWorkout: (currentMonthCount: number) =>
			canAddMore(currentMonthCount, limits.maxWorkouts),
		canAccessWorkoutHistory: (daysAgo: number) => {
			if (limits.maxHistoryDays === -1) return true;
			return daysAgo <= limits.maxHistoryDays;
		},
		getWorkoutPlansRemaining: (currentCount: number) => {
			if (limits.maxWorkoutPlans === -1) return Infinity;
			return Math.max(0, limits.maxWorkoutPlans - currentCount);
		},

		// ============ FINANCE CHECKS ============
		canAddAccount: (currentAccountCount: number) =>
			canAddMore(currentAccountCount, limits.maxAccounts),
		canAddTransaction: (currentMonthCount: number) =>
			canAddMore(currentMonthCount, limits.maxTransactionsPerMonth),
		canAddBudget: (currentBudgetCount: number) =>
			canAddMore(currentBudgetCount, limits.maxBudgets),
		canAddSavingsGoal: (currentGoalCount: number) =>
			canAddMore(currentGoalCount, limits.maxSavingsGoals),
		getAccountsRemaining: (currentCount: number) => {
			if (limits.maxAccounts === -1) return Infinity;
			return Math.max(0, limits.maxAccounts - currentCount);
		},
		getTransactionsRemaining: (currentCount: number) => {
			if (limits.maxTransactionsPerMonth === -1) return Infinity;
			return Math.max(0, limits.maxTransactionsPerMonth - currentCount);
		},

		// ============ FEATURE ACCESS CHECKS ============
		canAccessAnalytics: () => limits.hasAnalytics,
		canExportData: () => limits.hasExport,
		canSyncData: () => limits.hasSync,
		canUseCustomExercises: () => limits.hasCustomExercises,
		canAccessAdvancedStats: () => limits.hasAdvancedStats,
	};
}

/**
 * Premium badge component
 */
export function PremiumBadge({
	plan = "pro",
	small = false,
}: {
	plan?: "pro" | "premium";
	small?: boolean;
}) {
	const { theme } = useTheme();

	return (
		<View
			style={[
				styles.badge,
				small && styles.badgeSmall,
				{
					backgroundColor:
						plan === "premium" ? theme.warning + "20" : theme.primary + "20",
				},
			]}
		>
			<Ionicons
				name="diamond"
				size={small ? 10 : 12}
				color={plan === "premium" ? theme.warning : theme.primary}
			/>
			<Text
				style={[
					styles.badgeText,
					small && styles.badgeTextSmall,
					{ color: plan === "premium" ? theme.warning : theme.primary },
				]}
			>
				{plan === "premium" ? "PREMIUM" : "PRO"}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
		borderRadius: 16,
		alignItems: "center",
		margin: 16,
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 8,
	},
	description: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: 20,
		lineHeight: 20,
	},
	upgradeButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 12,
		gap: 8,
	},
	upgradeButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	badge: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 6,
		gap: 4,
	},
	badgeSmall: {
		paddingVertical: 2,
		paddingHorizontal: 6,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: "700",
	},
	badgeTextSmall: {
		fontSize: 8,
	},
});
