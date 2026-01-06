// Workout Store - Zustand state management for workout tracker

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	BodyMeasurements,
	BodyWeight,
	Exercise,
	FitnessProfile,
	MuscleGroup,
	MuscleProgress,
	PersonalRecord,
	WeightUnit,
	WorkoutExercise,
	WorkoutPlan,
	WorkoutSession,
	WorkoutSet,
	WorkoutStats,
} from "../types/workout";

interface WorkoutStore {
	// Fitness Profile
	fitnessProfile: FitnessProfile | null;
	setFitnessProfile: (profile: FitnessProfile) => void;
	updateFitnessProfile: (updates: Partial<FitnessProfile>) => void;

	// Body Measurements
	bodyMeasurements: BodyMeasurements[];
	addBodyMeasurement: (measurement: BodyMeasurements) => void;
	updateBodyMeasurement: (
		id: string,
		updates: Partial<BodyMeasurements>
	) => void;
	deleteBodyMeasurement: (id: string) => void;
	getLatestMeasurements: () => BodyMeasurements | null;

	// Body Weight (simple tracking)
	bodyWeights: BodyWeight[];
	logBodyWeight: (weight: number, unit: WeightUnit) => void;

	// Custom Exercises
	customExercises: Exercise[];
	addCustomExercise: (exercise: Exercise) => void;
	deleteCustomExercise: (id: string) => void;

	// Workout Plans
	workoutPlans: WorkoutPlan[];
	activePlanId: string | null;
	addWorkoutPlan: (plan: WorkoutPlan) => void;
	updateWorkoutPlan: (id: string, updates: Partial<WorkoutPlan>) => void;
	deleteWorkoutPlan: (id: string) => void;
	setActivePlan: (id: string | null) => void;
	getActivePlan: () => WorkoutPlan | null;

	// Workout Sessions (logged workouts)
	workoutSessions: WorkoutSession[];
	currentSession: WorkoutSession | null;
	startWorkout: (planId?: string, planName?: string) => void;
	addExerciseToSession: (exercise: WorkoutExercise) => void;
	removeExerciseFromSession: (exerciseId: string) => void;
	reorderExercisesInSession: (fromIndex: number, toIndex: number) => void;
	updateSetInSession: (
		exerciseId: string,
		setId: string,
		updates: Partial<WorkoutSet>
	) => void;
	addSetToExercise: (exerciseId: string) => void;
	removeSetFromExercise: (exerciseId: string, setId: string) => void;
	finishWorkout: (notes?: string, mood?: number, energyLevel?: number) => void;
	cancelWorkout: () => void;
	addWorkoutSession: (session: WorkoutSession) => void;
	deleteWorkoutSession: (id: string) => void;

	// Personal Records
	personalRecords: PersonalRecord[];
	checkAndUpdatePR: (
		exerciseId: string,
		exerciseName: string,
		type: PersonalRecord["type"],
		value: number,
		sessionId: string
	) => boolean;
	getPRsForExercise: (exerciseId: string) => PersonalRecord[];

	// Statistics & Analytics
	getWorkoutStats: () => WorkoutStats;
	getMuscleProgress: () => MuscleProgress[];
	getWorkoutsInDateRange: (startDate: Date, endDate: Date) => WorkoutSession[];
	getTotalVolumeForMuscle: (muscle: MuscleGroup, days?: number) => number;
	getExerciseHistory: (exerciseId: string) => WorkoutSession[];

	// Quick actions
	getRecentWorkouts: (count?: number) => WorkoutSession[];
	getWorkoutsThisWeek: () => WorkoutSession[];
	getStreakCount: () => number;

