/** Groq-backed deep analysis for the Workout (Fitzone) module. */

import type {
	BodyMeasurement,
	BodyWeight,
	FitnessProfile,
	PersonalRecord,
	WorkoutSession,
} from "@/src/context/workoutStoreDB/types";
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

const MEASUREMENT_SITES = [
	"chest",
	"waist",
	"hips",
	"arms",
	"thighs",
	"shoulders",
	"neck",
] as const;

type MeasurementSite = (typeof MEASUREMENT_SITES)[number];

export interface MuscleVolume {
	muscle: string;
	sets: number;
	volume: number;
	share: number;
	/** Days since this muscle was last trained, or null if never. */
	daysSinceWorked: number | null;
	topExercises: string[];
}

export interface ExerciseSummary {
	name: string;
	sessions: number;
	totalSets: number;
	totalVolume: number;
	bestWeight?: number;
	estimatedOneRepMax?: number;
	/** Positive means the top set weight rose across the window. */
	weightChange?: number;
}

export interface WeeklyLoad {
	weekStart: string;
	workouts: number;
	volume: number;
	durationMinutes: number;
}

export interface WorkoutSummary {
	generatedAt: string;
	range: InsightRange;
	rangeLabel: string;
	periodStart: string;
	periodEnd: string;
	windowDays: number;
	profile: {
		fitnessLevel?: string;
		goals?: string[];
		weeklyWorkoutGoal?: number;
		weightUnit: string;
		injuries?: string[];
		currentWeight?: number;
		targetWeight?: number;
	};
	totals: {
		workouts: number;
		completedWorkouts: number;
		totalVolume: number;
		totalDurationMinutes: number;
		avgDurationMinutes: number;
		avgWorkoutsPerWeek: number;
		weeklyGoalHitRate: number;
		currentStreak: number;
		longestRestGapDays: number;
		avgMood?: number;
		avgEnergy?: number;
	};
	muscleBalance: MuscleVolume[];
	/** Muscle groups with zero sets in the window. */
	neglectedMuscles: string[];
	topExercises: ExerciseSummary[];
	weeklyLoad: WeeklyLoad[];
	recentPRs: {
		exercise: string;
		type: string;
		value: number;
		previousValue?: number;
		date: string;
	}[];
	bodyWeightTrend: {
		start?: number;
		latest?: number;
		change?: number;
		unit: string;
	};
	bodyComposition: {
		measurementCount: number;
		unit?: string;
		/** Site-by-site change across the window. */
		changes: {
			site: string;
			start: number;
			latest: number;
			change: number;
		}[];
		bodyFatChange?: number;
		latestBodyFat?: number;
		/** Above ~0.9 (men) or ~0.85 (women) is commonly flagged as worth watching. */
		waistToHipRatio?: number;
		daysSinceLastMeasured?: number;
	};
}

const ALL_MUSCLES = [
	"chest",
	"back",
	"shoulders",
	"biceps",
	"triceps",
	"abs",
	"quadriceps",
	"hamstrings",
	"glutes",
	"calves",
];

const toISODateLocal = (d: Date) => {
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return local.toISOString().slice(0, 10);
};

const toDateString = (d: Date | string): string =>
	typeof d === "string" ? d.slice(0, 10) : toISODateLocal(d);

function weekStartOf(dateStr: string): string {
	const d = new Date(dateStr);
	d.setDate(d.getDate() - d.getDay());
	return d.toISOString().slice(0, 10);
}

/** Epley formula — a comparable strength number across differing rep counts. */
function oneRepMax(weight: number, reps: number): number {
	if (reps <= 1) return weight;
	return round(weight * (1 + reps / 30));
}

/**
 * Aggregates before serialising. Sessions nest exercises then sets, so passing
 * raw sessions through would blow the prompt budget within a couple of weeks
 * of training.
 */
