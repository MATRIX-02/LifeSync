// Finance Analytics - where you stand right now (health score, this month's
// forecast, action plan, budgets, obligations) plus period charts.
// The calculations live in src/services/financeAnalytics.ts.

import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import {
	computeFinanceAnalytics,
	Recommendation,
} from "@/src/services/financeAnalytics";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
	Dimensions,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

interface FinanceAnalyticsProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
}

// Rolling windows ending now, so "Last 7 days" on a Monday still shows a
// full week instead of a one-day "this week".
type TimeRange = "24h" | "7d" | "30d" | "90d" | "1y" | "all" | "custom";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
	{ value: "24h", label: "Last 24 hours" },
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 3 months" },
	{ value: "1y", label: "Last 12 months" },
	{ value: "all", label: "All time" },
	{ value: "custom", label: "Custom range…" },
];

const RANGE_DAYS: Partial<Record<TimeRange, number>> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
	"1y": 365,
};

const HOUR_MS = 60 * 60 * 1000;

const startOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const endOfDay = (d: Date) => startOfDay(d) + 24 * HOUR_MS - 1;

/** Local timestamp of a transaction (date + optional HH:MM[:SS] time). */
const txTime = (t: { date: string; time?: string }) => {
	const [y, m, d] = t.date.split("-").map(Number);
	const [hh = 0, mm = 0, ss = 0] = (t.time || "").split(":").map(Number);
	return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0).getTime();
};

