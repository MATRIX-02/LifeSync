/**
 * Monthly budget & bill reports.
 *
 * One `finance_monthly_reports` row per user per month (setup SQL:
 * docs/FINANCE_MONTHLY_REPORTS.md). The row freezes that month's budget
 * LIMITS, so editing a budget in December doesn't rewrite what October's
 * budget was. Spent figures are always recomputed from transactions (the
 * source of truth) and written back when they drift, e.g. after a backdated
 * expense.
 *
 * `budgets` and `bills` are jsonb: pass arrays, never JSON.stringify them.
 */

import { supabase } from "@/src/config/supabase";
import type { BillReminder, Budget, Transaction } from "@/src/types/finance";

/** "YYYY-MM" */
export type MonthKey = string;

export interface BudgetMonthLine {
	budgetId: string;
	category: string;
	limit: number;
	spent: number;
}

export interface BillMonthLine {
	billId: string;
	name: string;
	amount: number;
	category: string;
	dueDate: string;
	isPaid: boolean;
	paidDate: string | null;
}

export interface MonthlyReport {
	month: MonthKey;
	budgets: BudgetMonthLine[];
	bills: BillMonthLine[];
	totalBudget: number;
	totalSpent: number;
	billsTotal: number;
	billsPaid: number;
	/** Limits were not recorded during the month; copied from current budgets. */
	estimated: boolean;
}

// ---- Month helpers ---------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKeyOf = (d: Date): MonthKey =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const currentMonthKey = (): MonthKey => monthKeyOf(new Date());

export const shiftMonth = (month: MonthKey, by: number): MonthKey => {
	const [y, m] = month.split("-").map(Number);
	return monthKeyOf(new Date(y, m - 1 + by, 1));
};

/** Inclusive "YYYY-MM-DD" bounds of a month. */
export const monthBounds = (month: MonthKey): { from: string; to: string } => {
	const [y, m] = month.split("-").map(Number);
	const last = new Date(y, m, 0).getDate();
	return { from: `${month}-01`, to: `${month}-${pad(last)}` };
};

export const monthLabel = (month: MonthKey): string => {
	const [y, m] = month.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
		month: "long",
		year: "numeric",
	});
};

// ---- Building --------------------------------------------------------------

/** Bills whose due date falls in `month`. */
export const billsDueIn = (bills: BillReminder[], month: MonthKey) =>
	bills.filter((b) => (b.dueDate || "").slice(0, 7) === month);

const spentByCategory = (
	transactions: Transaction[],
	month: MonthKey,
): Record<string, number> => {
	const { from, to } = monthBounds(month);
	const out: Record<string, number> = {};
	for (const t of transactions) {
		if (t.type !== "expense" || t.date < from || t.date > to) continue;
		out[t.category] = (out[t.category] || 0) + Number(t.amount);
	}
	return out;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build a month's report.
 * - `frozen` is the stored report for that month, if any: its limits win over
 *   the current budgets, and bill lines for since-deleted bills are kept.
 * - Without `frozen`, limits come from the current budgets. For a past month
 *   that is a guess, so it's flagged `estimated`.
 */
export const buildReport = (
	month: MonthKey,
	data: {
		budgets: Budget[];
		transactions: Transaction[];
		bills: BillReminder[];
	},
	frozen: MonthlyReport | null,
): MonthlyReport => {
	const isCurrent = month === currentMonthKey();
	const spent = spentByCategory(data.transactions, month);

	// The current month always follows the live budgets (they are being edited
	// right now); past months keep whatever was recorded.
	const limitSource: { budgetId: string; category: string; limit: number }[] =
		isCurrent || !frozen
			? data.budgets
					.filter((b) => b.isActive !== false)
					.map((b) => ({
						budgetId: b.id,
						category: b.category,
						limit: Number(b.amount) || 0,
					}))
			: frozen.budgets;

	const budgets = limitSource.map((l) => ({
		...l,
		spent: round2(spent[l.category] || 0),
	}));

	const live: BillMonthLine[] = billsDueIn(data.bills, month).map((b) => ({
		billId: b.id,
		name: b.name,
		amount: Number(b.amount) || 0,
		category: b.category,
		dueDate: b.dueDate,
		isPaid: !!b.isPaid,
		paidDate: b.paidDate ?? null,
	}));
	const liveIds = new Set(live.map((b) => b.billId));
	const kept = (frozen?.bills || []).filter((b) => !liveIds.has(b.billId));
	const bills = [...live, ...kept].sort((a, b) =>
		a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0,
	);

	return {
		month,
		budgets,
		bills,
		totalBudget: round2(budgets.reduce((s, b) => s + b.limit, 0)),
		totalSpent: round2(budgets.reduce((s, b) => s + b.spent, 0)),
		billsTotal: round2(bills.reduce((s, b) => s + b.amount, 0)),
		billsPaid: round2(
			bills.filter((b) => b.isPaid).reduce((s, b) => s + b.amount, 0),
		),
		estimated: isCurrent ? false : frozen ? frozen.estimated : true,
	};
};

export const sameReport = (a: MonthlyReport, b: MonthlyReport) =>
	JSON.stringify(a) === JSON.stringify(b);

// ---- Persistence -----------------------------------------------------------

const parseJson = <T>(v: unknown): T[] =>
	typeof v === "string" ? JSON.parse(v) : Array.isArray(v) ? (v as T[]) : [];

const fromRow = (r: any): MonthlyReport => ({
	month: r.month,
	budgets: parseJson<BudgetMonthLine>(r.budgets),
	bills: parseJson<BillMonthLine>(r.bills),
	totalBudget: Number(r.total_budget) || 0,
	totalSpent: Number(r.total_spent) || 0,
	billsTotal: Number(r.bills_total) || 0,
	billsPaid: Number(r.bills_paid) || 0,
	estimated: !!r.estimated,
});

/** All stored reports, keyed by month. Null if the read failed. */
export const fetchMonthlyReports = async (
	userId: string,
): Promise<Record<MonthKey, MonthlyReport> | null> => {
	const { data, error } = await (supabase as any)
		.from("finance_monthly_reports")
		.select("*")
		.eq("user_id", userId);
	if (error) {
		console.error("Monthly reports load failed:", error.message);
		return null;
	}
	const out: Record<MonthKey, MonthlyReport> = {};
	for (const r of data || []) out[r.month] = fromRow(r);
	return out;
};

export const saveMonthlyReport = async (
	userId: string,
	report: MonthlyReport,
): Promise<boolean> => {
	const { error } = await (supabase as any)
		.from("finance_monthly_reports")
		.upsert(
			{
				user_id: userId,
				month: report.month,
				budgets: report.budgets, // jsonb: arrays, not strings
				bills: report.bills,
				total_budget: report.totalBudget,
				total_spent: report.totalSpent,
				bills_total: report.billsTotal,
				bills_paid: report.billsPaid,
				estimated: report.estimated,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "user_id,month" },
		);
	if (error) {
		console.error("Monthly report save failed:", error.message);
		return false;
	}
	return true;
};
