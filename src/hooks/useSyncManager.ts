// Sync Manager Hook - Manages data synchronization between local stores and Supabase
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "../context/authStore";
import { useFinanceStore } from "../context/financeStoreDB";
import { useHabitStore } from "../context/habitStoreDB";
import { useStudyStore } from "../context/studyStoreDB/index";
import { useWorkoutStore } from "../context/workoutStoreDB";
import { migrateLocalFinanceToCloud } from "../services/financeLocalMigration";
import { migrateLocalWorkoutToCloud } from "../services/workoutLocalMigration";
import { buildSyncPayload } from "../services/syncPayload";
import {
	flushQueue,
	getQueueState,
	hydrateQueueState,
} from "../services/writeQueue";
import { supabaseDirect } from "../config/supabase";
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
	const lastFetchAtRef = useRef(0);
	const appStateRef = useRef<AppStateStatus>(AppState.currentState);
	const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isInitialFetch = useRef(true);

	// Fetch all data from cloud
	const fetchFromCloud = useCallback(async () => {
		if (!user?.id) return;

		setSyncState((prev) => ({ ...prev, isFetching: true, status: "syncing" }));

		try {
			console.log("📥 Fetching data from cloud (database-first)...");

			// These three run BEFORE initialize because initialize() replaces
			// local state wholesale - fetching first would overwrite un-synced
			// edits and strand anything still in the legacy AsyncStorage blobs.
			//
			// Each is isolated: a failure here must never stop the stores from
			// initializing, because that would leave the app with no userId and
			// every write refusing to run.
			try {
				await flushQueue(supabaseDirect);
			} catch (error) {
				console.error("Offline queue flush failed, continuing:", error);
			}
			try {
				await migrateLocalFinanceToCloud(user.id);
			} catch (error) {
				console.error("Finance local migration failed, continuing:", error);
			}
			try {
				await migrateLocalWorkoutToCloud(user.id);
			} catch (error) {
				console.error("Workout local migration failed, continuing:", error);
			}

			// Initialize all stores from database in parallel (database-first approach)
			await Promise.all([
				habitStore.initialize(user.id),
				workoutStore.initialize(user.id),
				financeStore.initialize(user.id),
			]);

			// Post any recurring transactions that have come due. Must run AFTER
			// initialize, which is what loads the recurring rules; it is guarded
			// against overlapping runs and is a no-op when nothing is due.
			try {
				await financeStore.processRecurringTransactions();
			} catch (error) {
				console.error("Error posting recurring transactions:", error);
			}

			setSyncState({
				status: "success",
				lastSynced: new Date(),
				error: null,
				isFetching: false,
			});

			lastFetchAtRef.current = Date.now();
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

	// Bind the signed-in user to the stores IMMEDIATELY, before any fetching.
	//
	// The stores' mutators refuse to write without a userId, and until now the
	// only thing that set it was initialize() - which sits at the end of
	// fetchFromCloud, behind a queue flush and two migrations. Anything the user
	// did in that window failed with "No user ID - cannot add habit" and was
	// silently dropped. Binding the id up front closes that window entirely.
	useEffect(() => {
		if (!isInitialized) return;
		const id = user?.id ?? null;
		useHabitStore.getState().setUserId(id);
		useWorkoutStore.getState().setUserId(id);
		useFinanceStore.getState().setUserId(id);
		useStudyStore.getState().setUserId(id);
	}, [isInitialized, user?.id]);

	// Initial fetch when user logs in
	useEffect(() => {
		if (isInitialized && user?.id && !hasFetchedRef.current) {
			hasFetchedRef.current = true;
			isInitialFetch.current = true;
			fetchFromCloud()
				.catch(() => {
					// fetchFromCloud already records the error in syncState; a rejection
					// here must not leave isInitialFetch stuck on.
				})
				.finally(() => {
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

	// Replay queued writes: once at startup, then on a timer for as long as a
	// backlog remains. There is no NetInfo dependency in this project, so
	// "are we back online?" is answered by simply trying again.
	useEffect(() => {
		if (!isInitialized || !user?.id) return;

		let cancelled = false;
		hydrateQueueState().then(() => {
			if (!cancelled) flushQueue(supabaseDirect);
		});

		const interval = setInterval(() => {
			const { pending, flushing } = getQueueState();
			if (pending > 0 && !flushing) flushQueue(supabaseDirect);
		}, 30_000);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [isInitialized, user?.id]);

	// Recurring transactions also come due while the app is simply left open,
	// so a launch/resume check alone would miss a midnight rollover. Reading
	// through getState() keeps this out of the render dependency chain.
	useEffect(() => {
		if (!isInitialized || !user?.id) return;

		const interval = setInterval(() => {
			useFinanceStore
				.getState()
				.processRecurringTransactions()
				.catch((error: unknown) =>
					console.error("Error posting recurring transactions:", error)
				);
		}, 60 * 60 * 1000);

		return () => clearInterval(interval);
	}, [isInitialized, user?.id]);

	// Sync when app comes to foreground
	useEffect(() => {
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			const previous = appStateRef.current;
			appStateRef.current = nextAppState;

			if (nextAppState !== "active" || !user?.id || !hasFetchedRef.current) {
				return;
			}
			// Only on a real background -> active transition. A permission dialog or
			// notification shade flips state to "inactive" and back, which would
			// otherwise trigger a refetch storm.
			if (previous === "active") return;
			// A backlog should go up on every foreground, even when the fetch
			// throttle below skips the pull.
			if (getQueueState().pending > 0) flushQueue(supabaseDirect);

			// And not more than once every 30s.
			if (Date.now() - lastFetchAtRef.current < 30_000) return;

			fetchFromCloud();
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
