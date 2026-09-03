/**
 * Energy expenditure for a logged workout.
 *
 * Uses the standard MET (Metabolic Equivalent of Task) formula:
 *
 *     kcal/min = (MET x 3.5 x bodyWeightKg) / 200
 *
 * A MET is a multiple of resting metabolic rate, so this scales with body mass
 * and time - the two things that actually drive the number - rather than with
 * lifted volume. Volume is a poor proxy: a heavy low-rep set moves a lot of
 * weight in very little time and burns comparatively little.
 *
 * WHAT THIS IS NOT
 * This is an estimate, and a rough one. Real expenditure varies with training
 * status, rest length, ambient temperature and individual efficiency; published
 * MET values carry roughly +/-20-30% spread between people. It is useful for
 * comparing YOUR sessions against each other, not as an absolute measurement,
 * and it is not a basis for calculating an energy deficit. Without a body
 * weight there is nothing to scale by, so the estimate is refused rather than
 * guessed - see `estimateSessionCalories` returning undefined.
 */

import { getExerciseById } from "../data/exerciseDatabase";
import { ExerciseCategory, FitnessLevel } from "../types/workout";

/**
 * MET by exercise category, at moderate effort.
 *
 * Values follow the Compendium of Physical Activities (Ainsworth et al.):
 *   strength      3.5  - "resistance training, multiple exercises, 8-15 reps"
 *   calisthenics  3.8  - "home exercise, light/moderate effort"
 *   flexibility   2.3  - "stretching, mild"
 *   cardio        7.0  - "general, moderate effort"
 *   hiit          8.0  - "vigorous, circuit training with minimal rest"
 *   plyometrics   8.0  - "jumping, vigorous"
 */
const CATEGORY_MET: Record<ExerciseCategory, number> = {
	strength: 3.5,
	calisthenics: 3.8,
	flexibility: 2.3,
	cardio: 7.0,
	hiit: 8.0,
	plyometrics: 8.0,
};

/**
 * Trained people work at a higher absolute intensity for the same movement.
 * Deliberately a small adjustment - it is a nudge, not a multiplier that would
 * swamp the category difference.
 */
const LEVEL_FACTOR: Record<FitnessLevel, number> = {
	beginner: 0.9,
	intermediate: 1.0,
	advanced: 1.1,
	athlete: 1.15,
};

/** kcal burned at a given MET, for a body weight, over a duration. */
export const caloriesFromMet = (
	met: number,
	weightKg: number,
	minutes: number
): number => (met * 3.5 * weightKg) / 200 * minutes;

export interface SessionForCalories {
	/** Minutes. Wall-clock session length, rest included. */
	duration?: number;
	/** A logged session stores only the exercise id, not its category. */
	exercises?: { exerciseId?: string }[];
}

/**
 * Blended MET for a session: the mean of its exercises' categories.
 *
 * A session that is half stretching and half cardio should not be charged at
 * the cardio rate. Custom exercises are not in the database and simply do not
 * contribute; with no recognised exercise at all, `strength` is assumed, since
 * that is what the great majority of logged sessions are.
 */
export const sessionMet = (
	exercises: { exerciseId?: string }[] | undefined
): number => {
	const mets = (exercises || [])
		.map((e) => {
			const category = e.exerciseId
				? getExerciseById(e.exerciseId)?.category
				: undefined;
			return category ? CATEGORY_MET[category] : undefined;
		})
		.filter((m): m is number => typeof m === "number");

	if (mets.length === 0) return CATEGORY_MET.strength;
	return mets.reduce((a, b) => a + b, 0) / mets.length;
};

/**
 * Estimated kcal for a finished session, rounded to a whole number.
 *
 * Returns `undefined` when it cannot be computed - no body weight, or a session
 * with no measurable duration. Callers must show "-" for that rather than 0: a
 * zero reads as "you burned nothing", which is a different and wrong claim.
 */
export const estimateSessionCalories = (
	session: SessionForCalories,
	weightKg: number | undefined,
	fitnessLevel: FitnessLevel = "intermediate"
): number | undefined => {
	if (!weightKg || weightKg <= 0) return undefined;

	const minutes = session.duration;
	if (!minutes || minutes <= 0) return undefined;

	// A stray clock or a session left running overnight should not produce a
	// five-figure number. Eight hours is well past any real single workout.
	const cappedMinutes = Math.min(minutes, 480);

	const met = sessionMet(session.exercises) * (LEVEL_FACTOR[fitnessLevel] ?? 1);
	return Math.round(caloriesFromMet(met, weightKg, cappedMinutes));
};
