/**
 * Study Store Interface - All methods and state shape
 */
import type {
	DailyPlan,
	DailyStats,
	Flashcard,
	FlashcardDeck,
	MockTest,
	MockTestAttempt,
	PlanTask,
	RevisionSchedule,
	StudyAnalytics,
	StudyGoal,
	StudyNote,
	StudySession,
	StudyStreak,
	Subject,
} from "./types";

export interface StudyStore {
	// ============ STATE ============
	studyGoals: StudyGoal[];
	subjects: Subject[];
	studySessions: StudySession[];
	flashcardDecks: FlashcardDeck[];
	flashcards: Flashcard[];
	revisionSchedule: RevisionSchedule[];
	mockTests: MockTest[];
	dailyPlans: DailyPlan[];
	studyNotes: StudyNote[];
	streak: StudyStreak;
	activeSession: StudySession | null;
	isLoading: boolean;
	userId: string | null;

	// ============ INITIALIZE ============
	initialize: (userId: string) => Promise<void>;

	// ============ STUDY GOALS ============
	addStudyGoal: (
		goal: Omit<StudyGoal, "id" | "totalHoursSpent" | "createdAt" | "updatedAt">
	) => Promise<void>;
	updateStudyGoal: (id: string, updates: Partial<StudyGoal>) => Promise<void>;
	deleteStudyGoal: (id: string) => Promise<void>;
	archiveStudyGoal: (id: string) => Promise<void>;
	getGoalProgress: (goalId: string) => number;

	// ============ SUBJECTS ============
	addSubject: (
		subject: Omit<
			Subject,
			"id" | "hoursSpent" | "progress" | "createdAt" | "updatedAt"
		>
	) => Promise<void>;
	updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
	deleteSubject: (id: string) => Promise<void>;
	getSubjectsByGoal: (goalId: string) => Subject[];
	reorderSubjects: (goalId: string, subjectIds: string[]) => Promise<void>;

	// ============ STUDY SESSIONS ============
	startSession: (
		session: Omit<
			StudySession,
			| "id"
			| "endTime"
			| "duration"
			| "breaksTaken"
			| "totalBreakTime"
			| "isActive"
			| "createdAt"
		>
	) => Promise<void>;
	endSession: (
		sessionId: string,
		data?: Partial<StudySession>
	) => Promise<void>;
	pauseSession: (sessionId: string) => void;
	resumeSession: (sessionId: string) => void;
	addBreak: (sessionId: string, duration: number) => void;
	updateSession: (id: string, updates: Partial<StudySession>) => Promise<void>;
	deleteSession: (id: string) => Promise<void>;
	getSessionsByDate: (date: string) => StudySession[];
	getSessionsBySubject: (subjectId: string) => StudySession[];
	getTodaySessions: () => StudySession[];

	// ============ FLASHCARD DECKS ============
	addFlashcardDeck: (
		deck: Omit<
			FlashcardDeck,
			"id" | "cardCount" | "masteredCount" | "createdAt" | "updatedAt"
		>
	) => Promise<void>;
	updateFlashcardDeck: (
		id: string,
		updates: Partial<FlashcardDeck>
	) => Promise<void>;
	deleteFlashcardDeck: (id: string) => Promise<void>;
	getDecksBySubject: (subjectId: string) => FlashcardDeck[];

	// ============ FLASHCARDS ============
	addFlashcard: (
		card: Omit<
			Flashcard,
			| "id"
			| "status"
			| "repetitionLevel"
			| "easeFactor"
			| "reviewCount"
			| "correctCount"
			| "createdAt"
			| "updatedAt"
		>
	) => Promise<void>;
	updateFlashcard: (id: string, updates: Partial<Flashcard>) => Promise<void>;
	deleteFlashcard: (id: string) => Promise<void>;
	reviewFlashcard: (
		cardId: string,
		wasCorrect: boolean,
		difficulty?: "easy" | "medium" | "hard"
	) => Promise<void>;
	getCardsByDeck: (deckId: string) => Flashcard[];
	getDueCards: (deckId?: string) => Flashcard[];
	bulkAddFlashcards: (
		deckId: string,
		cards: { front: string; back: string; hint?: string }[]
	) => Promise<void>;

