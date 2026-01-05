// Cloud Sync Service - Syncs all user data to Supabase
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../config/supabase";

// Types for sync status
export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type SyncModule = "profile" | "habits" | "workouts" | "finance" | "all";

interface SyncResult {
	success: boolean;
	module: SyncModule;
	error?: string;
	timestamp?: string;
}

// Helper: Convert camelCase to snake_case
const toSnakeCase = (str: string): string => {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Helper: Convert object keys from camelCase to snake_case
const objectToSnakeCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
	// Handle Date objects - convert to ISO string
	if (obj instanceof Date) return obj.toISOString();
	if (typeof obj !== "object") return obj;

	const snakeCaseObj: any = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const value = obj[key];
			// Skip undefined values and convert Date objects
			if (value === undefined) continue;
			if (value instanceof Date) {
				snakeCaseObj[toSnakeCase(key)] = value.toISOString();
			} else {
				snakeCaseObj[toSnakeCase(key)] = objectToSnakeCase(value);
			}
		}
	}
	return snakeCaseObj;
};

// Helper: Convert snake_case to camelCase
const toCamelCase = (str: string): string => {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper: Convert object keys from snake_case to camelCase
const objectToCamelCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToCamelCase);
	if (typeof obj !== "object") return obj;

	const camelCaseObj: any = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			camelCaseObj[toCamelCase(key)] = objectToCamelCase(obj[key]);
		}
	}
	return camelCaseObj;
};

// Compress image before upload
export const compressImage = async (
	uri: string,
	maxWidth: number = 400,
	quality: number = 0.7
): Promise<string> => {
	try {
		const result = await ImageManipulator.manipulateAsync(
			uri,
			[{ resize: { width: maxWidth } }],
			{ compress: quality, format: ImageManipulator.SaveFormat.JPEG }
		);
		return result.uri;
	} catch (error) {
		console.error("Image compression failed:", error);
		return uri; // Return original if compression fails
	}
};

