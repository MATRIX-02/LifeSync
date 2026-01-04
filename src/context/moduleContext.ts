import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { NotificationService } from "../services/notificationService";

export type ModuleType = "habits" | "workout" | "finance";

interface ModuleStore {
	// Module states
	enabledModules: ModuleType[];
	isModuleEnabled: (module: ModuleType) => boolean;
	toggleModule: (module: ModuleType, enabled: boolean) => Promise<void>;
	getFirstEnabledModule: () => ModuleType;
}

const defaultModules: ModuleType[] = ["habits", "workout", "finance"];

export const useModuleStore = create<ModuleStore>()(
	persist(
		(set, get) => ({
			enabledModules: defaultModules,

			isModuleEnabled: (module: ModuleType) => {
				return get().enabledModules.includes(module);
			},

			toggleModule: async (module: ModuleType, enabled: boolean) => {
				// Handle notification state when toggling habits module
				if (module === "habits") {
					if (enabled) {
						// Re-enable habits: reschedule all habit notifications
						console.log(
							"📅 Re-enabling habits module - rescheduling notifications"
						);
						try {
							// Dynamically import to avoid circular dependencies
							const { useHabitStore } = await import("./habitStore");
							const { habits } = useHabitStore.getState();
							const activeHabits = habits.filter(
								(h) =>
									!h.isArchived && h.notificationEnabled && h.notificationTime
							);

							for (const habit of activeHabits) {
								try {
									const notificationId =
										await NotificationService.scheduleHabitReminder(
											habit.id,
											habit.name,
											habit.notificationTime!
										);
									useHabitStore.getState().updateHabit(habit.id, {
										notificationId,
									});
									console.log(
										`✅ Rescheduled notification for habit: ${habit.name}`
									);
								} catch (error) {
									console.error(
										`Failed to reschedule notification for ${habit.name}:`,
										error
									);
								}
							}
						} catch (error) {
							console.error("Failed to reschedule habit notifications:", error);
						}
					} else {
						// Disable habits: cancel all habit notifications
						console.log(
							"🗑️  Disabling habits module - canceling all notifications"
						);
						try {
							const { useHabitStore } = await import("./habitStore");
							const { habits } = useHabitStore.getState();

							for (const habit of habits) {
								if (habit.notificationId) {
									try {
										await NotificationService.cancelNotification(
											habit.notificationId
										);
										useHabitStore.getState().updateHabit(habit.id, {
											notificationId: undefined,
										});
										console.log(
											`✅ Canceled notification for habit: ${habit.name}`
										);
									} catch (error) {
										console.error(
											`Failed to cancel notification for ${habit.name}:`,
											error
										);
									}
								}
							}
						} catch (error) {
							console.error("Failed to cancel habit notifications:", error);
						}
					}
				}

				set((state) => {
					if (enabled) {
						// Add module if not already present
						if (!state.enabledModules.includes(module)) {
							return {
								enabledModules: [...state.enabledModules, module],
							};
						}
					} else {
						// Remove module
						return {
							enabledModules: state.enabledModules.filter((m) => m !== module),
						};
					}
					return state;
				});
			},

			getFirstEnabledModule: () => {
				const modules = get().enabledModules;
				if (modules.length === 0) return "habits"; // Fallback
				return modules[0];
			},
		}),
		{
			name: "module-store",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
