// Finance Store - Zustand state management for Finance Tracker

import {
	Account,
	Balance,
	BillReminder,
	Budget,
	Debt,
	ExpenseCategory,
	FinancialSummary,
	IncomeCategory,
	MonthlyTrend,
	RecurringTransaction,
	SavingsGoal,
	Settlement,
	SpendingByCategory,
	SplitExpense,
	SplitGroup,
	Transaction,
} from "@/src/types/finance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FinanceStore {
	// Accounts
	accounts: Account[];
	addAccount: (
		account: Omit<Account, "id" | "createdAt" | "updatedAt">
	) => void;
	updateAccount: (id: string, updates: Partial<Account>) => void;
	deleteAccount: (id: string) => void;
	setDefaultAccount: (id: string) => void;
	getDefaultAccount: () => Account | undefined;

	// Transactions
	transactions: Transaction[];
	addTransaction: (
		transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">
	) => void;
	updateTransaction: (id: string, updates: Partial<Transaction>) => void;
	deleteTransaction: (id: string) => void;
	getTransactionsByAccount: (accountId: string) => Transaction[];
	getTransactionsByCategory: (
		category: ExpenseCategory | IncomeCategory
	) => Transaction[];
	getTransactionsByDateRange: (
		startDate: string,
		endDate: string
	) => Transaction[];

	// Recurring Transactions
	recurringTransactions: RecurringTransaction[];
	addRecurringTransaction: (
		transaction: Omit<RecurringTransaction, "id" | "createdAt">
	) => void;
	updateRecurringTransaction: (
		id: string,
		updates: Partial<RecurringTransaction>
	) => void;
	deleteRecurringTransaction: (id: string) => void;
	processRecurringTransactions: () => void;

	// Budgets
	budgets: Budget[];
	addBudget: (budget: Omit<Budget, "id" | "spent" | "createdAt">) => void;
	updateBudget: (id: string, updates: Partial<Budget>) => void;
	deleteBudget: (id: string) => void;
	getBudgetProgress: (budgetId: string) => {
		spent: number;
		remaining: number;
		percentage: number;
	};

	// Savings Goals
	savingsGoals: SavingsGoal[];
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
	) => void;
	updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
	deleteSavingsGoal: (id: string) => void;
	contributeToGoal: (
		goalId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => void;
	withdrawFromGoal: (
		goalId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => void;

	// Bill Reminders
	billReminders: BillReminder[];
	addBillReminder: (
		bill: Omit<BillReminder, "id" | "isPaid" | "createdAt">
	) => void;
	updateBillReminder: (id: string, updates: Partial<BillReminder>) => void;
	deleteBillReminder: (id: string) => void;
	markBillPaid: (id: string, accountId?: string) => void;
	getUpcomingBills: (days: number) => BillReminder[];

	// Debts
	debts: Debt[];
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
	) => void;
	updateDebt: (id: string, updates: Partial<Debt>) => void;
	deleteDebt: (id: string) => void;
	recordDebtPayment: (
		debtId: string,
		amount: number,
		note?: string,
		accountId?: string
	) => void;
	settleDebt: (debtId: string) => void;

	// Split Groups
	splitGroups: SplitGroup[];
	addSplitGroup: (
		group: Omit<
			SplitGroup,
			| "id"
			| "totalExpenses"
			| "expenses"
			| "settlements"
			| "createdAt"
			| "updatedAt"
			| "isArchived"
		>
	) => void;
	updateSplitGroup: (id: string, updates: Partial<SplitGroup>) => void;
	deleteSplitGroup: (id: string) => void;
	archiveSplitGroup: (id: string) => void;
	addGroupMember: (groupId: string, memberName: string) => void;
	removeGroupMember: (groupId: string, memberId: string) => void;

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
	) => void;
	updateSplitExpense: (id: string, updates: Partial<SplitExpense>) => void;
	deleteSplitExpense: (groupId: string, expenseId: string) => void;
	getGroupExpenses: (groupId: string) => SplitExpense[];
	getGroupBalances: (groupId: string) => Balance[];
	getMemberBalance: (groupId: string, memberId: string) => number;

	// Settlements
	addSettlement: (
		groupId: string,
		settlement: { fromMember: string; toMember: string; amount: number }
	) => void;
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
	currency: string;
	setCurrency: (currency: string) => void;

	// Import/Export
	initialize: (userId: string) => Promise<void>;
	importData: (data: {
		accounts?: Account[];
		transactions?: Transaction[];
		recurringTransactions?: RecurringTransaction[];
		budgets?: Budget[];
		savingsGoals?: SavingsGoal[];
		billReminders?: BillReminder[];
		debts?: Debt[];
		splitGroups?: SplitGroup[];
		currency?: string;
	}) => void;
	clearAllData: () => void;
}

