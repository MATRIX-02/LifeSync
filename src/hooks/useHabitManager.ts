import { useCallback } from "react";

import { useHabitStore } from "../context/habitStore";
import { NotificationService } from "../services/notificationService";
import { Habit, HabitStats } from "../types";
import { generateId } from "../utils/helpers";

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
					const notificationId =
						await NotificationService.scheduleHabitReminder(
							habit.id,
							habit.name,
							habit.notificationTime
						);
					// Store the notification ID for later cancellation
					store.updateHabit(habit.id, { notificationId });
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

			// Cancel old notification if it exists
			if (habit.notificationId) {
				try {
					await NotificationService.cancelNotification(habit.notificationId);
				} catch (error) {
					console.error("Failed to cancel old notification:", error);
				}
			}

			// Reschedule notifications if enabled
			if (notificationEnabled) {
				const timeToUse = notificationTime || habit.notificationTime;
				if (timeToUse) {
					try {
						const newNotificationId =
							await NotificationService.scheduleHabitReminder(
								habitId,
								habit.name,
								timeToUse
							);
						updates.notificationId = newNotificationId;
					} catch (error) {
						console.error("Failed to reschedule notification:", error);
					}
				}
			} else {
				// Clear notification ID if notifications are disabled
				updates.notificationId = undefined;
			}

			store.updateHabit(habitId, updates);
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
		async (habitId: string) => {
			const habit = store.getHabit(habitId);
			// Cancel notification if it exists
			if (habit?.notificationId) {
				try {
					await NotificationService.cancelNotification(habit.notificationId);
				} catch (error) {
					console.error("Failed to cancel notification:", error);
				}
			}
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
