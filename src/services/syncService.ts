// Cloud Sync Service - Syncs all user data to Supabase
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { AppState } from "react-native";
import { supabase } from "../config/supabase";

// Types for sync status
export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type SyncModule =
	| "profile"
	| "habits"
	| "workouts"
	| "finance"
	| "study"
	| "all";

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

// Helper: Validate UUID format
const isValidUUID = (id: string): boolean => {
	if (!id || typeof id !== "string") return false;
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
};

// Helper: Generate a valid UUID v4
const generateUUID = (): string => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

// Helper: Ensure ID is a valid UUID, generate new one if not
const ensureValidUUID = (id: string): string => {
	if (isValidUUID(id)) return id;
	return generateUUID();
};

// Helper: Ensure an object has a stable UUID on the given key. If missing or invalid,
// generate one and assign it back onto the object so subsequent syncs reuse the same id.
const assignIdIfMissing = (obj: any, key: string = "id"): string => {
	if (!obj) return generateUUID();
	const existing = obj[key];
	if (isValidUUID(existing)) return existing;
	const newId = generateUUID();
	try {
		obj[key] = newId;
	} catch {}
	return newId;
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

		// Read file as base64 using legacy API
		const base64 = await FileSystem.readAsStringAsync(compressedUri, {
			encoding: FileSystem.EncodingType.Base64,
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
		// Verify user is authenticated
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			throw new Error("User not authenticated. Please log in again.");
		}

		if (user.id !== userId) {
			throw new Error("User ID mismatch. Security check failed.");
		}

		// Upsert habits
		if (habitsData.habits && habitsData.habits.length > 0) {
			const habitsWithUser = habitsData.habits.map((habit) => {
				// ensure a stable id exists on habit
				assignIdIfMissing(habit, "id");
				// Flatten frequency object to match database columns
				const { frequency, ...restHabit } = habit;
				const flattenedHabit = {
					id: habit.id,
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

			console.log(
				`🔄 Syncing ${habitsWithUser.length} habits for user: ${userId}`
			);

			const { error: habitsError } = await (
				supabase.from("user_habits") as any
			).upsert(habitsWithUser, { onConflict: "id" });

			if (habitsError) {
				console.error("Habits upsert error:", habitsError);
				console.error("Failed data sample:", habitsWithUser[0]);
				console.error("Authenticated user:", user.id);
				throw habitsError;
			}
		}

		// Upsert logs (batch in chunks to avoid payload limits)
		if (habitsData.logs && habitsData.logs.length > 0) {
			const logsWithUser = habitsData.logs.map((log) => {
				assignIdIfMissing(log, "id");
				return objectToSnakeCase({
					...log,
					id: log.id,
					user_id: userId,
				});
			});

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
		if (workoutData.workoutPlans && workoutData.workoutPlans.length > 0) {
			const plansWithUser = workoutData.workoutPlans
				.filter((plan) => plan.id && isValidUUID(plan.id))
				.map((plan) => {
					// Only include fields that exist in the database schema
					return {
						id: plan.id,
						user_id: userId,
						name: plan.name,
						description: plan.description || null,
						exercises: JSON.stringify(plan.exercises || []),
						is_active: plan.isActive || false,
						created_at: plan.createdAt || new Date().toISOString(),
						updated_at: plan.updatedAt || new Date().toISOString(),
					};
				});

			if (plansWithUser.length > 0) {
				const { error: plansError } = await (
					supabase.from("workout_plans") as any
				).upsert(plansWithUser, { onConflict: "id" });

				if (plansError) throw plansError;
			}
		}

		// Sync workout sessions - explicitly map only valid DB columns, fix invalid UUIDs
		if (workoutData.workoutSessions && workoutData.workoutSessions.length > 0) {
			const sessionsWithUser = workoutData.workoutSessions.map((session) => ({
				id: assignIdIfMissing(session, "id"),
				user_id: userId,
				plan_id: session.planId
					? isValidUUID(session.planId)
						? session.planId
						: null
					: null,
				plan_name: session.planName || null,
				name: session.name,
				date: session.date,
				start_time: session.startTime,
				end_time: session.endTime || session.endedAt || null,
				duration: session.duration || 0,
				exercises: JSON.stringify(session.exercises || []),
				total_volume: session.totalVolume || 0,
				mood: session.mood || null,
				energy_level: session.energyLevel || null,
				notes: session.notes || null,
				is_completed: session.isCompleted ?? false,
				created_at: session.createdAt || new Date().toISOString(),
				updated_at: session.updatedAt || new Date().toISOString(),
			}));

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
		if (workoutData.personalRecords && workoutData.personalRecords.length > 0) {
			const recordsWithUser = workoutData.personalRecords.map((record) => {
				assignIdIfMissing(record, "id");
				return objectToSnakeCase({
					...record,
					id: record.id,
					user_id: userId,
				});
			});

			const { error: recordsError } = await (
				supabase.from("personal_records") as any
			).upsert(recordsWithUser, { onConflict: "id" });

			if (recordsError) throw recordsError;
		}

		// Sync body measurements
		if (
			workoutData.bodyMeasurements &&
			workoutData.bodyMeasurements.length > 0
		) {
			const measurementsWithUser = workoutData.bodyMeasurements.map((m) => {
				assignIdIfMissing(m, "id");
				return objectToSnakeCase({
					...m,
					id: m.id,
					user_id: userId,
				});
			});

			const { error: measurementsError } = await (
				supabase.from("body_measurements") as any
			).upsert(measurementsWithUser, { onConflict: "id" });

			if (measurementsError) throw measurementsError;
		}

		// Sync body weights
		if (workoutData.bodyWeights && workoutData.bodyWeights.length > 0) {
			const weightsWithUser = workoutData.bodyWeights.map((w) => {
				assignIdIfMissing(w, "id");
				return objectToSnakeCase({
					...w,
					id: w.id,
					user_id: userId,
				});
			});

			const { error: weightsError } = await (
				supabase.from("body_weights") as any
			).upsert(weightsWithUser, { onConflict: "id" });

			if (weightsError) throw weightsError;
		}

		// Sync custom exercises
		if (workoutData.customExercises && workoutData.customExercises.length > 0) {
			const exercisesWithUser = workoutData.customExercises.map((e) => {
				assignIdIfMissing(e, "id");
				return objectToSnakeCase({
					...e,
					id: e.id,
					user_id: userId,
					target_muscles: JSON.stringify(e.targetMuscles || []),
					secondary_muscles: JSON.stringify(e.secondaryMuscles || []),
				});
			});

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
		// Sync accounts - fix invalid UUIDs
		if (financeData.accounts && financeData.accounts.length > 0) {
			const accountsWithUser = financeData.accounts.map((a) =>
				objectToSnakeCase({
					...a,
					id: assignIdIfMissing(a, "id"),
					user_id: userId,
				})
			);

			const { error: accountsError } = await (
				supabase.from("finance_accounts") as any
			).upsert(accountsWithUser, { onConflict: "id" });

			if (accountsError) throw accountsError;
		}

		// Sync transactions (batch) - fix invalid UUIDs
		if (financeData.transactions && financeData.transactions.length > 0) {
			const transactionsWithUser = financeData.transactions.map((t) =>
				objectToSnakeCase({
					...t,
					id: assignIdIfMissing(t, "id"),
					account_id: t.accountId
						? isValidUUID(t.accountId)
							? t.accountId
							: null
						: null,
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

		// Sync recurring transactions - fix invalid UUIDs
		if (
			financeData.recurringTransactions &&
			financeData.recurringTransactions.length > 0
		) {
			const recurringWithUser = financeData.recurringTransactions.map((r) =>
				objectToSnakeCase({
					...r,
					id: assignIdIfMissing(r, "id"),
					account_id: r.accountId
						? isValidUUID(r.accountId)
							? r.accountId
							: null
						: null,
					user_id: userId,
				})
			);

			const { error: recurringError } = await (
				supabase.from("recurring_transactions") as any
			).upsert(recurringWithUser, { onConflict: "id" });

			if (recurringError) throw recurringError;
		}

		// Sync budgets - fix invalid UUIDs
		if (financeData.budgets && financeData.budgets.length > 0) {
			const budgetsWithUser = financeData.budgets.map((b) =>
				objectToSnakeCase({
					...b,
					id: assignIdIfMissing(b, "id"),
					user_id: userId,
				})
			);

			const { error: budgetsError } = await (
				supabase.from("finance_budgets") as any
			).upsert(budgetsWithUser, { onConflict: "id" });

			if (budgetsError) throw budgetsError;
		}

		// Sync savings goals - fix invalid UUIDs
		if (financeData.savingsGoals && financeData.savingsGoals.length > 0) {
			const goalsWithUser = financeData.savingsGoals.map((g) =>
				objectToSnakeCase({
					...g,
					id: assignIdIfMissing(g, "id"),
					user_id: userId,
				})
			);

			const { error: goalsError } = await (
				supabase.from("savings_goals") as any
			).upsert(goalsWithUser, { onConflict: "id" });

			if (goalsError) throw goalsError;
		}

		// Sync bill reminders - fix invalid UUIDs
		if (financeData.billReminders && financeData.billReminders.length > 0) {
			const remindersWithUser = financeData.billReminders.map((r) =>
				objectToSnakeCase({
					...r,
					id: assignIdIfMissing(r, "id"),
					user_id: userId,
				})
			);

			const { error: remindersError } = await (
				supabase.from("bill_reminders") as any
			).upsert(remindersWithUser, { onConflict: "id" });

			if (remindersError) throw remindersError;
		}

		// Sync debts - fix invalid UUIDs
		if (financeData.debts && financeData.debts.length > 0) {
			const debtsWithUser = financeData.debts.map((d) =>
				objectToSnakeCase({
					...d,
					id: assignIdIfMissing(d, "id"),
					user_id: userId,
				})
			);

			const { error: debtsError } = await (
				supabase.from("finance_debts") as any
			).upsert(debtsWithUser, { onConflict: "id" });

			if (debtsError) throw debtsError;
		}

		// Sync split groups - fix invalid UUIDs
		if (financeData.splitGroups && financeData.splitGroups.length > 0) {
			const groupsWithUser = financeData.splitGroups.map((g) =>
				objectToSnakeCase({
					...g,
					id: assignIdIfMissing(g, "id"),
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

// ============ STUDY HUB SYNC ============
export const syncStudyToCloud = async (
	userId: string,
	studyData: {
		studyGoals: any[];
		subjects: any[];
		studySessions: any[];
		flashcardDecks: any[];
		flashcards: any[];
		revisionSchedule: any[];
		mockTests: any[];
		dailyPlans: any[];
		studyNotes: any[];
	}
): Promise<SyncResult> => {
	try {
		// Sync study goals
		if (studyData.studyGoals && studyData.studyGoals.length > 0) {
			const goalsWithUser = studyData.studyGoals.map((g) => {
				assignIdIfMissing(g, "id");
				return objectToSnakeCase({
					...g,
					id: g.id,
					user_id: userId,
				});
			});

			const { error: goalsError } = await (
				supabase.from("study_goals") as any
			).upsert(goalsWithUser, { onConflict: "id" });

			if (goalsError) throw goalsError;
		}

		// Sync subjects
		if (studyData.subjects && studyData.subjects.length > 0) {
			const subjectsWithUser = studyData.subjects.map((s) => {
				assignIdIfMissing(s, "id");
				return objectToSnakeCase({
					...s,
					id: s.id,
					user_id: userId,
				});
			});

			const { error: subjectsError } = await (
				supabase.from("study_subjects") as any
			).upsert(subjectsWithUser, { onConflict: "id" });

			if (subjectsError) throw subjectsError;
		}

		// Sync study sessions
		if (studyData.studySessions && studyData.studySessions.length > 0) {
			const sessionsWithUser = studyData.studySessions.map((s) => {
				assignIdIfMissing(s, "id");
				return objectToSnakeCase({
					...s,
					id: s.id,
					user_id: userId,
				});
			});

			const { error: sessionsError } = await (
				supabase.from("study_sessions") as any
			).upsert(sessionsWithUser, { onConflict: "id" });

			if (sessionsError) throw sessionsError;
		}

		// Sync flashcard decks
		if (studyData.flashcardDecks && studyData.flashcardDecks.length > 0) {
			const decksWithUser = studyData.flashcardDecks.map((d) => {
				assignIdIfMissing(d, "id");
				return objectToSnakeCase({
					...d,
					id: d.id,
					user_id: userId,
				});
			});

			const { error: decksError } = await (
				supabase.from("flashcard_decks") as any
			).upsert(decksWithUser, { onConflict: "id" });

			if (decksError) throw decksError;
		}

		// Sync flashcards
		if (studyData.flashcards && studyData.flashcards.length > 0) {
			const cardsWithUser = studyData.flashcards.map((c) => {
				assignIdIfMissing(c, "id");
				return objectToSnakeCase({
					...c,
					id: c.id,
					user_id: userId,
				});
			});

			const { error: cardsError } = await (
				supabase.from("flashcards") as any
			).upsert(cardsWithUser, { onConflict: "id" });

			if (cardsError) throw cardsError;
		}

		// Sync revision schedule
		if (studyData.revisionSchedule && studyData.revisionSchedule.length > 0) {
			const revisionWithUser = studyData.revisionSchedule.map((r) => {
				assignIdIfMissing(r, "id");
				return objectToSnakeCase({
					...r,
					id: r.id,
					user_id: userId,
				});
			});

			const { error: revisionError } = await (
				supabase.from("revision_schedule") as any
			).upsert(revisionWithUser, { onConflict: "id" });

			if (revisionError) throw revisionError;
		}

		// Sync mock tests
		if (studyData.mockTests && studyData.mockTests.length > 0) {
			const testsWithUser = studyData.mockTests.map((t) => {
				assignIdIfMissing(t, "id");
				return objectToSnakeCase({
					...t,
					id: t.id,
					user_id: userId,
				});
			});

			const { error: testsError } = await (
				supabase.from("mock_tests") as any
			).upsert(testsWithUser, { onConflict: "id" });

			if (testsError) throw testsError;
		}

		// Sync daily plans
		if (studyData.dailyPlans && studyData.dailyPlans.length > 0) {
			const plansWithUser = studyData.dailyPlans.map((p) => {
				assignIdIfMissing(p, "id");
				return objectToSnakeCase({
					...p,
					id: p.id,
					user_id: userId,
				});
			});

			const { error: plansError } = await (
				supabase.from("daily_plans") as any
			).upsert(plansWithUser, { onConflict: "id" });

			if (plansError) throw plansError;
		}

		// Sync study notes
		if (studyData.studyNotes && studyData.studyNotes.length > 0) {
			const notesWithUser = studyData.studyNotes.map((n) => {
				assignIdIfMissing(n, "id");
				return objectToSnakeCase({
					...n,
					id: n.id,
					user_id: userId,
				});
			});

			const { error: notesError } = await (
				supabase.from("study_notes") as any
			).upsert(notesWithUser, { onConflict: "id" });

			if (notesError) throw notesError;
		}

		// Update sync timestamp
		await (supabase.from("user_sync_status") as any).upsert(
			{
				user_id: userId,
				study_synced_at: new Date().toISOString(),
			},
			{ onConflict: "user_id" }
		);

		return {
			success: true,
			module: "study",
			timestamp: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Study sync error:", error);
		return { success: false, module: "study", error: error.message };
	}
};

export const fetchStudyFromCloud = async (
	userId: string
): Promise<{ data: any; error?: string }> => {
	try {
		const [
			goalsRes,
			subjectsRes,
			sessionsRes,
			decksRes,
			cardsRes,
			revisionRes,
			testsRes,
			plansRes,
			notesRes,
		] = await Promise.all([
			supabase.from("study_goals").select("*").eq("user_id", userId),
			supabase.from("study_subjects").select("*").eq("user_id", userId),
			supabase
				.from("study_sessions")
				.select("*")
				.eq("user_id", userId)
				.order("start_time", { ascending: false }),
			supabase.from("flashcard_decks").select("*").eq("user_id", userId),
			supabase.from("flashcards").select("*").eq("user_id", userId),
			supabase.from("revision_schedule").select("*").eq("user_id", userId),
			supabase.from("mock_tests").select("*").eq("user_id", userId),
			supabase.from("daily_plans").select("*").eq("user_id", userId),
			supabase.from("study_notes").select("*").eq("user_id", userId),
		]);

		return {
			data: {
				studyGoals: (goalsRes.data || []).map(objectToCamelCase),
				subjects: (subjectsRes.data || []).map(objectToCamelCase),
				studySessions: (sessionsRes.data || []).map(objectToCamelCase),
				flashcardDecks: (decksRes.data || []).map(objectToCamelCase),
				flashcards: (cardsRes.data || []).map(objectToCamelCase),
				revisionSchedule: (revisionRes.data || []).map(objectToCamelCase),
				mockTests: (testsRes.data || []).map(objectToCamelCase),
				dailyPlans: (plansRes.data || []).map(objectToCamelCase),
				studyNotes: (notesRes.data || []).map(objectToCamelCase),
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
		study?: any;
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

	if (data.study) {
		results.push(await syncStudyToCloud(userId, data.study));
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
	study_synced_at?: string;
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

// ============ AUTO-SYNC / SCHEDULER ============
const AUTO_SYNC_INTERVAL_KEY = "auto_sync_interval_minutes";
const DEFAULT_AUTO_SYNC_MINUTES = 5;
let autoSyncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: any = null;
let autoSyncUserId: string | null = null;
let autoSyncGetData: (() => Promise<any>) | null = null;

const handleAppStateChange = async (nextAppState: string) => {
	if (nextAppState === "active") {
		// On resume, run an immediate sync if configured
		if (autoSyncUserId && autoSyncGetData) {
			try {
				const data = await autoSyncGetData();
				await syncAllToCloud(autoSyncUserId, data);
			} catch (err) {
				console.error("autoSync (on resume) failed:", err);
			}
		}
	}
};

export const getAutoSyncInterval = async (): Promise<number> => {
	try {
		const raw = await AsyncStorage.getItem(AUTO_SYNC_INTERVAL_KEY);
		const parsed = raw ? parseInt(raw, 10) : NaN;
		if (!isNaN(parsed) && parsed > 0) return parsed;
		return DEFAULT_AUTO_SYNC_MINUTES;
	} catch (err) {
		console.error("getAutoSyncInterval error:", err);
		return DEFAULT_AUTO_SYNC_MINUTES;
	}
};

export const setAutoSyncInterval = async (minutes: number): Promise<void> => {
	if (!minutes || minutes <= 0) throw new Error("Interval must be > 0 minutes");
	await AsyncStorage.setItem(AUTO_SYNC_INTERVAL_KEY, String(minutes));

	// If auto-sync is running, restart timer with new interval
	if (autoSyncTimer && autoSyncUserId && autoSyncGetData) {
		stopAutoSync();
		startAutoSync(autoSyncUserId, autoSyncGetData, false).catch((e) =>
			console.error("Failed to restart auto-sync after interval change:", e)
		);
	}
};

export const startAutoSync = async (
	userId: string,
	getDataFn: () => Promise<any>,
	immediate: boolean = true
): Promise<void> => {
	if (!userId) throw new Error("userId required to start auto-sync");
	if (!getDataFn)
		throw new Error("getDataFn is required to fetch current data for sync");

	// stop any existing timer
	stopAutoSync();

	autoSyncUserId = userId;
	autoSyncGetData = getDataFn;

	const minutes = await getAutoSyncInterval();
	const ms = minutes * 60 * 1000;

	if (immediate) {
		try {
			const data = await getDataFn();
			await syncAllToCloud(userId, data);
		} catch (err) {
			console.error("autoSync immediate sync failed:", err);
		}
	}

	autoSyncTimer = setInterval(async () => {
		if (!autoSyncUserId || !autoSyncGetData) return;
		try {
			const data = await autoSyncGetData();
			await syncAllToCloud(autoSyncUserId, data);
		} catch (err) {
			console.error("autoSync interval sync failed:", err);
		}
	}, ms);

	// Listen for app resume to trigger immediate sync
	try {
		appStateSubscription = AppState.addEventListener
			? AppState.addEventListener("change", handleAppStateChange)
			: null;
	} catch (err) {
		console.warn("AppState subscription failed:", err);
	}
};

export const stopAutoSync = (): void => {
	if (autoSyncTimer) {
		clearInterval(autoSyncTimer as any);
		autoSyncTimer = null;
	}
	autoSyncUserId = null;
	autoSyncGetData = null;
	if (
		appStateSubscription &&
		typeof appStateSubscription.remove === "function"
	) {
		appStateSubscription.remove();
		appStateSubscription = null;
	} else if (appStateSubscription) {
		// older RN versions
		AppState.removeEventListener("change", handleAppStateChange as any);
		appStateSubscription = null;
	}
};

// ============ DELETE ALL CLOUD DATA ============
export const deleteAllCloudData = async (
	userId: string,
	module?: SyncModule
): Promise<SyncResult> => {
	// CRITICAL: Validate userId to prevent accidental deletion of all data
	if (!userId || typeof userId !== "string" || userId.trim() === "") {
		console.error(
			"❌ SAFETY CHECK: Invalid userId provided to deleteAllCloudData"
		);
		return {
			success: false,
			module: module || "all",
			error: "Invalid user ID",
		};
	}

	console.log(
		`🗑️ Deleting cloud data for user: ${userId}, module: ${module || "all"}`
	);

	try {
		if (!module || module === "all" || module === "habits") {
			const { error: logsError } = await supabase
				.from("habit_logs")
				.delete()
				.eq("user_id", userId);
			if (logsError) console.error("Error deleting habit_logs:", logsError);

			const { error: habitsError } = await supabase
				.from("user_habits")
				.delete()
				.eq("user_id", userId);
			if (habitsError)
				console.error("Error deleting user_habits:", habitsError);
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

		if (!module || module === "all" || module === "study") {
			await supabase.from("study_sessions").delete().eq("user_id", userId);
			await supabase.from("study_subjects").delete().eq("user_id", userId);
			await supabase.from("study_goals").delete().eq("user_id", userId);
			await supabase.from("flashcards").delete().eq("user_id", userId);
			await supabase.from("flashcard_decks").delete().eq("user_id", userId);
			await supabase.from("revision_schedule").delete().eq("user_id", userId);
			await supabase.from("mock_tests").delete().eq("user_id", userId);
			await supabase.from("daily_plans").delete().eq("user_id", userId);
			await supabase.from("study_notes").delete().eq("user_id", userId);
		}

		return { success: true, module: module || "all" };
	} catch (error: any) {
		return { success: false, module: module || "all", error: error.message };
	}
};
