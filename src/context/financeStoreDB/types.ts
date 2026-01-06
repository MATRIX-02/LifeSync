/**
 * Finance Store Types
 */

export type AccountType =
	| "savings"
	| "current"
	| "credit_card"
	| "cash"
	| "investment"
	| "wallet";
export type TransactionType = "income" | "expense" | "transfer";
export type PaymentMethod =
	| "cash"
	| "upi"
	| "card"
	| "net_banking"
	| "cheque"
	| "other";
export type ExpenseCategory =
	| "food"
	| "transport"
	| "shopping"
	| "entertainment"
	| "bills"
	| "health"
	| "education"
	| "travel"
	| "groceries"
	| "personal"
	| "investments"
	| "rent"
	| "utilities"
	| "subscriptions"
	| "insurance"
	| "gifts"
	| "other";
export type IncomeCategory =
	| "salary"
	| "freelance"
	| "business"
	| "investments"
	| "rental"
	| "gifts"
	| "refunds"
	| "other";
export type Frequency =
	| "daily"
	| "weekly"
	| "biweekly"
	| "monthly"
	| "yearly"
	| "once";

export interface Account {
	id: string;
	name: string;
	type: AccountType;
	balance: number;
	currency?: string;
	isDefault?: boolean;
	icon?: string;
	color?: string;
	bankName?: string;
	accountNumber?: string;
	creditLimit?: number;
	creditUsed?: number;
	isSettled?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Transaction {
	id: string;
	type: TransactionType;
	amount: number;
	category: ExpenseCategory | IncomeCategory;
	description: string;
	date: string;
	time: string;
	accountId: string;
	toAccountId?: string;
	paymentMethod: PaymentMethod;
	tags?: string[];
	notes?: string;
	isRecurring?: boolean;
	recurringId?: string;
	attachments?: string[];
	location?: string;
	createdAt: string;
	updatedAt: string;
}

export interface RecurringTransaction {
	id: string;
	type: TransactionType;
	amount: number;
	category: ExpenseCategory | IncomeCategory;
	description: string;
	frequency: Frequency;
	startDate: string;
	endDate?: string;
	nextDueDate: string;
	lastProcessed?: string;
	accountId: string;
	paymentMethod: PaymentMethod;
	isActive: boolean;
	createdAt: string;
}

export interface Budget {
	id: string;
	category: ExpenseCategory;
	amount: number;
	spent: number;
	period: "weekly" | "monthly" | "yearly";
	startDate: string;
	endDate: string;
	alertThreshold?: number;
	createdAt: string;
}

export interface SavingsContribution {
	id: string;
	amount: number;
	date: string;
	note?: string;
	accountId?: string;
	type: "contribution" | "withdrawal";
}

export interface SavingsGoal {
	id: string;
	name: string;
	targetAmount: number;
	currentAmount: number;
	targetDate?: string;
	category?: string;
	icon?: string;
	color?: string;
	contributions: SavingsContribution[];
	isCompleted: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface BillReminder {
	id: string;
	name: string;
	amount: number;
	dueDate: string;
	category: ExpenseCategory;
	frequency: Frequency;
	isPaid: boolean;
	paidDate?: string;
	paidFromAccountId?: string;
	reminderDays?: number;
	notes?: string;
	createdAt: string;
}

export interface DebtPayment {
	id: string;
	amount: number;
	date: string;
	note?: string;
	accountId?: string;
}

export interface Debt {
	id: string;
	type: "owe" | "lent" | "credit_card";
	personName: string;
	originalAmount: number;
	remainingAmount: number;
	description?: string;
	dueDate?: string;
	payments: DebtPayment[];
	isSettled: boolean;
	linkedCreditCardId?: string;
	createdAt: string;
	updatedAt: string;
}

export interface GroupMember {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	avatar?: string;
	isCurrentUser: boolean;
	userId?: string;
	role: "admin" | "member";
	joinedAt: string;
	invitedBy?: string;
}

export interface ExpenseSplit {
	memberId: string;
	amount: number;
	percentage?: number;
	shares?: number;
	isPaid: boolean;
}

export interface SplitExpense {
	id: string;
	groupId: string;
	description: string;
	amount: number;
	paidBy: string;
	category: ExpenseCategory;
	date: string;
	splitType: "equal" | "exact" | "percentage" | "shares";
	splits: ExpenseSplit[];
	isSettled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Settlement {
	id: string;
	groupId: string;
	fromMemberId: string;
	toMemberId: string;
	amount: number;
	date: string;
	createdAt: string;
}

export interface SplitGroup {
	id: string;
	name: string;
	description?: string;
	members: GroupMember[];
	expenses: SplitExpense[];
	settlements: Settlement[];
	totalExpenses: number;
	color: string;
	icon: string;
	createdBy: string;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Balance {
	memberId: string;
	balance: number;
}

export interface SpendingByCategory {
	category: ExpenseCategory;
	amount: number;
	percentage: number;
	transactionCount: number;
}

export interface MonthlyTrend {
	month: string;
	year: number;
	income: number;
	expense: number;
	savings: number;
}

export interface FinancialSummary {
	totalIncome: number;
	totalExpenses: number;
	balance: number;
	netSavings: number;
	topCategories: SpendingByCategory[];
	averageDailySpending: number;
	largestExpense: Transaction | null;
}