	// Import/Export
	importData: (data: {
		fitnessProfile?: FitnessProfile | null;
		bodyMeasurements?: BodyMeasurements[];
		bodyWeights?: BodyWeight[];
		customExercises?: Exercise[];
		workoutPlans?: WorkoutPlan[];
		workoutSessions?: WorkoutSession[];
		personalRecords?: PersonalRecord[];
		activePlanId?: string | null;
	}) => void;
	clearAllData: () => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
	persist(
		(set, get) => ({
			// Initial state
			fitnessProfile: null,
			bodyMeasurements: [],
			bodyWeights: [],
			customExercises: [],
			workoutPlans: [],
			workoutSessions: [],
			currentSession: null,
			personalRecords: [],
			activePlanId: null,

			// Fitness Profile Actions
			setFitnessProfile: (profile) => set({ fitnessProfile: profile }),

			updateFitnessProfile: (updates) =>
				set((state) => ({
					fitnessProfile: state.fitnessProfile
						? { ...state.fitnessProfile, ...updates }
						: null,
				})),

			// Body Measurements Actions
			addBodyMeasurement: (measurement) =>
				set((state) => ({
					bodyMeasurements: [measurement, ...state.bodyMeasurements],
				})),

			updateBodyMeasurement: (id, updates) =>
				set((state) => ({
					bodyMeasurements: state.bodyMeasurements.map((m) =>
						m.id === id ? { ...m, ...updates } : m
					),
				})),

			deleteBodyMeasurement: (id) =>
				set((state) => ({
					bodyMeasurements: state.bodyMeasurements.filter((m) => m.id !== id),
				})),

			getLatestMeasurements: () => {
				const { bodyMeasurements } = get();
				if (bodyMeasurements.length === 0) return null;
				return bodyMeasurements.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
				)[0];
			},

			// Body Weight Actions
			logBodyWeight: (weight, unit) =>
				set((state) => ({
					bodyWeights: [
						...state.bodyWeights,
						{
							id: `weight_${Date.now()}`,
							date: new Date().toISOString(),
							weight,
							unit,
						},
					],
				})),

			// Custom Exercises Actions
			addCustomExercise: (exercise) =>
				set((state) => ({
					customExercises: [...state.customExercises, exercise],
				})),

			deleteCustomExercise: (id) =>
				set((state) => ({
					customExercises: state.customExercises.filter((e) => e.id !== id),
				})),

			// Workout Plans Actions
			addWorkoutPlan: (plan) =>
				set((state) => ({
					workoutPlans: [...state.workoutPlans, plan],
				})),

			updateWorkoutPlan: (id, updates) =>
				set((state) => ({
					workoutPlans: state.workoutPlans.map((p) =>
						p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
					),
				})),

			deleteWorkoutPlan: (id) =>
				set((state) => ({
					workoutPlans: state.workoutPlans.filter((p) => p.id !== id),
				})),

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

			// Workout Session Actions
			startWorkout: (planId, planName) => {
				const { workoutPlans } = get();
				const sessionId = `session_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`;

				// If starting from a plan, copy its exercises
				let exercises: WorkoutExercise[] = [];
				if (planId) {
					const plan = workoutPlans.find((p) => p.id === planId);
					if (plan && plan.exercises.length > 0) {
						// Deep copy exercises with fresh IDs
						exercises = plan.exercises.map((ex, index) => ({
							...ex,
							id: `ex_${Date.now()}_${index}_${Math.random()
								.toString(36)
								.substr(2, 9)}`,
							sets: ex.sets.map((set, setIndex) => ({
								...set,
								id: `set_${Date.now()}_${setIndex}`,
								completed: false, // Reset completion status
							})),
						}));
					}
				}

				const newSession: WorkoutSession = {
					id: sessionId,
					planId,
					planName,
					name: planName || "Quick Workout",
					date: new Date(),
					startTime: new Date(),
					duration: 0,
					exercises,
					totalVolume: 0,
					isCompleted: false,
				};
				set({ currentSession: newSession });
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
					// Update order values
					exercises.forEach((ex, idx) => {
						ex.order = idx;
					});
					return {
						currentSession: {
							...state.currentSession,
							exercises,
						},
					};
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
								const newSetNumber = ex.sets.length + 1;
								const lastSet = ex.sets[ex.sets.length - 1];
								const newSet: WorkoutSet = {
									id: `set_${Date.now()}_${newSetNumber}`,
									setNumber: newSetNumber,
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

			finishWorkout: (notes, mood, energyLevel) =>
				set((state) => {
					if (!state.currentSession) return state;

					const endTime = new Date();
					const duration = Math.round(
						(endTime.getTime() -
							new Date(state.currentSession.startTime).getTime()) /
							60000
					);

					// Calculate total volume
					let totalVolume = 0;
					state.currentSession.exercises.forEach((ex) => {
						ex.sets.forEach((s) => {
							if (s.completed && s.weight && s.reps) {
								totalVolume += s.weight * s.reps;
							}
						});
					});

					const completedSession: WorkoutSession = {
						...state.currentSession,
						endTime,
						duration,
						totalVolume,
						notes,
						mood,
						energyLevel,
						isCompleted: true,
					};

					return {
						currentSession: null,
						workoutSessions: [completedSession, ...state.workoutSessions],
					};
				}),

			cancelWorkout: () => set({ currentSession: null }),

			addWorkoutSession: (session) =>
				set((state) => ({
					workoutSessions: [session, ...state.workoutSessions],
				})),

			deleteWorkoutSession: (id) =>
				set((state) => ({
					workoutSessions: state.workoutSessions.filter((s) => s.id !== id),
				})),

			// Personal Records Actions
			checkAndUpdatePR: (exerciseId, exerciseName, type, value, sessionId) => {
				const { personalRecords } = get();
				const existingPR = personalRecords.find(
					(pr) => pr.exerciseId === exerciseId && pr.type === type
				);

				if (!existingPR || value > existingPR.value) {
					const newPR: PersonalRecord = {
						id: `pr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						exerciseId,
						exerciseName,
						type,
						value,
						previousValue: existingPR?.value,
						date: new Date(),
						workoutSessionId: sessionId,
					};

					set((state) => ({
						personalRecords: existingPR
							? state.personalRecords.map((pr) =>
									pr.exerciseId === exerciseId && pr.type === type ? newPR : pr
							  )
							: [...state.personalRecords, newPR],
					}));

					return true; // New PR!
				}

				return false;
			},

			getPRsForExercise: (exerciseId) => {
				const { personalRecords } = get();
				return personalRecords.filter((pr) => pr.exerciseId === exerciseId);
			},

			// Statistics & Analytics
			getWorkoutStats: () => {
				const { workoutSessions, personalRecords } = get();
				const now = new Date();
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - now.getDay());
				startOfWeek.setHours(0, 0, 0, 0);

				const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

				const completedSessions = workoutSessions.filter((s) => s.isCompleted);

				// Calculate streak
				let currentStreak = 0;
				let longestStreak = 0;
				let tempStreak = 0;
				const sortedSessions = [...completedSessions].sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
				);

				// Simple streak calculation
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const uniqueDays = new Set<string>();
				sortedSessions.forEach((s) => {
					const date = new Date(s.date);
					date.setHours(0, 0, 0, 0);
					uniqueDays.add(date.toISOString());
				});

				// Count consecutive days from today
				for (let i = 0; i < 365; i++) {
					const checkDate = new Date(today);
					checkDate.setDate(today.getDate() - i);
					checkDate.setHours(0, 0, 0, 0);
					if (uniqueDays.has(checkDate.toISOString())) {
						currentStreak++;
					} else if (i > 0) {
						break;
					}
				}

				// Exercise frequency
				const exerciseCount: Record<string, number> = {};
				completedSessions.forEach((s) => {
					s.exercises.forEach((ex) => {
						exerciseCount[ex.exerciseId] =
							(exerciseCount[ex.exerciseId] || 0) + 1;
					});
				});

				const favoriteExercises = Object.entries(exerciseCount)
					.map(([exerciseId, count]) => ({ exerciseId, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 5);

				// Muscle group distribution (last 30 days)
				const last30Days = new Date();
				last30Days.setDate(last30Days.getDate() - 30);
				const recentSessions = completedSessions.filter(
					(s) => new Date(s.date) >= last30Days
				);

				const muscleSetCount: Record<string, number> = {};
				let totalSets = 0;
				// Note: This would need exercise database lookup in real implementation

				return {
					totalWorkouts: completedSessions.length,
					totalDuration: completedSessions.reduce(
						(sum, s) => sum + s.duration,
						0
					),
					totalVolume: completedSessions.reduce(
						(sum, s) => sum + s.totalVolume,
						0
					),
					currentStreak,
					longestStreak: Math.max(currentStreak, longestStreak),
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

			getMuscleProgress: () => {
				// Implementation for muscle recovery tracking
				return [];
			},

			getWorkoutsInDateRange: (startDate, endDate) => {
				const { workoutSessions } = get();
				return workoutSessions.filter((s) => {
					const date = new Date(s.date);
					return date >= startDate && date <= endDate;
				});
			},

			getTotalVolumeForMuscle: (muscle, days = 7) => {
				// Would need exercise database lookup
				return 0;
			},

			getExerciseHistory: (exerciseId) => {
				const { workoutSessions } = get();
				return workoutSessions.filter((s) =>
					s.exercises.some((ex) => ex.exerciseId === exerciseId)
				);
			},

			// Quick actions
			getRecentWorkouts: (count = 5) => {
				const { workoutSessions } = get();
				return workoutSessions.filter((s) => s.isCompleted).slice(0, count);
			},

			getWorkoutsThisWeek: () => {
				const { workoutSessions } = get();
				const now = new Date();
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - now.getDay());
				startOfWeek.setHours(0, 0, 0, 0);

				return workoutSessions.filter(
					(s) => s.isCompleted && new Date(s.date) >= startOfWeek
				);
			},

			getStreakCount: () => {
				const stats = get().getWorkoutStats();
				return stats.currentStreak;
			},

			// Import/Export
			importData: (data) =>
				set({
					fitnessProfile: data.fitnessProfile ?? null,
					bodyMeasurements: data.bodyMeasurements ?? [],
					bodyWeights: data.bodyWeights ?? [],
					customExercises: data.customExercises ?? [],
					workoutPlans: data.workoutPlans ?? [],
					workoutSessions: data.workoutSessions ?? [],
					personalRecords: data.personalRecords ?? [],
					activePlanId: data.activePlanId ?? null,
				}),

			clearAllData: () =>
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
				}),
		}),
		{
			name: "workout-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				fitnessProfile: state.fitnessProfile,
				bodyMeasurements: state.bodyMeasurements,
				bodyWeights: state.bodyWeights,
				customExercises: state.customExercises,
				workoutPlans: state.workoutPlans,
				workoutSessions: state.workoutSessions,
				personalRecords: state.personalRecords,
				activePlanId: state.activePlanId,
			}),
		}
	)
);
