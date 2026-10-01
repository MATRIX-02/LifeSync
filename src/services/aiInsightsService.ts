/** Groq-backed deep analysis for the Finance module. */

import {
	countDays,
	DateWindow,
	DeepAnalysisResult,
	describeWindow,
	InsightRange,
	resolveDateWindow,
	round,
	runDeepAnalysis,
	SHARED_SCHEMA_RULES,
} from "@/src/services/insights/core";
import type {
	Account,
	Budget,
	SavingsGoal,
	SplitGroup,
	Transaction,
} from "@/src/types/finance";

export * from "@/src/services/insights/core";

export interface MerchantSpend {
	name: string;
	total: number;
	count: number;
}

export interface CategoryBreakdown {
	category: string;
	total: number;
	count: number;
	share: number;
	// Actual payee names, so the model can say "Swiggy" instead of "food".
	topItems: MerchantSpend[];
}

export interface MonthlyFlow {
	month: string;
	income: number;
	expense: number;
	net: number;
}

export interface AccountDetail {
	name: string;
	type: Account["type"];
	balance: number;
	spentInPeriod: number;
	receivedInPeriod: number;
	transactionCount: number;
	// Credit cards only.
	creditLimit?: number;
	creditUsed?: number;
	utilisationPercent?: number;
	availableCredit?: number;
	isSettled?: boolean;
	// How long the card has carried a balance without being cleared.
	daysCarryingBalance?: number;
}

export interface SplitReimbursement {
	groupName: string;
	description: string;
	category: string;
	date: string;
	amountPaidByYou: number;
	yourActualShare: number;
	owedBackToYou: number;
	isSettled: boolean;
}

export interface SplitPosition {
	groupName: string;
	// Positive = others owe you, negative = you owe others.
	yourNetBalance: number;
	openExpenseCount: number;
}

export interface BudgetStatus {
	category: string;
	limit: number;
	spent: number;
	usedPercent: number;
	period: Budget["period"];
}

export interface GoalStatus {
	name: string;
	target: number;
	saved: number;
	progressPercent: number;
	deadline?: string;
}

export interface FinanceSummary {
	currency: string;
	generatedAt: string;
	range: InsightRange;
	rangeLabel: string;
	periodStart: string;
	periodEnd: string;
	windowDays: number;
	netWorth: number;
	liquidBalance: number;
	totalCreditOutstanding: number;
	accounts: AccountDetail[];
	totals: {
		income: number;
		expense: number;
		net: number;
		transactionCount: number;
		avgDailyExpense: number;
		// Expense totals net of money other people owe you back on split bills.
		reimbursementsOwedToYou: number;
		trueNetExpense: number;
	};
	topExpenseCategories: CategoryBreakdown[];
	topIncomeCategories: CategoryBreakdown[];
	topMerchants: MerchantSpend[];
	largestExpenses: {
		name: string;
		amount: number;
		category: string;
		date: string;
	}[];
	monthlyFlow: MonthlyFlow[];
	budgets: BudgetStatus[];
	savingsGoals: GoalStatus[];
	splitPositions: SplitPosition[];
	splitReimbursements: SplitReimbursement[];
}

/** Best available human label for a transaction, falling back to its category. */
function payeeOf(t: Transaction): string {
	return t.description?.trim() || t.note?.trim() || t.category;
}

