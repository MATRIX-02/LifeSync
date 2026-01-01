import { useCallback } from "react";

import { Habit, HabitStats } from "../types";
import { generateId } from "../utils/helpers";
import { NotificationService } from "../services/notificationService";
import { useHabitStore } from "../context/habitStore";

export const useHabitManager = () => {
	const store = useHabitStore();

	const createHabit = useCallback(
		async (habitData: Omit<Habit, "id" | "createdAt" | "updatedAt">) => {
			const habit: Habit = {
				id: generateId("habit"),
				...habitData,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			store.addHabit(habit);

			// Schedule notification if enabled
			if (habit.notificationEnabled && habit.notificationTime) {
				try {
					await NotificationService.scheduleHabitReminder(
						habit.id,
						habit.name,
						habit.notificationTime
					);
				} catch (error) {
					console.error("Failed to schedule notification:", error);
				}
			}

			return habit;
		},
		[store]
	);

	const updateHabitNotification = useCallback(
		async (
			habitId: string,
			notificationEnabled: boolean,
			notificationTime?: string
		) => {
			const habit = store.getHabit(habitId);
			if (!habit) return;

			const updates: Partial<Habit> = {
				notificationEnabled,
				updatedAt: new Date(),
			};

			if (notificationTime) {
				updates.notificationTime = notificationTime;
			}

			store.updateHabit(habitId, updates);

			// Reschedule notifications
			if (notificationEnabled) {
				const timeToUse = notificationTime || habit.notificationTime;
				if (timeToUse) {
					try {
						await NotificationService.scheduleHabitReminder(
							habitId,
							habit.name,
							timeToUse
						);
					} catch (error) {
						console.error("Failed to reschedule notification:", error);
					}
				}
			}
		},
		[store]
	);

	const completeHabit = useCallback(
		(habitId: string, value?: number, notes?: string) => {
			store.logHabitCompletion(habitId, value, notes);
			store.calculateStats(habitId);
		},
		[store]
	);

	const deleteHabitPermanently = useCallback(
		(habitId: string) => {
			store.deleteHabit(habitId);
		},
		[store]
	);

	const getHabitStats = useCallback(
		(habitId: string): HabitStats | undefined => {
			return store.stats.get(habitId) || store.calculateStats(habitId);
		},
		[store]
	);

	return {
		habits: store.habits,
		createHabit,
		updateHabitNotification,
		completeHabit,
		deleteHabitPermanently,
		getHabitStats,
		getHabit: store.getHabit,
	};
};
