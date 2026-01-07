// Workout Tracker Types

export type Gender = "male" | "female" | "other";

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

export type ExerciseCategory =
	| "strength"
	| "cardio"
	| "flexibility"
	| "hiit"
	| "calisthenics"
	| "plyometrics";

export type WeightUnit = "kg" | "lbs";
export type DistanceUnit = "km" | "miles";

// User Fitness Profile
export interface FitnessProfile {
	gender: Gender;
	height: number; // in cm
	weight: number; // in kg
	age: number;
	fitnessLevel: FitnessLevel;
	goals: FitnessGoal[];
	targetWeight?: number;
	bodyFatPercentage?: number;
	weightUnit: WeightUnit;
	distanceUnit: DistanceUnit;
	injuries?: string[];
	weeklyWorkoutGoal: number; // days per week
}

// Body Measurements
export interface BodyMeasurements {
	id: string;
	date: Date;
	weight: number;
	bodyFatPercentage?: number;
	chest?: number;
	waist?: number;
	hips?: number;
	leftArm?: number;
	rightArm?: number;
	leftThigh?: number;
	rightThigh?: number;
	leftCalf?: number;
	rightCalf?: number;
	neck?: number;
	shoulders?: number;
}

// Simple Body Weight Entry
export interface BodyWeight {
	id: string;
	date: string;
	weight: number;
	unit: WeightUnit;
}

// Exercise Definition
export interface Exercise {
	id: string;
	name: string;
	category: ExerciseCategory;
	primaryMuscles: MuscleGroup[];
	secondaryMuscles: MuscleGroup[];
	targetMuscles: MuscleGroup[]; // Alias combining primary + secondary for convenience
	equipment: string[];
	difficulty: FitnessLevel;
	description: string;
	instructions: string[];
	tips?: string[];
	videoUrl?: string;
	imageUrl?: string;
	isCustom: boolean;
}

// Workout Set
export interface WorkoutSet {
	id: string;
	setNumber: number;
	reps?: number;
	weight?: number;
	duration?: number; // seconds (for timed exercises)
	distance?: number; // km (for cardio)
	restTime?: number; // seconds
	isWarmup: boolean;
	isDropset: boolean;
	isSuperset?: boolean; // Whether this set is part of a superset
	rpe?: number; // Rate of Perceived Exertion (1-10)
	completed: boolean;
	notes?: string;
}

// Exercise in a workout
export interface WorkoutExercise {
	id: string;
	exerciseId: string;
	exerciseName: string;
	targetMuscles: MuscleGroup[]; // Which muscles this targets
	sets: WorkoutSet[];
	targetSets: number;
	targetReps?: number;
	targetWeight?: number;
	restBetweenSets: number; // seconds
	supersetWith?: string; // exercise id
	notes?: string;
	order: number;
}

// Workout Session (logged workout)
export interface WorkoutSession {
	id: string;
	planId?: string; // if from a plan
	planName?: string;
	name: string;
	date: Date;
	startTime: Date;
	endTime?: Date;
	duration: number; // minutes
	exercises: WorkoutExercise[];
	totalVolume: number; // total weight × reps
	caloriesBurned?: number;
	mood?: number; // 1-5
	energyLevel?: number; // 1-5
	notes?: string;
	photoUrls?: string[];
	isCompleted: boolean;
}

// Workout Plan (template)
export interface WorkoutPlan {
	id: string;
	name: string;
	description?: string;
	category: ExerciseCategory;
	difficulty: FitnessLevel;
	targetMuscleGroups: MuscleGroup[];
	estimatedDuration: number; // minutes
	exercises: WorkoutExercise[];
	isCustom: boolean;
	isActive: boolean;
	color: string;
	icon: string;
	createdAt: Date;
	updatedAt: Date;
	daysPerWeek?: number;
	schedule?: {
		day: number; // 0-6 (Sun-Sat)
		name: string;
	}[];
}

// Personal Record
export interface PersonalRecord {
	id: string;
	exerciseId: string;
	exerciseName: string;
	type: "weight" | "reps" | "duration" | "distance";
	value: number;
	previousValue?: number;
	date: Date;
	workoutSessionId: string;
}

// Workout Statistics
export interface WorkoutStats {
	totalWorkouts: number;
	totalDuration: number; // minutes
	totalVolume: number;
	currentStreak: number;
	longestStreak: number;
	averageWorkoutDuration: number;
	workoutsThisWeek: number;
	workoutsThisMonth: number;
	favoriteExercises: { exerciseId: string; count: number }[];
	muscleGroupDistribution: { muscle: MuscleGroup; percentage: number }[];
	weeklyProgress: { week: string; workouts: number; volume: number }[];
	monthlyProgress: { month: string; workouts: number; volume: number }[];
}

// Muscle Group Progress
export interface MuscleProgress {
	muscle: MuscleGroup;
	lastWorked: Date | null;
	totalSets: number;
	totalVolume: number;
	recoveryStatus: "recovered" | "recovering" | "fatigued";
	hoursUntilRecovered: number;
}
