// Database-first Habit Store - All operations go through Supabase
import { create } from "zustand";
import { supabase } from "../config/supabase";
import {
	AppSettings,
	FrequencyConfig,
	Habit,
	HabitLog,
	DayProgress,
	HabitStats,
	UserProfile,
} from "../types";
import {
	expandDayTimes,
	isActiveOn,
	normalizeFrequency,
	toLegacyFrequency,
} from "../utils/frequency";
import { generateUUID } from "../utils/uuid";

/**
 * Day index for habit logs: "habitId|YYYY-M-D" -> the logs on that day.
 *
 * The calendar grid asks for one day at a time, once per cell. Scanning the
 * whole `logs` array per cell - and allocating a Date for every log while doing
 * it - is O(cells x habits x logs) on every render, which is what made swiping
 * the grid lag. Building this once per logs change makes each lookup O(1).
 *
 * Keyed on the array reference: zustand replaces `logs` on every mutation, so
 * an unchanged reference means an unchanged index.
 */
let logIndexCache: { source: HabitLog[]; index: Map<string, HabitLog[]> } | null =
	null;

// Local calendar date as "YYYY-MM-DD". toISOString() would shift the day for
// anyone east or west of UTC, which silently moved logs a day in either
// direction depending on the hour they were made.
const toDateKey = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
		date.getDate()
	).padStart(2, "0")}`;

const dayKey = (habitId: string, date: Date): string =>
	`${habitId}|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const getLogIndex = (logs: HabitLog[]): Map<string, HabitLog[]> => {
	if (logIndexCache && logIndexCache.source === logs) return logIndexCache.index;

	const index = new Map<string, HabitLog[]>();
	for (const log of logs) {
		const completed =
			log.completedAt instanceof Date
				? log.completedAt
				: new Date(log.completedAt);
		const key = dayKey(log.habitId, completed);
		const bucket = index.get(key);
		if (bucket) bucket.push(log);
		else index.set(key, [log]);
	}

	logIndexCache = { source: logs, index };
	return index;
};

// Helper: Convert camelCase to snake_case
const toSnakeCase = (str: string): string => {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Helper: Convert snake_case to camelCase
const toCamelCase = (str: string): string => {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper: Convert object keys from camelCase to snake_case
const objectToSnakeCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
	if (obj instanceof Date) return obj.toISOString();
	if (typeof obj !== "object") return obj;

	const result: any = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			result[toSnakeCase(key)] = objectToSnakeCase(obj[key]);
		}
	}
	return result;
};

// Helper: Convert object keys from snake_case to camelCase
const objectToCamelCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToCamelCase);
	if (typeof obj !== "object") return obj;

	const result: any = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			result[toCamelCase(key)] = objectToCamelCase(obj[key]);
		}
	}
	return result;
};

// Convert DB habit to app habit
const dbHabitToHabit = (dbHabit: any): Habit => {
	const habit = objectToCamelCase(dbHabit);

	// Prefer the `frequency` jsonb column; fall back to the legacy flat columns
	// for rows written by an older build. normalizeFrequency accepts either.
	habit.frequency = normalizeFrequency(
		habit.frequency ?? {
			type: habit.frequencyType || "daily",
			value: habit.frequencyValue || 1,
			secondValue: habit.frequencySecondValue,
			days: habit.frequencyDays || [],
			startTime: habit.frequencyStartTime ?? undefined,
			endTime: habit.frequencyEndTime ?? undefined,
			intervalMinutes: habit.frequencyIntervalMinutes ?? undefined,
		},
		habit.notificationTime
	) as unknown as FrequencyConfig;
	// Map archived to isArchived
	habit.isArchived = habit.archived || false;
	// Parse dates
	habit.createdAt = new Date(habit.createdAt);
	habit.updatedAt = new Date(habit.updatedAt);
	if (habit.archivedAt) habit.archivedAt = new Date(habit.archivedAt);
	return habit;
};

