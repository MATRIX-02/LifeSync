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
			(letter) => `_${letter.toLowerCase()}`
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
