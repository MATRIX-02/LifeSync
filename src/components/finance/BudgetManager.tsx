// Budget Manager - Create and manage budgets with progress tracking
import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import {
	BillReminder as DBBillReminder,
	Debt as DBDebt,
	SavingsGoal as DBSavingsGoal,
} from "@/src/context/financeStoreDB/types";
import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { NotificationService } from "@/src/services/notificationService";
import { COLORS } from "@/src/types/finance";
import {
	getGoalPlan,
	GoalPace,
	GoalPlan,
	monthsUntil,
	PACE_LABEL,
	WEEKS_PER_MONTH,
} from "@/src/utils/savingsGoalPlan";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { createStyles } from "./BudgetManager.styles";

interface BudgetManagerProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentBudgetCount?: number;
	currentGoalCount?: number;
}

type BudgetTab = "budgets" | "savings" | "bills" | "debts";

export default function BudgetManager({
	theme,
	currency,
	onOpenDrawer,
	subscriptionCheck,
	currentBudgetCount = 0,
	currentGoalCount = 0,
}: BudgetManagerProps) {
	const {
		budgets,
		savingsGoals,
		billReminders,
		debts,
		accounts,
		addBudget,
		updateBudget,
		deleteBudget,
		addSavingsGoal,
		updateSavingsGoal,
		deleteSavingsGoal,
		contributeToGoal,
		withdrawFromGoal,
		addBillReminder,
		updateBillReminder,
		markBillPaid,
		deleteBillReminder,
		addDebt,
		updateDebt,
		recordDebtPayment,
		deleteDebt,
		getSpendingByCategory,
		transactions,
	} = useFinanceStore();

	const styles = createStyles(theme);
	const financeCategories = useFinanceCategories();

	const [activeTab, setActiveTab] = useState<BudgetTab>("budgets");
	const [showAddBudget, setShowAddBudget] = useState(false);
	const [showAddSavings, setShowAddSavings] = useState(false);
	const [showAddBill, setShowAddBill] = useState(false);
	const [showAddDebt, setShowAddDebt] = useState(false);
	const [showContribute, setShowContribute] = useState<DBSavingsGoal | null>(
		null
	);
	const [showWithdraw, setShowWithdraw] = useState<DBSavingsGoal | null>(null);
	const [showPayDebt, setShowPayDebt] = useState<DBDebt | null>(null);
	const [showEditBill, setShowEditBill] = useState<DBBillReminder | null>(null);
	const [showPayBill, setShowPayBill] = useState<DBBillReminder | null>(null);
	const [showDebtDetails, setShowDebtDetails] = useState<DBDebt | null>(null);
	const [showSavingsDetails, setShowSavingsDetails] =
		useState<DBSavingsGoal | null>(null);
	// Add modals double as edit modals when these hold an id.
	const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
	const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

	// Account selection
	const [selectedAccountId, setSelectedAccountId] = useState<string>("");

	// Date picker states
	const [showBillDatePicker, setShowBillDatePicker] = useState(false);
	const [showDebtDatePicker, setShowDebtDatePicker] = useState(false);
	const [showSavingsDatePicker, setShowSavingsDatePicker] = useState(false);
	const [billDate, setBillDate] = useState(new Date());
	const [debtDate, setDebtDate] = useState(new Date());
	const [savingsDate, setSavingsDate] = useState(new Date());

	// Form states
	const [budgetForm, setBudgetForm] = useState({
		category: "",
		amount: "",
	});
	const emptySavingsForm = {
		name: "",
		targetAmount: "",
		deadline: "",
		icon: "wallet" as string,
		category: "",
		priority: "medium" as DBSavingsGoal["priority"],
	};
	const [savingsForm, setSavingsForm] = useState(emptySavingsForm);
	// "bills" unless the user has hidden it.
	const defaultBillCategory = () =>
		financeCategories.expenseOptions.some((c) => c.key === "bills")
			? "bills"
			: (financeCategories.expenseOptions[0]?.key ?? "other");
	const emptyBillForm = () => ({
		name: "",
		amount: "",
		dueDate: "",
		frequency: "once" as DBBillReminder["frequency"],
		isAutoDeduct: false,
		notes: "",
		category: defaultBillCategory(),
	});
	const [billForm, setBillForm] = useState(emptyBillForm);
	const [debtForm, setDebtForm] = useState({
		name: "",
		totalAmount: "",
		interestRate: "",
		minimumPayment: "",
		dueDate: "",
		type: "owe" as "owe" | "lent",
	});
	const [contributionAmount, setContributionAmount] = useState("");
	const [withdrawalAmount, setWithdrawalAmount] = useState("");
	const [debtPaymentAmount, setDebtPaymentAmount] = useState("");
	const [paymentNote, setPaymentNote] = useState("");

	// Bill templates for quick selection with category colors
	const billTemplates = [
		{
			name: "Mobile",
			fullName: "Mobile Recharge",
			icon: "phone-portrait",
			color: "#10B981",
			bgColor: "#D1FAE5",
		},
		{
			name: "Spotify",
			fullName: "Spotify Premium",
			icon: "musical-notes",
			color: "#1DB954",
			bgColor: "#D1FAE5",
		},
		{
			name: "YouTube",
			fullName: "YouTube Premium",
			icon: "logo-youtube",
			color: "#FF0000",
			bgColor: "#FFE5E5",
		},
		{
			name: "Netflix",
			fullName: "Netflix Subscription",
			icon: "film",
			color: "#E50914",
			bgColor: "#FFE5E7",
		},
		{
			name: "WiFi",
			fullName: "WiFi/Broadband",
			icon: "wifi",
			color: "#3B82F6",
			bgColor: "#DBEAFE",
		},
		{
			name: "SIP",
			fullName: "SIP Investment",
			icon: "trending-up",
			color: "#8B5CF6",
			bgColor: "#EDE9FE",
		},
		{
			name: "Electricity",
			fullName: "Electricity Bill",
			icon: "flash",
			color: "#F59E0B",
			bgColor: "#FEF3C7",
		},
		{
			name: "Rent",
			fullName: "Monthly Rent",
			icon: "home",
			color: "#EC4899",
			bgColor: "#FCE7F3",
		},
		{
			name: "Insurance",
			fullName: "Insurance Premium",
			icon: "shield-checkmark",
			color: "#06B6D4",
			bgColor: "#CFFAFE",
		},
		{
			name: "DTH",
			fullName: "DTH Recharge",
			icon: "tv",
			color: "#6366F1",
			bgColor: "#E0E7FF",
		},
	];

	const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

	// Calculate budget spending
	const budgetData = useMemo(() => {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
			.toISOString()
			.split("T")[0];
		const spending = getSpendingByCategory(startOfMonth);

		return budgets.map((budget) => {
			const spent =
				spending.find((s) => s.category === budget.category)?.amount || 0;
			const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
			return { ...budget, spent, percentage };
		});
	}, [budgets, transactions, getSpendingByCategory]);

	const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
	const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
	const remainingBudget = totalBudget - totalSpent;

	// Upcoming bills
	const upcomingBills = useMemo(() => {
		const today = new Date().toISOString().split("T")[0];
		return billReminders
			.filter((b) => !b.isPaid && b.dueDate >= today)
			.sort(
				(a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
			);
	}, [billReminders]);

	const formatAmount = (value: number | undefined | null) => {
		const num = value ?? 0;
		return num.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	};

	const closeBudgetModal = () => {
		setBudgetForm({ category: "", amount: "" });
		setEditingBudgetId(null);
		setShowAddBudget(false);
	};

	const openEditBudget = (budget: { id: string; category: string; amount: number }) => {
		setBudgetForm({ category: budget.category, amount: String(budget.amount) });
		setEditingBudgetId(budget.id);
		setShowAddBudget(true);
	};

	const paceColor = (pace: GoalPace) =>
		pace === "behind"
			? theme.error
			: pace === "ahead"
				? theme.success
				: theme.primary;

	const shortDate = (d: Date) =>
		d.toLocaleDateString(undefined, { month: "short", year: "numeric" });

	const planHeadline = (plan: GoalPlan) => {
		if (plan.overdue)
			return `Deadline passed · ${currency}${formatAmount(plan.remaining)} to go`;
		if (plan.monthlyNeeded !== null)
			return `Save ${currency}${formatAmount(Math.ceil(plan.monthlyNeeded))}/month to hit your deadline`;
		if (plan.projectedDate)
			return `At your pace: done by ${shortDate(plan.projectedDate)}`;
		return "Add a deadline to get a monthly plan";
	};

	const handleAddBudget = () => {
		const amount = parseFloat(budgetForm.amount);
		if (!budgetForm.category || !(amount > 0)) {
			Alert.alert("Error", "Please pick a category and enter a valid amount");
			return;
		}
		if (editingBudgetId) {
			updateBudget(editingBudgetId, {
				category: budgetForm.category,
				amount,
			});
			closeBudgetModal();
			return;
		}
		addBudget({
			category: budgetForm.category,
			amount,
			period: "monthly",
			startDate: new Date().toISOString().split("T")[0],
			endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
				.toISOString()
				.split("T")[0],
			alertThreshold: 80,
			isActive: true,
		});
		closeBudgetModal();
	};

	const closeSavingsModal = () => {
		setSavingsForm(emptySavingsForm);
		setEditingGoalId(null);
		setShowAddSavings(false);
	};

	const openEditGoal = (goal: DBSavingsGoal) => {
		setSavingsForm({
			name: goal.name,
			targetAmount: String(goal.targetAmount),
			deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
			icon: goal.icon,
			category: goal.category || "",
			priority: goal.priority || "medium",
		});
		if (goal.deadline) setSavingsDate(new Date(goal.deadline));
		setEditingGoalId(goal.id);
		setShowAddSavings(true);
	};

	const handleAddSavings = () => {
		const targetAmount = parseFloat(savingsForm.targetAmount);
		if (!savingsForm.name.trim() || !(targetAmount > 0)) {
			Alert.alert("Error", "Please enter a name and a valid target amount");
			return;
		}
		// A tagged goal takes its category's look.
		const cat = savingsForm.category
			? financeCategories.getInfo("expense", savingsForm.category)
			: null;

		if (editingGoalId) {
			const goal = savingsGoals.find((g) => g.id === editingGoalId);
			if (!goal) return closeSavingsModal();
			const changedCategory = savingsForm.category !== (goal.category || "");
			updateSavingsGoal(editingGoalId, {
				name: savingsForm.name.trim(),
				targetAmount,
				// null clears the column; undefined would leave the old deadline.
				deadline: (savingsForm.deadline || null) as any,
				category: savingsForm.category || null,
				priority: savingsForm.priority,
				isCompleted: (goal.currentAmount || 0) >= targetAmount,
				...(changedCategory && cat && { icon: cat.icon, color: cat.color }),
			});
			closeSavingsModal();
			return;
		}

		addSavingsGoal({
			name: savingsForm.name.trim(),
			targetAmount,
			deadline: savingsForm.deadline || undefined,
			icon: cat?.icon ?? savingsForm.icon,
			color: cat?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
			priority: savingsForm.priority,
			...(savingsForm.category && { category: savingsForm.category }),
		});
		closeSavingsModal();
	};

	const handleAddBill = async () => {
		if (!billForm.name || !billForm.amount || !billForm.dueDate) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}

		// Schedule notification for the bill
		try {
			await NotificationService.scheduleBillReminder(
				`bill_${Date.now()}`,
				billForm.name,
				parseFloat(billForm.amount),
				billForm.dueDate,
				3,
				currency
			);
		} catch (error) {
			console.error("Failed to schedule bill notification:", error);
		}

		addBillReminder({
			name: billForm.name,
			amount: parseFloat(billForm.amount),
			dueDate: billForm.dueDate,
			category: billForm.category || "bills",
			frequency: billForm.frequency,
			reminderDays: 3,
			isAutoDeduct: false,
			notes: billForm.notes || undefined,
		});
		setBillForm(emptyBillForm());
		setSelectedTemplate(null);
		setShowAddBill(false);
	};

	const handleEditBill = async () => {
		if (!showEditBill) return;
		if (!billForm.name || !billForm.amount || !billForm.dueDate) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}

		// Cancel old notification and schedule new one
		try {
			await NotificationService.cancelBillReminder(showEditBill.id);
			await NotificationService.scheduleBillReminder(
				showEditBill.id,
				billForm.name,
				parseFloat(billForm.amount),
				billForm.dueDate,
				3,
				currency
			);
		} catch (error) {
			console.error("Failed to update bill notification:", error);
		}

		updateBillReminder(showEditBill.id, {
			name: billForm.name,
			amount: parseFloat(billForm.amount),
			dueDate: billForm.dueDate,
			category: billForm.category || "bills",
			frequency: billForm.frequency,
			isAutoDeduct: billForm.isAutoDeduct || false,
			notes: billForm.notes || undefined,
		});
		setBillForm(emptyBillForm());
		setSelectedTemplate(null);
		setShowEditBill(null);
	};

	const handlePayBill = () => {
		if (!showPayBill) return;
		markBillPaid(showPayBill.id, selectedAccountId || undefined);
		setSelectedAccountId("");
		setShowPayBill(null);
	};

	const handleAddDebt = () => {
		if (!debtForm.name || !debtForm.totalAmount) {
			Alert.alert("Error", "Please fill required fields");
			return;
		}
		addDebt({
			type: debtForm.type,
			personName: debtForm.name,
			originalAmount: parseFloat(debtForm.totalAmount),
			description:
				debtForm.type === "owe"
					? `Debt to ${debtForm.name}`
					: `${debtForm.name} owes me`,
			dueDate: debtForm.dueDate || undefined,
		});
		setDebtForm({
			name: "",
			totalAmount: "",
			interestRate: "",
			minimumPayment: "",
			dueDate: "",
			type: "owe",
		});
		setShowAddDebt(false);
	};

	const handleContribute = () => {
		if (!showContribute || !contributionAmount) return;
		contributeToGoal(
			showContribute.id,
			parseFloat(contributionAmount),
			paymentNote || undefined,
			selectedAccountId || undefined
		);
		setContributionAmount("");
		setPaymentNote("");
		setSelectedAccountId("");
		setShowContribute(null);
	};

	const handleWithdraw = () => {
		if (!showWithdraw || !withdrawalAmount) return;
		withdrawFromGoal(
			showWithdraw.id,
			parseFloat(withdrawalAmount),
			paymentNote || undefined,
			selectedAccountId || undefined
		);
		setWithdrawalAmount("");
		setPaymentNote("");
		setSelectedAccountId("");
		setShowWithdraw(null);
	};

	const handlePayDebt = () => {
		if (!showPayDebt || !debtPaymentAmount) return;
		recordDebtPayment(
			showPayDebt.id,
			parseFloat(debtPaymentAmount),
			paymentNote || undefined,
			selectedAccountId || undefined
		);
		setDebtPaymentAmount("");
		setPaymentNote("");
		setSelectedAccountId("");
		setShowPayDebt(null);
	};

	// Horizontal category chips, shared by the budget, savings and bill modals.
	// An already-saved category stays visible even if it has since been hidden.
	const renderCategoryPicker = (
		selected: string,
		onSelect: (key: string) => void,
		options: { key: string; name: string; icon: string; color: string }[],
		allowNone = false,
	) => {
		const list =
			selected && !options.some((o) => o.key === selected)
				? [
						{ key: selected, ...financeCategories.getInfo("expense", selected) },
						...options,
					]
				: options;
		const chip = (key: string, name: string, icon: string, color: string) => (
			<TouchableOpacity
				key={key || "__none"}
				style={[
					styles.categoryOption,
					selected === key && {
						backgroundColor: color + "20",
						borderColor: color,
					},
				]}
				onPress={() => onSelect(key)}
			>
				<Ionicons
					name={icon as any}
					size={18}
					color={selected === key ? color : theme.textMuted}
				/>
				<Text
					style={[styles.categoryOptionText, selected === key && { color }]}
				>
					{name}
				</Text>
			</TouchableOpacity>
		);
		return (
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.categoryScroll}
			>
				{allowNone && chip("", "None", "remove-circle-outline", theme.primary)}
				{list.map((c) => chip(c.key, c.name, c.icon, c.color))}
			</ScrollView>
		);
	};

	const renderBillFrequencyPicker = () => (
		<View style={styles.priorityRow}>
			{BILL_FREQUENCIES.map((f) => {
				const active = billForm.frequency === f.value;
				return (
					<TouchableOpacity
						key={f.value}
						style={[
							styles.priorityChip,
							active && {
								backgroundColor: theme.primary + "20",
								borderColor: theme.primary,
							},
						]}
						onPress={() => setBillForm({ ...billForm, frequency: f.value })}
					>
						<Text
							style={[
								styles.categoryOptionText,
								active && { color: theme.primary },
							]}
						>
							{f.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);

	// Helper to render account selector
	const renderAccountSelector = () => {
		// Filter out the credit card account if this is a CC debt payment
		const availableAccounts = accounts.filter((acc) => {
			// If this is a credit card debt, exclude the linked credit card from selection
			if (showPayDebt?.linkedCreditCardId) {
				return acc.id !== showPayDebt.linkedCreditCardId;
			}
			return true;
		});

		return (
			<View style={styles.accountSelectorContainer}>
				<Text style={styles.inputLabel}>Select Account (Optional)</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={{ ...styles.accountScroll }}
				>
					<TouchableOpacity
						style={[
							styles.accountOption,
							!selectedAccountId && styles.accountOptionSelected,
						]}
						onPress={() => setSelectedAccountId("")}
					>
						<Ionicons
							name="cash-outline"
							size={18}
							color={!selectedAccountId ? theme.primary : theme.textMuted}
						/>
						<Text
							style={[
								styles.accountOptionText,
								!selectedAccountId && { color: theme.primary },
							]}
						>
							None
						</Text>
					</TouchableOpacity>
					{availableAccounts.map((acc) => (
						<TouchableOpacity
							key={acc.id}
							style={[
								styles.accountOption,
								selectedAccountId === acc.id && styles.accountOptionSelected,
							]}
							onPress={() => setSelectedAccountId(acc.id)}
						>
							<Ionicons
								name={acc.icon as any}
								size={18}
								color={
									selectedAccountId === acc.id ? theme.primary : theme.textMuted
								}
							/>
							<Text
								style={[
									styles.accountOptionText,
									selectedAccountId === acc.id && { color: theme.primary },
								]}
							>
								{acc.name}
							</Text>
							<Text style={styles.accountBalance}>
								{currency}
								{formatAmount(acc.balance)}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>
		);
	};

	const renderBudgetsTab = () => (
		<ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
			{/* Compact Budget Overview Card */}
			<View style={styles.overviewCard}>
				<View style={styles.overviewRow}>
					<View style={styles.overviewStatCompact}>
						<Text style={styles.overviewLabelCompact}>Budget</Text>
						<Text style={styles.overviewValueCompact}>
							{currency}
							{formatAmount(totalBudget)}
						</Text>
					</View>
					<View style={[styles.overviewStatCompact, styles.overviewStatMiddle]}>
						<Text style={styles.overviewLabelCompact}>Spent</Text>
						<Text style={[styles.overviewValueCompact, { color: theme.error }]}>
							{currency}
							{formatAmount(totalSpent)}
						</Text>
					</View>
					<View style={styles.overviewStatCompact}>
						<Text style={styles.overviewLabelCompact}>Left</Text>
						<Text
							style={[
								styles.overviewValueCompact,
								{ color: remainingBudget >= 0 ? theme.success : theme.error },
							]}
						>
							{currency}
							{formatAmount(Math.abs(remainingBudget))}
						</Text>
					</View>
				</View>
				{totalBudget > 0 && (
					<View style={styles.overviewProgressCompact}>
						<View style={styles.overviewProgressBg}>
							<View
								style={[
									styles.overviewProgressBar,
									{
										width: `${Math.min(
											(totalSpent / totalBudget) * 100,
											100
										)}%`,
										backgroundColor:
											totalSpent > totalBudget ? theme.error : theme.primary,
									},
								]}
							/>
						</View>
						<Text
							style={[
								styles.overviewProgressText,
								{
									color: totalSpent > totalBudget ? theme.error : theme.primary,
								},
							]}
						>
							{Math.min((totalSpent / totalBudget) * 100, 100).toFixed(0)}%
						</Text>
					</View>
				)}
			</View>

			{/* Category Budgets Section */}
			<View style={styles.sectionHeader}>
				<View>
					<Text style={styles.sectionTitle}>Category Budgets</Text>
					<Text style={styles.sectionSubtitle}>
						{budgetData.length}{" "}
						{budgetData.length === 1 ? "category" : "categories"} tracked
					</Text>
				</View>
				<TouchableOpacity
					style={styles.addSmallButton}
					onPress={() => {
						setEditingBudgetId(null);
						setBudgetForm({ category: "", amount: "" });
						setShowAddBudget(true);
					}}
				>
					<Ionicons name="add" size={18} color="#FFF" />
					<Text style={styles.addSmallText}>Add Budget</Text>
				</TouchableOpacity>
			</View>

			{budgetData.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons
						name="pie-chart-outline"
						size={40}
						color={theme.textMuted}
					/>
					<Text style={styles.emptyText}>No budgets set</Text>
					<Text style={styles.emptySubtext}>
						Create category budgets to track spending
					</Text>
				</View>
			) : (
				budgetData.map((budget) => {
					const catInfo = financeCategories.getInfo("expense", budget.category);
					return (
						<View key={budget.id} style={styles.budgetItem}>
							<View style={styles.budgetHeader}>
								<View style={styles.budgetCategory}>
									<View
										style={[
											styles.budgetIcon,
											{ backgroundColor: catInfo?.color + "20" },
										]}
									>
										<Ionicons
											name={catInfo?.icon as any}
											size={20}
											color={catInfo?.color}
										/>
									</View>
									<View>
										<Text style={styles.budgetName}>{catInfo?.name}</Text>
										<Text style={styles.budgetLimit}>
											{currency}
											{formatAmount(budget.spent)} / {currency}
											{formatAmount(budget.amount)}
										</Text>
									</View>
								</View>
								<View style={styles.billActionButtons}>
								<TouchableOpacity
									style={styles.billActionBtn}
									onPress={() => openEditBudget(budget)}
								>
									<Ionicons
										name="pencil-outline"
										size={18}
										color={theme.textMuted}
									/>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => {
										Alert.alert("Delete Budget", "Delete this budget?", [
											{ text: "Cancel", style: "cancel" },
											{
												text: "Delete",
												style: "destructive",
												onPress: () => deleteBudget(budget.id),
											},
										]);
									}}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={theme.textMuted}
									/>
								</TouchableOpacity>
								</View>
							</View>
							<View style={styles.budgetProgressContainer}>
								<View style={styles.budgetProgressBg}>
									<View
										style={[
											styles.budgetProgressFill,
											{
												width: `${Math.min(budget.percentage, 100)}%`,
												backgroundColor:
													budget.percentage >= 100
														? theme.error
														: budget.percentage >= 80
														? theme.warning
														: catInfo?.color,
											},
										]}
									/>
								</View>
								<Text
									style={[
										styles.budgetPercentage,
										{
											color:
												(budget.percentage ?? 0) >= 100
													? theme.error
													: (budget.percentage ?? 0) >= 80
													? theme.warning
													: theme.success,
										},
									]}
								>
									{(budget.percentage ?? 0).toFixed(0)}%
								</Text>
							</View>
						</View>
					);
				})
			)}
		</ScrollView>
	);

	const renderSavingsTab = () => (
		<ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
			{/* Savings Summary */}
			<View style={styles.savingsSummary}>
				<View style={styles.savingsSummaryRow}>
					<View style={styles.savingsSummaryItem}>
						<Text style={styles.savingsSummaryLabel}>Total Saved</Text>
						<Text
							style={[styles.savingsSummaryValue, { color: theme.success }]}
						>
							{currency}
							{formatAmount(
								savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0)
							)}
						</Text>
					</View>
					<View style={styles.savingsSummaryItem}>
						<Text style={styles.savingsSummaryLabel}>Target</Text>
						<Text style={styles.savingsSummaryValue}>
							{currency}
							{formatAmount(
								savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0)
							)}
						</Text>
					</View>
					<View style={styles.savingsSummaryItem}>
						<Text style={styles.savingsSummaryLabel}>Completed</Text>
						<Text
							style={[styles.savingsSummaryValue, { color: theme.primary }]}
						>
							{savingsGoals.filter((g) => g.isCompleted).length}/
							{savingsGoals.length}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Savings Goals</Text>
				<TouchableOpacity
					style={styles.addSmallButton}
					onPress={() => {
						setEditingGoalId(null);
						setSavingsForm(emptySavingsForm);
						setShowAddSavings(true);
					}}
				>
					<Ionicons name="add" size={18} color="#FFF" />
					<Text style={styles.addSmallText}>Add Goal</Text>
				</TouchableOpacity>
			</View>

			{savingsGoals.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="flag-outline" size={40} color={theme.textMuted} />
					<Text style={styles.emptyText}>No savings goals</Text>
					<Text style={styles.emptySubtext}>
						Set goals to save for what matters
					</Text>
				</View>
			) : (
				sortGoals(savingsGoals).map((goal) => {
					const percentage =
						goal.targetAmount > 0
							? ((goal.currentAmount || 0) / goal.targetAmount) * 100
							: 0;
					const plan = getGoalPlan(goal);
					return (
						<TouchableOpacity
							key={goal.id}
							style={[
								styles.savingsItem,
								goal.isCompleted && styles.savingsItemCompleted,
							]}
							onPress={() => setShowSavingsDetails(goal)}
						>
							{goal.isCompleted && (
								<View style={styles.completedBadge}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.success}
									/>
									<Text style={styles.completedBadgeText}>Completed!</Text>
								</View>
							)}
							<View style={styles.savingsHeader}>
								<View
									style={[
										styles.savingsIcon,
										{ backgroundColor: goal.color + "20" },
									]}
								>
									<Ionicons
										name={goal.icon as any}
										size={22}
										color={goal.color}
									/>
								</View>
								<View style={styles.savingsInfo}>
									<Text style={styles.savingsName}>{goal.name}</Text>
									{goal.deadline && (
										<Text style={styles.savingsDeadline}>
											Due: {new Date(goal.deadline).toLocaleDateString()}
										</Text>
									)}
								</View>
								<View style={styles.savingsAmounts}>
									<Text style={styles.savingsTarget}>
										{currency}
										{formatAmount(goal.targetAmount)}
									</Text>
									<Text style={styles.savingsCurrent}>
										{currency}
										{formatAmount(goal.currentAmount)} saved
									</Text>
								</View>
							</View>
							<View style={styles.savingsProgressContainer}>
								<View style={styles.savingsProgressBg}>
									<View
										style={[
											styles.savingsProgressFill,
											{
												width: `${Math.min(percentage, 100)}%`,
												backgroundColor: goal.isCompleted
													? theme.success
													: goal.color,
											},
										]}
									/>
								</View>
								<Text
									style={[
										styles.savingsPercentage,
										{ color: goal.isCompleted ? theme.success : goal.color },
									]}
								>
									{percentage.toFixed(0)}%
								</Text>
							</View>
							{!goal.isCompleted && (
								<View style={styles.goalPlanRow}>
									<Text style={styles.goalPlanText} numberOfLines={1}>
										{planHeadline(plan)}
									</Text>
									{plan.pace && (
										<View
											style={[
												styles.goalPaceBadge,
												{ backgroundColor: paceColor(plan.pace) + "20" },
											]}
										>
											<Text
												style={[
													styles.goalPaceText,
													{ color: paceColor(plan.pace) },
												]}
											>
												{PACE_LABEL[plan.pace]}
											</Text>
										</View>
									)}
								</View>
							)}
						</TouchableOpacity>
					);
				})
			)}
		</ScrollView>
	);

	const renderBillsTab = () => {
		// Separate unpaid and paid bills
		const unpaidBills = billReminders.filter((b) => !b.isPaid);
		const paidBills = billReminders.filter((b) => b.isPaid);

		return (
			<ScrollView
				style={styles.tabContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Bills Summary */}
				<View style={styles.billsSummary}>
					<View style={styles.billsSummaryRow}>
						<View style={styles.billsSummaryItem}>
							<Text style={styles.billsSummaryLabel}>Upcoming</Text>
							<Text
								style={[styles.billsSummaryValue, { color: theme.warning }]}
							>
								{currency}
								{formatAmount(
									unpaidBills.reduce((sum, b) => sum + b.amount, 0)
								)}
							</Text>
						</View>
						<View style={styles.billsSummaryItem}>
							<Text style={styles.billsSummaryLabel}>Overdue</Text>
							<Text style={[styles.billsSummaryValue, { color: theme.error }]}>
								{
									unpaidBills.filter((b) => new Date(b.dueDate) < new Date())
										.length
								}
							</Text>
						</View>
						<View style={styles.billsSummaryItem}>
							<Text style={styles.billsSummaryLabel}>Paid</Text>
							<Text
								style={[styles.billsSummaryValue, { color: theme.success }]}
							>
								{paidBills.length}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Bill Reminders</Text>
					<TouchableOpacity
						style={styles.addSmallButton}
						onPress={() => {
							setBillForm(emptyBillForm());
							setSelectedTemplate(null);
							setShowAddBill(true);
						}}
					>
						<Ionicons name="add" size={18} color="#FFF" />
						<Text style={styles.addSmallText}>Add Bill</Text>
					</TouchableOpacity>
				</View>

				{billReminders.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							name="calendar-outline"
							size={40}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyText}>No bill reminders</Text>
						<Text style={styles.emptySubtext}>
							Add bills to never miss a payment
						</Text>
					</View>
				) : (
					<>
						{/* Unpaid Bills */}
						{unpaidBills.length > 0 && (
							<Text style={styles.billSectionLabel}>
								Unpaid ({unpaidBills.length})
							</Text>
						)}
						{unpaidBills.map((bill) => {
							const dueDate = new Date(bill.dueDate);
							const today = new Date();
							const daysUntil = Math.ceil(
								(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
							);
							const isOverdue = daysUntil < 0;
							const isDueSoon = daysUntil <= 3 && daysUntil >= 0;

							return (
								<TouchableOpacity
									key={bill.id}
									style={[styles.billItem, isOverdue && styles.billItemOverdue]}
									onPress={() => setShowPayBill(bill)}
									onLongPress={() => {
										setBillForm({
											name: bill.name,
											amount: bill.amount.toString(),
											dueDate: bill.dueDate,
											frequency: bill.frequency,
											isAutoDeduct: bill.isAutoDeduct ?? false,
											notes: bill.notes || "",
											category: bill.category || "bills",
										});
										setBillDate(new Date(bill.dueDate));
										setShowEditBill(bill);
									}}
								>
									<View
										style={[
											styles.billStatusIndicator,
											{
												backgroundColor: isOverdue
													? theme.error
													: isDueSoon
													? theme.warning
													: theme.primary,
											},
										]}
									/>
									<View
										style={[
											styles.billGradientOverlay,
											{
												backgroundColor: isOverdue
													? theme.error + "08"
													: isDueSoon
													? theme.warning + "08"
													: theme.primary + "08",
											},
										]}
									/>
									<View style={styles.billInfo}>
										<Text style={styles.billName}>{bill.name}</Text>
										<View style={styles.billMeta}>
											<Ionicons
												name="calendar-outline"
												size={13}
												color={
													isOverdue
														? theme.error
														: isDueSoon
														? theme.warning
														: theme.textMuted
												}
											/>
											<Text
												style={[
													styles.billDue,
													isOverdue && {
														color: theme.error,
														fontWeight: "600",
													},
													isDueSoon && {
														color: theme.warning,
														fontWeight: "600",
													},
												]}
											>
												{isOverdue
													? `Overdue by ${Math.abs(daysUntil)} days`
													: daysUntil === 0
													? "Due today"
													: daysUntil === 1
													? "Due tomorrow"
													: `Due in ${daysUntil} days`}
											</Text>
											{bill.frequency !== "once" && (
												<View
													style={[
														styles.recurringBadge,
														{ backgroundColor: theme.primary + "15" },
													]}
												>
													<Ionicons
														name="repeat"
														size={11}
														color={theme.primary}
													/>
													<Text style={styles.recurringText}>
														{bill.frequency}
													</Text>
												</View>
											)}
										</View>
									</View>
									<View style={styles.billActions}>
										<Text style={[styles.billAmount, { fontWeight: "700" }]}>
											{currency}
											{formatAmount(bill.amount)}
										</Text>
										<View style={styles.billActionButtons}>
											<TouchableOpacity
												style={styles.billActionBtn}
												onPress={() => {
													setBillForm({
														name: bill.name,
														amount: bill.amount.toString(),
														dueDate: bill.dueDate,
														frequency: bill.frequency,
														isAutoDeduct: bill.isAutoDeduct ?? false,
														notes: bill.notes || "",
														category: bill.category || "bills",
													});
													setBillDate(new Date(bill.dueDate));
													setShowEditBill(bill);
												}}
											>
												<Ionicons
													name="pencil-outline"
													size={16}
													color={theme.textMuted}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												onPress={() => {
													Alert.alert("Delete Bill", "Delete this reminder?", [
														{ text: "Cancel", style: "cancel" },
														{
															text: "Delete",
															style: "destructive",
															onPress: () => deleteBillReminder(bill.id),
														},
													]);
												}}
											>
												<Ionicons
													name="trash-outline"
													size={16}
													color={theme.textMuted}
												/>
											</TouchableOpacity>
										</View>
									</View>
								</TouchableOpacity>
							);
						})}

						{/* Paid Bills */}
						{paidBills.length > 0 && (
							<>
								<Text style={[styles.billSectionLabel, { marginTop: 20 }]}>
									Paid ({paidBills.length})
								</Text>
								{paidBills.slice(0, 5).map((bill) => (
									<View
										key={bill.id}
										style={[styles.billItem, styles.billItemPaid]}
									>
										<View
											style={[
												styles.billStatusIndicator,
												{ backgroundColor: theme.success },
											]}
										/>
										<View style={styles.billInfo}>
											<Text style={[styles.billName, styles.billNamePaid]}>
												{bill.name}
											</Text>
											<Text style={styles.billDue}>
												Paid on{" "}
												{bill.paidDate
													? new Date(bill.paidDate).toLocaleDateString()
													: "N/A"}
											</Text>
										</View>
										<View style={styles.billActions}>
											<Text
												style={[styles.billAmount, { color: theme.textMuted }]}
											>
												{currency}
												{formatAmount(bill.amount)}
											</Text>
											<Ionicons
												name="checkmark-circle"
												size={18}
												color={theme.success}
											/>
										</View>
									</View>
								))}
								{paidBills.length > 5 && (
									<Text style={styles.showMoreText}>
										+ {paidBills.length - 5} more paid bills
									</Text>
								)}
							</>
						)}
					</>
				)}
			</ScrollView>
		);
	};

	const renderDebtsTab = () => {
		const activeDebts = debts.filter((d) => !d.isSettled);
		const settledDebts = debts.filter((d) => d.isSettled);
		const iOwe = activeDebts.filter((d) => d.type === "owe");
		const theyOweMe = activeDebts.filter((d) => d.type === "lent");

		return (
			<ScrollView
				style={styles.tabContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Debt Summary */}
				<View style={styles.debtSummary}>
					<View style={styles.debtSummaryRow}>
						<View style={styles.debtSummaryItem}>
							<Text style={styles.debtSummaryLabel}>I Owe</Text>
							<Text style={[styles.debtSummaryValue, { color: theme.error }]}>
								{currency}
								{formatAmount(
									iOwe.reduce((sum, d) => sum + d.remainingAmount, 0)
								)}
							</Text>
						</View>
						<View style={styles.debtSummaryItem}>
							<Text style={styles.debtSummaryLabel}>They Owe Me</Text>
							<Text style={[styles.debtSummaryValue, { color: theme.success }]}>
								{currency}
								{formatAmount(
									theyOweMe.reduce((sum, d) => sum + d.remainingAmount, 0)
								)}
							</Text>
						</View>
					</View>
					<Text style={styles.debtSummarySubLabel}>
						{activeDebts.length} active • {settledDebts.length} settled
					</Text>
				</View>

				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Active Debts</Text>
					<TouchableOpacity
						style={styles.addSmallButton}
						onPress={() => setShowAddDebt(true)}
					>
						<Ionicons name="add" size={18} color="#FFF" />
						<Text style={styles.addSmallText}>Add Debt</Text>
					</TouchableOpacity>
				</View>

				{activeDebts.length === 0 && settledDebts.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons name="wallet-outline" size={40} color={theme.textMuted} />
						<Text style={styles.emptyText}>No debts tracked</Text>
						<Text style={styles.emptySubtext}>
							Track debts to manage repayments
						</Text>
					</View>
				) : (
					<>
						{/* Active Debts */}
						{activeDebts.map((debt) => {
							const paidPercentage =
								debt.originalAmount > 0
									? (((debt.originalAmount || 0) -
											(debt.remainingAmount || 0)) /
											debt.originalAmount) *
									  100
									: 0;
							return (
								<TouchableOpacity
									key={debt.id}
									style={[
										styles.debtItem,
										debt.type === "lent" && styles.debtItemLent,
									]}
									onPress={() => setShowPayDebt(debt)}
								>
									<View style={styles.debtHeader}>
										<View>
											<View style={styles.debtNameRow}>
												<Text style={styles.debtName}>{debt.personName}</Text>
												<View
													style={[
														styles.debtTypeBadge,
														{
															backgroundColor:
																debt.type === "owe"
																	? theme.error + "20"
																	: theme.success + "20",
														},
													]}
												>
													<Text
														style={[
															styles.debtTypeText,
															{
																color:
																	debt.type === "owe"
																		? theme.error
																		: theme.success,
															},
														]}
													>
														{debt.type === "owe" ? "I Owe" : "They Owe"}
													</Text>
												</View>
											</View>
										</View>
										<View style={styles.debtAmounts}>
											<Text
												style={[
													styles.debtRemaining,
													{
														color:
															debt.type === "owe" ? theme.error : theme.success,
													},
												]}
											>
												{currency}
												{formatAmount(debt.remainingAmount)}
											</Text>
											<Text style={styles.debtOriginal}>
												of {currency}
												{formatAmount(debt.originalAmount)}
											</Text>
										</View>
									</View>
									<View style={styles.debtProgressContainer}>
										<View style={styles.debtProgressBg}>
											<View
												style={[
													styles.debtProgressFill,
													{
														width: `${paidPercentage}%`,
														backgroundColor: theme.success,
													},
												]}
											/>
										</View>
										<Text style={styles.debtProgressText}>
											{paidPercentage.toFixed(0)}% paid
										</Text>
									</View>
									<View style={styles.debtFooter}>
										<Text style={styles.debtDue}>
											{debt.dueDate
												? `Due: Day ${debt.dueDate}`
												: "No due date"}
										</Text>
										<Text style={styles.debtPaymentCount}>
											{debt.payments?.length || 0} payment
											{(debt.payments?.length || 0) !== 1 ? "s" : ""}
										</Text>
									</View>
								</TouchableOpacity>
							);
						})}

						{/* Settled Debts */}
						{settledDebts.length > 0 && (
							<>
								<Text style={[styles.billSectionLabel, { marginTop: 20 }]}>
									Settled ({settledDebts.length})
								</Text>
								{settledDebts.slice(0, 3).map((debt) => (
									<View
										key={debt.id}
										style={[styles.debtItem, styles.debtItemSettled]}
									>
										<View style={styles.debtHeader}>
											<View>
												<View style={styles.debtNameRow}>
													<Text
														style={[
															styles.debtName,
															{ color: theme.textMuted },
														]}
													>
														{debt.personName}
													</Text>
													<Ionicons
														name="checkmark-circle"
														size={16}
														color={theme.success}
													/>
												</View>
												<Text
													style={[styles.debtRate, { color: theme.textMuted }]}
												>
													{debt.type === "owe" ? "I owed" : "They owed me"}
												</Text>
											</View>
											<View style={styles.debtAmounts}>
												<Text
													style={[
														styles.debtRemaining,
														{ color: theme.textMuted },
													]}
												>
													{currency}
													{formatAmount(debt.originalAmount)}
												</Text>
												<Text
													style={[
														styles.debtOriginal,
														{ color: theme.textMuted },
													]}
												>
													Settled
												</Text>
											</View>
										</View>
										<TouchableOpacity
											style={styles.deleteSettledButton}
											onPress={() => {
												Alert.alert(
													"Delete Debt",
													"Remove this settled debt?",
													[
														{ text: "Cancel", style: "cancel" },
														{
															text: "Delete",
															style: "destructive",
															onPress: () => deleteDebt(debt.id),
														},
													]
												);
											}}
										>
											<Ionicons
												name="trash-outline"
												size={14}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									</View>
								))}
								{settledDebts.length > 3 && (
									<Text style={styles.showMoreText}>
										+ {settledDebts.length - 3} more settled debts
									</Text>
								)}
							</>
						)}
					</>
				)}
			</ScrollView>
		);
	};

	// One budget per category; the one being edited keeps its own.
	const categories = financeCategories.expenseOptions.filter(
		(c) =>
			!budgets.find((b) => b.category === c.key && b.id !== editingBudgetId),
	);

	return (
		<View style={styles.container}>
			{/* Tab Bar */}
			<View style={styles.tabBar}>
				{(
					[
						{ key: "budgets", label: "Budgets", icon: "pie-chart" },
						{ key: "savings", label: "Savings", icon: "flag" },
						{ key: "bills", label: "Bills", icon: "calendar" },
						{ key: "debts", label: "Debts", icon: "wallet" },
					] as { key: BudgetTab; label: string; icon: string }[]
				).map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={[styles.tab, activeTab === tab.key && styles.tabActive]}
						onPress={() => setActiveTab(tab.key)}
					>
						<Ionicons
							name={tab.icon as any}
							size={18}
							color={activeTab === tab.key ? theme.primary : theme.textMuted}
						/>
						<Text
							style={[
								styles.tabText,
								activeTab === tab.key && styles.tabTextActive,
							]}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Tab Content */}
			{activeTab === "budgets" && renderBudgetsTab()}
			{activeTab === "savings" && renderSavingsTab()}
			{activeTab === "bills" && renderBillsTab()}
			{activeTab === "debts" && renderDebtsTab()}

			{/* Add Budget Modal */}
			<Modal
				visible={showAddBudget}
				animationType="slide"
				transparent
				onRequestClose={closeBudgetModal}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingBudgetId ? "Edit Budget" : "Set Category Budget"}
							</Text>
							<TouchableOpacity onPress={closeBudgetModal}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Category</Text>
						{renderCategoryPicker(
							budgetForm.category,
							(key) => setBudgetForm({ ...budgetForm, category: key }),
							categories,
						)}

						<Text style={styles.inputLabel}>Monthly Limit</Text>
						<TextInput
							style={styles.input}
							value={budgetForm.amount}
							onChangeText={(t) => setBudgetForm({ ...budgetForm, amount: t })}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddBudget}
						>
							<Text style={styles.submitButtonText}>
								{editingBudgetId ? "Save Changes" : "Set Budget"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Savings Goal Modal */}
			<Modal
				visible={showAddSavings}
				animationType="slide"
				transparent
				onRequestClose={closeSavingsModal}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingGoalId ? "Edit Savings Goal" : "New Savings Goal"}
							</Text>
							<TouchableOpacity onPress={closeSavingsModal}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Goal Name</Text>
						<TextInput
							style={styles.input}
							value={savingsForm.name}
							onChangeText={(t) => setSavingsForm({ ...savingsForm, name: t })}
							placeholder="e.g. Vacation, New Phone"
							placeholderTextColor={theme.textMuted}
						/>

						<Text style={styles.inputLabel}>Target Amount</Text>
						<TextInput
							style={styles.input}
							value={savingsForm.targetAmount}
							onChangeText={(t) =>
								setSavingsForm({ ...savingsForm, targetAmount: t })
							}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<Text style={styles.inputLabel}>Deadline (Optional)</Text>
						<TouchableOpacity
							style={styles.datePickerButton}
							onPress={() => setShowSavingsDatePicker(true)}
						>
							<Ionicons name="calendar" size={20} color={theme.primary} />
							<Text style={styles.datePickerText}>
								{savingsForm.deadline || "Select deadline"}
							</Text>
						</TouchableOpacity>
						{showSavingsDatePicker && (
							<DateTimePicker
								value={savingsDate}
								mode="date"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={(event, selectedDate) => {
									setShowSavingsDatePicker(Platform.OS === "ios");
									if (selectedDate) {
										setSavingsDate(selectedDate);
										setSavingsForm({
											...savingsForm,
											deadline: selectedDate.toISOString().split("T")[0],
										});
									}
								}}
							/>
						)}
						{savingsForm.deadline !== "" && (
							<TouchableOpacity
								onPress={() => setSavingsForm({ ...savingsForm, deadline: "" })}
							>
								<Text style={styles.clearLink}>Remove deadline</Text>
							</TouchableOpacity>
						)}

						{(() => {
							// Live preview of the monthly plan while filling the form.
							const target = parseFloat(savingsForm.targetAmount);
							if (!(target > 0) || !savingsForm.deadline) return null;
							const saved = editingGoalId
								? savingsGoals.find((g) => g.id === editingGoalId)
										?.currentAmount || 0
								: 0;
							const months = monthsUntil(savingsForm.deadline);
							if (months <= 0) return null;
							const perMonth = Math.max(0, target - saved) / months;
							const roundedMonths = Math.max(1, Math.round(months));
							return (
								<Text style={styles.goalPlanPreview}>
									{`≈ ${currency}${formatAmount(Math.ceil(perMonth))}/month (${currency}${formatAmount(Math.ceil(perMonth / WEEKS_PER_MONTH))}/week) for ${roundedMonths} month${roundedMonths === 1 ? "" : "s"}`}
								</Text>
							);
						})()}

						<Text style={styles.inputLabel}>Priority</Text>
						<View style={styles.priorityRow}>
							{(["low", "medium", "high"] as const).map((p) => (
								<TouchableOpacity
									key={p}
									style={[
										styles.priorityChip,
										savingsForm.priority === p && {
											backgroundColor: theme.primary + "20",
											borderColor: theme.primary,
										},
									]}
									onPress={() => setSavingsForm({ ...savingsForm, priority: p })}
								>
									<Text
										style={[
											styles.categoryOptionText,
											savingsForm.priority === p && { color: theme.primary },
										]}
									>
										{p[0].toUpperCase() + p.slice(1)}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={styles.inputLabel}>Category (Optional)</Text>
						{renderCategoryPicker(
							savingsForm.category,
							(key) => setSavingsForm({ ...savingsForm, category: key }),
							financeCategories.expenseOptions,
							true,
						)}

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddSavings}
						>
							<Text style={styles.submitButtonText}>
								{editingGoalId ? "Save Changes" : "Create Goal"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Bill Modal */}
			<Modal
				visible={showAddBill}
				animationType="slide"
				transparent
				onRequestClose={() => setShowAddBill(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Bill Reminder</Text>
							<TouchableOpacity onPress={() => setShowAddBill(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.templateSection}>
							<Text style={styles.sectionLabel}>💳 Quick Templates</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{
									paddingBottom: 12,
									paddingHorizontal: 2,
								}}
							>
								{billTemplates.map((template) => {
									const isSelected = selectedTemplate === template.name;
									return (
										<TouchableOpacity
											key={template.name}
											style={[
												styles.templateCard,
												{
													backgroundColor: isSelected
														? template.color + "20"
														: theme.surface,
													borderColor: isSelected
														? template.color
														: theme.border,
												},
											]}
											activeOpacity={0.7}
											onPress={() => {
												setSelectedTemplate(template.name);
												setBillForm({
													...billForm,
													name: template.fullName,
													frequency: "monthly",
												});
											}}
										>
											<View
												style={[
													styles.templateIconContainer,
													{
														backgroundColor: template.color + "15",
														borderWidth: isSelected ? 2 : 0,
														borderColor: template.color,
													},
												]}
											>
												<Ionicons
													name={template.icon as any}
													size={24}
													color={template.color}
												/>
											</View>
											<Text
												style={[styles.templateCardText, { color: theme.text }]}
											>
												{template.name}
											</Text>
											{isSelected && (
												<View
													style={[
														styles.selectedBadge,
														{ backgroundColor: template.color },
													]}
												>
													<Ionicons
														name="checkmark-circle"
														size={18}
														color="#FFF"
													/>
												</View>
											)}
										</TouchableOpacity>
									);
								})}
							</ScrollView>
						</View>

						<Text style={styles.inputLabel}>Bill Name</Text>
						<TextInput
							style={styles.input}
							value={billForm.name}
							onChangeText={(t) => setBillForm({ ...billForm, name: t })}
							placeholder="e.g. Rent, Electricity"
							placeholderTextColor={theme.textMuted}
						/>

						<Text style={styles.inputLabel}>Amount</Text>
						<TextInput
							style={styles.input}
							value={billForm.amount}
							onChangeText={(t) => setBillForm({ ...billForm, amount: t })}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<Text style={styles.inputLabel}>Due Date</Text>
						<TouchableOpacity
							style={styles.datePickerButton}
							onPress={() => setShowBillDatePicker(true)}
						>
							<Ionicons name="calendar" size={20} color={theme.primary} />
							<Text style={styles.datePickerText}>
								{billForm.dueDate || "Select date"}
							</Text>
						</TouchableOpacity>
						{showBillDatePicker && (
							<DateTimePicker
								value={billDate}
								mode="date"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={(event, selectedDate) => {
									setShowBillDatePicker(Platform.OS === "ios");
									if (selectedDate) {
										setBillDate(selectedDate);
										setBillForm({
											...billForm,
											dueDate: selectedDate.toISOString().split("T")[0],
										});
									}
								}}
							/>
						)}
						<Text style={styles.inputLabel}>Category</Text>
						{renderCategoryPicker(
							billForm.category,
							(key) => setBillForm({ ...billForm, category: key }),
							financeCategories.expenseOptions,
						)}

						<Text style={styles.inputLabel}>Repeats</Text>
						{renderBillFrequencyPicker()}

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddBill}
						>
							<Text style={styles.submitButtonText}>Add Reminder</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Debt Modal */}
			<Modal
				visible={showAddDebt}
				animationType="slide"
				transparent
				onRequestClose={() => setShowAddDebt(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Track New Debt</Text>
							<TouchableOpacity onPress={() => setShowAddDebt(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Debt Type</Text>
						<View style={styles.debtTypeSelector}>
							<TouchableOpacity
								style={[
									styles.debtTypeOption,
									debtForm.type === "owe" && {
										backgroundColor: theme.error + "20",
										borderColor: theme.error,
									},
								]}
								onPress={() => setDebtForm({ ...debtForm, type: "owe" })}
							>
								<Ionicons
									name="arrow-up-circle"
									size={20}
									color={
										debtForm.type === "owe" ? theme.error : theme.textMuted
									}
								/>
								<Text
									style={[
										styles.debtTypeOptionText,
										debtForm.type === "owe" && { color: theme.error },
									]}
								>
									I Owe
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.debtTypeOption,
									debtForm.type === "lent" && {
										backgroundColor: theme.success + "20",
										borderColor: theme.success,
									},
								]}
								onPress={() => setDebtForm({ ...debtForm, type: "lent" })}
							>
								<Ionicons
									name="arrow-down-circle"
									size={20}
									color={
										debtForm.type === "lent" ? theme.success : theme.textMuted
									}
								/>
								<Text
									style={[
										styles.debtTypeOptionText,
										debtForm.type === "lent" && { color: theme.success },
									]}
								>
									They Owe Me
								</Text>
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Person / Description</Text>
						<TextInput
							style={styles.input}
							value={debtForm.name}
							onChangeText={(t) => setDebtForm({ ...debtForm, name: t })}
							placeholder={
								debtForm.type === "owe"
									? "e.g. Bank, Friend's name"
									: "e.g. John, Sarah"
							}
							placeholderTextColor={theme.textMuted}
						/>

						<Text style={styles.inputLabel}>Total Amount</Text>
						<TextInput
							style={styles.input}
							value={debtForm.totalAmount}
							onChangeText={(t) => setDebtForm({ ...debtForm, totalAmount: t })}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<Text style={styles.inputLabel}>Interest Rate (%) - Optional</Text>
						<TextInput
							style={styles.input}
							value={debtForm.interestRate}
							onChangeText={(t) =>
								setDebtForm({ ...debtForm, interestRate: t })
							}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<Text style={styles.inputLabel}>Minimum Monthly Payment</Text>
						<TextInput
							style={styles.input}
							value={debtForm.minimumPayment}
							onChangeText={(t) =>
								setDebtForm({ ...debtForm, minimumPayment: t })
							}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
						/>

						<Text style={styles.inputLabel}>Due Day of Month (1-31)</Text>
						<TextInput
							style={styles.input}
							value={debtForm.dueDate}
							onChangeText={(t) => setDebtForm({ ...debtForm, dueDate: t })}
							placeholder="e.g. 15 for 15th of every month"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
						/>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddDebt}
						>
							<Text style={styles.submitButtonText}>Add Debt</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Contribute to Savings Modal */}
			<Modal
				visible={!!showContribute}
				animationType="slide"
				transparent
				onRequestClose={() => setShowContribute(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add to Savings</Text>
							<TouchableOpacity onPress={() => setShowContribute(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showContribute && (
							<>
								<Text style={styles.contributeGoalName}>
									{showContribute.name}
								</Text>
								<Text style={styles.contributeProgress}>
									{currency}
									{showContribute.currentAmount.toLocaleString("en-IN", {
										minimumFractionDigits: 0,
										maximumFractionDigits: 2,
									})}{" "}
									/ {currency}
									{showContribute.targetAmount.toLocaleString("en-IN", {
										minimumFractionDigits: 0,
										maximumFractionDigits: 2,
									})}
								</Text>

								<Text style={styles.inputLabel}>Amount to Add</Text>
								<TextInput
									style={styles.input}
									value={contributionAmount}
									onChangeText={setContributionAmount}
									placeholder="0.00"
									placeholderTextColor={theme.textMuted}
									keyboardType={
										Platform.OS === "ios" ? "decimal-pad" : "numeric"
									}
								/>

								{renderAccountSelector()}

								<TouchableOpacity
									style={styles.submitButton}
									onPress={handleContribute}
								>
									<Text style={styles.submitButtonText}>Add Savings</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Savings Details Modal */}
			<Modal
				visible={!!showSavingsDetails}
				animationType="slide"
				transparent
				onRequestClose={() => setShowSavingsDetails(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Savings Details</Text>
							<TouchableOpacity onPress={() => setShowSavingsDetails(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showSavingsDetails && (
							<>
								<View style={styles.savingsDetailHeader}>
									<View
										style={[
											styles.savingsIcon,
											{ backgroundColor: showSavingsDetails.color + "20" },
										]}
									>
										<Ionicons
											name={showSavingsDetails.icon as any}
											size={28}
											color={showSavingsDetails.color}
										/>
									</View>
									<Text style={styles.contributeGoalName}>
										{showSavingsDetails.name}
									</Text>
									{showSavingsDetails.isCompleted && (
										<View style={styles.completedBadge}>
											<Ionicons
												name="checkmark-circle"
												size={16}
												color={theme.success}
											/>
											<Text style={styles.completedBadgeText}>
												Goal Reached!
											</Text>
										</View>
									)}
								</View>

								<View style={styles.savingsDetailProgress}>
									<Text style={styles.savingsDetailAmount}>
										{currency}
										{formatAmount(showSavingsDetails.currentAmount)}
									</Text>
									<Text style={styles.savingsDetailTarget}>
										of {currency}
										{formatAmount(showSavingsDetails.targetAmount)}
									</Text>
									<View style={styles.savingsProgressBg}>
										<View
											style={[
												styles.savingsProgressFill,
												{
													width: `${Math.min(
														(showSavingsDetails.currentAmount /
															showSavingsDetails.targetAmount) *
															100,
														100
													)}%`,
													backgroundColor: showSavingsDetails.isCompleted
														? theme.success
														: showSavingsDetails.color,
												},
											]}
										/>
									</View>
								</View>

								{/* Savings plan */}
								{!showSavingsDetails.isCompleted &&
									(() => {
										const plan = getGoalPlan(showSavingsDetails);
										const rows: [string, string][] = [
											["Remaining", `${currency}${formatAmount(plan.remaining)}`],
										];
										if (plan.daysLeft !== null)
											rows.push([
												"Time left",
												plan.overdue
													? `Overdue by ${Math.abs(plan.daysLeft)} days`
													: `${plan.daysLeft} days`,
											]);
										if (plan.monthlyNeeded !== null && !plan.overdue) {
											rows.push([
												"Save per month",
												`${currency}${formatAmount(Math.ceil(plan.monthlyNeeded))}`,
											]);
											rows.push([
												"Save per week",
												`${currency}${formatAmount(Math.ceil(plan.monthlyNeeded / WEEKS_PER_MONTH))}`,
											]);
										}
										if (plan.expectedByNow !== null)
											rows.push([
												"Should have by now",
												`${currency}${formatAmount(Math.round(plan.expectedByNow))}`,
											]);
										if (plan.avgMonthly > 0)
											rows.push([
												"Your average",
												`${currency}${formatAmount(Math.round(plan.avgMonthly))}/month`,
											]);
										if (plan.projectedDate)
											rows.push([
												"Projected finish",
												shortDate(plan.projectedDate),
											]);
										if (plan.thisMonth !== 0)
											rows.push([
												"Added this month",
												`${currency}${formatAmount(plan.thisMonth)}`,
											]);
										return (
											<View style={styles.goalPlanCard}>
												<View style={styles.goalPlanCardHeader}>
													<Text style={styles.paymentHistoryTitle}>Plan</Text>
													{plan.pace && (
														<View
															style={[
																styles.goalPaceBadge,
																{ backgroundColor: paceColor(plan.pace) + "20" },
															]}
														>
															<Text
																style={[
																	styles.goalPaceText,
																	{ color: paceColor(plan.pace) },
																]}
															>
																{PACE_LABEL[plan.pace]}
															</Text>
														</View>
													)}
												</View>
												{rows.map(([label, value]) => (
													<View key={label} style={styles.paymentHistoryItem}>
														<Text style={styles.paymentHistoryDate}>{label}</Text>
														<Text style={styles.goalPlanValue}>{value}</Text>
													</View>
												))}
												{plan.monthlyNeeded === null && (
													<Text style={styles.goalPlanHint}>
														{plan.suggestions
															.map(
																(sg) =>
																	`${currency}${formatAmount(Math.ceil(sg.perMonth))}/mo → ${sg.months} months`,
															)
															.join("  ·  ")}
													</Text>
												)}
												{plan.pace === "behind" && plan.catchUp !== null && (
													<Text style={styles.goalPlanHint}>
														{`Add ${currency}${formatAmount(Math.ceil(plan.catchUp))} to get back on track.`}
													</Text>
												)}
											</View>
										);
									})()}

								{/* Contribution History */}
								{showSavingsDetails.contributions &&
									showSavingsDetails.contributions.length > 0 && (
										<View style={styles.paymentHistory}>
											<Text style={styles.paymentHistoryTitle}>History</Text>
											{showSavingsDetails.contributions
												.slice(-5)
												.map((c, idx) => (
													<View key={idx} style={styles.paymentHistoryItem}>
														<Text style={styles.paymentHistoryDate}>
															{new Date(c.date).toLocaleDateString()}
															{c.type === "withdrawal" && " (Withdrawal)"}
														</Text>
														<Text
															style={[
																styles.paymentHistoryAmount,
																{
																	color:
																		c.type === "withdrawal"
																			? theme.error
																			: theme.success,
																},
															]}
														>
															{c.type === "withdrawal" ? "-" : "+"}
															{currency}
															{formatAmount(Math.abs(c.amount))}
														</Text>
													</View>
												))}
										</View>
									)}

								{/* Actions */}
								<View style={styles.savingsActionsRow}>
									<TouchableOpacity
										style={[
											styles.savingsActionButton,
											{ backgroundColor: theme.primary + "20" },
										]}
										onPress={() => {
											setShowSavingsDetails(null);
											setShowContribute(showSavingsDetails);
										}}
									>
										<Ionicons
											name="add-circle"
											size={18}
											color={theme.primary}
										/>
										<Text
											style={[
												styles.savingsActionText,
												{ color: theme.primary },
											]}
										>
											Add Money
										</Text>
									</TouchableOpacity>

									{showSavingsDetails.currentAmount > 0 && (
										<TouchableOpacity
											style={[
												styles.savingsActionButton,
												{ backgroundColor: theme.warning + "20" },
											]}
											onPress={() => {
												setShowSavingsDetails(null);
												setShowWithdraw(showSavingsDetails);
											}}
										>
											<Ionicons
												name="remove-circle"
												size={18}
												color={theme.warning}
											/>
											<Text
												style={[
													styles.savingsActionText,
													{ color: theme.warning },
												]}
											>
												Withdraw
											</Text>
										</TouchableOpacity>
									)}
								</View>

								<TouchableOpacity
									style={[
										styles.savingsActionButton,
										{ backgroundColor: theme.primary + "10", marginTop: 12 },
									]}
									onPress={() => {
										const goal = showSavingsDetails;
										setShowSavingsDetails(null);
										openEditGoal(goal);
									}}
								>
									<Ionicons
										name="create-outline"
										size={18}
										color={theme.primary}
									/>
									<Text
										style={[styles.savingsActionText, { color: theme.primary }]}
									>
										Edit Goal
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.deleteDebtButton}
									onPress={() => {
										Alert.alert(
											"Delete Goal",
											"Are you sure you want to delete this savings goal?",
											[
												{ text: "Cancel", style: "cancel" },
												{
													text: "Delete",
													style: "destructive",
													onPress: () => {
														deleteSavingsGoal(showSavingsDetails.id);
														setShowSavingsDetails(null);
													},
												},
											]
										);
									}}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={theme.error}
									/>
									<Text style={styles.deleteDebtText}>Delete Goal</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Pay Debt Modal */}
			<Modal
				visible={!!showPayDebt}
				animationType="slide"
				transparent
				onRequestClose={() => setShowPayDebt(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{showPayDebt?.isSettled
									? "Debt Details"
									: showPayDebt?.type === "owe"
									? "Make Payment"
									: "Record Payment"}
							</Text>
							<TouchableOpacity onPress={() => setShowPayDebt(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showPayDebt && (
							<>
								<View style={styles.debtDetailHeader}>
									<Text style={styles.contributeGoalName}>
										{showPayDebt.personName}
									</Text>
									<View
										style={[
											styles.debtTypeBadge,
											{
												backgroundColor:
													showPayDebt.type === "owe"
														? theme.error + "20"
														: theme.success + "20",
											},
										]}
									>
										<Text
											style={[
												styles.debtTypeText,
												{
													color:
														showPayDebt.type === "owe"
															? theme.error
															: theme.success,
												},
											]}
										>
											{showPayDebt.type === "owe" ? "I Owe" : "They Owe Me"}
										</Text>
									</View>
								</View>

								{showPayDebt.isSettled ? (
									<View style={styles.settledBadge}>
										<Ionicons
											name="checkmark-circle"
											size={24}
											color={theme.success}
										/>
										<Text style={styles.settledText}>Debt Settled!</Text>
									</View>
								) : (
									<Text style={styles.contributeProgress}>
										{currency}
										{formatAmount(showPayDebt.remainingAmount)} remaining of{" "}
										{currency}
										{formatAmount(showPayDebt.originalAmount)}
									</Text>
								)}

								{/* Payment History */}
								{showPayDebt.payments && showPayDebt.payments.length > 0 && (
									<View style={styles.paymentHistory}>
										<Text style={styles.paymentHistoryTitle}>
											Payment History
										</Text>
										{showPayDebt.payments.slice(-5).map((payment, idx) => (
											<View key={idx} style={styles.paymentHistoryItem}>
												<Text style={styles.paymentHistoryDate}>
													{new Date(payment.date).toLocaleDateString()}
												</Text>
												<Text style={styles.paymentHistoryAmount}>
													{currency}
													{formatAmount(payment.amount)}
												</Text>
											</View>
										))}
										{showPayDebt.payments.length > 5 && (
											<Text style={styles.showMoreText}>
												+ {showPayDebt.payments.length - 5} more payments
											</Text>
										)}
									</View>
								)}

								{/* Payment Form - Only show if not settled */}
								{!showPayDebt.isSettled && (
									<>
										<Text style={styles.inputLabel}>Payment Amount</Text>
										<TextInput
											style={styles.input}
											value={debtPaymentAmount}
											onChangeText={setDebtPaymentAmount}
											placeholder="0.00"
											placeholderTextColor={theme.textMuted}
											keyboardType={
												Platform.OS === "ios" ? "decimal-pad" : "numeric"
											}
										/>

										{renderAccountSelector()}

										<TouchableOpacity
											style={styles.submitButton}
											onPress={handlePayDebt}
										>
											<Text style={styles.submitButtonText}>
												{showPayDebt.type === "owe"
													? "Make Payment"
													: "Record Payment Received"}
											</Text>
										</TouchableOpacity>
									</>
								)}

								<TouchableOpacity
									style={styles.deleteDebtButton}
									onPress={() => {
										Alert.alert("Delete Debt", "Are you sure?", [
											{ text: "Cancel", style: "cancel" },
											{
												text: "Delete",
												style: "destructive",
												onPress: () => {
													deleteDebt(showPayDebt.id);
													setShowPayDebt(null);
												},
											},
										]);
									}}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={theme.error}
									/>
									<Text style={styles.deleteDebtText}>Delete Debt</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Withdraw from Savings Modal */}
			<Modal
				visible={!!showWithdraw}
				animationType="slide"
				transparent
				onRequestClose={() => setShowWithdraw(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Withdraw from Savings</Text>
							<TouchableOpacity onPress={() => setShowWithdraw(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showWithdraw && (
							<>
								<Text style={styles.contributeGoalName}>
									{showWithdraw.name}
								</Text>
								<Text style={styles.contributeProgress}>
									Available: {currency}
									{formatAmount(showWithdraw.currentAmount)}
								</Text>

								<Text style={styles.inputLabel}>Amount to Withdraw</Text>
								<TextInput
									style={styles.input}
									value={withdrawalAmount}
									onChangeText={setWithdrawalAmount}
									placeholder="0.00"
									placeholderTextColor={theme.textMuted}
									keyboardType={
										Platform.OS === "ios" ? "decimal-pad" : "numeric"
									}
								/>

								{renderAccountSelector()}

								<TouchableOpacity
									style={[
										styles.submitButton,
										{ backgroundColor: theme.warning },
									]}
									onPress={handleWithdraw}
								>
									<Text style={styles.submitButtonText}>Withdraw</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Edit Bill Modal */}
			<Modal
				visible={!!showEditBill}
				animationType="slide"
				transparent
				onRequestClose={() => setShowEditBill(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Edit Bill Reminder</Text>
							<TouchableOpacity onPress={() => setShowEditBill(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showEditBill && (
							<>
								<View style={styles.templateSection}>
									<Text style={styles.sectionLabel}>💳 Quick Templates</Text>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={{
											paddingBottom: 12,
											paddingHorizontal: 2,
										}}
									>
										{billTemplates.map((template) => {
											const isSelected = selectedTemplate === template.name;
											return (
												<TouchableOpacity
													key={template.name}
													style={[
														styles.templateCard,
														{
															backgroundColor: isSelected
																? template.color + "20"
																: theme.surface,
															borderColor: isSelected
																? template.color
																: theme.border,
														},
													]}
													activeOpacity={0.7}
													onPress={() => {
														setSelectedTemplate(template.name);
														setBillForm({
															...billForm,
															name: template.fullName,
															frequency: "monthly",
														});
													}}
												>
													<View
														style={[
															styles.templateIconContainer,
															{
																backgroundColor: template.color + "15",
																borderWidth: isSelected ? 2 : 0,
																borderColor: template.color,
															},
														]}
													>
														<Ionicons
															name={template.icon as any}
															size={24}
															color={template.color}
														/>
													</View>
													<Text
														style={[
															styles.templateCardText,
															{ color: theme.text },
														]}
													>
														{template.name}
													</Text>
													{isSelected && (
														<View
															style={[
																styles.selectedBadge,
																{ backgroundColor: template.color },
															]}
														>
															<Ionicons
																name="checkmark-circle"
																size={18}
																color="#FFF"
															/>
														</View>
													)}
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>

								<Text style={styles.inputLabel}>Bill Name</Text>
								<TextInput
									style={styles.input}
									value={billForm.name}
									onChangeText={(t) => setBillForm({ ...billForm, name: t })}
									placeholder="e.g. Rent, Electricity"
									placeholderTextColor={theme.textMuted}
								/>

								<Text style={styles.inputLabel}>Amount</Text>
								<TextInput
									style={styles.input}
									value={billForm.amount}
									onChangeText={(t) => setBillForm({ ...billForm, amount: t })}
									placeholder="0.00"
									placeholderTextColor={theme.textMuted}
									keyboardType={
										Platform.OS === "ios" ? "decimal-pad" : "numeric"
									}
								/>

								<Text style={styles.inputLabel}>Due Date</Text>
								<TouchableOpacity
									style={styles.datePickerButton}
									onPress={() => setShowBillDatePicker(true)}
								>
									<Ionicons name="calendar" size={20} color={theme.primary} />
									<Text style={styles.datePickerText}>
										{billForm.dueDate || "Select date"}
									</Text>
								</TouchableOpacity>
								{showBillDatePicker && (
									<DateTimePicker
										value={billDate}
										mode="date"
										display={Platform.OS === "ios" ? "spinner" : "default"}
										onChange={(event, selectedDate) => {
											setShowBillDatePicker(Platform.OS === "ios");
											if (selectedDate) {
												setBillDate(selectedDate);
												setBillForm({
													...billForm,
													dueDate: selectedDate.toISOString().split("T")[0],
												});
											}
										}}
									/>
								)}

								<Text style={styles.inputLabel}>Category</Text>
								{renderCategoryPicker(
									billForm.category,
									(key) => setBillForm({ ...billForm, category: key }),
									financeCategories.expenseOptions,
								)}

								<Text style={styles.inputLabel}>Repeats</Text>
								{renderBillFrequencyPicker()}

								<TouchableOpacity
									style={styles.submitButton}
									onPress={handleEditBill}
								>
									<Text style={styles.submitButtonText}>Save Changes</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Pay Bill Modal */}
			<Modal
				visible={!!showPayBill}
				animationType="slide"
				transparent
				onRequestClose={() => setShowPayBill(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Pay Bill</Text>
							<TouchableOpacity onPress={() => setShowPayBill(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showPayBill && (
							<>
								<Text style={styles.contributeGoalName}>
									{showPayBill.name}
								</Text>
								<Text style={styles.contributeProgress}>
									Amount: {currency}
									{formatAmount(showPayBill.amount)}
								</Text>
								<Text style={styles.billDueInfo}>
									Due: {new Date(showPayBill.dueDate).toLocaleDateString()}
								</Text>

								{renderAccountSelector()}

								<TouchableOpacity
									style={styles.submitButton}
									onPress={handlePayBill}
								>
									<Text style={styles.submitButtonText}>Mark as Paid</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

// markBillPaid rolls the due date forward by this period.
const BILL_FREQUENCIES: { value: DBBillReminder["frequency"]; label: string }[] = [
	{ value: "once", label: "Once" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Unfinished first, then by priority, then nearest deadline. */
const sortGoals = (goals: DBSavingsGoal[]) =>
	[...goals].sort(
		(a, b) =>
			Number(a.isCompleted) - Number(b.isCompleted) ||
			(PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
			(a.deadline ? new Date(a.deadline).getTime() : Infinity) -
				(b.deadline ? new Date(b.deadline).getTime() : Infinity),
	);