function daysBetween(from: string, to: Date): number {
	const start = new Date(from);
	if (Number.isNaN(start.getTime())) return 0;
	return Math.max(
		0,
		Math.floor((to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
	);
}

function buildAccountDetails(
	accounts: Account[],
	periodTransactions: Transaction[],
): AccountDetail[] {
	const now = new Date();

	return accounts.map((a) => {
		const mine = periodTransactions.filter(
			(t) => t.accountId === a.id || t.toAccountId === a.id,
		);

		const spent = mine
			.filter((t) => t.type === "expense" && t.accountId === a.id)
			.reduce((sum, t) => sum + t.amount, 0);
		const received = mine
			.filter((t) => t.type === "income" && t.accountId === a.id)
			.reduce((sum, t) => sum + t.amount, 0);

		const detail: AccountDetail = {
			name: a.name,
			type: a.type,
			balance: round(a.balance),
			spentInPeriod: round(spent),
			receivedInPeriod: round(received),
			transactionCount: mine.length,
		};

		if (a.type === "credit_card") {
			const used = a.creditUsed ?? Math.abs(Math.min(a.balance, 0));
			detail.creditUsed = round(used);
			detail.isSettled = a.isSettled ?? false;

			if (a.creditLimit && a.creditLimit > 0) {
				detail.creditLimit = round(a.creditLimit);
				detail.utilisationPercent = round((used / a.creditLimit) * 100);
				detail.availableCredit = round(a.creditLimit - used);
			}

			// Oldest unsettled charge approximates how long the balance has been carried.
			if (!a.isSettled && used > 0) {
				const charges = periodTransactions
					.filter((t) => t.accountId === a.id && t.type === "expense")
					.map((t) => t.date)
					.sort();
				if (charges.length > 0) {
					detail.daysCarryingBalance = daysBetween(charges[0], now);
				}
			}
		}

		return detail;
	});
}

/**
 * Money the user fronted on group bills that others still owe back. Without
 * this, a 4000 purchase split with one person looks like a 4000 personal
 * expense instead of 2000.
 */
function buildSplitData(
	splitGroups: SplitGroup[],
	window: DateWindow,
): { positions: SplitPosition[]; reimbursements: SplitReimbursement[] } {
	const positions: SplitPosition[] = [];
	const reimbursements: SplitReimbursement[] = [];

	for (const group of splitGroups) {
		if (group.isArchived) continue;

		const me = group.members.find((m) => m.isCurrentUser);
		if (!me) continue;

		let paid = 0;
		let owes = 0;

		for (const expense of group.expenses) {
			if (expense.paidBy === me.id) paid += expense.amount;
			const myShare = expense.splits
				.filter((s) => s.memberId === me.id)
				.reduce((sum, s) => sum + s.amount, 0);
			owes += myShare;

			const inPeriod =
				expense.date >= window.start && expense.date <= window.end;

			if (expense.paidBy === me.id && inPeriod && expense.amount > myShare) {
				reimbursements.push({
					groupName: group.name,
					description: expense.description,
					category: expense.category,
					date: expense.date,
					amountPaidByYou: round(expense.amount),
					yourActualShare: round(myShare),
					owedBackToYou: round(expense.amount - myShare),
					isSettled: expense.isSettled,
				});
			}
		}

		for (const s of group.settlements) {
			if (s.fromMemberId === me.id) paid += s.amount;
			if (s.toMemberId === me.id) paid -= s.amount;
		}

		positions.push({
			groupName: group.name,
			yourNetBalance: round(paid - owes),
			openExpenseCount: group.expenses.filter((e) => !e.isSettled).length,
		});
	}

	reimbursements.sort((a, b) => b.owedBackToYou - a.owedBackToYou);

	return { positions, reimbursements: reimbursements.slice(0, 10) };
}

function aggregateMerchants(
	items: Transaction[],
	limit: number,
): MerchantSpend[] {
	const buckets = new Map<string, { total: number; count: number }>();

	for (const t of items) {
		const name = payeeOf(t);
		const entry = buckets.get(name) ?? { total: 0, count: 0 };
		entry.total += t.amount;
		entry.count += 1;
		buckets.set(name, entry);
	}

	return Array.from(buckets.entries())
		.map(([name, { total, count }]) => ({
			name,
			total: round(total),
			count,
		}))
		.sort((a, b) => b.total - a.total)
		.slice(0, limit);
}

function aggregateByCategory(
	items: Transaction[],
	limit: number,
): CategoryBreakdown[] {
	const totalAmount = items.reduce((sum, t) => sum + t.amount, 0);
	const buckets = new Map<string, Transaction[]>();

	for (const t of items) {
		const existing = buckets.get(t.category);
		if (existing) existing.push(t);
		else buckets.set(t.category, [t]);
	}

	return Array.from(buckets.entries())
		.map(([category, txns]) => {
			const total = txns.reduce((sum, t) => sum + t.amount, 0);
			return {
				category,
				total: round(total),
				count: txns.length,
				share: totalAmount > 0 ? round((total / totalAmount) * 100) : 0,
				topItems: aggregateMerchants(txns, 4),
			};
		})
		.sort((a, b) => b.total - a.total)
		.slice(0, limit);
}

function buildMonthlyFlow(items: Transaction[]): MonthlyFlow[] {
	const buckets = new Map<string, { income: number; expense: number }>();

	for (const t of items) {
		const month = t.date.slice(0, 7);
		const entry = buckets.get(month) ?? { income: 0, expense: 0 };
		if (t.type === "income") entry.income += t.amount;
		else if (t.type === "expense") entry.expense += t.amount;
		buckets.set(month, entry);
	}

	return Array.from(buckets.entries())
		.map(([month, { income, expense }]) => ({
			month,
			income: round(income),
			expense: round(expense),
			net: round(income - expense),
		}))
		.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Reduces raw store data to a compact payload. Sending full transaction lists
 * would blow the 8K-tokens-per-minute free-tier cap on anything but a new account.
 */
export function buildFinanceSummary(args: {
	currency: string;
	range: InsightRange;
	customWindow?: DateWindow;
	accounts: Account[];
	transactions: Transaction[];
	budgets: Budget[];
	savingsGoals: SavingsGoal[];
	splitGroups?: SplitGroup[];
}): FinanceSummary {
	const {
		currency,
		range,
		customWindow,
		accounts,
		transactions,
		budgets,
		savingsGoals,
		splitGroups = [],
	} = args;

	const window = resolveDateWindow(range, customWindow);
	const windowDays = countDays(window);

	// Transaction dates are plain YYYY-MM-DD, so string comparison is safe here.
	const recent = transactions.filter(
		(t) => t.date >= window.start && t.date <= window.end,
	);

	// Transfers are excluded — they shuffle money between the user's own accounts.
	const expenses = recent.filter((t) => t.type === "expense");
	const income = recent.filter((t) => t.type === "income");

	const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
	const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);

	const { positions, reimbursements } = buildSplitData(splitGroups, window);
	const owedBack = reimbursements
		.filter((r) => !r.isSettled)
		.reduce((sum, r) => sum + r.owedBackToYou, 0);

	return {
		currency,
		generatedAt: new Date().toISOString(),
		range,
		rangeLabel: describeWindow(range, window),
		periodStart: window.start,
		periodEnd: window.end,
		windowDays,
		netWorth: round(accounts.reduce((sum, a) => sum + a.balance, 0)),
		liquidBalance: round(
			accounts
				.filter((a) => a.type !== "credit_card")
				.reduce((sum, a) => sum + a.balance, 0),
		),
		totalCreditOutstanding: round(
			accounts
				.filter((a) => a.type === "credit_card")
				.reduce(
					(sum, a) => sum + (a.creditUsed ?? Math.abs(Math.min(a.balance, 0))),
					0,
				),
		),
		accounts: buildAccountDetails(accounts, recent),
		totals: {
			income: round(incomeTotal),
			expense: round(expenseTotal),
			net: round(incomeTotal - expenseTotal),
			transactionCount: recent.length,
			avgDailyExpense: round(expenseTotal / windowDays),
			reimbursementsOwedToYou: round(owedBack),
			trueNetExpense: round(expenseTotal - owedBack),
		},
		topExpenseCategories: aggregateByCategory(expenses, 8),
		topIncomeCategories: aggregateByCategory(income, 5),
		topMerchants: aggregateMerchants(expenses, 10),
		largestExpenses: [...expenses]
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5)
			.map((t) => ({
				name: payeeOf(t),
				amount: round(t.amount),
				category: t.category,
				date: t.date,
			})),
		monthlyFlow: buildMonthlyFlow(recent),
		budgets: budgets
			.filter((b) => b.isActive)
			.map((b) => ({
				category: b.category,
				limit: round(b.amount),
				spent: round(b.spent),
				usedPercent: b.amount > 0 ? round((b.spent / b.amount) * 100) : 0,
				period: b.period,
			})),
		savingsGoals: savingsGoals
			.filter((g) => !g.isCompleted)
			.map((g) => ({
				name: g.name,
				target: round(g.targetAmount),
				saved: round(g.currentAmount),
				progressPercent:
					g.targetAmount > 0
						? round((g.currentAmount / g.targetAmount) * 100)
						: 0,
				deadline: g.deadline,
			})),
		splitPositions: positions,
		splitReimbursements: reimbursements,
	};
}

function hasUsableData(summary: FinanceSummary): boolean {
	return (
		summary.totals.transactionCount > 0 ||
		summary.accounts.length > 0 ||
		summary.budgets.length > 0
	);
}

const DEEP_SYSTEM_PROMPT = `You are a rigorous personal finance analyst. You produce structured JSON only.

You receive a JSON summary of one user's finances covering "periodStart" to "periodEnd" inclusive, described by "rangeLabel" and spanning "windowDays" days. Analyse it deeply and return a single JSON object.

${SHARED_SCHEMA_RULES}

FINANCE SPECIFICS:
- scoreBreakdown labels must be exactly: Spending, Saving, Budgets, Credit.
- headlineMetrics: format "value" as a rounded number plus the currency code, or a percentage.
- findings evidence must use real names from topMerchants, largestExpenses, topItems or account names.
- breakdowns: one per entry in topExpenseCategories, up to 6. "label" is the category, "value" its amount, "share" its percentage, "namedItems" from that category's topItems.
- Never use a bare category word as a name. If topItems only repeats the category, set namedItems to [] and say the transactions are unlabelled.
- noteGroups: exactly two entries, titled "Shared Bills" and "Credit Cards".
  - Shared Bills: for every unsettled entry in splitReimbursements, state what was paid versus the user's real share using the description. Empty notes array if there is no split data.
  - Credit Cards: for each credit_card account, comment on utilisationPercent, availableCredit and daysCarryingBalance by the card's real name. Empty notes array if there are no cards.
- "totals.trueNetExpense" is spending after money owed back. If it differs from "totals.expense", lead with the true figure.`;

export async function getDeepFinanceAnalysis(
	summary: FinanceSummary,
): Promise<DeepAnalysisResult> {
	if (!hasUsableData(summary)) {
		return {
			ok: false,
			code: "no_data",
			message:
				"Add some accounts and transactions first — there is nothing to analyse yet.",
		};
	}

	return runDeepAnalysis(DEEP_SYSTEM_PROMPT, summary);
}
