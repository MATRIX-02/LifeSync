// Finance analytics engine: pure, on-device calculations behind the Analytics
// tab. Everything here describes the user's *current* position (this month,
// trailing averages, balances, obligations) rather than the selected period,
// so the screen can answer "where do I stand and what should I do?".
//
// Transfers are ignored everywhere: they move money, they don't earn or spend it.

import type {
	Account,
	BillReminder,
	Budget,
	Debt,
	RecurringTransaction,
	SavingsGoal,
	Transaction,
} from "@/src/types/finance";
import { DAYS_PER_MONTH, getGoalPlan, WEEKS_PER_MONTH } from "@/src/utils/savingsGoalPlan";

// ---------- dates ----------

/** Local YYYY-MM-DD (toISOString would shift the day in non-UTC timezones). */
export const toDateKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const monthKeyOf = (dateKey: string) => dateKey.slice(0, 7);

const addMonths = (d: Date, n: number) =>
	new Date(d.getFullYear(), d.getMonth() + n, 1);

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

// ---------- inputs / outputs ----------

export interface AnalyticsInput {
	transactions: Transaction[];
	accounts: Account[];
	budgets: Budget[];
	billReminders: BillReminder[];
	debts: Debt[];
	savingsGoals: SavingsGoal[];
	recurringTransactions: RecurringTransaction[];
	now?: Date;
}

export interface Baseline {
	/** Complete months (before the current one) that had any activity, max 3. */
	monthsUsed: number;
	avgIncome: number;
	avgExpense: number;
	avgSavingsRate: number | null;
	avgByCategory: Record<string, number>;
}

export interface MonthForecast {
	dayOfMonth: number;
	daysInMonth: number;
	daysLeft: number;
	mtdIncome: number;
	mtdExpense: number;
	projectedExpense: number;
	expectedIncome: number;
	upcomingBills: number;
	upcomingBillCount: number;
	goalNeedsThisMonth: number;
	/** Income left after spending so far, upcoming bills and goal targets. */
	safeToSpend: number;
	safePerDay: number;
	projectedSavings: number;
}

export interface BudgetForecast {
	budget: Budget;
	spent: number;
	projected: number;
	percentUsed: number;
	status: "ok" | "at_risk" | "over";
	/** Daily amount that keeps the budget intact for the rest of the month. */
	dailyAllowance: number;
}

export interface CategoryMover {
	category: string;
	recent: number;
	average: number;
	change: number; // fraction, e.g. 0.4 = +40%
}

export interface Obligations {
	fixedMonthly: number;
	billsMonthly: number;
	recurringMonthly: number;
	fixedShare: number | null; // of avg monthly expense
	oweTotal: number;
	lentTotal: number;
	highInterestDebts: Debt[];
	creditUsed: number;
	creditLimit: number;
	creditUtilization: number | null;
	overdueBills: BillReminder[];
	goalsMonthlyNeeded: number;
	goalsBehind: number;
}

export interface Snapshot {
	netWorth: number;
	liquid: number;
	emergencyMonths: number | null;
	goalsSaved: number;
	goalsTarget: number;
}

export interface HealthFactor {
	key: string;
	label: string;
	score: number; // 0-100
	detail: string;
	/** One-line plain-language "what is this?" */
	hint: string;
}

export interface Recommendation {
	id: string;
	severity: "high" | "medium" | "low" | "good";
	icon: string;
	title: string;
	body: string;
}

export interface FinanceAnalytics {
	baseline: Baseline;
	forecast: MonthForecast;
	budgets: BudgetForecast[];
	movers: CategoryMover[];
	obligations: Obligations;
	snapshot: Snapshot;
	health: { score: number | null; factors: HealthFactor[] };
	recommendations: Recommendation[];
}

// ---------- helpers ----------

const BILL_PER_MONTH: Record<BillReminder["frequency"], number> = {
	once: 0,
	weekly: WEEKS_PER_MONTH,
	monthly: 1,
	yearly: 1 / 12,
};

const RECURRING_PER_MONTH: Record<RecurringTransaction["frequency"], number> = {
	daily: DAYS_PER_MONTH,
	weekly: WEEKS_PER_MONTH,
	biweekly: WEEKS_PER_MONTH / 2,
	monthly: 1,
	yearly: 1 / 12,
};

