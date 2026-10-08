import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { NotificationService } from "../services/notificationService";

export type ModuleType = "habits" | "workout" | "finance";

interface ModuleStore {
	// Module states
	enabledModules: ModuleType[];
	moduleOrder: ModuleType[];
	_hasHydrated: boolean;
	setHasHydrated: (state: boolean) => void;
	isModuleEnabled: (module: ModuleType) => boolean;
	toggleModule: (module: ModuleType, enabled: boolean) => Promise<void>;
	reorderModules: (modules: ModuleType[]) => void;
	getFirstEnabledModule: () => ModuleType;
	getDefaultModuleRoute: () => string;
}

const defaultModules: ModuleType[] = ["habits", "workout", "finance"];
const moduleRoutes: Record<ModuleType, string> = {
	habits: "/(tabs)",
	workout: "/(tabs)/workout",
	finance: "/(tabs)/finance",
};

// Create store with persist
const useModuleStoreBase = create<ModuleStore>()(
	persist(
		(set, get) => ({
			enabledModules: defaultModules,
			moduleOrder: defaultModules,
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
					// habitStoreDB is the store the app actually uses. This used to
					// read the legacy AsyncStorage `habitStore`, which holds different
					// data, and to schedule via the single-reminder helper - so it
					// ignored frequency, the habit's question, and the alarm/sound
					// flags. scheduleHabitReminders() honours all of them.
					const { useHabitStore } = await import("./habitStoreDB");

					if (enabled) {
						console.log(
							"📅 Re-enabling habits module - rescheduling notifications",
						);
						try {
							const activeHabits = useHabitStore
								.getState()
								.habits.filter(
									(h) =>
										!h.isArchived &&
										h.notificationEnabled &&
										h.notificationTime,
								);

							for (const habit of activeHabits) {
								try {
									await NotificationService.scheduleHabitReminders(habit);
									console.log(
										`✅ Rescheduled reminders for habit: ${habit.name}`,
									);
								} catch (error) {
									console.error(
										`Failed to reschedule notification for ${habit.name}:`,
										error,
									);
								}
							}
						} catch (error) {
							console.error("Failed to reschedule habit notifications:", error);
						}
					} else {
						console.log(
							"🗑️  Disabling habits module - canceling all notifications",
						);
						try {
							// Cancels by matching data.habitId, so it catches every
							// reminder a habit owns - not just one stored id. It also
							// leaves bill, water and timer reminders alone.
							await NotificationService.cancelAllHabitNotifications();
							console.log("✅ Canceled all habit reminders");
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

			reorderModules: (modules) => {
				const ordered = Array.from(new Set(modules)).filter((module) =>
					defaultModules.includes(module),
				);
				set({
					moduleOrder: [
						...ordered,
						...defaultModules.filter((module) => !ordered.includes(module)),
					],
				});
			},

			getFirstEnabledModule: () => {
				const { enabledModules, moduleOrder } = get();
				return (
					moduleOrder.find((module) => enabledModules.includes(module)) ||
					"habits"
				);
			},

			getDefaultModuleRoute: () => moduleRoutes[get().getFirstEnabledModule()],
		}),
		{
			name: "module-store",
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				// Drop modules that no longer exist (Study Hub was removed).
				if (state && Array.isArray(state.enabledModules)) {
					state.enabledModules = state.enabledModules.filter((m) =>
						defaultModules.includes(m),
					);
				}
				// Ensure we always have valid data after rehydration
				if (
					state &&
					(!state.enabledModules || state.enabledModules.length === 0)
				) {
					state.enabledModules = defaultModules;
				} else if (state && state.enabledModules) {
					// Merge in any new default modules that were added
					const newModules = defaultModules.filter(
						(m) => !state.enabledModules.includes(m),
					);
					if (newModules.length > 0) {
						state.enabledModules = [...state.enabledModules, ...newModules];
					}
				}
				if (state) {
					const savedOrder = Array.isArray(state.moduleOrder)
						? state.moduleOrder
						: state.enabledModules;
					const orderedModules = Array.from(new Set(savedOrder)).filter(
						(module): module is ModuleType => defaultModules.includes(module),
					);
					state.moduleOrder = [
						...orderedModules,
						...defaultModules.filter(
							(module) => !orderedModules.includes(module),
						),
					];
				}
			},
		},
	),
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
