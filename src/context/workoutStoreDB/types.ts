/**
 * Workout Store Types
 * Extended to match component expectations
 */

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "athlete";
export type FitnessGoal =
	| "lose_weight"
	| "build_muscle"
	| "maintain"
	| "increase_strength"
	| "improve_endurance"
	| "flexibility"
	| "general_fitness";
export type MuscleGroup =
	| "chest"
	| "back"
	| "shoulders"
	| "biceps"
	| "triceps"
	| "forearms"
	| "abs"
	| "obliques"
	| "quadriceps"
	| "hamstrings"
	| "glutes"
	| "calves"
	| "traps"
	| "lats"
	| "lower_back"
	| "legs";

export interface FitnessProfile {
	id?: string;
	name?: string;
	age: number;
	height: number;
	weight: number;
	gender: "male" | "female" | "other";
	fitnessLevel: FitnessLevel;
	goals: FitnessGoal[];
	preferredWorkoutDays?: number[];
	medicalConditions?: string[];
	injuries?: string[];
	equipment?: string[];
	targetWeight?: number;
	bodyFatPercentage?: number;
	weightUnit: "kg" | "lbs";
	distanceUnit?: "km" | "miles";
	weeklyWorkoutGoal: number;
}

export interface BodyMeasurement {
	id: string;
	date: string | Date;
	weight?: number;
	chest?: number;
	waist?: number;
	hips?: number;
	thighs?: number;
	leftThigh?: number;
	rightThigh?: number;
	arms?: number;
	leftArm?: number;
	rightArm?: number;
	leftCalf?: number;
	rightCalf?: number;
	neck?: number;
	shoulders?: number;
	bodyFat?: number;
	bodyFatPercentage?: number;
	unit: "cm" | "in";
	notes?: string;
}

export interface BodyWeight {
	id: string;
	date: string;
	weight: number;
	unit: "kg" | "lbs";
}

export interface WorkoutSet {
	id: string;
	setNumber: number;
	reps?: number;
	weight?: number;
	duration?: number;
	distance?: number;
	restTime?: number;
	rpe?: number;
	isWarmup: boolean;
	isDropset: boolean;
	isSuperset?: boolean;
	completed: boolean;
	notes?: string;
}

export interface WorkoutExercise {
	id: string;
	exerciseId: string;
	exerciseName: string;
	muscleGroup?: string;
	targetMuscles: MuscleGroup[];
	sets: WorkoutSet[];
	targetSets: number;
	targetReps?: number;
	targetWeight?: number;
	restBetweenSets: number;
	order: number;
	notes?: string;
	supersetWith?: string;
}

export interface CustomExercise {
	id: string;
	name: string;
	category?: string;
	muscleGroup: string;
	primaryMuscles: MuscleGroup[];
	secondaryMuscles?: MuscleGroup[];
	targetMuscles?: MuscleGroup[];
	equipment?: string | string[];
	difficulty?: FitnessLevel;
	description?: string;
	instructions?: string | string[];
	tips?: string[];
	videoUrl?: string;
	imageUrl?: string;
	isCustom?: boolean;
	isCompound: boolean;
	createdAt: string;
}

