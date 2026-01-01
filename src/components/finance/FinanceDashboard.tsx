// Finance Dashboard - Main overview with quick actions

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
	Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Theme } from "@/src/context/themeContext";
import { useFinanceStore } from "@/src/context/financeStore";
import {
	Account,
	Transaction,
	TransactionType,
	ExpenseCategory,
	IncomeCategory,
	PaymentMethod,
	EXPENSE_CATEGORIES,
	INCOME_CATEGORIES,
	COLORS,
} from "@/src/types/finance";

const { width } = Dimensions.get("window");

interface FinanceDashboardProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

export default function FinanceDashboard({
	theme,
	currency,
	onOpenDrawer,
}: FinanceDashboardProps) {
	const {
		accounts,
		transactions,
		savingsGoals,
		billReminders,
		debts,
		addAccount,
		addTransaction,
		getFinancialSummary,
		getUpcomingBills,
		getNetWorth,
	} = useFinanceStore();

	const styles = createStyles(theme);

	const [showAddAccount, setShowAddAccount] = useState(false);
	const [showAddTransaction, setShowAddTransaction] = useState(false);
	const [transactionType, setTransactionType] =
		useState<TransactionType>("expense");
	const [hideBalance, setHideBalance] = useState(false);

	// Add Account Form State
	const [accountName, setAccountName] = useState("");
	const [accountType, setAccountType] = useState<Account["type"]>("bank");
	const [accountBalance, setAccountBalance] = useState("");
	const [accountColor, setAccountColor] = useState(COLORS[0]);

	// Add Transaction Form State
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		ExpenseCategory | IncomeCategory
	>("food");
	const [selectedAccount, setSelectedAccount] = useState<string>("");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");

	// Analytics
	const today = new Date().toISOString().split("T")[0];
	const startOfMonth = new Date(
		new Date().getFullYear(),
		new Date().getMonth(),
		1
	)
		.toISOString()
		.split("T")[0];

	const monthSummary = useMemo(() => {
		return getFinancialSummary(startOfMonth, today);
	}, [transactions, startOfMonth, today]);

	const netWorth = useMemo(() => getNetWorth(), [accounts]);
	const upcomingBills = useMemo(() => getUpcomingBills(7), [billReminders]);

	const recentTransactions = useMemo(() => {
		return transactions.slice(0, 5);
	}, [transactions]);

	const handleAddAccount = () => {
		if (!accountName.trim()) {
			Alert.alert("Error", "Please enter account name");
			return;
		}

		addAccount({
			name: accountName,
			type: accountType,
			balance: parseFloat(accountBalance) || 0,
			currency: "INR",
			color: accountColor,
			icon:
				accountType === "cash"
					? "cash"
					: accountType === "credit_card"
					? "card"
					: "wallet",
			isDefault: accounts.length === 0,
		});

		setAccountName("");
		setAccountBalance("");
		setAccountType("bank");
		setShowAddAccount(false);
		Alert.alert("Success", "Account added successfully!");
	};

	const handleAddTransaction = () => {
		if (!amount || parseFloat(amount) <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}
		if (!description.trim()) {
			Alert.alert("Error", "Please enter a description");
			return;
		}
		if (!selectedAccount) {
			Alert.alert("Error", "Please select an account");
			return;
		}

		addTransaction({
			type: transactionType,
			amount: parseFloat(amount),
			category: selectedCategory,
			description: description.trim(),
			date: today,
			time: new Date().toTimeString().split(" ")[0],
			accountId: selectedAccount,
			paymentMethod,
			isRecurring: false,
		});

		setAmount("");
		setDescription("");
		setShowAddTransaction(false);
		Alert.alert("Success", "Transaction added successfully!");
	};

	const formatAmount = (value: number) => {
		if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
		if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
		if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
		return value.toFixed(0);
	};

	const accountTypes: Account["type"][] = [
		"cash",
		"bank",
		"credit_card",
		"wallet",
		"investment",
	];
	const paymentMethods: PaymentMethod[] = [
		"cash",
		"credit_card",
		"debit_card",
		"upi",
		"net_banking",
		"wallet",
	];

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.headerGreeting}>
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							day: "numeric",
							month: "short",
						})}
					</Text>
					<Text style={styles.headerTitle}>My Finances</Text>
				</View>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={styles.headerButton}
						onPress={() => setShowAddTransaction(true)}
					>
						<Ionicons name="add" size={22} color={theme.text} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Balance Card */}
			<View style={styles.balanceCard}>
				<View style={styles.balanceHeader}>
					<View style={styles.balanceHeaderLeft}>
						<Ionicons
							name="wallet-outline"
							size={18}
							color="rgba(255,255,255,0.8)"
						/>
						<Text style={styles.balanceLabel}>Total Balance</Text>
					</View>
					<TouchableOpacity
						style={styles.eyeButton}
						onPress={() => setHideBalance(!hideBalance)}
					>
						<Ionicons
							name={hideBalance ? "eye-off-outline" : "eye-outline"}
							size={20}
							color="rgba(255,255,255,0.8)"
						/>
					</TouchableOpacity>
				</View>
				<Text style={styles.balanceAmount}>
					{hideBalance ? "••••••" : `${currency}${formatAmount(netWorth)}`}
				</Text>
				<View style={styles.balanceStats}>
					<View style={styles.balanceStat}>
						<View style={styles.balanceStatIcon}>
							<Ionicons name="trending-up" size={14} color="#4ADE80" />
						</View>
						<View>
							<Text style={styles.balanceStatValue}>
								{hideBalance
									? "••••"
									: `${currency}${formatAmount(monthSummary.totalIncome)}`}
							</Text>
							<Text style={styles.balanceStatLabel}>Income</Text>
						</View>
					</View>
					<View style={styles.balanceStatDivider} />
					<View style={styles.balanceStat}>
						<View
							style={[
								styles.balanceStatIcon,
								{ backgroundColor: "rgba(248,113,113,0.2)" },
							]}
						>
							<Ionicons name="trending-down" size={14} color="#F87171" />
						</View>
						<View>
							<Text style={styles.balanceStatValue}>
								{hideBalance
									? "••••"
									: `${currency}${formatAmount(monthSummary.totalExpenses)}`}
							</Text>
							<Text style={styles.balanceStatLabel}>Expenses</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Quick Actions */}
			<View style={styles.quickActionsCard}>
				<TouchableOpacity
					style={styles.quickAction}
					onPress={() => {
						setTransactionType("expense");
						setSelectedCategory("food");
						setShowAddTransaction(true);
					}}
				>
					<View
						style={[
							styles.quickActionIcon,
							{ backgroundColor: theme.error + "15" },
						]}
					>
						<Ionicons name="arrow-up-outline" size={20} color={theme.error} />
					</View>
					<Text style={styles.quickActionText}>Expense</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.quickAction}
					onPress={() => {
						setTransactionType("income");
						setSelectedCategory("salary");
						setShowAddTransaction(true);
					}}
				>
					<View
						style={[
							styles.quickActionIcon,
							{ backgroundColor: theme.success + "15" },
						]}
					>
						<Ionicons
							name="arrow-down-outline"
							size={20}
							color={theme.success}
						/>
					</View>
					<Text style={styles.quickActionText}>Income</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.quickAction}
					onPress={() => {
						setTransactionType("transfer");
						setShowAddTransaction(true);
					}}
				>
					<View
						style={[
							styles.quickActionIcon,
							{ backgroundColor: theme.primary + "15" },
						]}
					>
						<Ionicons
							name="swap-horizontal-outline"
							size={20}
							color={theme.primary}
						/>
					</View>
					<Text style={styles.quickActionText}>Transfer</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.quickAction}
					onPress={() => setShowAddAccount(true)}
				>
					<View
						style={[
							styles.quickActionIcon,
							{ backgroundColor: theme.accent + "15" },
						]}
					>
						<Ionicons name="card-outline" size={20} color={theme.accent} />
					</View>
					<Text style={styles.quickActionText}>Account</Text>
				</TouchableOpacity>
			</View>

			{/* Accounts */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>My Accounts</Text>
					<TouchableOpacity
						style={styles.sectionAction}
						onPress={() => setShowAddAccount(true)}
					>
						<Ionicons name="add" size={18} color={theme.primary} />
					</TouchableOpacity>
				</View>

				{accounts.length === 0 ? (
					<TouchableOpacity
						style={styles.emptyCard}
						onPress={() => setShowAddAccount(true)}
					>
						<View style={styles.emptyIconWrapper}>
							<Ionicons name="wallet-outline" size={28} color={theme.primary} />
						</View>
						<Text style={styles.emptyTitle}>No accounts yet</Text>
						<Text style={styles.emptySubtitle}>
							Tap to add your first account
						</Text>
					</TouchableOpacity>
				) : (
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{accounts.map((account) => (
							<TouchableOpacity key={account.id} style={styles.accountCard}>
								<View
									style={[
										styles.accountIconWrapper,
										{ backgroundColor: account.color + "20" },
									]}
								>
									<Ionicons
										name={
											account.type === "cash"
												? "cash-outline"
												: account.type === "credit_card"
												? "card-outline"
												: account.type === "investment"
												? "trending-up-outline"
												: "wallet-outline"
										}
										size={20}
										color={account.color}
									/>
								</View>
								<Text style={styles.accountName} numberOfLines={1}>
									{account.name}
								</Text>
								<Text style={styles.accountType}>
									{account.type.replace("_", " ")}
								</Text>
								<Text style={styles.accountBalance}>
									{hideBalance
										? "••••"
										: `${currency}${formatAmount(account.balance)}`}
								</Text>
							</TouchableOpacity>
						))}
						<TouchableOpacity
							style={styles.addAccountCard}
							onPress={() => setShowAddAccount(true)}
						>
							<View style={styles.addAccountIcon}>
								<Ionicons name="add" size={24} color={theme.primary} />
							</View>
							<Text style={styles.addAccountText}>Add</Text>
						</TouchableOpacity>
					</ScrollView>
				)}
			</View>

			{/* Spending Insights */}
			{monthSummary.topCategories.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Top Spending</Text>
						<Text style={styles.sectionBadge}>This Month</Text>
					</View>

					<View style={styles.spendingCard}>
						{monthSummary.topCategories.slice(0, 3).map((cat, index) => {
							const catInfo = EXPENSE_CATEGORIES[cat.category];
							return (
								<View key={cat.category} style={styles.spendingItem}>
									<View
										style={[
											styles.spendingIcon,
											{ backgroundColor: catInfo.color + "15" },
										]}
									>
										<Ionicons
											name={catInfo.icon as any}
											size={18}
											color={catInfo.color}
										/>
									</View>
									<View style={styles.spendingInfo}>
										<View style={styles.spendingHeader}>
											<Text style={styles.spendingCategory}>
												{catInfo.name}
											</Text>
											<Text style={styles.spendingAmount}>
												{hideBalance
													? "••••"
													: `${currency}${formatAmount(cat.amount)}`}
											</Text>
										</View>
										<View style={styles.spendingBarBg}>
											<View
												style={[
													styles.spendingBar,
													{
														width: `${cat.percentage}%`,
														backgroundColor: catInfo.color,
													},
												]}
											/>
										</View>
									</View>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Upcoming Bills */}
			{upcomingBills.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Upcoming Bills</Text>
						<Text style={styles.sectionBadge}>Next 7 Days</Text>
					</View>

					<View style={styles.billsCard}>
						{upcomingBills.map((bill) => {
							const catInfo = EXPENSE_CATEGORIES[bill.category];
							const daysLeft = Math.ceil(
								(new Date(bill.dueDate).getTime() - new Date().getTime()) /
									(1000 * 60 * 60 * 24)
							);
							return (
								<View key={bill.id} style={styles.billItem}>
									<View
										style={[
											styles.billIcon,
											{ backgroundColor: catInfo.color + "15" },
										]}
									>
										<Ionicons
											name={catInfo.icon as any}
											size={18}
											color={catInfo.color}
										/>
									</View>
									<View style={styles.billInfo}>
										<Text style={styles.billName}>{bill.name}</Text>
										<View style={styles.billDueWrapper}>
											<Ionicons
												name="time-outline"
												size={12}
												color={theme.warning}
											/>
											<Text style={styles.billDue}>
												{daysLeft === 0 ? "Due Today" : `${daysLeft} days left`}
											</Text>
										</View>
									</View>
									<Text style={styles.billAmount}>
										{hideBalance
											? "••••"
											: `${currency}${formatAmount(bill.amount)}`}
									</Text>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* Recent Transactions */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Recent Transactions</Text>
					<TouchableOpacity>
						<Text style={styles.seeAll}>See All</Text>
					</TouchableOpacity>
				</View>

				{recentTransactions.length === 0 ? (
					<View style={styles.emptyCard}>
						<View style={styles.emptyIconWrapper}>
							<Ionicons
								name="receipt-outline"
								size={28}
								color={theme.primary}
							/>
						</View>
						<Text style={styles.emptyTitle}>No transactions yet</Text>
						<Text style={styles.emptySubtitle}>
							Your transactions will appear here
						</Text>
					</View>
				) : (
					<View style={styles.transactionsCard}>
						{recentTransactions.map((transaction, index) => {
							const catInfo =
								transaction.type === "income"
									? INCOME_CATEGORIES[transaction.category as IncomeCategory]
									: EXPENSE_CATEGORIES[transaction.category as ExpenseCategory];
							const isLast = index === recentTransactions.length - 1;
							return (
								<View
									key={transaction.id}
									style={[
										styles.transactionItem,
										!isLast && styles.transactionItemBorder,
									]}
								>
									<View
										style={[
											styles.transactionIcon,
											{
												backgroundColor:
													(catInfo?.color || theme.primary) + "15",
											},
										]}
									>
										<Ionicons
											name={(catInfo?.icon as any) || "ellipsis-horizontal"}
											size={18}
											color={catInfo?.color || theme.text}
										/>
									</View>
									<View style={styles.transactionInfo}>
										<Text
											style={styles.transactionDescription}
											numberOfLines={1}
										>
											{transaction.description}
										</Text>
										<Text style={styles.transactionCategory}>
											{catInfo?.name || transaction.category}
										</Text>
									</View>
									<Text
										style={[
											styles.transactionAmount,
											{
												color:
													transaction.type === "income"
														? theme.success
														: transaction.type === "expense"
														? theme.error
														: theme.primary,
											},
										]}
									>
										{transaction.type === "income" ? "+" : "-"}
										{hideBalance
											? "••••"
											: `${currency}${formatAmount(transaction.amount)}`}
									</Text>
								</View>
							);
						})}
					</View>
				)}
			</View>

			{/* Savings Goals Preview */}
			{savingsGoals.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Savings Goals</Text>
						<TouchableOpacity>
							<Text style={styles.seeAll}>See All</Text>
						</TouchableOpacity>
					</View>

					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{savingsGoals.slice(0, 3).map((goal) => {
							const progress = (goal.currentAmount / goal.targetAmount) * 100;
							return (
								<View key={goal.id} style={styles.goalCard}>
									<View
										style={[
											styles.goalIconWrapper,
											{ backgroundColor: goal.color + "20" },
										]}
									>
										<Ionicons
											name={goal.icon as any}
											size={20}
											color={goal.color}
										/>
									</View>
									<Text style={styles.goalName} numberOfLines={1}>
										{goal.name}
									</Text>
									<View style={styles.goalProgressBg}>
										<View
											style={[
												styles.goalProgressBar,
												{
													width: `${Math.min(100, progress)}%`,
													backgroundColor: goal.color,
												},
											]}
										/>
									</View>
									<View style={styles.goalAmounts}>
										<Text style={styles.goalCurrent}>
											{hideBalance
												? "••••"
												: `${currency}${formatAmount(goal.currentAmount)}`}
										</Text>
										<Text style={styles.goalTarget}>
											/ {currency}
											{formatAmount(goal.targetAmount)}
										</Text>
									</View>
								</View>
							);
						})}
					</ScrollView>
				</View>
			)}

			<View style={{ height: 30 }} />

			{/* Add Account Modal */}
			<Modal visible={showAddAccount} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Account</Text>
							<TouchableOpacity onPress={() => setShowAddAccount(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Account Name</Text>
								<TextInput
									style={styles.formInput}
									value={accountName}
									onChangeText={setAccountName}
									placeholder="e.g., HDFC Savings"
									placeholderTextColor={theme.textMuted}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Account Type</Text>
								<View style={styles.typeSelector}>
									{accountTypes.map((type) => (
										<TouchableOpacity
											key={type}
											style={[
												styles.typeOption,
												accountType === type && styles.typeOptionActive,
											]}
											onPress={() => setAccountType(type)}
										>
											<Ionicons
												name={
													type === "cash"
														? "cash"
														: type === "credit_card"
														? "card"
														: type === "investment"
														? "trending-up"
														: "wallet"
												}
												size={20}
												color={accountType === type ? "#FFF" : theme.text}
											/>
											<Text
												style={[
													styles.typeOptionText,
													accountType === type && styles.typeOptionTextActive,
												]}
											>
												{type.replace("_", " ")}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Current Balance</Text>
								<TextInput
									style={styles.formInput}
									value={accountBalance}
									onChangeText={setAccountBalance}
									placeholder="0"
									placeholderTextColor={theme.textMuted}
									keyboardType="numeric"
								/>
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Color</Text>
								<View style={styles.colorSelector}>
									{COLORS.map((color) => (
										<TouchableOpacity
											key={color}
											style={[
												styles.colorOption,
												{ backgroundColor: color },
												accountColor === color && styles.colorOptionActive,
											]}
											onPress={() => setAccountColor(color)}
										>
											{accountColor === color && (
												<Ionicons name="checkmark" size={16} color="#FFF" />
											)}
										</TouchableOpacity>
									))}
								</View>
							</View>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleAddAccount}
							>
								<Text style={styles.submitButtonText}>Add Account</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Add Transaction Modal */}
			<Modal visible={showAddTransaction} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Add{" "}
								{transactionType.charAt(0).toUpperCase() +
									transactionType.slice(1)}
							</Text>
							<TouchableOpacity onPress={() => setShowAddTransaction(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Transaction Type Tabs */}
							<View style={styles.transactionTypeTabs}>
								{(["expense", "income", "transfer"] as TransactionType[]).map(
									(type) => (
										<TouchableOpacity
											key={type}
											style={[
												styles.transactionTypeTab,
												transactionType === type &&
													styles.transactionTypeTabActive,
											]}
											onPress={() => {
												setTransactionType(type);
												if (type === "income") setSelectedCategory("salary");
												else if (type === "expense")
													setSelectedCategory("food");
											}}
										>
											<Text
												style={[
													styles.transactionTypeText,
													transactionType === type &&
														styles.transactionTypeTextActive,
												]}
											>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</Text>
										</TouchableOpacity>
									)
								)}
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Amount</Text>
								<View style={styles.amountInput}>
									<Text style={styles.currencySymbol}>{currency}</Text>
									<TextInput
										style={styles.amountField}
										value={amount}
										onChangeText={setAmount}
										placeholder="0"
										placeholderTextColor={theme.textMuted}
										keyboardType="numeric"
									/>
								</View>
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Description</Text>
								<TextInput
									style={styles.formInput}
									value={description}
									onChangeText={setDescription}
									placeholder="What's this for?"
									placeholderTextColor={theme.textMuted}
								/>
							</View>

							{transactionType !== "transfer" && (
								<View style={styles.formGroup}>
									<Text style={styles.formLabel}>Category</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false}>
										<View style={styles.categorySelector}>
											{Object.entries(
												transactionType === "income"
													? INCOME_CATEGORIES
													: EXPENSE_CATEGORIES
											).map(([key, cat]) => (
												<TouchableOpacity
													key={key}
													style={[
														styles.categoryOption,
														selectedCategory === key && {
															backgroundColor: cat.color + "30",
															borderColor: cat.color,
														},
													]}
													onPress={() => setSelectedCategory(key as any)}
												>
													<Ionicons
														name={cat.icon as any}
														size={20}
														color={
															selectedCategory === key
																? cat.color
																: theme.textMuted
														}
													/>
													<Text
														style={[
															styles.categoryText,
															selectedCategory === key && { color: cat.color },
														]}
														numberOfLines={1}
													>
														{cat.name}
													</Text>
												</TouchableOpacity>
											))}
										</View>
									</ScrollView>
								</View>
							)}

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Account</Text>
								<View style={styles.accountSelector}>
									{accounts.map((acc) => (
										<TouchableOpacity
											key={acc.id}
											style={[
												styles.accountOption,
												selectedAccount === acc.id && {
													backgroundColor: acc.color + "20",
													borderColor: acc.color,
												},
											]}
											onPress={() => setSelectedAccount(acc.id)}
										>
											<Text
												style={[
													styles.accountOptionText,
													selectedAccount === acc.id && { color: acc.color },
												]}
											>
												{acc.name}
											</Text>
										</TouchableOpacity>
									))}
								</View>
								{accounts.length === 0 && (
									<TouchableOpacity
										style={styles.addAccountHint}
										onPress={() => {
											setShowAddTransaction(false);
											setShowAddAccount(true);
										}}
									>
										<Ionicons
											name="add-circle-outline"
											size={16}
											color={theme.primary}
										/>
										<Text style={styles.addAccountHintText}>
											Add an account first
										</Text>
									</TouchableOpacity>
								)}
							</View>

							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Payment Method</Text>
								<View style={styles.paymentSelector}>
									{paymentMethods.map((method) => (
										<TouchableOpacity
											key={method}
											style={[
												styles.paymentOption,
												paymentMethod === method && styles.paymentOptionActive,
											]}
											onPress={() => setPaymentMethod(method)}
										>
											<Text
												style={[
													styles.paymentText,
													paymentMethod === method && styles.paymentTextActive,
												]}
											>
												{method.replace("_", " ").toUpperCase()}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleAddTransaction}
							>
								<Text style={styles.submitButtonText}>Add Transaction</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</ScrollView>
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
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 8,
			paddingBottom: 16,
		},
		headerGreeting: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 2,
		},
		headerTitle: {
			fontSize: 26,
			fontWeight: "700",
			color: theme.text,
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		headerButton: {
			width: 42,
			height: 42,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},

		// Balance Card
		balanceCard: {
			marginHorizontal: 20,
			marginBottom: 20,
			padding: 24,
			backgroundColor: theme.primary,
			borderRadius: 24,
		},
		balanceHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		balanceHeaderLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		balanceLabel: {
			fontSize: 14,
			color: "rgba(255,255,255,0.85)",
			fontWeight: "500",
		},
		eyeButton: {
			width: 36,
			height: 36,
			borderRadius: 12,
			backgroundColor: "rgba(255,255,255,0.15)",
			justifyContent: "center",
			alignItems: "center",
		},
		balanceAmount: {
			fontSize: 40,
			fontWeight: "700",
			color: "#FFF",
			marginTop: 12,
			marginBottom: 20,
		},
		balanceStats: {
			flexDirection: "row",
			alignItems: "center",
		},
		balanceStat: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		balanceStatIcon: {
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: "rgba(74,222,128,0.2)",
			justifyContent: "center",
			alignItems: "center",
		},
		balanceStatValue: {
			fontSize: 15,
			fontWeight: "700",
			color: "#FFF",
		},
		balanceStatLabel: {
			fontSize: 12,
			color: "rgba(255,255,255,0.7)",
			marginTop: 1,
		},
		balanceStatDivider: {
			width: 1,
			height: 36,
			backgroundColor: "rgba(255,255,255,0.2)",
			marginHorizontal: 12,
		},

		// Quick Actions
		quickActionsCard: {
			flexDirection: "row",
			marginHorizontal: 20,
			marginBottom: 24,
			padding: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
			justifyContent: "space-around",
		},
		quickAction: {
			alignItems: "center",
			gap: 8,
		},
		quickActionIcon: {
			width: 52,
			height: 52,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
		},
		quickActionText: {
			fontSize: 12,
			color: theme.textSecondary,
			fontWeight: "600",
		},

		// Sections
		section: {
			marginBottom: 24,
			paddingHorizontal: 20,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 14,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		sectionBadge: {
			fontSize: 12,
			color: theme.primary,
			fontWeight: "600",
			backgroundColor: theme.primary + "15",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 8,
		},
		sectionAction: {
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
		},
		seeAll: {
			fontSize: 14,
			color: theme.primary,
			fontWeight: "600",
		},

		// Empty State
		emptyCard: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 32,
			alignItems: "center",
		},
		emptyIconWrapper: {
			width: 56,
			height: 56,
			borderRadius: 16,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		emptyTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		emptySubtitle: {
			fontSize: 13,
			color: theme.textMuted,
		},

		// Account Cards
		accountCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			marginRight: 12,
			width: 150,
		},
		accountIconWrapper: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 14,
		},
		accountName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 2,
		},
		accountType: {
			fontSize: 12,
			color: theme.textMuted,
			textTransform: "capitalize",
			marginBottom: 10,
		},
		accountBalance: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		addAccountCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			width: 100,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: theme.border,
			borderStyle: "dashed",
		},
		addAccountIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 8,
		},
		addAccountText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
		},

		// Spending
		spendingCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			gap: 16,
		},
		spendingItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 14,
		},
		spendingIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		spendingInfo: {
			flex: 1,
		},
		spendingHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		spendingCategory: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		spendingAmount: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
		},
		spendingBarBg: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
		},
		spendingBar: {
			height: 6,
			borderRadius: 3,
		},

		// Bills
		billsCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			overflow: "hidden",
		},
		billItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 14,
			gap: 14,
		},
		billIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		billInfo: {
			flex: 1,
		},
		billName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		billDueWrapper: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		billDue: {
			fontSize: 12,
			color: theme.warning,
			fontWeight: "500",
		},
		billAmount: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},

		// Transactions
		transactionsCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			overflow: "hidden",
		},
		transactionItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 14,
			gap: 14,
		},
		transactionItemBorder: {
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		transactionIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		transactionInfo: {
			flex: 1,
		},
		transactionDescription: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 2,
		},
		transactionCategory: {
			fontSize: 12,
			color: theme.textMuted,
		},
		transactionAmount: {
			fontSize: 15,
			fontWeight: "700",
		},

		// Goals
		goalCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			marginRight: 12,
			width: 170,
		},
		goalIconWrapper: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		goalName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		goalProgressBg: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			marginBottom: 10,
		},
		goalProgressBar: {
			height: 6,
			borderRadius: 3,
		},
		goalAmounts: {
			flexDirection: "row",
			alignItems: "baseline",
		},
		goalCurrent: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},
		goalTarget: {
			fontSize: 12,
			color: theme.textMuted,
			marginLeft: 4,
		},

		// Modal Styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "90%",
			padding: 20,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		formGroup: {
			marginBottom: 20,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		typeSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		typeOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 10,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		typeOptionActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		typeOptionText: {
			fontSize: 12,
			color: theme.text,
			fontWeight: "500",
			textTransform: "capitalize",
		},
		typeOptionTextActive: {
			color: "#FFF",
		},
		colorSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		colorOption: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		colorOptionActive: {
			borderWidth: 3,
			borderColor: "#FFF",
		},
		submitButton: {
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 10,
			marginBottom: 20,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
		transactionTypeTabs: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		transactionTypeTab: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 10,
		},
		transactionTypeTabActive: {
			backgroundColor: theme.primary,
		},
		transactionTypeText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		transactionTypeTextActive: {
			color: "#FFF",
		},
		amountInput: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 14,
			borderWidth: 1,
			borderColor: theme.border,
		},
		currencySymbol: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginRight: 8,
		},
		amountField: {
			flex: 1,
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			paddingVertical: 14,
		},
		categorySelector: {
			flexDirection: "row",
			gap: 8,
		},
		categoryOption: {
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			minWidth: 80,
			gap: 6,
		},
		categoryText: {
			fontSize: 11,
			color: theme.textMuted,
			fontWeight: "500",
		},
		accountSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		accountOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		accountOptionText: {
			fontSize: 14,
			color: theme.text,
			fontWeight: "500",
		},
		addAccountHint: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginTop: 8,
		},
		addAccountHintText: {
			fontSize: 13,
			color: theme.primary,
		},
		paymentSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		paymentOption: {
			paddingVertical: 8,
			paddingHorizontal: 12,
			backgroundColor: theme.surface,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		paymentOptionActive: {
			backgroundColor: theme.primary + "20",
			borderColor: theme.primary,
		},
		paymentText: {
			fontSize: 11,
			color: theme.textMuted,
			fontWeight: "500",
		},
		paymentTextActive: {
			color: theme.primary,
		},
	});
