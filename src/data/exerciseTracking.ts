// How each exercise is measured, and helpers built on it.
//
// A WorkoutSet has always been able to hold reps, weight, duration (seconds)
// and distance (km), but every screen only ever showed weight x reps, so a
// plank or a run had nowhere to record its real result. The tracking type
// decides which of those fields a set uses, everywhere: the plan editor, the
// active workout, history and statistics.
//
// Sets are stored as JSON inside the session/plan, so no migration is needed;
// old sessions simply have reps/weight and still render.

import type { Exercise, WorkoutExercise, WorkoutSet } from "@/src/types/workout";
import { getExerciseById } from "./exerciseDatabase";

export type TrackingType =
	| "weight_reps" // bench press: kg x reps
	| "reps" // push-ups, tibialis raises: bodyweight reps
	| "time" // plank, stretches, yoga holds: seconds
	| "distance_time"; // running, cycling: km + time

export type SetField = "weight" | "reps" | "duration" | "distance";

export const TRACKING_FIELDS: Record<TrackingType, SetField[]> = {
	weight_reps: ["weight", "reps"],
	reps: ["reps"],
	time: ["duration"],
	distance_time: ["distance", "duration"],
};

export const FIELD_LABEL: Record<SetField, string> = {
	weight: "KG",
	reps: "REPS",
	duration: "TIME",
	distance: "KM",
};

export const TRACKING_LABEL: Record<TrackingType, string> = {
	weight_reps: "Weight × reps",
	reps: "Reps",
	time: "Time",
	distance_time: "Distance & time",
};

// Everything not listed is weight x reps (or falls back by category below).
const TRACKING_BY_ID: Record<string, TrackingType> = {
	// Cardio with a distance
	ex_running: "distance_time",
	ex_cycling: "distance_time",
	ex_rowing: "distance_time",
	ex_swimming: "distance_time",
	ex_walking: "distance_time",
	ex_walking_rehab: "distance_time",
	ex_elliptical: "distance_time",

	// Timed cardio / drills
	ex_jump_rope: "time",
	ex_battle_ropes: "time",
	ex_high_knees: "time",
	ex_jumping_jacks: "time",
	ex_mountain_climbers: "time",
	ex_skipping: "time",
	ex_sprint_intervals: "time",
	ex_stair_climbing: "time",
	ex_a_skip: "time",

	// Holds
	ex_plank: "time",
	ex_copenhagen_plank: "time",
	ex_single_leg_balance: "time",

	// Yoga poses (held)
	ex_downward_dog: "time",
	ex_warrior_one: "time",
	ex_warrior_two: "time",
	ex_tree_pose: "time",
	ex_childs_pose: "time",
	ex_cobra_pose: "time",
	ex_pigeon_pose: "time",
	ex_seated_forward_fold: "time",
	ex_bridge_pose: "time",
	ex_triangle_pose: "time",
	ex_corpse_pose: "time",

	// Rehab positions and stretches (held)
	ex_prone_lying: "time",
	ex_prone_on_elbows: "time",
	ex_single_knee_to_chest: "time",
	ex_double_knee_to_chest: "time",
	ex_piriformis_stretch: "time",
	ex_kneeling_hip_flexor_stretch: "time",
	ex_supine_hamstring_stretch_strap: "time",
	ex_standing_calf_stretch: "time",
	ex_plantar_fascia_stretch: "time",
	ex_foot_roll: "time",

	// Bodyweight reps
	ex_pushups: "reps",
	ex_pullups: "reps",
	ex_crunches: "reps",
	ex_hanging_leg_raise: "reps",
	ex_burpees: "reps",
	ex_box_jumps: "reps",
	ex_cat_cow: "reps",
	ex_sun_salutation: "reps",
	ex_prone_press_up: "reps",
	ex_standing_extension: "reps",
	ex_pelvic_tilt: "reps",
	// McGill Big 3: reps of ~10-second holds (descending 6/4/2 pyramid)
	ex_mcgill_curl_up: "reps",
	ex_side_plank_modified: "reps",
	ex_bird_dog: "reps",
	ex_dead_bug: "reps",
	ex_sciatic_nerve_glide_supine: "reps",
	ex_sciatic_nerve_glide_seated: "reps",
	ex_glute_bridge: "reps",
	ex_clamshell: "reps",
	ex_tibialis_raise: "reps",
	ex_bent_knee_calf_raise: "reps",
	ex_eccentric_heel_drop: "reps",
	ex_lateral_band_walk: "reps",
	ex_pogo_hops: "reps",
	ex_ankle_knee_to_wall: "reps",
	ex_leg_swings: "reps",
	ex_short_foot: "reps",
	ex_towel_scrunch: "reps",
	ex_marble_pickup: "reps",
	ex_toe_yoga: "reps",
	ex_toe_splay: "reps",
	ex_heel_raise_ball: "reps",
	ex_banded_inversion: "reps",
};

