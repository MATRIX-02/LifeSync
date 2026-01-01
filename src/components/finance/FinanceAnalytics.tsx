// Finance Analytics - Charts, spending breakdown, trends, insights
// Redesigned with Statistics.tsx inspiration

import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";
import { Theme } from "@/src/context/themeContext";
import { useFinanceStore } from "@/src/context/financeStore";
import {
	ExpenseCategory,
	IncomeCategory,
	EXPENSE_CATEGORIES,
	INCOME_CATEGORIES,
} from "@/src/types/finance";

interface FinanceAnalyticsProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

type TimeRange = "week" | "month" | "quarter" | "year" | "all";

const { width } = Dimensions.get("window");

// Progress Ring Component (from Statistics.tsx)
const ProgressRing = ({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
}: {
	progress: number;
	size: number;
	strokeWidth: number;
	color: string;
	backgroundColor: string;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const strokeDashoffset =
		circumference - (Math.min(progress, 100) / 100) * circumference;

	return (
		<Svg width={size} height={size}>
			<Circle
				stroke={backgroundColor}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
			/>
			<Circle
				stroke={color}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				strokeDasharray={`${circumference} ${circumference}`}
				strokeDashoffset={strokeDashoffset}
				strokeLinecap="round"
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</Svg>
	);
};

export default function FinanceAnalytics({
	theme,
	currency,
	onOpenDrawer,
}: FinanceAnalyticsProps) {
	const {
		transactions,
		accounts,
		getFinancialSummary,
		getSpendingByCategory,
		getMonthlyTrends,
		getNetWorth,
	} = useFinanceStore();

	const styles = createStyles(theme);

	const [timeRange, setTimeRange] = useState<TimeRange>("month");
	const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

	const dateRange = useMemo(() => {
		const now = new Date();
		let start: string;
		switch (timeRange) {
			case "week":
				start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];
				break;
			case "month":
				start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];
				break;
			case "quarter":
				start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];
				break;
			case "year":
				start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];
				break;
			default:
				start = "2020-01-01";
		}
		return { start, end: now.toISOString().split("T")[0] };
	}, [timeRange]);

	const summaryData = useMemo(
		() => getFinancialSummary(dateRange.start, dateRange.end),
		[dateRange, transactions]
	);

	// Provide defaults to prevent undefined errors
	const summary = {
		totalIncome: summaryData?.totalIncome ?? 0,
		totalExpenses: summaryData?.totalExpenses ?? 0,
		balance: summaryData?.balance ?? 0,
		netSavings: summaryData?.netSavings ?? 0,
		topCategories: summaryData?.topCategories ?? [],
		averageDailySpending: summaryData?.averageDailySpending ?? 0,
		largestExpense: summaryData?.largestExpense ?? null,
	};

	const spendingByCategory = useMemo(
		() => getSpendingByCategory(dateRange.start, dateRange.end),
		[dateRange, transactions]
	);

	const incomeByCategory = useMemo(() => {
		const filtered = transactions.filter(
			(t) =>
				t.type === "income" &&
				t.date >= dateRange.start &&
				t.date <= dateRange.end
		);
		const categoryMap: Record<string, number> = {};
		filtered.forEach((t) => {
			categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
		});
		return Object.entries(categoryMap)
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount);
	}, [dateRange, transactions]);

	const monthlyTrends = useMemo(() => getMonthlyTrends(12), [transactions]);

	const netWorth = getNetWorth();

	const formatAmount = (value: number | undefined | null) => {
		const num = value ?? 0;
		if (num >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
		if (num >= 100000) return `${(num / 100000).toFixed(2)}L`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toFixed(0);
	};

	const formatFullAmount = (value: number | undefined | null) => {
		const num = value ?? 0;
		return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
	};

	const formatPercent = (
		value: number | undefined | null,
		total: number | undefined | null
	) => {
		const v = value ?? 0;
		const t = total ?? 0;
		if (t === 0) return "0%";
		return `${((v / t) * 100).toFixed(1)}%`;
	};

	// Calculate key metrics
	const savingsRate =
		summary.totalIncome > 0
			? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) *
			  100
			: 0;

	const days = Math.max(
		1,
		(new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
			(24 * 60 * 60 * 1000)
	);
	const avgDailySpending = summary.totalExpenses / days;

	// Transaction count
	const txCount = transactions.filter(
		(t) => t.date >= dateRange.start && t.date <= dateRange.end
	).length;

	// Calculate max values for chart scaling
	const maxSpending = Math.max(...spendingByCategory.map((s) => s.amount), 1);
	const maxTrend = Math.max(
		...monthlyTrends.map((t) => Math.max(t.income, t.expense)),
		1
	);

	const getPeriodLabel = () => {
		switch (timeRange) {
			case "week":
				return "This Week";
			case "month":
				return "This Month";
			case "quarter":
				return "This Quarter";
			case "year":
				return "This Year";
			case "all":
				return "All Time";
		}
	};

	const getRingColor = () => {
		if (savingsRate >= 30) return theme.success;
		if (savingsRate >= 15) return "#22D3EE"; // cyan
		if (savingsRate >= 0) return theme.warning;
		return theme.error;
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Period Selector */}
			<View style={styles.periodSection}>
				<TouchableOpacity
					style={styles.periodDropdown}
					onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
				>
					<Text style={styles.periodText}>{getPeriodLabel()}</Text>
					<Ionicons name="chevron-down" size={18} color={theme.text} />
				</TouchableOpacity>

				{showPeriodDropdown && (
					<View style={styles.dropdownMenu}>
						{(["week", "month", "quarter", "year", "all"] as TimeRange[]).map(
							(range) => (
								<TouchableOpacity
									key={range}
									style={[
										styles.dropdownItem,
										timeRange === range && styles.dropdownItemActive,
									]}
									onPress={() => {
										setTimeRange(range);
										setShowPeriodDropdown(false);
									}}
								>
									<Text
										style={[
											styles.dropdownItemText,
											timeRange === range && styles.dropdownItemTextActive,
										]}
									>
										{range === "all"
											? "All Time"
											: range.charAt(0).toUpperCase() + range.slice(1)}
									</Text>
								</TouchableOpacity>
							)
						)}
					</View>
				)}
			</View>

			{/* Overview Card - Statistics style */}
			<View style={styles.overviewCard}>
				<View style={styles.overviewTop}>
					<View style={styles.progressRingContainer}>
						<ProgressRing
							progress={Math.max(0, savingsRate)}
							size={100}
							strokeWidth={10}
							color={getRingColor()}
							backgroundColor={theme.surfaceLight}
						/>
						<View style={styles.progressTextContainer}>
							<Text style={[styles.progressPercent, { color: getRingColor() }]}>
								{savingsRate >= 0 ? Math.round(savingsRate) : 0}%
							</Text>
							<Text style={styles.progressLabel}>saved</Text>
						</View>
					</View>
					<View style={styles.overviewBalance}>
						<Text style={styles.overviewBalanceLabel}>Net Balance</Text>
						<Text
							style={[
								styles.overviewBalanceValue,
								{ color: summary.balance >= 0 ? theme.success : theme.error },
							]}
						>
							{summary.balance >= 0 ? "+" : "-"}
							{currency}
							{formatFullAmount(Math.abs(summary.balance))}
						</Text>
					</View>
				</View>
				<View style={styles.overviewStats}>
					<View style={styles.overviewStat}>
						<Ionicons
							name="arrow-down-circle"
							size={20}
							color={theme.success}
						/>
						<View style={styles.overviewStatText}>
							<Text style={[styles.overviewValue, { color: theme.success }]}>
								{currency}
								{formatAmount(summary.totalIncome)}
							</Text>
							<Text style={styles.overviewLabel}>Income</Text>
						</View>
					</View>
					<View style={styles.overviewDivider} />
					<View style={styles.overviewStat}>
						<Ionicons name="arrow-up-circle" size={20} color={theme.error} />
						<View style={styles.overviewStatText}>
							<Text style={[styles.overviewValue, { color: theme.error }]}>
								{currency}
								{formatAmount(summary.totalExpenses)}
							</Text>
							<Text style={styles.overviewLabel}>Expenses</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Quick Stats Row */}
			<View style={styles.quickStatsRow}>
				<View style={styles.quickStat}>
					<View
						style={[
							styles.quickStatIcon,
							{ backgroundColor: theme.warning + "20" },
						]}
					>
						<Ionicons name="calendar" size={18} color={theme.warning} />
					</View>
					<View style={styles.quickStatContent}>
						<Text style={styles.quickStatValue}>
							{currency}
							{formatAmount(avgDailySpending)}
						</Text>
						<Text style={styles.quickStatLabel}>Daily Avg</Text>
					</View>
				</View>
				<View style={styles.quickStat}>
					<View
						style={[
							styles.quickStatIcon,
							{ backgroundColor: theme.primary + "20" },
						]}
					>
						<Ionicons name="receipt" size={18} color={theme.primary} />
					</View>
					<View style={styles.quickStatContent}>
						<Text style={styles.quickStatValue}>{txCount}</Text>
						<Text style={styles.quickStatLabel}>Transactions</Text>
					</View>
				</View>
				<View style={styles.quickStat}>
					<View
						style={[
							styles.quickStatIcon,
							{ backgroundColor: theme.success + "20" },
						]}
					>
						<Ionicons name="wallet" size={18} color={theme.success} />
					</View>
					<View style={styles.quickStatContent}>
						<Text style={styles.quickStatValue}>
							{currency}
							{formatAmount(netWorth)}
						</Text>
						<Text style={styles.quickStatLabel}>Net Worth</Text>
					</View>
				</View>
			</View>

			{/* Monthly Trends - Bar Chart */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Monthly Trends</Text>
					<View style={styles.legendRow}>
						<View style={styles.legendItem}>
							<View
								style={[styles.legendDot, { backgroundColor: theme.success }]}
							/>
							<Text style={styles.legendText}>Income</Text>
						</View>
						<View style={styles.legendItem}>
							<View
								style={[styles.legendDot, { backgroundColor: theme.error }]}
							/>
							<Text style={styles.legendText}>Expense</Text>
						</View>
					</View>
				</View>

				{monthlyTrends.length === 0 ? (
					<View style={styles.emptyChart}>
						<Ionicons
							name="bar-chart-outline"
							size={40}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyChartText}>
							Not enough data for trends
						</Text>
					</View>
				) : (
					<View style={styles.chartCard}>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View style={styles.trendsChart}>
								{monthlyTrends.slice(-6).map((month) => {
									const incomeHeight =
										maxTrend > 0 ? (month.income / maxTrend) * 100 : 0;
									const expenseHeight =
										maxTrend > 0 ? (month.expense / maxTrend) * 100 : 0;
									return (
										<View
											key={`${month.month}-${month.year}`}
											style={styles.trendColumn}
										>
											<View style={styles.trendBars}>
												<View
													style={[
														styles.trendBar,
														styles.incomeBar,
														{ height: Math.max(incomeHeight, 4) },
													]}
												/>
												<View
													style={[
														styles.trendBar,
														styles.expenseBar,
														{ height: Math.max(expenseHeight, 4) },
													]}
												/>
											</View>
											<Text style={styles.trendMonth}>{month.month}</Text>
										</View>
									);
								})}
							</View>
						</ScrollView>
					</View>
				)}
			</View>

			{/* Spending by Category */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Spending Breakdown</Text>
				{spendingByCategory.length === 0 ? (
					<View style={styles.emptyChart}>
						<Ionicons
							name="pie-chart-outline"
							size={40}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyChartText}>
							No expenses in this period
						</Text>
					</View>
				) : (
					<View style={styles.categoryCard}>
						{spendingByCategory.slice(0, 6).map((item, index) => {
							const catInfo =
								EXPENSE_CATEGORIES[item.category as ExpenseCategory];
							const percentage =
								summary.totalExpenses > 0
									? (item.amount / summary.totalExpenses) * 100
									: 0;
							return (
								<View key={item.category} style={styles.categoryItem}>
									<View style={styles.categoryLeft}>
										<View
											style={[
												styles.categoryIcon,
												{
													backgroundColor:
														(catInfo?.color || theme.primary) + "20",
												},
											]}
										>
											<Ionicons
												name={(catInfo?.icon || "ellipse") as any}
												size={16}
												color={catInfo?.color || theme.primary}
											/>
										</View>
										<View style={styles.categoryInfo}>
											<Text style={styles.categoryName}>
												{catInfo?.name || item.category}
											</Text>
											<Text style={styles.categoryPercent}>
												{percentage.toFixed(1)}%
											</Text>
										</View>
									</View>
									<Text style={styles.categoryAmount}>
										{currency}
										{formatAmount(item.amount)}
									</Text>
								</View>
							);
						})}
					</View>
				)}
			</View>

			{/* Income by Source */}
			{incomeByCategory.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Income Sources</Text>
					<View style={styles.categoryCard}>
						{incomeByCategory.slice(0, 5).map((item) => {
							const catInfo =
								INCOME_CATEGORIES[item.category as IncomeCategory];
							const totalIncome = incomeByCategory.reduce(
								(sum, i) => sum + i.amount,
								0
							);
							const percentage =
								totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0;
							return (
								<View key={item.category} style={styles.categoryItem}>
									<View style={styles.categoryLeft}>
										<View
											style={[
												styles.categoryIcon,
												{
													backgroundColor:
														(catInfo?.color || theme.success) + "20",
												},
											]}
										>
											<Ionicons
												name={(catInfo?.icon || "cash") as any}
												size={16}
												color={catInfo?.color || theme.success}
											/>
										</View>
										<View style={styles.categoryInfo}>
											<Text style={styles.categoryName}>
												{catInfo?.name || item.category}
											</Text>
											<Text style={styles.categoryPercent}>
												{percentage.toFixed(1)}%
											</Text>
										</View>
									</View>
									<Text
										style={[styles.categoryAmount, { color: theme.success }]}
									>
										{currency}
										{formatAmount(item.amount)}
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Account Distribution */}
			{accounts.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Accounts</Text>
					<View style={styles.accountsCard}>
						{accounts.map((account) => {
							const percentage =
								netWorth > 0 ? (account.balance / netWorth) * 100 : 0;
							return (
								<View key={account.id} style={styles.accountItem}>
									<View style={styles.accountLeft}>
										<View
											style={[
												styles.accountIcon,
												{ backgroundColor: account.color + "20" },
											]}
										>
											<Ionicons
												name={account.icon as any}
												size={18}
												color={account.color}
											/>
										</View>
										<View style={styles.accountInfo}>
											<Text style={styles.accountName}>{account.name}</Text>
											<View style={styles.accountBar}>
												<View
													style={[
														styles.accountBarFill,
														{
															width: `${Math.max(percentage, 2)}%`,
															backgroundColor: account.color,
														},
													]}
												/>
											</View>
										</View>
									</View>
									<Text
										style={[
											styles.accountBalance,
											{
												color: account.balance >= 0 ? theme.text : theme.error,
											},
										]}
									>
										{currency}
										{formatFullAmount(account.balance)}
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Tips Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Insights</Text>
				<View style={styles.tipsContainer}>
					{savingsRate >= 20 && (
						<View style={[styles.tipCard, { borderLeftColor: theme.success }]}>
							<Ionicons name="trophy" size={20} color={theme.success} />
							<View style={styles.tipContent}>
								<Text style={styles.tipTitle}>Great Savings!</Text>
								<Text style={styles.tipText}>
									You're saving {savingsRate.toFixed(0)}% of your income. Keep
									it up!
								</Text>
							</View>
						</View>
					)}

					{savingsRate < 0 && (
						<View style={[styles.tipCard, { borderLeftColor: theme.error }]}>
							<Ionicons name="alert-circle" size={20} color={theme.error} />
							<View style={styles.tipContent}>
								<Text style={styles.tipTitle}>Spending Alert</Text>
								<Text style={styles.tipText}>
									Your expenses exceed income by {currency}
									{formatAmount(Math.abs(summary.balance))}. Review your
									spending.
								</Text>
							</View>
						</View>
					)}

					{spendingByCategory.length > 0 && (
						<View style={[styles.tipCard, { borderLeftColor: theme.primary }]}>
							<Ionicons name="bulb" size={20} color={theme.primary} />
							<View style={styles.tipContent}>
								<Text style={styles.tipTitle}>Top Spending</Text>
								<Text style={styles.tipText}>
									{EXPENSE_CATEGORIES[
										spendingByCategory[0].category as ExpenseCategory
									]?.name || spendingByCategory[0].category}{" "}
									accounts for{" "}
									{formatPercent(
										spendingByCategory[0].amount,
										summary.totalExpenses
									)}{" "}
									of expenses.
								</Text>
							</View>
						</View>
					)}

					{summary.totalIncome === 0 && summary.totalExpenses === 0 && (
						<View style={[styles.tipCard, { borderLeftColor: theme.warning }]}>
							<Ionicons
								name="information-circle"
								size={20}
								color={theme.warning}
							/>
							<View style={styles.tipContent}>
								<Text style={styles.tipTitle}>Start Tracking</Text>
								<Text style={styles.tipText}>
									Add your first transaction to see insights and analytics.
								</Text>
							</View>
						</View>
					)}
				</View>
			</View>

			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		periodSection: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			zIndex: 100,
		},
		periodDropdown: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			backgroundColor: theme.surface,
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 12,
			gap: 8,
		},
		periodText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		dropdownMenu: {
			position: "absolute",
			top: 54,
			left: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 12,
			elevation: 8,
			zIndex: 1000,
		},
		dropdownItem: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 8,
		},
		dropdownItemActive: {
			backgroundColor: theme.primary + "20",
		},
		dropdownItemText: {
			fontSize: 14,
			color: theme.text,
		},
		dropdownItemTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},
		overviewCard: {
			marginHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 20,
		},
		overviewTop: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 20,
		},
		progressRingContainer: {
			position: "relative",
			justifyContent: "center",
			alignItems: "center",
		},
		progressTextContainer: {
			position: "absolute",
			justifyContent: "center",
			alignItems: "center",
		},
		progressPercent: {
			fontSize: 22,
			fontWeight: "700",
		},
		progressLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: -2,
		},
		overviewBalance: {
			flex: 1,
			alignItems: "flex-end",
			paddingRight: 8,
		},
		overviewBalanceLabel: {
			fontSize: 13,
			color: theme.textMuted,
			marginBottom: 4,
		},
		overviewBalanceValue: {
			fontSize: 24,
			fontWeight: "700",
		},
		overviewStats: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-around",
			paddingTop: 16,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		overviewStat: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		overviewStatText: {},
		overviewDivider: {
			width: 1,
			height: 40,
			backgroundColor: theme.border,
		},
		overviewValue: {
			fontSize: 16,
			fontWeight: "700",
		},
		overviewLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 1,
		},
		quickStatsRow: {
			flexDirection: "row",
			marginHorizontal: 16,
			marginTop: 12,
			gap: 10,
		},
		quickStat: {
			flex: 1,
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 12,
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		quickStatIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		quickStatContent: {
			flex: 1,
		},
		quickStatValue: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
		},
		quickStatLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		section: {
			paddingHorizontal: 16,
			marginTop: 24,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		legendRow: {
			flexDirection: "row",
			gap: 16,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		legendDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		legendText: {
			fontSize: 11,
			color: theme.textMuted,
		},
		emptyChart: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 40,
			alignItems: "center",
		},
		emptyChartText: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 8,
		},
		chartCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		trendsChart: {
			flexDirection: "row",
			alignItems: "flex-end",
			paddingVertical: 8,
			gap: 20,
			minWidth: "100%",
		},
		trendColumn: {
			alignItems: "center",
			width: 50,
		},
		trendBars: {
			flexDirection: "row",
			alignItems: "flex-end",
			gap: 4,
			height: 100,
		},
		trendBar: {
			width: 18,
			borderRadius: 4,
			minHeight: 4,
		},
		incomeBar: {
			backgroundColor: theme.success,
		},
		expenseBar: {
			backgroundColor: theme.error,
		},
		trendMonth: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 8,
		},
		categoryCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		categoryItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		categoryLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		categoryIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		categoryInfo: {
			marginLeft: 12,
		},
		categoryName: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		categoryPercent: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		categoryAmount: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		accountsCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		accountItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		accountLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		accountIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		accountInfo: {
			marginLeft: 12,
			flex: 1,
		},
		accountName: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
			marginBottom: 6,
		},
		accountBar: {
			height: 4,
			backgroundColor: theme.border,
			borderRadius: 2,
			overflow: "hidden",
		},
		accountBarFill: {
			height: "100%",
			borderRadius: 2,
		},
		accountBalance: {
			fontSize: 15,
			fontWeight: "600",
			marginLeft: 12,
		},
		tipsContainer: {
			gap: 10,
		},
		tipCard: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 12,
			padding: 14,
			backgroundColor: theme.surface,
			borderRadius: 14,
			borderLeftWidth: 3,
		},
		tipContent: {
			flex: 1,
		},
		tipTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		tipText: {
			fontSize: 13,
			color: theme.textSecondary,
			lineHeight: 18,
		},
	});
