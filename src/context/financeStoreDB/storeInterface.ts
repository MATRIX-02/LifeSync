/**
 * Finance Store Interface
 */
import type {
	Account,
	Balance,
	BillReminder,
	Budget,
	Debt,
	FinancialSummary,
	MonthlyTrend,
	RecurringTransaction,
	SavingsGoal,
	Settlement,
	SpendingByCategory,
	SplitExpense,
	SplitGroup,
	Transaction,
} from "./types";

export interface FinanceStore {
	// State
	accounts: Account[];
	transactions: Transaction[];
	recurringTransactions: RecurringTransaction[];
	budgets: Budget[];
	savingsGoals: SavingsGoal[];
	billReminders: BillReminder[];
	debts: Debt[];
	splitGroups: SplitGroup[];
	currency: string;
	isLoading: boolean;
	userId: string | null;

	// Initialize
	initialize: (userId: string) => Promise<void>;

	// Accounts
	addAccount: (
		account: Omit<Account, "id" | "createdAt" | "updatedAt">
	) => Promise<void>;
	updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
	deleteAccount: (id: string) => Promise<void>;
	setDefaultAccount: (id: string) => void;
	getDefaultAccount: () => Account | undefined;

	// Transactions
	addTransaction: (
		transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">
	) => Promise<void>;
	updateTransaction: (
		id: string,
		updates: Partial<Transaction>
	) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	getTransactionsByAccount: (accountId: string) => Transaction[];
	getTransactionsByCategory: (category: string) => Transaction[];
	getTransactionsByDateRange: (
		startDate: string,
		endDate: string
	) => Transaction[];

	// Recurring Transactions
	addRecurringTransaction: (
		transaction: Omit<RecurringTransaction, "id" | "createdAt">
	) => Promise<void>;
	updateRecurringTransaction: (
		id: string,
		updates: Partial<RecurringTransaction>
	) => Promise<void>;
	deleteRecurringTransaction: (id: string) => Promise<void>;
	processRecurringTransactions: () => Promise<void>;

	// Budgets
	addBudget: (
		budget: Omit<Budget, "id" | "spent" | "createdAt">
	) => Promise<void>;
	updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
	deleteBudget: (id: string) => Promise<void>;
	getBudgetProgress: (budgetId: string) => {
		spent: number;
		remaining: number;
		percentage: number;
	};

	// Savings Goals
	addSavingsGoal: (
		goal: Omit<
			SavingsGoal,
			| "id"
			| "currentAmount"
			| "contributions"
			| "isCompleted"
			| "createdAt"
			| "updatedAt"
		>
	) => Promise<void>;
	updateSavingsGoal: (
		id: string,
		updates: Partial<SavingsGoal>
	) => Promise<void>;
	deleteSavingsGoal: (id: string) => Promise<void>;
	contributeToGoal: (
		goalId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => Promise<void>;
	withdrawFromGoal: (
		goalId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => Promise<void>;

	// Bill Reminders
	addBillReminder: (
		bill: Omit<BillReminder, "id" | "isPaid" | "createdAt">
	) => Promise<void>;
	updateBillReminder: (
		id: string,
		updates: Partial<BillReminder>
	) => Promise<void>;
	deleteBillReminder: (id: string) => Promise<void>;
	markBillPaid: (id: string, accountId?: string) => Promise<void>;
	getUpcomingBills: (days: number) => BillReminder[];

	// Debts
	addDebt: (
		debt: Omit<
			Debt,
			| "id"
			| "remainingAmount"
			| "payments"
			| "isSettled"
			| "createdAt"
			| "updatedAt"
		>
	) => Promise<void>;
	updateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
	deleteDebt: (id: string) => Promise<void>;
	recordDebtPayment: (
		debtId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => Promise<void>;
	settleDebt: (debtId: string) => Promise<void>;

	// Split Groups
	addSplitGroup: (
		group: Omit<
			SplitGroup,
			| "id"
			| "expenses"
			| "settlements"
			| "totalExpenses"
			| "isArchived"
			| "createdAt"
			| "updatedAt"
		>
	) => Promise<void>;
	updateSplitGroup: (id: string, updates: Partial<SplitGroup>) => Promise<void>;
	deleteSplitGroup: (id: string) => Promise<void>;
	archiveSplitGroup: (id: string) => Promise<void>;
	addGroupMember: (groupId: string, memberName: string) => Promise<void>;
	removeGroupMember: (groupId: string, memberId: string) => Promise<void>;

	// Split Expenses
	addSplitExpense: (
		groupId: string,
		expense: {
			description: string;
			amount: number;
			paidBy: string;
			splitMethod: string;
			splits: { memberId: string; amount: number }[];
		}
	) => Promise<void>;
	updateSplitExpense: (
		id: string,
		updates: Partial<SplitExpense>
	) => Promise<void>;
	deleteSplitExpense: (groupId: string, expenseId: string) => Promise<void>;
	getGroupExpenses: (groupId: string) => SplitExpense[];
	getGroupBalances: (groupId: string) => Balance[];
	getMemberBalance: (groupId: string, memberId: string) => number;

	// Settlements
	addSettlement: (
		groupId: string,
		settlement: { fromMember: string; toMember: string; amount: number }
	) => Promise<void>;
	getGroupSettlements: (groupId: string) => Settlement[];

	// Analytics
	getFinancialSummary: (
		startDate?: string,
		endDate?: string
	) => FinancialSummary;
	getSpendingByCategory: (
		startDate?: string,
		endDate?: string
	) => SpendingByCategory[];
	getMonthlyTrends: (months: number) => MonthlyTrend[];
	getNetWorth: () => number;

	// Settings
	setCurrency: (currency: string) => void;

	// Import/Export
	importData: (
		data: Partial<{
			accounts: Account[];
			transactions: Transaction[];
			recurringTransactions: RecurringTransaction[];
			budgets: Budget[];
			savingsGoals: SavingsGoal[];
			billReminders: BillReminder[];
			debts: Debt[];
			splitGroups: SplitGroup[];
			currency: string;
		}>
	) => Promise<void>;
	clearAllData: () => Promise<void>;
}
