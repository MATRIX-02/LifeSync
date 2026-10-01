/** Groq-backed deep analysis for the Nutrition module. */

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

export interface MacroAverages {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	sugar: number;
}

export interface FoodFrequency {
	name: string;
	timesEaten: number;
	isHomeCooked?: boolean;
}

export interface SymptomLink {
	symptom: string;
	occurrences: number;
	/** Foods eaten on the day of, or day before, each occurrence. */
	precedingFoods: string[];
	avgDigestionRating?: number;
}

export interface NutritionSummary {
	generatedAt: string;
	range: InsightRange;
	rangeLabel: string;
	periodStart: string;
	periodEnd: string;
	windowDays: number;
	goals: {
		calories?: number;
		protein?: number;
		carbs?: number;
		fat?: number;
		water?: number;
	};
	averages: MacroAverages & { water: number; mealsPerDay: number };
	adherence: {
		daysLogged: number;
		loggingRate: number;
		caloriePercentOfGoal: number;
		proteinPercentOfGoal: number;
		waterPercentOfGoal: number;
		daysHittingProtein: number;
		daysOverCalories: number;
	};
	macroSplit: { protein: number; carbs: number; fat: number };
	topFoods: FoodFrequency[];
	homeCookedRate: number;
	mealTimingPattern: { mealType: string; count: number; avgCalories: number }[];
	gutHealth: {
		logsCount: number;
		avgDigestionRating?: number;
		avgEnergyLevel?: number;
		avgStoolType?: number;
		symptomLinks: SymptomLink[];
		probioticFoods: string[];
	};
	fasting: {
		completedFasts: number;
		avgDurationHours: number;
		adherenceRate: number;
		commonType?: string;
	};
}

const toDay = (d: Date | string): string =>
	typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

function foodNamesOf(log: any): string[] {
	const foods = Array.isArray(log?.foods) ? log.foods : [];
	return foods
		.map((f: any) => f?.name ?? f?.foodName ?? f?.food?.name)
		.filter((n: any): n is string => typeof n === "string" && n.trim() !== "");
}

function nutritionOf(log: any) {
	return log?.nutrition ?? log?.totalNutrition ?? {};
}

/**
 * Correlates gut symptoms against what was eaten that day and the day before —
 * the one thing the existing rule-based insights cannot do.
 */
function buildSymptomLinks(
	gutLogs: any[],
	mealsByDay: Map<string, string[]>,
): SymptomLink[] {
	const buckets = new Map<
		string,
		{ occurrences: number; foods: Map<string, number>; ratings: number[] }
	>();

	for (const log of gutLogs) {
		const symptoms: string[] = Array.isArray(log.symptoms) ? log.symptoms : [];
		if (symptoms.length === 0) continue;

		const day = toDay(log.date);
		const prev = new Date(day);
		prev.setDate(prev.getDate() - 1);
		const prevDay = toDay(prev);

		const candidateFoods = [
			...(mealsByDay.get(day) ?? []),
			...(mealsByDay.get(prevDay) ?? []),
		];

		for (const symptom of symptoms) {
			const entry = buckets.get(symptom) ?? {
				occurrences: 0,
				foods: new Map<string, number>(),
				ratings: [],
			};
			entry.occurrences += 1;
			if (typeof log.digestionRating === "number") {
				entry.ratings.push(log.digestionRating);
			}
			for (const food of candidateFoods) {
				entry.foods.set(food, (entry.foods.get(food) ?? 0) + 1);
			}
			buckets.set(symptom, entry);
		}
	}

	return Array.from(buckets.entries())
		.map(([symptom, v]) => ({
			symptom,
			occurrences: v.occurrences,
			precedingFoods: Array.from(v.foods.entries())
				// Only foods present for more than one episode suggest a pattern.
				.filter(([, count]) => count > 1)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 4)
				.map(([name]) => name),
			avgDigestionRating:
				v.ratings.length > 0
					? round(v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length)
					: undefined,
		}))
		.sort((a, b) => b.occurrences - a.occurrences)
		.slice(0, 5);
}

