/**
 * Study Store Helper Functions
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

// Generate proper UUID v4
export const generateId = (): string => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

/**
 * Calculate next review date based on spaced repetition
 * Uses a simplified SM-2 algorithm
 */
export const calculateNextReviewDate = (
	currentLevel: number,
	wasCorrect: boolean,
	easeFactor: number = 2.5
): { nextLevel: number; nextDate: Date; newEaseFactor: number } => {
	const INTERVALS = [0, 1, 3, 7, 14, 30];

	let nextLevel = currentLevel;
	let newEaseFactor = easeFactor;

	if (wasCorrect) {
		nextLevel = Math.min(currentLevel + 1, 5);
		newEaseFactor = Math.max(1.3, easeFactor + 0.1);
	} else {
		nextLevel = Math.max(0, currentLevel - 2);
		newEaseFactor = Math.max(1.3, easeFactor - 0.2);
	}

	const interval = INTERVALS[nextLevel] * newEaseFactor;
	const nextDate = new Date();
	nextDate.setDate(nextDate.getDate() + Math.round(interval));

	return { nextLevel, nextDate, newEaseFactor };
};

/**
 * Format duration in minutes to human readable string
 */
export const formatDuration = (minutes: number): string => {
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Calculate study streak
 */
export const calculateStreak = (
	sessions: { startTime: string }[],
	lastStudyDate: string
): { currentStreak: number; longestStreak: number } => {
	if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

	// Get unique study dates
	const studyDates = [
		...new Set(sessions.map((s) => new Date(s.startTime).toDateString())),
	].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

	const today = new Date().toDateString();
	const yesterday = new Date(Date.now() - 86400000).toDateString();

	// Check if current streak is still active
	let currentStreak = 0;
	if (studyDates[0] === today || studyDates[0] === yesterday) {
		currentStreak = 1;
		for (let i = 1; i < studyDates.length; i++) {
			const current = new Date(studyDates[i - 1]);
			const prev = new Date(studyDates[i]);
			const diff = (current.getTime() - prev.getTime()) / 86400000;
			if (diff === 1) {
				currentStreak++;
			} else {
				break;
			}
		}
	}

	// Calculate longest streak
	let longestStreak = 1;
	let tempStreak = 1;
	for (let i = 1; i < studyDates.length; i++) {
		const current = new Date(studyDates[i - 1]);
		const prev = new Date(studyDates[i]);
		const diff = (current.getTime() - prev.getTime()) / 86400000;
		if (diff === 1) {
			tempStreak++;
			longestStreak = Math.max(longestStreak, tempStreak);
		} else {
			tempStreak = 1;
		}
	}

	return { currentStreak, longestStreak };
};

/**
 * Get cards due for review
 */
export const getCardsDueForReview = (
	cards: { nextReviewAt?: string; status: string }[]
): number => {
	const now = new Date();
	return cards.filter((card) => {
		if (card.status === "mastered") return false;
		if (!card.nextReviewAt) return true;
		return new Date(card.nextReviewAt) <= now;
	}).length;
};

/**
 * Calculate goal progress based on multiple factors
 */
export const calculateGoalProgress = (
	goal: {
		totalHoursTarget?: number;
		totalHoursSpent: number;
		targetDate?: string;
	},
	subjectsProgress: number[]
): number => {
	const weights = { time: 0.4, subjects: 0.6 };

	// Time-based progress
	let timeProgress = 0;
	if (goal.totalHoursTarget && goal.totalHoursTarget > 0) {
		timeProgress = Math.min(
			100,
			(goal.totalHoursSpent / goal.totalHoursTarget) * 100
		);
	}

	// Subject-based progress
	const avgSubjectProgress =
		subjectsProgress.length > 0
			? subjectsProgress.reduce((a, b) => a + b, 0) / subjectsProgress.length
			: 0;

	return Math.round(
		timeProgress * weights.time + avgSubjectProgress * weights.subjects
	);
};
