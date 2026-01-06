/**
 * Database-First Finance Store - Part 1: Core & Accounts
 */
import { create } from "zustand";
import { supabase as supabaseClient } from "../../config/supabase";
import { generateId, objectToCamelCase, objectToSnakeCase } from "./helpers";
import type { FinanceStore } from "./storeInterface";
import type {
	Account,
	BillReminder,
	Budget,
	Debt,
	ExpenseCategory,
	RecurringTransaction,
	SavingsGoal,
	SplitExpense,
	SplitGroup,
	Transaction,
} from "./types";

// Cast to any to bypass strict TS type checking for Supabase queries
const supabase = supabaseClient as any;

export type { FinanceStore } from "./storeInterface";
export * from "./types";

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
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
	isLoading: false,
	userId: null,

	// Initialize from database
	initialize: async (userId: string) => {
		console.log("📥 Loading finance data from database for user:", userId);
		set({ isLoading: true, userId });

		try {
			const [
				accountsRes,
				transactionsRes,
				recurringRes,
				budgetsRes,
				goalsRes,
				billsRes,
				debtsRes,
				groupsRes,
			] = await Promise.all([
				supabase.from("finance_accounts").select("*").eq("user_id", userId),
				supabase
					.from("finance_transactions")
					.select("*")
					.eq("user_id", userId)
					.order("date", { ascending: false }),
				supabase
					.from("recurring_transactions")
					.select("*")
					.eq("user_id", userId),
				supabase.from("finance_budgets").select("*").eq("user_id", userId),
				supabase.from("savings_goals").select("*").eq("user_id", userId),
				supabase.from("bill_reminders").select("*").eq("user_id", userId),
				supabase.from("finance_debts").select("*").eq("user_id", userId),
				supabase.from("split_groups").select("*").eq("user_id", userId),
			]);

			const accounts = (accountsRes.data || []).map((a: any) =>
				objectToCamelCase(a)
			);
			const transactions = (transactionsRes.data || []).map((t: any) =>
				objectToCamelCase(t)
			);
			const recurringTransactions = (recurringRes.data || []).map((r: any) =>
				objectToCamelCase(r)
			);
			const budgets = (budgetsRes.data || []).map((b: any) =>
				objectToCamelCase(b)
			);
			const savingsGoals = (goalsRes.data || []).map((g: any) => {
				const goal = objectToCamelCase(g);
				return {
					...goal,
					contributions:
						typeof goal.contributions === "string"
							? JSON.parse(goal.contributions)
							: goal.contributions || [],
				};
			});
			const billReminders = (billsRes.data || []).map((b: any) =>
				objectToCamelCase(b)
			);
			const debts = (debtsRes.data || []).map((d: any) => {
				const debt = objectToCamelCase(d);
				return {
					...debt,
					payments:
						typeof debt.payments === "string"
							? JSON.parse(debt.payments)
							: debt.payments || [],
				};
			});
			const splitGroups = (groupsRes.data || []).map((g: any) => {
				const group = objectToCamelCase(g);
				return {
					...group,
					members:
						typeof group.members === "string"
							? JSON.parse(group.members)
							: group.members || [],
					expenses:
						typeof group.expenses === "string"
							? JSON.parse(group.expenses)
							: group.expenses || [],
					settlements:
						typeof group.settlements === "string"
							? JSON.parse(group.settlements)
							: group.settlements || [],
				};
			});

			console.log(
				`✅ Loaded ${accounts.length} accounts, ${transactions.length} transactions`
			);
			set({
				accounts,
				transactions,
				recurringTransactions,
				budgets,
				savingsGoals,
				billReminders,
				debts,
				splitGroups,
				isLoading: false,
			});
		} catch (error) {
			console.error("❌ Error loading finance data:", error);
			set({ isLoading: false });
		}
	},

	// Account Methods
	addAccount: async (account) => {
		const { userId, accounts } = get();
		if (!userId) return;

		const newAccount: Account = {
			...account,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const { error } = await supabase
			.from("finance_accounts")
			.insert(objectToSnakeCase({ ...newAccount, user_id: userId }));
		if (error) {
			console.error("Error adding account:", error);
			return;
		}
		set({ accounts: [...accounts, newAccount] });
	},

	updateAccount: async (id, updates) => {
		const { userId, accounts } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...updates,
			updated_at: new Date().toISOString(),
		});
		const { error } = await supabase
			.from("finance_accounts")
			.update(dbData)
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating account:", error);
			return;
		}
		set({
			accounts: accounts.map((a) =>
				a.id === id
					? { ...a, ...updates, updatedAt: new Date().toISOString() }
					: a
			),
		});
	},

	deleteAccount: async (id) => {
		const { userId, accounts } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("finance_accounts")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting account:", error);
			return;
		}
		set({ accounts: accounts.filter((a) => a.id !== id) });
	},

	setDefaultAccount: (id) =>
		set((state) => ({
			accounts: state.accounts.map((a) => ({ ...a, isDefault: a.id === id })),
		})),
	getDefaultAccount: () => {
		const { accounts } = get();
		return accounts.find((a) => a.isDefault) || accounts[0];
	},

	// Transaction Methods
	addTransaction: async (transaction) => {
		const { userId, accounts } = get();
		if (!userId) return;

		const newTransaction: Transaction = {
			...transaction,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Update account balance
		const updatedAccounts = accounts.map((acc) => {
			if (acc.id === transaction.accountId) {
				const change =
					transaction.type === "income"
						? transaction.amount
						: -transaction.amount;
				return { ...acc, balance: acc.balance + change };
			}
			if (transaction.toAccountId && acc.id === transaction.toAccountId) {
				return { ...acc, balance: acc.balance + transaction.amount };
			}
			return acc;
		});

		const { error } = await supabase
			.from("finance_transactions")
			.insert(objectToSnakeCase({ ...newTransaction, user_id: userId }));
		if (error) {
			console.error("Error adding transaction:", error);
			return;
		}

		// Update accounts in DB
		for (const acc of updatedAccounts) {
			if (
				acc.id === transaction.accountId ||
				acc.id === transaction.toAccountId
			) {
				await supabase
					.from("finance_accounts")
					.update(
						objectToSnakeCase({
							balance: acc.balance,
							updated_at: new Date().toISOString(),
						})
					)
					.eq("id", acc.id)
					.eq("user_id", userId);
			}
		}

		set((state) => ({
			transactions: [newTransaction, ...state.transactions],
			accounts: updatedAccounts,
		}));
	},

	updateTransaction: async (id, updates) => {
		const { userId, transactions } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...updates,
			updated_at: new Date().toISOString(),
		});
		const { error } = await supabase
			.from("finance_transactions")
			.update(dbData)
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating transaction:", error);
			return;
		}
		set({
			transactions: transactions.map((t) =>
				t.id === id
					? { ...t, ...updates, updatedAt: new Date().toISOString() }
					: t
			),
		});
	},

	deleteTransaction: async (id) => {
		const { userId, transactions, accounts } = get();
		if (!userId) return;

		const transaction = transactions.find((t) => t.id === id);
		if (!transaction) return;

		// Reverse balance change
		const updatedAccounts = accounts.map((acc) => {
			if (acc.id === transaction.accountId) {
				const change =
					transaction.type === "income"
						? -transaction.amount
						: transaction.amount;
				return { ...acc, balance: acc.balance + change };
			}
			if (transaction.toAccountId && acc.id === transaction.toAccountId) {
				return { ...acc, balance: acc.balance - transaction.amount };
			}
			return acc;
		});

		const { error } = await supabase
			.from("finance_transactions")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting transaction:", error);
			return;
		}

		// Update accounts in DB
		for (const acc of updatedAccounts) {
			if (
				acc.id === transaction.accountId ||
				acc.id === transaction.toAccountId
			) {
				await supabase
					.from("finance_accounts")
					.update(objectToSnakeCase({ balance: acc.balance }))
					.eq("id", acc.id)
					.eq("user_id", userId);
			}
		}

		set({
			transactions: transactions.filter((t) => t.id !== id),
			accounts: updatedAccounts,
		});
	},

	getTransactionsByAccount: (accountId) =>
		get().transactions.filter(
			(t) => t.accountId === accountId || t.toAccountId === accountId
		),
	getTransactionsByCategory: (category) =>
		get().transactions.filter((t) => t.category === category),
	getTransactionsByDateRange: (startDate, endDate) =>
		get().transactions.filter((t) => t.date >= startDate && t.date <= endDate),

	// Recurring Transactions
	addRecurringTransaction: async (transaction) => {
		const { userId, recurringTransactions } = get();
		if (!userId) return;

		const newRecurring: RecurringTransaction = {
			...transaction,
			id: generateId(),
			createdAt: new Date().toISOString(),
		};
		const { error } = await supabase
			.from("recurring_transactions")
			.insert(objectToSnakeCase({ ...newRecurring, user_id: userId }));
		if (error) {
			console.error("Error adding recurring:", error);
			return;
		}
		set({ recurringTransactions: [...recurringTransactions, newRecurring] });
	},

	updateRecurringTransaction: async (id, updates) => {
		const { userId, recurringTransactions } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("recurring_transactions")
			.update(objectToSnakeCase(updates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating recurring:", error);
			return;
		}
		set({
			recurringTransactions: recurringTransactions.map((t) =>
				t.id === id ? { ...t, ...updates } : t
			),
		});
	},

	deleteRecurringTransaction: async (id) => {
		const { userId, recurringTransactions } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("recurring_transactions")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting recurring:", error);
			return;
		}
		set({
			recurringTransactions: recurringTransactions.filter((t) => t.id !== id),
		});
	},

	processRecurringTransactions: async () => {
		const { recurringTransactions, addTransaction } = get();
		const today = new Date().toISOString().split("T")[0];

		for (const recurring of recurringTransactions) {
			if (!recurring.isActive || recurring.nextDueDate > today) continue;
			if (recurring.endDate && recurring.endDate < today) continue;

			await addTransaction({
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

			await get().updateRecurringTransaction(recurring.id, {
				nextDueDate: nextDate.toISOString().split("T")[0],
				lastProcessed: today,
			});
		}
	},

	// Budget Methods
	addBudget: async (budget) => {
		const { userId, budgets } = get();
		if (!userId) return;

		const newBudget: Budget = {
			...budget,
			id: generateId(),
			spent: 0,
			createdAt: new Date().toISOString(),
		};
		const { error } = await supabase
			.from("finance_budgets")
			.insert(objectToSnakeCase({ ...newBudget, user_id: userId }));
		if (error) {
			console.error("Error adding budget:", error);
			return;
		}
		set({ budgets: [...budgets, newBudget] });
	},

	updateBudget: async (id, updates) => {
		const { userId, budgets } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("finance_budgets")
			.update(objectToSnakeCase(updates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating budget:", error);
			return;
		}
		set({
			budgets: budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
		});
	},

	deleteBudget: async (id) => {
		const { userId, budgets } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("finance_budgets")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting budget:", error);
			return;
		}
		set({ budgets: budgets.filter((b) => b.id !== id) });
	},

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

	// Savings Goals
	addSavingsGoal: async (goal) => {
		const { userId, savingsGoals } = get();
		if (!userId) return;

		const newGoal: SavingsGoal = {
			...goal,
			id: generateId(),
			currentAmount: 0,
			contributions: [],
			isCompleted: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const dbData = objectToSnakeCase({
			...newGoal,
			user_id: userId,
			contributions: JSON.stringify(newGoal.contributions),
		});
		const { error } = await supabase.from("savings_goals").insert(dbData);
		if (error) {
			console.error("Error adding goal:", error);
			return;
		}
		set({ savingsGoals: [...savingsGoals, newGoal] });
	},

	updateSavingsGoal: async (id, updates) => {
		const { userId, savingsGoals } = get();
		if (!userId) return;

		const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
		if (updates.contributions)
			dbUpdates.contributions = JSON.stringify(updates.contributions);

		const { error } = await supabase
			.from("savings_goals")
			.update(objectToSnakeCase(dbUpdates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating goal:", error);
			return;
		}
		set({
			savingsGoals: savingsGoals.map((g) =>
				g.id === id
					? { ...g, ...updates, updatedAt: new Date().toISOString() }
					: g
			),
		});
	},

	deleteSavingsGoal: async (id) => {
		const { userId, savingsGoals } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("savings_goals")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting goal:", error);
			return;
		}
		set({ savingsGoals: savingsGoals.filter((g) => g.id !== id) });
	},

	contributeToGoal: async (goalId, amount, note, accountId) => {
		const { savingsGoals, accounts, userId } = get();
		if (!userId) return;

		const goal = savingsGoals.find((g) => g.id === goalId);
		if (!goal) return;

		const newAmount = goal.currentAmount + amount;
		const contribution = {
			id: generateId(),
			amount,
			date: new Date().toISOString(),
			note,
			accountId,
			type: "contribution" as const,
		};

		await get().updateSavingsGoal(goalId, {
			currentAmount: newAmount,
			isCompleted: newAmount >= goal.targetAmount,
			contributions: [...goal.contributions, contribution],
		});

		if (accountId) {
			await get().updateAccount(accountId, {
				balance:
					(accounts.find((a) => a.id === accountId)?.balance || 0) - amount,
			});
		}
	},

	withdrawFromGoal: async (goalId, amount, note, accountId) => {
		const { savingsGoals, accounts, userId } = get();
		if (!userId) return;

		const goal = savingsGoals.find((g) => g.id === goalId);
		if (!goal) return;

		const actualWithdrawal = Math.min(amount, goal.currentAmount);
		const contribution = {
			id: generateId(),
			amount: -actualWithdrawal,
			date: new Date().toISOString(),
			note,
			accountId,
			type: "withdrawal" as const,
		};

		await get().updateSavingsGoal(goalId, {
			currentAmount: goal.currentAmount - actualWithdrawal,
			isCompleted: false,
			contributions: [...goal.contributions, contribution],
		});

		if (accountId && actualWithdrawal > 0) {
			await get().updateAccount(accountId, {
				balance:
					(accounts.find((a) => a.id === accountId)?.balance || 0) +
					actualWithdrawal,
			});
		}
	},

	// Bill Reminders
	addBillReminder: async (bill) => {
		const { userId, billReminders } = get();
		if (!userId) return;

		const newBill: BillReminder = {
			...bill,
			id: generateId(),
			isPaid: false,
			createdAt: new Date().toISOString(),
		};
		const { error } = await supabase
			.from("bill_reminders")
			.insert(objectToSnakeCase({ ...newBill, user_id: userId }));
		if (error) {
			console.error("Error adding bill:", error);
			return;
		}
		set({ billReminders: [...billReminders, newBill] });
	},

	updateBillReminder: async (id, updates) => {
		const { userId, billReminders } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("bill_reminders")
			.update(objectToSnakeCase(updates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating bill:", error);
			return;
		}
		set({
			billReminders: billReminders.map((b) =>
				b.id === id ? { ...b, ...updates } : b
			),
		});
	},

	deleteBillReminder: async (id) => {
		const { userId, billReminders } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("bill_reminders")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting bill:", error);
			return;
		}
		set({ billReminders: billReminders.filter((b) => b.id !== id) });
	},

	markBillPaid: async (id, accountId) => {
		const { billReminders } = get();
		const bill = billReminders.find((b) => b.id === id);
		if (!bill || bill.isPaid) return;

		await get().updateBillReminder(id, {
			isPaid: true,
			paidDate: new Date().toISOString(),
			paidFromAccountId: accountId,
		});

		if (accountId) {
			await get().addTransaction({
				type: "expense",
				amount: bill.amount,
				category: bill.category,
				description: `Bill Payment: ${bill.name}`,
				date: new Date().toISOString().split("T")[0],
				time: new Date().toTimeString().split(" ")[0],
				accountId,
				paymentMethod: "net_banking",
			});
		}

		// Create next bill for recurring
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
			await get().addBillReminder({
				...bill,
				dueDate: dueDate.toISOString().split("T")[0],
			});
		}
	},

	getUpcomingBills: (days) => {
		const { billReminders } = get();
		const today = new Date();
		const future = new Date();
		future.setDate(today.getDate() + days);
		return billReminders.filter((b) => {
			if (b.isPaid) return false;
			const d = new Date(b.dueDate);
			return d >= today && d <= future;
		});
	},

	// Debts
	addDebt: async (debt) => {
		const { userId, debts } = get();
		if (!userId) return;

		const newDebt: Debt = {
			...debt,
			id: generateId(),
			remainingAmount: debt.originalAmount,
			payments: [],
			isSettled: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const dbData = objectToSnakeCase({
			...newDebt,
			user_id: userId,
			payments: JSON.stringify(newDebt.payments),
		});
		const { error } = await supabase.from("finance_debts").insert(dbData);
		if (error) {
			console.error("Error adding debt:", error);
			return;
		}
		set({ debts: [...debts, newDebt] });
	},

	updateDebt: async (id, updates) => {
		const { userId, debts } = get();
		if (!userId) return;

		const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
		if (updates.payments) dbUpdates.payments = JSON.stringify(updates.payments);

		const { error } = await supabase
			.from("finance_debts")
			.update(objectToSnakeCase(dbUpdates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating debt:", error);
			return;
		}
		set({
			debts: debts.map((d) =>
				d.id === id
					? { ...d, ...updates, updatedAt: new Date().toISOString() }
					: d
			),
		});
	},

	deleteDebt: async (id) => {
		const { userId, debts } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("finance_debts")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting debt:", error);
			return;
		}
		set({ debts: debts.filter((d) => d.id !== id) });
	},

	recordDebtPayment: async (debtId, amount, note, accountId) => {
		const { debts, accounts } = get();
		const debt = debts.find((d) => d.id === debtId);
		if (!debt || debt.isSettled) return;

		const actualPayment = Math.min(amount, debt.remainingAmount);
		const newRemaining = debt.remainingAmount - actualPayment;
		const payment = {
			id: generateId(),
			amount: actualPayment,
			date: new Date().toISOString(),
			note,
			accountId,
		};

		await get().updateDebt(debtId, {
			remainingAmount: newRemaining,
			isSettled: newRemaining === 0,
			payments: [...debt.payments, payment],
		});

		if (accountId) {
			const isOwe = debt.type === "owe";
			const acc = accounts.find((a) => a.id === accountId);
			if (acc) {
				await get().updateAccount(accountId, {
					balance: acc.balance + (isOwe ? -actualPayment : actualPayment),
				});
			}
		}
	},

	settleDebt: async (debtId) => {
		await get().updateDebt(debtId, { remainingAmount: 0, isSettled: true });
	},

	// Split Groups
	addSplitGroup: async (group) => {
		const { userId, splitGroups } = get();
		if (!userId) return;

		const newGroup: SplitGroup = {
			...group,
			id: generateId(),
			expenses: [],
			settlements: [],
			totalExpenses: 0,
			isArchived: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const dbData = objectToSnakeCase({
			...newGroup,
			user_id: userId,
			members: JSON.stringify(newGroup.members),
			expenses: JSON.stringify([]),
			settlements: JSON.stringify([]),
		});
		const { error } = await supabase.from("split_groups").insert(dbData);
		if (error) {
			console.error("Error adding group:", error);
			return;
		}
		set({ splitGroups: [...splitGroups, newGroup] });
	},

	updateSplitGroup: async (id, updates) => {
		const { userId, splitGroups } = get();
		if (!userId) return;

		const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
		if (updates.members) dbUpdates.members = JSON.stringify(updates.members);
		if (updates.expenses) dbUpdates.expenses = JSON.stringify(updates.expenses);
		if (updates.settlements)
			dbUpdates.settlements = JSON.stringify(updates.settlements);

		const { error } = await supabase
			.from("split_groups")
			.update(objectToSnakeCase(dbUpdates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating group:", error);
			return;
		}
		set({
			splitGroups: splitGroups.map((g) =>
				g.id === id
					? { ...g, ...updates, updatedAt: new Date().toISOString() }
					: g
			),
		});
	},

	deleteSplitGroup: async (id) => {
		const { userId, splitGroups } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("split_groups")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting group:", error);
			return;
		}
		set({ splitGroups: splitGroups.filter((g) => g.id !== id) });
	},

	archiveSplitGroup: async (id) => {
		await get().updateSplitGroup(id, { isArchived: true });
	},

	addGroupMember: async (groupId, memberName) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return;

		const newMember: import("./types").GroupMember = {
			id: generateId(),
			name: memberName,
			isCurrentUser: group.members.length === 0,
			role: "member",
			joinedAt: new Date().toISOString(),
		};
		await get().updateSplitGroup(groupId, {
			members: [...group.members, newMember],
		});
	},

	removeGroupMember: async (groupId, memberId) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return;

		await get().updateSplitGroup(groupId, {
			members: group.members.filter((m) => m.id !== memberId),
		});
	},

	// Split Expenses
	addSplitExpense: async (groupId, expenseData) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return;

		const newExpense: SplitExpense = {
			...expenseData,
			id: generateId(),
			groupId,
			category: "other" as ExpenseCategory,
			date: new Date().toISOString().split("T")[0],
			splitType: (expenseData.splitMethod || "equal") as
				| "equal"
				| "exact"
				| "percentage"
				| "shares",
			splits: expenseData.splits.map((s) => ({ ...s, isPaid: false })),
			isSettled: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await get().updateSplitGroup(groupId, {
			expenses: [newExpense, ...group.expenses],
			totalExpenses: group.totalExpenses + expenseData.amount,
		});
	},

	updateSplitExpense: async (id, updates) => {
		const { splitGroups } = get();
		for (const group of splitGroups) {
			const expense = group.expenses.find((e) => e.id === id);
			if (expense) {
				await get().updateSplitGroup(group.id, {
					expenses: group.expenses.map((e) =>
						e.id === id
							? { ...e, ...updates, updatedAt: new Date().toISOString() }
							: e
					),
				});
				break;
			}
		}
	},

	deleteSplitExpense: async (groupId, expenseId) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return;

		const expense = group.expenses.find((e) => e.id === expenseId);
		if (!expense) return;

		await get().updateSplitGroup(groupId, {
			expenses: group.expenses.filter((e) => e.id !== expenseId),
			totalExpenses: group.totalExpenses - expense.amount,
		});
	},

	getGroupExpenses: (groupId) => {
		const g = get().splitGroups.find((g) => g.id === groupId);
		return g?.expenses || [];
	},

	getGroupBalances: (groupId) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return [];

		const memberPaid = new Map<string, number>();
		const memberOwes = new Map<string, number>();
		group.members.forEach((m) => {
			memberPaid.set(m.id, 0);
			memberOwes.set(m.id, 0);
		});

		group.expenses.forEach((e) => {
			memberPaid.set(e.paidBy, (memberPaid.get(e.paidBy) || 0) + e.amount);
			e.splits.forEach((s) => {
				memberOwes.set(
					s.memberId,
					(memberOwes.get(s.memberId) || 0) + s.amount
				);
			});
		});

		group.settlements.forEach((s) => {
			memberPaid.set(
				s.fromMemberId,
				(memberPaid.get(s.fromMemberId) || 0) + s.amount
			);
			memberPaid.set(
				s.toMemberId,
				(memberPaid.get(s.toMemberId) || 0) - s.amount
			);
		});

		return group.members.map((m) => ({
			memberId: m.id,
			balance: (memberPaid.get(m.id) || 0) - (memberOwes.get(m.id) || 0),
		}));
	},

	getMemberBalance: (groupId, memberId) => {
		const b = get()
			.getGroupBalances(groupId)
			.find((b) => b.memberId === memberId);
		return b?.balance || 0;
	},

	addSettlement: async (groupId, settlementData) => {
		const { splitGroups } = get();
		const group = splitGroups.find((g) => g.id === groupId);
		if (!group) return;

		const settlement = {
			id: generateId(),
			groupId,
			fromMemberId: settlementData.fromMember,
			toMemberId: settlementData.toMember,
			amount: settlementData.amount,
			date: new Date().toISOString().split("T")[0],
			createdAt: new Date().toISOString(),
		};
		await get().updateSplitGroup(groupId, {
			settlements: [...group.settlements, settlement],
		});
	},

	getGroupSettlements: (groupId) => {
		const g = get().splitGroups.find((g) => g.id === groupId);
		return g?.settlements || [];
	},

	// Analytics
	getFinancialSummary: (startDate, endDate) => {
		const { transactions } = get();
		let filtered = transactions;
		if (startDate && endDate)
			filtered = transactions.filter(
				(t) => t.date >= startDate && t.date <= endDate
			);

		const totalIncome = filtered
			.filter((t) => t.type === "income")
			.reduce((s, t) => s + t.amount, 0);
		const totalExpense = filtered
			.filter((t) => t.type === "expense")
			.reduce((s, t) => s + t.amount, 0);

		const categorySpending: Record<string, { amount: number; count: number }> =
			{};
		filtered
			.filter((t) => t.type === "expense")
			.forEach((t) => {
				if (!categorySpending[t.category])
					categorySpending[t.category] = { amount: 0, count: 0 };
				categorySpending[t.category].amount += t.amount;
				categorySpending[t.category].count++;
			});

		const topCategories = Object.entries(categorySpending)
			.map(([category, data]) => ({
				category: category as ExpenseCategory,
				amount: data.amount,
				percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
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
								86400000
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
		if (startDate && endDate)
			filtered = filtered.filter(
				(t) => t.date >= startDate && t.date <= endDate
			);

		const totalExpense = filtered.reduce((s, t) => s + t.amount, 0);
		const categorySpending: Record<string, { amount: number; count: number }> =
			{};
		filtered.forEach((t) => {
			if (!categorySpending[t.category])
				categorySpending[t.category] = { amount: 0, count: 0 };
			categorySpending[t.category].amount += t.amount;
			categorySpending[t.category].count++;
		});

		return Object.entries(categorySpending)
			.map(([category, data]) => ({
				category: category as ExpenseCategory,
				amount: data.amount,
				percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
				transactionCount: data.count,
			}))
			.sort((a, b) => b.amount - a.amount);
	},

	getMonthlyTrends: (months) => {
		const { transactions } = get();
		const trends = [];
		const today = new Date();

		for (let i = 0; i < months; i++) {
			const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
			const year = date.getFullYear();
			const month = date.getMonth();
			const monthStr = date.toLocaleString("default", { month: "short" });

			const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
			const endOfMonth = new Date(year, month + 1, 0)
				.toISOString()
				.split("T")[0];

			const monthTransactions = transactions.filter(
				(t) => t.date >= startOfMonth && t.date <= endOfMonth
			);
			const income = monthTransactions
				.filter((t) => t.type === "income")
				.reduce((s, t) => s + t.amount, 0);
			const expense = monthTransactions
				.filter((t) => t.type === "expense")
				.reduce((s, t) => s + t.amount, 0);

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

	getNetWorth: () => get().accounts.reduce((sum, acc) => sum + acc.balance, 0),
	setCurrency: (currency) => set({ currency }),

	// Import/Export
	importData: async (data) => {
		const { userId } = get();
		if (!userId) return;
		console.log("📤 Importing finance data...");

		try {
			if (data.accounts?.length) {
				const accountsData = data.accounts.map((a) =>
					objectToSnakeCase({ ...a, user_id: userId })
				);
				await supabase
					.from("finance_accounts")
					.upsert(accountsData, { onConflict: "id" });
			}
			if (data.transactions?.length) {
				const transData = data.transactions.map((t) =>
					objectToSnakeCase({ ...t, user_id: userId })
				);
				for (let i = 0; i < transData.length; i += 500) {
					await supabase
						.from("finance_transactions")
						.upsert(transData.slice(i, i + 500), { onConflict: "id" });
				}
			}
			if (data.recurringTransactions?.length) {
				const recurData = data.recurringTransactions.map((r) =>
					objectToSnakeCase({ ...r, user_id: userId })
				);
				await supabase
					.from("recurring_transactions")
					.upsert(recurData, { onConflict: "id" });
			}
			if (data.budgets?.length) {
				const budgetData = data.budgets.map((b) =>
					objectToSnakeCase({ ...b, user_id: userId })
				);
				await supabase
					.from("finance_budgets")
					.upsert(budgetData, { onConflict: "id" });
			}
			if (data.savingsGoals?.length) {
				const goalsData = data.savingsGoals.map((g) =>
					objectToSnakeCase({
						...g,
						user_id: userId,
						contributions: JSON.stringify(g.contributions || []),
					})
				);
				await supabase
					.from("savings_goals")
					.upsert(goalsData, { onConflict: "id" });
			}
			if (data.billReminders?.length) {
				const billsData = data.billReminders.map((b) =>
					objectToSnakeCase({ ...b, user_id: userId })
				);
				await supabase
					.from("bill_reminders")
					.upsert(billsData, { onConflict: "id" });
			}
			if (data.debts?.length) {
				const debtsData = data.debts.map((d) =>
					objectToSnakeCase({
						...d,
						user_id: userId,
						payments: JSON.stringify(d.payments || []),
					})
				);
				await supabase
					.from("finance_debts")
					.upsert(debtsData, { onConflict: "id" });
			}
			if (data.splitGroups?.length) {
				const groupsData = data.splitGroups.map((g) =>
					objectToSnakeCase({
						...g,
						user_id: userId,
						members: JSON.stringify(g.members || []),
						expenses: JSON.stringify(g.expenses || []),
						settlements: JSON.stringify(g.settlements || []),
					})
				);
				await supabase
					.from("split_groups")
					.upsert(groupsData, { onConflict: "id" });
			}

			await get().initialize(userId);
			console.log("✅ Finance import complete");
		} catch (error) {
			console.error("❌ Error importing:", error);
		}
	},

	clearAllData: async () => {
		const { userId } = get();
		if (!userId) return;
		console.log("🗑️ Clearing finance data...");

		await Promise.all([
			supabase.from("finance_transactions").delete().eq("user_id", userId),
			supabase.from("finance_accounts").delete().eq("user_id", userId),
			supabase.from("recurring_transactions").delete().eq("user_id", userId),
			supabase.from("finance_budgets").delete().eq("user_id", userId),
			supabase.from("savings_goals").delete().eq("user_id", userId),
			supabase.from("bill_reminders").delete().eq("user_id", userId),
			supabase.from("finance_debts").delete().eq("user_id", userId),
			supabase.from("split_groups").delete().eq("user_id", userId),
		]);

		set({
			accounts: [],
			transactions: [],
			recurringTransactions: [],
			budgets: [],
			savingsGoals: [],
			billReminders: [],
			debts: [],
			splitGroups: [],
		});
		console.log("✅ Finance data cleared");
	},
}));
