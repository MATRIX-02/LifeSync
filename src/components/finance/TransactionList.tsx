// Transaction List - Full transaction history with filters

import { Alert } from "@/src/components/CustomAlert";
import { supabase } from "@/src/config/supabase";
import AddTransactionModal from "@/src/components/finance/AddTransactionModal";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useFinancePrefsStore } from "@/src/context/financePrefsStore";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { objectToCamelCase } from "@/src/context/financeStoreDB/helpers";
import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { useModuleRefresh } from "@/src/hooks/useModuleRefresh";
import { Transaction } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
	FlatList,
	Modal,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { createStyles } from "./TransactionList.styles";

interface TransactionListProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentMonthTransactionCount?: number;
}

type FilterType = "all" | "income" | "expense" | "transfer";
type DateFilter =
	| "all"
	| "today"
	| "thisMonth"
	| "lastMonth"
	| "7d"
	| "30d"
	| "365d"
	| "custom";

const TYPE_OPTIONS: { key: FilterType; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "income", label: "Income" },
	{ key: "expense", label: "Expense" },
	{ key: "transfer", label: "Transfer" },
];

const monthName = (offset: number): string => {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth() + offset, 1).toLocaleDateString(
		"en-GB",
		{ month: "long" },
	);
};

/** Built per render so the month labels follow the calendar. */
const getDateOptions = (): { key: DateFilter; label: string }[] => [
	{ key: "today", label: "Today" },
	{ key: "thisMonth", label: monthName(0) },
	{ key: "lastMonth", label: monthName(-1) },
	{ key: "7d", label: "Last 7 days" },
	{ key: "30d", label: "Last 30 days" },
	{ key: "365d", label: "Last 365 days" },
	{ key: "all", label: "All time" },
	{ key: "custom", label: "Custom range" },
];

const DEFAULT_DATE_FILTER: DateFilter = "30d";

/** "YYYY-MM-DD" -> local Date (never via UTC parsing); null -> today. */
const keyToDate = (key: string | null): Date => {
	if (!key) return new Date();
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y, m - 1, d);
};