export function buildWorkoutSummary(args: {
	range: InsightRange;
	customWindow?: DateWindow;
	sessions: WorkoutSession[];
	personalRecords: PersonalRecord[];
	bodyWeights: BodyWeight[];
	bodyMeasurements?: BodyMeasurement[];
	profile: FitnessProfile | null;
}): WorkoutSummary {
	const {
		range,
		customWindow,
		sessions,
		personalRecords,
		bodyWeights,
		bodyMeasurements = [],
		profile,
	} = args;

	const window = resolveDateWindow(range, customWindow);
	const windowDays = countDays(window);
	const today = new Date();

	const inWindow = sessions
		.filter((s) => {
			const d = toDateString(s.date);
			return d >= window.start && d <= window.end;
		})
		.sort((a, b) => toDateString(a.date).localeCompare(toDateString(b.date)));

	const muscleBuckets = new Map<
		string,
		{
			sets: number;
			volume: number;
			lastDate: string;
			exercises: Map<string, number>;
		}
	>();
	const exerciseBuckets = new Map<
		string,
		{
			sessions: Set<string>;
			sets: number;
			volume: number;
			bestWeight: number;
			bestOrm: number;
			firstTopWeight?: number;
			lastTopWeight?: number;
		}
	>();
	const weekBuckets = new Map<
		string,
		{ workouts: number; volume: number; duration: number }
	>();

	let totalVolume = 0;
	let totalDuration = 0;
	const moods: number[] = [];
	const energies: number[] = [];

	for (const session of inWindow) {
		const dateStr = toDateString(session.date);
		totalDuration += session.duration ?? 0;
		if (typeof session.mood === "number") moods.push(session.mood);
		if (typeof session.energyLevel === "number")
			energies.push(session.energyLevel);

		const week = weekStartOf(dateStr);
		const wk = weekBuckets.get(week) ?? {
			workouts: 0,
			volume: 0,
			duration: 0,
		};
		wk.workouts += 1;
		wk.duration += session.duration ?? 0;

		let sessionVolume = 0;

		for (const exercise of session.exercises ?? []) {
			const completedSets = (exercise.sets ?? []).filter((s) => s.completed);
			if (completedSets.length === 0) continue;

			const volume = completedSets.reduce(
				(sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
				0,
			);
			sessionVolume += volume;

			const topSet = completedSets.reduce(
				(best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best),
				completedSets[0],
			);

			const ex = exerciseBuckets.get(exercise.exerciseName) ?? {
				sessions: new Set<string>(),
				sets: 0,
				volume: 0,
				bestWeight: 0,
				bestOrm: 0,
			};
			ex.sessions.add(session.id);
			ex.sets += completedSets.length;
			ex.volume += volume;
			ex.bestWeight = Math.max(ex.bestWeight, topSet.weight ?? 0);
			ex.bestOrm = Math.max(
				ex.bestOrm,
				oneRepMax(topSet.weight ?? 0, topSet.reps ?? 0),
			);
			if (ex.firstTopWeight === undefined) ex.firstTopWeight = topSet.weight;
			ex.lastTopWeight = topSet.weight;
			exerciseBuckets.set(exercise.exerciseName, ex);

			const muscles =
				exercise.targetMuscles?.length > 0
					? exercise.targetMuscles
					: exercise.muscleGroup
						? [exercise.muscleGroup]
						: [];

			for (const muscle of muscles) {
				const mb = muscleBuckets.get(muscle) ?? {
					sets: 0,
					volume: 0,
					lastDate: dateStr,
					exercises: new Map<string, number>(),
				};
				mb.sets += completedSets.length;
				mb.volume += volume;
				if (dateStr > mb.lastDate) mb.lastDate = dateStr;
				mb.exercises.set(
					exercise.exerciseName,
					(mb.exercises.get(exercise.exerciseName) ?? 0) + volume,
				);
				muscleBuckets.set(muscle, mb);
			}
		}

		totalVolume += sessionVolume;
		wk.volume += sessionVolume;
		weekBuckets.set(week, wk);
	}

	const volumeAcrossMuscles = Array.from(muscleBuckets.values()).reduce(
		(sum, m) => sum + m.volume,
		0,
	);

	// Longest run of consecutive days with no session.
	const workoutDates = new Set(inWindow.map((s) => toDateString(s.date)));
	let longestGap = 0;
	let runningGap = 0;
	for (let i = 0; i < windowDays; i++) {
		const d = new Date(window.start);
		d.setDate(d.getDate() + i);
		if (workoutDates.has(d.toISOString().slice(0, 10))) {
			runningGap = 0;
		} else {
			runningGap += 1;
			longestGap = Math.max(longestGap, runningGap);
		}
	}

	// Consecutive days trained up to today; yesterday still counts as live.
	let currentStreak = 0;
	for (let i = 0; i < windowDays; i++) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const key = toISODateLocal(d);
		if (workoutDates.has(key)) {
			currentStreak += 1;
		} else if (i > 0) {
			break;
		}
	}

	const weeks = Math.max(1, windowDays / 7);
	const weeklyGoal = profile?.weeklyWorkoutGoal ?? 0;
	const weeksHittingGoal =
		weeklyGoal > 0
			? Array.from(weekBuckets.values()).filter((w) => w.workouts >= weeklyGoal)
					.length
			: 0;

	const sortedWeights = [...bodyWeights]
		.filter((w) => w.date >= window.start && w.date <= window.end)
		.sort((a, b) => a.date.localeCompare(b.date));

	const sortedMeasurements = [...bodyMeasurements]
		.filter((m) => {
			const d = toDateString(m.date);
			return d >= window.start && d <= window.end;
		})
		.sort((a, b) => toDateString(a.date).localeCompare(toDateString(b.date)));

	const firstM = sortedMeasurements[0];
	const lastM = sortedMeasurements[sortedMeasurements.length - 1];

	const siteValue = (m: BodyMeasurement, site: MeasurementSite) => m[site];

	const measurementChanges =
		firstM && lastM && firstM !== lastM
			? MEASUREMENT_SITES.flatMap((site) => {
					const start = siteValue(firstM, site);
					const latest = siteValue(lastM, site);
					if (typeof start !== "number" || typeof latest !== "number")
						return [];
					return [
						{
							site,
							start: round(start),
							latest: round(latest),
							change: round(latest - start),
						},
					];
				})
			: [];

	const latestBodyFat = lastM?.bodyFat ?? lastM?.bodyFatPercentage;
	const firstBodyFat = firstM?.bodyFat ?? firstM?.bodyFatPercentage;

	return {
		generatedAt: new Date().toISOString(),
		range,
		rangeLabel: describeWindow(range, window),
		periodStart: window.start,
		periodEnd: window.end,
		windowDays,
		profile: {
			fitnessLevel: profile?.fitnessLevel,
			goals: profile?.goals,
			weeklyWorkoutGoal: profile?.weeklyWorkoutGoal,
			weightUnit: profile?.weightUnit ?? "kg",
			injuries: profile?.injuries,
			currentWeight: profile?.weight,
			targetWeight: profile?.targetWeight,
		},
		totals: {
			workouts: inWindow.length,
			completedWorkouts: inWindow.filter((s) => s.isCompleted).length,
			totalVolume: round(totalVolume),
			totalDurationMinutes: round(totalDuration),
			avgDurationMinutes:
				inWindow.length > 0 ? round(totalDuration / inWindow.length) : 0,
			avgWorkoutsPerWeek: round(inWindow.length / weeks),
			weeklyGoalHitRate:
				weekBuckets.size > 0 && weeklyGoal > 0
					? round((weeksHittingGoal / weekBuckets.size) * 100)
					: 0,
			currentStreak,
			longestRestGapDays: longestGap,
			avgMood:
				moods.length > 0
					? round(moods.reduce((s, m) => s + m, 0) / moods.length)
					: undefined,
			avgEnergy:
				energies.length > 0
					? round(energies.reduce((s, e) => s + e, 0) / energies.length)
					: undefined,
		},
		muscleBalance: Array.from(muscleBuckets.entries())
			.map(([muscle, v]) => ({
				muscle,
				sets: v.sets,
				volume: round(v.volume),
				share:
					volumeAcrossMuscles > 0
						? round((v.volume / volumeAcrossMuscles) * 100)
						: 0,
				daysSinceWorked: Math.floor(
					(today.getTime() - new Date(v.lastDate).getTime()) / 86400000,
				),
				topExercises: Array.from(v.exercises.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, 3)
					.map(([name]) => name),
			}))
			.sort((a, b) => b.volume - a.volume),
		neglectedMuscles: ALL_MUSCLES.filter((m) => !muscleBuckets.has(m)),
		topExercises: Array.from(exerciseBuckets.entries())
			.map(([name, v]) => ({
				name,
				sessions: v.sessions.size,
				totalSets: v.sets,
				totalVolume: round(v.volume),
				bestWeight: v.bestWeight > 0 ? round(v.bestWeight) : undefined,
				estimatedOneRepMax: v.bestOrm > 0 ? round(v.bestOrm) : undefined,
				weightChange:
					v.firstTopWeight !== undefined && v.lastTopWeight !== undefined
						? round(v.lastTopWeight - v.firstTopWeight)
						: undefined,
			}))
			.sort((a, b) => b.totalVolume - a.totalVolume)
			.slice(0, 8),
		weeklyLoad: Array.from(weekBuckets.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([weekStart, v]) => ({
				weekStart,
				workouts: v.workouts,
				volume: round(v.volume),
				durationMinutes: round(v.duration),
			})),
		recentPRs: [...personalRecords]
			.filter((pr) => {
				const d = toDateString(pr.date);
				return d >= window.start && d <= window.end;
			})
			.sort((a, b) => toDateString(b.date).localeCompare(toDateString(a.date)))
			.slice(0, 8)
			.map((pr) => ({
				exercise: pr.exerciseName,
				type: pr.type,
				value: round(pr.value),
				previousValue:
					typeof pr.previousValue === "number"
						? round(pr.previousValue)
						: undefined,
				date: toDateString(pr.date),
			})),
		bodyWeightTrend: {
			start: sortedWeights[0]?.weight,
			latest: sortedWeights[sortedWeights.length - 1]?.weight,
			change:
				sortedWeights.length > 1
					? round(
							sortedWeights[sortedWeights.length - 1].weight -
								sortedWeights[0].weight,
						)
					: undefined,
			unit: profile?.weightUnit ?? "kg",
		},
		bodyComposition: {
			measurementCount: sortedMeasurements.length,
			unit: lastM?.unit,
			changes: measurementChanges,
			latestBodyFat:
				typeof latestBodyFat === "number" ? round(latestBodyFat) : undefined,
			bodyFatChange:
				typeof latestBodyFat === "number" && typeof firstBodyFat === "number"
					? round(latestBodyFat - firstBodyFat)
					: undefined,
			waistToHipRatio:
				typeof lastM?.waist === "number" &&
				typeof lastM?.hips === "number" &&
				lastM.hips > 0
					? round(lastM.waist / lastM.hips)
					: undefined,
			daysSinceLastMeasured: lastM
				? Math.floor(
						(today.getTime() - new Date(toDateString(lastM.date)).getTime()) /
							86400000,
					)
				: undefined,
		},
	};
}

