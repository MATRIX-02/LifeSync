/**
 * Finance Store Helper Functions
 */

export const objectToSnakeCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
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

// Finance rows live in Postgres columns typed `uuid`, so ids must be real UUIDs.
export const generateId = () =>
	"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