const formatKey = (key: string): string => {
	return keyToDate(key).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

/**
 * Local calendar date as "YYYY-MM-DD", the same format Transaction.date uses.
 *
 * toISOString() returns UTC, so in IST (+05:30) everything before 05:30 local
 * reports YESTERDAY - which made the "Today" heading and the Today filter
 * attach to the wrong day for the first few hours of every morning.
 */
const toDateKey = (d: Date): string =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
		d.getDate(),
	).padStart(2, "0")}`;

const daysAgoKey = (days: number): string => {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return toDateKey(d);
};

/** Inclusive "YYYY-MM-DD" bounds for a date filter; either end may be open. */
const getDateRange = (
	filter: DateFilter,
	customFrom: string | null,
	customTo: string | null,
): { from: string | null; to: string | null } => {
	const now = new Date();
	switch (filter) {
		case "today": {
			const today = toDateKey(now);
			return { from: today, to: today };
		}
		case "thisMonth":
		case "lastMonth": {
			const offset = filter === "thisMonth" ? 0 : -1;
			return {
				from: toDateKey(new Date(now.getFullYear(), now.getMonth() + offset, 1)),
				to: toDateKey(
					new Date(now.getFullYear(), now.getMonth() + offset + 1, 0),
				),
			};
		}
		case "7d":
			return { from: daysAgoKey(7), to: null };
		case "30d":
			return { from: daysAgoKey(30), to: null };
		case "365d":
			return { from: daysAgoKey(365), to: null };
		case "custom":
			return { from: customFrom, to: customTo };
		default:
			return { from: null, to: null };
	}
};

/** Rows fetched per page as the list scrolls. */
const PAGE_SIZE = 50;

/** Strip characters that would break a PostgREST `or=(...)` filter string. */
const sanitizeSearch = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();

/**
 * Newest first: date, then time, then insertion order.
 *
 * The old comparator comparded date ALONE, so every transaction sharing a day
 * kept whatever order the store happened to return - a new entry could land
 * anywhere in today's group instead of at the top. `date` and `time` are
 * fixed-width strings ("2026-09-03", "14:05:00"), so comparing them directly
 * is both correct and cheaper than parsing a Date.
 */
const byNewestFirst = (a: Transaction, b: Transaction): number => {
	if (a.date !== b.date) return a.date < b.date ? 1 : -1;
	const at = a.time || "";
	const bt = b.time || "";
	if (at !== bt) return at < bt ? 1 : -1;
	// Same second: fall back to when the row was written, so the order is at
	// least stable rather than dependent on the store's fetch order.
	const ac = a.createdAt || "";
	const bc = b.createdAt || "";
	if (ac !== bc) return ac < bc ? 1 : -1;
	return 0;
};

type SortKey = "newest" | "oldest" | "amountDesc" | "amountAsc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
	{ key: "newest", label: "Newest" },
	{ key: "oldest", label: "Oldest" },
	{ key: "amountDesc", label: "Amount: high to low" },
	{ key: "amountAsc", label: "Amount: low to high" },
];

const DEFAULT_SORT: SortKey = "newest";

/**
 * Client comparators. Each must match `applyServerSort` exactly, or paged
 * results and locally merged rows come out in a different order.
 */
const SORT_COMPARATORS: Record<
	SortKey,
	(a: Transaction, b: Transaction) => number
> = {
	newest: byNewestFirst,
	oldest: (a, b) => byNewestFirst(b, a),
	amountDesc: (a, b) =>
		Number(b.amount) - Number(a.amount) || byNewestFirst(a, b),
	amountAsc: (a, b) =>
		Number(a.amount) - Number(b.amount) || byNewestFirst(a, b),
};

const applyServerSort = (q: any, sort: SortKey) => {
	const asc = sort === "oldest";
	if (sort === "amountDesc") q = q.order("amount", { ascending: false });
	if (sort === "amountAsc") q = q.order("amount", { ascending: true });
	// id last so ties have a stable order and pages never overlap or skip.
	return q
		.order("date", { ascending: asc })
		.order("time", { ascending: asc })
		.order("created_at", { ascending: asc })
		.order("id", { ascending: asc });
};

/** Money moved to/from a savings goal: a transfer with no destination account. */
const isGoalMove = (t: Transaction) =>
	t.type === "transfer" && t.category === "savings_goal" && !t.toAccountId;

interface GroupedTransactions {
	key: string;
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
	const {
		userId,
		transactions,
		accounts,
		deleteTransaction,
		deleteTransactions,
	} = useFinanceStore();
	const { hideBalance, toggleHideBalance } = useFinancePrefsStore();

	const styles = createStyles(theme);
	const categories = useFinanceCategories();
	const { refreshing, onRefresh } = useModuleRefresh("finance");

	const [filterType, setFilterType] = useState<FilterType>("all");
	const [dateFilter, setDateFilter] = useState<DateFilter>(DEFAULT_DATE_FILTER);
	const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT);
	const [customFrom, setCustomFrom] = useState<string | null>(null);
	const [customTo, setCustomTo] = useState<string | null>(null);
	const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [popoverTop, setPopoverTop] = useState(110);
	const filterButtonRef = useRef<View>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [editingTransaction, setEditingTransaction] =
		useState<Transaction | null>(null);
	const [selectionMode, setSelectionMode] = useState(false);
	const [showAddTransaction, setShowAddTransaction] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// ---- Paging -------------------------------------------------------------
	// The list reads straight from Supabase, PAGE_SIZE rows at a time, with
	// every filter applied server-side. The store's copy is only a fallback
	// (offline / query failed) and a source of not-yet-synced local rows.
	const [debouncedSearch, setDebouncedSearch] = useState("");
	useEffect(() => {
		const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
		return () => clearTimeout(id);
	}, [searchQuery]);

	const [remoteRows, setRemoteRows] = useState<Transaction[] | null>(null);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const requestId = useRef(0);
	const loadedCount = useRef(0);

	const fetchRange = useCallback(
		async (start: number, end: number): Promise<Transaction[] | null> => {
			if (!userId) return null;
			const range = getDateRange(dateFilter, customFrom, customTo);
			let q = (supabase as any)
				.from("finance_transactions")
				.select("*")
				.eq("user_id", userId);
			if (filterType !== "all") q = q.eq("type", filterType);
			if (range.from) q = q.gte("date", range.from);
			if (range.to) q = q.lte("date", range.to);
			if (selectedCategory) q = q.eq("category", selectedCategory);
			if (selectedAccount) q = q.eq("account_id", selectedAccount);
			const search = sanitizeSearch(debouncedSearch);
			if (search) {
				const conds = [
					`description.ilike.%${search}%`,
					`category.ilike.%${search}%`,
				];
				const num = search.replace(/[^0-9.]/g, "");
				if (num && !isNaN(Number(num))) conds.push(`amount.eq.${Number(num)}`);
				q = q.or(conds.join(","));
			}
			const { data, error } = await applyServerSort(q, sortKey).range(
				start,
				end,
			);
			if (error) {
				console.error("Transaction page load failed:", error.message);
				return null;
			}
			return (data || []).map((r: any) => objectToCamelCase(r) as Transaction);
		},
		[
			userId,
			filterType,
			dateFilter,
			customFrom,
			customTo,
			selectedCategory,
			selectedAccount,
			debouncedSearch,
			sortKey,
		],
	);

	// A filter change starts again from the first page. (Declared before the
	// reload effect so it runs first.)
	useEffect(() => {
		loadedCount.current = 0;
	}, [fetchRange]);

	// Reload whenever filters change or the store changes (add/edit/delete,
	// pull-to-refresh). Keeps as many rows as were already loaded, so editing
	// something far down the list doesn't throw away the scroll position.
	useEffect(() => {
		const id = ++requestId.current;
		const count = Math.max(PAGE_SIZE, loadedCount.current);
		fetchRange(0, count - 1).then((rows) => {
			if (id !== requestId.current) return;
			if (!rows) {
				setRemoteRows(null); // fall back to the store's copy
				setHasMore(false);
				return;
			}
			loadedCount.current = rows.length;
			setRemoteRows(rows);
			setHasMore(rows.length === count);
		});
	}, [fetchRange, transactions]);

	const loadMore = async () => {
		if (!hasMore || loadingMore || remoteRows === null) return;
		const id = requestId.current;
		setLoadingMore(true);
		const start = loadedCount.current;
		const rows = await fetchRange(start, start + PAGE_SIZE - 1);
		setLoadingMore(false);
		if (id !== requestId.current || !rows) return;
		loadedCount.current += rows.length;
		setRemoteRows((prev) => {
			const seen = new Set((prev || []).map((r) => r.id));
			return [...(prev || []), ...rows.filter((r) => !seen.has(r.id))];
		});
		setHasMore(rows.length === PAGE_SIZE);
	};

	const listSource = useMemo(() => {
		if (remoteRows === null) return transactions;
		// Local rows the server doesn't have yet (queued offline writes) that
		// fall inside the loaded window. The filter pass below decides whether
		// they match.
		const ids = new Set(remoteRows.map((r) => r.id));
		const last = hasMore ? remoteRows[remoteRows.length - 1] : null;
		const cmp = SORT_COMPARATORS[sortKey];
		const pending = transactions.filter(
			(t) => !ids.has(t.id) && (!last || cmp(t, last) <= 0),
		);
		return pending.length ? [...remoteRows, ...pending] : remoteRows;
	}, [remoteRows, transactions, hasMore, sortKey]);

	// Filter and group transactions
	const groupedTransactions = useMemo(() => {
		let filtered = [...listSource];

		// Apply type filter
		if (filterType !== "all") {
			filtered = filtered.filter((t) => t.type === filterType);
		}

		// Apply date filter
		const today = toDateKey(new Date());
		const range = getDateRange(dateFilter, customFrom, customTo);
		if (range.from) filtered = filtered.filter((t) => t.date >= range.from!);
		if (range.to) filtered = filtered.filter((t) => t.date <= range.to!);

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
				// Numbers match the amount exactly - the same rule the server
				// query uses, so paged and local results agree.
				if (isNumericSearch && t.amount === Number(searchAmount)) {
					return true;
				}
				// Otherwise, check description and category
				return (
					(t.description?.toLowerCase() || "").includes(query) ||
					t.category.toLowerCase().includes(query)
				);
			});
		}

		filtered.sort(SORT_COMPARATORS[sortKey]);

		// Group runs of consecutive same-day rows. For date sorts that is one
		// group per day, as before; for amount sorts a day can appear more than
		// once, which keeps the chosen order intact.
		const groups: GroupedTransactions[] = [];
		filtered.forEach((t) => {
			let group = groups[groups.length - 1];
			if (!group || group.date !== t.date) {
				// "2026-09-03" through new Date() is parsed as UTC midnight, which
				// renders as the PREVIOUS day for anyone west of UTC. Build it from
				// the parts instead so the weekday and day number are the real ones.
				const [y, m, d] = t.date.split("-").map(Number);
				const date = new Date(y, m - 1, d);
				const isToday = t.date === today;
				const isYesterday = t.date === daysAgoKey(1);

				let displayDate = date.toLocaleDateString("en-US", {
					weekday: "long",
					month: "short",
					day: "numeric",
				});
				if (isToday) displayDate = "Today";
				else if (isYesterday) displayDate = "Yesterday";

				group = {
					key: `${t.date}-${groups.length}`,
					date: t.date,
					displayDate,
					transactions: [],
					totalIncome: 0,
					totalExpense: 0,
				};
				groups.push(group);
			}
			group.transactions.push(t);
			if (t.type === "income") group.totalIncome += t.amount;
			else if (t.type === "expense") group.totalExpense += t.amount;
		});

		return groups;
	}, [
		listSource,
		filterType,
		dateFilter,
		customFrom,
		customTo,
		selectedCategory,
		selectedAccount,
		searchQuery,
		sortKey,
	]);

	const hasActiveFilters =
		sortKey !== DEFAULT_SORT ||
		filterType !== "all" ||
		dateFilter !== DEFAULT_DATE_FILTER ||
		!!selectedCategory ||
		!!selectedAccount;

	const resetFilters = () => {
		setSortKey(DEFAULT_SORT);
		setFilterType("all");
		setDateFilter(DEFAULT_DATE_FILTER);
		setCustomFrom(null);
		setCustomTo(null);
		setSelectedCategory(null);
		setSelectedAccount(null);
	};

	const openFilters = () => {
		// Anchor the popover just under the button, wherever the header lands.
		filterButtonRef.current?.measureInWindow((_x, y, _w, h) => {
			setPopoverTop(y + h + 6);
			setShowFilters(true);
		});
	};

	const onPickDate = (_e: unknown, date?: Date) => {
		const target = pickerTarget;
		setPickerTarget(null); // Android closes its dialog on any event
		if (!date || !target) return;
		const key = toDateKey(date);
		if (target === "from") {
			setCustomFrom(key);
			if (customTo && customTo < key) setCustomTo(key);
		} else {
			setCustomTo(key);
			if (customFrom && customFrom > key) setCustomFrom(key);
		}
	};

	const dateSummary =
		dateFilter === "custom"
			? `${customFrom ? formatKey(customFrom) : "Any"} – ${
					customTo ? formatKey(customTo) : "Any"
				}`
			: getDateOptions().find((o) => o.key === dateFilter)?.label;

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
			],
		);
	};

	const visibleTransactionIds = useMemo(
		() => groupedTransactions.flatMap((g) => g.transactions.map((t) => t.id)),
		[groupedTransactions],
	);

	const exitSelectionMode = () => {
		setSelectionMode(false);
		setSelectedIds([]);
	};

	const toggleSelection = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const startSelection = (transaction: Transaction) => {
		setSelectionMode(true);
		setSelectedIds([transaction.id]);
	};

	const allVisibleSelected =
		visibleTransactionIds.length > 0 &&
		visibleTransactionIds.every((id) => selectedIds.includes(id));

	const toggleSelectAll = () => {
		setSelectedIds(allVisibleSelected ? [] : visibleTransactionIds);
	};

	const handleBulkDelete = () => {
		if (selectedIds.length === 0) return;
		Alert.alert(
			"Delete Transactions",
			`Delete ${selectedIds.length} transaction${
				selectedIds.length > 1 ? "s" : ""
			}? Account balances will be adjusted.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteTransactions(selectedIds);
						exitSelectionMode();
					},
				},
			],
		);
	};

	const handleEditTransaction = (transaction: Transaction) => {
		setSelectedTransaction(null);
		setEditingTransaction(transaction);
	};

	const formatAmount = (value: number) =>
		value.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});

	// The hide toggle only masks balances; transaction amounts stay visible.
	const formatBalance = (value: number) =>
		hideBalance ? "••••" : formatAmount(value);

	const getAccountName = (accountId: string) => {
		const account = accounts.find((a) => a.id === accountId);
		return account?.name || "Unknown";
	};

	// Returns two closing balances for a transaction:
	// - account: balance of the transaction's account immediately after the transaction
	// - total: combined balance across all accounts immediately after the transaction
	const getClosingBalances = (
		transaction: Transaction,
	): { account: number; total: number } => {
		// Stored by the server trigger (docs/FINANCE_CLOSING_BALANCE.md). The
		// walk-back below is only for rows written before it was set up, or
		// added offline and not yet synced.
		if (
			transaction.accountBalanceAfter != null &&
			transaction.totalBalanceAfter != null
		) {
			return {
				account: Number(transaction.accountBalanceAfter),
				total: Number(transaction.totalBalanceAfter),
			};
		}
		// find the affected account
		const account = accounts.find((acc) => acc.id === transaction.accountId);
		// current total across all accounts
		const currentTotal = accounts.reduce((s, a) => s + (a.balance || 0), 0);

		// If account not found, return zeros (but still compute total by reversing global transactions)
		let accountBalance = account ? account.balance : 0;
		let totalBalance = currentTotal;

		// Newest first, using the SAME comparator the list is ordered by. If the
		// two disagree, the running balance is walked back in a different order
		// than the rows are drawn in and same-day closing balances come out wrong.
		const sortedDesc = [...transactions].sort(byNewestFirst);

		for (const t of sortedDesc) {
			// stop once we've reached the transaction itself
			if (t.id === transaction.id) break;

			// Reverse-apply this transaction to reach earlier state
			// For the account-specific balance, only consider transactions that affect that account
			if (account) {
				if (t.accountId === account.id) {
					if (t.type === "income") accountBalance -= t.amount;
					else if (t.type === "expense") accountBalance += t.amount;
					else if (t.type === "transfer") {
						// outgoing transfer from this account
						if (t.toAccountId === account.id) accountBalance -= t.amount;
						else accountBalance += t.amount;
					}
				}

				// transfers that credit this account via toAccountId
				if (t.toAccountId === account.id && t.accountId !== account.id) {
					// if this transaction credited the account, remove its credit
					accountBalance -= t.amount;
				}
			}

			// For total balance across all accounts, transfers cancel out (internal), so ignore transfers.
			if (t.type === "income") {
				totalBalance -= t.amount;
			} else if (t.type === "expense" || isGoalMove(t)) {
				totalBalance += t.amount;
			}
		}

		// accountBalance already represents the balance immediately after the transaction

		return { account: accountBalance, total: totalBalance };
	};

	const renderTransactionItem = (transaction: Transaction) => {
		const catInfo = isGoalMove(transaction)
			? { name: "Savings goal", icon: "flag", color: theme.primary }
			: categories.getInfo(transaction.type, transaction.category);
		// Goal withdrawals are stored with a negative amount (money coming back).
		const inflow =
			transaction.type === "income" || Number(transaction.amount) < 0;

		const { account: closingBalanceAccount } = getClosingBalances(transaction);

		const isSelected = selectedIds.includes(transaction.id);

		return (
			<TouchableOpacity
				key={transaction.id}
				style={[
					styles.transactionItem,
					isSelected && styles.transactionItemSelected,
				]}
				onPress={() =>
					selectionMode
						? toggleSelection(transaction.id)
						: setSelectedTransaction(transaction)
				}
				onLongPress={() =>
					selectionMode
						? toggleSelection(transaction.id)
						: startSelection(transaction)
				}
				delayLongPress={300}
				activeOpacity={0.7}
			>
				{selectionMode && (
					<Ionicons
						name={isSelected ? "checkbox" : "square-outline"}
						size={22}
						color={isSelected ? theme.primary : theme.textMuted}
						style={styles.selectionCheckbox}
					/>
				)}
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
						{isGoalMove(transaction)
							? `Savings goal • ${getAccountName(transaction.accountId)}`
							: transaction.type === "transfer"
							? `Transfer • ${getAccountName(
									transaction.accountId,
								)} → ${getAccountName(transaction.toAccountId || "")}`
							: `${catInfo?.name || transaction.category} • ${getAccountName(
									transaction.accountId,
								)}`}
					</Text>
					<Text style={styles.transactionBalance} numberOfLines={1}>
						Closing Balance ({getAccountName(transaction.accountId)}):{" "}
						{currency}
						{formatBalance(closingBalanceAccount)}
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
						{inflow ? "+" : "-"}
						{currency}
						{formatAmount(Math.abs(Number(transaction.amount)))}
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

	const allCategories = useMemo(
		() => [
			...categories.expenseOptions.map((c) => ({
				...c,
				type: "expense" as const,
			})),
			...categories.incomeOptions.map((c) => ({
				...c,
				type: "income" as const,
			})),
		],
		[categories],
	);

	return (
		<View style={styles.container}>
			{/* Selection Bar */}
			{selectionMode && (
				<View style={styles.selectionBar}>
					<TouchableOpacity
						onPress={exitSelectionMode}
						style={styles.selectionBarButton}
					>
						<Ionicons name="close" size={22} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.selectionBarText}>
						{selectedIds.length} selected
					</Text>
					<TouchableOpacity
						onPress={toggleSelectAll}
						style={styles.selectionBarButton}
					>
						<Ionicons
							name={allVisibleSelected ? "checkbox" : "checkbox-outline"}
							size={22}
							color={theme.text}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleBulkDelete}
						disabled={selectedIds.length === 0}
						style={styles.selectionBarButton}
					>
						<Ionicons
							name="trash"
							size={22}
							color={selectedIds.length === 0 ? theme.textMuted : theme.error}
						/>
					</TouchableOpacity>
				</View>
			)}

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
					style={styles.filterButton}
					onPress={toggleHideBalance}
				>
					<Ionicons
						name={hideBalance ? "eye-off-outline" : "eye-outline"}
						size={20}
						color={theme.text}
					/>
				</TouchableOpacity>
				<View ref={filterButtonRef} collapsable={false}>
					<TouchableOpacity
						style={[
							styles.filterButton,
							(showFilters || hasActiveFilters) && styles.filterButtonActive,
						]}
						onPress={openFilters}
						accessibilityLabel="Filters"
					>
						<Ionicons
							name="options"
							size={20}
							color={showFilters || hasActiveFilters ? "#FFF" : theme.text}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Active filter summary */}
			<Text style={styles.filterSummary}>
				{TYPE_OPTIONS.find((o) => o.key === filterType)?.label} • {dateSummary}
				{sortKey !== DEFAULT_SORT &&
					` • ${SORT_OPTIONS.find((o) => o.key === sortKey)?.label}`}
			</Text>

			{/* Filter popover */}
			<Modal
				visible={showFilters}
				transparent
				animationType="fade"
				onRequestClose={() => setShowFilters(false)}
			>
				<TouchableOpacity
					style={styles.popoverBackdrop}
					activeOpacity={1}
					onPress={() => setShowFilters(false)}
				>
					<TouchableOpacity
						activeOpacity={1}
						style={[styles.popover, { top: popoverTop }]}
					>
						<ScrollView
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 460 }}
						>
							<Text style={styles.filterLabel}>Sort by</Text>
							<View style={styles.chipWrap}>
								{SORT_OPTIONS.map((o) => (
									<TouchableOpacity
										key={o.key}
										style={[
											styles.quickFilter,
											sortKey === o.key && styles.quickFilterActive,
										]}
										onPress={() => setSortKey(o.key)}
									>
										<Text
											style={[
												styles.quickFilterText,
												sortKey === o.key && styles.quickFilterTextActive,
											]}
										>
											{o.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={[styles.filterLabel, { marginTop: 16 }]}>Type</Text>
							<View style={styles.chipWrap}>
								{TYPE_OPTIONS.map((o) => (
									<TouchableOpacity
										key={o.key}
										style={[
											styles.quickFilter,
											filterType === o.key && styles.quickFilterActive,
										]}
										onPress={() => setFilterType(o.key)}
									>
										<Text
											style={[
												styles.quickFilterText,
												filterType === o.key && styles.quickFilterTextActive,
											]}
										>
											{o.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={[styles.filterLabel, { marginTop: 16 }]}>Period</Text>
							<View style={styles.chipWrap}>
								{getDateOptions().map((o) => (
									<TouchableOpacity
										key={o.key}
										style={[
											styles.quickFilter,
											dateFilter === o.key && styles.quickFilterActive,
										]}
										onPress={() => setDateFilter(o.key)}
									>
										<Text
											style={[
												styles.quickFilterText,
												dateFilter === o.key && styles.quickFilterTextActive,
											]}
										>
											{o.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							{dateFilter === "custom" && (
								<View style={styles.customRange}>
									{(["from", "to"] as const).map((which) => {
										const value = which === "from" ? customFrom : customTo;
										return (
											<TouchableOpacity
												key={which}
												style={styles.dateField}
												onPress={() => setPickerTarget(which)}
											>
												<Text style={styles.dateFieldLabel}>
													{which === "from" ? "From" : "To"}
												</Text>
												<Text style={styles.dateFieldValue}>
													{value ? formatKey(value) : "Select"}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
							)}

							<Text style={[styles.filterLabel, { marginTop: 16 }]}>
								Category
							</Text>
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
						Account
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
						</ScrollView>

						<View style={styles.popoverFooter}>
							<TouchableOpacity onPress={resetFilters}>
								<Text style={styles.resetText}>Reset</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.doneButton}
								onPress={() => setShowFilters(false)}
							>
								<Text style={styles.doneButtonText}>Done</Text>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</TouchableOpacity>
				{pickerTarget && (
					<DateTimePicker
						value={keyToDate(pickerTarget === "from" ? customFrom : customTo)}
						mode="date"
						onChange={onPickDate}
					/>
				)}
			</Modal>

			{/* Transaction List */}
			<FlatList
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={theme.primary}
						colors={[theme.primary]}
					/>
				}
				data={groupedTransactions}
				keyExtractor={(item) => item.key}
				renderItem={renderDateGroup}
				onEndReached={loadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={
					loadingMore ? (
						<ActivityIndicator
							style={{ marginVertical: 16 }}
							color={theme.primary}
						/>
					) : null
				}
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

			{/* Add a transaction from here too, not just from the Home tab.
			    Hidden during multi-select, where the bar owns the actions. */}
			{!selectionMode && (
				<TouchableOpacity
					style={styles.addFab}
					onPress={() => setShowAddTransaction(true)}
					activeOpacity={0.85}
					accessibilityLabel="Add transaction"
				>
					<Ionicons name="add" size={28} color="#FFF" />
				</TouchableOpacity>
			)}

			<AddTransactionModal
				visible={showAddTransaction}
				onClose={() => setShowAddTransaction(false)}
				theme={theme}
				currency={currency}
				subscriptionCheck={subscriptionCheck}
				currentMonthTransactionCount={currentMonthTransactionCount}
			/>
			<AddTransactionModal
				visible={!!editingTransaction}
				onClose={() => setEditingTransaction(null)}
				theme={theme}
				currency={currency}
				transaction={editingTransaction}
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
										const catInfo = categories.getInfo(
											selectedTransaction.type,
											selectedTransaction.category,
										);
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
																selectedTransaction.type === "income" ||
																Number(selectedTransaction.amount) < 0
																	? theme.success
																	: theme.error,
														},
													]}
												>
													{selectedTransaction.type === "income" ||
													Number(selectedTransaction.amount) < 0
														? "+"
														: "-"}
													{currency}
													{formatAmount(
														Math.abs(Number(selectedTransaction.amount)),
													)}
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
												{
													categories.getInfo(
														selectedTransaction.type,
														selectedTransaction.category,
													).name
												}
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
													},
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
										{(() => {
											const { account: accBal, total: totBal } =
												getClosingBalances(selectedTransaction);
											return (
												<>
													<View style={styles.detailRow}>
														<Text style={styles.detailLabel}>
															{`Closing Balance (${getAccountName(
																selectedTransaction.accountId,
															)})`}
														</Text>
														<Text style={styles.detailValue}>
															{currency}
															{formatBalance(accBal)}
														</Text>
													</View>
													<View style={styles.detailRow}>
														<Text style={styles.detailLabel}>
															Closing Balance (Total)
														</Text>
														<Text style={styles.detailValue}>
															{currency}
															{formatBalance(totBal)}
														</Text>
													</View>
												</>
											);
										})()}
										{selectedTransaction.note && (
											<View style={styles.detailRow}>
												<Text style={styles.detailLabel}>Note</Text>
												<Text style={styles.detailValue}>
													{selectedTransaction.note}
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
		</View>
	);
}
