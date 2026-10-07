// Savings goal planning: how much to save per month, pace vs. a straight
// line from creation to deadline, and a projection from actual contributions.
// Shared by the Savings tab (BudgetManager) and Finance Analytics.

import type { SavingsGoal } from "@/src/types/finance";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DAYS_PER_MONTH = 30.44;
export const WEEKS_PER_MONTH = 4.345;

export type GoalPace = "ahead" | "on_track" | "behind";
export const PACE_LABEL: Record<GoalPace, string> = {
	ahead: "Ahead",
	on_track: "On track",
	behind: "Behind",
};

export const monthsUntil = (date: string) =>
	(new Date(date).getTime() - Date.now()) / DAY_MS / DAYS_PER_MONTH;

export interface GoalPlan {
	remaining: number;
	daysLeft: number | null;
	overdue: boolean;
	/** Needed per month to finish by the deadline; null without a deadline. */
	monthlyNeeded: number | null;
	/** Linear target from creation to deadline. */
	expectedByNow: number | null;
	pace: GoalPace | null;
	catchUp: number | null;
	/** Net contributions per month since the goal was created. */
	avgMonthly: number;
	projectedDate: Date | null;
	thisMonth: number;
	/** Without a deadline: what different monthly amounts would take. */
	suggestions: { months: number; perMonth: number }[];
}

export function getGoalPlan(goal: SavingsGoal): GoalPlan {
	const now = Date.now();
	const current = goal.currentAmount || 0;
	const remaining = Math.max(0, goal.targetAmount - current);
	const created = new Date(goal.createdAt).getTime() || now;
	const contributions = goal.contributions || [];

	const monthsActive = Math.max(1, (now - created) / DAY_MS / DAYS_PER_MONTH);
	const avgMonthly = Math.max(0, current / monthsActive);
	const projectedDate =
		remaining > 0 && avgMonthly > 0 && contributions.length > 0
			? new Date(now + (remaining / avgMonthly) * DAYS_PER_MONTH * DAY_MS)
			: null;

	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);
	const thisMonth = contributions
		.filter((c) => new Date(c.date) >= monthStart)
		.reduce((sum, c) => sum + c.amount, 0);

	let daysLeft: number | null = null;
	let overdue = false;
	let monthlyNeeded: number | null = null;
	let expectedByNow: number | null = null;
	let pace: GoalPace | null = null;
	let catchUp: number | null = null;

	if (goal.deadline) {
		const deadline = new Date(goal.deadline).getTime();
		daysLeft = Math.ceil((deadline - now) / DAY_MS);
		overdue = daysLeft < 0 && remaining > 0;
		// Less than a month left still means "this month's amount", not more.
		monthlyNeeded = remaining / Math.max(1, daysLeft / DAYS_PER_MONTH);

		const total = deadline - created;
		if (total > 0) {
			const elapsed = Math.min(1, Math.max(0, (now - created) / total));
			expectedByNow = goal.targetAmount * elapsed;
			const diff = current - expectedByNow;
			// 5% of the target counts as "on track" either way.
			const tolerance = goal.targetAmount * 0.05;
			pace =
				diff < -tolerance ? "behind" : diff > tolerance ? "ahead" : "on_track";
			catchUp = diff < 0 ? -diff : null;
		}
	}

	const suggestions = [3, 6, 12]
		.map((months) => ({ months, perMonth: remaining / months }))
		.filter((s) => s.perMonth > 0);

	return {
		remaining,
		daysLeft,
		overdue,
		monthlyNeeded,
		expectedByNow,
		pace,
		catchUp,
		avgMonthly,
		projectedDate,
		thisMonth,
		suggestions,
	};
}

