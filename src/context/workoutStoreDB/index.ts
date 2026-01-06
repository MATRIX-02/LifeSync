/**
 * Database-First Workout Store
 * All operations write directly to Supabase - no local storage
 */
import { create } from "zustand";
import { supabase as supabaseClient } from "../../config/supabase";
import { generateId, objectToCamelCase, objectToSnakeCase } from "./helpers";
import type {
	PersonalRecord,
	WorkoutExercise,
	WorkoutPlan,
	WorkoutSession,
	WorkoutSet,
	WorkoutStore,
} from "./types";

// Cast to any to bypass strict TS type checking for Supabase queries
const supabase = supabaseClient as any;

export * from "./types";

export const useWorkoutStore = create<WorkoutStore>()((set, get) => ({
	// Initial State
	fitnessProfile: null,
	bodyMeasurements: [],
	bodyWeights: [],
	customExercises: [],
	workoutPlans: [],
	workoutSessions: [],
	personalRecords: [],
	currentSession: null,
	activePlanId: null,
	isLoading: false,
	userId: null,

	// Initialize from database
	initialize: async (userId: string) => {
		console.log("📥 Loading workout data from database for user:", userId);
		set({ isLoading: true, userId });

		try {
			const [
				profileRes,
				plansRes,
				sessionsRes,
				recordsRes,
				measurementsRes,
				weightsRes,
				exercisesRes,
			] = await Promise.all([
				(supabase.from("fitness_profiles") as any)
					.select("*")
					.eq("user_id", userId)
					.single(),
				(supabase.from("workout_plans") as any)
					.select("*")
					.eq("user_id", userId),
				(supabase.from("workout_sessions") as any)
					.select("*")
					.eq("user_id", userId)
					.order("date", { ascending: false }),
				(supabase.from("personal_records") as any)
					.select("*")
					.eq("user_id", userId),
				(supabase.from("body_measurements") as any)
					.select("*")
					.eq("user_id", userId)
					.order("date", { ascending: false }),
				(supabase.from("body_weights") as any)
					.select("*")
					.eq("user_id", userId)
					.order("date", { ascending: false }),
				(supabase.from("custom_exercises") as any)
					.select("*")
					.eq("user_id", userId),
			]);

			const fitnessProfile =
				profileRes.data && !profileRes.error
					? objectToCamelCase(profileRes.data)
					: null;

			const workoutPlans = (plansRes.data || []).map((plan: any) => {
				const camelPlan = objectToCamelCase(plan);
				return {
					...camelPlan,
					exercises:
						typeof camelPlan.exercises === "string"
							? JSON.parse(camelPlan.exercises)
							: camelPlan.exercises || [],
					createdAt: new Date(camelPlan.createdAt),
					updatedAt: new Date(camelPlan.updatedAt),
				};
			});

			const workoutSessions = (sessionsRes.data || []).map((session: any) => {
				const camelSession = objectToCamelCase(session);
				return {
					...camelSession,
					exercises:
						typeof camelSession.exercises === "string"
							? JSON.parse(camelSession.exercises)
							: camelSession.exercises || [],
					date: new Date(camelSession.date),
					startTime: new Date(camelSession.startTime),
					endTime: camelSession.endTime
						? new Date(camelSession.endTime)
						: undefined,
				};
			});

			const personalRecords = (recordsRes.data || []).map((record: any) => ({
				...objectToCamelCase(record),
				date: new Date(record.date),
			}));

			const bodyMeasurements = (measurementsRes.data || []).map((m: any) =>
				objectToCamelCase(m)
			);
			const bodyWeights = (weightsRes.data || []).map((w: any) =>
				objectToCamelCase(w)
			);
			const customExercises = (exercisesRes.data || []).map((e: any) =>
				objectToCamelCase(e)
			);
			const activePlan = workoutPlans.find((p: WorkoutPlan) => p.isActive);

			console.log(
				`✅ Loaded ${workoutPlans.length} plans, ${workoutSessions.length} sessions`
			);

			set({
				fitnessProfile,
				workoutPlans,
				workoutSessions,
				personalRecords,
				bodyMeasurements,
				bodyWeights,
				customExercises,
				activePlanId: activePlan?.id || null,
				isLoading: false,
			});
		} catch (error) {
			console.error("❌ Error loading workout data:", error);
			set({ isLoading: false });
		}
	},

	// Fitness Profile
	setFitnessProfile: async (profile) => {
		const { userId } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			user_id: userId,
			...profile,
			updated_at: new Date().toISOString(),
		});
		const { error } = await supabase
			.from("fitness_profiles")
			.upsert(dbData, { onConflict: "user_id" });
		if (error) {
			console.error("Error saving fitness profile:", error);
			return;
		}
		set({ fitnessProfile: profile });
	},

	updateFitnessProfile: async (updates) => {
		const { fitnessProfile, userId } = get();
		if (!userId || !fitnessProfile) return;
		await get().setFitnessProfile({ ...fitnessProfile, ...updates });
	},

	// Body Measurements
	addBodyMeasurement: async (measurement) => {
		const { userId, bodyMeasurements } = get();
		if (!userId) return;

		const newMeasurement = { ...measurement, id: generateId("measurement") };
		const dbData = objectToSnakeCase({ ...newMeasurement, user_id: userId });
		const { error } = await supabase.from("body_measurements").insert(dbData);
		if (error) {
			console.error("Error adding measurement:", error);
			return;
		}
		set({ bodyMeasurements: [newMeasurement, ...bodyMeasurements] });
	},

	updateBodyMeasurement: async (id, updates) => {
		const { userId, bodyMeasurements } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("body_measurements")
			.update(objectToSnakeCase(updates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating measurement:", error);
			return;
		}
		set({
			bodyMeasurements: bodyMeasurements.map((m) =>
				m.id === id ? { ...m, ...updates } : m
			),
		});
	},

	deleteBodyMeasurement: async (id) => {
		const { userId, bodyMeasurements } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("body_measurements")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting measurement:", error);
			return;
		}
		set({ bodyMeasurements: bodyMeasurements.filter((m) => m.id !== id) });
	},

	getLatestMeasurements: () => {
		const { bodyMeasurements } = get();
		if (bodyMeasurements.length === 0) return null;
		return bodyMeasurements.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		)[0];
	},

	// Body Weight
	logBodyWeight: async (weight, unit) => {
		const { userId, bodyWeights } = get();
		if (!userId) return;

		const newWeight = {
			id: generateId("weight"),
			date: new Date().toISOString(),
			weight,
			unit,
		};
		const { error } = await supabase
			.from("body_weights")
			.insert(objectToSnakeCase({ ...newWeight, user_id: userId }));
		if (error) {
			console.error("Error logging weight:", error);
			return;
		}
		set({ bodyWeights: [newWeight, ...bodyWeights] });
	},

	// Custom Exercises
	addCustomExercise: async (exercise) => {
		const { userId, customExercises } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("custom_exercises")
			.insert(objectToSnakeCase({ ...exercise, user_id: userId }));
		if (error) {
			console.error("Error adding exercise:", error);
			return;
		}
		set({ customExercises: [...customExercises, exercise] });
	},

	deleteCustomExercise: async (id) => {
		const { userId, customExercises } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("custom_exercises")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting exercise:", error);
			return;
		}
		set({ customExercises: customExercises.filter((e) => e.id !== id) });
	},

	// Workout Plans
	addWorkoutPlan: async (plan) => {
		const { userId, workoutPlans } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...plan,
			user_id: userId,
			exercises: JSON.stringify(plan.exercises || []),
		});
		const { error } = await supabase.from("workout_plans").insert(dbData);
		if (error) {
			console.error("Error adding plan:", error);
			return;
		}
		set({ workoutPlans: [...workoutPlans, plan] });
	},

	updateWorkoutPlan: async (id, updates) => {
		const { userId, workoutPlans } = get();
		if (!userId) return;

		const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
		if (updates.exercises)
			dbUpdates.exercises = JSON.stringify(updates.exercises);

		const { error } = await supabase
			.from("workout_plans")
			.update(objectToSnakeCase(dbUpdates))
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error updating plan:", error);
			return;
		}
		set({
			workoutPlans: workoutPlans.map((p) =>
				p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
			),
		});
	},

	deleteWorkoutPlan: async (id) => {
		const { userId, workoutPlans } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("workout_plans")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting plan:", error);
			return;
		}
		set({ workoutPlans: workoutPlans.filter((p) => p.id !== id) });
	},

	setActivePlan: (id) =>
		set((state) => ({
			activePlanId: id,
			workoutPlans: state.workoutPlans.map((p) => ({
				...p,
				isActive: p.id === id,
			})),
		})),

	getActivePlan: () => {
		const { workoutPlans, activePlanId } = get();
		return workoutPlans.find((p) => p.id === activePlanId) || null;
	},

	// Session Actions (local until finished)
	startWorkout: (planId, planName) => {
		const { workoutPlans } = get();
		let exercises: WorkoutExercise[] = [];

		if (planId) {
			const plan = workoutPlans.find((p) => p.id === planId);
			if (plan?.exercises.length) {
				exercises = plan.exercises.map((ex, i) => ({
					...ex,
					id: generateId("ex"),
					sets: ex.sets.map((s, j) => ({
						...s,
						id: generateId("set"),
						completed: false,
					})),
				}));
			}
		}

		set({
			currentSession: {
				id: generateId("session"),
				planId,
				planName,
				name: planName || "Quick Workout",
				date: new Date(),
				startTime: new Date(),
				duration: 0,
				exercises,
				totalVolume: 0,
				isCompleted: false,
			},
		});
	},

	addExerciseToSession: (exercise) =>
		set((state) => {
			if (!state.currentSession) return state;
			return {
				currentSession: {
					...state.currentSession,
					exercises: [...state.currentSession.exercises, exercise],
				},
			};
		}),

	removeExerciseFromSession: (exerciseId) =>
		set((state) => {
			if (!state.currentSession) return state;
			return {
				currentSession: {
					...state.currentSession,
					exercises: state.currentSession.exercises.filter(
						(ex) => ex.id !== exerciseId
					),
				},
			};
		}),

	reorderExercisesInSession: (fromIndex, toIndex) =>
		set((state) => {
			if (!state.currentSession) return state;
			const exercises = [...state.currentSession.exercises];
			const [removed] = exercises.splice(fromIndex, 1);
			exercises.splice(toIndex, 0, removed);
			exercises.forEach((ex, idx) => {
				ex.order = idx;
			});
			return { currentSession: { ...state.currentSession, exercises } };
		}),

	updateSetInSession: (exerciseId, setId, updates) =>
		set((state) => {
			if (!state.currentSession) return state;
			return {
				currentSession: {
					...state.currentSession,
					exercises: state.currentSession.exercises.map((ex) =>
						ex.id === exerciseId
							? {
									...ex,
									sets: ex.sets.map((s) =>
										s.id === setId ? { ...s, ...updates } : s
									),
							  }
							: ex
					),
				},
			};
		}),

	addSetToExercise: (exerciseId) =>
		set((state) => {
			if (!state.currentSession) return state;
			return {
				currentSession: {
					...state.currentSession,
					exercises: state.currentSession.exercises.map((ex) => {
						if (ex.id !== exerciseId) return ex;
						const lastSet = ex.sets[ex.sets.length - 1];
						const newSet: WorkoutSet = {
							id: generateId("set"),
							setNumber: ex.sets.length + 1,
							reps: lastSet?.reps || 10,
							weight: lastSet?.weight || 0,
							isWarmup: false,
							isDropset: false,
							completed: false,
						};
						return { ...ex, sets: [...ex.sets, newSet] };
					}),
				},
			};
		}),

	removeSetFromExercise: (exerciseId, setId) =>
		set((state) => {
			if (!state.currentSession) return state;
			return {
				currentSession: {
					...state.currentSession,
					exercises: state.currentSession.exercises.map((ex) =>
						ex.id === exerciseId
							? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
							: ex
					),
				},
			};
		}),

	finishWorkout: async (notes, mood, energyLevel) => {
		const { currentSession, userId, workoutSessions } = get();
		if (!currentSession || !userId) return;

		const endTime = new Date();
		const duration = Math.round(
			(endTime.getTime() - new Date(currentSession.startTime).getTime()) / 60000
		);
		let totalVolume = 0;
		currentSession.exercises.forEach((ex) => {
			ex.sets.forEach((s) => {
				if (s.completed && s.weight && s.reps) totalVolume += s.weight * s.reps;
			});
		});

		const completedSession: WorkoutSession = {
			...currentSession,
			endTime,
			duration,
			totalVolume,
			notes,
			mood,
			energyLevel,
			isCompleted: true,
		};
		const dbData = objectToSnakeCase({
			...completedSession,
			user_id: userId,
			exercises: JSON.stringify(completedSession.exercises),
		});

		const { error } = await supabase.from("workout_sessions").insert(dbData);
		if (error) {
			console.error("Error saving session:", error);
			return;
		}
		set({
			currentSession: null,
			workoutSessions: [completedSession, ...workoutSessions],
		});
	},

	cancelWorkout: () => set({ currentSession: null }),

	addWorkoutSession: async (session) => {
		const { userId, workoutSessions } = get();
		if (!userId) return;

		const dbData = objectToSnakeCase({
			...session,
			user_id: userId,
			exercises: JSON.stringify(session.exercises || []),
		});
		const { error } = await supabase.from("workout_sessions").insert(dbData);
		if (error) {
			console.error("Error adding session:", error);
			return;
		}
		set({ workoutSessions: [session, ...workoutSessions] });
	},

	deleteWorkoutSession: async (id) => {
		const { userId, workoutSessions } = get();
		if (!userId) return;

		const { error } = await supabase
			.from("workout_sessions")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);
		if (error) {
			console.error("Error deleting session:", error);
			return;
		}
		set({ workoutSessions: workoutSessions.filter((s) => s.id !== id) });
	},

	// Personal Records
	checkAndUpdatePR: async (
		exerciseId,
		exerciseName,
		type,
		value,
		sessionId
	) => {
		const { personalRecords, userId } = get();
		if (!userId) return false;

		const existingPR = personalRecords.find(
			(pr) => pr.exerciseId === exerciseId && pr.type === type
		);
		if (!existingPR || value > existingPR.value) {
			const newPR: PersonalRecord = {
				id: generateId("pr"),
				exerciseId,
				exerciseName,
				type,
				value,
				previousValue: existingPR?.value,
				date: new Date(),
				workoutSessionId: sessionId,
			};
			const dbData = objectToSnakeCase({ ...newPR, user_id: userId });

			if (existingPR) {
				const { error } = await supabase
					.from("personal_records")
					.update(dbData)
					.eq("id", existingPR.id)
					.eq("user_id", userId);
				if (error) {
					console.error("Error updating PR:", error);
					return false;
				}
				set({
					personalRecords: personalRecords.map((pr) =>
						pr.exerciseId === exerciseId && pr.type === type ? newPR : pr
					),
				});
			} else {
				const { error } = await supabase
					.from("personal_records")
					.insert(dbData);
				if (error) {
					console.error("Error adding PR:", error);
					return false;
				}
				set({ personalRecords: [...personalRecords, newPR] });
			}
			return true;
		}
		return false;
	},

	getPRsForExercise: (exerciseId) =>
		get().personalRecords.filter((pr) => pr.exerciseId === exerciseId),

	// Statistics
	getWorkoutStats: () => {
		const { workoutSessions } = get();
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const completedSessions = workoutSessions.filter((s) => s.isCompleted);

		let currentStreak = 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const uniqueDays = new Set<string>();
		completedSessions.forEach((s) => {
			const d = new Date(s.date);
			d.setHours(0, 0, 0, 0);
			uniqueDays.add(d.toISOString());
		});
		for (let i = 0; i < 365; i++) {
			const checkDate = new Date(today);
			checkDate.setDate(today.getDate() - i);
			checkDate.setHours(0, 0, 0, 0);
			if (uniqueDays.has(checkDate.toISOString())) currentStreak++;
			else if (i > 0) break;
		}

		const exerciseCount: Record<string, number> = {};
		completedSessions.forEach((s) => {
			s.exercises.forEach((ex) => {
				exerciseCount[ex.exerciseId] = (exerciseCount[ex.exerciseId] || 0) + 1;
			});
		});
		const favoriteExercises = Object.entries(exerciseCount)
			.map(([exerciseId, count]) => ({ exerciseId, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		return {
			totalWorkouts: completedSessions.length,
			totalDuration: completedSessions.reduce((sum, s) => sum + s.duration, 0),
			totalVolume: completedSessions.reduce((sum, s) => sum + s.totalVolume, 0),
			currentStreak,
			longestStreak: currentStreak,
			averageWorkoutDuration:
				completedSessions.length > 0
					? Math.round(
							completedSessions.reduce((sum, s) => sum + s.duration, 0) /
								completedSessions.length
					  )
					: 0,
			workoutsThisWeek: completedSessions.filter(
				(s) => new Date(s.date) >= startOfWeek
			).length,
			workoutsThisMonth: completedSessions.filter(
				(s) => new Date(s.date) >= startOfMonth
			).length,
			favoriteExercises,
			muscleGroupDistribution: [],
			weeklyProgress: [],
			monthlyProgress: [],
		};
	},

	getMuscleProgress: () => [],
	getWorkoutsInDateRange: (startDate, endDate) =>
		get().workoutSessions.filter((s) => {
			const d = new Date(s.date);
			return d >= startDate && d <= endDate;
		}),
	getTotalVolumeForMuscle: () => 0,
	getExerciseHistory: (exerciseId) =>
		get().workoutSessions.filter((s) =>
			s.exercises.some((ex) => ex.exerciseId === exerciseId)
		),
	getRecentWorkouts: (count = 5) =>
		get()
			.workoutSessions.filter((s) => s.isCompleted)
			.slice(0, count),
	getWorkoutsThisWeek: () => {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);
		return get().workoutSessions.filter(
			(s) => s.isCompleted && new Date(s.date) >= startOfWeek
		);
	},
	getStreakCount: () => get().getWorkoutStats().currentStreak,

	// Import/Export
	importData: async (data) => {
		const { userId } = get();
		if (!userId) return;
		console.log("📤 Importing workout data...");

		try {
			if (data.fitnessProfile)
				await get().setFitnessProfile(data.fitnessProfile);

			if (data.workoutPlans?.length) {
				const plansData = data.workoutPlans.map((p) =>
					objectToSnakeCase({
						...p,
						user_id: userId,
						exercises: JSON.stringify(p.exercises || []),
					})
				);
				await supabase
					.from("workout_plans")
					.upsert(plansData, { onConflict: "id" });
			}
			if (data.workoutSessions?.length) {
				const sessionsData = data.workoutSessions.map((s) =>
					objectToSnakeCase({
						...s,
						user_id: userId,
						exercises: JSON.stringify(s.exercises || []),
					})
				);
				for (let i = 0; i < sessionsData.length; i += 200) {
					await supabase
						.from("workout_sessions")
						.upsert(sessionsData.slice(i, i + 200), { onConflict: "id" });
				}
			}
			if (data.personalRecords?.length) {
				const recordsData = data.personalRecords.map((r) =>
					objectToSnakeCase({ ...r, user_id: userId })
				);
				await supabase
					.from("personal_records")
					.upsert(recordsData, { onConflict: "id" });
			}
			if (data.bodyMeasurements?.length) {
				const measData = data.bodyMeasurements.map((m) =>
					objectToSnakeCase({ ...m, user_id: userId })
				);
				await supabase
					.from("body_measurements")
					.upsert(measData, { onConflict: "id" });
			}
			if (data.bodyWeights?.length) {
				const weightsData = data.bodyWeights.map((w) =>
					objectToSnakeCase({ ...w, user_id: userId })
				);
				await supabase
					.from("body_weights")
					.upsert(weightsData, { onConflict: "id" });
			}
			if (data.customExercises?.length) {
				const exData = data.customExercises.map((e) =>
					objectToSnakeCase({ ...e, user_id: userId })
				);
				await supabase
					.from("custom_exercises")
					.upsert(exData, { onConflict: "id" });
			}

			await get().initialize(userId);
			console.log("✅ Workout import complete");
		} catch (error) {
			console.error("❌ Error importing:", error);
		}
	},

	clearAllData: async () => {
		const { userId } = get();
		if (!userId) return;
		console.log("🗑️ Clearing workout data...");

		await Promise.all([
			supabase.from("workout_sessions").delete().eq("user_id", userId),
			supabase.from("workout_plans").delete().eq("user_id", userId),
			supabase.from("personal_records").delete().eq("user_id", userId),
			supabase.from("body_measurements").delete().eq("user_id", userId),
			supabase.from("body_weights").delete().eq("user_id", userId),
			supabase.from("custom_exercises").delete().eq("user_id", userId),
			supabase.from("fitness_profiles").delete().eq("user_id", userId),
		]);

		set({
			fitnessProfile: null,
			bodyMeasurements: [],
			bodyWeights: [],
			customExercises: [],
			workoutPlans: [],
			workoutSessions: [],
			personalRecords: [],
			currentSession: null,
			activePlanId: null,
		});
		console.log("✅ Workout data cleared");
	},
}));
