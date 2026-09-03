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
			// A key literally named "undefined" is never a real column. It comes
			// from an `obj[someUndefinedVar] = ...` write upstream, and PostgREST
			// rejects the ENTIRE request over it (PGRST204), taking every other
			// row with it. Drop it rather than fail the sync.
			if (key === "undefined") {
				console.warn(
					'Sync: dropping bogus "undefined" key from payload. Sibling keys:',
					Object.keys(obj).join(", ")
				);
				continue;
			}
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
const _freq = require("../utils/frequency") as typeof import("../utils/frequency");

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

// Helper: Coerce a foreign-key-ish value for a Postgres `uuid` column.
// Postgres rejects "" and legacy non-UUID ids with 22P02 ("invalid input syntax
// for type uuid"), which fails the ENTIRE upsert — not just the offending row.
// Local data predates the UUID convention and often carries "" or an old id.
const uuidOrNull = (value: any): string | null =>
	isValidUUID(value) ? value : null;

// Helper: Null out every uuid-typed reference column on a payload object.
// Keys are the snake_case column names as they appear in the table.
const sanitizeUUIDRefs = (
	row: Record<string, any>,
	columns: string[]
): Record<string, any> => {
	for (const col of columns) {
		if (col in row) row[col] = uuidOrNull(row[col]);
	}
	return row;
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
		// local UserProfile shape
		name?: string;
		email?: string;
		bio?: string;
		avatar?: string;
		// Supabase `profiles` row shape (auto-sync passes this)
		full_name?: string | null;
		avatar_url?: string | null;
	}
): Promise<SyncResult> => {
	try {
		// Accept either the local UserProfile shape or a raw `profiles` row.
		const name = profileData.name ?? profileData.full_name ?? undefined;
		const avatar = profileData.avatar ?? profileData.avatar_url ?? undefined;
		let avatarUrl = avatar;

		// Upload avatar if it's a local file
		if (
			avatar &&
			(avatar.startsWith("file://") || avatar.startsWith("content://"))
		) {
			const uploadedUrl = await uploadAvatar(userId, avatar);
			if (uploadedUrl) {
				avatarUrl = uploadedUrl;
			}
		}

		// Only send fields we actually have, so a partial payload never blanks
		// out columns that already hold good data.
		const payload: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};
		if (name !== undefined) payload.full_name = name;
		if (profileData.bio !== undefined) payload.bio = profileData.bio;
		if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

		const { error } = await (supabase.from("profiles") as any)
			.update(payload)
			.eq("id", userId);

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
			.eq("id", userId)
			.maybeSingle();

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
				// DO NOT rewrite the id here.
				//
				// user_habits.id is a TEXT column, so it accepts any id the app
				// generates. assignIdIfMissing() used to mint a fresh UUID for any
				// legacy `habit_…` id and upsert under it - which conflicted with
				// nothing, leaving the original row in place. That is what
				// duplicated habits. New habits are created as UUIDs at source
				// (utils/uuid.ts); legacy ids are migrated by
				// supabase/migrations/20260829_habit_uuid_ids.sql.
				// Frequency: the jsonb column is the source of truth; the flat
				// columns are a mirror kept for older builds. See the frequency
				// jsonb migration before removing either.
				const { frequency, ...restHabit } = habit;
				const normalizedFreq = _freq.normalizeFrequency(
					frequency,
					(habit as any).notificationTime
				);
				const legacyFreq = _freq.toLegacyFrequency(normalizedFreq);
				const flattenedHabit = {
					id: habit.id,
					...restHabit,
					frequency: normalizedFreq,
					frequency_type: legacyFreq.type || "daily",
					frequency_value: legacyFreq.value || 1,
					frequency_second_value: legacyFreq.secondValue ?? null,
					frequency_days: legacyFreq.days || [],
					frequency_start_time: legacyFreq.startTime ?? null,
					frequency_end_time: legacyFreq.endTime ?? null,
					frequency_interval_minutes: legacyFreq.intervalMinutes ?? null,
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
				// Same reasoning as habits above: habit_logs.id is TEXT, and
				// rewriting the id here duplicated every log exactly once. It also
				// broke the log's habit_id association when the parent was rewritten.
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
			// Prefer the jsonb column, falling back to the legacy flat columns for
			// rows last written by an older build.
			converted.frequency = _freq.normalizeFrequency(
				converted.frequency ?? {
					type: converted.frequencyType || "daily",
					value: converted.frequencyValue || 1,
					secondValue: converted.frequencySecondValue,
					days: converted.frequencyDays || [],
					startTime: converted.frequencyStartTime ?? undefined,
					endTime: converted.frequencyEndTime ?? undefined,
					intervalMinutes: converted.frequencyIntervalMinutes ?? undefined,
				},
				converted.notificationTime
			);
			// Map archived back to isArchived
			converted.isArchived = converted.archived || false;
			// Clean up flat frequency fields
			delete converted.frequencyType;
			delete converted.frequencyValue;
			delete converted.frequencySecondValue;
			delete converted.frequencyDays;
			delete converted.frequencyStartTime;
			delete converted.frequencyEndTime;
			delete converted.frequencyIntervalMinutes;
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
						// jsonb column - pass the array, not a stringified one.
						exercises: plan.exercises || [],
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
				exercises: session.exercises || [],
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
					user_id: userId,
				})
			).map((t: any) =>
				sanitizeUUIDRefs(t, ["account_id", "to_account_id", "recurring_id"])
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
					user_id: userId,
				})
			).map((r: any) => sanitizeUUIDRefs(r, ["account_id"]));

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
			).map((g: any) => sanitizeUUIDRefs(g, ["linked_account_id"]));

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
			).map((r: any) =>
				sanitizeUUIDRefs(r, ["paid_from_account_id", "account_id"])
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
			).map((d: any) =>
				sanitizeUUIDRefs(d, ["linked_account_id", "linked_credit_card_id"])
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
					// members/expenses/settlements are jsonb columns — pass the
					// arrays through. Stringifying them double-encodes, storing a
					// JSON string inside jsonb instead of an array.
					members: g.members || [],
					expenses: g.expenses || [],
					settlements: g.settlements || [],
				})
			).map((g: any) => sanitizeUUIDRefs(g, ["created_by"]));

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
				.maybeSingle(),
		]);

		// Surface per-query failures. supabase-js resolves rather than throws, so
		// without this an RLS denial or a missing table looks identical to "the
		// user has no data" — and the caller then overwrites good local state
		// with an empty array.
		const failures = [
			["finance_accounts", accountsRes.error],
			["finance_transactions", transactionsRes.error],
			["recurring_transactions", recurringRes.error],
			["finance_budgets", budgetsRes.error],
			["savings_goals", goalsRes.error],
			["bill_reminders", remindersRes.error],
			["finance_debts", debtsRes.error],
			["split_groups", groupsRes.error],
		].filter(([, err]) => err) as [string, any][];

		if (failures.length > 0) {
			const message = failures
				.map(([table, err]) => `${table}: ${err.message}`)
				.join("; ");
			console.error("fetchFinanceFromCloud failed:", message);
			return { data: null, error: message };
		}

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
		// study_subjects.goal_id, flashcards.deck_id and friends are real foreign
		// keys. Two things break them, and either one raises 23503 and fails the
		// whole study sync:
		//
		//   1. assignIdIfMissing() rewrites a parent's non-UUID id, but children
		//      still point at the OLD id.
		//   2. A child references a parent that was deleted locally.
		//
		// So: record every id rewrite, then resolve each child reference through
		// that map and null it only when we can prove the parent doesn't exist.
		const idRemap = new Map<string, string>();

		const withId = (obj: any): string => {
			const original = obj?.id;
			const finalId = assignIdIfMissing(obj, "id");
			if (original && original !== finalId) idRemap.set(original, finalId);
			return finalId;
		};

		// Authoritative parent ids, read back after the parent upsert so that
		// references to rows already in the cloud (but absent from this payload)
		// survive. Returns null if we can't tell, in which case we leave the
		// reference alone rather than destroying a good association.
		const loadParentIds = async (
			table: string
		): Promise<Set<string> | null> => {
			const { data, error } = await (supabase.from(table) as any)
				.select("id")
				.eq("user_id", userId);
			if (error) {
				console.warn(
					`Could not load ${table} ids for FK check:`,
					error.message
				);
				return null;
			}
			return new Set((data || []).map((r: any) => r.id));
		};

		const resolveRef = (
			value: any,
			valid: Set<string> | null
		): string | null => {
			if (!value) return null;
			const mapped = idRemap.get(value) ?? value;
			if (!isValidUUID(mapped)) return null;
			if (!valid) return mapped;
			return valid.has(mapped) ? mapped : null;
		};

		// Which of the three reference columns actually exist on each table, and
		// whether they are NOT NULL (from information_schema). This matters twice:
		//   - a ref column a table does NOT have must be stripped, or PostgREST
		//     rejects the whole request with 42703;
		//   - a NOT NULL ref that cannot be resolved cannot be nulled (23502), so
		//     the row is skipped instead of failing the batch.
		type RefSpec = {
			column: string;
			valid: Set<string> | null;
			required: boolean;
		};
		const ALL_REF_COLUMNS = ["goal_id", "subject_id", "deck_id"];

		let skipped = 0;

		const prepare = (
			table: string,
			rows: any[],
			specs: RefSpec[]
		): any[] => {
			const out: any[] = [];
			for (const r of rows) {
				withId(r);
				const row = objectToSnakeCase({ ...r, id: r.id, user_id: userId });

				// Drop reference columns this table doesn't have.
				const known = new Set(specs.map((sp) => sp.column));
				for (const col of ALL_REF_COLUMNS) {
					if (!known.has(col)) delete row[col];
				}

				// Strip anything this table has no column for, before the FK
				// handling below re-adds the reference columns it does have.
				applyWhitelist(table, row);

				let usable = true;
				for (const spec of specs) {
					const resolved = resolveRef(row[spec.column], spec.valid);
					if (resolved === null && spec.required) {
						usable = false;
						break;
					}
					row[spec.column] = resolved;
				}

				if (usable) out.push(row);
				else skipped++;
			}
			return out;
		};

		// Columns that actually exist, straight from information_schema.
		//
		// The local types have drifted well past the schema — 30+ fields across
		// these tables have no column. Sending even one makes PostgREST reject
		// the ENTIRE request (42703 / PGRST204), which is why a single stale
		// field takes the whole study sync down with it.
		//
		const TABLE_COLUMNS: Record<string, string[]> = {
			study_subjects: [
				"id",
				"user_id",
				"goal_id",
				"name",
				"description",
				"color",
				"icon",
				"priority",
				"difficulty",
				"progress",
				"target_hours",
				"completed_hours",
				"created_at",
				"updated_at",
				"hours_spent",
				"order",
				"status",
			],
			study_sessions: [
				"id",
				"user_id",
				"goal_id",
				"subject_id",
				"type",
				"start_time",
				"end_time",
				"duration",
				"is_active",
				"break_minutes",
				"focus_score",
				"notes",
				"pomodoro_count",
				"created_at",
				"updated_at",
				"breaks_taken",
				"total_break_time",
			],
			study_goals: [
				"id",
				"user_id",
				"name",
				"description",
				"goal_type",
				"target_date",
				"target_score",
				"status",
				"priority",
				"color",
				"icon",
				"daily_target_minutes",
				"created_at",
				"updated_at",
				"start_date",
				"total_hours_spent",
				"total_hours_target",
				"type",
			],
			flashcard_decks: [
				"id",
				"user_id",
				"goal_id",
				"subject_id",
				"name",
				"description",
				"card_count",
				"mastered_count",
				"created_at",
				"updated_at",
				"next_review_at",
				"last_reviewed_at",
			],
			flashcards: [
				"id",
				"user_id",
				"deck_id",
				"front",
				"back",
				"tags",
				"ease_factor",
				"interval",
				"repetitions",
				"next_review_date",
				"last_reviewed_at",
				"created_at",
				"updated_at",
				"next_review_at",
				"review_count",
				"correct_count",
				"repetition_level",
				"difficulty",
				"status",
			],
			revision_schedule: [
				"id",
				"user_id",
				"subject_id",
				"scheduled_date",
				"type",
				"status",
				"notes",
				"completed_at",
				"created_at",
				"updated_at",
			],
			mock_tests: [
				"id",
				"user_id",
				"goal_id",
				"name",
				"date",
				"duration_minutes",
				"total_marks",
				"obtained_marks",
				"percentage",
				"subject_wise_scores",
				"notes",
				"created_at",
				"updated_at",
			],
			daily_plans: [
				"id",
				"user_id",
				"date",
				"tasks",
				"notes",
				"completed",
				"created_at",
				"updated_at",
			],
			study_notes: [
				"id",
				"user_id",
				"subject_id",
				"goal_id",
				"title",
				"content",
				"tags",
				"is_pinned",
				"created_at",
				"updated_at",
			],
		};

		const droppedFields = new Set<string>();

		const applyWhitelist = (table: string, row: Record<string, any>) => {
			const allowed = TABLE_COLUMNS[table];
			if (!allowed) return;
			for (const key of Object.keys(row)) {
				if (!allowed.includes(key)) {
					droppedFields.add(`${table}.${key}`);
					delete row[key];
				}
			}
		};

		const upsertAll = async (table: string, rows: any[]): Promise<void> => {
			const chunkSize = 500;
			for (let i = 0; i < rows.length; i += chunkSize) {
				const { error } = await (supabase.from(table) as any).upsert(
					rows.slice(i, i + chunkSize),
					{ onConflict: "id" }
				);
				if (error) throw error;
			}
		};

		// --- Parents first, in dependency order ---

		// Study goals (no parents)
		if (studyData.studyGoals?.length > 0) {
			await upsertAll("study_goals", prepare("study_goals", studyData.studyGoals, []));
		}
		const goalIds = await loadParentIds("study_goals");

		// study_subjects.goal_id is NOT NULL
		if (studyData.subjects?.length > 0) {
			await upsertAll(
				"study_subjects",
				prepare("study_subjects", studyData.subjects, [
					{ column: "goal_id", valid: goalIds, required: true },
				])
			);
		}
		const subjectIds = await loadParentIds("study_subjects");

		// flashcard_decks.goal_id / subject_id are both nullable
		if (studyData.flashcardDecks?.length > 0) {
			await upsertAll(
				"flashcard_decks",
				prepare("flashcard_decks", studyData.flashcardDecks, [
					{ column: "goal_id", valid: goalIds, required: false },
					{ column: "subject_id", valid: subjectIds, required: false },
				])
			);
		}
		const deckIds = await loadParentIds("flashcard_decks");

		// --- Children ---
		const children: [string, any[] | undefined, RefSpec[]][] = [
			[
				"study_sessions",
				studyData.studySessions,
				[
					{ column: "goal_id", valid: goalIds, required: false },
					{ column: "subject_id", valid: subjectIds, required: false },
				],
			],
			[
				"flashcards",
				studyData.flashcards,
				[{ column: "deck_id", valid: deckIds, required: true }],
			],
			[
				"revision_schedule",
				studyData.revisionSchedule,
				[{ column: "subject_id", valid: subjectIds, required: true }],
			],
			[
				"mock_tests",
				studyData.mockTests,
				[{ column: "goal_id", valid: goalIds, required: true }],
			],
			// daily_plans has none of the reference columns
			["daily_plans", studyData.dailyPlans, []],
			[
				"study_notes",
				studyData.studyNotes,
				[
					{ column: "goal_id", valid: goalIds, required: false },
					{ column: "subject_id", valid: subjectIds, required: false },
				],
			],
		];

		for (const [table, rows, specs] of children) {
			if (rows && rows.length > 0) {
				await upsertAll(table, prepare(table, rows, specs));
			}
		}

		if (skipped > 0) {
			console.warn(
				`Study sync: skipped ${skipped} row(s) whose required parent no longer exists.`
			);
		}

		if (droppedFields.size > 0) {
			// These fields exist in the app but have no column, so they do not
			// persist. Each one needs a migration before it will round-trip.
			console.warn(
				"Study sync: dropped fields with no matching column:",
				[...droppedFields].sort().join(", ")
			);
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
const AUTO_SYNC_ENABLED_KEY = "auto_sync_enabled";
const DEFAULT_AUTO_SYNC_MINUTES = 5;
let autoSyncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: any = null;
let autoSyncUserId: string | null = null;
let autoSyncGetData: (() => Promise<any>) | null = null;
let autoSyncInFlight = false;
let autoSyncLastRunAt = 0;

export const isAutoSyncRunning = (): boolean => autoSyncTimer !== null;

export const getAutoSyncEnabled = async (): Promise<boolean> => {
	try {
		return (await AsyncStorage.getItem(AUTO_SYNC_ENABLED_KEY)) === "true";
	} catch {
		return false;
	}
};

// Single entry point for every auto-sync run. Skips overlapping runs so a slow
// sync can't stack up behind the interval timer.
const runAutoSync = async (reason: string): Promise<void> => {
	if (!autoSyncUserId || !autoSyncGetData) return;
	if (autoSyncInFlight) {
		console.log(`autoSync (${reason}) skipped: a sync is already running`);
		return;
	}
	autoSyncInFlight = true;
	try {
		const data = await autoSyncGetData();
		const results = await syncAllToCloud(autoSyncUserId, data);
		autoSyncLastRunAt = Date.now();
		const failed = results.filter((r) => !r.success);
		if (failed.length > 0) {
			console.error(
				`autoSync (${reason}) partial failure:`,
				failed.map((f) => `${f.module}: ${f.error}`).join("; ")
			);
		}
	} catch (err) {
		console.error(`autoSync (${reason}) failed:`, err);
	} finally {
		autoSyncInFlight = false;
	}
};

const handleAppStateChange = async (nextAppState: string) => {
	if (nextAppState !== "active") return;
	if (!autoSyncUserId || !autoSyncGetData) return;

	// Only sync on resume if we're actually due — otherwise every app switch
	// fires a full push of every module.
	const minutes = await getAutoSyncInterval();
	if (Date.now() - autoSyncLastRunAt < minutes * 60 * 1000) return;

	await runAutoSync("on resume");
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

	// If auto-sync is running, restart timer with new interval.
	// Capture the config BEFORE stopping — stopAutoSync() clears these.
	if (autoSyncTimer && autoSyncUserId && autoSyncGetData) {
		const userId = autoSyncUserId;
		const getDataFn = autoSyncGetData;
		stopAutoSync(false);
		startAutoSync(userId, getDataFn, false).catch((e) =>
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
	stopAutoSync(false);

	autoSyncUserId = userId;
	autoSyncGetData = getDataFn;

	const minutes = await getAutoSyncInterval();
	const ms = minutes * 60 * 1000;

	// Remember the choice so auto-sync can be resumed on the next app launch.
	try {
		await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, "true");
	} catch (err) {
		console.warn("Failed to persist auto-sync enabled flag:", err);
	}

	// Set the timer up front so isAutoSyncRunning() is already true while the
	// immediate sync is in flight.
	autoSyncTimer = setInterval(() => {
		runAutoSync("interval");
	}, ms);

	if (immediate) {
		await runAutoSync("immediate");
	}

	// Listen for app resume to trigger immediate sync
	try {
		appStateSubscription = AppState.addEventListener
			? AppState.addEventListener("change", handleAppStateChange)
			: null;
	} catch (err) {
		console.warn("AppState subscription failed:", err);
	}
};

// `persistPreference` defaults to true (an explicit user "Stop"). Pass false
// for internal teardown — sign-out, an interval change — so the user's
// auto-sync preference survives and is restored on the next launch.
export const stopAutoSync = (persistPreference: boolean = true): void => {
	if (persistPreference) {
		AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, "false").catch((err) =>
			console.warn("Failed to persist auto-sync disabled flag:", err)
		);
	}
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
