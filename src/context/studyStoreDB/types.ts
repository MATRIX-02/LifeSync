/**
 * Study Store Types - Comprehensive types for all study/learning scenarios
 */

// ============ ENUMS & BASIC TYPES ============

export type StudyGoalType =
	| "exam" // School/college exams
	| "competitive" // JEE, NEET, UPSC, CAT, etc.
	| "interview" // Coding, SSB, job interviews
	| "skill" // Learning a new skill
	| "certification" // Professional certifications
	| "language" // Learning a new language
	| "reading" // Reading goals
	| "project" // Project-based learning
	| "other";

export type StudyStatus =
	| "not_started"
	| "in_progress"
	| "completed"
	| "paused"
	| "archived";
export type Priority = "low" | "medium" | "high" | "critical";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type SessionType =
	| "study"
	| "revision"
	| "practice"
	| "test"
	| "reading";
export type FlashcardStatus = "new" | "learning" | "review" | "mastered";

// Spaced Repetition Intervals (in days)
export type SpacedRepetitionLevel = 0 | 1 | 2 | 3 | 4 | 5;
export const SPACED_REPETITION_INTERVALS = [0, 1, 3, 7, 14, 30] as const;

// ============ CORE ENTITIES ============

/**
 * Study Goal - Top level goal (e.g., "Pass JEE Mains", "Get job at FAANG")
 */
export interface StudyGoal {
	id: string;
	name: string;
	type: StudyGoalType;
	description?: string;
	targetDate?: string;
	startDate: string;
	status: StudyStatus;
	priority: Priority;
	targetScore?: number;
	currentScore?: number;
	totalHoursTarget?: number;
	totalHoursSpent: number;
	color?: string;
	icon?: string;
	tags?: string[];
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Subject/Topic - Categories within a goal
 */
export interface Subject {
	id: string;
	goalId: string;
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	targetHours?: number;
	hoursSpent: number;
	priority: Priority;
	difficulty: Difficulty;
	progress: number; // 0-100
	status: StudyStatus;
	order: number;
	parentSubjectId?: string; // For nested topics
	resources?: StudyResource[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Study Resource - Links, PDFs, books, videos
 */
export interface StudyResource {
	id: string;
	subjectId: string;
	title: string;
	type: "book" | "pdf" | "video" | "website" | "course" | "notes" | "other";
	url?: string;
	notes?: string;
	isCompleted: boolean;
	progress?: number;
	createdAt: string;
}

/**
 * Study Session - Actual study time tracking
 */
export interface StudySession {
	id: string;
	goalId?: string;
	subjectId?: string;
	type: SessionType;
	startTime: string;
	endTime?: string;
	duration: number; // in minutes
	plannedDuration?: number;
	breaksTaken: number;
	totalBreakTime: number; // in minutes
	focusScore?: number; // 1-10
	productivity?: number; // 1-10
	notes?: string;
	distractions?: string[];
	pomodoroCount?: number;
	isActive: boolean;
	createdAt: string;
}

/**
 * Flashcard Deck - Collection of flashcards for a subject
 */
export interface FlashcardDeck {
	id: string;
	subjectId?: string;
	goalId?: string;
	name: string;
	description?: string;
	cardCount: number;
	masteredCount: number;
	lastReviewedAt?: string;
	nextReviewAt?: string;
	color?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Flashcard - Individual card with spaced repetition
 */
export interface Flashcard {
	id: string;
	deckId: string;
	front: string; // Question or term
	back: string; // Answer or definition
	hint?: string;
	tags?: string[];
	status: FlashcardStatus;
	difficulty: Difficulty;
	repetitionLevel: SpacedRepetitionLevel;
	easeFactor: number; // SM-2 algorithm
	reviewCount: number;
	correctCount: number;
	lastReviewedAt?: string;
	nextReviewAt?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Revision Schedule - Planned revision items
 */
export interface RevisionSchedule {
	id: string;
	subjectId?: string;
	goalId?: string;
	deckId?: string;
	title: string;
	description?: string;
	scheduledDate: string;
	scheduledTime?: string;
	duration?: number;
	type: "topic_revision" | "flashcard_review" | "mock_test" | "practice";
	isCompleted: boolean;
	completedAt?: string;
	reminderEnabled: boolean;
	reminderTime?: string;
	isRecurring: boolean;
	recurringPattern?: "daily" | "weekly" | "custom";
	recurringDays?: number[]; // 0-6 for days of week
	createdAt: string;
	updatedAt: string;
}

/**
 * Mock Test / Quiz - Track test attempts
 */
export interface MockTest {
	id: string;
	goalId?: string;
	subjectId?: string;
	name: string;
	description?: string;
	totalQuestions: number;
	totalMarks: number;
	duration: number; // in minutes
	attempts: MockTestAttempt[];
	createdAt: string;
	updatedAt: string;
}

export interface MockTestAttempt {
	id: string;
	testId: string;
	attemptDate: string;
	timeTaken: number; // in minutes
	score: number;
	maxScore: number;
	percentage: number;
	correctAnswers: number;
	wrongAnswers: number;
	skipped: number;
	sectionWiseScores?: { [section: string]: number };
	notes?: string;
}

/**
 * Daily Study Plan - What to study each day
 */
export interface DailyPlan {
	id: string;
	date: string;
	targetHours: number;
	actualHours: number;
	tasks: PlanTask[];
	isCompleted: boolean;
	notes?: string;
	mood?: "great" | "good" | "okay" | "tired" | "stressed";
	createdAt: string;
	updatedAt: string;
}

export interface PlanTask {
	id: string;
	planId: string;
	subjectId?: string;
	goalId?: string;
	title: string;
	description?: string;
	duration?: number;
	priority: Priority;
	isCompleted: boolean;
	completedAt?: string;
	order: number;
}

/**
 * Study Streak - Track consistency
 */
export interface StudyStreak {
	currentStreak: number;
	longestStreak: number;
	lastStudyDate: string;
	totalStudyDays: number;
	weeklyGoal: number; // hours per week
	weeklyProgress: number;
	monthlyStats: { [month: string]: number }; // hours per month
}

/**
 * Notes - Quick notes during study
 */
export interface StudyNote {
	id: string;
	goalId?: string;
	subjectId?: string;
	sessionId?: string;
	title: string;
	content: string;
	tags?: string[];
	isBookmarked: boolean;
	createdAt: string;
	updatedAt: string;
}

// ============ ANALYTICS TYPES ============

export interface StudyAnalytics {
	totalHoursStudied: number;
	averageSessionDuration: number;
	averageFocusScore: number;
	mostProductiveTime: string;
	mostStudiedSubject: string;
	weeklyTrend: { day: string; hours: number }[];
	monthlyTrend: { month: string; hours: number }[];
	subjectDistribution: { subject: string; hours: number; percentage: number }[];
	goalProgress: { goal: string; progress: number }[];
	flashcardStats: {
		totalCards: number;
		mastered: number;
		learning: number;
		toReview: number;
	};
}

export interface DailyStats {
	date: string;
	totalMinutes: number;
	sessionsCount: number;
	subjectsStudied: string[];
	flashcardsReviewed: number;
	tasksCompleted: number;
	focusScore: number;
}
