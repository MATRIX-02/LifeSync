import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	Habit,
	HabitLog,
	HabitStats,
	UserProfile,
	AppSettings,
} from "../types";

interface HabitStore {
	// State
	habits: Habit[];
	logs: HabitLog[];
	stats: Map<string, HabitStats>;
	profile: UserProfile | null;
	settings: AppSettings;

	// Habits
	addHabit: (habit: Habit) => void;
	updateHabit: (id: string, updates: Partial<Habit>) => void;
	deleteHabit: (id: string) => void;
	getHabit: (id: string) => Habit | undefined;
	archiveHabit: (id: string) => void;
	unarchiveHabit: (id: string) => void;
	getActiveHabits: () => Habit[];
	getArchivedHabits: () => Habit[];

	// Logs
	logHabitCompletion: (habitId: string, value?: number, notes?: string) => void;
	logHabitForDate: (
		habitId: string,
		date: Date,
		value?: number,
		notes?: string
	) => void;
	removeLogForDate: (habitId: string, date: Date) => void;
	toggleHabitForDate: (habitId: string, date: Date) => void;
	getHabitLogs: (habitId: string) => HabitLog[];
	getLogsForDate: (habitId: string, date: Date) => HabitLog[];
	isHabitCompletedOnDate: (habitId: string, date: Date) => boolean;

	// Stats
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

	// Import/Export
	importData: (data: {
		habits?: Habit[];
		logs?: HabitLog[];
		profile?: UserProfile | null;
		settings?: AppSettings;
	}) => void;
	clearAllData: () => void;
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

export const useHabitStore = create<HabitStore>()(
	persist(
		(set, get) => ({
			habits: [],
			logs: [],
			stats: new Map(),
			profile: null,
			settings: defaultSettings,

			addHabit: (habit: Habit) => {
				set((state) => ({
					habits: [...state.habits, habit],
				}));
			},

			updateHabit: (id: string, updates: Partial<Habit>) => {
				set((state) => ({
					habits: state.habits.map((h) =>
						h.id === id ? { ...h, ...updates, updatedAt: new Date() } : h
					),
				}));
			},

			deleteHabit: (id: string) => {
				set((state) => ({
					habits: state.habits.filter((h) => h.id !== id),
					logs: state.logs.filter((l) => l.habitId !== id),
				}));
			},

			getHabit: (id: string) => {
				return get().habits.find((h) => h.id === id);
			},

			archiveHabit: (id: string) => {
				set((state) => ({
					habits: state.habits.map((h) =>
						h.id === id
							? {
									...h,
									isArchived: true,
									archivedAt: new Date(),
									updatedAt: new Date(),
							  }
							: h
					),
				}));
			},

			unarchiveHabit: (id: string) => {
				set((state) => ({
					habits: state.habits.map((h) =>
						h.id === id
							? {
									...h,
									isArchived: false,
									archivedAt: undefined,
									updatedAt: new Date(),
							  }
							: h
					),
				}));
			},

			getActiveHabits: () => {
				return get().habits.filter((h) => !h.isArchived);
			},

			getArchivedHabits: () => {
				return get().habits.filter((h) => h.isArchived);
			},

			logHabitCompletion: (habitId: string, value?: number, notes?: string) => {
				const log: HabitLog = {
					id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					habitId,
					completedAt: new Date(),
					value,
					notes,
				};
				set((state) => ({
					logs: [...state.logs, log],
				}));
				// Recalculate stats after logging
				get().calculateStats(habitId);
			},

			logHabitForDate: (
				habitId: string,
				date: Date,
				value?: number,
				notes?: string
			) => {
				// Set time to noon of the target date
				const targetDate = new Date(date);
				targetDate.setHours(12, 0, 0, 0);

				const log: HabitLog = {
					id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					habitId,
					completedAt: targetDate,
					value,
					notes,
				};
				set((state) => ({
					logs: [...state.logs, log],
				}));
				get().calculateStats(habitId);
			},

			removeLogForDate: (habitId: string, date: Date) => {
				const startOfDay = new Date(date);
				startOfDay.setHours(0, 0, 0, 0);
				const endOfDay = new Date(date);
				endOfDay.setHours(23, 59, 59, 999);

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
			},

			toggleHabitForDate: (habitId: string, date: Date) => {
				const isCompleted = get().isHabitCompletedOnDate(habitId, date);
				if (isCompleted) {
					get().removeLogForDate(habitId, date);
				} else {
					get().logHabitForDate(habitId, date);
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

			calculateStats: (habitId: string) => {
				const logs = get().getHabitLogs(habitId);
				const habit = get().getHabit(habitId);
				const totalCompleted = logs.length;

				// Calculate current and longest streaks
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

				// Calculate completion rate (last 30 days)
				const completionRate = Math.round((monthlyCompletions / 30) * 100);

				// Calculate measurable stats
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

				// Build last 7 days and 30 days history
				const last7Days: {
					date: string;
					completed: boolean;
					value?: number;
				}[] = [];
				const last30Days: {
					date: string;
					completed: boolean;
					value?: number;
				}[] = [];

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

				// Calculate average streak across all habits
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

			// Import/Export
			importData: (data) =>
				set({
					habits: data.habits ?? [],
					logs: data.logs ?? [],
					profile: data.profile ?? null,
					settings: data.settings ?? defaultSettings,
				}),

			clearAllData: () =>
				set({
					habits: [],
					logs: [],
					profile: null,
					settings: defaultSettings,
				}),
		}),
		{
			name: "habit-tracker-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				habits: state.habits,
				logs: state.logs,
				profile: state.profile,
				settings: state.settings,
			}),
		}
	)
);