const LIQUID_TYPES: Account["type"][] = ["cash", "bank", "wallet"];

// ---------- main ----------

export function computeFinanceAnalytics(
	input: AnalyticsInput,
	fmt: (n: number) => string,
	categoryName: (key: string) => string,
): FinanceAnalytics {
	const now = input.now ?? new Date();
	const todayKey = toDateKey(now);
	const thisMonth = monthKeyOf(todayKey);
	const flows = input.transactions.filter(
		(t) => t.type === "income" || t.type === "expense",
	);

	// ----- baseline: last up-to-3 complete months that had activity -----
	const monthTotals = new Map<
		string,
		{ income: number; expense: number; cats: Record<string, number> }
	>();
	for (const t of flows) {
		const mk = monthKeyOf(t.date);
		let m = monthTotals.get(mk);
		if (!m) monthTotals.set(mk, (m = { income: 0, expense: 0, cats: {} }));
		if (t.type === "income") m.income += t.amount;
		else {
			m.expense += t.amount;
			m.cats[t.category] = (m.cats[t.category] || 0) + t.amount;
		}
	}
	const baselineMonths: string[] = [];
	for (let i = 1; i <= 3; i++) {
		const mk = toDateKey(addMonths(now, -i)).slice(0, 7);
		if (monthTotals.has(mk)) baselineMonths.push(mk);
	}
	const n = baselineMonths.length;
	const avgIncome = n
		? baselineMonths.reduce((s, mk) => s + monthTotals.get(mk)!.income, 0) / n
		: 0;
	const avgExpense = n
		? baselineMonths.reduce((s, mk) => s + monthTotals.get(mk)!.expense, 0) / n
		: 0;
	const avgByCategory: Record<string, number> = {};
	baselineMonths.forEach((mk) => {
		Object.entries(monthTotals.get(mk)!.cats).forEach(([c, v]) => {
			avgByCategory[c] = (avgByCategory[c] || 0) + v / n;
		});
	});
	const baseline: Baseline = {
		monthsUsed: n,
		avgIncome,
		avgExpense,
		avgSavingsRate: avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : null,
		avgByCategory,
	};

	// ----- this month forecast -----
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const daysLeft = daysInMonth - dayOfMonth + 1; // includes today
	const monthEndKey = toDateKey(
		new Date(now.getFullYear(), now.getMonth(), daysInMonth),
	);
	const cur = monthTotals.get(thisMonth) ?? { income: 0, expense: 0, cats: {} };

	// Early in the month the actual pace is noise, so lean on the baseline and
	// shift weight to the real pace as the month progresses.
	const w = dayOfMonth / daysInMonth;
	const blendDaily = (mtd: number, monthlyAvg: number) => {
		const pace = mtd / dayOfMonth;
		const base = monthlyAvg / daysInMonth;
		return n ? w * pace + (1 - w) * base : pace;
	};
	const remainingAfterToday = daysInMonth - dayOfMonth;
	const projectedExpense =
		cur.expense + blendDaily(cur.expense, avgExpense) * remainingAfterToday;

	const unpaidBills = input.billReminders.filter((b) => !b.isPaid);
	const billsThisMonth = unpaidBills.filter(
		(b) => b.dueDate >= todayKey && b.dueDate <= monthEndKey,
	);
	const upcomingBills = billsThisMonth.reduce((s, b) => s + b.amount, 0);

	const activeGoals = input.savingsGoals.filter((g) => !g.isCompleted);
	const goalPlans = activeGoals.map((g) => ({ goal: g, plan: getGoalPlan(g) }));
	const goalNeedsThisMonth = goalPlans.reduce((s, { plan }) => {
		if (plan.monthlyNeeded === null || plan.overdue) return s;
		return s + Math.max(0, plan.monthlyNeeded - Math.max(0, plan.thisMonth));
	}, 0);

	const expectedIncome = Math.max(cur.income, avgIncome);
	const safeToSpend = expectedIncome - cur.expense - upcomingBills - goalNeedsThisMonth;
	const forecast: MonthForecast = {
		dayOfMonth,
		daysInMonth,
		daysLeft,
		mtdIncome: cur.income,
		mtdExpense: cur.expense,
		projectedExpense,
		expectedIncome,
		upcomingBills,
		upcomingBillCount: billsThisMonth.length,
		goalNeedsThisMonth,
		safeToSpend,
		safePerDay: safeToSpend / daysLeft,
		projectedSavings: expectedIncome - projectedExpense,
	};

	// ----- budgets -----
	const budgetForecasts: BudgetForecast[] = input.budgets
		.filter((b) => b.isActive !== false && b.amount > 0)
		.map((budget) => {
			const spent = cur.cats[budget.category] || 0;
			const projected =
				spent +
				blendDaily(spent, avgByCategory[budget.category] || 0) *
					remainingAfterToday;
			const threshold = (budget.alertThreshold || 80) / 100;
			const status: BudgetForecast["status"] =
				spent > budget.amount
					? "over"
					: projected > budget.amount || spent > budget.amount * threshold
						? "at_risk"
						: "ok";
			return {
				budget,
				spent,
				projected,
				percentUsed: (spent / budget.amount) * 100,
				status,
				dailyAllowance: Math.max(0, budget.amount - spent) / daysLeft,
			};
		})
		.sort((a, b) => b.projected / b.budget.amount - a.projected / a.budget.amount);

	// ----- category movers: last 30 days vs baseline monthly average -----
	const last30Key = toDateKey(new Date(now.getTime() - 29 * 86400000));
	const recentByCat: Record<string, number> = {};
	flows
		.filter((t) => t.type === "expense" && t.date >= last30Key && t.date <= todayKey)
		.forEach((t) => {
			recentByCat[t.category] = (recentByCat[t.category] || 0) + t.amount;
		});
	const moverFloor = Math.max(avgExpense * 0.03, 1);
	const movers: CategoryMover[] = n
		? Array.from(new Set([...Object.keys(recentByCat), ...Object.keys(avgByCategory)]))
				.map((category) => {
					const recent = recentByCat[category] || 0;
					const average = avgByCategory[category] || 0;
					return {
						category,
						recent,
						average,
						change: average > 0 ? (recent - average) / average : recent > 0 ? 1 : 0,
					};
				})
				.filter(
					(m) => Math.abs(m.recent - m.average) >= moverFloor && Math.abs(m.change) >= 0.25,
				)
				.sort((a, b) => Math.abs(b.recent - b.average) - Math.abs(a.recent - a.average))
				.slice(0, 5)
		: [];

	// ----- obligations -----
	const billsMonthly = unpaidBills
		.concat(input.billReminders.filter((b) => b.isPaid && b.frequency !== "once"))
		.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i)
		.reduce((s, b) => s + b.amount * BILL_PER_MONTH[b.frequency], 0);
	const recurringMonthly = input.recurringTransactions
		.filter((r) => r.isActive && r.type === "expense")
		.reduce((s, r) => s + r.amount * RECURRING_PER_MONTH[r.frequency], 0);
	const fixedMonthly = billsMonthly + recurringMonthly;

	const openDebts = input.debts.filter((d) => !d.isSettled);
	const oweTotal = openDebts
		.filter((d) => d.type !== "lent")
		.reduce((s, d) => s + (d.remainingAmount || 0), 0);
	const lentTotal = openDebts
		.filter((d) => d.type === "lent")
		.reduce((s, d) => s + (d.remainingAmount || 0), 0);
	const highInterestDebts = openDebts.filter(
		(d) => d.type !== "lent" && (d.interestRate || 0) >= 15,
	);

	const cards = input.accounts.filter(
		(a) => a.type === "credit_card" && (a.creditLimit || 0) > 0,
	);
	const creditLimit = cards.reduce((s, a) => s + (a.creditLimit || 0), 0);
	const creditUsed = cards.reduce((s, a) => s + Math.max(0, a.creditUsed || 0), 0);

	const overdueBills = unpaidBills.filter((b) => b.dueDate < todayKey);
	const goalsMonthlyNeeded = goalPlans.reduce(
		(s, { plan }) => s + (plan.monthlyNeeded && !plan.overdue ? plan.monthlyNeeded : 0),
		0,
	);
	const goalsBehind = goalPlans.filter(({ plan }) => plan.pace === "behind").length;

	const obligations: Obligations = {
		fixedMonthly,
		billsMonthly,
		recurringMonthly,
		fixedShare: avgExpense > 0 ? fixedMonthly / avgExpense : null,
		oweTotal,
		lentTotal,
		highInterestDebts,
		creditUsed,
		creditLimit,
		creditUtilization: creditLimit > 0 ? creditUsed / creditLimit : null,
		overdueBills,
		goalsMonthlyNeeded,
		goalsBehind,
	};

	// ----- snapshot -----
	const liquid = input.accounts
		.filter((a) => LIQUID_TYPES.includes(a.type))
		.reduce((s, a) => s + Math.max(0, a.balance), 0);
	const monthlyBurn = avgExpense || cur.expense;
	const snapshot: Snapshot = {
		netWorth: input.accounts.reduce((s, a) => s + a.balance, 0),
		liquid,
		emergencyMonths: monthlyBurn > 0 ? liquid / monthlyBurn : null,
		goalsSaved: input.savingsGoals.reduce((s, g) => s + (g.currentAmount || 0), 0),
		goalsTarget: input.savingsGoals.reduce((s, g) => s + g.targetAmount, 0),
	};

	// ----- health score -----
	const factors: (HealthFactor & { weight: number })[] = [];
	const rate =
		baseline.avgSavingsRate ??
		(cur.income > 0 ? (cur.income - cur.expense) / cur.income : null);
	if (rate !== null)
		factors.push({
			key: "savings",
			label: "Money left over",
			weight: 25,
			score: clamp((rate / 0.2) * 100),
			detail:
				rate >= 0
					? `You keep ${Math.round(rate * 100)}% of what you earn`
					: `You spend ${Math.round(-rate * 100)}% more than you earn`,
			hint: "Out of every ₹100 you earn, how much you don't spend. Try to keep at least 20.",
		});
	if (snapshot.emergencyMonths !== null)
		factors.push({
			key: "emergency",
			label: "Backup money",
			weight: 25,
			score: clamp((snapshot.emergencyMonths / 6) * 100),
			detail: `Your cash and bank balance would last ${snapshot.emergencyMonths.toFixed(1)} months`,
			hint: "If your income stopped today, how long you could keep paying your usual expenses. 6 months is ideal.",
		});
	if (budgetForecasts.length)
		factors.push({
			key: "budgets",
			label: "Staying in budget",
			weight: 15,
			score:
				(budgetForecasts.filter((b) => b.status === "ok").length /
					budgetForecasts.length) *
				100,
			detail: `${budgetForecasts.filter((b) => b.status === "ok").length} of ${budgetForecasts.length} budgets are on track`,
			hint: "How many of your monthly spending limits you're keeping to.",
		});
	const annualIncome = (avgIncome || cur.income) * 12;
	if (annualIncome > 0 || oweTotal > 0)
		factors.push({
			key: "debt",
			label: "Loans & debts",
			weight: 15,
			score:
				oweTotal === 0
					? 100
					: annualIncome > 0
						? clamp(100 - (oweTotal / annualIncome) * 200)
						: 0,
			detail:
				oweTotal === 0
					? "You don't owe anyone"
					: annualIncome > 0
						? `You owe ${fmt(oweTotal)} — about ${Math.round((oweTotal / (annualIncome / 12)) * 10) / 10} months of income`
						: `You owe ${fmt(oweTotal)}`,
			hint: "How much you owe compared with what you earn. Less is better.",
		});
	if (obligations.creditUtilization !== null)
		factors.push({
			key: "credit",
			label: "Credit card use",
			weight: 10,
			score: clamp(100 - Math.max(0, obligations.creditUtilization - 0.3) * (100 / 0.6)),
			detail: `You've used ${Math.round(obligations.creditUtilization * 100)}% of your card limit`,
			hint: "Using less than 30% of your card limit keeps your credit score healthy.",
		});
	if (input.billReminders.length)
		factors.push({
			key: "bills",
			label: "Bills on time",
			weight: 10,
			score: clamp(100 - overdueBills.length * 34),
			detail: overdueBills.length
				? `${overdueBills.length} bill${overdueBills.length > 1 ? "s are" : " is"} late`
				: "No late bills",
			hint: "Bills that are past their due date.",
		});
	const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
	const health = {
		score:
			flows.length && totalWeight
				? Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight)
				: null,
		factors: factors.map(({ weight: _w, ...f }) => f),
	};

	// ----- recommendations -----
	const recs: Recommendation[] = [];
	const push = (r: Recommendation) => recs.push(r);

	if (overdueBills.length)
		push({
			id: "overdue",
			severity: "high",
			icon: "alert-circle",
			title: `Pay your late bill${overdueBills.length > 1 ? "s" : ""}`,
			body: `${overdueBills.map((b) => b.name).slice(0, 3).join(", ")} (${fmt(overdueBills.reduce((s, b) => s + b.amount, 0))}) ${overdueBills.length > 1 ? "are" : "is"} past the due date. Pay ${overdueBills.length > 1 ? "these" : "this"} first to avoid late fees.`,
		});

	if (forecast.safeToSpend < 0 && expectedIncome > 0)
		push({
			id: "safe",
			severity: "high",
			icon: "warning",
			title: "Money will run short this month",
			body: `After what you've spent, your upcoming bills (${fmt(upcomingBills)}) and savings goals (${fmt(goalNeedsThisMonth)}), you'll be ${fmt(-forecast.safeToSpend)} short. Hold off on things you don't need, or save less toward a goal this month.`,
		});

	budgetForecasts
		.filter((b) => b.status !== "ok")
		.slice(0, 3)
		.forEach((b) => {
			const name = categoryName(b.budget.category);
			push({
				id: `budget_${b.budget.id}`,
				severity: b.status === "over" ? "high" : "medium",
				icon: "pie-chart",
				title:
					b.status === "over"
						? `You've gone over your ${name} limit`
						: `${name} may go over its limit`,
				body:
					b.status === "over"
						? `You've spent ${fmt(b.spent)}, but your limit is ${fmt(b.budget.amount)}. Spend less here for the rest of the month, or raise the limit if it was too low.`
						: `If you keep spending like this, you'll reach about ${fmt(b.projected)} (limit ${fmt(b.budget.amount)}). Spend at most ${fmt(b.dailyAllowance)} a day here to stay under.`,
			});
		});

	if (highInterestDebts.length) {
		const top = [...highInterestDebts].sort(
			(a, b) => (b.interestRate || 0) - (a.interestRate || 0),
		)[0];
		push({
			id: "debt",
			severity: "high",
			icon: "flame",
			title: `Pay off ${top.personName} first`,
			body: `This debt (${fmt(top.remainingAmount)}) charges ${top.interestRate}% interest, so it keeps growing. Clearing it saves you more than saving or investing that money would earn.`,
		});
	}

	if (obligations.creditUtilization !== null && obligations.creditUtilization > 0.3)
		push({
			id: "credit",
			severity: obligations.creditUtilization > 0.6 ? "high" : "medium",
			icon: "card",
			title: `You've used ${Math.round(obligations.creditUtilization * 100)}% of your card limit`,
			body: `Paying ${fmt(creditUsed - creditLimit * 0.3)} toward your card brings it under 30%. Staying under 30% helps your credit score, which matters when you apply for a loan.`,
		});

	if (snapshot.emergencyMonths !== null && snapshot.emergencyMonths < 3) {
		const target = monthlyBurn * 3;
		push({
			id: "emergency",
			severity: snapshot.emergencyMonths < 1 ? "high" : "medium",
			icon: "shield",
			title: "Keep more backup money",
			body: `If your income stopped, your cash and bank balance would last about ${snapshot.emergencyMonths.toFixed(1)} months. Saving ${fmt(target - liquid)} more would cover 3 months — that's ${fmt((target - liquid) / 6)} a month for 6 months.`,
		});
	}

	if (rate !== null && rate < 0.2 && avgIncome > 0) {
		const gap = avgIncome * 0.2 - (avgIncome - avgExpense);
		const topCut = Object.entries(avgByCategory)
			.filter(([c]) => !["rent", "utilities", "insurance", "bills"].includes(c))
			.sort((a, b) => b[1] - a[1])[0];
		push({
			id: "rate",
			severity: rate < 0 ? "high" : "medium",
			icon: "trending-down",
			title:
				rate < 0
					? "You're spending more than you earn"
					: `You keep only ${Math.round(rate * 100)}% of what you earn`,
			body: `Spend ${fmt(gap)} less each month and you'll keep 20% of your income.${topCut ? ` Your biggest cuttable spend is ${categoryName(topCut[0])} (${fmt(topCut[1])} a month) — spending ${Math.round(Math.min(100, (gap / topCut[1]) * 100))}% less there would do it.` : ""}`,
		});
	}

	movers
		.filter((m) => m.change > 0)
		.slice(0, 2)
		.forEach((m) =>
			push({
				id: `mover_${m.category}`,
				severity: "medium",
				icon: "trending-up",
				title: `You're spending more on ${categoryName(m.category)}`,
				body: `${fmt(m.recent)} in the last 30 days, while you normally spend ${fmt(m.average)} a month. Was it a one-time thing, or is it becoming a habit?`,
			}),
		);

	if (goalsBehind)
		push({
			id: "goals",
			severity: "medium",
			icon: "flag",
			title: `${goalsBehind} savings goal${goalsBehind > 1 ? "s are" : " is"} falling behind`,
			body: `To finish on time you need to save ${fmt(goalsMonthlyNeeded)} a month in total${avgIncome > 0 ? ` (${Math.round((goalsMonthlyNeeded / avgIncome) * 100)}% of your income)` : ""}. If that's too much, move a deadline later instead of skipping months.`,
		});

	const unbudgeted = Object.entries(avgByCategory)
		.filter(([c]) => !input.budgets.some((b) => b.category === c))
		.sort((a, b) => b[1] - a[1])[0];
	if (unbudgeted && avgExpense > 0 && unbudgeted[1] / avgExpense >= 0.15)
		push({
			id: "unbudgeted",
			severity: "low",
			icon: "add-circle",
			title: `Set a monthly limit for ${categoryName(unbudgeted[0])}`,
			body: `You spend about ${fmt(unbudgeted[1])} a month here (${Math.round((unbudgeted[1] / avgExpense) * 100)}% of all spending) with no limit. A limit of ${fmt(unbudgeted[1] * 0.9)} would save you about ${fmt(unbudgeted[1] * 0.1 * 12)} a year.`,
		});

	const subs = avgByCategory.subscriptions || 0;
	if (subs > 0 && avgExpense > 0 && subs / avgExpense >= 0.05)
		push({
			id: "subs",
			severity: "low",
			icon: "repeat",
			title: "Review your subscriptions",
			body: `You pay ${fmt(subs)} a month (${fmt(subs * 12)} a year) for subscriptions. Cancel any you haven't used recently.`,
		});

	if (obligations.fixedShare !== null && obligations.fixedShare > 0.6)
		push({
			id: "fixed",
			severity: "low",
			icon: "lock-closed",
			title: "Most of your money goes to fixed bills",
			body: `Bills and regular payments take ${Math.round(obligations.fixedShare * 100)}% of what you spend each month, so there's little left to adjust. Lowering or cancelling one of them helps more than cutting small daily spends.`,
		});

	if (lentTotal > 0)
		push({
			id: "lent",
			severity: "low",
			icon: "people",
			title: `${fmt(lentTotal)} is owed to you`,
			body: "People owe you this money. Asking for it back is the easiest way to get cash.",
		});

	if (rate !== null && rate >= 0.2 && (snapshot.emergencyMonths ?? 0) >= 6 && oweTotal === 0)
		push({
			id: "invest",
			severity: "good",
			icon: "rocket",
			title: "You're ready to start investing",
			body: `You save well, have enough backup money and owe nothing. Consider putting about ${fmt(Math.max(0, avgIncome - avgExpense) * 0.5)} a month into a long-term investment like a SIP.`,
		});
	else if (rate !== null && rate >= 0.2)
		push({
			id: "rate_good",
			severity: "good",
			icon: "trophy",
			title: `Nice — you keep ${Math.round(rate * 100)}% of what you earn`,
			body: "That's above the 20% target. Put the extra into backup money first, then your savings goals.",
		});

	const order = { high: 0, medium: 1, low: 2, good: 3 };
	recs.sort((a, b) => order[a.severity] - order[b.severity]);

	return {
		baseline,
		forecast,
		budgets: budgetForecasts,
		movers,
		obligations,
		snapshot,
		health,
		recommendations: recs,
	};
}
