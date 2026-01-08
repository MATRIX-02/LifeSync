/**
 * Study Store - Database-First Implementation
 * Comprehensive study tracking for all learning scenarios
 */
import { create } from "zustand";
import { supabase as supabaseClient } from "../../config/supabase";
import { NotificationService } from "../../services/notificationService";
import {
	calculateNextReviewDate,
	calculateStreak,
	generateId,
	objectToCamelCase,
	objectToSnakeCase,
} from "./helpers";
import type { StudyStore } from "./storeInterface";
import type {
	DailyPlan,
	DailyStats,
	Flashcard,
	FlashcardDeck,
	MockTest,
	MockTestAttempt,
	PlanTask,
	RevisionSchedule,
	StudyGoal,
	StudyNote,
	StudySession,
	StudyStreak,
	Subject,
} from "./types";

// Cast to bypass strict TS checking for Supabase
const supabase = supabaseClient as any;

export type { StudyStore } from "./storeInterface";
export * from "./types";

const DEFAULT_STREAK: StudyStreak = {
	currentStreak: 0,
	longestStreak: 0,
	lastStudyDate: "",
	totalStudyDays: 0,
	weeklyGoal: 10,
	weeklyProgress: 0,
	monthlyStats: {},
};

export const useStudyStore = create<StudyStore>()((set, get) => ({
	// ============ INITIAL STATE ============
	studyGoals: [],
	subjects: [],
	studySessions: [],
	flashcardDecks: [],
	flashcards: [],
	revisionSchedule: [],
	mockTests: [],
	dailyPlans: [],
	studyNotes: [],
	streak: DEFAULT_STREAK,
	activeSession: null,
	isLoading: false,
	userId: null,

	// ============ INITIALIZE ============
	initialize: async (userId: string) => {
		console.log("📚 Loading study data from database for user:", userId);
		set({ isLoading: true, userId });

		try {
			const [
				goalsRes,
				subjectsRes,
				sessionsRes,
				decksRes,
				cardsRes,
				revisionRes,
				testsRes,
				plansRes,
				notesRes,
				streakRes,
			] = await Promise.all([
				supabase.from("study_goals").select("*").eq("user_id", userId),
				supabase.from("study_subjects").select("*").eq("user_id", userId),
				supabase
					.from("study_sessions")
					.select("*")
					.eq("user_id", userId)
					.order("start_time", { ascending: false }),
				supabase.from("flashcard_decks").select("*").eq("user_id", userId),
				supabase.from("flashcards").select("*").eq("user_id", userId),
				supabase.from("revision_schedule").select("*").eq("user_id", userId),
				supabase.from("mock_tests").select("*").eq("user_id", userId),
				supabase.from("daily_plans").select("*").eq("user_id", userId),
				supabase.from("study_notes").select("*").eq("user_id", userId),
				supabase
					.from("study_streak")
					.select("*")
					.eq("user_id", userId)
					.single(),
			]);

			const studyGoals = (goalsRes.data || []).map((g: any) =>
				objectToCamelCase(g)
			);
			const subjects = (subjectsRes.data || []).map((s: any) =>
				objectToCamelCase(s)
			);
			const studySessions = (sessionsRes.data || []).map((s: any) =>
				objectToCamelCase(s)
			);
			const flashcardDecks = (decksRes.data || []).map((d: any) =>
				objectToCamelCase(d)
			);
			const flashcards = (cardsRes.data || []).map((c: any) =>
				objectToCamelCase(c)
			);
			const revisionSchedule = (revisionRes.data || []).map((r: any) =>
				objectToCamelCase(r)
			);
			const mockTests = (testsRes.data || []).map((t: any) => {
				const test = objectToCamelCase(t);
				return {
					...test,
					attempts:
						typeof test.attempts === "string"
							? JSON.parse(test.attempts)
							: test.attempts || [],
				};
			});
			const dailyPlans = (plansRes.data || []).map((p: any) => {
				const plan = objectToCamelCase(p);
				return {
					...plan,
					tasks:
						typeof plan.tasks === "string"
							? JSON.parse(plan.tasks)
							: plan.tasks || [],
				};
			});
			const studyNotes = (notesRes.data || []).map((n: any) =>
				objectToCamelCase(n)
			);
			const streak = streakRes.data
				? objectToCamelCase(streakRes.data)
				: DEFAULT_STREAK;

			// Find active session
			const activeSession =
				studySessions.find((s: StudySession) => s.isActive) || null;

			console.log(
				`✅ Loaded ${studyGoals.length} goals, ${subjects.length} subjects, ${studySessions.length} sessions`
			);

			set({
				studyGoals,
				subjects,
				studySessions,
				flashcardDecks,
				flashcards,
				revisionSchedule,
				mockTests,
				dailyPlans,
				studyNotes,
				streak,
				activeSession,
				isLoading: false,
			});
		} catch (error) {
			console.error("❌ Error loading study data:", error);
			set({ isLoading: false });
		}
	},

	// ============ STUDY GOALS ============
	addStudyGoal: async (goal) => {
		const { userId, studyGoals } = get();
		if (!userId) return;

		const newGoal: StudyGoal = {
			...goal,
			id: generateId(),
			totalHoursSpent: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("study_goals")
			.insert(objectToSnakeCase({ ...newGoal, user_id: userId }));

		if (error) {
			console.error("Error adding study goal:", error);
			return;
		}

		// Schedule deadline reminder if target date is set
		if (newGoal.targetDate) {
			try {
				const targetDate = new Date(newGoal.targetDate);

				// Schedule reminder 3 days before deadline
				await NotificationService.scheduleGoalDeadlineReminder(
					newGoal.id,
					newGoal.name,
					targetDate,
					3
				);

				// Schedule reminder 1 day before deadline
				await NotificationService.scheduleGoalDeadlineReminder(
					newGoal.id,
					newGoal.name,
					targetDate,
					1
				);

				console.log(
					`✅ Scheduled deadline reminders for goal: ${newGoal.name}`
				);
			} catch (error) {
				console.error("Error scheduling goal reminders:", error);
			}
		}

		set({ studyGoals: [...studyGoals, newGoal] });
	},

	updateStudyGoal: async (id, updates) => {
		const { userId, studyGoals } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...updates,
			updated_at: new Date().toISOString(),
		});

		const { error } = await supabase
			.from("study_goals")
			.update(dbData)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating study goal:", error);
			return;
		}

		set({
			studyGoals: studyGoals.map((g) =>
				g.id === id
					? { ...g, ...updates, updatedAt: new Date().toISOString() }
					: g
			),
		});
	},

	deleteStudyGoal: async (id) => {
		const { userId, studyGoals } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_goals")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting study goal:", error);
			return;
		}

		set({ studyGoals: studyGoals.filter((g) => g.id !== id) });
	},

	archiveStudyGoal: async (id) => {
		await get().updateStudyGoal(id, { status: "archived" });
	},

	getGoalProgress: (goalId) => {
		const { subjects } = get();
		const goalSubjects = subjects.filter((s) => s.goalId === goalId);
		if (goalSubjects.length === 0) return 0;
		return Math.round(
			goalSubjects.reduce((sum, s) => sum + s.progress, 0) / goalSubjects.length
		);
	},

	// ============ SUBJECTS ============
	addSubject: async (subject) => {
		const { userId, subjects } = get();
		if (!userId) return;

		const newSubject: Subject = {
			...subject,
			id: generateId(),
			hoursSpent: 0,
			progress: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("study_subjects")
			.insert(objectToSnakeCase({ ...newSubject, user_id: userId }));

		if (error) {
			console.error("Error adding subject:", error);
			return;
		}

		set({ subjects: [...subjects, newSubject] });
	},

	updateSubject: async (id, updates) => {
		const { userId, subjects } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...updates,
			updated_at: new Date().toISOString(),
		});

		const { error } = await supabase
			.from("study_subjects")
			.update(dbData)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating subject:", error);
			return;
		}

		set({
			subjects: subjects.map((s) =>
				s.id === id
					? { ...s, ...updates, updatedAt: new Date().toISOString() }
					: s
			),
		});
	},

	deleteSubject: async (id) => {
		const { userId, subjects } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_subjects")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting subject:", error);
			return;
		}

		set({ subjects: subjects.filter((s) => s.id !== id) });
	},

	getSubjectsByGoal: (goalId) => {
		return get().subjects.filter((s) => s.goalId === goalId);
	},

	reorderSubjects: async (goalId, subjectIds) => {
		const { userId, subjects } = get();
		if (!userId) return;

		const updatedSubjects = subjects.map((s) => {
			if (s.goalId === goalId) {
				const newOrder = subjectIds.indexOf(s.id);
				return { ...s, order: newOrder >= 0 ? newOrder : s.order };
			}
			return s;
		});

		// Update in DB
		for (const id of subjectIds) {
			const order = subjectIds.indexOf(id);
			await supabase
				.from("study_subjects")
				.update({ order })
				.eq("id", id)
				.eq("user_id", userId);
		}

		set({ subjects: updatedSubjects });
	},

	// ============ STUDY SESSIONS ============
	startSession: async (sessionData) => {
		const { userId, studySessions, activeSession } = get();
		if (!userId || activeSession) return;

		const newSession: StudySession = {
			...sessionData,
			id: generateId(),
			duration: 0,
			breaksTaken: 0,
			totalBreakTime: 0,
			isActive: true,
			createdAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("study_sessions")
			.insert(objectToSnakeCase({ ...newSession, user_id: userId }));

		if (error) {
			console.error("Error starting session:", error);
			return;
		}

		set({
			studySessions: [newSession, ...studySessions],
			activeSession: newSession,
		});
	},

	endSession: async (sessionId, data = {}) => {
		const { userId, studySessions, activeSession, subjects, studyGoals } =
			get();
		if (!userId) return;

		const session = studySessions.find((s) => s.id === sessionId);
		if (!session) return;

		const endTime = new Date().toISOString();
		const startTime = new Date(session.startTime);
		const duration = Math.round((Date.now() - startTime.getTime()) / 60000); // minutes

		const updates = {
			...data,
			endTime,
			duration,
			isActive: false,
		};

		const dbData = objectToSnakeCase({
			...updates,
		});

		const { error } = await supabase
			.from("study_sessions")
			.update(dbData)
			.eq("id", sessionId)
			.eq("user_id", userId);

		if (error) {
			console.error("Error ending session:", error);
			return;
		}

		// Update subject hours
		if (session.subjectId) {
			const subject = subjects.find((s) => s.id === session.subjectId);
			if (subject) {
				const newHours = subject.hoursSpent + duration / 60;
				await get().updateSubject(session.subjectId, { hoursSpent: newHours });
			}
		}

		// Update goal hours
		if (session.goalId) {
			const goal = studyGoals.find((g) => g.id === session.goalId);
			if (goal) {
				const newHours = goal.totalHoursSpent + duration / 60;
				await get().updateStudyGoal(session.goalId, {
					totalHoursSpent: newHours,
				});
			}
		}

		set({
			studySessions: studySessions.map((s) =>
				s.id === sessionId ? { ...s, ...updates } : s
			),
			activeSession: null,
		});

		// Update streak
		get().updateStreak();
	},

	pauseSession: (sessionId) => {
		// Pause handled locally, not persisted until end
		set((state) => ({
			activeSession:
				state.activeSession?.id === sessionId
					? { ...state.activeSession, isActive: false }
					: state.activeSession,
		}));
	},

	resumeSession: (sessionId) => {
		set((state) => ({
			activeSession:
				state.activeSession?.id === sessionId
					? { ...state.activeSession, isActive: true }
					: state.activeSession,
		}));
	},

	addBreak: (sessionId, duration) => {
		set((state) => {
			const session = state.activeSession;
			if (session?.id === sessionId) {
				return {
					activeSession: {
						...session,
						breaksTaken: session.breaksTaken + 1,
						totalBreakTime: session.totalBreakTime + duration,
					},
				};
			}
			return state;
		});
	},

	updateSession: async (id, updates) => {
		const { userId, studySessions } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_sessions")
			.update(objectToSnakeCase(updates))
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating session:", error);
			return;
		}

		set({
			studySessions: studySessions.map((s) =>
				s.id === id ? { ...s, ...updates } : s
			),
		});
	},

	deleteSession: async (id) => {
		const { userId, studySessions } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_sessions")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting session:", error);
			return;
		}

		set({ studySessions: studySessions.filter((s) => s.id !== id) });
	},

	getSessionsByDate: (date) => {
		return get().studySessions.filter((s) => s.startTime.startsWith(date));
	},

	getSessionsBySubject: (subjectId) => {
		return get().studySessions.filter((s) => s.subjectId === subjectId);
	},

	getTodaySessions: () => {
		const today = new Date().toISOString().split("T")[0];
		return get().getSessionsByDate(today);
	},

	// ============ FLASHCARD DECKS ============
	addFlashcardDeck: async (deck) => {
		const { userId, flashcardDecks } = get();
		if (!userId) return;

		const newDeck: FlashcardDeck = {
			...deck,
			id: generateId(),
			cardCount: 0,
			masteredCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("flashcard_decks")
			.insert(objectToSnakeCase({ ...newDeck, user_id: userId }));

		if (error) {
			console.error("Error adding deck:", error);
			return;
		}

		set({ flashcardDecks: [...flashcardDecks, newDeck] });
	},

	updateFlashcardDeck: async (id, updates) => {
		const { userId, flashcardDecks } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("flashcard_decks")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating deck:", error);
			return;
		}

		set({
			flashcardDecks: flashcardDecks.map((d) =>
				d.id === id
					? { ...d, ...updates, updatedAt: new Date().toISOString() }
					: d
			),
		});
	},

	deleteFlashcardDeck: async (id) => {
		const { userId, flashcardDecks, flashcards } = get();
		if (!userId) return;

		// Delete deck and all its cards
		await supabase
			.from("flashcards")
			.delete()
			.eq("deck_id", id)
			.eq("user_id", userId);
		const { error } = await supabase
			.from("flashcard_decks")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting deck:", error);
			return;
		}

		set({
			flashcardDecks: flashcardDecks.filter((d) => d.id !== id),
			flashcards: flashcards.filter((c) => c.deckId !== id),
		});
	},

	getDecksBySubject: (subjectId) => {
		return get().flashcardDecks.filter((d) => d.subjectId === subjectId);
	},

	// ============ FLASHCARDS ============
	addFlashcard: async (card) => {
		const { userId, flashcards, flashcardDecks } = get();
		if (!userId) return;

		const newCard: Flashcard = {
			...card,
			id: generateId(),
			status: "new",
			repetitionLevel: 0,
			easeFactor: 2.5,
			reviewCount: 0,
			correctCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("flashcards")
			.insert(objectToSnakeCase({ ...newCard, user_id: userId }));

		if (error) {
			console.error("Error adding flashcard:", error);
			return;
		}

		// Update deck card count
		const deck = flashcardDecks.find((d) => d.id === card.deckId);
		if (deck) {
			await get().updateFlashcardDeck(deck.id, {
				cardCount: deck.cardCount + 1,
			});
		}

		set({ flashcards: [...flashcards, newCard] });
	},

	updateFlashcard: async (id, updates) => {
		const { userId, flashcards } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("flashcards")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating flashcard:", error);
			return;
		}

		set({
			flashcards: flashcards.map((c) =>
				c.id === id
					? { ...c, ...updates, updatedAt: new Date().toISOString() }
					: c
			),
		});
	},

	deleteFlashcard: async (id) => {
		const { userId, flashcards, flashcardDecks } = get();
		if (!userId) return;

		const card = flashcards.find((c) => c.id === id);
		const { error } = await supabase
			.from("flashcards")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting flashcard:", error);
			return;
		}

		// Update deck count
		if (card) {
			const deck = flashcardDecks.find((d) => d.id === card.deckId);
			if (deck) {
				const masteredDelta = card.status === "mastered" ? -1 : 0;
				await get().updateFlashcardDeck(deck.id, {
					cardCount: deck.cardCount - 1,
					masteredCount: deck.masteredCount + masteredDelta,
				});
			}
		}

		set({ flashcards: flashcards.filter((c) => c.id !== id) });
	},

	reviewFlashcard: async (cardId, wasCorrect, difficulty = "medium") => {
		const { flashcards, flashcardDecks } = get();
		const card = flashcards.find((c) => c.id === cardId);
		if (!card) return;

		const { nextLevel, nextDate, newEaseFactor } = calculateNextReviewDate(
			card.repetitionLevel,
			wasCorrect,
			card.easeFactor
		);

		const newStatus =
			nextLevel >= 4 ? "mastered" : nextLevel >= 2 ? "review" : "learning";
		const wasNotMastered = card.status !== "mastered";
		const isNowMastered = newStatus === "mastered";

		const updates: Partial<Flashcard> = {
			repetitionLevel: nextLevel as any,
			easeFactor: newEaseFactor,
			status: newStatus,
			reviewCount: card.reviewCount + 1,
			correctCount: wasCorrect ? card.correctCount + 1 : card.correctCount,
			lastReviewedAt: new Date().toISOString(),
			nextReviewAt: nextDate.toISOString(),
		};

		await get().updateFlashcard(cardId, updates);

		// Update deck mastered count
		if (wasNotMastered && isNowMastered) {
			const deck = flashcardDecks.find((d) => d.id === card.deckId);
			if (deck) {
				await get().updateFlashcardDeck(deck.id, {
					masteredCount: deck.masteredCount + 1,
				});
			}
		}
	},

	getCardsByDeck: (deckId) => {
		return get().flashcards.filter((c) => c.deckId === deckId);
	},

	getDueCards: (deckId) => {
		const now = new Date();
		return get().flashcards.filter((c) => {
			if (deckId && c.deckId !== deckId) return false;
			if (c.status === "mastered") return false;
			if (!c.nextReviewAt) return true;
			return new Date(c.nextReviewAt) <= now;
		});
	},

	bulkAddFlashcards: async (deckId, cards) => {
		for (const card of cards) {
			await get().addFlashcard({
				deckId,
				front: card.front,
				back: card.back,
				hint: card.hint,
				difficulty: "medium",
			});
		}
	},

	// ============ REVISION SCHEDULE ============
	addRevisionSchedule: async (schedule) => {
		const { userId, revisionSchedule } = get();
		if (!userId) return;

		const newSchedule: RevisionSchedule = {
			...schedule,
			id: generateId(),
			isCompleted: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("revision_schedule")
			.insert(objectToSnakeCase({ ...newSchedule, user_id: userId }));

		if (error) {
			console.error("Error adding revision:", error);
			return;
		}

		// Schedule notification if reminder is enabled
		if (newSchedule.reminderEnabled && newSchedule.scheduledDate) {
			try {
				const scheduledDate = new Date(newSchedule.scheduledDate);
				const reminderTime = newSchedule.reminderTime || "09:00";
				const [hours, minutes] = reminderTime.split(":").map(Number);
				scheduledDate.setHours(hours, minutes, 0, 0);

				// Only schedule if it's in the future
				if (scheduledDate > new Date()) {
					await NotificationService.scheduleRevisionReminder(
						newSchedule.id,
						newSchedule.title,
						scheduledDate
					);
					console.log(
						`✅ Scheduled revision reminder for ${newSchedule.title}`
					);
				}
			} catch (error) {
				console.error("Error scheduling revision reminder:", error);
			}
		}

		set({ revisionSchedule: [...revisionSchedule, newSchedule] });
	},

	updateRevisionSchedule: async (id, updates) => {
		const { userId, revisionSchedule } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("revision_schedule")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating revision:", error);
			return;
		}

		set({
			revisionSchedule: revisionSchedule.map((r) =>
				r.id === id
					? { ...r, ...updates, updatedAt: new Date().toISOString() }
					: r
			),
		});
	},

	deleteRevisionSchedule: async (id) => {
		const { userId, revisionSchedule } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("revision_schedule")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting revision:", error);
			return;
		}

		set({ revisionSchedule: revisionSchedule.filter((r) => r.id !== id) });
	},

	completeRevision: async (id) => {
		await get().updateRevisionSchedule(id, {
			isCompleted: true,
			completedAt: new Date().toISOString(),
		});
	},

	getTodayRevisions: () => {
		const today = new Date().toISOString().split("T")[0];
		return get().revisionSchedule.filter((r) => r.scheduledDate === today);
	},

	getUpcomingRevisions: (days) => {
		const today = new Date();
		const futureDate = new Date(today.getTime() + days * 86400000);
		return get().revisionSchedule.filter((r) => {
			const date = new Date(r.scheduledDate);
			return date >= today && date <= futureDate && !r.isCompleted;
		});
	},

	// ============ MOCK TESTS ============
	addMockTest: async (test) => {
		const { userId, mockTests } = get();
		if (!userId) return;

		const newTest: MockTest = {
			...test,
			id: generateId(),
			attempts: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("mock_tests")
			.insert(objectToSnakeCase({ ...newTest, user_id: userId }));

		if (error) {
			console.error("Error adding test:", error);
			return;
		}

		set({ mockTests: [...mockTests, newTest] });
	},

	updateMockTest: async (id, updates) => {
		const { userId, mockTests } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("mock_tests")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating test:", error);
			return;
		}

		set({
			mockTests: mockTests.map((t) =>
				t.id === id
					? { ...t, ...updates, updatedAt: new Date().toISOString() }
					: t
			),
		});
	},

	deleteMockTest: async (id) => {
		const { userId, mockTests } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("mock_tests")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting test:", error);
			return;
		}

		set({ mockTests: mockTests.filter((t) => t.id !== id) });
	},

	addTestAttempt: async (testId, attempt) => {
		const { mockTests } = get();
		const test = mockTests.find((t) => t.id === testId);
		if (!test) return;

		const newAttempt: MockTestAttempt = {
			...attempt,
			id: generateId(),
			testId,
		};

		await get().updateMockTest(testId, {
			attempts: [...test.attempts, newAttempt],
		});
	},

	getTestsByGoal: (goalId) => {
		return get().mockTests.filter((t) => t.goalId === goalId);
	},

	// ============ DAILY PLANS ============
	createDailyPlan: async (plan) => {
		const { userId, dailyPlans } = get();
		if (!userId) return;

		const newPlan: DailyPlan = {
			...plan,
			id: generateId(),
			actualHours: 0,
			isCompleted: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("daily_plans")
			.insert(objectToSnakeCase({ ...newPlan, user_id: userId }));

		if (error) {
			console.error("Error creating plan:", error);
			return;
		}

		// Schedule morning reminder for the daily plan
		try {
			const planDate = new Date(newPlan.date);
			planDate.setHours(8, 0, 0, 0); // 8 AM reminder

			// Only schedule if it's today or in the future
			if (planDate > new Date()) {
				const taskCount = newPlan.tasks?.length || 0;
				const message =
					taskCount > 0
						? `You have ${taskCount} study tasks planned for today. Target: ${newPlan.targetHours}h`
						: `Your target for today: ${newPlan.targetHours} hours of study`;

				// Use the scheduleStudyReminder for daily reminders
				await NotificationService.scheduleNotification(
					"📋 Daily Study Plan",
					message,
					null, // Immediate for today, or use the specific date trigger
					{ type: "daily_plan", planId: newPlan.id }
				);
				console.log(`✅ Scheduled daily plan reminder for ${newPlan.date}`);
			}
		} catch (error) {
			console.error("Error scheduling daily plan reminder:", error);
		}

		set({ dailyPlans: [...dailyPlans, newPlan] });
	},

	updateDailyPlan: async (id, updates) => {
		const { userId, dailyPlans } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("daily_plans")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating plan:", error);
			return;
		}

		set({
			dailyPlans: dailyPlans.map((p) =>
				p.id === id
					? { ...p, ...updates, updatedAt: new Date().toISOString() }
					: p
			),
		});
	},

	deleteDailyPlan: async (id) => {
		const { userId, dailyPlans } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("daily_plans")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting plan:", error);
			return;
		}

		set({ dailyPlans: dailyPlans.filter((p) => p.id !== id) });
	},

	addPlanTask: async (planId, task) => {
		const { dailyPlans } = get();
		const plan = dailyPlans.find((p) => p.id === planId);
		if (!plan) return;

		const newTask: PlanTask = {
			...task,
			id: generateId(),
			planId,
			isCompleted: false,
		};

		await get().updateDailyPlan(planId, {
			tasks: [...plan.tasks, newTask],
		});
	},

	completePlanTask: async (planId, taskId) => {
		const { dailyPlans } = get();
		const plan = dailyPlans.find((p) => p.id === planId);
		if (!plan) return;

		const updatedTasks = plan.tasks.map((t) =>
			t.id === taskId
				? { ...t, isCompleted: true, completedAt: new Date().toISOString() }
				: t
		);

		await get().updateDailyPlan(planId, { tasks: updatedTasks });
	},

	reorderPlanTasks: async (planId, taskIds) => {
		const { dailyPlans } = get();
		const plan = dailyPlans.find((p) => p.id === planId);
		if (!plan) return;

		const reorderedTasks = taskIds
			.map((id, index) => {
				const task = plan.tasks.find((t) => t.id === id);
				return task ? { ...task, order: index } : null;
			})
			.filter(Boolean) as PlanTask[];

		await get().updateDailyPlan(planId, { tasks: reorderedTasks });
	},

	getTodayPlan: () => {
		const today = new Date().toISOString().split("T")[0];
		return get().dailyPlans.find((p) => p.date === today);
	},

	// ============ STUDY NOTES ============
	addNote: async (note) => {
		const { userId, studyNotes } = get();
		if (!userId) return;

		const newNote: StudyNote = {
			...note,
			id: generateId(),
			isBookmarked: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const { error } = await supabase
			.from("study_notes")
			.insert(objectToSnakeCase({ ...newNote, user_id: userId }));

		if (error) {
			console.error("Error adding note:", error);
			return;
		}

		set({ studyNotes: [...studyNotes, newNote] });
	},

	updateNote: async (id, updates) => {
		const { userId, studyNotes } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_notes")
			.update(
				objectToSnakeCase({ ...updates, updated_at: new Date().toISOString() })
			)
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error updating note:", error);
			return;
		}

		set({
			studyNotes: studyNotes.map((n) =>
				n.id === id
					? { ...n, ...updates, updatedAt: new Date().toISOString() }
					: n
			),
		});
	},

	deleteNote: async (id) => {
		const { userId, studyNotes } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("study_notes")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting note:", error);
			return;
		}

		set({ studyNotes: studyNotes.filter((n) => n.id !== id) });
	},

	toggleNoteBookmark: async (id) => {
		const { studyNotes } = get();
		const note = studyNotes.find((n) => n.id === id);
		if (note) {
			await get().updateNote(id, { isBookmarked: !note.isBookmarked });
		}
	},

	searchNotes: (query) => {
		const lowerQuery = query.toLowerCase();
		return get().studyNotes.filter(
			(n) =>
				n.title.toLowerCase().includes(lowerQuery) ||
				n.content.toLowerCase().includes(lowerQuery) ||
				n.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
		);
	},

	getNotesBySubject: (subjectId) => {
		return get().studyNotes.filter((n) => n.subjectId === subjectId);
	},

	// ============ ANALYTICS ============
	getStudyAnalytics: (startDate, endDate) => {
		const { studySessions, subjects, studyGoals, flashcards, flashcardDecks } =
			get();

		let filteredSessions = studySessions;
		if (startDate) {
			filteredSessions = filteredSessions.filter(
				(s) => s.startTime >= startDate
			);
		}
		if (endDate) {
			filteredSessions = filteredSessions.filter((s) => s.startTime <= endDate);
		}

		const totalMinutes = filteredSessions.reduce(
			(sum, s) => sum + s.duration,
			0
		);
		const totalHoursStudied = totalMinutes / 60;
		const averageSessionDuration =
			filteredSessions.length > 0 ? totalMinutes / filteredSessions.length : 0;
		const averageFocusScore =
			filteredSessions.length > 0
				? filteredSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) /
				  filteredSessions.length
				: 0;

		// Subject distribution
		const subjectMinutes: { [key: string]: number } = {};
		filteredSessions.forEach((s) => {
			if (s.subjectId) {
				subjectMinutes[s.subjectId] =
					(subjectMinutes[s.subjectId] || 0) + s.duration;
			}
		});

		const subjectDistribution = Object.entries(subjectMinutes).map(
			([subjectId, minutes]) => {
				const subject = subjects.find((s) => s.id === subjectId);
				return {
					subject: subject?.name || "Unknown",
					hours: minutes / 60,
					percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
				};
			}
		);

		const mostStudiedSubject =
			subjectDistribution.length > 0
				? subjectDistribution.reduce((a, b) => (a.hours > b.hours ? a : b))
						.subject
				: "N/A";

		// Goal progress
		const goalProgress = studyGoals.map((g) => ({
			goal: g.name,
			progress: get().getGoalProgress(g.id),
		}));

		// Flashcard stats
		const totalCards = flashcards.length;
		const mastered = flashcards.filter((c) => c.status === "mastered").length;
		const learning = flashcards.filter((c) => c.status === "learning").length;
		const toReview = get().getDueCards().length;

		return {
			totalHoursStudied,
			averageSessionDuration,
			averageFocusScore,
			mostProductiveTime: "TBD",
			mostStudiedSubject,
			weeklyTrend: [],
			monthlyTrend: [],
			subjectDistribution,
			goalProgress,
			flashcardStats: { totalCards, mastered, learning, toReview },
		};
	},

	getDailyStats: (date) => {
		const sessions = get().getSessionsByDate(date);
		const flashcardsReviewed = get().flashcards.filter((c) =>
			c.lastReviewedAt?.startsWith(date)
		).length;
		const plan = get().dailyPlans.find((p) => p.date === date);
		const tasksCompleted = plan?.tasks.filter((t) => t.isCompleted).length || 0;

		return {
			date,
			totalMinutes: sessions.reduce((sum, s) => sum + s.duration, 0),
			sessionsCount: sessions.length,
			subjectsStudied: [
				...new Set(sessions.map((s) => s.subjectId).filter(Boolean)),
			] as string[],
			flashcardsReviewed,
			tasksCompleted,
			focusScore:
				sessions.length > 0
					? sessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) /
					  sessions.length
					: 0,
		};
	},

	getWeeklyStats: () => {
		const stats: DailyStats[] = [];
		for (let i = 6; i >= 0; i--) {
			const date = new Date(Date.now() - i * 86400000)
				.toISOString()
				.split("T")[0];
			stats.push(get().getDailyStats(date));
		}
		return stats;
	},

	getMonthlyStats: (month) => {
		const sessions = get().studySessions.filter((s) =>
			s.startTime.startsWith(month)
		);
		const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
		const avgFocus =
			sessions.length > 0
				? sessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) /
				  sessions.length
				: 0;

		return {
			totalHours: totalMinutes / 60,
			sessionsCount: sessions.length,
			avgFocus,
		};
	},

	updateStreak: () => {
		const { studySessions, streak, userId } = get();
		if (!userId) return;

		const { currentStreak, longestStreak } = calculateStreak(
			studySessions,
			streak.lastStudyDate
		);

		const today = new Date().toISOString().split("T")[0];
		const newStreak: StudyStreak = {
			...streak,
			currentStreak,
			longestStreak: Math.max(longestStreak, streak.longestStreak),
			lastStudyDate: today,
			totalStudyDays:
				streak.totalStudyDays + (streak.lastStudyDate !== today ? 1 : 0),
		};

		// Update in DB
		supabase
			.from("study_streak")
			.upsert(objectToSnakeCase({ ...newStreak, user_id: userId }));

		set({ streak: newStreak });
	},

	// ============ POMODORO ============
	startPomodoro: async (subjectId, goalId) => {
		await get().startSession({
			type: "study",
			startTime: new Date().toISOString(),
			subjectId,
			goalId,
			plannedDuration: 25,
			pomodoroCount: 0,
		});
	},

	completePomodoro: async () => {
		const { activeSession } = get();
		if (!activeSession) return;

		set({
			activeSession: {
				...activeSession,
				pomodoroCount: (activeSession.pomodoroCount || 0) + 1,
			},
		});
	},

	skipPomodoro: () => {
		// Just continue without counting the pomodoro
	},

	// ============ IMPORT/EXPORT ============
	exportStudyData: () => {
		const state = get();
		return JSON.stringify({
			studyGoals: state.studyGoals,
			subjects: state.subjects,
			flashcardDecks: state.flashcardDecks,
			flashcards: state.flashcards,
			mockTests: state.mockTests,
			studyNotes: state.studyNotes,
		});
	},

	importStudyData: async (data) => {
		try {
			const parsed = JSON.parse(data);
			// TODO: Implement import logic
			console.log("Import data:", parsed);
		} catch (error) {
			console.error("Error importing data:", error);
		}
	},

	importData: async (data: {
		studyGoals?: StudyGoal[];
		subjects?: Subject[];
		studySessions?: StudySession[];
		flashcardDecks?: FlashcardDeck[];
		flashcards?: Flashcard[];
		revisionSchedule?: RevisionSchedule[];
		mockTests?: MockTest[];
		dailyPlans?: DailyPlan[];
		studyNotes?: StudyNote[];
	}) => {
		const userId = get().userId;
		if (!userId) {
			console.error("No user ID - cannot import data");
			return;
		}

		try {
			// Import all data types and update local state
			if (data.studyGoals) {
				set({ studyGoals: data.studyGoals });
			}
			if (data.subjects) {
				set({ subjects: data.subjects });
			}
			if (data.studySessions) {
				set({ studySessions: data.studySessions });
			}
			if (data.flashcardDecks) {
				set({ flashcardDecks: data.flashcardDecks });
			}
			if (data.flashcards) {
				set({ flashcards: data.flashcards });
			}
			if (data.revisionSchedule) {
				set({ revisionSchedule: data.revisionSchedule });
			}
			if (data.mockTests) {
				set({ mockTests: data.mockTests });
			}
			if (data.dailyPlans) {
				set({ dailyPlans: data.dailyPlans });
			}
			if (data.studyNotes) {
				set({ studyNotes: data.studyNotes });
			}

			console.log("✅ Study data imported successfully");
		} catch (error: any) {
			console.error("❌ Failed to import study data:", error);
		}
	},

	clearAllData: async () => {
		const { userId } = get();
		if (!userId) {
			console.error("No user ID - cannot clear data");
			return;
		}
		console.log("🗑️ Clearing study data for user:", userId);

		try {
			// Delete from database with user_id filter
			await Promise.all([
				supabaseClient.from("study_sessions").delete().eq("user_id", userId),
				supabaseClient.from("study_subjects").delete().eq("user_id", userId),
				supabaseClient.from("study_goals").delete().eq("user_id", userId),
				supabaseClient.from("flashcards").delete().eq("user_id", userId),
				supabaseClient.from("flashcard_decks").delete().eq("user_id", userId),
				supabaseClient.from("revision_schedule").delete().eq("user_id", userId),
				supabaseClient.from("mock_tests").delete().eq("user_id", userId),
				supabaseClient.from("daily_plans").delete().eq("user_id", userId),
				supabaseClient.from("study_notes").delete().eq("user_id", userId),
			]);

			// Clear local state
			set({
				studyGoals: [],
				subjects: [],
				studySessions: [],
				flashcardDecks: [],
				flashcards: [],
				revisionSchedule: [],
				mockTests: [],
				dailyPlans: [],
				studyNotes: [],
				streak: DEFAULT_STREAK,
				activeSession: null,
			});
			console.log("✅ Study data cleared");
		} catch (error: any) {
			console.error("❌ Failed to clear study data:", error);
		}
	},
}));
