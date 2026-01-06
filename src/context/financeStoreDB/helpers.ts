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

export const generateId = () =>
	Date.now().toString(36) + Math.random().toString(36).substr(2);