	// ============ REVISION SCHEDULE ============
	addRevisionSchedule: (
		schedule: Omit<
			RevisionSchedule,
			"id" | "isCompleted" | "createdAt" | "updatedAt"
		>
	) => Promise<void>;
	updateRevisionSchedule: (
		id: string,
		updates: Partial<RevisionSchedule>
	) => Promise<void>;
	deleteRevisionSchedule: (id: string) => Promise<void>;
	completeRevision: (id: string) => Promise<void>;
	getTodayRevisions: () => RevisionSchedule[];
	getUpcomingRevisions: (days: number) => RevisionSchedule[];

	// ============ MOCK TESTS ============
	addMockTest: (
		test: Omit<MockTest, "id" | "attempts" | "createdAt" | "updatedAt">
	) => Promise<void>;
	updateMockTest: (id: string, updates: Partial<MockTest>) => Promise<void>;
	deleteMockTest: (id: string) => Promise<void>;
	addTestAttempt: (
		testId: string,
		attempt: Omit<MockTestAttempt, "id" | "testId">
	) => Promise<void>;
	getTestsByGoal: (goalId: string) => MockTest[];

	// ============ DAILY PLANS ============
	createDailyPlan: (
		plan: Omit<
			DailyPlan,
			"id" | "actualHours" | "isCompleted" | "createdAt" | "updatedAt"
		>
	) => Promise<void>;
	updateDailyPlan: (id: string, updates: Partial<DailyPlan>) => Promise<void>;
	deleteDailyPlan: (id: string) => Promise<void>;
	addPlanTask: (
		planId: string,
		task: Omit<PlanTask, "id" | "planId" | "isCompleted">
	) => Promise<void>;
	completePlanTask: (planId: string, taskId: string) => Promise<void>;
	reorderPlanTasks: (planId: string, taskIds: string[]) => Promise<void>;
	getTodayPlan: () => DailyPlan | undefined;

	// ============ STUDY NOTES ============
	addNote: (
		note: Omit<StudyNote, "id" | "isBookmarked" | "createdAt" | "updatedAt">
	) => Promise<void>;
	updateNote: (id: string, updates: Partial<StudyNote>) => Promise<void>;
	deleteNote: (id: string) => Promise<void>;
	toggleNoteBookmark: (id: string) => Promise<void>;
	searchNotes: (query: string) => StudyNote[];
	getNotesBySubject: (subjectId: string) => StudyNote[];

	// ============ ANALYTICS ============
	getStudyAnalytics: (startDate?: string, endDate?: string) => StudyAnalytics;
	getDailyStats: (date: string) => DailyStats;
	getWeeklyStats: () => DailyStats[];
	getMonthlyStats: (month: string) => {
		totalHours: number;
		sessionsCount: number;
		avgFocus: number;
	};
	updateStreak: () => void;

	// ============ POMODORO ============
	startPomodoro: (subjectId?: string, goalId?: string) => Promise<void>;
	completePomodoro: () => Promise<void>;
	skipPomodoro: () => void;

	// ============ IMPORT/EXPORT ============
	exportStudyData: () => string;
	importStudyData: (data: string) => Promise<void>;
	importData: (data: {
		studyGoals?: StudyGoal[];
		subjects?: Subject[];
		studySessions?: StudySession[];
		flashcardDecks?: FlashcardDeck[];
		flashcards?: Flashcard[];
		revisionSchedule?: RevisionSchedule[];
		mockTests?: MockTest[];
		dailyPlans?: DailyPlan[];
		studyNotes?: StudyNote[];
	}) => Promise<void>;
	clearAllData: () => void;
}
