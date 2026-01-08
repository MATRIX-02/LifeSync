// Transaction List - Full transaction history with filters

import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import {
	ExpenseCategory,
	IncomeCategory,
	Transaction,
} from "@/src/context/financeStoreDB/types";
import { Theme } from "@/src/context/themeContext";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
	FlatList,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface TransactionListProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentMonthTransactionCount?: number;
}

type FilterType = "all" | "income" | "expense" | "transfer";
type SortType = "date" | "amount" | "category";
type DateFilter = "all" | "today" | "week" | "month" | "year";

interface GroupedTransactions {
	date: string;
	displayDate: string;
	transactions: Transaction[];
	totalIncome: number;
	totalExpense: number;
}

export default function TransactionList({
	theme,
	currency,
	onOpenDrawer,
	subscriptionCheck,
	currentMonthTransactionCount = 0,
}: TransactionListProps) {
	const { transactions, accounts, deleteTransaction, updateTransaction } =
		useFinanceStore();

	const styles = createStyles(theme);

	const [filterType, setFilterType] = useState<FilterType>("all");
	const [dateFilter, setDateFilter] = useState<DateFilter>("month");
	const [searchQuery, setSearchQuery] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editForm, setEditForm] = useState({
		amount: "",
		description: "",
		category: "" as ExpenseCategory | IncomeCategory,
		note: "",
	});

	// Filter and group transactions
	const groupedTransactions = useMemo(() => {
		let filtered = [...transactions];

		// Apply type filter
		if (filterType !== "all") {
			filtered = filtered.filter((t) => t.type === filterType);
		}

		// Apply date filter
		const now = new Date();
		const today = now.toISOString().split("T")[0];
		if (dateFilter === "today") {
			filtered = filtered.filter((t) => t.date === today);
		} else if (dateFilter === "week") {
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];
			filtered = filtered.filter((t) => t.date >= weekAgo);
		} else if (dateFilter === "month") {
			const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];
			filtered = filtered.filter((t) => t.date >= monthAgo);
		} else if (dateFilter === "year") {
			const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];
			filtered = filtered.filter((t) => t.date >= yearAgo);
		}

		// Apply category filter
		if (selectedCategory) {
			filtered = filtered.filter((t) => t.category === selectedCategory);
		}

		// Apply account filter
		if (selectedAccount) {
			filtered = filtered.filter((t) => t.accountId === selectedAccount);
		}

		// Apply search filter (description, category, and amount)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			const searchAmount = searchQuery.replace(/[^0-9.]/g, ""); // Extract numeric part
			const isNumericSearch = searchAmount.length > 0;

			filtered = filtered.filter((t) => {
				// If search contains numbers, check if amount includes those digits
				if (isNumericSearch) {
					const amountStr = t.amount.toString();
					if (amountStr.includes(searchAmount)) {
						return true;
					}
				}
				// Otherwise, check description and category
				return (
					(t.description?.toLowerCase() || "").includes(query) ||
					t.category.toLowerCase().includes(query)
				);
			});
		}

		// Sort by date descending
		filtered.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);

		// Group by date
		const groups: Record<string, GroupedTransactions> = {};
		filtered.forEach((t) => {
			if (!groups[t.date]) {
				const date = new Date(t.date);
				const isToday = t.date === today;
				const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];
				const isYesterday = t.date === yesterday;

				let displayDate = date.toLocaleDateString("en-US", {
					weekday: "long",
					month: "short",
					day: "numeric",
				});
				if (isToday) displayDate = "Today";
				else if (isYesterday) displayDate = "Yesterday";

				groups[t.date] = {
					date: t.date,
					displayDate,
					transactions: [],
					totalIncome: 0,
					totalExpense: 0,
				};
			}
			groups[t.date].transactions.push(t);
			if (t.type === "income") groups[t.date].totalIncome += t.amount;
			else if (t.type === "expense") groups[t.date].totalExpense += t.amount;
		});

		return Object.values(groups).sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [
		transactions,
		filterType,
		dateFilter,
		selectedCategory,
		selectedAccount,
		searchQuery,
	]);

	const handleDeleteTransaction = (transaction: Transaction) => {
		Alert.alert(
			"Delete Transaction",
			`Delete "${transaction.description || "this transaction"}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						deleteTransaction(transaction.id);
						setSelectedTransaction(null);
					},
				},
			]
		);
	};

	const handleEditTransaction = (transaction: Transaction) => {
		setEditForm({
			amount: transaction.amount.toString(),
			description: transaction.description || "",
			category: transaction.category as ExpenseCategory | IncomeCategory,
			note: transaction.notes || "",
		});
		setShowEditModal(true);
	};

	const handleSaveEdit = () => {
		if (!selectedTransaction) return;

		const amount = parseFloat(editForm.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}

		updateTransaction(selectedTransaction.id, {
			amount,
			description: editForm.description || undefined,
			category: editForm.category,
			notes: editForm.note || undefined,
		});

		setShowEditModal(false);
		setSelectedTransaction(null);
		Alert.alert("Success", "Transaction updated successfully");
	};

	const formatAmount = (value: number) => {
		return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
	};

	const getAccountName = (accountId: string) => {
		const account = accounts.find((a) => a.id === accountId);
		return account?.name || "Unknown";
	};

	const getClosingBalance = (transaction: Transaction): number => {
		const account = accounts.find((acc) => acc.id === transaction.accountId);
		if (!account) return 0;

		// Get all transactions for this account up to and including current transaction
		const relatedTransactions = transactions
			.filter((t) => t.accountId === transaction.accountId)
			.sort(
				(a, b) =>
					new Date(a.date).getTime() - new Date(b.date).getTime() ||
					(a.time < b.time ? -1 : 1)
			);

		let balance = account.balance;
		for (const t of relatedTransactions) {
			if (t.id === transaction.id) {
				break;
			}
			if (t.type === "income") {
				balance += t.amount;
			} else if (t.type === "expense") {
				balance -= t.amount;
			} else if (
				t.type === "transfer" &&
				t.toAccountId === transaction.accountId
			) {
				balance += t.amount;
			} else if (t.type === "transfer") {
				balance -= t.amount;
			}
		}

		// Apply the current transaction
		if (transaction.type === "income") {
			balance += transaction.amount;
		} else if (transaction.type === "expense") {
			balance -= transaction.amount;
		} else if (
			transaction.type === "transfer" &&
			transaction.toAccountId === account.id
		) {
			balance += transaction.amount;
		} else if (transaction.type === "transfer") {
			balance -= transaction.amount;
		}

		return balance;
	};

	const renderTransactionItem = (transaction: Transaction) => {
		const catInfo =
			transaction.type === "income"
				? INCOME_CATEGORIES[transaction.category as IncomeCategory]
				: EXPENSE_CATEGORIES[transaction.category as ExpenseCategory];

		const closingBalance = getClosingBalance(transaction);

		return (
			<TouchableOpacity
				key={transaction.id}
				style={styles.transactionItem}
				onPress={() => setSelectedTransaction(transaction)}
				activeOpacity={0.7}
			>
				<View
					style={[
						styles.transactionIcon,
						{ backgroundColor: catInfo?.color + "20" || theme.surface },
					]}
				>
					<Ionicons
						name={(catInfo?.icon as any) || "ellipsis-horizontal"}
						size={20}
						color={catInfo?.color || theme.text}
					/>
				</View>
				<View style={styles.transactionInfo}>
					<Text style={styles.transactionDescription} numberOfLines={1}>
						{transaction.description}
					</Text>
					<Text style={styles.transactionMeta}>
						{catInfo?.name || transaction.category} •{" "}
						{getAccountName(transaction.accountId)}
					</Text>
					<Text style={styles.transactionBalance} numberOfLines={1}>
						Closing Balance: {currency}
						{formatAmount(closingBalance)}
					</Text>
				</View>
				<View style={styles.transactionAmountContainer}>
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
						{currency}
						{formatAmount(transaction.amount)}
					</Text>
					<Text style={styles.transactionTime}>
						{transaction.time.slice(0, 5)}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	const renderDateGroup = ({ item }: { item: GroupedTransactions }) => (
		<View style={styles.dateGroup}>
			<View style={styles.dateHeader}>
				<Text style={styles.dateText}>{item.displayDate}</Text>
				<View style={styles.dateTotals}>
					{item.totalIncome > 0 && (
						<Text style={[styles.dateTotal, { color: theme.success }]}>
							+{currency}
							{formatAmount(item.totalIncome)}
						</Text>
					)}
					{item.totalExpense > 0 && (
						<Text style={[styles.dateTotal, { color: theme.error }]}>
							-{currency}
							{formatAmount(item.totalExpense)}
						</Text>
					)}
				</View>
			</View>
			{item.transactions.map(renderTransactionItem)}
		</View>
	);

	const allCategories = useMemo(() => {
		const expCats = Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => ({
			key,
			...val,
			type: "expense" as const,
		}));
		const incCats = Object.entries(INCOME_CATEGORIES).map(([key, val]) => ({
			key,
			...val,
			type: "income" as const,
		}));
		return [...expCats, ...incCats];
	}, []);

	return (
		<View style={styles.container}>
			{/* Search Bar */}
			<View style={styles.searchContainer}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color={theme.textMuted} />
					<TextInput
						style={styles.searchInput}
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder="Search transactions..."
						placeholderTextColor={theme.textMuted}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Ionicons name="close-circle" size={20} color={theme.textMuted} />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					style={[
						styles.filterButton,
						showFilters && styles.filterButtonActive,
					]}
					onPress={() => setShowFilters(!showFilters)}
				>
					<Ionicons
						name="options"
						size={20}
						color={showFilters ? "#FFF" : theme.text}
					/>
				</TouchableOpacity>
			</View>

			{/* Quick Filters */}
			<View style={styles.quickFilters}>
				{(["all", "income", "expense", "transfer"] as FilterType[]).map(
					(type) => (
						<TouchableOpacity
							key={type}
							style={[
								styles.quickFilter,
								filterType === type && styles.quickFilterActive,
							]}
							onPress={() => setFilterType(type)}
						>
							<Text
								style={[
									styles.quickFilterText,
									filterType === type && styles.quickFilterTextActive,
								]}
							>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</Text>
						</TouchableOpacity>
					)
				)}
			</View>

			{/* Date Filter */}
			<View style={styles.dateFilters}>
				{(["today", "week", "month", "year", "all"] as DateFilter[]).map(
					(date) => (
						<TouchableOpacity
							key={date}
							style={[
								styles.dateFilterOption,
								dateFilter === date && styles.dateFilterOptionActive,
							]}
							onPress={() => setDateFilter(date)}
						>
							<Text
								style={[
									styles.dateFilterText,
									dateFilter === date && styles.dateFilterTextActive,
								]}
							>
								{date === "all"
									? "All Time"
									: date.charAt(0).toUpperCase() + date.slice(1)}
							</Text>
						</TouchableOpacity>
					)
				)}
			</View>

			{/* Expanded Filters */}
			{showFilters && (
				<View style={styles.expandedFilters}>
					<Text style={styles.filterLabel}>Filter by Category</Text>
					<FlatList
						horizontal
						showsHorizontalScrollIndicator={false}
						data={[
							{ key: null, name: "All", icon: "apps", color: theme.primary },
							...allCategories,
						]}
						keyExtractor={(item) =>
							item.key ? `${item.type}-${item.key}` : "all"
						}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.categoryFilterOption,
									selectedCategory === item.key && {
										backgroundColor: item.color + "20",
										borderColor: item.color,
									},
								]}
								onPress={() => setSelectedCategory(item.key)}
							>
								<Ionicons
									name={item.icon as any}
									size={16}
									color={
										selectedCategory === item.key ? item.color : theme.textMuted
									}
								/>
								<Text
									style={[
										styles.categoryFilterText,
										selectedCategory === item.key && { color: item.color },
									]}
									numberOfLines={1}
								>
									{item.name}
								</Text>
							</TouchableOpacity>
						)}
					/>

					<Text style={[styles.filterLabel, { marginTop: 16 }]}>
						Filter by Account
					</Text>
					<FlatList
						horizontal
						showsHorizontalScrollIndicator={false}
						data={[
							{ id: null, name: "All", color: theme.primary },
							...accounts.map((acc) => ({
								id: acc.id,
								name: acc.name,
								color: acc.color,
							})),
						]}
						keyExtractor={(item) => item.id || "all"}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.categoryFilterOption,
									selectedAccount === item.id && {
										backgroundColor: item.color + "20",
										borderColor: item.color,
									},
								]}
								onPress={() => setSelectedAccount(item.id)}
							>
								<Ionicons
									name="wallet-outline"
									size={16}
									color={
										selectedAccount === item.id ? item.color : theme.textMuted
									}
								/>
								<Text
									style={[
										styles.categoryFilterText,
										selectedAccount === item.id && { color: item.color },
									]}
									numberOfLines={1}
								>
									{item.name}
								</Text>
							</TouchableOpacity>
						)}
					/>
				</View>
			)}

			{/* Transaction List */}
			<FlatList
				data={groupedTransactions}
				keyExtractor={(item) => item.date}
				renderItem={renderDateGroup}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<View style={styles.emptyIcon}>
							<Ionicons
								name="receipt-outline"
								size={48}
								color={theme.textMuted}
							/>
						</View>
						<Text style={styles.emptyTitle}>No Transactions</Text>
						<Text style={styles.emptySubtitle}>
							{searchQuery || selectedCategory
								? "Try changing your filters"
								: "Add your first transaction to get started"}
						</Text>
					</View>
				}
			/>

			{/* Transaction Detail Modal */}
			<Modal
				visible={!!selectedTransaction}
				animationType="slide"
				transparent
				onRequestClose={() => setSelectedTransaction(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						{selectedTransaction && (
							<>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Transaction Details</Text>
									<TouchableOpacity
										onPress={() => setSelectedTransaction(null)}
									>
										<Ionicons name="close" size={24} color={theme.text} />
									</TouchableOpacity>
								</View>

								<View style={styles.detailCard}>
									{(() => {
										const catInfo =
											selectedTransaction.type === "income"
												? INCOME_CATEGORIES[
														selectedTransaction.category as IncomeCategory
												  ]
												: EXPENSE_CATEGORIES[
														selectedTransaction.category as ExpenseCategory
												  ];
										return (
											<>
												<View
													style={[
														styles.detailIcon,
														{ backgroundColor: catInfo?.color + "20" },
													]}
												>
													<Ionicons
														name={catInfo?.icon as any}
														size={32}
														color={catInfo?.color}
													/>
												</View>
												<Text
													style={[
														styles.detailAmount,
														{
															color:
																selectedTransaction.type === "income"
																	? theme.success
																	: theme.error,
														},
													]}
												>
													{selectedTransaction.type === "income" ? "+" : "-"}
													{currency}
													{selectedTransaction.amount.toLocaleString()}
												</Text>
												<Text style={styles.detailDescription}>
													{selectedTransaction.description}
												</Text>
											</>
										);
									})()}
								</View>
								<ScrollView
									style={{ maxHeight: 350, marginBottom: 20 }}
									showsVerticalScrollIndicator={true}
								>
									<View style={styles.detailRows}>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Category</Text>
											<Text style={styles.detailValue}>
												{selectedTransaction.type === "income"
													? INCOME_CATEGORIES[
															selectedTransaction.category as IncomeCategory
													  ]?.name
													: EXPENSE_CATEGORIES[
															selectedTransaction.category as ExpenseCategory
													  ]?.name}
											</Text>
										</View>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Account</Text>
											<Text style={styles.detailValue}>
												{getAccountName(selectedTransaction.accountId)}
											</Text>
										</View>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Date</Text>
											<Text style={styles.detailValue}>
												{new Date(selectedTransaction.date).toLocaleDateString(
													"en-US",
													{
														weekday: "long",
														year: "numeric",
														month: "long",
														day: "numeric",
													}
												)}
											</Text>
										</View>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Time</Text>
											<Text style={styles.detailValue}>
												{selectedTransaction.time}
											</Text>
										</View>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Payment Method</Text>
											<Text style={styles.detailValue}>
												{selectedTransaction.paymentMethod
													.replace("_", " ")
													.toUpperCase()}
											</Text>
										</View>
										<View style={styles.detailRow}>
											<Text style={styles.detailLabel}>Closing Balance</Text>
											<Text style={styles.detailValue}>
												{currency}
												{formatAmount(getClosingBalance(selectedTransaction))}
											</Text>
										</View>
										{selectedTransaction.notes && (
											<View style={styles.detailRow}>
												<Text style={styles.detailLabel}>Note</Text>
												<Text style={styles.detailValue}>
													{selectedTransaction.notes}
												</Text>
											</View>
										)}
									</View>
								</ScrollView>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={styles.editButton}
										onPress={() => handleEditTransaction(selectedTransaction)}
									>
										<Ionicons
											name="create-outline"
											size={20}
											color={theme.primary}
										/>
										<Text style={styles.editButtonText}>Edit</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.deleteButton}
										onPress={() => handleDeleteTransaction(selectedTransaction)}
									>
										<Ionicons
											name="trash-outline"
											size={20}
											color={theme.error}
										/>
										<Text style={styles.deleteButtonText}>Delete</Text>
									</TouchableOpacity>
								</View>
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Edit Transaction Modal */}
			<Modal
				visible={showEditModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowEditModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Edit Transaction</Text>
							<TouchableOpacity onPress={() => setShowEditModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{selectedTransaction && (
							<>
								<View style={styles.editFormContainer}>
									<Text style={styles.editFormLabel}>Amount</Text>
									<TextInput
										style={styles.editFormInput}
										value={editForm.amount}
										onChangeText={(text) =>
											setEditForm({ ...editForm, amount: text })
										}
										keyboardType="decimal-pad"
										placeholder="Enter amount"
										placeholderTextColor={theme.textSecondary}
									/>

									<Text style={styles.editFormLabel}>
										Description (Optional)
									</Text>
									<TextInput
										style={styles.editFormInput}
										value={editForm.description}
										onChangeText={(text) =>
											setEditForm({ ...editForm, description: text })
										}
										placeholder="Enter description"
										placeholderTextColor={theme.textSecondary}
									/>

									<Text style={styles.editFormLabel}>Category</Text>
									<View style={styles.categorySelectContainer}>
										{(selectedTransaction.type === "income"
											? Object.entries(INCOME_CATEGORIES)
											: Object.entries(EXPENSE_CATEGORIES)
										).map(([key, cat]) => (
											<TouchableOpacity
												key={key}
												style={[
													styles.categorySelectItem,
													editForm.category === key && {
														backgroundColor: theme.primary + "20",
														borderColor: theme.primary,
													},
												]}
												onPress={() =>
													setEditForm({
														...editForm,
														category: key as ExpenseCategory | IncomeCategory,
													})
												}
											>
												<Ionicons
													name={cat.icon as any}
													size={16}
													color={
														editForm.category === key
															? theme.primary
															: theme.text
													}
												/>
												<Text
													style={[
														styles.categorySelectLabel,
														editForm.category === key && {
															color: theme.primary,
														},
													]}
												>
													{cat.name}
												</Text>
											</TouchableOpacity>
										))}
									</View>

									<Text style={styles.editFormLabel}>Note (Optional)</Text>
									<TextInput
										style={[
											styles.editFormInput,
											styles.editFormInputMultiline,
										]}
										value={editForm.note}
										onChangeText={(text) =>
											setEditForm({ ...editForm, note: text })
										}
										placeholder="Add a note"
										placeholderTextColor={theme.textSecondary}
										multiline
										numberOfLines={3}
									/>
								</View>

								<View style={styles.editFormActions}>
									<TouchableOpacity
										style={styles.cancelButton}
										onPress={() => setShowEditModal(false)}
									>
										<Text style={styles.cancelButtonText}>Cancel</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.saveButton}
										onPress={handleSaveEdit}
									>
										<Ionicons name="checkmark" size={20} color="#fff" />
										<Text style={styles.saveButtonText}>Save Changes</Text>
									</TouchableOpacity>
								</View>
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
		searchContainer: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 10,
		},
		searchBar: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 12,
			gap: 8,
		},
		searchInput: {
			flex: 1,
			fontSize: 15,
			color: theme.text,
			paddingVertical: 12,
		},
		filterButton: {
			width: 48,
			height: 48,
			backgroundColor: theme.surface,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		filterButtonActive: {
			backgroundColor: theme.primary,
		},
		quickFilters: {
			flexDirection: "row",
			paddingHorizontal: 16,
			gap: 8,
			marginBottom: 12,
		},
		quickFilter: {
			paddingVertical: 8,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
		},
		quickFilterActive: {
			backgroundColor: theme.primary,
		},
		quickFilterText: {
			fontSize: 13,
			color: theme.textMuted,
			fontWeight: "500",
		},
		quickFilterTextActive: {
			color: "#FFF",
		},
		dateFilters: {
			flexDirection: "row",
			paddingHorizontal: 16,
			gap: 6,
			marginBottom: 8,
		},
		dateFilterOption: {
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: 8,
		},
		dateFilterOptionActive: {
			backgroundColor: theme.primary + "20",
		},
		dateFilterText: {
			fontSize: 12,
			color: theme.textMuted,
			fontWeight: "500",
		},
		dateFilterTextActive: {
			color: theme.primary,
		},
		expandedFilters: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		filterLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		categoryFilterOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 8,
			paddingHorizontal: 12,
			backgroundColor: theme.surface,
			borderRadius: 20,
			marginRight: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		categoryFilterText: {
			fontSize: 12,
			color: theme.textMuted,
			fontWeight: "500",
		},
		listContent: {
			padding: 16,
			paddingBottom: 32,
		},
		dateGroup: {
			marginBottom: 20,
		},
		dateHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 10,
		},
		dateText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		dateTotals: {
			flexDirection: "row",
			gap: 12,
		},
		dateTotal: {
			fontSize: 12,
			fontWeight: "600",
		},
		transactionItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 14,
			marginBottom: 8,
			gap: 12,
		},
		transactionIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		transactionInfo: {
			flex: 1,
		},
		transactionDescription: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 2,
		},
		transactionMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 2,
		},
		transactionBalance: {
			fontSize: 11,
			color: theme.textSecondary,
			fontWeight: "500",
		},
		transactionAmountContainer: {
			alignItems: "flex-end",
		},
		transactionAmount: {
			fontSize: 16,
			fontWeight: "700",
		},
		transactionTime: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		emptyState: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyIcon: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
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
		detailCard: {
			alignItems: "center",
			paddingVertical: 24,
			marginBottom: 20,
		},
		detailIcon: {
			width: 72,
			height: 72,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		detailAmount: {
			fontSize: 32,
			fontWeight: "700",
			marginBottom: 4,
		},
		detailDescription: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		detailRows: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 4,
			marginBottom: 20,
		},
		detailRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		detailLabel: {
			fontSize: 14,
			color: theme.textMuted,
		},
		detailValue: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
			textAlign: "right",
			flex: 1,
			marginLeft: 16,
		},
		modalActions: {
			flexDirection: "row",
			gap: 12,
		},
		editButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.primary + "20",
			paddingVertical: 14,
			borderRadius: 12,
		},
		editButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.primary,
		},
		deleteButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.error + "15",
			paddingVertical: 14,
			borderRadius: 12,
		},
		deleteButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.error,
		},
		// Edit Form Styles
		editFormContainer: {
			marginBottom: 20,
		},
		editFormLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
			marginTop: 12,
		},
		editFormInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		editFormInputMultiline: {
			minHeight: 80,
			textAlignVertical: "top",
		},
		categorySelectContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		categorySelectItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 20,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 6,
		},
		categorySelectIcon: {
			fontSize: 16,
		},
		categorySelectLabel: {
			fontSize: 13,
			color: theme.text,
		},
		editFormActions: {
			flexDirection: "row",
			gap: 12,
		},
		cancelButton: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surface,
			paddingVertical: 14,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
		},
		cancelButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		saveButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.primary,
			paddingVertical: 14,
			borderRadius: 12,
		},
		saveButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#fff",
		},
	});
