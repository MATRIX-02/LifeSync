// Finance Tracker Types

// Transaction Types
export type TransactionType = "income" | "expense" | "transfer";

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
	| "subscriptions"
	| "rent"
	| "utilities"
	| "insurance"
	| "investments"
	| "gifts"
	| "personal"
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

export type PaymentMethod =
	| "cash"
	| "credit_card"
	| "debit_card"
	| "upi"
	| "net_banking"
	| "wallet"
	| "other";

// Account/Wallet Types
export interface Account {
	id: string;
	name: string;
	type: "cash" | "bank" | "credit_card" | "wallet" | "investment";
	balance: number;
	currency: string;
	color: string;
	icon: string;
	isDefault: boolean;
	// Credit Card specific
	creditLimit?: number; // Only for credit_card type
	creditUsed?: number; // Amount currently spent on credit card
	isSettled?: boolean; // For credit cards that have been settled/paid off
	createdAt: string;
	updatedAt: string;
}

// Transaction Interface
export interface Transaction {
	id: string;
	type: TransactionType;
	amount: number;
	category: ExpenseCategory | IncomeCategory;
	description?: string;
	note?: string;
	date: string;
	time: string;
	accountId: string;
	toAccountId?: string; // For transfers
	paymentMethod: PaymentMethod;
	isRecurring: boolean;
	recurringId?: string;
	tags?: string[];
	attachments?: string[];
	location?: string;
	createdAt: string;
	updatedAt: string;
}

// Recurring Transaction
export interface RecurringTransaction {
	id: string;
	type: TransactionType;
	amount: number;
	category: ExpenseCategory | IncomeCategory;
	description: string;
	accountId: string;
	paymentMethod: PaymentMethod;
	frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
	startDate: string;
	endDate?: string;
	nextDueDate: string;
	isActive: boolean;
	lastProcessed?: string;
	createdAt: string;
}

// Budget Interface
export interface Budget {
	id: string;
	category: ExpenseCategory;
	amount: number;
	spent: number;
	period: "weekly" | "monthly" | "yearly";
	startDate: string;
	endDate: string;
	alertThreshold: number; // Percentage (e.g., 80 means alert at 80%)
	isActive: boolean;
	createdAt: string;
}

// Savings Goal
export interface SavingsGoal {
	id: string;
	name: string;
	targetAmount: number;
	currentAmount: number;
	deadline?: string;
	color: string;
	icon: string;
	priority: "low" | "medium" | "high";
	isCompleted: boolean;
	contributions: GoalContribution[];
	linkedAccountId?: string; // Account linked to this goal
	createdAt: string;
	updatedAt: string;
}

export interface GoalContribution {
	id: string;
	amount: number; // Positive = contribution, Negative = withdrawal
	date: string;
	note?: string;
	accountId?: string; // Account the contribution came from / went to
	type: "contribution" | "withdrawal";
}

// Bill Reminder
export interface BillReminder {
	id: string;
	name: string;
	amount: number;
	category: ExpenseCategory;
	dueDate: string;
	frequency: "once" | "weekly" | "monthly" | "yearly";
	isPaid: boolean;
	paidDate?: string;
	paidFromAccountId?: string; // Account used to pay the bill
	reminderDays: number; // Days before due date to remind
	isAutoDeduct: boolean;
	accountId?: string;
	notificationId?: string; // ID for canceling scheduled notification
	notes?: string;
	createdAt: string;
}

// Debt Tracking
export interface Debt {
	id: string;
	type: "owe" | "lent" | "credit_card"; // credit_card = CC debt
	personName: string;
	personContact?: string;
	originalAmount: number;
	remainingAmount: number;
	description: string;
	dueDate?: string;
	interestRate?: number;
	minimumPayment?: number;
	payments: DebtPayment[];
	isSettled: boolean;
	linkedAccountId?: string; // Account to deduct payments from (or credit card account)
	linkedCreditCardId?: string; // For credit card debts, the credit card account ID
	createdAt: string;
	updatedAt: string;
}

export interface DebtPayment {
	id: string;
	amount: number;
	date: string;
	note?: string;
	accountId?: string; // Account payment was made from
}

// ============== SPLITWISE FEATURES ==============

