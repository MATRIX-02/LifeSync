// Database-first Habit Store - All operations go through Supabase
import { create } from "zustand";
import { supabase } from "../config/supabase";
import {
	AppSettings,
	FrequencyConfig,
	Habit,
	HabitLog,
	HabitStats,
	UserProfile,
} from "../types";

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
	// Reconstruct frequency object
	habit.frequency = {
		type: habit.frequencyType || "daily",
		value: habit.frequencyValue || 1,
		secondValue: habit.frequencySecondValue,
		days: habit.frequencyDays || [],
	} as FrequencyConfig;
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
	return objectToSnakeCase({
		...rest,
		frequencyType: frequency?.type || "daily",
		frequencyValue: frequency?.value || 1,
		frequencySecondValue: frequency?.secondValue,
		frequencyDays: frequency?.days || [],
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
			id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
			id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
		const isCompleted = get().isHabitCompletedOnDate(habitId, date);
		if (isCompleted) {
			await get().removeLogForDate(habitId, date);
		} else {
			await get().logHabitForDate(habitId, date);
		}
	},

	getHabitLogs: (habitId: string) => {
		return get().logs.filter((l) => l.habitId === habitId);
	},

	getLogsForDate: (habitId: string, date: Date) => {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		return get().logs.filter(
			(l) =>
				l.habitId === habitId &&
				new Date(l.completedAt) >= startOfDay &&
				new Date(l.completedAt) <= endOfDay
		);
	},

	isHabitCompletedOnDate: (habitId: string, date: Date) => {
		const logs = get().getLogsForDate(habitId, date);
		return logs.length > 0;
	},

	// Stats calculation (runs locally on fetched data)
	calculateStats: (habitId: string) => {
		const logs = get().getHabitLogs(habitId);
		const habit = get().getHabit(habitId);
		const totalCompleted = logs.length;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Get unique completion dates
		const completionDates = new Set(
			logs.map((l) => {
				const d = new Date(l.completedAt);
				d.setHours(0, 0, 0, 0);
				return d.getTime();
			})
		);

		// Calculate current streak
		let currentStreak = 0;
		let checkDate = new Date(today);

		while (completionDates.has(checkDate.getTime())) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		}

		// Calculate longest streak
		let longestStreak = 0;
		let tempStreak = 0;
		const sortedDates = Array.from(completionDates).sort((a, b) => a - b);

		for (let i = 0; i < sortedDates.length; i++) {
			if (i === 0) {
				tempStreak = 1;
			} else {
				const diff =
					(sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
				if (diff === 1) {
					tempStreak++;
				} else {
					longestStreak = Math.max(longestStreak, tempStreak);
					tempStreak = 1;
				}
			}
		}
		longestStreak = Math.max(longestStreak, tempStreak);

		// Calculate weekly and monthly completions
		const oneWeekAgo = new Date(today);
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		const oneMonthAgo = new Date(today);
		oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

		const weeklyCompletions = logs.filter(
			(l) => new Date(l.completedAt) >= oneWeekAgo
		).length;

		const monthlyCompletions = logs.filter(
			(l) => new Date(l.completedAt) >= oneMonthAgo
		).length;

		const completionRate = Math.round((monthlyCompletions / 30) * 100);

		// Measurable stats
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

		// Build history
		const last7Days: { date: string; completed: boolean; value?: number }[] =
			[];
		const last30Days: { date: string; completed: boolean; value?: number }[] =
			[];

		for (let i = 0; i < 30; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0];
			const dayLogs = get().getLogsForDate(habitId, date);
			const completed = dayLogs.length > 0;
			const value = dayLogs.length > 0 ? dayLogs[0].value : undefined;

			const dayData = { date: dateStr, completed, value };
			last30Days.push(dayData);
			if (i < 7) {
				last7Days.push(dayData);
			}
		}

		const stats: HabitStats = {
			habitId,
			totalCompleted,
			currentStreak,
			longestStreak,
			completionRate,
			totalValue,
			averageValue,
			bestValue,
			weeklyCompletions,
			monthlyCompletions,
			last7Days,
			last30Days,
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
