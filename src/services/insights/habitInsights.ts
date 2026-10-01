/** Groq-backed deep analysis for the Habits module. */

import type { DayProgress, Habit, HabitStats } from "@/src/types/index";
import { describeFrequency } from "@/src/utils/frequency";
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
} from "./core";

const WEEKDAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

export interface HabitBreakdown {
	name: string;
	type: Habit["type"];
	schedule: string;
	/** Days due inside the window. */
	scheduled: number;
	completed: number;
	missed: number;
	completionRate: number;
	currentStreak: number;
	longestStreak: number;
	/** Measurable habits only. */
	unit?: string;
	target?: number;
	averageValue?: number;
	bestValue?: number;
	/** Days since the last completion, or null if never completed. */
	daysSinceLastDone: number | null;
	/** Weekdays where this habit is missed most, worst first. */
	weakestDays: string[];
}

export interface WeekdayPattern {
	day: string;
	scheduled: number;
	completed: number;
	completionRate: number;
}

export interface HabitsSummary {
	generatedAt: string;
	range: InsightRange;
	rangeLabel: string;
	periodStart: string;
	periodEnd: string;
	windowDays: number;
	totals: {
		activeHabits: number;
		archivedHabits: number;
		scheduled: number;
		completed: number;
		missed: number;
		overallCompletionRate: number;
		perfectDays: number;
		zeroDays: number;
	};
	habits: HabitBreakdown[];
	weekdayPattern: WeekdayPattern[];
	/** Habits not completed once in the window, by name. */
	dormantHabits: string[];
	/** Habits at or above a 90% rate, by name. */
	strongHabits: string[];
}

function inWindow(date: string, window: DateWindow): boolean {
	return date >= window.start && date <= window.end;
}

function weakestDaysFor(days: DayProgress[]): string[] {
	const buckets = new Map<number, { scheduled: number; missed: number }>();

	for (const d of days) {
		if (!d.active) continue;
		const idx = new Date(d.date).getDay();
		const entry = buckets.get(idx) ?? { scheduled: 0, missed: 0 };
		entry.scheduled += 1;
		if (!d.completed) entry.missed += 1;
		buckets.set(idx, entry);
	}

	return Array.from(buckets.entries())
		.filter(([, v]) => v.missed > 0)
		.sort((a, b) => b[1].missed / b[1].scheduled - a[1].missed / a[1].scheduled)
		.slice(0, 2)
		.map(([idx]) => WEEKDAY_NAMES[idx]);
}

/**
 * Aggregates before serialising — HabitStats.days can hold a year of entries
 * per habit, which would blow the prompt budget many times over.
 */
