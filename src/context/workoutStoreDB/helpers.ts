/**
 * Workout Store Helper Functions
 */

export const objectToSnakeCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
	// Handle Date objects - convert to ISO string for database
	if (obj instanceof Date) return obj.toISOString();
	if (typeof obj !== "object") return obj;

	return Object.keys(obj).reduce((acc: any, key) => {
		const snakeKey = key.replace(
			/[A-Z]/g,
			(letter) => `_${letter.toLowerCase()}`,
		);
		acc[snakeKey] = objectToSnakeCase(obj[key]);
		return acc;
	}, {});
};

export const snakeToCamelCase = (str: string): string => {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const objectToCamelCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToCamelCase);
	if (typeof obj !== "object") return obj;

	return Object.keys(obj).reduce((acc: any, key) => {
		const camelKey = snakeToCamelCase(key);
		acc[camelKey] = objectToCamelCase(obj[key]);
		return acc;
	}, {});
};

/**
 * Workout rows live in Postgres columns typed `uuid` - workout_sessions.id,
 * personal_records.id, body_measurements.id and body_weights.id all are. The
 * old `${prefix}_${Date.now()}_${random}` scheme was rejected outright:
 *
 *     22P02  invalid input syntax for type uuid: "session_1788453315128_ovwol5qj3"
 *
 * Finance and study hit this and were fixed; workout was missed. Re-exported
 * from the one shared generator rather than being a fourth copy of it.
 */
export { generateUUID as generateId } from "../../utils/uuid";

const toTextArray = (v: unknown): string[] => {
	if (Array.isArray(v)) return v.map(String);
	if (typeof v === "string" && v.trim()) return [v];
	return [];
};

/**
 * Builds the `custom_exercises` insert payload.
 *
 * Ten of its columns are NOT NULL with no default - category, difficulty,
 * description and the five `text[]` columns among them - while every one of
 * them is optional on `CustomExercise`. A bare spread therefore omits whatever
 * the local object happens to lack and the whole write fails with a 23502.
 * The array columns are `text[]`, not jsonb, so they take arrays directly.
 */
export const customExerciseToDb = (exercise: any, userId: string) => {
	const primary = toTextArray(exercise.primaryMuscles);
	const target = toTextArray(exercise.targetMuscles);
	return {
		id: exercise.id,
		user_id: userId,
		name: exercise.name,
		category: exercise.category || "strength",
		difficulty: exercise.difficulty || "intermediate",
		description: exercise.description || "Custom exercise",
		primary_muscles: primary,
		secondary_muscles: toTextArray(exercise.secondaryMuscles),
		target_muscles: target.length ? target : primary,
		equipment: toTextArray(exercise.equipment),
		instructions: toTextArray(exercise.instructions),
		tips: toTextArray(exercise.tips),
		video_url: exercise.videoUrl ?? null,
		image_url: exercise.imageUrl ?? null,
		is_custom: true,
	};
};