export function buildNutritionSummary(args: {
	range: InsightRange;
	customWindow?: DateWindow;
	mealLogs: any[];
	gutHealthLogs: any[];
	hydrationLogs: any[];
	fastingLogs: any[];
	goals: {
		calories?: number;
		protein?: number;
		carbs?: number;
		fat?: number;
		water?: number;
	};
}): NutritionSummary {
	const {
		range,
		customWindow,
		mealLogs,
		gutHealthLogs,
		hydrationLogs,
		fastingLogs,
		goals,
	} = args;

	const window = resolveDateWindow(range, customWindow);
	const windowDays = countDays(window);

	const within = (d: Date | string) => {
		const day = toDay(d);
		return day >= window.start && day <= window.end;
	};

	const meals = mealLogs.filter((m) => within(m.date));
	const gutLogs = gutHealthLogs.filter((g) => within(g.date));
	const hydration = hydrationLogs.filter((h) => within(h.date));
	const fasts = fastingLogs.filter((f) => within(f.startTime));

	const dayTotals = new Map<
		string,
		MacroAverages & { water: number; meals: number }
	>();
	const mealsByDay = new Map<string, string[]>();
	const foodCounts = new Map<string, { count: number; homeCooked: boolean }>();
	const mealTypeBuckets = new Map<
		string,
		{ count: number; calories: number }
	>();

	let homeCookedCount = 0;

	for (const meal of meals) {
		const day = toDay(meal.date);
		const n = nutritionOf(meal);

		const totals = dayTotals.get(day) ?? {
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
			fiber: 0,
			sugar: 0,
			water: 0,
			meals: 0,
		};
		totals.calories += n.calories ?? 0;
		totals.protein += n.protein ?? 0;
		totals.carbs += n.carbs ?? 0;
		totals.fat += n.fat ?? 0;
		totals.fiber += n.fiber ?? 0;
		totals.sugar += n.sugar ?? 0;
		totals.meals += 1;
		dayTotals.set(day, totals);

		if (meal.isHomeCooked) homeCookedCount += 1;

		const names = foodNamesOf(meal);
		mealsByDay.set(day, [...(mealsByDay.get(day) ?? []), ...names]);
		for (const name of names) {
			const entry = foodCounts.get(name) ?? {
				count: 0,
				homeCooked: !!meal.isHomeCooked,
			};
			entry.count += 1;
			foodCounts.set(name, entry);
		}

		const mt = meal.mealType ?? "other";
		const bucket = mealTypeBuckets.get(mt) ?? { count: 0, calories: 0 };
		bucket.count += 1;
		bucket.calories += n.calories ?? 0;
		mealTypeBuckets.set(mt, bucket);
	}

	for (const log of hydration) {
		const day = toDay(log.date);
		const totals = dayTotals.get(day);
		if (totals) totals.water += log.amount ?? 0;
		else
			dayTotals.set(day, {
				calories: 0,
				protein: 0,
				carbs: 0,
				fat: 0,
				fiber: 0,
				sugar: 0,
				water: log.amount ?? 0,
				meals: 0,
			});
	}

	const days = Array.from(dayTotals.values());
	const loggedDays = days.filter((d) => d.meals > 0);
	const n = Math.max(1, loggedDays.length);

	const avg = (pick: (d: (typeof days)[number]) => number) =>
		round(loggedDays.reduce((s, d) => s + pick(d), 0) / n);

	const avgProtein = avg((d) => d.protein);
	const avgCarbs = avg((d) => d.carbs);
	const avgFat = avg((d) => d.fat);
	const macroTotal = avgProtein + avgCarbs + avgFat;

	const completedFasts = fasts.filter((f) => f.completed);
	const fastDurations = completedFasts
		.map((f) => f.actualHours ?? f.targetHours)
		.filter((h): h is number => typeof h === "number");

	const fastTypes = new Map<string, number>();
	for (const f of fasts) {
		const t = f.fastingType ?? f.type;
		if (t) fastTypes.set(t, (fastTypes.get(t) ?? 0) + 1);
	}

	const probiotics = new Set<string>();
	const digestionRatings: number[] = [];
	const energyLevels: number[] = [];
	const stoolTypes: number[] = [];
	for (const g of gutLogs) {
		(g.probioticFoods ?? []).forEach((f: string) => probiotics.add(f));
		if (typeof g.digestionRating === "number")
			digestionRatings.push(g.digestionRating);
		if (typeof g.energyLevel === "number") energyLevels.push(g.energyLevel);
		if (typeof g.stoolType === "number") stoolTypes.push(g.stoolType);
	}

	const mean = (arr: number[]) =>
		arr.length > 0
			? round(arr.reduce((s, v) => s + v, 0) / arr.length)
			: undefined;

	return {
		generatedAt: new Date().toISOString(),
		range,
		rangeLabel: describeWindow(range, window),
		periodStart: window.start,
		periodEnd: window.end,
		windowDays,
		goals,
		averages: {
			calories: avg((d) => d.calories),
			protein: avgProtein,
			carbs: avgCarbs,
			fat: avgFat,
			fiber: avg((d) => d.fiber),
			sugar: avg((d) => d.sugar),
			water: avg((d) => d.water),
			mealsPerDay: avg((d) => d.meals),
		},
		adherence: {
			daysLogged: loggedDays.length,
			loggingRate: round((loggedDays.length / windowDays) * 100),
			caloriePercentOfGoal: goals.calories
				? round((avg((d) => d.calories) / goals.calories) * 100)
				: 0,
			proteinPercentOfGoal: goals.protein
				? round((avgProtein / goals.protein) * 100)
				: 0,
			waterPercentOfGoal: goals.water
				? round((avg((d) => d.water) / goals.water) * 100)
				: 0,
			daysHittingProtein: goals.protein
				? loggedDays.filter((d) => d.protein >= (goals.protein ?? 0)).length
				: 0,
			daysOverCalories: goals.calories
				? loggedDays.filter((d) => d.calories > (goals.calories ?? 0)).length
				: 0,
		},
		macroSplit: {
			protein: macroTotal > 0 ? round((avgProtein / macroTotal) * 100) : 0,
			carbs: macroTotal > 0 ? round((avgCarbs / macroTotal) * 100) : 0,
			fat: macroTotal > 0 ? round((avgFat / macroTotal) * 100) : 0,
		},
		topFoods: Array.from(foodCounts.entries())
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, 10)
			.map(([name, v]) => ({
				name,
				timesEaten: v.count,
				isHomeCooked: v.homeCooked,
			})),
		homeCookedRate:
			meals.length > 0 ? round((homeCookedCount / meals.length) * 100) : 0,
		mealTimingPattern: Array.from(mealTypeBuckets.entries()).map(
			([mealType, v]) => ({
				mealType,
				count: v.count,
				avgCalories: round(v.calories / Math.max(1, v.count)),
			}),
		),
		gutHealth: {
			logsCount: gutLogs.length,
			avgDigestionRating: mean(digestionRatings),
			avgEnergyLevel: mean(energyLevels),
			avgStoolType: mean(stoolTypes),
			symptomLinks: buildSymptomLinks(gutLogs, mealsByDay),
			probioticFoods: Array.from(probiotics).slice(0, 8),
		},
		fasting: {
			completedFasts: completedFasts.length,
			avgDurationHours:
				fastDurations.length > 0
					? round(
							fastDurations.reduce((s, h) => s + h, 0) / fastDurations.length,
						)
					: 0,
			adherenceRate:
				fasts.length > 0
					? round((completedFasts.length / fasts.length) * 100)
					: 0,
			commonType: Array.from(fastTypes.entries()).sort(
				(a, b) => b[1] - a[1],
			)[0]?.[0],
		},
	};
}

