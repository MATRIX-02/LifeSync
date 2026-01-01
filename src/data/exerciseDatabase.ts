// Exercise Database - Pre-built exercises library

import { Exercise, MuscleGroup } from "../types/workout";

// Raw exercise data (without targetMuscles computed)
const RAW_EXERCISE_DATABASE: Omit<Exercise, "targetMuscles">[] = [
	// CHEST EXERCISES
	{
		id: "ex_bench_press",
		name: "Barbell Bench Press",
		category: "strength",
		primaryMuscles: ["chest"],
		secondaryMuscles: ["triceps", "shoulders"],
		equipment: ["barbell", "bench"],
		difficulty: "intermediate",
		description: "Classic compound movement for chest development",
		instructions: [
			"Lie on a flat bench with feet firmly on the ground",
			"Grip the barbell slightly wider than shoulder-width",
			"Unrack and lower the bar to your mid-chest",
			"Press the bar back up to full arm extension",
			"Keep your shoulder blades retracted throughout",
		],
		tips: ["Keep wrists straight", "Don't bounce off chest"],
		isCustom: false,
	},
	{
		id: "ex_incline_bench",
		name: "Incline Dumbbell Press",
		category: "strength",
		primaryMuscles: ["chest"],
		secondaryMuscles: ["shoulders", "triceps"],
		equipment: ["dumbbells", "incline bench"],
		difficulty: "intermediate",
		description: "Targets upper chest with incline angle",
		instructions: [
			"Set bench to 30-45 degree incline",
			"Hold dumbbells at shoulder level",
			"Press weights up and together",
			"Lower with control to starting position",
		],
		isCustom: false,
	},
	{
		id: "ex_dumbbell_flyes",
		name: "Dumbbell Flyes",
		category: "strength",
		primaryMuscles: ["chest"],
		secondaryMuscles: [],
		equipment: ["dumbbells", "bench"],
		difficulty: "beginner",
		description: "Isolation exercise for chest stretch and contraction",
		instructions: [
			"Lie on bench with dumbbells extended above chest",
			"With slight bend in elbows, lower weights out to sides",
			"Feel stretch in chest at bottom",
			"Squeeze chest to bring weights back together",
		],
		isCustom: false,
	},
	{
		id: "ex_pushups",
		name: "Push-Ups",
		category: "calisthenics",
		primaryMuscles: ["chest"],
		secondaryMuscles: ["triceps", "shoulders", "abs"],
		equipment: [],
		difficulty: "beginner",
		description: "Fundamental bodyweight chest exercise",
		instructions: [
			"Start in plank position with hands shoulder-width apart",
			"Lower body until chest nearly touches ground",
			"Push back up to starting position",
			"Keep core tight throughout",
		],
		isCustom: false,
	},
	{
		id: "ex_cable_crossover",
		name: "Cable Crossover",
		category: "strength",
		primaryMuscles: ["chest"],
		secondaryMuscles: [],
		equipment: ["cable machine"],
		difficulty: "intermediate",
		description: "Constant tension chest isolation",
		instructions: [
			"Set cables at high position",
			"Step forward with slight lean",
			"Bring handles together in front of chest",
			"Squeeze and return with control",
		],
		isCustom: false,
	},

	// BACK EXERCISES
	{
		id: "ex_deadlift",
		name: "Barbell Deadlift",
		category: "strength",
		primaryMuscles: ["back", "lower_back", "hamstrings"],
		secondaryMuscles: ["glutes", "traps", "forearms"],
		equipment: ["barbell"],
		difficulty: "advanced",
		description: "King of compound exercises for overall strength",
		instructions: [
			"Stand with feet hip-width apart, bar over mid-foot",
			"Hinge at hips, grip bar outside knees",
			"Keep back flat, chest up",
			"Drive through heels to stand up",
			"Lower with control by hinging hips back",
		],
		tips: ["Keep bar close to body", "Don't round lower back"],
		isCustom: false,
	},
	{
		id: "ex_pullups",
		name: "Pull-Ups",
		category: "calisthenics",
		primaryMuscles: ["lats", "back"],
		secondaryMuscles: ["biceps", "forearms"],
		equipment: ["pull-up bar"],
		difficulty: "intermediate",
		description: "Classic bodyweight back exercise",
		instructions: [
			"Hang from bar with overhand grip",
			"Pull yourself up until chin clears bar",
			"Lower with control",
			"Avoid swinging",
		],
		isCustom: false,
	},
	{
		id: "ex_barbell_row",
		name: "Barbell Row",
		category: "strength",
		primaryMuscles: ["back", "lats"],
		secondaryMuscles: ["biceps", "traps", "lower_back"],
		equipment: ["barbell"],
		difficulty: "intermediate",
		description: "Compound rowing movement for back thickness",
		instructions: [
			"Hinge forward at hips, back flat",
			"Grip barbell shoulder-width",
			"Pull bar to lower chest/upper abs",
			"Squeeze shoulder blades at top",
		],
		isCustom: false,
	},
	{
		id: "ex_lat_pulldown",
		name: "Lat Pulldown",
		category: "strength",
		primaryMuscles: ["lats"],
		secondaryMuscles: ["biceps", "back"],
		equipment: ["cable machine"],
		difficulty: "beginner",
		description: "Machine alternative to pull-ups",
		instructions: [
			"Grip bar wider than shoulders",
			"Pull bar down to upper chest",
			"Squeeze lats at bottom",
			"Control the weight up",
		],
		isCustom: false,
	},
	{
		id: "ex_seated_row",
		name: "Seated Cable Row",
		category: "strength",
		primaryMuscles: ["back"],
		secondaryMuscles: ["biceps", "lats"],
		equipment: ["cable machine"],
		difficulty: "beginner",
		description: "Controlled rowing for back development",
		instructions: [
			"Sit with feet on platform, knees slightly bent",
			"Pull handle to lower chest",
			"Squeeze shoulder blades together",
			"Extend arms with control",
		],
		isCustom: false,
	},

	// SHOULDER EXERCISES
	{
		id: "ex_overhead_press",
		name: "Overhead Press",
		category: "strength",
		primaryMuscles: ["shoulders"],
		secondaryMuscles: ["triceps", "traps"],
		equipment: ["barbell"],
		difficulty: "intermediate",
		description: "Primary compound shoulder builder",
		instructions: [
			"Stand with bar at shoulder level",
			"Press bar overhead to lockout",
			"Keep core tight, don't lean back",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_lateral_raises",
		name: "Lateral Raises",
		category: "strength",
		primaryMuscles: ["shoulders"],
		secondaryMuscles: [],
		equipment: ["dumbbells"],
		difficulty: "beginner",
		description: "Isolation for side delts",
		instructions: [
			"Stand with dumbbells at sides",
			"Raise arms out to sides to shoulder height",
			"Slight bend in elbows",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_face_pulls",
		name: "Face Pulls",
		category: "strength",
		primaryMuscles: ["shoulders"],
		secondaryMuscles: ["traps", "back"],
		equipment: ["cable machine", "rope"],
		difficulty: "beginner",
		description: "Rear delt and rotator cuff health",
		instructions: [
			"Set cable at face height with rope",
			"Pull rope towards face",
			"Separate hands at end of movement",
			"Squeeze rear delts",
		],
		isCustom: false,
	},

	// ARM EXERCISES
	{
		id: "ex_barbell_curl",
		name: "Barbell Curl",
		category: "strength",
		primaryMuscles: ["biceps"],
		secondaryMuscles: ["forearms"],
		equipment: ["barbell"],
		difficulty: "beginner",
		description: "Classic bicep builder",
		instructions: [
			"Stand with barbell, arms extended",
			"Curl bar up keeping elbows stationary",
			"Squeeze biceps at top",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_hammer_curl",
		name: "Hammer Curls",
		category: "strength",
		primaryMuscles: ["biceps", "forearms"],
		secondaryMuscles: [],
		equipment: ["dumbbells"],
		difficulty: "beginner",
		description: "Neutral grip for brachialis",
		instructions: [
			"Hold dumbbells with neutral grip",
			"Curl up keeping palms facing each other",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_tricep_pushdown",
		name: "Tricep Pushdown",
		category: "strength",
		primaryMuscles: ["triceps"],
		secondaryMuscles: [],
		equipment: ["cable machine"],
		difficulty: "beginner",
		description: "Isolation for triceps",
		instructions: [
			"Grip bar/rope at chest height",
			"Push down to full extension",
			"Keep elbows pinned to sides",
			"Return with control",
		],
		isCustom: false,
	},
	{
		id: "ex_skull_crushers",
		name: "Skull Crushers",
		category: "strength",
		primaryMuscles: ["triceps"],
		secondaryMuscles: [],
		equipment: ["ez bar", "bench"],
		difficulty: "intermediate",
		description: "Tricep isolation on bench",
		instructions: [
			"Lie on bench with bar extended above",
			"Lower bar to forehead by bending elbows",
			"Extend arms back to start",
			"Keep upper arms vertical",
		],
		isCustom: false,
	},

	// LEG EXERCISES
	{
		id: "ex_barbell_squat",
		name: "Barbell Squat",
		category: "strength",
		primaryMuscles: ["quadriceps", "glutes"],
		secondaryMuscles: ["hamstrings", "lower_back", "abs"],
		equipment: ["barbell", "squat rack"],
		difficulty: "intermediate",
		description: "King of leg exercises",
		instructions: [
			"Bar on upper back, feet shoulder-width",
			"Break at hips and knees simultaneously",
			"Descend until thighs parallel or below",
			"Drive through heels to stand",
		],
		tips: ["Keep knees tracking over toes", "Chest up throughout"],
		isCustom: false,
	},
	{
		id: "ex_leg_press",
		name: "Leg Press",
		category: "strength",
		primaryMuscles: ["quadriceps"],
		secondaryMuscles: ["glutes", "hamstrings"],
		equipment: ["leg press machine"],
		difficulty: "beginner",
		description: "Machine compound for legs",
		instructions: [
			"Sit in machine with back flat",
			"Place feet shoulder-width on platform",
			"Lower weight by bending knees",
			"Press back up without locking knees",
		],
		isCustom: false,
	},
	{
		id: "ex_lunges",
		name: "Walking Lunges",
		category: "strength",
		primaryMuscles: ["quadriceps", "glutes"],
		secondaryMuscles: ["hamstrings"],
		equipment: ["dumbbells"],
		difficulty: "beginner",
		description: "Unilateral leg strength",
		instructions: [
			"Step forward into lunge",
			"Lower back knee toward ground",
			"Push through front heel to step forward",
			"Alternate legs",
		],
		isCustom: false,
	},
	{
		id: "ex_romanian_deadlift",
		name: "Romanian Deadlift",
		category: "strength",
		primaryMuscles: ["hamstrings", "glutes"],
		secondaryMuscles: ["lower_back"],
		equipment: ["barbell"],
		difficulty: "intermediate",
		description: "Hip hinge for posterior chain",
		instructions: [
			"Hold bar at hip level",
			"Push hips back, slight knee bend",
			"Lower bar along legs feeling hamstring stretch",
			"Drive hips forward to stand",
		],
		isCustom: false,
	},
	{
		id: "ex_leg_curl",
		name: "Leg Curl",
		category: "strength",
		primaryMuscles: ["hamstrings"],
		secondaryMuscles: [],
		equipment: ["leg curl machine"],
		difficulty: "beginner",
		description: "Hamstring isolation",
		instructions: [
			"Lie face down on machine",
			"Curl heels toward glutes",
			"Squeeze hamstrings at top",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_leg_extension",
		name: "Leg Extension",
		category: "strength",
		primaryMuscles: ["quadriceps"],
		secondaryMuscles: [],
		equipment: ["leg extension machine"],
		difficulty: "beginner",
		description: "Quad isolation",
		instructions: [
			"Sit in machine with pad on shins",
			"Extend legs to straight",
			"Squeeze quads at top",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_calf_raises",
		name: "Standing Calf Raises",
		category: "strength",
		primaryMuscles: ["calves"],
		secondaryMuscles: [],
		equipment: ["calf raise machine"],
		difficulty: "beginner",
		description: "Primary calf builder",
		instructions: [
			"Stand with balls of feet on platform",
			"Lower heels for stretch",
			"Rise up on toes as high as possible",
			"Pause at top and lower",
		],
		isCustom: false,
	},

	// CORE EXERCISES
	{
		id: "ex_plank",
		name: "Plank",
		category: "calisthenics",
		primaryMuscles: ["abs"],
		secondaryMuscles: ["obliques", "shoulders"],
		equipment: [],
		difficulty: "beginner",
		description: "Isometric core stability",
		instructions: [
			"Support body on forearms and toes",
			"Keep body in straight line",
			"Don't let hips sag or pike up",
			"Hold for time",
		],
		isCustom: false,
	},
	{
		id: "ex_crunches",
		name: "Crunches",
		category: "calisthenics",
		primaryMuscles: ["abs"],
		secondaryMuscles: [],
		equipment: [],
		difficulty: "beginner",
		description: "Basic ab exercise",
		instructions: [
			"Lie on back with knees bent",
			"Hands behind head",
			"Curl shoulders off ground",
			"Lower with control",
		],
		isCustom: false,
	},
	{
		id: "ex_russian_twist",
		name: "Russian Twist",
		category: "calisthenics",
		primaryMuscles: ["obliques"],
		secondaryMuscles: ["abs"],
		equipment: ["weight plate"],
		difficulty: "intermediate",
		description: "Rotational core strength",
		instructions: [
			"Sit with knees bent, lean back slightly",
			"Hold weight at chest",
			"Rotate torso side to side",
			"Keep core engaged throughout",
		],
		isCustom: false,
	},
	{
		id: "ex_hanging_leg_raise",
		name: "Hanging Leg Raises",
		category: "calisthenics",
		primaryMuscles: ["abs"],
		secondaryMuscles: ["obliques"],
		equipment: ["pull-up bar"],
		difficulty: "advanced",
		description: "Advanced lower ab exercise",
		instructions: [
			"Hang from bar with straight arms",
			"Raise legs to parallel or higher",
			"Lower with control",
			"Avoid swinging",
		],
		isCustom: false,
	},

	// CARDIO EXERCISES
	{
		id: "ex_running",
		name: "Running",
		category: "cardio",
		primaryMuscles: ["quadriceps", "hamstrings", "calves"],
		secondaryMuscles: ["glutes", "abs"],
		equipment: ["treadmill"],
		difficulty: "beginner",
		description: "Classic cardio exercise",
		instructions: [
			"Start with warm-up pace",
			"Maintain steady breathing",
			"Land midfoot",
			"Cool down gradually",
		],
		isCustom: false,
	},
	{
		id: "ex_cycling",
		name: "Cycling",
		category: "cardio",
		primaryMuscles: ["quadriceps", "hamstrings"],
		secondaryMuscles: ["calves", "glutes"],
		equipment: ["bike", "stationary bike"],
		difficulty: "beginner",
		description: "Low impact cardio",
		instructions: [
			"Adjust seat height properly",
			"Maintain steady cadence",
			"Control resistance",
		],
		isCustom: false,
	},
	{
		id: "ex_rowing",
		name: "Rowing Machine",
		category: "cardio",
		primaryMuscles: ["back", "lats"],
		secondaryMuscles: ["biceps", "legs", "abs"],
		equipment: ["rowing machine"],
		difficulty: "intermediate",
		description: "Full body cardio",
		instructions: [
			"Push with legs first",
			"Pull handle to chest",
			"Return arms then bend knees",
			"Maintain rhythm",
		],
		isCustom: false,
	},
	{
		id: "ex_jump_rope",
		name: "Jump Rope",
		category: "cardio",
		primaryMuscles: ["calves"],
		secondaryMuscles: ["shoulders", "abs"],
		equipment: ["jump rope"],
		difficulty: "intermediate",
		description: "High intensity cardio",
		instructions: [
			"Keep jumps small and controlled",
			"Land on balls of feet",
			"Keep elbows close to body",
			"Wrists do the work",
		],
		isCustom: false,
	},
	{
		id: "ex_burpees",
		name: "Burpees",
		category: "hiit",
		primaryMuscles: ["chest", "quadriceps"],
		secondaryMuscles: ["shoulders", "abs", "triceps"],
		equipment: [],
		difficulty: "intermediate",
		description: "Full body conditioning",
		instructions: [
			"Start standing",
			"Drop to push-up position",
			"Perform push-up",
			"Jump feet to hands and jump up",
		],
		isCustom: false,
	},
];

// Add targetMuscles computed property to all exercises
export const EXERCISE_DATABASE: Exercise[] = RAW_EXERCISE_DATABASE.map(
	(ex) => ({
		...ex,
		targetMuscles: [...ex.primaryMuscles, ...ex.secondaryMuscles],
	})
);

// Get exercises by muscle group
export const getExercisesByMuscle = (muscle: MuscleGroup): Exercise[] => {
	return EXERCISE_DATABASE.filter(
		(ex) =>
			ex.primaryMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle)
	);
};

// Get exercises by category
export const getExercisesByCategory = (
	category: Exercise["category"]
): Exercise[] => {
	return EXERCISE_DATABASE.filter((ex) => ex.category === category);
};

// Get exercise by ID
export const getExerciseById = (id: string): Exercise | undefined => {
	return EXERCISE_DATABASE.find((ex) => ex.id === id);
};

// Search exercises
export const searchExercises = (query: string): Exercise[] => {
	const lowerQuery = query.toLowerCase();
	return EXERCISE_DATABASE.filter(
		(ex) =>
			ex.name.toLowerCase().includes(lowerQuery) ||
			ex.primaryMuscles.some((m) => m.includes(lowerQuery)) ||
			ex.category.includes(lowerQuery)
	);
};

// Muscle group info for visualization
export const MUSCLE_GROUP_INFO: Record<
	MuscleGroup,
	{ name: string; color: string }
> = {
	chest: { name: "Chest", color: "#EF4444" },
	back: { name: "Back", color: "#F97316" },
	shoulders: { name: "Shoulders", color: "#EAB308" },
	biceps: { name: "Biceps", color: "#22C55E" },
	triceps: { name: "Triceps", color: "#14B8A6" },
	forearms: { name: "Forearms", color: "#06B6D4" },
	abs: { name: "Abs", color: "#3B82F6" },
	obliques: { name: "Obliques", color: "#6366F1" },
	quadriceps: { name: "Quadriceps", color: "#8B5CF6" },
	hamstrings: { name: "Hamstrings", color: "#A855F7" },
	glutes: { name: "Glutes", color: "#D946EF" },
	calves: { name: "Calves", color: "#EC4899" },
	traps: { name: "Traps", color: "#F43F5E" },
	lats: { name: "Lats", color: "#FB7185" },
	lower_back: { name: "Lower Back", color: "#FBBF24" },
};