const byCategory = (category?: Exercise["category"]): TrackingType =>
	category === "cardio" || category === "flexibility"
		? "time"
		: category === "calisthenics" || category === "plyometrics"
			? "reps"
			: "weight_reps";

/** Tracking type for an exercise id (library, or custom via its category). */
export function getTracking(
	exerciseId: string,
	category?: Exercise["category"],
): TrackingType {
	const known = TRACKING_BY_ID[exerciseId];
	if (known) return known;
	return byCategory(category ?? getExerciseById(exerciseId)?.category);
}

/**
 * Tracking type for an exercise inside a workout or plan.
 *
 * With `fromData`, used for SAVED history: sessions logged before tracking
 * types existed hold reps/weight even on what is now a timed exercise, so if
 * the sets have nothing in the current type's fields, describe them by what
 * they actually contain rather than rendering "0s".
 */
export function getExerciseTracking(
	ex: WorkoutExercise,
	fromData = false,
): TrackingType {
	const tracking = getTracking(ex.exerciseId);
	if (!fromData) return tracking;
	const hasData = ex.sets.some((s) =>
		TRACKING_FIELDS[tracking].some((f) => (s[f] ?? 0) > 0),
	);
	if (hasData) return tracking;
	if (ex.sets.some((s) => (s.duration ?? 0) > 0))
		return ex.sets.some((s) => (s.distance ?? 0) > 0) ? "distance_time" : "time";
	if (ex.sets.some((s) => (s.weight ?? 0) > 0)) return "weight_reps";
	if (ex.sets.some((s) => (s.reps ?? 0) > 0)) return "reps";
	return tracking;
}

const DEFAULTS: Record<TrackingType, Partial<WorkoutSet>> = {
	weight_reps: { reps: 10, weight: 0 },
	reps: { reps: 10 },
	time: { duration: 30 },
	distance_time: { distance: 0, duration: 0 },
};

const DEFAULT_SET_COUNT: Record<TrackingType, number> = {
	weight_reps: 3,
	reps: 3,
	time: 3,
	distance_time: 1,
};

/** Fresh sets for an exercise newly added to a plan or workout. */
export function defaultSets(
	tracking: TrackingType,
	count = DEFAULT_SET_COUNT[tracking],
	idPrefix = "",
): WorkoutSet[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `${idPrefix}${i + 1}`,
		setNumber: i + 1,
		...DEFAULTS[tracking],
		completed: false,
		isWarmup: false,
		isDropset: false,
	}));
}

/** Values for a new set appended after `last`, keeping its numbers. */
export function nextSetValues(
	tracking: TrackingType,
	last?: WorkoutSet,
): Partial<WorkoutSet> {
	if (!last) return { ...DEFAULTS[tracking] };
	const out: Partial<WorkoutSet> = {};
	for (const f of TRACKING_FIELDS[tracking]) out[f] = last[f] ?? DEFAULTS[tracking][f];
	return out;
}