const WORKOUT_SYSTEM_PROMPT = `You are a rigorous strength and conditioning coach. You produce structured JSON only.

You receive a JSON summary of one user's training covering "periodStart" to "periodEnd" inclusive, described by "rangeLabel" and spanning "windowDays" days. Analyse it deeply and return a single JSON object.

${SHARED_SCHEMA_RULES}

TRAINING SPECIFICS:
- scoreBreakdown labels must be exactly: Consistency, Volume, Balance, Progression.
- headlineMetrics: express values as workout counts, volume with the unit from "profile.weightUnit", minutes or percentages.
- findings evidence must contain real exercise or muscle names from "topExercises", "muscleBalance" or "recentPRs".
- breakdowns: one per entry in "muscleBalance", up to 6, highest volume first. "label" is the muscle, "value" its volume, "share" its share, "namedItems" its topExercises.
- noteGroups: exactly two entries, titled "Muscle Balance" and "Progress".
  - Muscle Balance: name every muscle in "neglectedMuscles" that was never trained, and any in "muscleBalance" with "daysSinceWorked" over 10. Empty notes array if coverage is even.
  - Progress: cite entries from "recentPRs" by exercise name, and any "topExercises" with a positive "weightChange". Mention a negative "weightChange" as a stall. Empty notes array if there is nothing to report.
- BODY COMPOSITION: read "bodyComposition". Name the sites in "changes" that moved most and pair them with "bodyWeightTrend.change" — waist down while weight holds means recomposition, not stalling. Mention "latestBodyFat" and "bodyFatChange" when present.
- Treat "waistToHipRatio" as a general wellbeing marker only. Never diagnose a condition or name a disease; if it looks high, say it is worth raising with a doctor.
- If "bodyComposition.daysSinceLastMeasured" is over 30, or "measurementCount" is under 2, say the body data is too sparse to read a trend.
- Compare "totals.avgWorkoutsPerWeek" against "profile.weeklyWorkoutGoal" and say plainly whether the goal is being met.
- If "profile.injuries" is non-empty, avoid recommending anything that loads the injured area, and say why.
- Tie advice to "profile.goals" when present — a muscle-building goal and a weight-loss goal need different guidance.
- Flag "totals.longestRestGapDays" above 7 as a consistency problem.
- "estimatedSaving" on actions means extra workouts per month if the action is followed. Omit it when you cannot ground it in the data.`;

export async function getDeepWorkoutAnalysis(
	summary: WorkoutSummary,
): Promise<DeepAnalysisResult> {
	if (summary.totals.workouts === 0) {
		return {
			ok: false,
			code: "no_data",
			message:
				"Log a few workouts first — there is nothing to analyse in this period yet.",
		};
	}

	return runDeepAnalysis(WORKOUT_SYSTEM_PROMPT, summary);
}