// Split Group
export interface SplitGroup {
	id: string;
	name: string;
	description?: string;
	members: GroupMember[];
	expenses: SplitExpense[];
	settlements: Settlement[];
	color: string;
	icon: string;
	totalExpenses: number;
	createdAt: string;
	updatedAt: string;
	isArchived: boolean;
}

export interface GroupMember {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	avatar?: string;
	isCurrentUser: boolean;
}

// Split Expense
export interface SplitExpense {
	id: string;
	groupId: string;
	description: string;
	amount: number;
	category: ExpenseCategory;
	paidBy: string; // Member ID who paid
	date: string;
	splitType: "equal" | "exact" | "percentage" | "shares";
	splits: ExpenseSplit[];
	note?: string;
	attachments?: string[];
	isSettled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ExpenseSplit {
	memberId: string;
	amount: number;
	percentage?: number;
	shares?: number;
	isPaid: boolean;
}

// Balance between two people
export interface Balance {
	memberId: string;
	balance: number; // Positive = others owe this person, Negative = this person owes others
}

// Simplified debt for settlement
export interface SimplifiedDebt {
	fromMemberId: string;
	toMemberId: string;
	amount: number; // Positive means fromMember owes toMember
}

// Settlement
export interface Settlement {
	id: string;
	groupId: string;
	fromMemberId: string;
	toMemberId: string;
	amount: number;
	date: string;
	note?: string;
	createdAt: string;
}

// ============== ANALYTICS ==============

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

// Category Info for UI
export interface CategoryInfo {
	name: string;
	icon: string;
	color: string;
}

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, CategoryInfo> = {
	food: { name: "Food & Dining", icon: "restaurant", color: "#FF6B6B" },
	transport: { name: "Transport", icon: "car", color: "#4ECDC4" },
	shopping: { name: "Shopping", icon: "bag-handle", color: "#9B59B6" },
	entertainment: {
		name: "Entertainment",
		icon: "game-controller",
		color: "#E74C3C",
	},
	bills: { name: "Bills", icon: "receipt", color: "#3498DB" },
	health: { name: "Health", icon: "medkit", color: "#2ECC71" },
	education: { name: "Education", icon: "school", color: "#F39C12" },
	travel: { name: "Travel", icon: "airplane", color: "#1ABC9C" },
	groceries: { name: "Groceries", icon: "cart", color: "#27AE60" },
	subscriptions: { name: "Subscriptions", icon: "repeat", color: "#8E44AD" },
	rent: { name: "Rent", icon: "home", color: "#34495E" },
	utilities: { name: "Utilities", icon: "flash", color: "#F1C40F" },
	insurance: { name: "Insurance", icon: "shield-checkmark", color: "#16A085" },
	investments: { name: "Investments", icon: "trending-up", color: "#2980B9" },
	gifts: { name: "Gifts", icon: "gift", color: "#E91E63" },
	personal: { name: "Personal Care", icon: "person", color: "#9C27B0" },
	other: { name: "Other", icon: "ellipsis-horizontal", color: "#95A5A6" },
};

export const INCOME_CATEGORIES: Record<IncomeCategory, CategoryInfo> = {
	salary: { name: "Salary", icon: "briefcase", color: "#27AE60" },
	freelance: { name: "Freelance", icon: "laptop", color: "#3498DB" },
	business: { name: "Business", icon: "business", color: "#9B59B6" },
	investments: { name: "Investments", icon: "trending-up", color: "#2980B9" },
	rental: { name: "Rental Income", icon: "home", color: "#F39C12" },
	gifts: { name: "Gifts", icon: "gift", color: "#E91E63" },
	refunds: { name: "Refunds", icon: "refresh", color: "#1ABC9C" },
	other: { name: "Other", icon: "ellipsis-horizontal", color: "#95A5A6" },
};

export const ACCOUNT_ICONS = [
	"wallet",
	"card",
	"cash",
	"business",
	"home",
	"briefcase",
	"diamond",
	"trending-up",
];

export const GROUP_ICONS = [
	"people",
	"home",
	"airplane",
	"restaurant",
	"car",
	"heart",
	"star",
	"trophy",
	"gift",
	"musical-notes",
];

export const COLORS = [
	"#FF6B6B",
	"#4ECDC4",
	"#9B59B6",
	"#3498DB",
	"#2ECC71",
	"#F39C12",
	"#E74C3C",
	"#1ABC9C",
	"#34495E",
	"#E91E63",
];