// ---------- formatting ----------

/** 75 -> "1:15", 3725 -> "1:02:05", 30 -> "0:30". */
export function formatDuration(seconds?: number | null): string {
	const s = Math.max(0, Math.round(seconds ?? 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Friendly long form: 45 -> "45s", 90 -> "1m 30s", 3600 -> "1h". */
export function formatDurationShort(seconds?: number | null): string {
	const s = Math.max(0, Math.round(seconds ?? 0));
	if (s < 60) return `${s}s`;
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return [h && `${h}h`, m && `${m}m`, sec && `${sec}s`].filter(Boolean).join(" ");
}

/**
 * Parses what people type into a time box: "45" (seconds), "1:30",
 * "1:02:05", "2m", "1m30s", "1.5m". Returns null for garbage.
 */
export function parseDuration(input: string): number | null {
	const t = input.trim().toLowerCase();
	if (!t) return 0;
	if (/^\d+(:\d{1,2}){1,2}$/.test(t))
		return t.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
	const unit = t.match(/^(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+(?:\.\d+)?)m)?\s*(?:(\d+(?:\.\d+)?)s)?$/);
	if (unit && (unit[1] || unit[2] || unit[3]))
		return Math.round(
			Number(unit[1] || 0) * 3600 + Number(unit[2] || 0) * 60 + Number(unit[3] || 0),
		);
	if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
	return null;
}

/** min/km pace, e.g. "5:42 /km"; null without both values. */
export function formatPace(distanceKm?: number, seconds?: number): string | null {
	if (!distanceKm || !seconds) return null;
	return `${formatDuration(seconds / distanceKm)} /km`;
}

/** One set as text: "60 kg × 8", "12 reps", "45s", "5 km · 28:30". */
export function formatSet(set: WorkoutSet, tracking: TrackingType): string {
	switch (tracking) {
		case "weight_reps":
			return set.weight ? `${set.weight} kg × ${set.reps ?? 0}` : `${set.reps ?? 0} reps`;
		case "reps":
			return `${set.reps ?? 0} reps`;
		case "time":
			return formatDurationShort(set.duration);
		case "distance_time":
			return [set.distance ? `${set.distance} km` : null, set.duration ? formatDuration(set.duration) : null]
				.filter(Boolean)
				.join(" · ") || "—";
	}
}

/** Totals for completed sets of one exercise. */
export function summarizeSets(ex: WorkoutExercise) {
	const done = ex.sets.filter((s) => s.completed);
	return {
		sets: done.length,
		reps: done.reduce((n, s) => n + (s.reps || 0), 0),
		volume: done.reduce((n, s) => n + (s.weight || 0) * (s.reps || 0), 0),
		seconds: done.reduce((n, s) => n + (s.duration || 0), 0),
		distance: done.reduce((n, s) => n + (s.distance || 0), 0),
		bestHold: done.reduce((n, s) => Math.max(n, s.duration || 0), 0),
	};
}

/** "3 × 45s", "5 km · 28:30", "60 kg × 8, 8, 6" - a compact exercise line. */
export function summarizeExercise(ex: WorkoutExercise): string {
	const tracking = getExerciseTracking(ex, true);
	const done = ex.sets.filter((s) => s.completed);
	const sets = done.length ? done : ex.sets;
	if (!sets.length) return "";
	if (tracking === "distance_time") {
		const t = summarizeSets({ ...ex, sets: sets.map((s) => ({ ...s, completed: true })) });
		const pace = formatPace(t.distance, t.seconds);
		return [t.distance ? `${+t.distance.toFixed(2)} km` : null, t.seconds ? formatDuration(t.seconds) : null, pace]
			.filter(Boolean)
			.join(" · ");
	}
	const values = sets.map((s) => formatSet(s, tracking));
	const allSame = values.every((v) => v === values[0]);
	return allSame ? `${sets.length} × ${values[0]}` : values.join(", ");
}