const generateId = () =>
	Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useFinanceStore = create<FinanceStore>()(
	persist(
		(set, get) => ({
			// Initial State
			accounts: [],
			transactions: [],
			recurringTransactions: [],
			budgets: [],
			savingsGoals: [],
			billReminders: [],
			debts: [],
			splitGroups: [],
			currency: "₹",

			// Account Methods
			addAccount: (account) =>
				set((state) => ({
					accounts: [
						...state.accounts,
						{
							...account,
							id: generateId(),
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						},
					],
				})),

			updateAccount: (id, updates) =>
				set((state) => ({
					accounts: state.accounts.map((acc) =>
						acc.id === id
							? { ...acc, ...updates, updatedAt: new Date().toISOString() }
							: acc
					),
				})),

			deleteAccount: (id) =>
				set((state) => ({
					accounts: state.accounts.filter((acc) => acc.id !== id),
				})),

			setDefaultAccount: (id) =>
				set((state) => ({
					accounts: state.accounts.map((acc) => ({
						...acc,
						isDefault: acc.id === id,
					})),
				})),

			getDefaultAccount: () => {
				const { accounts } = get();
				return accounts.find((acc) => acc.isDefault) || accounts[0];
			},

			// Transaction Methods
			addTransaction: (transaction) =>
				set((state) => {
					const newTransaction: Transaction = {
						...transaction,
						id: generateId(),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};

					// Update account balance
					const accounts = state.accounts.map((acc) => {
						if (acc.id === transaction.accountId) {
							const balanceChange =
								transaction.type === "income"
									? transaction.amount
									: transaction.type === "expense"
									? -transaction.amount
									: -transaction.amount; // transfer out

							// For credit card expenses, also track creditUsed
							const updatedAcc = {
								...acc,
								balance: acc.balance + balanceChange,
							};
							if (
								transaction.type === "expense" &&
								acc.type === "credit_card"
							) {
								updatedAcc.creditUsed =
									(acc.creditUsed || 0) + transaction.amount;
							}
							return updatedAcc;
						}
						if (transaction.toAccountId && acc.id === transaction.toAccountId) {
							return { ...acc, balance: acc.balance + transaction.amount }; // transfer in
						}
						return acc;
					});

					// Create credit card debt if expense is from a credit card
					let newDebts = state.debts;
					const sourceAccount = state.accounts.find(
						(a) => a.id === transaction.accountId
					);

					if (
						transaction.type === "expense" &&
						sourceAccount?.type === "credit_card"
					) {
						// Check if there's already an unsettled CC debt for this card
						const existingCCDebt = state.debts.find(
							(d) =>
								d.linkedCreditCardId === transaction.accountId && !d.isSettled
						);

						if (existingCCDebt) {
							// Update existing credit card debt
							newDebts = state.debts.map((d) =>
								d.id === existingCCDebt.id
									? {
											...d,
											originalAmount: d.originalAmount + transaction.amount,
											remainingAmount: d.remainingAmount + transaction.amount,
											description: `Credit card expenses on ${sourceAccount.name}`,
											updatedAt: new Date().toISOString(),
									  }
									: d
							);
						} else {
							// Create new credit card debt
							const ccDebt: Debt = {
								id: generateId(),
								type: "owe", // User owes the credit card company
								personName: `${sourceAccount.name} (Credit Card)`,
								originalAmount: transaction.amount,
								remainingAmount: transaction.amount,
								description: `Credit card debt on ${sourceAccount.name}`,
								payments: [],
								isSettled: false,
								linkedCreditCardId: transaction.accountId,
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							};
							newDebts = [ccDebt, ...state.debts];
						}
					}

					return {
						transactions: [newTransaction, ...state.transactions],
						accounts,
						debts: newDebts,
					};
				}),

			updateTransaction: (id, updates) =>
				set((state) => ({
					transactions: state.transactions.map((t) =>
						t.id === id
							? { ...t, ...updates, updatedAt: new Date().toISOString() }
							: t
					),
				})),

			deleteTransaction: (id) =>
				set((state) => {
					const transaction = state.transactions.find((t) => t.id === id);
					if (!transaction) return state;

					// Reverse the balance change
					const accounts = state.accounts.map((acc) => {
						if (acc.id === transaction.accountId) {
							const balanceChange =
								transaction.type === "income"
									? -transaction.amount
									: transaction.type === "expense"
									? transaction.amount
									: transaction.amount;

							// For credit card expenses, also reverse creditUsed
							const updatedAcc = {
								...acc,
								balance: acc.balance + balanceChange,
							};
							if (
								transaction.type === "expense" &&
								acc.type === "credit_card"
							) {
								updatedAcc.creditUsed = Math.max(
									0,
									(acc.creditUsed || 0) - transaction.amount
								);
							}
							return updatedAcc;
						}
						if (transaction.toAccountId && acc.id === transaction.toAccountId) {
							return { ...acc, balance: acc.balance - transaction.amount };
						}
						return acc;
					});

					// Reverse credit card debt if applicable
					let newDebts = state.debts;
					if (transaction.type === "expense") {
						const sourceAccount = state.accounts.find(
							(a) => a.id === transaction.accountId
						);
						if (sourceAccount?.type === "credit_card") {
							const existingCCDebt = state.debts.find(
								(d) =>
									d.linkedCreditCardId === transaction.accountId && !d.isSettled
							);

							if (existingCCDebt) {
								const newRemainingAmount =
									existingCCDebt.remainingAmount - transaction.amount;
								if (newRemainingAmount <= 0) {
									// If no remaining amount, remove the debt
									newDebts = state.debts.filter(
										(d) => d.id !== existingCCDebt.id
									);
								} else {
									// Update the debt
									newDebts = state.debts.map((d) =>
										d.id === existingCCDebt.id
											? {
													...d,
													remainingAmount: newRemainingAmount,
													updatedAt: new Date().toISOString(),
											  }
											: d
									);
								}
							}
						}
					}

					return {
						transactions: state.transactions.filter((t) => t.id !== id),
						accounts,
						debts: newDebts,
					};
				}),

			getTransactionsByAccount: (accountId) => {
				const { transactions } = get();
				return transactions.filter(
					(t) => t.accountId === accountId || t.toAccountId === accountId
				);
			},

			getTransactionsByCategory: (category) => {
				const { transactions } = get();
				return transactions.filter((t) => t.category === category);
			},

			getTransactionsByDateRange: (startDate, endDate) => {
				const { transactions } = get();
				return transactions.filter(
					(t) => t.date >= startDate && t.date <= endDate
				);
			},

			// Recurring Transaction Methods
			addRecurringTransaction: (transaction) =>
				set((state) => ({
					recurringTransactions: [
						...state.recurringTransactions,
						{
							...transaction,
							id: generateId(),
							createdAt: new Date().toISOString(),
						},
					],
				})),

			updateRecurringTransaction: (id, updates) =>
				set((state) => ({
					recurringTransactions: state.recurringTransactions.map((t) =>
						t.id === id ? { ...t, ...updates } : t
					),
				})),

			deleteRecurringTransaction: (id) =>
				set((state) => ({
					recurringTransactions: state.recurringTransactions.filter(
						(t) => t.id !== id
					),
				})),

			processRecurringTransactions: () => {
				const { recurringTransactions, addTransaction } = get();
				const today = new Date().toISOString().split("T")[0];

				recurringTransactions.forEach((recurring) => {
					if (!recurring.isActive || recurring.nextDueDate > today) return;
					if (recurring.endDate && recurring.endDate < today) return;

					// Create the transaction
					addTransaction({
						type: recurring.type,
						amount: recurring.amount,
						category: recurring.category,
						description: recurring.description,
						date: today,
						time: new Date().toTimeString().split(" ")[0],
						accountId: recurring.accountId,
						paymentMethod: recurring.paymentMethod,
						isRecurring: true,
						recurringId: recurring.id,
					});

					// Calculate next due date
					const nextDate = new Date(recurring.nextDueDate);
					switch (recurring.frequency) {
						case "daily":
							nextDate.setDate(nextDate.getDate() + 1);
							break;
						case "weekly":
							nextDate.setDate(nextDate.getDate() + 7);
							break;
						case "biweekly":
							nextDate.setDate(nextDate.getDate() + 14);
							break;
						case "monthly":
							nextDate.setMonth(nextDate.getMonth() + 1);
							break;
						case "yearly":
							nextDate.setFullYear(nextDate.getFullYear() + 1);
							break;
					}

					set((state) => ({
						recurringTransactions: state.recurringTransactions.map((t) =>
							t.id === recurring.id
								? {
										...t,
										nextDueDate: nextDate.toISOString().split("T")[0],
										lastProcessed: today,
								  }
								: t
						),
					}));
				});
			},

			// Budget Methods
			addBudget: (budget) =>
				set((state) => ({
					budgets: [
						...state.budgets,
						{
							...budget,
							id: generateId(),
							spent: 0,
							createdAt: new Date().toISOString(),
						},
					],
				})),

			updateBudget: (id, updates) =>
				set((state) => ({
					budgets: state.budgets.map((b) =>
						b.id === id ? { ...b, ...updates } : b
					),
				})),

			deleteBudget: (id) =>
				set((state) => ({
					budgets: state.budgets.filter((b) => b.id !== id),
				})),

			getBudgetProgress: (budgetId) => {
				const { budgets, transactions } = get();
				const budget = budgets.find((b) => b.id === budgetId);
				if (!budget) return { spent: 0, remaining: 0, percentage: 0 };

				const spent = transactions
					.filter(
						(t) =>
							t.type === "expense" &&
							t.category === budget.category &&
							t.date >= budget.startDate &&
							t.date <= budget.endDate
					)
					.reduce((sum, t) => sum + t.amount, 0);

				return {
					spent,
					remaining: Math.max(0, budget.amount - spent),
					percentage: Math.min(100, (spent / budget.amount) * 100),
				};
			},

			// Savings Goal Methods
			addSavingsGoal: (goal) =>
				set((state) => ({
					savingsGoals: [
						...state.savingsGoals,
						{
							...goal,
							id: generateId(),
							currentAmount: 0,
							contributions: [],
							isCompleted: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						},
					],
				})),

			updateSavingsGoal: (id, updates) =>
				set((state) => ({
					savingsGoals: state.savingsGoals.map((g) =>
						g.id === id
							? { ...g, ...updates, updatedAt: new Date().toISOString() }
							: g
					),
				})),

			deleteSavingsGoal: (id) =>
				set((state) => ({
					savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
				})),

			contributeToGoal: (goalId, amount, note, accountId?: string) =>
				set((state) => {
					const goal = state.savingsGoals.find((g) => g.id === goalId);
					if (!goal) return state;

					// Update account balance if accountId provided
					let accounts = state.accounts;
					let transactions = state.transactions;

					if (accountId) {
						accounts = state.accounts.map((acc) =>
							acc.id === accountId
								? { ...acc, balance: acc.balance - amount } // Money goes from account to savings
								: acc
						);

						// Create transfer transaction
						const newTransaction = {
							id: generateId(),
							type: "expense" as const,
							amount: amount,
							category: "investments" as const,
							description: `Savings: ${goal.name}`,
							date: new Date().toISOString().split("T")[0],
							time: new Date().toTimeString().split(" ")[0],
							accountId: accountId,
							paymentMethod: "net_banking" as const,
							isRecurring: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						};
						transactions = [newTransaction, ...state.transactions];
					}

					const savingsGoals = state.savingsGoals.map((g) => {
						if (g.id !== goalId) return g;
						const newAmount = g.currentAmount + amount;
						return {
							...g,
							currentAmount: newAmount,
							isCompleted: newAmount >= g.targetAmount,
							contributions: [
								...g.contributions,
								{
									id: generateId(),
									amount,
									date: new Date().toISOString(),
									note,
									accountId,
									type: "contribution" as const,
								},
							],
							updatedAt: new Date().toISOString(),
						};
					});

					return { savingsGoals, accounts, transactions };
				}),

			withdrawFromGoal: (goalId, amount, note, accountId?: string) =>
				set((state) => {
					const goal = state.savingsGoals.find((g) => g.id === goalId);
					if (!goal) return state;

					// Cap withdrawal at current amount
					const actualWithdrawal = Math.min(amount, goal.currentAmount);

					// Update account balance if accountId provided
					let accounts = state.accounts;
					let transactions = state.transactions;

					if (accountId && actualWithdrawal > 0) {
						accounts = state.accounts.map((acc) =>
							acc.id === accountId
								? { ...acc, balance: acc.balance + actualWithdrawal } // Money goes back to account
								: acc
						);

						// Create income transaction
						const newTransaction = {
							id: generateId(),
							type: "income" as const,
							amount: actualWithdrawal,
							category: "other" as const,
							description: `Withdrawal from: ${goal.name}`,
							date: new Date().toISOString().split("T")[0],
							time: new Date().toTimeString().split(" ")[0],
							accountId: accountId,
							paymentMethod: "net_banking" as const,
							isRecurring: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						};
						transactions = [newTransaction, ...state.transactions];
					}

					const savingsGoals = state.savingsGoals.map((g) => {
						if (g.id !== goalId) return g;
						const newAmount = g.currentAmount - actualWithdrawal;
						return {
							...g,
							currentAmount: newAmount,
							isCompleted: false,
							contributions: [
								...g.contributions,
								{
									id: generateId(),
									amount: -actualWithdrawal,
									date: new Date().toISOString(),
									note,
									accountId,
									type: "withdrawal" as const,
								},
							],
							updatedAt: new Date().toISOString(),
						};
					});

					return { savingsGoals, accounts, transactions };
				}),

			// Bill Reminder Methods
			addBillReminder: (bill) =>
				set((state) => ({
					billReminders: [
						...state.billReminders,
						{
							...bill,
							id: generateId(),
							isPaid: false,
							createdAt: new Date().toISOString(),
						},
					],
				})),

			updateBillReminder: (id, updates) =>
				set((state) => ({
					billReminders: state.billReminders.map((b) =>
						b.id === id ? { ...b, ...updates } : b
					),
				})),

			deleteBillReminder: (id) =>
				set((state) => ({
					billReminders: state.billReminders.filter((b) => b.id !== id),
				})),

			markBillPaid: (id, accountId?: string) =>
				set((state) => {
					const bill = state.billReminders.find((b) => b.id === id);
					if (!bill || bill.isPaid) return state; // Don't allow unpaying

					// Deduct from account if provided
					let accounts = state.accounts;
					let transactions = state.transactions;

					if (accountId) {
						accounts = state.accounts.map((acc) =>
							acc.id === accountId
								? { ...acc, balance: acc.balance - bill.amount }
								: acc
						);

						// Create expense transaction
						const newTransaction = {
							id: generateId(),
							type: "expense" as const,
							amount: bill.amount,
							category: bill.category,
							description: `Bill Payment: ${bill.name}`,
							date: new Date().toISOString().split("T")[0],
							time: new Date().toTimeString().split(" ")[0],
							accountId: accountId,
							paymentMethod: "net_banking" as const,
							isRecurring: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						};
						transactions = [newTransaction, ...state.transactions];
					}

					// If recurring, create next bill
					let newBillReminders = state.billReminders.map((b) =>
						b.id === id
							? {
									...b,
									isPaid: true,
									paidDate: new Date().toISOString(),
									paidFromAccountId: accountId,
							  }
							: b
					);

					// Create next bill for recurring bills
					if (bill.frequency !== "once") {
						const dueDate = new Date(bill.dueDate);
						switch (bill.frequency) {
							case "weekly":
								dueDate.setDate(dueDate.getDate() + 7);
								break;
							case "monthly":
								dueDate.setMonth(dueDate.getMonth() + 1);
								break;
							case "yearly":
								dueDate.setFullYear(dueDate.getFullYear() + 1);
								break;
						}

						newBillReminders.push({
							...bill,
							id: generateId(),
							dueDate: dueDate.toISOString().split("T")[0],
							isPaid: false,
							paidDate: undefined,
							paidFromAccountId: undefined,
							createdAt: new Date().toISOString(),
						});
					}

					return { billReminders: newBillReminders, accounts, transactions };
				}),

			getUpcomingBills: (days) => {
				const { billReminders } = get();
				const today = new Date();
				const futureDate = new Date();
				futureDate.setDate(today.getDate() + days);

				return billReminders.filter((b) => {
					if (b.isPaid) return false;
					const dueDate = new Date(b.dueDate);
					return dueDate >= today && dueDate <= futureDate;
				});
			},

			// Debt Methods
			addDebt: (debt) =>
				set((state) => ({
					debts: [
						...state.debts,
						{
							...debt,
							id: generateId(),
							remainingAmount: debt.originalAmount,
							payments: [],
							isSettled: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						},
					],
				})),

			updateDebt: (id, updates) =>
				set((state) => ({
					debts: state.debts.map((d) =>
						d.id === id
							? { ...d, ...updates, updatedAt: new Date().toISOString() }
							: d
					),
				})),

			deleteDebt: (id) =>
				set((state) => ({
					debts: state.debts.filter((d) => d.id !== id),
				})),

			recordDebtPayment: (debtId, amount, note, accountId?: string) =>
				set((state) => {
					const debt = state.debts.find((d) => d.id === debtId);
					if (!debt || debt.isSettled) return state; // Don't allow payment on settled debt

					// Handle overpayment - cap at remaining amount
					const actualPayment = Math.min(amount, debt.remainingAmount);
					const overpayment = amount - actualPayment;
					const newRemaining = debt.remainingAmount - actualPayment;

					// Update accounts if accountId provided
					let accounts = state.accounts;
					let transactions = state.transactions;

					if (accountId && actualPayment > 0) {
						const isOwe = debt.type === "owe";
						const isCreditCard = debt.type === "credit_card";

						accounts = state.accounts.map((acc) => {
							if (acc.id === accountId) {
								if (isCreditCard) {
									// For CC payments, money goes out
									return {
										...acc,
										balance: acc.balance - actualPayment,
									};
								} else {
									return {
										...acc,
										balance: isOwe
											? acc.balance - actualPayment // I owe = money goes out
											: acc.balance + actualPayment, // They owe me = money comes in
									};
								}
							}
							return acc;
						});

						// Create transaction
						const newTransaction = {
							id: generateId(),
							type: "expense" as const,
							amount: actualPayment,
							category: "personal" as const,
							description: isCreditCard
								? `Credit Card Payment - ${debt.personName}`
								: isOwe
								? `Debt Payment to ${debt.personName}`
								: `Debt Received from ${debt.personName}`,
							date: new Date().toISOString().split("T")[0],
							time: new Date().toTimeString().split(" ")[0],
							accountId: accountId,
							paymentMethod: "net_banking" as const,
							isRecurring: false,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						};
						transactions = [newTransaction, ...state.transactions];
					}

					const debts = state.debts.map((d) => {
						if (d.id !== debtId) return d;
						return {
							...d,
							remainingAmount: newRemaining,
							isSettled: newRemaining === 0,
							payments: [
								...d.payments,
								{
									id: generateId(),
									amount: actualPayment,
									date: new Date().toISOString(),
									note:
										overpayment > 0
											? `${
													note || ""
											  } (Overpayment of ${overpayment} ignored)`.trim()
											: note,
									accountId,
								},
							],
							updatedAt: new Date().toISOString(),
						};
					});

					// If CC debt is fully settled, mark the account as settled
					if (
						debt.type === "credit_card" &&
						newRemaining === 0 &&
						debt.linkedCreditCardId
					) {
						accounts = accounts.map((acc) =>
							acc.id === debt.linkedCreditCardId
								? {
										...acc,
										isSettled: true,
										creditUsed: 0,
										updatedAt: new Date().toISOString(),
								  }
								: acc
						);
					}

					return { debts, accounts, transactions };
				}),

			settleDebt: (debtId) =>
				set((state) => {
					const debtToSettle = state.debts.find((d) => d.id === debtId);
					if (!debtToSettle) return state;

					// Update debts
					const updatedDebts = state.debts.map((d) =>
						d.id === debtId
							? {
									...d,
									remainingAmount: 0,
									isSettled: true,
									updatedAt: new Date().toISOString(),
							  }
							: d
					);

					// If it's a credit card debt, mark the card as settled
					let updatedAccounts = state.accounts;
					if (
						debtToSettle.type === "credit_card" &&
						debtToSettle.linkedCreditCardId
					) {
						updatedAccounts = state.accounts.map((acc) =>
							acc.id === debtToSettle.linkedCreditCardId
								? {
										...acc,
										isSettled: true,
										creditUsed: 0,
										updatedAt: new Date().toISOString(),
								  }
								: acc
						);
					}

					return {
						debts: updatedDebts,
						accounts: updatedAccounts,
					};
				}),

			// Split Group Methods
			addSplitGroup: (group) =>
				set((state) => ({
					splitGroups: [
						...state.splitGroups,
						{
							...group,
							id: generateId(),
							members: group.members || [],
							expenses: [],
							settlements: [],
							totalExpenses: 0,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							isArchived: false,
						},
					],
				})),

			updateSplitGroup: (id, updates) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) =>
						g.id === id
							? { ...g, ...updates, updatedAt: new Date().toISOString() }
							: g
					),
				})),

			deleteSplitGroup: (id) =>
				set((state) => ({
					splitGroups: state.splitGroups.filter((g) => g.id !== id),
				})),

			archiveSplitGroup: (id) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) =>
						g.id === id ? { ...g, isArchived: true } : g
					),
				})),

			addGroupMember: (groupId, memberName) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) =>
						g.id === groupId
							? {
									...g,
									members: [
										...g.members,
										{
											id: generateId(),
											name: memberName,
											isCurrentUser: g.members.length === 0, // First member is current user
										},
									],
									updatedAt: new Date().toISOString(),
							  }
							: g
					),
				})),

			removeGroupMember: (groupId, memberId) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) =>
						g.id === groupId
							? {
									...g,
									members: g.members.filter((m) => m.id !== memberId),
									updatedAt: new Date().toISOString(),
							  }
							: g
					),
				})),

			// Split Expense Methods
			addSplitExpense: (groupId, expenseData) =>
				set((state) => {
					// Map splits to include isPaid
					const mappedSplits = expenseData.splits.map((split) => ({
						...split,
						isPaid: false,
					}));

					const newExpense: SplitExpense = {
						...expenseData,
						splits: mappedSplits,
						id: generateId(),
						groupId,
						category: "other" as ExpenseCategory,
						date: new Date().toISOString().split("T")[0],
						splitType: (expenseData.splitMethod || "equal") as
							| "equal"
							| "exact"
							| "percentage"
							| "shares",
						isSettled: false,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};

					// Update group - add to expenses array and update total
					const splitGroups = state.splitGroups.map((g) =>
						g.id === groupId
							? {
									...g,
									expenses: [newExpense, ...g.expenses],
									totalExpenses: g.totalExpenses + expenseData.amount,
									updatedAt: new Date().toISOString(),
							  }
							: g
					);

					return {
						splitGroups,
					};
				}),

			updateSplitExpense: (id, updates) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) => ({
						...g,
						expenses: g.expenses.map((e) =>
							e.id === id
								? { ...e, ...updates, updatedAt: new Date().toISOString() }
								: e
						),
					})),
				})),

			deleteSplitExpense: (groupId, expenseId) =>
				set((state) => {
					const group = state.splitGroups.find((g) => g.id === groupId);
					const expense = group?.expenses.find((e) => e.id === expenseId);
					if (!expense) return state;

					const splitGroups = state.splitGroups.map((g) =>
						g.id === groupId
							? {
									...g,
									expenses: g.expenses.filter((e) => e.id !== expenseId),
									totalExpenses: g.totalExpenses - expense.amount,
							  }
							: g
					);

					return {
						splitGroups,
					};
				}),

			getGroupExpenses: (groupId) => {
				const { splitGroups } = get();
				const group = splitGroups.find((g) => g.id === groupId);
				return group?.expenses || [];
			},

			getGroupBalances: (groupId) => {
				const { splitGroups } = get();
				const group = splitGroups.find((g) => g.id === groupId);
				if (!group) return [];

				const members = group.members || [];
				const expenses = group.expenses || [];
				const groupSettlements = group.settlements || [];

				// Calculate how much each member has paid and owes
				const memberPaid: Map<string, number> = new Map();
				const memberOwes: Map<string, number> = new Map();

				// Initialize all members
				members.forEach((m) => {
					memberPaid.set(m.id, 0);
					memberOwes.set(m.id, 0);
				});

				// Calculate from expenses
				expenses.forEach((expense) => {
					// Who paid
					const currentPaid = memberPaid.get(expense.paidBy) || 0;
					memberPaid.set(expense.paidBy, currentPaid + expense.amount);

					// Who owes
					expense.splits.forEach((split) => {
						const currentOwes = memberOwes.get(split.memberId) || 0;
						memberOwes.set(split.memberId, currentOwes + split.amount);
					});
				});

				// Apply settlements
				groupSettlements.forEach((settlement) => {
					const fromPaid = memberPaid.get(settlement.fromMemberId) || 0;
					memberPaid.set(settlement.fromMemberId, fromPaid + settlement.amount);

					const toPaid = memberPaid.get(settlement.toMemberId) || 0;
					memberPaid.set(settlement.toMemberId, toPaid - settlement.amount);
				});

				// Calculate balance for each member (paid - owes)
				const result: Balance[] = [];
				members.forEach((m) => {
					const paid = memberPaid.get(m.id) || 0;
					const owes = memberOwes.get(m.id) || 0;
					result.push({
						memberId: m.id,
						balance: paid - owes, // Positive = others owe you, Negative = you owe others
					});
				});

				return result;
			},

			getMemberBalance: (groupId, memberId) => {
				const balances = get().getGroupBalances(groupId);
				const balance = balances.find((b) => b.memberId === memberId);
				return balance?.balance || 0;
			},

			// Settlement Methods
			addSettlement: (groupId, settlementData) =>
				set((state) => ({
					splitGroups: state.splitGroups.map((g) =>
						g.id === groupId
							? {
									...g,
									settlements: [
										...g.settlements,
										{
											id: generateId(),
											groupId,
											fromMemberId: settlementData.fromMember,
											toMemberId: settlementData.toMember,
											amount: settlementData.amount,
											date: new Date().toISOString().split("T")[0],
											createdAt: new Date().toISOString(),
										},
									],
									updatedAt: new Date().toISOString(),
							  }
							: g
					),
				})),

			getGroupSettlements: (groupId) => {
				const { splitGroups } = get();
				const group = splitGroups.find((g) => g.id === groupId);
				return group?.settlements || [];
			},

			// Analytics Methods
			getFinancialSummary: (startDate, endDate) => {
				const { transactions } = get();
				let filtered = transactions;

				if (startDate && endDate) {
					filtered = transactions.filter(
						(t) => t.date >= startDate && t.date <= endDate
					);
				}

				const totalIncome = filtered
					.filter((t) => t.type === "income")
					.reduce((sum, t) => sum + t.amount, 0);

				const totalExpense = filtered
					.filter((t) => t.type === "expense")
					.reduce((sum, t) => sum + t.amount, 0);

				const categorySpending: Record<
					string,
					{ amount: number; count: number }
				> = {};
				filtered
					.filter((t) => t.type === "expense")
					.forEach((t) => {
						if (!categorySpending[t.category]) {
							categorySpending[t.category] = { amount: 0, count: 0 };
						}
						categorySpending[t.category].amount += t.amount;
						categorySpending[t.category].count += 1;
					});

				const topCategories: SpendingByCategory[] = Object.entries(
					categorySpending
				)
					.map(([category, data]) => ({
						category: category as ExpenseCategory,
						amount: data.amount,
						percentage:
							totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
						transactionCount: data.count,
					}))
					.sort((a, b) => b.amount - a.amount)
					.slice(0, 5);

				const days =
					filtered.length > 0
						? Math.max(
								1,
								Math.ceil(
									(new Date(filtered[0].date).getTime() -
										new Date(filtered[filtered.length - 1].date).getTime()) /
										(1000 * 60 * 60 * 24)
								)
						  )
						: 1;

				const expenses = filtered.filter((t) => t.type === "expense");
				const largestExpense =
					expenses.length > 0
						? expenses.reduce((max, t) => (t.amount > max.amount ? t : max))
						: null;

				return {
					totalIncome,
					totalExpenses: totalExpense,
					balance: totalIncome - totalExpense,
					netSavings: totalIncome - totalExpense,
					topCategories,
					averageDailySpending: totalExpense / days,
					largestExpense,
				};
			},

			getSpendingByCategory: (startDate, endDate) => {
				const { transactions } = get();
				let filtered = transactions.filter((t) => t.type === "expense");

				if (startDate && endDate) {
					filtered = filtered.filter(
						(t) => t.date >= startDate && t.date <= endDate
					);
				}

				const totalExpense = filtered.reduce((sum, t) => sum + t.amount, 0);
				const categorySpending: Record<
					string,
					{ amount: number; count: number }
				> = {};

				filtered.forEach((t) => {
					if (!categorySpending[t.category]) {
						categorySpending[t.category] = { amount: 0, count: 0 };
					}
					categorySpending[t.category].amount += t.amount;
					categorySpending[t.category].count += 1;
				});

				return Object.entries(categorySpending)
					.map(([category, data]) => ({
						category: category as ExpenseCategory,
						amount: data.amount,
						percentage:
							totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
						transactionCount: data.count,
					}))
					.sort((a, b) => b.amount - a.amount);
			},

			getMonthlyTrends: (months) => {
				const { transactions } = get();
				const trends: MonthlyTrend[] = [];
				const today = new Date();

				for (let i = 0; i < months; i++) {
					const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
					const year = date.getFullYear();
					const month = date.getMonth();
					const monthStr = date.toLocaleString("default", { month: "short" });

					const startOfMonth = new Date(year, month, 1)
						.toISOString()
						.split("T")[0];
					const endOfMonth = new Date(year, month + 1, 0)
						.toISOString()
						.split("T")[0];

					const monthTransactions = transactions.filter(
						(t) => t.date >= startOfMonth && t.date <= endOfMonth
					);

					const income = monthTransactions
						.filter((t) => t.type === "income")
						.reduce((sum, t) => sum + t.amount, 0);

					const expense = monthTransactions
						.filter((t) => t.type === "expense")
						.reduce((sum, t) => sum + t.amount, 0);

					trends.unshift({
						month: monthStr,
						year,
						income,
						expense,
						savings: income - expense,
					});
				}

				return trends;
			},

			getNetWorth: () => {
				const { accounts } = get();
				return accounts.reduce((sum, acc) => sum + acc.balance, 0);
			},

			// Settings
			setCurrency: (currency) => set({ currency }),

			// Initialize from database (stub for now - will be implemented with database-first)
			initialize: async (userId: string) => {
				// TODO: Load data from Supabase tables when fully migrated to database-first
				console.log("Finance store initialize called for user:", userId);
			},

			// Import/Export
			importData: (data) =>
				set({
					accounts: data.accounts ?? [],
					transactions: data.transactions ?? [],
					recurringTransactions: data.recurringTransactions ?? [],
					budgets: data.budgets ?? [],
					savingsGoals: data.savingsGoals ?? [],
					billReminders: data.billReminders ?? [],
					debts: data.debts ?? [],
					splitGroups: data.splitGroups ?? [],
					currency: data.currency ?? "₹",
				}),

			clearAllData: () =>
				set({
					accounts: [],
					transactions: [],
					recurringTransactions: [],
					budgets: [],
					savingsGoals: [],
					billReminders: [],
					debts: [],
					splitGroups: [],
				}),
		}),
		{
			name: "finance-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				accounts: state.accounts,
				transactions: state.transactions,
				recurringTransactions: state.recurringTransactions,
				budgets: state.budgets,
				savingsGoals: state.savingsGoals,
				billReminders: state.billReminders,
				debts: state.debts,
				splitGroups: state.splitGroups,
				currency: state.currency,
			}),
		}
	)
);
