// One-time migration: push local-only finance data up to Supabase.
//
// Before the database-first finance store was wired in, recurring transactions,
// budgets, savings goals, bill reminders, debts and split groups were mutated
// locally only — they lived in the zustand `finance-storage` AsyncStorage blob
// and never reached the cloud unless the user manually hit "Sync to Cloud".
//
// The database-first store has no AsyncStorage persistence, so anything still
// sitting in that blob would become invisible the moment we switch. This runs
// once per user, before the store initializes, and pushes the blob to Supabase
// so nothing is stranded.
//
// The blob is deliberately NOT deleted — it stays as a local backup.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncFinanceToCloud } from "./syncService";

const LEGACY_STORAGE_KEY = "finance-storage";
const MIGRATION_DONE_KEY_PREFIX = "finance_local_migrated_v1_";

type MigrationResult =
	| { status: "skipped"; reason: string }
	| { status: "migrated"; counts: Record<string, number> }
	| { status: "failed"; error: string };

const countOf = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export const migrateLocalFinanceToCloud = async (
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
			return { status: "skipped", reason: "no local finance data" };
		}

		// zustand's persist middleware wraps state as { state, version }.
		const parsed = JSON.parse(raw);
		const state = parsed?.state ?? parsed;
		if (!state || typeof state !== "object") {
			await AsyncStorage.setItem(doneKey, "true");
			return { status: "skipped", reason: "local finance data unreadable" };
		}

		const payload = {
			accounts: state.accounts || [],
			transactions: state.transactions || [],
			recurringTransactions: state.recurringTransactions || [],
			budgets: state.budgets || [],
			savingsGoals: state.savingsGoals || [],
			billReminders: state.billReminders || [],
			debts: state.debts || [],
			splitGroups: state.splitGroups || [],
			currency: state.currency || "₹",
		};

		const counts = {
			accounts: countOf(payload.accounts),
			transactions: countOf(payload.transactions),
			recurringTransactions: countOf(payload.recurringTransactions),
			budgets: countOf(payload.budgets),
			savingsGoals: countOf(payload.savingsGoals),
			billReminders: countOf(payload.billReminders),
			debts: countOf(payload.debts),
			splitGroups: countOf(payload.splitGroups),
		};

		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		if (total === 0) {
			await AsyncStorage.setItem(doneKey, "true");
			return { status: "skipped", reason: "local finance data is empty" };
		}

		console.log("⬆️ Migrating local finance data to cloud:", counts);

		// syncFinanceToCloud upserts on `id`, so re-running against rows that
		// already made it up is harmless.
		const result = await syncFinanceToCloud(userId, payload);

		if (!result.success) {
			// Do NOT set the done flag — leave the blob and retry next launch.
			console.error("Finance local migration failed:", result.error);
			return { status: "failed", error: result.error || "unknown error" };
		}

		await AsyncStorage.setItem(doneKey, "true");
		console.log("✅ Local finance data migrated to cloud");
		return { status: "migrated", counts };
	} catch (err: any) {
		console.error("Finance local migration threw:", err);
		return { status: "failed", error: err?.message || String(err) };
	}
};

export default migrateLocalFinanceToCloud;
