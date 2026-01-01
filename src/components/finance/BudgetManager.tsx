// Budget Manager - Create and manage budgets with progress tracking

import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	TextInput,
	Alert,
	FlatList,
	Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Theme } from "@/src/context/themeContext";
import { useFinanceStore } from "@/src/context/financeStore";
import {
	Budget,
	SavingsGoal,
	BillReminder,
	Debt,
	ExpenseCategory,
	EXPENSE_CATEGORIES,
	COLORS,
} from "@/src/types/finance";

interface BudgetManagerProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

type BudgetTab = "budgets" | "savings" | "bills" | "debts";

export default function BudgetManager({
	theme,
	currency,
	onOpenDrawer,
}: BudgetManagerProps) {
	const {
		budgets,
		savingsGoals,
		billReminders,
		debts,
		addBudget,
		deleteBudget,
		addSavingsGoal,
		contributeToGoal,
		addBillReminder,
		markBillPaid,
		deleteBillReminder,
		addDebt,
		recordDebtPayment,
		deleteDebt,
		getSpendingByCategory,
		transactions,
	} = useFinanceStore();

	const styles = createStyles(theme);

	const [activeTab, setActiveTab] = useState<BudgetTab>("budgets");
	const [showAddBudget, setShowAddBudget] = useState(false);
	const [showAddSavings, setShowAddSavings] = useState(false);
	const [showAddBill, setShowAddBill] = useState(false);
	const [showAddDebt, setShowAddDebt] = useState(false);
	const [showContribute, setShowContribute] = useState<SavingsGoal | null>(
		null
	);
	const [showPayDebt, setShowPayDebt] = useState<Debt | null>(null);

	// Date picker states
	const [showBillDatePicker, setShowBillDatePicker] = useState(false);
	const [showDebtDatePicker, setShowDebtDatePicker] = useState(false);
	const [showSavingsDatePicker, setShowSavingsDatePicker] = useState(false);
	const [billDate, setBillDate] = useState(new Date());
	const [debtDate, setDebtDate] = useState(new Date());
	const [savingsDate, setSavingsDate] = useState(new Date());

	// Form states
	const [budgetForm, setBudgetForm] = useState({
		category: "" as ExpenseCategory | "",
		amount: "",
	});
	const [savingsForm, setSavingsForm] = useState({
		name: "",
		targetAmount: "",
		deadline: "",
		icon: "wallet" as string,
	});
	const [billForm, setBillForm] = useState({
		name: "",
		amount: "",
		dueDate: "",
		isRecurring: false,
	});
	const [debtForm, setDebtForm] = useState({
		name: "",
		totalAmount: "",
		interestRate: "",
		minimumPayment: "",
		dueDate: "",
	});
	const [contributionAmount, setContributionAmount] = useState("");
	const [debtPaymentAmount, setDebtPaymentAmount] = useState("");

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
		if (num >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
		if (num >= 100000) return `${(num / 100000).toFixed(2)}L`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toFixed(0);
	};

	const handleAddBudget = () => {
		if (!budgetForm.category || !budgetForm.amount) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addBudget({
			category: budgetForm.category,
			amount: parseFloat(budgetForm.amount),
			period: "monthly",
			startDate: new Date().toISOString().split("T")[0],
			endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
				.toISOString()
				.split("T")[0],
			alertThreshold: 80,
			isActive: true,
		});
		setBudgetForm({ category: "", amount: "" });
		setShowAddBudget(false);
	};

	const handleAddSavings = () => {
		if (!savingsForm.name || !savingsForm.targetAmount) {
			Alert.alert("Error", "Please fill required fields");
			return;
		}
		addSavingsGoal({
			name: savingsForm.name,
			targetAmount: parseFloat(savingsForm.targetAmount),
			deadline: savingsForm.deadline || undefined,
			icon: savingsForm.icon,
			color: COLORS[Math.floor(Math.random() * COLORS.length)],
			priority: "medium",
		});
		setSavingsForm({
			name: "",
			targetAmount: "",
			deadline: "",
			icon: "wallet",
		});
		setShowAddSavings(false);
	};

	const handleAddBill = () => {
		if (!billForm.name || !billForm.amount || !billForm.dueDate) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addBillReminder({
			name: billForm.name,
			amount: parseFloat(billForm.amount),
			dueDate: billForm.dueDate,
			category: "bills",
			frequency: billForm.isRecurring ? "monthly" : "once",
			reminderDays: 3,
			isAutoDeduct: false,
		});
		setBillForm({ name: "", amount: "", dueDate: "", isRecurring: false });
		setShowAddBill(false);
	};

	const handleAddDebt = () => {
		if (!debtForm.name || !debtForm.totalAmount) {
			Alert.alert("Error", "Please fill required fields");
			return;
		}
		addDebt({
			type: "owe",
			personName: debtForm.name,
			originalAmount: parseFloat(debtForm.totalAmount),
			description: `Debt to ${debtForm.name}`,
			interestRate: parseFloat(debtForm.interestRate) || 0,
			dueDate: debtForm.dueDate || undefined,
		});
		setDebtForm({
			name: "",
			totalAmount: "",
			interestRate: "",
			minimumPayment: "",
			dueDate: "",
		});
		setShowAddDebt(false);
	};

	const handleContribute = () => {
		if (!showContribute || !contributionAmount) return;
		contributeToGoal(showContribute.id, parseFloat(contributionAmount));
		setContributionAmount("");
		setShowContribute(null);
	};

	const handlePayDebt = () => {
		if (!showPayDebt || !debtPaymentAmount) return;
		recordDebtPayment(showPayDebt.id, parseFloat(debtPaymentAmount));
		setDebtPaymentAmount("");
		setShowPayDebt(null);
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
					onPress={() => setShowAddBudget(true)}
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
					const catInfo =
						EXPENSE_CATEGORIES[budget.category as ExpenseCategory];
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
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Savings Goals</Text>
				<TouchableOpacity
					style={styles.addSmallButton}
					onPress={() => setShowAddSavings(true)}
				>
					<Ionicons name="add" size={18} color={theme.primary} />
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
				savingsGoals.map((goal) => {
					const percentage =
						goal.targetAmount > 0
							? ((goal.currentAmount || 0) / goal.targetAmount) * 100
							: 0;
					return (
						<TouchableOpacity
							key={goal.id}
							style={styles.savingsItem}
							onPress={() => setShowContribute(goal)}
						>
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
												backgroundColor: goal.color,
											},
										]}
									/>
								</View>
								<Text style={[styles.savingsPercentage, { color: goal.color }]}>
									{percentage.toFixed(0)}%
								</Text>
							</View>
						</TouchableOpacity>
					);
				})
			)}
		</ScrollView>
	);

	const renderBillsTab = () => (
		<ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Bill Reminders</Text>
				<TouchableOpacity
					style={styles.addSmallButton}
					onPress={() => setShowAddBill(true)}
				>
					<Ionicons name="add" size={18} color={theme.primary} />
					<Text style={styles.addSmallText}>Add Bill</Text>
				</TouchableOpacity>
			</View>

			{billReminders.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="calendar-outline" size={40} color={theme.textMuted} />
					<Text style={styles.emptyText}>No bill reminders</Text>
					<Text style={styles.emptySubtext}>
						Add bills to never miss a payment
					</Text>
				</View>
			) : (
				billReminders.map((bill) => {
					const dueDate = new Date(bill.dueDate);
					const today = new Date();
					const daysUntil = Math.ceil(
						(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
					);
					const isOverdue = daysUntil < 0 && !bill.isPaid;
					const isDueSoon = daysUntil <= 3 && daysUntil >= 0 && !bill.isPaid;

					return (
						<View key={bill.id} style={styles.billItem}>
							<TouchableOpacity
								style={[
									styles.billCheckbox,
									bill.isPaid && styles.billCheckboxChecked,
								]}
								onPress={() => markBillPaid(bill.id)}
							>
								{bill.isPaid && (
									<Ionicons name="checkmark" size={16} color="#FFF" />
								)}
							</TouchableOpacity>
							<View style={styles.billInfo}>
								<Text
									style={[styles.billName, bill.isPaid && styles.billNamePaid]}
								>
									{bill.name}
								</Text>
								<View style={styles.billMeta}>
									<Text
										style={[
											styles.billDue,
											isOverdue && { color: theme.error },
											isDueSoon && { color: theme.warning },
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
										<View style={styles.recurringBadge}>
											<Ionicons name="repeat" size={12} color={theme.primary} />
											<Text style={styles.recurringText}>{bill.frequency}</Text>
										</View>
									)}
								</View>
							</View>
							<View style={styles.billActions}>
								<Text style={styles.billAmount}>
									{currency}
									{formatAmount(bill.amount)}
								</Text>
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
					);
				})
			)}
		</ScrollView>
	);

	const renderDebtsTab = () => (
		<ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
			{/* Debt Summary */}
			<View style={styles.debtSummary}>
				<Text style={styles.debtSummaryTitle}>Total Outstanding</Text>
				<Text style={styles.debtSummaryAmount}>
					{currency}
					{formatAmount(debts.reduce((sum, d) => sum + d.remainingAmount, 0))}
				</Text>
				<Text style={styles.debtSummaryLabel}>
					{debts.length} debt{debts.length !== 1 ? "s" : ""} remaining
				</Text>
			</View>

			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Active Debts</Text>
				<TouchableOpacity
					style={styles.addSmallButton}
					onPress={() => setShowAddDebt(true)}
				>
					<Ionicons name="add" size={18} color={theme.primary} />
					<Text style={styles.addSmallText}>Add Debt</Text>
				</TouchableOpacity>
			</View>

			{debts.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="wallet-outline" size={40} color={theme.textMuted} />
					<Text style={styles.emptyText}>No debts tracked</Text>
					<Text style={styles.emptySubtext}>
						Track debts to manage repayments
					</Text>
				</View>
			) : (
				debts.map((debt) => {
					const paidPercentage =
						debt.originalAmount > 0
							? (((debt.originalAmount || 0) - (debt.remainingAmount || 0)) /
									debt.originalAmount) *
							  100
							: 0;
					return (
						<TouchableOpacity
							key={debt.id}
							style={styles.debtItem}
							onPress={() => setShowPayDebt(debt)}
						>
							<View style={styles.debtHeader}>
								<View>
									<Text style={styles.debtName}>{debt.personName}</Text>
									<Text style={styles.debtRate}>
										{(debt.interestRate ?? 0) > 0
											? `${debt.interestRate}% APR`
											: "0% Interest"}
									</Text>
								</View>
								<View style={styles.debtAmounts}>
									<Text style={styles.debtRemaining}>
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
								<Text style={styles.debtMinPayment}>
									{debt.type === "owe" ? "I owe" : "They owe me"}
								</Text>
								<Text style={styles.debtDue}>
									{debt.dueDate ? `Due: ${debt.dueDate}` : "No due date"}
								</Text>
							</View>
						</TouchableOpacity>
					);
				})
			)}
		</ScrollView>
	);

	const categories = Object.entries(EXPENSE_CATEGORIES)
		.filter(([key]) => !budgets.find((b) => b.category === key))
		.map(([key, val]) => ({ key, ...val }));

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
				onRequestClose={() => setShowAddBudget(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Set Category Budget</Text>
							<TouchableOpacity onPress={() => setShowAddBudget(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Category</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.categoryScroll}
						>
							{categories.map((cat) => (
								<TouchableOpacity
									key={cat.key}
									style={[
										styles.categoryOption,
										budgetForm.category === cat.key && {
											backgroundColor: cat.color + "20",
											borderColor: cat.color,
										},
									]}
									onPress={() =>
										setBudgetForm({
											...budgetForm,
											category: cat.key as ExpenseCategory,
										})
									}
								>
									<Ionicons
										name={cat.icon as any}
										size={18}
										color={
											budgetForm.category === cat.key
												? cat.color
												: theme.textMuted
										}
									/>
									<Text
										style={[
											styles.categoryOptionText,
											budgetForm.category === cat.key && { color: cat.color },
										]}
									>
										{cat.name}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>

						<Text style={styles.inputLabel}>Monthly Limit</Text>
						<TextInput
							style={styles.input}
							value={budgetForm.amount}
							onChangeText={(t) => setBudgetForm({ ...budgetForm, amount: t })}
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
						/>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddBudget}
						>
							<Text style={styles.submitButtonText}>Set Budget</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Savings Goal Modal */}
			<Modal
				visible={showAddSavings}
				animationType="slide"
				transparent
				onRequestClose={() => setShowAddSavings(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>New Savings Goal</Text>
							<TouchableOpacity onPress={() => setShowAddSavings(false)}>
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
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
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
						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddSavings}
						>
							<Text style={styles.submitButtonText}>Create Goal</Text>
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
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
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
						<TouchableOpacity
							style={styles.checkboxRow}
							onPress={() =>
								setBillForm({ ...billForm, isRecurring: !billForm.isRecurring })
							}
						>
							<View
								style={[
									styles.checkbox,
									billForm.isRecurring && styles.checkboxChecked,
								]}
							>
								{billForm.isRecurring && (
									<Ionicons name="checkmark" size={14} color="#FFF" />
								)}
							</View>
							<Text style={styles.checkboxLabel}>Recurring monthly</Text>
						</TouchableOpacity>

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

						<Text style={styles.inputLabel}>Debt Name</Text>
						<TextInput
							style={styles.input}
							value={debtForm.name}
							onChangeText={(t) => setDebtForm({ ...debtForm, name: t })}
							placeholder="e.g. Credit Card, Personal Loan"
							placeholderTextColor={theme.textMuted}
						/>

						<Text style={styles.inputLabel}>Total Amount</Text>
						<TextInput
							style={styles.input}
							value={debtForm.totalAmount}
							onChangeText={(t) => setDebtForm({ ...debtForm, totalAmount: t })}
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
						/>

						<Text style={styles.inputLabel}>Interest Rate (%) - Optional</Text>
						<TextInput
							style={styles.input}
							value={debtForm.interestRate}
							onChangeText={(t) =>
								setDebtForm({ ...debtForm, interestRate: t })
							}
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
						/>

						<Text style={styles.inputLabel}>Minimum Monthly Payment</Text>
						<TextInput
							style={styles.input}
							value={debtForm.minimumPayment}
							onChangeText={(t) =>
								setDebtForm({ ...debtForm, minimumPayment: t })
							}
							placeholder="0"
							placeholderTextColor={theme.textMuted}
							keyboardType="numeric"
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
									{showContribute.currentAmount.toLocaleString()} / {currency}
									{showContribute.targetAmount.toLocaleString()}
								</Text>

								<Text style={styles.inputLabel}>Amount to Add</Text>
								<TextInput
									style={styles.input}
									value={contributionAmount}
									onChangeText={setContributionAmount}
									placeholder="0"
									placeholderTextColor={theme.textMuted}
									keyboardType="numeric"
								/>

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
							<Text style={styles.modalTitle}>Make Payment</Text>
							<TouchableOpacity onPress={() => setShowPayDebt(null)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{showPayDebt && (
							<>
								<Text style={styles.contributeGoalName}>
									{showPayDebt.personName}
								</Text>
								<Text style={styles.contributeProgress}>
									{currency}
									{showPayDebt.remainingAmount.toLocaleString()} remaining
								</Text>

								<Text style={styles.inputLabel}>Payment Amount</Text>
								<TextInput
									style={styles.input}
									value={debtPaymentAmount}
									onChangeText={setDebtPaymentAmount}
									placeholder="0"
									placeholderTextColor={theme.textMuted}
									keyboardType="numeric"
								/>

								<TouchableOpacity
									style={styles.submitButton}
									onPress={handlePayDebt}
								>
									<Text style={styles.submitButtonText}>Make Payment</Text>
								</TouchableOpacity>

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
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		tabBar: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingVertical: 12,
			backgroundColor: theme.surface,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		tab: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
			paddingVertical: 8,
			borderRadius: 8,
		},
		tabActive: {
			backgroundColor: theme.primary + "15",
		},
		tabText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textMuted,
		},
		tabTextActive: {
			color: theme.primary,
		},
		tabContent: {
			flex: 1,
			padding: 16,
		},
		overviewCard: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 20,
		},
		overviewRow: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		overviewStatCompact: {
			flex: 1,
			alignItems: "center",
		},
		overviewStatMiddle: {
			borderLeftWidth: 1,
			borderRightWidth: 1,
			borderColor: theme.border,
		},
		overviewLabelCompact: {
			fontSize: 11,
			color: theme.textMuted,
			fontWeight: "500",
			marginBottom: 4,
		},
		overviewValueCompact: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		overviewProgressCompact: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginTop: 14,
			paddingTop: 14,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		overviewProgressBg: {
			flex: 1,
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			overflow: "hidden",
		},
		overviewProgressBar: {
			height: 6,
			borderRadius: 3,
			maxWidth: "100%",
		},
		overviewProgressText: {
			fontSize: 12,
			fontWeight: "600",
			width: 35,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 16,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		sectionSubtitle: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		addSmallButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: theme.primary,
			paddingVertical: 8,
			paddingHorizontal: 14,
			borderRadius: 10,
		},
		addSmallText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#FFF",
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptyText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginTop: 12,
		},
		emptySubtext: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
		},
		budgetItem: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 10,
		},
		budgetHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		budgetCategory: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		budgetIcon: {
			width: 40,
			height: 40,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		budgetName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		budgetLimit: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		budgetProgressContainer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		budgetProgressBg: {
			flex: 1,
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			overflow: "hidden",
		},
		budgetProgressFill: {
			height: "100%",
			borderRadius: 3,
		},
		budgetPercentage: {
			fontSize: 13,
			fontWeight: "600",
			width: 45,
			textAlign: "right",
		},
		savingsItem: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 10,
		},
		savingsHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		savingsIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		savingsInfo: {
			flex: 1,
			marginLeft: 12,
		},
		savingsName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		savingsDeadline: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		savingsAmounts: {
			alignItems: "flex-end",
		},
		savingsTarget: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		savingsCurrent: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		savingsProgressContainer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		savingsProgressBg: {
			flex: 1,
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			overflow: "hidden",
		},
		savingsProgressFill: {
			height: "100%",
			borderRadius: 3,
		},
		savingsPercentage: {
			fontSize: 13,
			fontWeight: "600",
			width: 45,
			textAlign: "right",
		},
		billItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 14,
			marginBottom: 10,
		},
		billCheckbox: {
			width: 24,
			height: 24,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		billCheckboxChecked: {
			backgroundColor: theme.success,
			borderColor: theme.success,
		},
		billInfo: {
			flex: 1,
			marginLeft: 12,
		},
		billName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		billNamePaid: {
			textDecorationLine: "line-through",
			color: theme.textMuted,
		},
		billMeta: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginTop: 4,
		},
		billDue: {
			fontSize: 12,
			color: theme.textMuted,
		},
		recurringBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: 3,
			paddingHorizontal: 6,
			paddingVertical: 2,
			backgroundColor: theme.primary + "15",
			borderRadius: 4,
		},
		recurringText: {
			fontSize: 10,
			color: theme.primary,
			fontWeight: "500",
		},
		billActions: {
			alignItems: "flex-end",
			gap: 8,
		},
		billAmount: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},
		debtSummary: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 24,
			alignItems: "center",
			marginBottom: 20,
		},
		debtSummaryTitle: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 8,
		},
		debtSummaryAmount: {
			fontSize: 32,
			fontWeight: "700",
			color: theme.error,
		},
		debtSummaryLabel: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
		},
		debtItem: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 10,
		},
		debtHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		debtName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		debtRate: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		debtAmounts: {
			alignItems: "flex-end",
		},
		debtRemaining: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.error,
		},
		debtOriginal: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		debtProgressContainer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginBottom: 12,
		},
		debtProgressBg: {
			flex: 1,
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			overflow: "hidden",
		},
		debtProgressFill: {
			height: "100%",
			borderRadius: 3,
		},
		debtProgressText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.success,
			width: 55,
			textAlign: "right",
		},
		debtFooter: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		debtMinPayment: {
			fontSize: 12,
			color: theme.textMuted,
		},
		debtDue: {
			fontSize: 12,
			color: theme.textMuted,
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			maxHeight: "80%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
			marginTop: 12,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 15,
			color: theme.text,
		},
		categoryScroll: {
			maxHeight: 48,
		},
		categoryOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 10,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 10,
			marginRight: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		categoryOptionText: {
			fontSize: 12,
			color: theme.textMuted,
			fontWeight: "500",
		},
		checkboxRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginTop: 16,
		},
		checkbox: {
			width: 22,
			height: 22,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		checkboxChecked: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		checkboxLabel: {
			fontSize: 14,
			color: theme.text,
		},
		datePickerButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			backgroundColor: theme.surface,
			paddingVertical: 14,
			paddingHorizontal: 16,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 16,
		},
		datePickerText: {
			fontSize: 15,
			color: theme.text,
			flex: 1,
		},
		submitButton: {
			backgroundColor: theme.primary,
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 20,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
		contributeGoalName: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			textAlign: "center",
		},
		contributeProgress: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 4,
		},
		deleteDebtButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 14,
			marginTop: 12,
		},
		deleteDebtText: {
			fontSize: 14,
			color: theme.error,
			fontWeight: "500",
		},
	});