const NUTRITION_SYSTEM_PROMPT = `You are a careful nutrition analyst. You produce structured JSON only.

You receive a JSON summary of one user's food, hydration, gut health and fasting covering "periodStart" to "periodEnd" inclusive, described by "rangeLabel" and spanning "windowDays" days. Analyse it deeply and return a single JSON object.

${SHARED_SCHEMA_RULES}

NUTRITION SPECIFICS:
- scoreBreakdown labels must be exactly: Consistency, Macros, Hydration, Gut Health.
- headlineMetrics: use calories, grams, millilitres or percentages. Never invent units.
- findings evidence must contain real food names from "topFoods" or "gutHealth.symptomLinks[].precedingFoods".
- breakdowns: build from "macroSplit" and "adherence". "label" is the macro or metric name, "value" its average, "share" its percentage.
- noteGroups: exactly two entries, titled "Gut Patterns" and "Fasting".
  - Gut Patterns: for each entry in "gutHealth.symptomLinks" that has non-empty "precedingFoods", state the symptom and the foods eaten before it. Empty notes array if there are no logs.
  - Fasting: comment on "fasting.completedFasts", "avgDurationHours" and "adherenceRate". Empty notes array if there is no fasting data.
- A food appearing in "precedingFoods" is a CORRELATION, not a cause. Always word it as "may be worth testing" or "often appears before", never as a diagnosis.
- Never claim one thing CAUSED another anywhere, including the headline. Say "is linked to" or "often appears alongside". The data only shows what happened together, not why.
- Never diagnose a medical condition, name a disease, or suggest stopping or starting medication. If the data looks concerning, say it is worth raising with a doctor.
- Compare "averages" against "goals" and say plainly which targets are being missed.
- If "adherence.loggingRate" is below 50, say the picture is incomplete because logging is patchy.`;

export async function getDeepNutritionAnalysis(
	summary: NutritionSummary,
): Promise<DeepAnalysisResult> {
	if (summary.adherence.daysLogged === 0) {
		return {
			ok: false,
			code: "no_data",
			message:
				"Log a few meals first — there is nothing to analyse in this period yet.",
		};
	}

	return runDeepAnalysis(NUTRITION_SYSTEM_PROMPT, summary);
}
