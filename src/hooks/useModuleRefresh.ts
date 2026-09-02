/**
 * Pull-to-refresh for a module's screen.
 *
 * Returns `{ refreshing, onRefresh }` to hand straight to a RefreshControl.
 *
 * The ordering here is not incidental: queued offline writes are flushed BEFORE
 * the store re-initializes. `initialize()` replaces local state wholesale, so
 * pulling first would overwrite anything the user changed while offline with
 * stale server rows. `useSyncManager.fetchFromCloud` follows the same rule.
 */

import { useCallback, useState } from "react";
import { supabaseDirect } from "../config/supabase";
import { useAuthStore } from "../context/authStore";
import { useFinanceStore } from "../context/financeStoreDB";
import { useHabitStore } from "../context/habitStoreDB";
import { useStudyStore } from "../context/studyStoreDB/index";
import { useWorkoutStore } from "../context/workoutStoreDB";
import { flushQueue } from "../services/writeQueue";

export type RefreshableModule = "habits" | "workout" | "finance" | "study";

export const useModuleRefresh = (module: RefreshableModule) => {
	const [refreshing, setRefreshing] = useState(false);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			// Push before pulling. See the note above.
			try {
				await flushQueue(supabaseDirect);
			} catch (error) {
				console.error("Refresh: queue flush failed, continuing:", error);
			}

			const userId = useAuthStore.getState().user?.id;
			if (!userId) return;

			switch (module) {
				case "habits":
					await useHabitStore.getState().initialize(userId);
					break;
				case "workout":
					await useWorkoutStore.getState().initialize(userId);
					break;
				case "finance":
					await useFinanceStore.getState().initialize(userId);
					// Anything that fell due since the last check posts now too.
					await useFinanceStore.getState().processRecurringTransactions();
					break;
				case "study":
					await useStudyStore.getState().initialize(userId);
					break;
			}
		} catch (error) {
			console.error(`Refresh failed for ${module}:`, error);
		} finally {
			setRefreshing(false);
		}
	}, [module]);

	return { refreshing, onRefresh };
};

export default useModuleRefresh;
