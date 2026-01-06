import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

const NAVIGATION_STATE_KEY = "lifesync_last_route";
const TAB_STATE_KEY = "lifesync_tab_states";

// Routes that should be persisted (only main tabs)
const PERSISTABLE_ROUTES = [
	"/(tabs)",
	"/(tabs)/workout",
	"/(tabs)/finance",
	"/(tabs)/statistics",
	"/(tabs)/profile",
	"/(tabs)/two", // Settings
];

// Routes to ignore (modals, auth screens, etc.)
const IGNORED_ROUTES = ["/modal", "/auth", "/admin", "/subscription"];

/**
 * Hook to persist and restore the last visited route
 * Call this in your root layout
 */
export function useNavigationPersistence() {
	const pathname = usePathname();
	const router = useRouter();
	const hasRestored = useRef(false);
	const isInitialMount = useRef(true);

	// Restore last route on app start
	useEffect(() => {
		const restoreRoute = async () => {
			if (hasRestored.current) return;

			try {
				const lastRoute = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);

				if (
					lastRoute &&
					PERSISTABLE_ROUTES.some((r) => lastRoute.startsWith(r))
				) {
					hasRestored.current = true;
					// Small delay to ensure navigation is ready
					setTimeout(() => {
						router.replace(lastRoute as any);
					}, 100);
				}
			} catch (error) {
				console.log("Error restoring navigation state:", error);
			}

			hasRestored.current = true;
		};

		restoreRoute();
	}, []);

	// Save current route when it changes
	useEffect(() => {
		// Skip initial mount
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}

		const saveRoute = async () => {
			// Only save persistable routes
			const shouldPersist = PERSISTABLE_ROUTES.some((r) =>
				pathname.startsWith(r)
			);
			const shouldIgnore = IGNORED_ROUTES.some((r) => pathname.startsWith(r));

			if (shouldPersist && !shouldIgnore) {
				try {
					await AsyncStorage.setItem(NAVIGATION_STATE_KEY, pathname);
				} catch (error) {
					console.log("Error saving navigation state:", error);
				}
			}
		};

		saveRoute();
	}, [pathname]);
}

/**
 * Get the last visited route (for use outside of hooks)
 */
export async function getLastVisitedRoute(): Promise<string | null> {
	try {
		return await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
	} catch {
		return null;
	}
}

/**
 * Clear the persisted route
 */
export async function clearPersistedRoute(): Promise<void> {
	try {
		await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
	} catch (error) {
		console.log("Error clearing navigation state:", error);
	}
}

/**
 * Hook to persist and restore sub-tab state within a module
 * @param moduleKey - Unique key for the module (e.g., 'finance', 'workout', 'habits')
 * @param defaultTab - Default tab to show if no persisted state exists
 */
export function useTabPersistence<T extends string>(
	moduleKey: string,
	defaultTab: T
): [T, (tab: T) => void, boolean] {
	const [activeTab, setActiveTab] = useState<T>(defaultTab);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load persisted tab on mount
	useEffect(() => {
		const loadTab = async () => {
			try {
				const tabStates = await AsyncStorage.getItem(TAB_STATE_KEY);
				if (tabStates) {
					const parsed = JSON.parse(tabStates);
					if (parsed[moduleKey]) {
						setActiveTab(parsed[moduleKey] as T);
					}
				}
			} catch (error) {
				console.log("Error loading tab state:", error);
			}
			setIsLoaded(true);
		};
		loadTab();
	}, [moduleKey]);

	// Save tab when it changes
	const setAndPersistTab = useCallback(
		async (tab: T) => {
			setActiveTab(tab);
			try {
				const tabStates = await AsyncStorage.getItem(TAB_STATE_KEY);
				const parsed = tabStates ? JSON.parse(tabStates) : {};
				parsed[moduleKey] = tab;
				await AsyncStorage.setItem(TAB_STATE_KEY, JSON.stringify(parsed));
			} catch (error) {
				console.log("Error saving tab state:", error);
			}
		},
		[moduleKey]
	);

	return [activeTab, setAndPersistTab, isLoaded];
}

/**
 * Get persisted tab for a module (for use outside of hooks)
 */
export async function getPersistedTab(
	moduleKey: string
): Promise<string | null> {
	try {
		const tabStates = await AsyncStorage.getItem(TAB_STATE_KEY);
		if (tabStates) {
			const parsed = JSON.parse(tabStates);
			return parsed[moduleKey] || null;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Clear all persisted tab states
 */
export async function clearPersistedTabs(): Promise<void> {
	try {
		await AsyncStorage.removeItem(TAB_STATE_KEY);
	} catch (error) {
		console.log("Error clearing tab states:", error);
	}
}