// Upload image to Supabase Storage
export const uploadAvatar = async (
	userId: string,
	imageUri: string
): Promise<string | null> => {
	try {
		// Compress the image first
		const compressedUri = await compressImage(imageUri, 300, 0.6);

		// Read file as base64
		const base64 = await FileSystem.readAsStringAsync(compressedUri, {
			encoding: "base64" as any,
		});

		const fileName = `${userId}/avatar_${Date.now()}.jpg`;

		// Upload to Supabase Storage
		const { data, error } = await supabase.storage
			.from("avatars")
			.upload(fileName, decode(base64), {
				contentType: "image/jpeg",
				upsert: true,
			});

		if (error) {
			console.error("Avatar upload error:", error);
			return null;
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("avatars").getPublicUrl(fileName);

		return publicUrl;
	} catch (error) {
		console.error("Avatar upload failed:", error);
		return null;
	}
};

// ============ PROFILE SYNC ============
export const syncProfileToCloud = async (
	userId: string,
	profileData: {
		name: string;
		email?: string;
		bio?: string;
		avatar?: string;
	}
): Promise<SyncResult> => {
	try {
		let avatarUrl = profileData.avatar;

		// Upload avatar if it's a local file
		if (
			profileData.avatar &&
			(profileData.avatar.startsWith("file://") ||
				profileData.avatar.startsWith("content://"))
		) {
			const uploadedUrl = await uploadAvatar(userId, profileData.avatar);
			if (uploadedUrl) {
				avatarUrl = uploadedUrl;
			}
		}

		const { error } = await (supabase.from("profiles") as any)
			.update({
				full_name: profileData.name,
				bio: profileData.bio,
				avatar_url: avatarUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("user_id", userId);

		if (error) throw error;

		return {
			success: true,
			module: "profile",
			timestamp: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Profile sync error:", error);
		return { success: false, module: "profile", error: error.message };
	}
};

export const fetchProfileFromCloud = async (
	userId: string
): Promise<{ data: any; error?: string }> => {
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.eq("user_id", userId)
			.single();

		if (error) throw error;
		return { data };
	} catch (error: any) {
		return { data: null, error: error.message };
	}
};

// ============ HABITS SYNC ============
export const syncHabitsToCloud = async (
	userId: string,
	habitsData: {
		habits: any[];
		logs: any[];
		settings?: any;
	}
): Promise<SyncResult> => {
	try {
		// Upsert habits
		if (habitsData.habits.length > 0) {
			const habitsWithUser = habitsData.habits.map((habit) => {
				// Flatten frequency object to match database columns
				const { frequency, ...restHabit } = habit;
				const flattenedHabit = {
					...restHabit,
					frequency_type: frequency?.type || "daily",
					frequency_value: frequency?.value || 1,
					frequency_second_value: frequency?.secondValue,
					frequency_days: frequency?.days || [],
					user_id: userId,
					synced_at: new Date().toISOString(),
					// Map isArchived to archived
					archived: habit.isArchived || false,
				};
				// Remove isArchived since we mapped it to archived
				delete flattenedHabit.isArchived;
				return objectToSnakeCase(flattenedHabit);
			});

			const { error: habitsError } = await (
				supabase.from("user_habits") as any
			).upsert(habitsWithUser, { onConflict: "id" });

			if (habitsError) throw habitsError;
		}

		// Upsert logs (batch in chunks to avoid payload limits)
		if (habitsData.logs.length > 0) {
			const logsWithUser = habitsData.logs.map((log) =>
				objectToSnakeCase({
					...log,
					user_id: userId,
				})
			);

			// Batch in chunks of 500
			const chunkSize = 500;
			for (let i = 0; i < logsWithUser.length; i += chunkSize) {
				const chunk = logsWithUser.slice(i, i + chunkSize);
				const { error: logsError } = await (
					supabase.from("habit_logs") as any
				).upsert(chunk, { onConflict: "id" });

				if (logsError) throw logsError;
			}
		}

		// Update sync timestamp
		await (supabase.from("user_sync_status") as any).upsert(
			{
				user_id: userId,
				habits_synced_at: new Date().toISOString(),
			},
			{ onConflict: "user_id" }
		);

		return {
			success: true,
			module: "habits",
			timestamp: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Habits sync error:", error);
		return { success: false, module: "habits", error: error.message };
	}
};

export const fetchHabitsFromCloud = async (
	userId: string
): Promise<{ data: { habits: any[]; logs: any[] }; error?: string }> => {
	try {
		const { data: habits, error: habitsError } = await supabase
			.from("user_habits")
			.select("*")
			.eq("user_id", userId)
			.order("created_at", { ascending: false });

		if (habitsError) throw habitsError;

		const { data: logs, error: logsError } = await supabase
			.from("habit_logs")
			.select("*")
			.eq("user_id", userId)
			.order("timestamp", { ascending: false });

		if (logsError) throw logsError;

		// Convert snake_case to camelCase and reconstruct frequency object
		const habitsConverted = (habits || []).map((habit: any) => {
			const converted = objectToCamelCase(habit);
			// Reconstruct frequency object from flat columns
			converted.frequency = {
				type: converted.frequencyType || "daily",
				value: converted.frequencyValue || 1,
				secondValue: converted.frequencySecondValue,
				days: converted.frequencyDays || [],
			};
			// Map archived back to isArchived
			converted.isArchived = converted.archived || false;
			// Clean up flat frequency fields
			delete converted.frequencyType;
			delete converted.frequencyValue;
			delete converted.frequencySecondValue;
			delete converted.frequencyDays;
			delete converted.archived;
			return converted;
		});
		const logsConverted = (logs || []).map(objectToCamelCase);

		return { data: { habits: habitsConverted, logs: logsConverted } };
	} catch (error: any) {
		return { data: { habits: [], logs: [] }, error: error.message };
	}
};

// ============ WORKOUTS SYNC ============
export const syncWorkoutsToCloud = async (
	userId: string,
	workoutData: {
		fitnessProfile?: any;
		workoutPlans: any[];
		workoutSessions: any[];
		personalRecords: any[];
		bodyMeasurements: any[];
		bodyWeights: any[];
		customExercises: any[];
	}
): Promise<SyncResult> => {
	try {
		// Sync fitness profile
		if (workoutData.fitnessProfile) {
			const profileData = objectToSnakeCase({
				user_id: userId,
				...workoutData.fitnessProfile,
				updated_at: new Date().toISOString(),
			});

			const { error: profileError } = await (
				supabase.from("fitness_profiles") as any
			).upsert(profileData, { onConflict: "user_id" });

			if (profileError) throw profileError;
		}

		// Sync workout plans
		if (workoutData.workoutPlans.length > 0) {
			const plansWithUser = workoutData.workoutPlans.map((plan) =>
				objectToSnakeCase({
					...plan,
					user_id: userId,
					exercises: JSON.stringify(plan.exercises || []),
				})
			);

			const { error: plansError } = await (
				supabase.from("workout_plans") as any
			).upsert(plansWithUser, { onConflict: "id" });

			if (plansError) throw plansError;
		}

		// Sync workout sessions
		if (workoutData.workoutSessions.length > 0) {
			const sessionsWithUser = workoutData.workoutSessions.map((session) =>
				objectToSnakeCase({
					...session,
					user_id: userId,
					exercises: JSON.stringify(session.exercises || []),
				})
			);

			const chunkSize = 200;
			for (let i = 0; i < sessionsWithUser.length; i += chunkSize) {
				const chunk = sessionsWithUser.slice(i, i + chunkSize);
				const { error: sessionsError } = await (
					supabase.from("workout_sessions") as any
				).upsert(chunk, { onConflict: "id" });

				if (sessionsError) throw sessionsError;
			}
		}

		// Sync personal records
		if (workoutData.personalRecords.length > 0) {
			const recordsWithUser = workoutData.personalRecords.map((record) =>
				objectToSnakeCase({
					...record,
					user_id: userId,
				})
			);

			const { error: recordsError } = await (
				supabase.from("personal_records") as any
			).upsert(recordsWithUser, { onConflict: "id" });

			if (recordsError) throw recordsError;
		}

		// Sync body measurements
		if (workoutData.bodyMeasurements.length > 0) {
			const measurementsWithUser = workoutData.bodyMeasurements.map((m) =>
				objectToSnakeCase({
					...m,
					user_id: userId,
				})
			);

			const { error: measurementsError } = await (
				supabase.from("body_measurements") as any
			).upsert(measurementsWithUser, { onConflict: "id" });

			if (measurementsError) throw measurementsError;
		}

		// Sync body weights
		if (workoutData.bodyWeights.length > 0) {
			const weightsWithUser = workoutData.bodyWeights.map((w) =>
				objectToSnakeCase({
					...w,
					user_id: userId,
				})
			);

			const { error: weightsError } = await (
				supabase.from("body_weights") as any
			).upsert(weightsWithUser, { onConflict: "id" });

			if (weightsError) throw weightsError;
		}

		// Sync custom exercises
		if (workoutData.customExercises.length > 0) {
			const exercisesWithUser = workoutData.customExercises.map((e) =>
				objectToSnakeCase({
					...e,
					user_id: userId,
					target_muscles: JSON.stringify(e.targetMuscles || []),
					secondary_muscles: JSON.stringify(e.secondaryMuscles || []),
				})
			);

			const { error: exercisesError } = await (
				supabase.from("custom_exercises") as any
			).upsert(exercisesWithUser, { onConflict: "id" });

			if (exercisesError) throw exercisesError;
		}

		// Update sync timestamp
		await (supabase.from("user_sync_status") as any).upsert(
			{
				user_id: userId,
				workouts_synced_at: new Date().toISOString(),
			},
			{ onConflict: "user_id" }
		);

		return {
			success: true,
			module: "workouts",
			timestamp: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Workouts sync error:", error);
		return { success: false, module: "workouts", error: error.message };
	}
};

export const fetchWorkoutsFromCloud = async (
	userId: string
): Promise<{ data: any; error?: string }> => {
	try {
		const [
			fitnessProfileRes,
			plansRes,
			sessionsRes,
			recordsRes,
			measurementsRes,
			weightsRes,
			exercisesRes,
		] = await Promise.all([
			supabase
				.from("fitness_profiles")
				.select("*")
				.eq("user_id", userId)
				.single(),
			supabase
				.from("workout_plans")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false }),
			supabase
				.from("workout_sessions")
				.select("*")
				.eq("user_id", userId)
				.order("started_at", { ascending: false }),
			supabase.from("personal_records").select("*").eq("user_id", userId),
			supabase
				.from("body_measurements")
				.select("*")
				.eq("user_id", userId)
				.order("date", { ascending: false }),
			supabase
				.from("body_weights")
				.select("*")
				.eq("user_id", userId)
				.order("date", { ascending: false }),
			supabase.from("custom_exercises").select("*").eq("user_id", userId),
		]);

		// Parse JSON fields and convert to camelCase
		const workoutPlans = (plansRes.data || []).map((plan: any) => {
			const parsed = {
				...plan,
				exercises:
					typeof plan.exercises === "string"
						? JSON.parse(plan.exercises)
						: plan.exercises,
			};
			return objectToCamelCase(parsed);
		});

		const workoutSessions = (sessionsRes.data || []).map((session: any) => {
			const parsed = {
				...session,
				exercises:
					typeof session.exercises === "string"
						? JSON.parse(session.exercises)
						: session.exercises,
			};
			return objectToCamelCase(parsed);
		});

		const customExercises = (exercisesRes.data || []).map((e: any) => {
			const parsed = {
				...e,
				targetMuscles:
					typeof e.target_muscles === "string"
						? JSON.parse(e.target_muscles)
						: e.target_muscles,
				secondaryMuscles:
					typeof e.secondary_muscles === "string"
						? JSON.parse(e.secondary_muscles)
						: e.secondary_muscles,
			};
			return objectToCamelCase(parsed);
		});

		return {
			data: {
				fitnessProfile: objectToCamelCase(fitnessProfileRes.data),
				workoutPlans,
				workoutSessions,
				personalRecords: (recordsRes.data || []).map(objectToCamelCase),
				bodyMeasurements: (measurementsRes.data || []).map(objectToCamelCase),
				bodyWeights: (weightsRes.data || []).map(objectToCamelCase),
				customExercises,
			},
		};
	} catch (error: any) {
		return { data: null, error: error.message };
	}
};

// ============ FINANCE SYNC ============
export const syncFinanceToCloud = async (
	userId: string,
	financeData: {
		accounts: any[];
		transactions: any[];
		recurringTransactions: any[];
		budgets: any[];
		savingsGoals: any[];
		billReminders: any[];
		debts: any[];
		splitGroups: any[];
		currency: string;
	}
): Promise<SyncResult> => {
	try {
		// Sync accounts
		if (financeData.accounts.length > 0) {
			const accountsWithUser = financeData.accounts.map((a) =>
				objectToSnakeCase({
					...a,
					user_id: userId,
				})
			);

			const { error: accountsError } = await (
				supabase.from("finance_accounts") as any
			).upsert(accountsWithUser, { onConflict: "id" });

			if (accountsError) throw accountsError;
		}

		// Sync transactions (batch)
		if (financeData.transactions.length > 0) {
			const transactionsWithUser = financeData.transactions.map((t) =>
				objectToSnakeCase({
					...t,
					user_id: userId,
				})
			);

			const chunkSize = 500;
			for (let i = 0; i < transactionsWithUser.length; i += chunkSize) {
				const chunk = transactionsWithUser.slice(i, i + chunkSize);
				const { error: transactionsError } = await (
					supabase.from("finance_transactions") as any
				).upsert(chunk, { onConflict: "id" });

				if (transactionsError) throw transactionsError;
			}
		}

		// Sync recurring transactions
		if (financeData.recurringTransactions.length > 0) {
			const recurringWithUser = financeData.recurringTransactions.map((r) =>
				objectToSnakeCase({
					...r,
					user_id: userId,
				})
			);

			const { error: recurringError } = await (
				supabase.from("recurring_transactions") as any
			).upsert(recurringWithUser, { onConflict: "id" });

			if (recurringError) throw recurringError;
		}

		// Sync budgets
		if (financeData.budgets.length > 0) {
			const budgetsWithUser = financeData.budgets.map((b) =>
				objectToSnakeCase({
					...b,
					user_id: userId,
				})
			);

			const { error: budgetsError } = await (
				supabase.from("finance_budgets") as any
			).upsert(budgetsWithUser, { onConflict: "id" });

			if (budgetsError) throw budgetsError;
		}

		// Sync savings goals
		if (financeData.savingsGoals.length > 0) {
			const goalsWithUser = financeData.savingsGoals.map((g) =>
				objectToSnakeCase({
					...g,
					user_id: userId,
				})
			);

			const { error: goalsError } = await (
				supabase.from("savings_goals") as any
			).upsert(goalsWithUser, { onConflict: "id" });

			if (goalsError) throw goalsError;
		}

		// Sync bill reminders
		if (financeData.billReminders.length > 0) {
			const remindersWithUser = financeData.billReminders.map((r) =>
				objectToSnakeCase({
					...r,
					user_id: userId,
				})
			);

			const { error: remindersError } = await (
				supabase.from("bill_reminders") as any
			).upsert(remindersWithUser, { onConflict: "id" });

			if (remindersError) throw remindersError;
		}

		// Sync debts
		if (financeData.debts.length > 0) {
			const debtsWithUser = financeData.debts.map((d) =>
				objectToSnakeCase({
					...d,
					user_id: userId,
				})
			);

			const { error: debtsError } = await (
				supabase.from("finance_debts") as any
			).upsert(debtsWithUser, { onConflict: "id" });

			if (debtsError) throw debtsError;
		}

		// Sync split groups
		if (financeData.splitGroups.length > 0) {
			const groupsWithUser = financeData.splitGroups.map((g) =>
				objectToSnakeCase({
					...g,
					user_id: userId,
					members: JSON.stringify(g.members || []),
					expenses: JSON.stringify(g.expenses || []),
					settlements: JSON.stringify(g.settlements || []),
				})
			);

			const { error: groupsError } = await (
				supabase.from("split_groups") as any
			).upsert(groupsWithUser, { onConflict: "id" });

			if (groupsError) throw groupsError;
		}

		// Update sync timestamp and currency preference
		await (supabase.from("user_sync_status") as any).upsert(
			{
				user_id: userId,
				finance_synced_at: new Date().toISOString(),
				finance_currency: financeData.currency,
			},
			{ onConflict: "user_id" }
		);

		return {
			success: true,
			module: "finance",
			timestamp: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Finance sync error:", error);
		return { success: false, module: "finance", error: error.message };
	}
};

export const fetchFinanceFromCloud = async (
	userId: string
): Promise<{ data: any; error?: string }> => {
	try {
		const [
			accountsRes,
			transactionsRes,
			recurringRes,
			budgetsRes,
			goalsRes,
			remindersRes,
			debtsRes,
			groupsRes,
			syncStatusRes,
		] = await Promise.all([
			supabase.from("finance_accounts").select("*").eq("user_id", userId),
			supabase
				.from("finance_transactions")
				.select("*")
				.eq("user_id", userId)
				.order("date", { ascending: false }),
			supabase.from("recurring_transactions").select("*").eq("user_id", userId),
			supabase.from("finance_budgets").select("*").eq("user_id", userId),
			supabase.from("savings_goals").select("*").eq("user_id", userId),
			supabase.from("bill_reminders").select("*").eq("user_id", userId),
			supabase.from("finance_debts").select("*").eq("user_id", userId),
			supabase.from("split_groups").select("*").eq("user_id", userId),
			supabase
				.from("user_sync_status")
				.select("finance_currency")
				.eq("user_id", userId)
				.single(),
		]);

		// Parse JSON fields for split groups and convert to camelCase
		const splitGroups = (groupsRes.data || []).map((g: any) => {
			const parsed = {
				...g,
				members:
					typeof g.members === "string" ? JSON.parse(g.members) : g.members,
				expenses:
					typeof g.expenses === "string" ? JSON.parse(g.expenses) : g.expenses,
				settlements:
					typeof g.settlements === "string"
						? JSON.parse(g.settlements)
						: g.settlements,
			};
			return objectToCamelCase(parsed);
		});

		return {
			data: {
				accounts: (accountsRes.data || []).map(objectToCamelCase),
				transactions: (transactionsRes.data || []).map(objectToCamelCase),
				recurringTransactions: (recurringRes.data || []).map(objectToCamelCase),
				budgets: (budgetsRes.data || []).map(objectToCamelCase),
				savingsGoals: (goalsRes.data || []).map(objectToCamelCase),
				billReminders: (remindersRes.data || []).map(objectToCamelCase),
				debts: (debtsRes.data || []).map(objectToCamelCase),
				splitGroups,
				currency: (syncStatusRes.data as any)?.finance_currency || "INR",
			},
		};
	} catch (error: any) {
		return { data: null, error: error.message };
	}
};

// ============ SYNC ALL ============
export const syncAllToCloud = async (
	userId: string,
	data: {
		profile?: any;
		habits?: any;
		workouts?: any;
		finance?: any;
	}
): Promise<SyncResult[]> => {
	const results: SyncResult[] = [];

	if (data.profile) {
		results.push(await syncProfileToCloud(userId, data.profile));
	}

	if (data.habits) {
		results.push(await syncHabitsToCloud(userId, data.habits));
	}

	if (data.workouts) {
		results.push(await syncWorkoutsToCloud(userId, data.workouts));
	}

	if (data.finance) {
		results.push(await syncFinanceToCloud(userId, data.finance));
	}

	return results;
};

// ============ GET SYNC STATUS ============
export const getSyncStatus = async (
	userId: string
): Promise<{
	habits_synced_at?: string;
	workouts_synced_at?: string;
	finance_synced_at?: string;
}> => {
	try {
		const { data } = await supabase
			.from("user_sync_status")
			.select("*")
			.eq("user_id", userId)
			.single();

		return data || {};
	} catch {
		return {};
	}
};

// ============ DELETE ALL CLOUD DATA ============
export const deleteAllCloudData = async (
	userId: string,
	module?: SyncModule
): Promise<SyncResult> => {
	try {
		if (!module || module === "all" || module === "habits") {
			await supabase.from("habit_logs").delete().eq("user_id", userId);
			await supabase.from("user_habits").delete().eq("user_id", userId);
		}

		if (!module || module === "all" || module === "workouts") {
			await supabase.from("workout_sessions").delete().eq("user_id", userId);
			await supabase.from("workout_plans").delete().eq("user_id", userId);
			await supabase.from("personal_records").delete().eq("user_id", userId);
			await supabase.from("body_measurements").delete().eq("user_id", userId);
			await supabase.from("body_weights").delete().eq("user_id", userId);
			await supabase.from("custom_exercises").delete().eq("user_id", userId);
			await supabase.from("fitness_profiles").delete().eq("user_id", userId);
		}

		if (!module || module === "all" || module === "finance") {
			await supabase
				.from("finance_transactions")
				.delete()
				.eq("user_id", userId);
			await supabase.from("finance_accounts").delete().eq("user_id", userId);
			await supabase
				.from("recurring_transactions")
				.delete()
				.eq("user_id", userId);
			await supabase.from("finance_budgets").delete().eq("user_id", userId);
			await supabase.from("savings_goals").delete().eq("user_id", userId);
			await supabase.from("bill_reminders").delete().eq("user_id", userId);
			await supabase.from("finance_debts").delete().eq("user_id", userId);
			await supabase.from("split_groups").delete().eq("user_id", userId);
		}

		return { success: true, module: module || "all" };
	} catch (error: any) {
		return { success: false, module: module || "all", error: error.message };
	}
};
