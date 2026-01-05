import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { NotificationService } from "../services/notificationService";

export type ModuleType = "habits" | "workout" | "finance";

interface ModuleStore {
	// Module states
	enabledModules: ModuleType[];
	_hasHydrated: boolean;
	setHasHydrated: (state: boolean) => void;
	isModuleEnabled: (module: ModuleType) => boolean;
	toggleModule: (module: ModuleType, enabled: boolean) => Promise<void>;
	getFirstEnabledModule: () => ModuleType;
}

const defaultModules: ModuleType[] = ["habits", "workout", "finance"];

// Create store with persist
const useModuleStoreBase = create<ModuleStore>()(
	persist(
		(set, get) => ({
			enabledModules: defaultModules,
			_hasHydrated: false,

			setHasHydrated: (state: boolean) => {
				set({ _hasHydrated: state });
			},

			isModuleEnabled: (module: ModuleType) => {
				const modules = get().enabledModules;
				return modules ? modules.includes(module) : true; // Default to true
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
					const currentModules = state.enabledModules || [];
					if (enabled) {
						// Add module if not already present
						if (!currentModules.includes(module)) {
							return {
								enabledModules: [...currentModules, module],
							};
						}
					} else {
						// Remove module
						return {
							enabledModules: currentModules.filter((m) => m !== module),
						};
					}
					return state;
				});
			},

			getFirstEnabledModule: () => {
				const modules = get().enabledModules;
				if (!modules || modules.length === 0) return "habits"; // Fallback
				return modules[0];
			},
		}),
		{
			name: "module-store",
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				// Ensure we always have valid data after rehydration
				if (
					state &&
					(!state.enabledModules || state.enabledModules.length === 0)
				) {
					state.enabledModules = defaultModules;
				}
			},
		}
	)
);

// Export with hydration listener
export const useModuleStore = Object.assign(useModuleStoreBase, {
	// Subscribe to hydration
	onFinishHydration: (callback: () => void) => {
		// Check if already hydrated
		if (useModuleStoreBase.persist.hasHydrated()) {
			callback();
			return () => {};
		}
		// Otherwise subscribe
		return useModuleStoreBase.persist.onFinishHydration(callback);
	},
});

// Initialize hydration state - check immediately and also on finish
if (useModuleStoreBase.persist.hasHydrated()) {
	useModuleStoreBase.getState().setHasHydrated(true);
} else {
	useModuleStoreBase.persist.onFinishHydration(() => {
		useModuleStoreBase.getState().setHasHydrated(true);
	});
}