export interface WorkoutPlan {
	id: string;
	name: string;
	description?: string;
	category?: string;
	exercises: WorkoutExercise[];
	targetMuscles?: string[];
	targetMuscleGroups?: MuscleGroup[];
	estimatedDuration: number;
	difficulty: FitnessLevel;
	daysPerWeek?: number;
	isCustom?: boolean;
	isActive: boolean;
	color?: string;
	icon?: string;
	schedule?: number[] | { day: number; name: string }[];
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkoutSession {
	id: string;
	planId?: string;
	planName?: string;
	name: string;
	date: Date;
	startTime: Date;
	endTime?: Date;
	duration: number;
	exercises: WorkoutExercise[];
	totalVolume: number;
	caloriesBurned?: number;
	notes?: string;
	mood?: number; // 1-5
	energyLevel?: number;
	photoUrls?: string[];
	isCompleted: boolean;
}

export interface PersonalRecord {
	id: string;
	exerciseId: string;
	exerciseName: string;
	type: "weight" | "reps" | "volume" | "duration" | "distance";
	value: number;
	previousValue?: number;
	date: Date;
	workoutSessionId?: string;
}

export interface WorkoutStats {
	totalWorkouts: number;
	totalDuration: number;
	totalVolume: number;
	currentStreak: number;
	longestStreak: number;
	averageWorkoutDuration: number;
	workoutsThisWeek: number;
	workoutsThisMonth: number;
	favoriteExercises: { exerciseId: string; count: number }[];
	muscleGroupDistribution: {
		muscle: string | MuscleGroup;
		percentage: number;
	}[];
	weeklyProgress: { week: string; workouts: number; volume: number }[];
	monthlyProgress: { month: string; workouts: number; volume: number }[];
}

export interface MuscleProgress {
	muscle: MuscleGroup;
	lastWorked: Date | null;
	totalSets: number;
	totalVolume: number;
	recoveryStatus: "recovered" | "recovering" | "fatigued";
	hoursUntilRecovered: number;
}

export interface WorkoutStore {
	// State
	fitnessProfile: FitnessProfile | null;
	bodyMeasurements: BodyMeasurement[];
	bodyWeights: BodyWeight[];
	customExercises: CustomExercise[];
	workoutPlans: WorkoutPlan[];
	workoutSessions: WorkoutSession[];
	personalRecords: PersonalRecord[];
	currentSession: WorkoutSession | null;
	activePlanId: string | null;
	isLoading: boolean;
	userId: string | null;

	// Initialize
	initialize: (userId: string) => Promise<void>;

	// Fitness Profile
	setFitnessProfile: (profile: FitnessProfile) => Promise<void>;
	updateFitnessProfile: (updates: Partial<FitnessProfile>) => Promise<void>;

	// Body Measurements
	addBodyMeasurement: (
		measurement: Omit<BodyMeasurement, "id">
	) => Promise<void>;
	updateBodyMeasurement: (
		id: string,
		updates: Partial<BodyMeasurement>
	) => Promise<void>;
	deleteBodyMeasurement: (id: string) => Promise<void>;
	getLatestMeasurements: () => BodyMeasurement | null;

	// Body Weight
	logBodyWeight: (weight: number, unit: "kg" | "lbs") => Promise<void>;

	// Custom Exercises
	addCustomExercise: (exercise: CustomExercise) => Promise<void>;
	deleteCustomExercise: (id: string) => Promise<void>;

	// Workout Plans
	addWorkoutPlan: (plan: WorkoutPlan) => Promise<void>;
	updateWorkoutPlan: (
		id: string,
		updates: Partial<WorkoutPlan>
	) => Promise<void>;
	deleteWorkoutPlan: (id: string) => Promise<void>;
	setActivePlan: (id: string | null) => void;
	getActivePlan: () => WorkoutPlan | null;

	// Session Actions
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
	finishWorkout: (
		notes?: string,
		mood?: WorkoutSession["mood"],
		energyLevel?: number
	) => Promise<void>;
	cancelWorkout: () => void;
	addWorkoutSession: (session: WorkoutSession) => Promise<void>;
	deleteWorkoutSession: (id: string) => Promise<void>;

	// Personal Records
	checkAndUpdatePR: (
		exerciseId: string,
		exerciseName: string,
		type: PersonalRecord["type"],
		value: number,
		sessionId?: string
	) => Promise<boolean>;
	getPRsForExercise: (exerciseId: string) => PersonalRecord[];

	// Statistics
	getWorkoutStats: () => WorkoutStats;
	getMuscleProgress: () => any[];
	getWorkoutsInDateRange: (startDate: Date, endDate: Date) => WorkoutSession[];
	getTotalVolumeForMuscle: (muscle: string, days?: number) => number;
	getExerciseHistory: (exerciseId: string) => WorkoutSession[];
	getRecentWorkouts: (count?: number) => WorkoutSession[];
	getWorkoutsThisWeek: () => WorkoutSession[];
	getStreakCount: () => number;

	// Import/Export
	importData: (
		data: Partial<{
			fitnessProfile: FitnessProfile | null;
			bodyMeasurements: BodyMeasurement[];
			bodyWeights: BodyWeight[];
			customExercises: CustomExercise[];
			workoutPlans: WorkoutPlan[];
			workoutSessions: WorkoutSession[];
			personalRecords: PersonalRecord[];
			activePlanId: string | null;
		}>
	) => Promise<void>;
	clearAllData: () => Promise<void>;
}
