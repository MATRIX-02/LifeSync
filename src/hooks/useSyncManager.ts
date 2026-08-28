// Sync Manager Hook - Manages data synchronization between local stores and Supabase
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "../context/authStore";
import { useFinanceStore } from "../context/financeStoreDB";
import { useHabitStore } from "../context/habitStoreDB";
import { useWorkoutStore } from "../context/workoutStoreDB";
import { buildSyncPayload } from "../services/syncPayload";
import {
	getAutoSyncEnabled,
	isAutoSyncRunning,
	startAutoSync,
	stopAutoSync,
	SyncStatus,
} from "../services/syncService";

interface SyncState {
	status: SyncStatus;
	lastSynced: Date | null;
	error: string | null;
	isFetching: boolean;
}

export const useSyncManager = () => {
	const { user, isInitialized } = useAuthStore();
	const habitStore = useHabitStore();
	const workoutStore = useWorkoutStore();
	const financeStore = useFinanceStore();

	const [syncState, setSyncState] = useState<SyncState>({
		status: "idle",
		lastSynced: null,
		error: null,
		isFetching: false,
	});

	const hasFetchedRef = useRef(false);
	const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isInitialFetch = useRef(true);

	// Fetch all data from cloud
	const fetchFromCloud = useCallback(async () => {
		if (!user?.id) return;

		setSyncState((prev) => ({ ...prev, isFetching: true, status: "syncing" }));

		try {
			console.log("📥 Fetching data from cloud (database-first)...");

			// Initialize all stores from database in parallel (database-first approach)
			await Promise.all([
				habitStore.initialize(user.id),
				workoutStore.initialize(user.id),
				financeStore.initialize(user.id),
			]);

			setSyncState({
				status: "success",
				lastSynced: new Date(),
				error: null,
				isFetching: false,
			});

			console.log("✅ Cloud fetch complete");
		} catch (error: any) {
			console.error("❌ Cloud fetch error:", error);
			setSyncState({
				status: "error",
				lastSynced: null,
				error: error.message,
				isFetching: false,
			});
		}
	}, [user?.id, habitStore, workoutStore, financeStore]);

	// Sync all data to cloud - Now all stores are database-first
	// This is essentially a no-op since all operations already write to DB
	const syncToCloud = useCallback(async () => {
		if (!user?.id) return;

		setSyncState((prev) => ({ ...prev, status: "syncing" }));

		try {
			console.log("📤 All stores are database-first - data already synced!");

			// All stores (habits, workout, finance) are now database-first
			// Every operation writes directly to Supabase, so there's nothing to sync

			setSyncState({
				status: "success",
				lastSynced: new Date(),
				error: null,
				isFetching: false,
			});

			console.log("✅ Cloud sync complete");
		} catch (error: any) {
			console.error("❌ Cloud sync error:", error);
			setSyncState((prev) => ({
				...prev,
				status: "error",
				error: error.message,
			}));
		}
	}, [user?.id]);

	// Debounced sync - waits for user to stop making changes before syncing
	const debouncedSync = useCallback(() => {
		if (syncTimeoutRef.current) {
			clearTimeout(syncTimeoutRef.current);
		}
		syncTimeoutRef.current = setTimeout(() => {
			syncToCloud();
		}, 5000); // 5 second debounce
	}, [syncToCloud]);

	// Initial fetch when user logs in
	useEffect(() => {
		if (isInitialized && user?.id && !hasFetchedRef.current) {
			hasFetchedRef.current = true;
			isInitialFetch.current = true;
			fetchFromCloud().then(() => {
				isInitialFetch.current = false;
			});
		}

		// Reset when user logs out
		if (!user) {
			hasFetchedRef.current = false;
		}
	}, [isInitialized, user?.id, fetchFromCloud]);

	// Auto-sync when data changes (after initial fetch)
	useEffect(() => {
		if (!user?.id || !hasFetchedRef.current || isInitialFetch.current) return;

		// Debounced sync on data changes
		debouncedSync();

		return () => {
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}
		};
	}, [
		user?.id,
		// Watch for changes in store data
		habitStore.habits,
		habitStore.logs,
		workoutStore.workoutPlans,
		workoutStore.workoutSessions,
		workoutStore.fitnessProfile,
		financeStore.accounts,
		financeStore.transactions,
		financeStore.budgets,
		debouncedSync,
	]);

	// Sync when app comes to foreground
	useEffect(() => {
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (nextAppState === "active" && user?.id && hasFetchedRef.current) {
				// Fetch latest data when app comes to foreground
				fetchFromCloud();
			}
		};

		const subscription = AppState.addEventListener(
			"change",
			handleAppStateChange
		);

		return () => {
			subscription.remove();
		};
	}, [user?.id, fetchFromCloud]);

	// Resume auto-sync on app launch if the user had it enabled.
	// The timer lives in module scope in syncService and does not survive a
	// process restart, so without this it silently stays off after every
	// cold start until the user toggles it again in Settings.
	useEffect(() => {
		if (!isInitialized || !user?.id) return;
		let cancelled = false;

		(async () => {
			if (isAutoSyncRunning()) return;
			const enabled = await getAutoSyncEnabled();
			if (!enabled || cancelled || isAutoSyncRunning()) return;
			try {
				// immediate=false: the initial cloud fetch already ran on login.
				await startAutoSync(user.id, buildSyncPayload, false);
				console.log("🔁 Auto-sync resumed from saved preference");
			} catch (err) {
				console.error("Failed to resume auto-sync:", err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isInitialized, user?.id]);

	// Stop auto-sync on sign-out so it can't keep pushing under a stale user id.
	useEffect(() => {
		if (isInitialized && !user && isAutoSyncRunning()) {
			stopAutoSync(false);
		}
	}, [isInitialized, user]);

	// Manual refresh
	const refresh = useCallback(async () => {
		if (!user?.id) return;
		await fetchFromCloud();
	}, [user?.id, fetchFromCloud]);

	// Force sync now
	const syncNow = useCallback(async () => {
		if (!user?.id) return;
		if (syncTimeoutRef.current) {
			clearTimeout(syncTimeoutRef.current);
		}
		await syncToCloud();
	}, [user?.id, syncToCloud]);

	return {
		syncState,
		refresh,
		syncNow,
		isSyncing: syncState.status === "syncing",
		isFetching: syncState.isFetching,
	};
};

export default useSyncManager;