// Convert app habit to DB habit
const habitToDbHabit = (habit: Habit, userId: string): any => {
	const { frequency, isArchived, ...rest } = habit;
	const normalized = normalizeFrequency(frequency, habit.notificationTime);
	// Dual write: the jsonb column is the source of truth, the flat columns are
	// a mirror so an older build still reads this row correctly. Drop the mirror
	// only after every device is updated - see the frequency jsonb migration.
	const legacy = toLegacyFrequency(normalized);

	return objectToSnakeCase({
		...rest,
		frequency: normalized,
		frequencyType: legacy.type || "daily",
		frequencyValue: legacy.value || 1,
		frequencySecondValue: legacy.secondValue ?? null,
		frequencyDays: legacy.days || [],
		frequencyStartTime: legacy.startTime ?? null,
		frequencyEndTime: legacy.endTime ?? null,
		frequencyIntervalMinutes: legacy.intervalMinutes ?? null,
		archived: isArchived || false,
		userId: userId,
		syncedAt: new Date().toISOString(),
	});
};

// Convert DB log to app log
const dbLogToLog = (dbLog: any): HabitLog => {
	const log = objectToCamelCase(dbLog);
	log.completedAt = new Date(log.completedAt || log.timestamp);
	return log;
};

// Convert app log to DB log
const logToDbLog = (log: HabitLog, userId: string): any => {
	return objectToSnakeCase({
		id: log.id,
		habitId: log.habitId,
		userId: userId,
		timestamp: log.completedAt,
		completedAt: log.completedAt,
		value: log.value,
		notes: log.notes,
	});
};

interface HabitStoreDB {
	// State
	habits: Habit[];
	logs: HabitLog[];
	stats: Map<string, HabitStats>;
	profile: UserProfile | null;
	settings: AppSettings;
	isLoading: boolean;
	/**
	 * True once initialize() has successfully loaded from the database. An empty
	 * `habits` array means nothing until this flips - before it, the store is
	 * simply not populated yet.
	 */
	hasLoaded: boolean;
	error: string | null;
	userId: string | null;

	// Initialize
	initialize: (userId: string) => Promise<void>;
	setUserId: (userId: string | null) => void;

	// Habits (all async - DB operations)
	addHabit: (habit: Habit) => Promise<void>;
	updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
	deleteHabit: (id: string) => Promise<void>;
	getHabit: (id: string) => Habit | undefined;
	archiveHabit: (id: string) => Promise<void>;
	unarchiveHabit: (id: string) => Promise<void>;
	getActiveHabits: () => Habit[];
	getArchivedHabits: () => Habit[];

	// Logs (all async - DB operations)
	logHabitCompletion: (
		habitId: string,
		value?: number,
		notes?: string
	) => Promise<void>;
	logHabitForDate: (
		habitId: string,
		date: Date,
		value?: number,
		notes?: string
	) => Promise<void>;
	removeLogForDate: (habitId: string, date: Date) => Promise<void>;
	toggleHabitForDate: (habitId: string, date: Date) => Promise<void>;
	getHabitLogs: (habitId: string) => HabitLog[];
	getLogsForDate: (habitId: string, date: Date) => HabitLog[];
	isHabitCompletedOnDate: (habitId: string, date: Date) => boolean;
	/** How many completions a habit needs on a given day, and how many it has. */
	getProgressForDate: (
		habitId: string,
		date: Date
	) => { done: number; target: number };
	/** False on days a day-restricted habit does not run. */
	isHabitActiveOnDate: (habitId: string, date: Date) => boolean;
	/** Remove a single completion, rather than clearing the whole day. */
	removeOneLogForDate: (habitId: string, date: Date) => Promise<void>;

	// Stats (computed locally from DB data)
	calculateStats: (habitId: string) => HabitStats;
	getAllStats: () => Map<string, HabitStats>;
	getOverallStats: () => {
		totalHabits: number;
		completedToday: number;
		currentOverallStreak: number;
		totalCompletions: number;
	};