export function buildHabitsSummary(args: {
	range: InsightRange;
	customWindow?: DateWindow;
	habits: Habit[];
	archivedCount: number;
	statsFor: (habitId: string) => HabitStats | undefined;
}): HabitsSummary {
	const { range, customWindow, habits, archivedCount, statsFor } = args;

	const window = resolveDateWindow(range, customWindow);
	const windowDays = countDays(window);
	const today = new Date();

	let scheduledTotal = 0;
	let completedTotal = 0;

	const weekdayBuckets = new Map<
		number,
		{ scheduled: number; completed: number }
	>();
	// date -> [scheduled, completed] across all habits, for perfect/zero days.
	const dayTotals = new Map<string, { scheduled: number; completed: number }>();

	const breakdowns: HabitBreakdown[] = [];

	for (const habit of habits) {
		const stats = statsFor(habit.id);
		if (!stats) continue;

		const windowDaysForHabit = stats.days.filter((d) =>
			inWindow(d.date, window),
		);
		const activeDays = windowDaysForHabit.filter((d) => d.active);
		const completedDays = activeDays.filter((d) => d.completed);

		scheduledTotal += activeDays.length;
		completedTotal += completedDays.length;

		for (const d of activeDays) {
			const idx = new Date(d.date).getDay();
			const wd = weekdayBuckets.get(idx) ?? { scheduled: 0, completed: 0 };
			wd.scheduled += 1;
			if (d.completed) wd.completed += 1;
			weekdayBuckets.set(idx, wd);

			const dt = dayTotals.get(d.date) ?? { scheduled: 0, completed: 0 };
			dt.scheduled += 1;
			if (d.completed) dt.completed += 1;
			dayTotals.set(d.date, dt);
		}

		const lastDone = [...completedDays].sort((a, b) =>
			b.date.localeCompare(a.date),
		)[0];

		const measurableValues = activeDays
			.map((d) => d.value)
			.filter((v): v is number => typeof v === "number");

		breakdowns.push({
			name: habit.name,
			type: habit.type,
			schedule: describeFrequency(habit.frequency, habit.notificationTime),
			scheduled: activeDays.length,
			completed: completedDays.length,
			missed: activeDays.length - completedDays.length,
			completionRate:
				activeDays.length > 0
					? round((completedDays.length / activeDays.length) * 100)
					: 0,
			currentStreak: stats.currentStreak,
			longestStreak: stats.longestStreak,
			unit: habit.unit,
			target: habit.target,
			averageValue:
				measurableValues.length > 0
					? round(
							measurableValues.reduce((s, v) => s + v, 0) /
								measurableValues.length,
						)
					: undefined,
			bestValue:
				measurableValues.length > 0
					? round(Math.max(...measurableValues))
					: undefined,
			daysSinceLastDone: lastDone
				? Math.floor(
						(today.getTime() - new Date(lastDone.date).getTime()) / 86400000,
					)
				: null,
			weakestDays: weakestDaysFor(windowDaysForHabit),
		});
	}

	breakdowns.sort((a, b) => a.completionRate - b.completionRate);

	const dayValues = Array.from(dayTotals.values());

	return {
		generatedAt: new Date().toISOString(),
		range,
		rangeLabel: describeWindow(range, window),
		periodStart: window.start,
		periodEnd: window.end,
		windowDays,
		totals: {
			activeHabits: habits.length,
			archivedHabits: archivedCount,
			scheduled: scheduledTotal,
			completed: completedTotal,
			missed: scheduledTotal - completedTotal,
			overallCompletionRate:
				scheduledTotal > 0 ? round((completedTotal / scheduledTotal) * 100) : 0,
			perfectDays: dayValues.filter(
				(d) => d.scheduled > 0 && d.completed === d.scheduled,
			).length,
			zeroDays: dayValues.filter((d) => d.scheduled > 0 && d.completed === 0)
				.length,
		},
		habits: breakdowns,
		weekdayPattern: Array.from(weekdayBuckets.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([idx, v]) => ({
				day: WEEKDAY_NAMES[idx],
				scheduled: v.scheduled,
				completed: v.completed,
				completionRate:
					v.scheduled > 0 ? round((v.completed / v.scheduled) * 100) : 0,
			})),
		dormantHabits: breakdowns
			.filter((h) => h.completed === 0 && h.scheduled > 0)
			.map((h) => h.name),
		strongHabits: breakdowns
			.filter((h) => h.completionRate >= 90 && h.scheduled > 0)
			.map((h) => h.name),
	};
}

const HABITS_SYSTEM_PROMPT = `You are a rigorous habit-building coach. You produce structured JSON only.

You receive a JSON summary of one user's habit tracking covering "periodStart" to "periodEnd" inclusive, described by "rangeLabel" and spanning "windowDays" days. Analyse it deeply and return a single JSON object.

${SHARED_SCHEMA_RULES}

HABIT SPECIFICS:
- scoreBreakdown labels must be exactly: Consistency, Streaks, Coverage, Momentum.
- headlineMetrics: express values as percentages, day counts or streak lengths. Never invent units.
- findings evidence must contain real habit names from the "habits" array. Never say "a habit" when you can name it.
- breakdowns: one per entry in "habits", up to 6, worst completion rate first. "label" is the habit name, "value" its completed day count, "share" its completionRate, "namedItems" its weakestDays.
- noteGroups: exactly two entries, titled "Weekly Pattern" and "Needs Attention".
  - Weekly Pattern: use "weekdayPattern" to call out which weekdays are strongest and weakest by name. Empty notes array if there is no scheduled data.
  - Needs Attention: name every habit in "dormantHabits" and say how many days since it was last done using "daysSinceLastDone". Empty notes array if none.
- Praise habits listed in "strongHabits" by name in at least one finding when the array is non-empty.
- A habit with a high "longestStreak" but low "currentStreak" has slipped — say so plainly and name it.
- Never shame the user. Be direct and practical about what to fix next.
- "estimatedSaving" on actions means extra days completed per month if the action is followed. Omit it when you cannot ground it in the data.`;

export async function getDeepHabitsAnalysis(
	summary: HabitsSummary,
): Promise<DeepAnalysisResult> {
	if (summary.habits.length === 0 || summary.totals.scheduled === 0) {
		return {
			ok: false,
			code: "no_data",
			message:
				"Create a habit and track it for a few days — there is nothing to analyse yet.",
		};
	}

	return runDeepAnalysis(HABITS_SYSTEM_PROMPT, summary);
}