const shortDay = (d: Date) =>
	d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

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
		getNetWorth,
		budgets,
		billReminders,
		debts,
		savingsGoals,
		recurringTransactions,
	} = useFinanceStore();

	const styles = createStyles(theme);
	const categories = useFinanceCategories();

	const [timeRange, setTimeRange] = useState<TimeRange>("30d");
	const [customStart, setCustomStart] = useState(
		() => new Date(Date.now() - 29 * 24 * HOUR_MS),
	);
	const [customEnd, setCustomEnd] = useState(() => new Date());
	const [pickerFor, setPickerFor] = useState<"start" | "end" | null>(null);
	const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
	const [selectedAccountId, setSelectedAccountId] = useState("all");
	const [showAccountDropdown, setShowAccountDropdown] = useState(false);
	const [showAllCategories, setShowAllCategories] = useState(false);
	const [showAllRecs, setShowAllRecs] = useState(false);
	const [showHealthDetails, setShowHealthDetails] = useState(false);

	// [start, end] in local milliseconds.
	const period = useMemo(() => {
		const now = new Date();
		if (timeRange === "24h")
			return { start: now.getTime() - 24 * HOUR_MS, end: now.getTime() };
		if (timeRange === "all") return { start: 0, end: now.getTime() };
		if (timeRange === "custom") {
			const [a, b] =
				customStart <= customEnd
					? [customStart, customEnd]
					: [customEnd, customStart];
			return { start: startOfDay(a), end: endOfDay(b) };
		}
		const days = RANGE_DAYS[timeRange] ?? 30;
		return {
			start: startOfDay(now) - (days - 1) * 24 * HOUR_MS,
			end: now.getTime(),
		};
	}, [timeRange, customStart, customEnd]);

	const inAccount = (t: { accountId: string; toAccountId?: string }) =>
		selectedAccountId === "all" ||
		t.accountId === selectedAccountId ||
		t.toAccountId === selectedAccountId;

	const periodTransactions = useMemo(
		() =>
			transactions.filter((t) => {
				const ts = txTime(t);
				return ts >= period.start && ts <= period.end && inAccount(t);
			}),
		[period, selectedAccountId, transactions],
	);

	const summary = useMemo(() => {
		const totalIncome = periodTransactions
			.filter((t) => t.type === "income")
			.reduce((total, t) => total + t.amount, 0);
		const totalExpenses = periodTransactions
			.filter((t) => t.type === "expense")
			.reduce((total, t) => total + t.amount, 0);
		return {
			totalIncome,
			totalExpenses,
			balance: totalIncome - totalExpenses,
		};
	}, [periodTransactions]);

	const spendingByCategory = useMemo(() => {
		const categoryMap: Record<string, number> = {};
		periodTransactions
			.filter((t) => t.type === "expense")
			.forEach((t) => {
				categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
			});
		return Object.entries(categoryMap)
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount);
	}, [periodTransactions]);

	const incomeByCategory = useMemo(() => {
		const categoryMap: Record<string, number> = {};
		periodTransactions
			.filter((t) => t.type === "income")
			.forEach((t) => {
				categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
			});
		return Object.entries(categoryMap)
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount);
	}, [periodTransactions]);

	const monthlyTrends = useMemo(() => {
		const months = Array.from({ length: 12 }, (_, index) => {
			const date = new Date();
			date.setDate(1);
			date.setMonth(date.getMonth() - (11 - index));
			return {
				year: date.getFullYear(),
				monthIndex: date.getMonth(),
				month: date.toLocaleString("en-US", { month: "short" }),
				income: 0,
				expense: 0,
			};
		});
		const monthLookup = new Map(
			months.map((month) => [`${month.year}-${month.monthIndex + 1}`, month]),
		);
		transactions.forEach((transaction) => {
			if (
				selectedAccountId !== "all" &&
				transaction.accountId !== selectedAccountId &&
				transaction.toAccountId !== selectedAccountId
			) {
				return;
			}
			if (transaction.type !== "income" && transaction.type !== "expense") {
				return;
			}
			const [year, month] = transaction.date.split("-").map(Number);
			const bucket = monthLookup.get(`${year}-${month}`);
			if (bucket) {
				if (transaction.type === "income") bucket.income += transaction.amount;
				else bucket.expense += transaction.amount;
			}
		});
		return months;
	}, [selectedAccountId, transactions]);

	const selectedAccount = accounts.find(
		(account) => account.id === selectedAccountId,
	);
	const visibleAccounts = selectedAccount ? [selectedAccount] : accounts;
	const netWorth = selectedAccount?.balance ?? getNetWorth();

	const formatAmount = (value: number | undefined | null) => {
		const num = value ?? 0;
		return num.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	};

	const formatFullAmount = (value: number | undefined | null) => {
		const num = value ?? 0;
		return num.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	};

	// Calculate key metrics
	const savingsRate =
		summary.totalIncome > 0
			? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) *
				100
			: 0;

	// "Current position" analytics: always across all accounts and based on
	// this month + trailing averages, independent of the period filter.
	const insights = useMemo(
		() =>
			computeFinanceAnalytics(
				{
					transactions,
					accounts,
					budgets,
					billReminders,
					debts,
					savingsGoals,
					recurringTransactions,
				},
				(n) => `${n < 0 ? "-" : ""}${currency}${formatAmount(Math.round(Math.abs(n)))}`,
				(key) => categories.getInfo("expense", key).name,
			),
		[
			transactions,
			accounts,
			budgets,
			billReminders,
			debts,
			savingsGoals,
			recurringTransactions,
			currency,
			categories,
		],
	);
	const { forecast, snapshot, obligations, health, baseline } = insights;
	const money = (n: number) =>
		`${n < 0 ? "-" : ""}${currency}${formatAmount(Math.round(Math.abs(n)))}`;

	const healthColor = (score: number) =>
		score >= 75
			? theme.success
			: score >= 50
				? "#22D3EE"
				: score >= 30
					? theme.warning
					: theme.error;
	const healthLabel = (score: number) =>
		score >= 75
			? "Doing great"
			: score >= 50
				? "Doing okay"
				: score >= 30
					? "Needs attention"
					: "Needs work urgently";
	const severityColor = (sev: Recommendation["severity"]) =>
		sev === "high"
			? theme.error
			: sev === "medium"
				? theme.warning
				: sev === "good"
					? theme.success
					: theme.primary;
	const visibleRecs = showAllRecs
		? insights.recommendations
		: insights.recommendations.slice(0, 4);

	// The same length of time immediately before the selected period.
	const comparison = useMemo(() => {
		if (timeRange === "all") return null;
		const length = period.end - period.start;
		const prevStart = period.start - length;
		const previousTransactions = transactions.filter((t) => {
			const ts = txTime(t);
			return ts >= prevStart && ts < period.start && inAccount(t);
		});
		return {
			income: previousTransactions
				.filter((t) => t.type === "income")
				.reduce((total, t) => total + t.amount, 0),
			expenses: previousTransactions
				.filter((t) => t.type === "expense")
				.reduce((total, t) => total + t.amount, 0),
		};
	}, [period, selectedAccountId, timeRange, transactions]);

	const getPercentageChange = (current: number, previous: number) => {
		if (previous === 0) return current === 0 ? 0 : null;
		return ((current - previous) / previous) * 100;
	};
	const formatChange = (change: number | null) =>
		change === null ? "New" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
	const changeColor = (change: number | null, lowerIsBetter = false) =>
		change === null
			? theme.primary
			: (lowerIsBetter ? change <= 0 : change >= 0)
				? theme.success
				: theme.error;

	// Calculate max values for chart scaling
	const hasTrendData = monthlyTrends.some(
		(month) => month.income > 0 || month.expense > 0,
	);
	const maxSpending = Math.max(...spendingByCategory.map((s) => s.amount), 1);
	const maxTrend = Math.max(
		...monthlyTrends.map((t) => Math.max(t.income, t.expense)),
		1,
	);

	const compact = (n: number) =>
		n >= 10000000
			? `${(n / 10000000).toFixed(1)}Cr`
			: n >= 100000
				? `${(n / 100000).toFixed(1)}L`
				: n >= 1000
					? `${(n / 1000).toFixed(1)}k`
					: `${Math.round(n)}`;

	const getPeriodLabel = () =>
		timeRange === "custom"
			? `${shortDay(new Date(period.start))} – ${shortDay(new Date(period.end))}`
			: RANGE_OPTIONS.find((o) => o.value === timeRange)!.label;

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
				<View style={styles.filterControls}>
					<TouchableOpacity
						style={styles.periodDropdown}
						onPress={() => {
							setShowPeriodDropdown(!showPeriodDropdown);
							setShowAccountDropdown(false);
						}}
					>
						<Text style={styles.periodText}>{getPeriodLabel()}</Text>
						<Ionicons name="chevron-down" size={18} color={theme.text} />
					</TouchableOpacity>
					<View style={styles.accountFilterWrap}>
						<TouchableOpacity
							style={styles.accountFilterButton}
							onPress={() => {
								setShowAccountDropdown(!showAccountDropdown);
								setShowPeriodDropdown(false);
							}}
						>
							<Ionicons name="filter-outline" size={16} color={theme.text} />
							<Text
								style={[styles.periodText, styles.accountFilterLabel]}
								numberOfLines={1}
							>
								{selectedAccount?.name ?? "All accounts"}
							</Text>
							<Ionicons name="chevron-down" size={18} color={theme.text} />
						</TouchableOpacity>
						{showAccountDropdown && (
							<View style={styles.accountDropdownMenu}>
								{[
									{ id: "all", name: "All accounts" },
									...accounts.map((account) => ({
										id: account.id,
										name: account.name,
									})),
								].map((account) => (
									<TouchableOpacity
										key={account.id}
										style={[
											styles.dropdownItem,
											selectedAccountId === account.id &&
												styles.dropdownItemActive,
										]}
										onPress={() => {
											setSelectedAccountId(account.id);
											setShowAccountDropdown(false);
										}}
									>
										<Text
											style={[
												styles.dropdownItemText,
												selectedAccountId === account.id &&
													styles.dropdownItemTextActive,
											]}
										>
											{account.name}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						)}
					</View>
				</View>

				{showPeriodDropdown && (
					<View style={styles.dropdownMenu}>
						{RANGE_OPTIONS.map((option) => (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.dropdownItem,
									timeRange === option.value && styles.dropdownItemActive,
								]}
								onPress={() => {
									setTimeRange(option.value);
									setShowPeriodDropdown(false);
								}}
							>
								<Text
									style={[
										styles.dropdownItemText,
										timeRange === option.value &&
											styles.dropdownItemTextActive,
									]}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				)}

				{timeRange === "custom" && (
					<View style={styles.customRangeRow}>
						{(
							[
								["start", "From", customStart],
								["end", "To", customEnd],
							] as const
						).map(([key, label, value]) => (
							<TouchableOpacity
								key={key}
								style={styles.customRangeButton}
								onPress={() => setPickerFor(key)}
							>
								<Text style={styles.customRangeLabel}>{label}</Text>
								<View style={styles.customRangeValueRow}>
									<Ionicons name="calendar" size={16} color={theme.primary} />
									<Text style={styles.customRangeValue}>
										{value.toLocaleDateString(undefined, {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</Text>
								</View>
							</TouchableOpacity>
						))}
					</View>
				)}
				{pickerFor && (
					<DateTimePicker
						value={pickerFor === "start" ? customStart : customEnd}
						mode="date"
						maximumDate={new Date()}
						minimumDate={pickerFor === "end" ? customStart : undefined}
						display={Platform.OS === "ios" ? "inline" : "default"}
						onChange={(event, date) => {
							const which = pickerFor;
							if (Platform.OS !== "ios") setPickerFor(null);
							if (event.type === "dismissed" || !date) return;
							if (which === "start") {
								setCustomStart(date);
								if (date > customEnd) setCustomEnd(date);
							} else setCustomEnd(date);
							if (Platform.OS === "ios") setPickerFor(null);
						}}
					/>
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
						<Text style={styles.overviewBalanceLabel}>Earned − Spent</Text>
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
						<Ionicons name="shield-checkmark" size={18} color={theme.warning} />
					</View>
					<View style={styles.quickStatContent}>
						<Text style={styles.quickStatValue}>
							{snapshot.emergencyMonths === null
								? "—"
								: `${snapshot.emergencyMonths.toFixed(1)} mo`}
						</Text>
						<Text style={styles.quickStatLabel}>Backup lasts</Text>
					</View>
				</View>
				<View style={styles.quickStat}>
					<View
						style={[
							styles.quickStatIcon,
							{ backgroundColor: theme.primary + "20" },
						]}
					>
						<Ionicons name="lock-closed" size={18} color={theme.primary} />
					</View>
					<View style={styles.quickStatContent}>
						<Text style={styles.quickStatValue}>
							{money(obligations.fixedMonthly)}
						</Text>
						<Text style={styles.quickStatLabel}>Bills / month</Text>
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
						<Text style={styles.quickStatLabel}>Total balance</Text>
					</View>
				</View>
			</View>

			{/* ===== Current position (all accounts) ===== */}

			{/* Financial Health */}
			{health.score !== null && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Money Health Score</Text>
						<Text style={styles.sectionHint}>All accounts</Text>
					</View>
					<TouchableOpacity
						activeOpacity={0.8}
						style={styles.chartCard}
						onPress={() => setShowHealthDetails(!showHealthDetails)}
					>
						<View style={styles.healthTop}>
							<View style={styles.progressRingContainer}>
								<ProgressRing
									progress={health.score}
									size={84}
									strokeWidth={9}
									color={healthColor(health.score)}
									backgroundColor={theme.surfaceLight}
								/>
								<View style={styles.progressTextContainer}>
									<Text
										style={[
											styles.healthScore,
											{ color: healthColor(health.score) },
										]}
									>
										{health.score}
									</Text>
								</View>
							</View>
							<View style={styles.healthSummary}>
								<Text
									style={[
										styles.healthLabel,
										{ color: healthColor(health.score) },
									]}
								>
									{healthLabel(health.score)}
								</Text>
								<Text style={styles.healthSub}>
									{baseline.monthsUsed > 0
										? `A score out of 100 from your last ${baseline.monthsUsed} month${baseline.monthsUsed > 1 ? "s" : ""} of spending, your balances and what you owe`
										: "A score out of 100. It gets more accurate as you add more months of data"}
								</Text>
								<Text style={styles.healthToggle}>
									{showHealthDetails ? "Hide details" : "What's this based on?"}
								</Text>
							</View>
						</View>
						{showHealthDetails &&
							health.factors.map((f) => (
								<View key={f.key} style={styles.factorRow}>
									<View style={styles.factorHeader}>
										<Text style={styles.factorLabel}>{f.label}</Text>
										<Text
											style={[
												styles.factorScore,
												{ color: healthColor(f.score) },
											]}
										>
											{Math.round(f.score)}
										</Text>
									</View>
									<View style={styles.factorBar}>
										<View
											style={[
												styles.factorFill,
												{
													width: `${Math.max(f.score, 3)}%`,
													backgroundColor: healthColor(f.score),
												},
											]}
										/>
									</View>
									<Text style={styles.factorDetail}>{f.detail}</Text>
									<Text style={styles.factorHint}>{f.hint}</Text>
								</View>
							))}
					</TouchableOpacity>
				</View>
			)}

			{/* This month */}
			{forecast.expectedIncome > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>This Month</Text>
						<Text style={styles.sectionHint}>
							Day {forecast.dayOfMonth} of {forecast.daysInMonth}
						</Text>
					</View>
					<View style={styles.chartCard}>
						<Text style={styles.forecastLabel}>
							You can still spend this month
						</Text>
						<Text
							style={[
								styles.forecastValue,
								{
									color:
										forecast.safeToSpend >= 0 ? theme.success : theme.error,
								},
							]}
						>
							{money(forecast.safeToSpend)}
						</Text>
						<Text style={styles.forecastSub}>
							{forecast.safeToSpend >= 0
								? `That's about ${money(forecast.safePerDay)} a day for the ${forecast.daysLeft} day${forecast.daysLeft > 1 ? "s" : ""} left, after bills and savings goals`
								: "Your bills and savings goals are more than you'll earn this month"}
						</Text>

						{/* Spending pace vs. month elapsed */}
						{forecast.expectedIncome > 0 && (
							<View style={styles.paceWrap}>
								<View style={styles.factorBar}>
									<View
										style={[
											styles.factorFill,
											{
												width: `${Math.min(100, (forecast.mtdExpense / forecast.expectedIncome) * 100)}%`,
												backgroundColor:
													forecast.mtdExpense / forecast.expectedIncome >
													forecast.dayOfMonth / forecast.daysInMonth
														? theme.warning
														: theme.primary,
											},
										]}
									/>
									<View
										style={[
											styles.paceMarker,
											{
												left: `${(forecast.dayOfMonth / forecast.daysInMonth) * 100}%`,
											},
										]}
									/>
								</View>
								<Text style={styles.factorDetail}>
									{Math.round(
										(forecast.mtdExpense / forecast.expectedIncome) * 100,
									)}
									% of this month's income spent, and{" "}
									{Math.round(
										(forecast.dayOfMonth / forecast.daysInMonth) * 100,
									)}
									% of the month has passed
								</Text>
							</View>
						)}

						{(
							[
								["Income this month", forecast.expectedIncome, theme.success],
								["Spent so far", -forecast.mtdExpense, theme.text],
								[
									`Bills still to pay (${forecast.upcomingBillCount})`,
									-forecast.upcomingBills,
									theme.text,
								],
								["For savings goals", -forecast.goalNeedsThisMonth, theme.text],
							] as [string, number, string][]
						)
							.filter(([, v], i) => i < 2 || v !== 0)
							.map(([label, value, color]) => (
								<View key={label} style={styles.forecastRow}>
									<Text style={styles.forecastRowLabel}>{label}</Text>
									<Text style={[styles.forecastRowValue, { color }]}>
										{value < 0 ? "−" : ""}
										{money(Math.abs(value))}
									</Text>
								</View>
							))}
						<View style={styles.forecastDivider} />
						<View style={styles.forecastRow}>
							<Text style={styles.forecastRowLabel}>
								Likely total spending this month
							</Text>
							<Text style={styles.forecastRowValue}>
								{money(forecast.projectedExpense)}
							</Text>
						</View>
						{baseline.avgExpense > 0 && (
							<View style={styles.forecastRow}>
								<Text style={styles.forecastRowLabel}>
									What you normally spend
								</Text>
								<Text style={styles.forecastRowValue}>
									{money(baseline.avgExpense)}
								</Text>
							</View>
						)}
						{forecast.expectedIncome > 0 && (
							<View style={styles.forecastRow}>
								<Text style={styles.forecastRowLabel}>
									Likely left over at month-end
								</Text>
								<Text
									style={[
										styles.forecastRowValue,
										{
											color:
												forecast.projectedSavings >= 0
													? theme.success
													: theme.error,
										},
									]}
								>
									{money(forecast.projectedSavings)}
								</Text>
							</View>
						)}
					</View>
				</View>
			)}

			{/* Action plan */}
			{insights.recommendations.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>What You Should Do</Text>
						{insights.recommendations.length > 4 && (
							<TouchableOpacity
								style={styles.categoryToggle}
								onPress={() => setShowAllRecs(!showAllRecs)}
							>
								<Text style={styles.categoryToggleText}>
									{showAllRecs
										? "Show less"
										: `All ${insights.recommendations.length}`}
								</Text>
							</TouchableOpacity>
						)}
					</View>
					<View style={styles.tipsContainer}>
						{visibleRecs.map((r) => (
							<View
								key={r.id}
								style={[
									styles.tipCard,
									{ borderLeftColor: severityColor(r.severity) },
								]}
							>
								<Ionicons
									name={r.icon as any}
									size={20}
									color={severityColor(r.severity)}
								/>
								<View style={styles.tipContent}>
									<Text style={styles.tipTitle}>{r.title}</Text>
									<Text style={styles.tipText}>{r.body}</Text>
								</View>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Budget forecast */}
			{insights.budgets.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Your Budgets</Text>
						<Text style={styles.sectionHint}>Faded bar = expected by month-end</Text>
					</View>
					<View style={styles.categoryCard}>
						{insights.budgets.map((b) => {
							const info = categories.getInfo("expense", b.budget.category);
							const color =
								b.status === "over"
									? theme.error
									: b.status === "at_risk"
										? theme.warning
										: theme.success;
							const spentPct = Math.min(100, b.percentUsed);
							const projPct = Math.min(
								100,
								(b.projected / b.budget.amount) * 100,
							);
							return (
								<View key={b.budget.id} style={styles.budgetRow}>
									<View style={styles.factorHeader}>
										<View style={styles.categoryLeft}>
											<View
												style={[
													styles.categoryIcon,
													{ backgroundColor: info.color + "20" },
												]}
											>
												<Ionicons
													name={info.icon as any}
													size={16}
													color={info.color}
												/>
											</View>
											<Text style={styles.categoryName}>{info.name}</Text>
										</View>
										<Text style={styles.categoryAmount}>
											{money(b.spent)}
											<Text style={styles.factorDetail}>
												{" "}
												/ {money(b.budget.amount)}
											</Text>
										</Text>
									</View>
									<View style={styles.factorBar}>
										<View
											style={[
												styles.factorFill,
												styles.projectedFill,
												{ width: `${projPct}%`, backgroundColor: color },
											]}
										/>
										<View
											style={[
												styles.factorFill,
												{
													position: "absolute",
													width: `${spentPct}%`,
													backgroundColor: color,
												},
											]}
										/>
									</View>
									<Text style={[styles.factorDetail, { color }]}>
										{b.status === "over"
											? `Over the limit by ${money(b.spent - b.budget.amount)}`
											: b.status === "at_risk"
												? `May reach ${money(b.projected)} — spend under ${money(b.dailyAllowance)} a day`
												: `Fine — you can spend ${money(b.dailyAllowance)} a day here`}
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* What changed */}
			{insights.movers.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Spending Changes</Text>
						<Text style={styles.sectionHint}>Last 30 days vs. a normal month</Text>
					</View>
					<View style={styles.categoryCard}>
						{insights.movers.map((m) => {
							const info = categories.getInfo("expense", m.category);
							const up = m.recent > m.average;
							return (
								<View key={m.category} style={styles.categoryItem}>
									<View style={styles.categoryLeft}>
										<View
											style={[
												styles.categoryIcon,
												{ backgroundColor: info.color + "20" },
											]}
										>
											<Ionicons
												name={info.icon as any}
												size={16}
												color={info.color}
											/>
										</View>
										<View style={styles.categoryInfo}>
											<Text style={styles.categoryName}>{info.name}</Text>
											<Text style={styles.categoryPercent}>
												{money(m.recent)} now, normally {money(m.average)}
											</Text>
										</View>
									</View>
									<Text
										style={[
											styles.categoryAmount,
											{ color: up ? theme.error : theme.success },
										]}
									>
										{up ? "▲" : "▼"}{" "}
										{m.average > 0
											? `${Math.abs(Math.round(m.change * 100))}%`
											: "new"}
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Commitments */}
			{(obligations.fixedMonthly > 0 ||
				obligations.oweTotal > 0 ||
				obligations.lentTotal > 0 ||
				obligations.creditUtilization !== null ||
				snapshot.goalsTarget > 0) && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>What You Owe & Own</Text>
					<View style={styles.chartCard}>
						{(
							[
								obligations.fixedMonthly > 0 && [
									"Regular bills each month",
									money(obligations.fixedMonthly) +
										(obligations.fixedShare !== null
											? ` (${Math.round(obligations.fixedShare * 100)}% of spending)`
											: ""),
								],
								obligations.goalsMonthlyNeeded > 0 && [
									"Save monthly for goals",
									money(obligations.goalsMonthlyNeeded),
								],
								snapshot.goalsTarget > 0 && [
									"Saved toward goals",
									`${money(snapshot.goalsSaved)} of ${money(snapshot.goalsTarget)}`,
								],
								obligations.oweTotal > 0 && [
									"You owe",
									money(obligations.oweTotal),
								],
								obligations.lentTotal > 0 && [
									"Others owe you",
									money(obligations.lentTotal),
								],
								obligations.creditUtilization !== null && [
									"Credit card used",
									`${money(obligations.creditUsed)} of ${money(obligations.creditLimit)} limit`,
								],
								snapshot.liquid > 0 && [
									"Cash & bank balance",
									money(snapshot.liquid),
								],
							].filter(Boolean) as [string, string][]
						).map(([label, value]) => (
							<View key={label} style={styles.forecastRow}>
								<Text style={styles.forecastRowLabel}>{label}</Text>
								<Text style={styles.forecastRowValue}>{value}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{/* ===== Selected period ===== */}

			{comparison && (
				<View style={styles.comparisonCard}>
					<View style={styles.comparisonHeader}>
						<View>
							<Text style={styles.comparisonTitle}>Compared to before</Text>
							<Text style={styles.comparisonSubtitle}>
								Same length of time just before this one
							</Text>
						</View>
						<Ionicons
							name="git-compare-outline"
							size={20}
							color={theme.primary}
						/>
					</View>
					<View style={styles.comparisonMetrics}>
						{(
							[
								{
									label: "Income",
									current: summary.totalIncome,
									previous: comparison.income,
									lowerIsBetter: false,
								},
								{
									label: "Expenses",
									current: summary.totalExpenses,
									previous: comparison.expenses,
									lowerIsBetter: true,
								},
							] as const
						).map((metric) => {
							const change = getPercentageChange(
								metric.current,
								metric.previous,
							);
							return (
								<View key={metric.label} style={styles.comparisonMetric}>
									<Text style={styles.comparisonLabel}>{metric.label}</Text>
									<Text style={styles.comparisonAmount}>
										{currency}
										{formatAmount(metric.current)}
									</Text>
									<Text
										style={[
											styles.comparisonChange,
											{ color: changeColor(change, metric.lowerIsBetter) },
										]}
									>
										{formatChange(change)}
										<Text style={styles.comparisonPrevious}>
											{` vs ${currency}${formatAmount(metric.previous)}`}
										</Text>
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Monthly Trends - Bar Chart */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Month by Month</Text>
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

				{!hasTrendData ? (
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
											<Text
												style={[
													styles.trendNet,
													{
														color:
															month.income - month.expense >= 0
																? theme.success
																: theme.error,
													},
												]}
											>
												{month.income - month.expense >= 0 ? "+" : "−"}
												{compact(Math.abs(month.income - month.expense))}
											</Text>
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
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, styles.categoryHeading]}>
						Where Your Money Went
					</Text>
					{spendingByCategory.length > 6 && (
						<TouchableOpacity
							style={styles.categoryToggle}
							onPress={() => setShowAllCategories(!showAllCategories)}
						>
							<Text style={styles.categoryToggleText}>
								{showAllCategories ? "Top 6" : "Show all"}
							</Text>
						</TouchableOpacity>
					)}
				</View>
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
						{(showAllCategories
							? spendingByCategory
							: spendingByCategory.slice(0, 6)
						).map((item) => {
							const catInfo = categories.getInfo("expense", item.category);
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
												{timeRange === "30d" &&
													baseline.avgByCategory[item.category] > 0 &&
													` · normally ${money(baseline.avgByCategory[item.category])}`}
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
					<Text style={styles.sectionTitle}>Where Your Money Came From</Text>
					<View style={styles.categoryCard}>
						{incomeByCategory.slice(0, 5).map((item) => {
							const catInfo = categories.getInfo("income", item.category);
							const totalIncome = incomeByCategory.reduce(
								(sum, i) => sum + i.amount,
								0,
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
						{visibleAccounts.map((account) => {
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

			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		customRangeRow: {
			flexDirection: "row",
			gap: 8,
			marginTop: 10,
		},
		customRangeButton: {
			flex: 1,
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			paddingHorizontal: 12,
			paddingVertical: 8,
		},
		customRangeLabel: {
			fontSize: 11,
			color: theme.textMuted,
		},
		customRangeValueRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginTop: 2,
		},
		customRangeValue: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		sectionHint: {
			fontSize: 12,
			color: theme.textMuted,
		},
		healthTop: {
			flexDirection: "row",
			alignItems: "center",
			gap: 16,
		},
		healthScore: {
			fontSize: 26,
			fontWeight: "800",
		},
		healthSummary: {
			flex: 1,
		},
		healthLabel: {
			fontSize: 18,
			fontWeight: "700",
		},
		healthSub: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		healthToggle: {
			fontSize: 12,
			color: theme.primary,
			fontWeight: "600",
			marginTop: 8,
		},
		factorRow: {
			marginTop: 14,
		},
		factorHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 6,
		},
		factorLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		factorScore: {
			fontSize: 13,
			fontWeight: "700",
		},
		factorBar: {
			height: 6,
			borderRadius: 3,
			backgroundColor: theme.surfaceLight,
			overflow: "hidden",
		},
		factorFill: {
			height: 6,
			borderRadius: 3,
		},
		projectedFill: {
			opacity: 0.3,
		},
		factorHint: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
			fontStyle: "italic",
		},
		factorDetail: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		forecastLabel: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		forecastValue: {
			fontSize: 30,
			fontWeight: "800",
			marginTop: 2,
		},
		forecastSub: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		paceWrap: {
			marginTop: 14,
			marginBottom: 6,
		},
		paceMarker: {
			position: "absolute",
			top: 0,
			bottom: 0,
			width: 2,
			backgroundColor: theme.text,
		},
		forecastRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 6,
			gap: 12,
		},
		forecastRowLabel: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		forecastRowValue: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			flexShrink: 1,
			textAlign: "right",
		},
		forecastDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 6,
		},
		budgetRow: {
			paddingVertical: 10,
		},
		trendNet: {
			fontSize: 10,
			fontWeight: "600",
			marginTop: 2,
		},
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		periodSection: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			zIndex: 100,
		},
		filterControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
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
		accountFilterWrap: {
			flex: 1,
			position: "relative",
			zIndex: 2,
		},
		accountFilterButton: {
			minWidth: 0,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			paddingVertical: 10,
			paddingHorizontal: 12,
			borderRadius: 12,
			gap: 7,
		},
		accountFilterLabel: {
			flex: 1,
		},
		accountDropdownMenu: {
			position: "absolute",
			top: 46,
			right: 0,
			minWidth: 180,
			maxWidth: 260,
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
		comparisonCard: {
			marginHorizontal: 16,
			marginTop: 12,
			padding: 16,
			backgroundColor: theme.surface,
			borderRadius: 16,
		},
		comparisonHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		comparisonTitle: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},
		comparisonSubtitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 3,
		},
		comparisonMetrics: {
			flexDirection: "row",
			gap: 12,
		},
		comparisonMetric: {
			flex: 1,
			minWidth: 0,
			padding: 12,
			backgroundColor: theme.background,
			borderRadius: 12,
		},
		comparisonLabel: {
			fontSize: 12,
			color: theme.textMuted,
		},
		comparisonAmount: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
			marginTop: 5,
		},
		comparisonChange: {
			fontSize: 12,
			fontWeight: "700",
			marginTop: 5,
		},
		comparisonPrevious: {
			fontWeight: "400",
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
		categoryHeading: {
			marginBottom: 0,
		},
		categoryToggle: {
			paddingHorizontal: 8,
			paddingVertical: 5,
			marginBottom: 8,
		},
		categoryToggleText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
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