	// Profile
	setProfile: (profile: UserProfile) => void;
	updateProfile: (updates: Partial<UserProfile>) => void;

	// Settings
	updateSettings: (updates: Partial<AppSettings>) => void;

	// Search
	searchHabits: (query: string) => Habit[];

	// Refresh from DB
	refreshFromDatabase: () => Promise<void>;

	// Import/Export
	importData: (data: {
		habits?: Habit[];
		logs?: HabitLog[];
		profile?: UserProfile | null;
		settings?: AppSettings;
	}) => Promise<void>;

	// Clear
	clearAllData: () => Promise<void>;
}

const defaultSettings: AppSettings = {
	theme: "dark",
	notifications: {
		enabled: true,
		sound: true,
		vibration: true,
		quietHoursEnabled: false,
	},
	display: {
		showCompletedHabits: true,
		showArchivedHabits: false,
		defaultView: "list",
	},
};

export const useHabitStore = create<HabitStoreDB>()((set, get) => ({
	habits: [],
	logs: [],
	stats: new Map(),
	profile: null,
	settings: defaultSettings,
	isLoading: false,
	hasLoaded: false,
	error: null,
	userId: null,

	setUserId: (userId: string | null) => {
		set({ userId });
	},

	// Initialize - fetch all data from database
	initialize: async (userId: string) => {
		set({ isLoading: true, error: null, userId });

		try {
			console.log("📥 Loading habits from database for user:", userId);

			// Fetch habits
			const { data: habitsData, error: habitsError } = await supabase
				.from("user_habits")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (habitsError) throw habitsError;

			// Fetch logs
			const { data: logsData, error: logsError } = await supabase
				.from("habit_logs")
				.select("*")
				.eq("user_id", userId)
				.order("timestamp", { ascending: false });

			if (logsError) throw logsError;

			const habits = (habitsData || []).map(dbHabitToHabit);
			const logs = (logsData || []).map(dbLogToLog);

			console.log(`✅ Loaded ${habits.length} habits, ${logs.length} logs`);

			set({
				habits,
				logs,
				isLoading: false,
				hasLoaded: true,
			});

			// Calculate stats for all habits
			habits.forEach((habit) => get().calculateStats(habit.id));
		} catch (error: any) {
			console.error("❌ Failed to load habits from database:", error);
			set({ isLoading: false, error: error.message });
		}
	},

	// Refresh data from database
	refreshFromDatabase: async () => {
		const userId = get().userId;
		if (userId) {
			await get().initialize(userId);
		}
	},

	// Add habit - insert into DB
	addHabit: async (habit: Habit) => {
		const userId = get().userId;
		if (!userId) {
			console.error("No user ID - cannot add habit");
			return;
		}

		try {
			const dbHabit = habitToDbHabit(habit, userId);

			const { error } = await supabase.from("user_habits").insert(dbHabit);

			if (error) throw error;

			// Update local state
			set((state) => ({
				habits: [habit, ...state.habits],
			}));

			console.log("✅ Habit added to database:", habit.name);
		} catch (error: any) {
			console.error("❌ Failed to add habit:", error);
			set({ error: error.message });
		}
	},

	// Update habit - update in DB
	updateHabit: async (id: string, updates: Partial<Habit>) => {
		const userId = get().userId;
		if (!userId) return;

		try {
			const existingHabit = get().getHabit(id);
			if (!existingHabit) return;

			const updatedHabit = {
				...existingHabit,
				...updates,
				updatedAt: new Date(),
			};
			const dbHabit = habitToDbHabit(updatedHabit, userId);

			const { error } = await (supabase.from("user_habits") as any)
				.update(dbHabit)
				.eq("id", id)
				.eq("user_id", userId);

			if (error) throw error;

			// Update local state
			set((state) => ({
				habits: state.habits.map((h) => (h.id === id ? updatedHabit : h)),
			}));

			console.log("✅ Habit updated in database:", id);
		} catch (error: any) {
			console.error("❌ Failed to update habit:", error);
			set({ error: error.message });
		}
	},

	// Delete habit - delete from DB
	deleteHabit: async (id: string) => {
		const userId = get().userId;
		if (!userId) return;

		try {
			// Delete logs first
			await supabase
				.from("habit_logs")
				.delete()
				.eq("habit_id", id)
				.eq("user_id", userId);

			// Delete habit
			const { error } = await supabase
				.from("user_habits")
				.delete()
				.eq("id", id)
				.eq("user_id", userId);

			if (error) throw error;

			// Update local state
			set((state) => ({
				habits: state.habits.filter((h) => h.id !== id),
				logs: state.logs.filter((l) => l.habitId !== id),
			}));

			console.log("✅ Habit deleted from database:", id);
		} catch (error: any) {
			console.error("❌ Failed to delete habit:", error);
			set({ error: error.message });
		}
	},

	getHabit: (id: string) => {
		return get().habits.find((h) => h.id === id);
	},

	// Archive habit
	archiveHabit: async (id: string) => {
		await get().updateHabit(id, {
			isArchived: true,
			archivedAt: new Date(),
		});
	},

	// Unarchive habit
	unarchiveHabit: async (id: string) => {
		await get().updateHabit(id, {
			isArchived: false,
			archivedAt: undefined,
		});
	},

	getActiveHabits: () => {
		return get().habits.filter((h) => !h.isArchived);
	},

	getArchivedHabits: () => {
		return get().habits.filter((h) => h.isArchived);
	},

	// Log habit completion - insert into DB
	logHabitCompletion: async (
		habitId: string,
		value?: number,
		notes?: string
	) => {
		const userId = get().userId;
		if (!userId) return;

		const log: HabitLog = {
			id: generateUUID(),
			habitId,
			completedAt: new Date(),
			value,
			notes,
		};

		try {
			const dbLog = logToDbLog(log, userId);

			const { error } = await supabase.from("habit_logs").insert(dbLog);

			if (error) throw error;

			// Update local state
			set((state) => ({
				logs: [log, ...state.logs],
			}));

			// Recalculate stats
			get().calculateStats(habitId);

			console.log("✅ Habit log added to database");
		} catch (error: any) {
			console.error("❌ Failed to log habit completion:", error);
			set({ error: error.message });
		}
	},

	// Log habit for specific date
	logHabitForDate: async (
		habitId: string,
		date: Date,
		value?: number,
		notes?: string
	) => {
		const userId = get().userId;
		if (!userId) return;

		const targetDate = new Date(date);
		targetDate.setHours(12, 0, 0, 0);

		const log: HabitLog = {
			id: generateUUID(),
			habitId,
			completedAt: targetDate,
			value,
			notes,
		};

		try {
			const dbLog = logToDbLog(log, userId);

			const { error } = await supabase.from("habit_logs").insert(dbLog);

			if (error) throw error;

			set((state) => ({
				logs: [log, ...state.logs],
			}));

			get().calculateStats(habitId);
			console.log("✅ Habit log for date added to database");
		} catch (error: any) {
			console.error("❌ Failed to log habit for date:", error);
			set({ error: error.message });
		}
	},

	// Remove log for date
	removeOneLogForDate: async (habitId: string, date: Date) => {
		const userId = get().userId;
		if (!userId) return;

		// Most recent first, so undo removes the completion just added.
		const logs = get()
			.getLogsForDate(habitId, date)
			.sort(
				(a, b) =>
					new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
			);
		const log = logs[0];
		if (!log) return;

		try {
			const { error } = await supabase
				.from("habit_logs")
				.delete()
				.eq("id", log.id)
				.eq("user_id", userId);
			if (error) throw error;

			set((state) => ({ logs: state.logs.filter((l) => l.id !== log.id) }));
			get().calculateStats(habitId);
		} catch (error: any) {
			console.error("❌ Failed to remove habit log:", error);
			set({ error: error.message });
		}
	},

	removeLogForDate: async (habitId: string, date: Date) => {
		const userId = get().userId;
		if (!userId) return;

		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		// Find the logs to delete
		const logsToDelete = get().logs.filter(
			(l) =>
				l.habitId === habitId &&
				new Date(l.completedAt) >= startOfDay &&
				new Date(l.completedAt) <= endOfDay
		);

		if (logsToDelete.length === 0) return;

		try {
			// Delete from database
			for (const log of logsToDelete) {
				await supabase
					.from("habit_logs")
					.delete()
					.eq("id", log.id)
					.eq("user_id", userId);
			}

			// Update local state
			set((state) => ({
				logs: state.logs.filter(
					(l) =>
						!(
							l.habitId === habitId &&
							new Date(l.completedAt) >= startOfDay &&
							new Date(l.completedAt) <= endOfDay
						)
				),
			}));

			get().calculateStats(habitId);
			console.log("✅ Habit log removed from database");
		} catch (error: any) {
			console.error("❌ Failed to remove log:", error);
			set({ error: error.message });
		}
	},

	// Toggle habit for date
	toggleHabitForDate: async (habitId: string, date: Date) => {
		const { done, target } = get().getProgressForDate(habitId, date);

		// Multi-target habits count up one tap at a time (1/5, 2/5 …). Tapping
		// again once full clears the day, which keeps "tap to undo" working with
		// a single gesture - long-press is already the archive/delete menu.
		if (done >= target) {
			await get().removeLogForDate(habitId, date);
		} else {
			await get().logHabitForDate(habitId, date);
		}
	},

	getHabitLogs: (habitId: string) => {
		return get().logs.filter((l) => l.habitId === habitId);
	},

	getLogsForDate: (habitId: string, date: Date) => {
		const bucket = getLogIndex(get().logs).get(dayKey(habitId, date));
		// Copied: removeOneLogForDate sorts the result, and sort() mutates.
		return bucket ? [...bucket] : [];
	},

	// A "times_per_day" habit is only done when it has been done that many
	// times. Every other frequency needs exactly one completion for the day.
	getProgressForDate: (habitId: string, date: Date) => {
		const habit = get().getHabit(habitId);
		// Straight to the index: this runs once per calendar cell.
		const done =
			getLogIndex(get().logs).get(dayKey(habitId, date))?.length ?? 0;

		if (!habit) return { done, target: 1 };

		const freq = normalizeFrequency(habit.frequency, habit.notificationTime);
		// A day the habit does not run on has no target - it is not a miss.
		if (!isActiveOn(freq, date)) return { done, target: 0 };

		const target = Math.max(
			1,
			freq.perDay.times?.length || freq.perDay.target || 1
		);
		return { done, target };
	},

	// Does this habit run on this date at all? Mon/Wed/Fri habits should not be
	// counted as missed on a Tuesday.
	isHabitActiveOnDate: (habitId: string, date: Date) => {
		const habit = get().getHabit(habitId);
		if (!habit) return false;
		return isActiveOn(
			normalizeFrequency(habit.frequency, habit.notificationTime),
			date
		);
	},

	isHabitCompletedOnDate: (habitId: string, date: Date) => {
		const { done, target } = get().getProgressForDate(habitId, date);
		// target 0 means the habit does not run today; only an actual log counts.
		if (target === 0) return done > 0;
		return done >= target;
	},

	// Stats calculation (runs locally on fetched data)
	//
	// Everything here is per CALENDAR DAY, not per log, and every day is judged
	// against that day's own target:
	//
	//   - A 3x/day habit is "done" for the day at 3 completions, not 1.
	//   - A day the habit does not run on (Mon/Wed/Fri habit on a Tuesday) is
	//     not scheduled at all: it neither counts as a miss nor breaks a streak.
	//
	// The previous version counted raw logs and treated any single log as a
	// completed day, which made a 3x/day habit read 300% and gave every
	// specific-days habit a permanent streak of 1 - a Tuesday always broke it.
	calculateStats: (habitId: string) => {
		const logs = get().getHabitLogs(habitId);
		const habit = get().getHabit(habitId);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Walk back to the habit's creation, capped at a year of history.
		const created = habit?.createdAt ? new Date(habit.createdAt) : today;
		created.setHours(0, 0, 0, 0);
		const earliest = new Date(today);
		earliest.setDate(earliest.getDate() - 364);
		const start = created > earliest ? created : earliest;

		const days: DayProgress[] = [];
		const cursor = new Date(start);
		while (cursor <= today) {
			const date = new Date(cursor);
			const { done, target } = get().getProgressForDate(habitId, date);
			const dayLogs = get().getLogsForDate(habitId, date);
			days.push({
				date: toDateKey(date),
				active: target > 0,
				done,
				target,
				// An inactive day with a log is still a win, just not a required one.
				completed: target > 0 ? done >= target : done > 0,
				value: dayLogs.length ? dayLogs[0].value : undefined,
			});
			cursor.setDate(cursor.getDate() + 1);
		}

		// --- Streaks. Only scheduled days are considered; inactive days are
		// skipped over rather than breaking the run.
		const scheduled = days.filter((d) => d.active);

		let longestStreak = 0;
		let run = 0;
		for (const day of scheduled) {
			if (day.completed) {
				run++;
				if (run > longestStreak) longestStreak = run;
			} else {
				run = 0;
			}
		}

		// Today is still in progress, so an incomplete today does not end the
		// streak - it just does not extend it yet.
		let currentStreak = 0;
		for (let i = scheduled.length - 1; i >= 0; i--) {
			const day = scheduled[i];
			if (day.completed) currentStreak++;
			else if (i === scheduled.length - 1) continue;
			else break;
		}

		// --- Windows. `slice` on a chronological array, so "last 7" really is
		// the last 7 calendar days including today.
		const last30Days = days.slice(-30);
		const last7Days = days.slice(-7);

		const scheduledIn = (window: DayProgress[]) =>
			window.filter((d) => d.active).length;
		const completedIn = (window: DayProgress[]) =>
			window.filter((d) => d.active && d.completed).length;

		const scheduledDays30 = scheduledIn(last30Days);
		const completedDays30 = completedIn(last30Days);
		const scheduledDays7 = scheduledIn(last7Days);
		const completedDays7 = completedIn(last7Days);

		// Rate over days the habit was actually DUE. A weekend-only habit at 2/2
		// is 100%, not 29%.
		const completionRate = scheduledDays30
			? Math.round((completedDays30 / scheduledDays30) * 100)
			: 0;

		const totalScheduled = scheduled.length;
		const totalCompleted = scheduled.filter((d) => d.completed).length;

		// --- Measurable habits are still summarised over raw logs: the value is
		// the point, not the day boundary.
		let totalValue: number | undefined;
		let averageValue: number | undefined;
		let bestValue: number | undefined;

		if (habit?.type === "measurable") {
			const values = logs
				.filter((l) => l.value !== undefined)
				.map((l) => l.value!);
			if (values.length > 0) {
				totalValue = values.reduce((a, b) => a + b, 0);
				averageValue = Math.round((totalValue / values.length) * 10) / 10;
				bestValue =
					habit.targetType === "at_most"
						? Math.min(...values)
						: Math.max(...values);
			}
		}

		const stats: HabitStats = {
			habitId,
			totalCompleted,
			totalScheduled,
			totalLogs: logs.length,
			currentStreak,
			longestStreak,
			completionRate,
			totalValue,
			averageValue,
			bestValue,
			weeklyCompletions: completedDays7,
			monthlyCompletions: completedDays30,
			scheduledDays7,
			scheduledDays30,
			completedDays30,
			last7Days,
			last30Days,
			days,
		};

		set((state) => {
			const newStats = new Map(state.stats);
			newStats.set(habitId, stats);
			return { stats: newStats };
		});

		return stats;
	},

	getAllStats: () => {
		const state = get();
		state.habits.forEach((habit) => {
			state.calculateStats(habit.id);
		});
		return state.stats;
	},

	getOverallStats: () => {
		const state = get();
		const activeHabits = state.getActiveHabits();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let completedToday = 0;
		let totalCompletions = 0;

		activeHabits.forEach((habit) => {
			const logs = state.getHabitLogs(habit.id);
			totalCompletions += logs.length;

			if (state.isHabitCompletedOnDate(habit.id, today)) {
				completedToday++;
			}
		});

		let totalStreak = 0;
		activeHabits.forEach((habit) => {
			const stats = state.stats.get(habit.id);
			if (stats) {
				totalStreak += stats.currentStreak;
			}
		});

		return {
			totalHabits: activeHabits.length,
			completedToday,
			currentOverallStreak:
				activeHabits.length > 0
					? Math.round(totalStreak / activeHabits.length)
					: 0,
			totalCompletions,
		};
	},

	setProfile: (profile: UserProfile) => {
		set({ profile });
	},

	updateProfile: (updates: Partial<UserProfile>) => {
		set((state) => ({
			profile: state.profile
				? { ...state.profile, ...updates, updatedAt: new Date() }
				: null,
		}));
	},

	updateSettings: (updates: Partial<AppSettings>) => {
		set((state) => ({
			settings: { ...state.settings, ...updates },
		}));
	},

	searchHabits: (query: string) => {
		const lowerQuery = query.toLowerCase();
		return get().habits.filter(
			(h) =>
				h.name.toLowerCase().includes(lowerQuery) ||
				h.description?.toLowerCase().includes(lowerQuery) ||
				h.notes?.toLowerCase().includes(lowerQuery)
		);
	},

	// Import data from file - inserts into database
	importData: async (data: {
		habits?: Habit[];
		logs?: HabitLog[];
		profile?: UserProfile | null;
		settings?: AppSettings;
	}) => {
		const userId = get().userId;
		if (!userId) {
			console.error("No user ID - cannot import data");
			return;
		}

		try {
			// Import habits
			if (data.habits && data.habits.length > 0) {
				for (const habit of data.habits) {
					const dbHabit = habitToDbHabit(habit, userId);
					await (supabase.from("user_habits") as any).upsert(dbHabit, {
						onConflict: "id",
					});
				}
			}

			// Import logs
			if (data.logs && data.logs.length > 0) {
				for (const log of data.logs) {
					const dbLog = logToDbLog(log, userId);
					await (supabase.from("habit_logs") as any).upsert(dbLog, {
						onConflict: "id",
					});
				}
			}

			// Update local state
			if (data.profile !== undefined) {
				set({ profile: data.profile });
			}
			if (data.settings) {
				set({ settings: data.settings });
			}

			// Refresh from database to get all imported data
			await get().refreshFromDatabase();

			console.log("✅ Data imported to database successfully");
		} catch (error: any) {
			console.error("❌ Failed to import data:", error);
			set({ error: error.message });
		}
	},

	clearAllData: async () => {
		const { userId } = get();
		if (!userId) {
			console.error("No user ID - cannot clear data");
			return;
		}
		console.log("🗑️ Clearing habit data for user:", userId);

		try {
			// Delete from database with user_id filter
			await Promise.all([
				supabase.from("habit_logs").delete().eq("user_id", userId),
				supabase.from("user_habits").delete().eq("user_id", userId),
			]);

			// Clear local state
			set({
				habits: [],
				logs: [],
				profile: null,
				settings: defaultSettings,
				stats: new Map(),
			});
			console.log("✅ Habit data cleared");
		} catch (error: any) {
			console.error("❌ Failed to clear habit data:", error);
		}
	},
}));
