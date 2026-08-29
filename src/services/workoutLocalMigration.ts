// One-time migration: push local-only workout data up to Supabase.
//
// `src/context/workoutStoreDB.ts` was a three-line shim re-exporting the legacy
// AsyncStorage store, and Metro resolves "./workoutStoreDB" to that FILE rather
// than the `workoutStoreDB/` directory beside it. So the whole of FitZone ran
// on the legacy store while a complete database-first implementation sat next
// to it as dead code — the same shadowed-module trap that hid the real finance
// store. The shim is gone; this rescues whatever the legacy store left behind.
//
// Everything FitZone recorded lives in the zustand `workout-storage` blob. The
// database-first store has no AsyncStorage persistence, so without this the
// user's plans, sessions and PRs would simply vanish on the next launch.
//
// The blob is deliberately NOT deleted — it stays as a local backup.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncWorkoutsToCloud } from "./syncService";

const LEGACY_STORAGE_KEY = "workout-storage";
const MIGRATION_DONE_KEY_PREFIX = "workout_local_migrated_v1_";

type MigrationResult =
	| { status: "skipped"; reason: string }
	| { status: "migrated"; counts: Record<string, number> }
	| { status: "failed"; error: string };

const countOf = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export const migrateLocalWorkoutToCloud = async (
	userId: string
): Promise<MigrationResult> => {
	if (!userId) return { status: "skipped", reason: "no user id" };

	const doneKey = `${MIGRATION_DONE_KEY_PREFIX}${userId}`;

	try {
		if ((await AsyncStorage.getItem(doneKey)) === "true") {
			return { status: "skipped", reason: "already migrated" };
		}

		const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
		if (!raw) {
			// Nothing was ever persisted locally — mark done so we don't re-check.
			await AsyncStorage.setItem(doneKey, "true");
			return { status: "skipped", reason: "no local workout data" };
		}

		// zustand's persist middleware wraps state as { state, version }.
		const parsed = JSON.parse(raw);
		const state = parsed?.state ?? parsed;
		if (!state || typeof state !== "object") {
			await AsyncStorage.setItem(doneKey, "true");
			return { status: "skipped", reason: "local workout data unreadable" };
		}

		const payload = {
			fitnessProfile: state.fitnessProfile || undefined,
			workoutPlans: state.workoutPlans || [],
			workoutSessions: state.workoutSessions || [],
			personalRecords: state.personalRecords || [],
			bodyMeasurements: state.bodyMeasurements || [],
			bodyWeights: state.bodyWeights || [],
			customExercises: state.customExercises || [],
		};

		const counts = {
			fitnessProfile: payload.fitnessProfile ? 1 : 0,
			workoutPlans: countOf(payload.workoutPlans),
			workoutSessions: countOf(payload.workoutSessions),
			personalRecords: countOf(payload.personalRecords),
			bodyMeasurements: countOf(payload.bodyMeasurements),
			bodyWeights: countOf(payload.bodyWeights),
			customExercises: countOf(payload.customExercises),
		};

		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		if (total === 0) {
			await AsyncStorage.setItem(doneKey, "true");
			return { status: "skipped", reason: "local workout data is empty" };
		}

		console.log("⬆️ Migrating local workout data to cloud:", counts);

		// syncWorkoutsToCloud upserts on `id`, so re-running against rows that
		// already made it up via auto-sync is harmless.
		const result = await syncWorkoutsToCloud(userId, payload);

		if (!result.success) {
			// Do NOT set the done flag — leave the blob and retry next launch.
			console.error("Workout local migration failed:", result.error);
			return { status: "failed", error: result.error || "unknown error" };
		}

		await AsyncStorage.setItem(doneKey, "true");
		console.log("✅ Local workout data migrated to cloud");
		return { status: "migrated", counts };
	} catch (err: any) {
		console.error("Workout local migration threw:", err);
		return { status: "failed", error: err?.message || String(err) };
	}
};

export default migrateLocalWorkoutToCloud;
