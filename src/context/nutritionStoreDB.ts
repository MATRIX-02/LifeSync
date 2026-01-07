/**
 * NutriPlan - Database-First Nutrition Store
 * Comprehensive meal tracking with gut health, hydration, and fasting support
 * All operations write directly to Supabase - no local storage
 *
 * Note: This store uses flexible internal types that differ from the strict
 * exported types to handle Date objects and database transformations.
 */
import { create } from "zustand";
import { supabase as supabaseClient } from "../config/supabase";
import type {
	FastingType,
	FoodItem,
	MealType,
	NutritionProfile,
} from "../types/nutrition";

// Cast to any to bypass strict TS type checking for Supabase queries
const supabase = supabaseClient as any;

// Internal types that differ from exported types (use Date objects, etc.)
interface InternalMealLogEntry {
	id: string;
	userId: string;
	date: Date;
	mealType: MealType;
	foods: any[];
	nutrition: any;
	totalNutrition?: any;
	notes?: string;
	photoUrl?: string;
	isHomeCooked?: boolean;
	rating?: number;
	createdAt: Date;
}

interface InternalGutHealthLog {
	id: string;
	userId: string;
	date: Date;
	stoolType?: number;
	symptoms: string[];
	probioticFoods?: string[];
	prebioticFoods?: string[];
	digestionRating?: number;
	energyLevel?: number;
	notes?: string;
	createdAt: Date;
}

interface InternalHydrationLog {
	id: string;
	userId: string;
	date: Date;
	amount: number;
	unit: string;
	timestamp: Date;
	createdAt?: Date;
}

interface InternalFastingLog {
	id: string;
	userId: string;
	startTime: Date;
	endTime?: Date;
	targetHours: number;
	targetDuration?: number;
	actualHours?: number;
	fastingType?: FastingType;
	type?: FastingType;
	completed: boolean;
	notes?: string;
	createdAt?: Date;
}

interface InternalMealPlan {
	id: string;
	userId: string;
	name: string;
	description?: string;
	meals: any[];
	startDate?: Date;
	endDate?: Date;
	isActive: boolean;
	createdAt: Date;
}

interface InternalSupplementLog {
	id: string;
	userId: string;
	date: Date;
	time: Date;
	supplementName?: string;
	supplements?: any[];
	dosage?: string;
	unit?: string;
	notes?: string;
	createdAt?: Date;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = (): string => {
	return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const objectToCamelCase = (obj: Record<string, any>): Record<string, any> => {
	const result: Record<string, any> = {};
	for (const key in obj) {
		const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
			letter.toUpperCase()
		);
		result[camelKey] = obj[key];
	}
	return result;
};

const objectToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
	const result: Record<string, any> = {};
	for (const key in obj) {
		const snakeKey = key.replace(
			/[A-Z]/g,
			(letter) => `_${letter.toLowerCase()}`
		);
		result[snakeKey] = obj[key];
	}
	return result;
};

// ============================================
// STORE TYPES
// ============================================

interface DailyNutritionSummary {
	date: string;
	totalCalories: number;
	totalProtein: number;
	totalCarbs: number;
	totalFat: number;
	totalFiber: number;
	totalSugar: number;
	totalWater: number;
	mealCount: number;
	calorieGoal: number;
	proteinGoal: number;
	carbGoal: number;
	fatGoal: number;
	waterGoal: number;
}

interface NutritionInsight {
	type: "success" | "warning" | "info" | "tip";
	title: string;
	message: string;
	icon?: string;
}

interface NutritionStore {
	// State - using internal types for runtime flexibility
	nutritionProfile: NutritionProfile | null;
	customFoods: FoodItem[];
	mealLogs: InternalMealLogEntry[];
	gutHealthLogs: InternalGutHealthLog[];
	hydrationLogs: InternalHydrationLog[];
	fastingLogs: InternalFastingLog[];
	mealPlans: InternalMealPlan[];
	supplementLogs: InternalSupplementLog[];
	currentFasting: InternalFastingLog | null;
	isLoading: boolean;
	userId: string | null;

	// Initialization
	initialize: (userId: string) => Promise<void>;

	// Nutrition Profile
	setNutritionProfile: (profile: Partial<NutritionProfile>) => Promise<void>;
	calculateDailyGoals: () => {
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		water: number;
	};

	// Meal Logging - using any for flexible entry types
	logMeal: (entry: any) => Promise<void>;
	updateMealLog: (id: string, updates: any) => Promise<void>;
	deleteMealLog: (id: string) => Promise<void>;
	getMealsByDate: (date: Date) => InternalMealLogEntry[];
	getMealsByDateRange: (
		startDate: Date,
		endDate: Date
	) => InternalMealLogEntry[];

	// Custom Foods
	addCustomFood: (food: Omit<FoodItem, "id">) => Promise<void>;
	updateCustomFood: (id: string, updates: Partial<FoodItem>) => Promise<void>;
	deleteCustomFood: (id: string) => Promise<void>;

	// Gut Health - using any for flexible entry types
	logGutHealth: (entry: any) => Promise<void>;
	updateGutHealthLog: (id: string, updates: any) => Promise<void>;
	deleteGutHealthLog: (id: string) => Promise<void>;
	getGutHealthByDate: (date: Date) => InternalGutHealthLog[];
	getGutHealthTrend: (days: number) => InternalGutHealthLog[];

	// Hydration
	logWater: (amount: number, unit?: string) => Promise<void>;
	updateHydrationLog: (id: string, updates: any) => Promise<void>;
	deleteHydrationLog: (id: string) => Promise<void>;
	getTodayWaterIntake: () => number;
	getHydrationByDate: (date: Date) => InternalHydrationLog[];

	// Fasting
	startFast: (type: FastingType, targetHours: number) => Promise<void>;
	endFast: (notes?: string) => Promise<void>;
	cancelFast: () => Promise<void>;
	getFastingHistory: () => InternalFastingLog[];
	getCurrentFastProgress: () => {
		elapsedHours: number;
		remainingHours: number;
		progress: number;
	} | null;

	// Meal Plans
	createMealPlan: (plan: any) => Promise<void>;
	updateMealPlan: (id: string, updates: any) => Promise<void>;
	deleteMealPlan: (id: string) => Promise<void>;
	setActiveMealPlan: (id: string) => Promise<void>;

	// Supplements
	logSupplement: (entry: any) => Promise<void>;
	deleteSupplementLog: (id: string) => Promise<void>;

	// Analytics & Insights
	getDailySummary: (date: Date) => DailyNutritionSummary;
	getWeeklyAverages: () => DailyNutritionSummary;
	getNutritionInsights: () => NutritionInsight[];
	getMacroBreakdown: (date: Date) => {
		protein: number;
		carbs: number;
		fat: number;
	};
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useNutritionStore = create<NutritionStore>()((set, get) => ({
	// Initial State
	nutritionProfile: null,
	customFoods: [],
	mealLogs: [],
	gutHealthLogs: [],
	hydrationLogs: [],
	fastingLogs: [],
	mealPlans: [],
	supplementLogs: [],
	currentFasting: null,
	isLoading: false,
	userId: null,

	// ============================================
	// INITIALIZATION
	// ============================================
	initialize: async (userId: string) => {
		console.log("📥 Loading nutrition data from database for user:", userId);
		set({ isLoading: true, userId });

		try {
			const today = new Date();
			const thirtyDaysAgo = new Date(
				today.getTime() - 30 * 24 * 60 * 60 * 1000
			);

			const [
				profileRes,
				customFoodsRes,
				mealLogsRes,
				gutHealthRes,
				hydrationRes,
				fastingRes,
				mealPlansRes,
				supplementsRes,
			] = await Promise.all([
				supabase
					.from("nutrition_profiles")
					.select("*")
					.eq("user_id", userId)
					.single(),
				supabase.from("custom_foods").select("*").eq("user_id", userId),
				supabase
					.from("meal_logs")
					.select("*")
					.eq("user_id", userId)
					.gte("date", thirtyDaysAgo.toISOString().split("T")[0])
					.order("date", { ascending: false }),
				supabase
					.from("gut_health_logs")
					.select("*")
					.eq("user_id", userId)
					.gte("date", thirtyDaysAgo.toISOString().split("T")[0])
					.order("date", { ascending: false }),
				supabase
					.from("hydration_logs")
					.select("*")
					.eq("user_id", userId)
					.gte("date", thirtyDaysAgo.toISOString().split("T")[0])
					.order("timestamp", { ascending: false }),
				supabase
					.from("fasting_logs")
					.select("*")
					.eq("user_id", userId)
					.order("start_time", { ascending: false })
					.limit(30),
				supabase.from("meal_plans").select("*").eq("user_id", userId),
				supabase
					.from("supplement_logs")
					.select("*")
					.eq("user_id", userId)
					.gte("date", thirtyDaysAgo.toISOString().split("T")[0]),
			]);

			// Process profile
			const nutritionProfile =
				profileRes.data && !profileRes.error
					? (objectToCamelCase(profileRes.data) as NutritionProfile)
					: null;

			// Process custom foods
			const customFoods = (customFoodsRes.data || []).map((food: any) => {
				const camelFood = objectToCamelCase(food);
				return {
					...camelFood,
					nutrition:
						typeof camelFood.nutrition === "string"
							? JSON.parse(camelFood.nutrition)
							: camelFood.nutrition,
					dietaryTags:
						typeof camelFood.dietaryTags === "string"
							? JSON.parse(camelFood.dietaryTags)
							: camelFood.dietaryTags || [],
					cuisineType:
						typeof camelFood.cuisineType === "string"
							? JSON.parse(camelFood.cuisineType)
							: camelFood.cuisineType || [],
				} as FoodItem;
			});

			// Process meal logs
			const mealLogs = (mealLogsRes.data || []).map((log: any) => {
				const camelLog = objectToCamelCase(log);
				return {
					...camelLog,
					date: new Date(camelLog.date),
					foods:
						typeof camelLog.foods === "string"
							? JSON.parse(camelLog.foods)
							: camelLog.foods || [],
					nutrition:
						typeof camelLog.totalNutrition === "string"
							? JSON.parse(camelLog.totalNutrition)
							: camelLog.totalNutrition || {},
				} as InternalMealLogEntry;
			});

			// Process gut health logs
			const gutHealthLogs = (gutHealthRes.data || []).map((log: any) => {
				const camelLog = objectToCamelCase(log);
				return {
					...camelLog,
					date: new Date(camelLog.date),
					digestionRating: camelLog.overallGutFeeling,
					symptoms:
						typeof camelLog.symptoms === "string"
							? JSON.parse(camelLog.symptoms)
							: camelLog.symptoms || [],
					probioticFoods:
						typeof camelLog.probioticFoods === "string"
							? JSON.parse(camelLog.probioticFoods)
							: camelLog.probioticFoods || [],
					prebioticFoods:
						typeof camelLog.prebioticFoods === "string"
							? JSON.parse(camelLog.prebioticFoods)
							: camelLog.prebioticFoods || [],
				} as InternalGutHealthLog;
			});

			// Process hydration logs
			const hydrationLogs = (hydrationRes.data || []).map((log: any) => {
				const camelLog = objectToCamelCase(log);
				return {
					...camelLog,
					date: new Date(camelLog.date),
					amount: camelLog.amountMl,
					timestamp: new Date(camelLog.timestamp),
				} as InternalHydrationLog;
			});

			// Process fasting logs
			const fastingLogs = (fastingRes.data || []).map((log: any) => {
				const camelLog = objectToCamelCase(log);
				return {
					...camelLog,
					fastingType: camelLog.fastType,
					startTime: new Date(camelLog.startTime),
					endTime: camelLog.endTime ? new Date(camelLog.endTime) : undefined,
				} as InternalFastingLog;
			});

			// Find current active fast
			const currentFasting =
				fastingLogs.find((f: InternalFastingLog) => !f.completed) || null;

			// Process meal plans
			const mealPlans = (mealPlansRes.data || []).map((plan: any) => {
				const camelPlan = objectToCamelCase(plan);
				return {
					...camelPlan,
					meals:
						typeof camelPlan.meals === "string"
							? JSON.parse(camelPlan.meals)
							: camelPlan.meals || [],
					startDate: camelPlan.startDate
						? new Date(camelPlan.startDate)
						: undefined,
					endDate: camelPlan.endDate ? new Date(camelPlan.endDate) : undefined,
				} as InternalMealPlan;
			});

			// Process supplement logs
			const supplementLogs = (supplementsRes.data || []).map((log: any) => {
				const camelLog = objectToCamelCase(log);
				return {
					...camelLog,
					date: new Date(camelLog.date),
					time: new Date(camelLog.time),
				} as InternalSupplementLog;
			});

			console.log(
				`✅ Loaded ${mealLogs.length} meal logs, ${gutHealthLogs.length} gut health logs, ${hydrationLogs.length} hydration logs`
			);

			set({
				nutritionProfile,
				customFoods,
				mealLogs,
				gutHealthLogs,
				hydrationLogs,
				fastingLogs,
				mealPlans,
				supplementLogs,
				currentFasting,
				isLoading: false,
			});
		} catch (error) {
			console.error("❌ Error loading nutrition data:", error);
			set({ isLoading: false });
		}
	},

	// ============================================
	// NUTRITION PROFILE
	// ============================================
	setNutritionProfile: async (profile) => {
		const { userId, nutritionProfile } = get();
		if (!userId) return;

		try {
			const profileData: any = {
				user_id: userId,
				...objectToSnakeCase(profile),
				updated_at: new Date().toISOString(),
			};

			if (nutritionProfile?.id) {
				// Update existing
				const { error } = await supabase
					.from("nutrition_profiles")
					.update(profileData)
					.eq("id", nutritionProfile.id);

				if (error) throw error;
			} else {
				// Insert new
				profileData.id = generateId();
				profileData.created_at = new Date().toISOString();

				const { error } = await supabase
					.from("nutrition_profiles")
					.insert(profileData);

				if (error) throw error;
			}

			set({
				nutritionProfile: {
					...nutritionProfile,
					...profile,
				} as NutritionProfile,
			});
		} catch (error) {
			console.error("❌ Error saving nutrition profile:", error);
		}
	},

	calculateDailyGoals: () => {
		const { nutritionProfile } = get();

		if (!nutritionProfile) {
			// Default goals
			return {
				calories: 2000,
				protein: 60,
				carbs: 250,
				fat: 65,
				water: 2500,
			};
		}

		// Calculate BMR using Mifflin-St Jeor equation
		let bmr = 10 * (nutritionProfile.weight || 70);
		bmr += 6.25 * (nutritionProfile.height || 170);
		bmr -= 5 * (nutritionProfile.age || 30);
		bmr += nutritionProfile.gender === "male" ? 5 : -161;

		// Activity multiplier
		const activityMultipliers: Record<string, number> = {
			sedentary: 1.2,
			lightly_active: 1.375,
			light: 1.375,
			moderately_active: 1.55,
			moderate: 1.55,
			very_active: 1.725,
			active: 1.725,
			extremely_active: 1.9,
		};
		const activityLevel = nutritionProfile.activityLevel || "moderate";
		const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

		// Adjust for goal (handle both naming conventions)
		const goal = nutritionProfile.goal;
		let calories = tdee;
		if (goal === "lose_weight" || (goal as string) === "weight_loss") {
			calories = tdee - 500; // 500 calorie deficit
		} else if (goal === "gain_muscle" || (goal as string) === "muscle_gain") {
			calories = tdee + 300; // 300 calorie surplus
		}

		// Macro split based on goal
		let proteinRatio = 0.25;
		let carbRatio = 0.45;
		let fatRatio = 0.3;

		if (goal === "gain_muscle" || (goal as string) === "muscle_gain") {
			proteinRatio = 0.3;
			carbRatio = 0.45;
			fatRatio = 0.25;
		} else if (goal === "lose_weight" || (goal as string) === "weight_loss") {
			proteinRatio = 0.3;
			carbRatio = 0.35;
			fatRatio = 0.35;
		}

		return {
			calories: Math.round(calories),
			protein: Math.round((calories * proteinRatio) / 4), // 4 cal per gram
			carbs: Math.round((calories * carbRatio) / 4), // 4 cal per gram
			fat: Math.round((calories * fatRatio) / 9), // 9 cal per gram
			water: nutritionProfile.targetWater || 2500,
		};
	},

	// ============================================
	// MEAL LOGGING
	// ============================================
	logMeal: async (entry: any) => {
		const { userId, mealLogs } = get();
		if (!userId) return;

		try {
			const now = new Date();
			const entryDate =
				entry.date instanceof Date ? entry.date : new Date(entry.date);

			const mealData = {
				user_id: userId,
				date: entryDate.toISOString().split("T")[0],
				meal_type: entry.mealType,
				foods: JSON.stringify(entry.foods),
				total_nutrition: JSON.stringify(entry.nutrition),
				notes: entry.notes,
				photo_url: entry.photoUrl,
				is_home_cooked: entry.isHomeCooked,
				rating: entry.rating,
				created_at: now.toISOString(),
			};

			const { data, error } = await supabase
				.from("meal_logs")
				.insert(mealData)
				.select()
				.single();
			if (error) throw error;

			const newLog: InternalMealLogEntry = {
				id: data.id,
				userId,
				date: entryDate,
				mealType: entry.mealType,
				foods: entry.foods,
				nutrition: entry.nutrition,
				notes: entry.notes,
				photoUrl: entry.photoUrl,
				isHomeCooked: entry.isHomeCooked,
				rating: entry.rating,
				createdAt: now,
			};

			set({ mealLogs: [newLog, ...mealLogs] });
			console.log("✅ Meal logged:", entry.mealType);
		} catch (error) {
			console.error("❌ Error logging meal:", error);
		}
	},

	updateMealLog: async (id, updates: any) => {
		const { mealLogs } = get();

		try {
			const updateData: any = { ...objectToSnakeCase(updates) };
			if (updates.date) {
				const updateDate =
					updates.date instanceof Date ? updates.date : new Date(updates.date);
				updateData.date = updateDate.toISOString().split("T")[0];
			}
			if (updates.foods) updateData.foods = JSON.stringify(updates.foods);
			if (updates.nutrition)
				updateData.total_nutrition = JSON.stringify(updates.nutrition);

			const { error } = await supabase
				.from("meal_logs")
				.update(updateData)
				.eq("id", id);
			if (error) throw error;

			set({
				mealLogs: mealLogs.map((log) =>
					log.id === id ? { ...log, ...updates } : log
				),
			});
		} catch (error) {
			console.error("❌ Error updating meal log:", error);
		}
	},

	deleteMealLog: async (id) => {
		const { mealLogs } = get();

		try {
			const { error } = await supabase.from("meal_logs").delete().eq("id", id);
			if (error) throw error;

			set({ mealLogs: mealLogs.filter((log) => log.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting meal log:", error);
		}
	},

	getMealsByDate: (date) => {
		const { mealLogs } = get();
		const inputDate = date instanceof Date ? date : new Date(date);
		const dateStr = inputDate.toISOString().split("T")[0];
		return mealLogs.filter((log) => {
			const logDate = log.date instanceof Date ? log.date : new Date(log.date);
			return logDate.toISOString().split("T")[0] === dateStr;
		});
	},

	getMealsByDateRange: (startDate, endDate) => {
		const { mealLogs } = get();
		const start = startDate instanceof Date ? startDate : new Date(startDate);
		const end = endDate instanceof Date ? endDate : new Date(endDate);
		return mealLogs.filter((log) => {
			const logDate = log.date instanceof Date ? log.date : new Date(log.date);
			return logDate >= start && logDate <= end;
		});
	},

	// ============================================
	// CUSTOM FOODS
	// ============================================
	addCustomFood: async (food) => {
		const { userId, customFoods } = get();
		if (!userId) return;

		try {
			const foodData = {
				user_id: userId,
				name: food.name,
				name_hindi: food.nameHindi,
				category: food.category,
				cuisine_type: JSON.stringify(food.cuisineType || []),
				dietary_tags: JSON.stringify(food.dietaryTags || []),
				nutrition: JSON.stringify(food.nutrition),
				glycemic_index: food.glycemicIndex,
				is_probiotic: food.isProbiotic,
				is_prebiotic: food.isPrebiotic,
				is_anti_inflammatory: food.isAntiInflammatory,
				created_at: new Date().toISOString(),
			};

			const { data, error } = await supabase
				.from("custom_foods")
				.insert(foodData)
				.select()
				.single();
			if (error) throw error;

			const newFood: FoodItem = { ...food, id: data.id };
			set({ customFoods: [...customFoods, newFood] });
			console.log("✅ Custom food added:", food.name);
		} catch (error) {
			console.error("❌ Error adding custom food:", error);
		}
	},

	updateCustomFood: async (id, updates) => {
		const { customFoods } = get();

		try {
			const updateData: any = { ...objectToSnakeCase(updates) };
			if (updates.nutrition)
				updateData.nutrition = JSON.stringify(updates.nutrition);
			if (updates.dietaryTags)
				updateData.dietary_tags = JSON.stringify(updates.dietaryTags);
			if (updates.cuisineType)
				updateData.cuisine_type = JSON.stringify(updates.cuisineType);

			const { error } = await supabase
				.from("custom_foods")
				.update(updateData)
				.eq("id", id);
			if (error) throw error;

			set({
				customFoods: customFoods.map((food) =>
					food.id === id ? { ...food, ...updates } : food
				),
			});
		} catch (error) {
			console.error("❌ Error updating custom food:", error);
		}
	},

	deleteCustomFood: async (id) => {
		const { customFoods } = get();

		try {
			const { error } = await supabase
				.from("custom_foods")
				.delete()
				.eq("id", id);
			if (error) throw error;

			set({ customFoods: customFoods.filter((food) => food.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting custom food:", error);
		}
	},

	// ============================================
	// GUT HEALTH
	// ============================================
	logGutHealth: async (entry: any) => {
		const { userId, gutHealthLogs } = get();
		if (!userId) return;

		try {
			const now = new Date();
			const entryDate =
				entry.date instanceof Date ? entry.date : new Date(entry.date);

			const gutData = {
				user_id: userId,
				date: entryDate.toISOString().split("T")[0],
				stool_type: entry.stoolType || entry.bristolStoolType,
				symptoms: JSON.stringify(entry.symptoms || entry.gutSymptoms || []),
				probiotic_foods: JSON.stringify(entry.probioticFoods || []),
				prebiotic_foods: JSON.stringify(entry.prebioticFoods || []),
				overall_gut_feeling: entry.digestionRating || entry.overallGutFeeling,
				energy_level: entry.energyLevel,
				notes: entry.notes,
				created_at: now.toISOString(),
			};

			const { data, error } = await supabase
				.from("gut_health_logs")
				.insert(gutData)
				.select()
				.single();
			if (error) throw error;

			const newLog: InternalGutHealthLog = {
				id: data.id,
				userId,
				date: entryDate,
				stoolType: entry.stoolType || entry.bristolStoolType,
				symptoms: entry.symptoms || entry.gutSymptoms || [],
				probioticFoods: entry.probioticFoods || [],
				prebioticFoods: entry.prebioticFoods || [],
				digestionRating: entry.digestionRating || entry.overallGutFeeling,
				energyLevel: entry.energyLevel,
				notes: entry.notes,
				createdAt: now,
			};

			set({ gutHealthLogs: [newLog, ...gutHealthLogs] });
			console.log("✅ Gut health logged");
		} catch (error) {
			console.error("❌ Error logging gut health:", error);
		}
	},

	updateGutHealthLog: async (id, updates: any) => {
		const { gutHealthLogs } = get();

		try {
			const updateData: any = { ...objectToSnakeCase(updates) };
			// Map digestionRating to database column name
			if (updates.digestionRating !== undefined) {
				updateData.overall_gut_feeling = updates.digestionRating;
				delete updateData.digestion_rating;
			}
			if (updates.date) {
				const updateDate =
					updates.date instanceof Date ? updates.date : new Date(updates.date);
				updateData.date = updateDate.toISOString().split("T")[0];
			}
			if (updates.symptoms)
				updateData.symptoms = JSON.stringify(updates.symptoms);
			if (updates.probioticFoods)
				updateData.probiotic_foods = JSON.stringify(updates.probioticFoods);
			if (updates.prebioticFoods)
				updateData.prebiotic_foods = JSON.stringify(updates.prebioticFoods);

			const { error } = await supabase
				.from("gut_health_logs")
				.update(updateData)
				.eq("id", id);
			if (error) throw error;

			set({
				gutHealthLogs: gutHealthLogs.map((log) =>
					log.id === id ? { ...log, ...updates } : log
				),
			});
		} catch (error) {
			console.error("❌ Error updating gut health log:", error);
		}
	},

	deleteGutHealthLog: async (id) => {
		const { gutHealthLogs } = get();

		try {
			const { error } = await supabase
				.from("gut_health_logs")
				.delete()
				.eq("id", id);
			if (error) throw error;

			set({ gutHealthLogs: gutHealthLogs.filter((log) => log.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting gut health log:", error);
		}
	},

	getGutHealthByDate: (date) => {
		const { gutHealthLogs } = get();
		const inputDate = date instanceof Date ? date : new Date(date);
		const dateStr = inputDate.toISOString().split("T")[0];
		return gutHealthLogs.filter((log) => {
			const logDate = log.date instanceof Date ? log.date : new Date(log.date);
			return logDate.toISOString().split("T")[0] === dateStr;
		});
	},

	getGutHealthTrend: (days) => {
		const { gutHealthLogs } = get();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);
		return gutHealthLogs.filter((log) => {
			const logDate = log.date instanceof Date ? log.date : new Date(log.date);
			return logDate >= startDate;
		});
	},

	// ============================================
	// HYDRATION
	// ============================================
	logWater: async (amount, unit = "ml") => {
		const { userId, hydrationLogs } = get();
		if (!userId) return;

		try {
			const now = new Date();

			const hydrationData = {
				user_id: userId,
				date: now.toISOString().split("T")[0],
				amount_ml: amount,
				unit,
				timestamp: now.toISOString(),
			};

			const { data, error } = await supabase
				.from("hydration_logs")
				.insert(hydrationData)
				.select()
				.single();
			if (error) throw error;

			const newLog: InternalHydrationLog = {
				id: data.id,
				userId,
				date: now,
				amount,
				unit,
				timestamp: now,
			};

			set({ hydrationLogs: [newLog, ...hydrationLogs] });
			console.log(`✅ Water logged: ${amount}${unit}`);
		} catch (error) {
			console.error("❌ Error logging water:", error);
		}
	},

	updateHydrationLog: async (id, updates) => {
		const { hydrationLogs } = get();

		try {
			const updateData: any = objectToSnakeCase(updates);
			// Map amount to database column name
			if ((updates as any).amount !== undefined) {
				updateData.amount_ml = (updates as any).amount;
				delete updateData.amount;
			}
			const { error } = await supabase
				.from("hydration_logs")
				.update(updateData)
				.eq("id", id);
			if (error) throw error;

			set({
				hydrationLogs: hydrationLogs.map((log) =>
					log.id === id ? { ...log, ...updates } : log
				),
			});
		} catch (error) {
			console.error("❌ Error updating hydration log:", error);
		}
	},

	deleteHydrationLog: async (id) => {
		const { hydrationLogs } = get();

		try {
			const { error } = await supabase
				.from("hydration_logs")
				.delete()
				.eq("id", id);
			if (error) throw error;

			set({ hydrationLogs: hydrationLogs.filter((log) => log.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting hydration log:", error);
		}
	},

	getTodayWaterIntake: () => {
		const { hydrationLogs } = get();
		const today = new Date().toISOString().split("T")[0];
		return hydrationLogs
			.filter((log) => {
				const logDate =
					log.date instanceof Date ? log.date : new Date(log.date);
				return logDate.toISOString().split("T")[0] === today;
			})
			.reduce((total, log) => total + log.amount, 0);
	},

	getHydrationByDate: (date) => {
		const { hydrationLogs } = get();
		const inputDate = date instanceof Date ? date : new Date(date);
		const dateStr = inputDate.toISOString().split("T")[0];
		return hydrationLogs.filter((log) => {
			const logDate = log.date instanceof Date ? log.date : new Date(log.date);
			return logDate.toISOString().split("T")[0] === dateStr;
		});
	},

	// ============================================
	// FASTING
	// ============================================
	startFast: async (type, targetHours) => {
		const { userId, fastingLogs, currentFasting } = get();
		if (!userId || currentFasting) return;

		try {
			const now = new Date();

			const fastingData = {
				user_id: userId,
				fast_type: type,
				start_time: now.toISOString(),
				target_hours: targetHours,
				completed: false,
			};

			const { data, error } = await supabase
				.from("fasting_logs")
				.insert(fastingData)
				.select()
				.single();
			if (error) throw error;

			const newFast: InternalFastingLog = {
				id: data.id,
				userId,
				fastingType: type,
				startTime: now,
				targetHours,
				completed: false,
			};

			set({
				fastingLogs: [newFast, ...fastingLogs],
				currentFasting: newFast,
			});
			console.log(`✅ Fast started: ${type} for ${targetHours} hours`);
		} catch (error) {
			console.error("❌ Error starting fast:", error);
		}
	},

	endFast: async (notes) => {
		const { currentFasting, fastingLogs } = get();
		if (!currentFasting) return;

		try {
			const now = new Date();
			const startTime =
				currentFasting.startTime instanceof Date
					? currentFasting.startTime
					: new Date(currentFasting.startTime);
			const actualHours =
				(now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

			const updateData = {
				end_time: now.toISOString(),
				actual_hours: Math.round(actualHours * 10) / 10,
				completed: true,
				notes,
			};

			const { error } = await supabase
				.from("fasting_logs")
				.update(updateData)
				.eq("id", currentFasting.id);
			if (error) throw error;

			set({
				fastingLogs: fastingLogs.map((log) =>
					log.id === currentFasting.id
						? {
								...log,
								endTime: now,
								actualHours: Math.round(actualHours * 10) / 10,
								completed: true,
								notes,
						  }
						: log
				),
				currentFasting: null,
			});
			console.log(`✅ Fast ended: ${actualHours.toFixed(1)} hours`);
		} catch (error) {
			console.error("❌ Error ending fast:", error);
		}
	},

	cancelFast: async () => {
		const { currentFasting, fastingLogs } = get();
		if (!currentFasting) return;

		try {
			const { error } = await supabase
				.from("fasting_logs")
				.delete()
				.eq("id", currentFasting.id);
			if (error) throw error;

			set({
				fastingLogs: fastingLogs.filter((log) => log.id !== currentFasting.id),
				currentFasting: null,
			});
			console.log("✅ Fast cancelled");
		} catch (error) {
			console.error("❌ Error cancelling fast:", error);
		}
	},

	getFastingHistory: () => {
		const { fastingLogs } = get();
		return fastingLogs.filter((log) => log.completed);
	},

	getCurrentFastProgress: () => {
		const { currentFasting } = get();
		if (!currentFasting) return null;

		const now = new Date();
		const startTime =
			currentFasting.startTime instanceof Date
				? currentFasting.startTime
				: new Date(currentFasting.startTime);
		const elapsedMs = now.getTime() - startTime.getTime();
		const elapsedHours = elapsedMs / (1000 * 60 * 60);
		const targetHours =
			currentFasting.targetHours || currentFasting.targetDuration || 16;
		const remainingHours = Math.max(0, targetHours - elapsedHours);
		const progress = Math.min(100, (elapsedHours / targetHours) * 100);

		return {
			elapsedHours: Math.round(elapsedHours * 10) / 10,
			remainingHours: Math.round(remainingHours * 10) / 10,
			progress: Math.round(progress),
		};
	},

	// ============================================
	// MEAL PLANS
	// ============================================
	createMealPlan: async (plan: any) => {
		const { userId, mealPlans } = get();
		if (!userId) return;

		try {
			const now = new Date();

			const startDate =
				plan.startDate instanceof Date
					? plan.startDate
					: plan.startDate
					? new Date(plan.startDate)
					: null;
			const endDate =
				plan.endDate instanceof Date
					? plan.endDate
					: plan.endDate
					? new Date(plan.endDate)
					: null;

			const planData = {
				user_id: userId,
				name: plan.name,
				description: plan.description,
				meals: JSON.stringify(plan.meals),
				is_active: plan.isActive || false,
				start_date: startDate?.toISOString().split("T")[0],
				end_date: endDate?.toISOString().split("T")[0],
				created_at: now.toISOString(),
			};

			const { data, error } = await supabase
				.from("meal_plans")
				.insert(planData)
				.select()
				.single();
			if (error) throw error;

			const newPlan: InternalMealPlan = {
				id: data.id,
				userId,
				name: plan.name,
				description: plan.description,
				meals: plan.meals,
				isActive: plan.isActive || false,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				createdAt: now,
			};

			set({ mealPlans: [...mealPlans, newPlan] });
			console.log("✅ Meal plan created:", plan.name);
		} catch (error) {
			console.error("❌ Error creating meal plan:", error);
		}
	},

	updateMealPlan: async (id, updates: any) => {
		const { mealPlans } = get();

		try {
			const updateData: any = { ...objectToSnakeCase(updates) };
			if (updates.meals) updateData.meals = JSON.stringify(updates.meals);
			if (updates.startDate) {
				const startDate =
					updates.startDate instanceof Date
						? updates.startDate
						: new Date(updates.startDate);
				updateData.start_date = startDate.toISOString().split("T")[0];
			}
			if (updates.endDate) {
				const endDate =
					updates.endDate instanceof Date
						? updates.endDate
						: new Date(updates.endDate);
				updateData.end_date = endDate.toISOString().split("T")[0];
			}

			const { error } = await supabase
				.from("meal_plans")
				.update(updateData)
				.eq("id", id);
			if (error) throw error;

			set({
				mealPlans: mealPlans.map((plan) =>
					plan.id === id ? { ...plan, ...updates } : plan
				),
			});
		} catch (error) {
			console.error("❌ Error updating meal plan:", error);
		}
	},

	deleteMealPlan: async (id) => {
		const { mealPlans } = get();

		try {
			const { error } = await supabase.from("meal_plans").delete().eq("id", id);
			if (error) throw error;

			set({ mealPlans: mealPlans.filter((plan) => plan.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting meal plan:", error);
		}
	},

	setActiveMealPlan: async (id) => {
		const { userId, mealPlans } = get();
		if (!userId) return;

		try {
			// Deactivate all plans first
			await supabase
				.from("meal_plans")
				.update({ is_active: false })
				.eq("user_id", userId);

			// Activate the selected plan
			const { error } = await supabase
				.from("meal_plans")
				.update({ is_active: true })
				.eq("id", id);
			if (error) throw error;

			set({
				mealPlans: mealPlans.map((plan) => ({
					...plan,
					isActive: plan.id === id,
				})),
			});
		} catch (error) {
			console.error("❌ Error setting active meal plan:", error);
		}
	},

	// ============================================
	// SUPPLEMENTS
	// ============================================
	logSupplement: async (entry: any) => {
		const { userId, supplementLogs } = get();
		if (!userId) return;

		try {
			const entryDate =
				entry.date instanceof Date ? entry.date : new Date(entry.date);
			const entryTime =
				entry.time instanceof Date ? entry.time : new Date(entry.time);

			const supplementData = {
				user_id: userId,
				supplement_name: entry.supplementName,
				dosage: entry.dosage,
				unit: entry.unit,
				date: entryDate.toISOString().split("T")[0],
				time: entryTime.toISOString(),
				notes: entry.notes,
			};

			const { data, error } = await supabase
				.from("supplement_logs")
				.insert(supplementData)
				.select()
				.single();
			if (error) throw error;

			const newLog: InternalSupplementLog = {
				id: data.id,
				userId,
				supplementName: entry.supplementName,
				dosage: entry.dosage,
				unit: entry.unit,
				date: entryDate,
				time: entryTime,
				notes: entry.notes,
			};
			set({ supplementLogs: [...supplementLogs, newLog] });
			console.log("✅ Supplement logged:", entry.supplementName);
		} catch (error) {
			console.error("❌ Error logging supplement:", error);
		}
	},

	deleteSupplementLog: async (id) => {
		const { supplementLogs } = get();

		try {
			const { error } = await supabase
				.from("supplement_logs")
				.delete()
				.eq("id", id);
			if (error) throw error;

			set({ supplementLogs: supplementLogs.filter((log) => log.id !== id) });
		} catch (error) {
			console.error("❌ Error deleting supplement log:", error);
		}
	},

	// ============================================
	// ANALYTICS & INSIGHTS
	// ============================================
	getDailySummary: (date) => {
		const { getMealsByDate, getHydrationByDate, calculateDailyGoals } = get();
		const inputDate = date instanceof Date ? date : new Date(date);
		const meals = getMealsByDate(inputDate);
		const hydration = getHydrationByDate(inputDate);
		const goals = calculateDailyGoals();

		const totals = meals.reduce(
			(acc, meal) => {
				const nutrition = meal.nutrition ||
					meal.totalNutrition || {
						calories: 0,
						protein: 0,
						carbohydrates: 0,
						fat: 0,
						fiber: 0,
						sugar: 0,
					};
				return {
					calories: acc.calories + (nutrition.calories || 0),
					protein: acc.protein + (nutrition.protein || 0),
					carbs: acc.carbs + (nutrition.carbohydrates || nutrition.carbs || 0),
					fat: acc.fat + (nutrition.fat || 0),
					fiber: acc.fiber + (nutrition.fiber || 0),
					sugar: acc.sugar + (nutrition.sugar || 0),
				};
			},
			{ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
		);

		const totalWater = hydration.reduce((total, log) => total + log.amount, 0);

		return {
			date: inputDate.toISOString().split("T")[0],
			totalCalories: Math.round(totals.calories),
			totalProtein: Math.round(totals.protein),
			totalCarbs: Math.round(totals.carbs),
			totalFat: Math.round(totals.fat),
			totalFiber: Math.round(totals.fiber),
			totalSugar: Math.round(totals.sugar),
			totalWater,
			mealCount: meals.length,
			calorieGoal: goals.calories,
			proteinGoal: goals.protein,
			carbGoal: goals.carbs,
			fatGoal: goals.fat,
			waterGoal: goals.water,
		};
	},

	getWeeklyAverages: () => {
		const { getDailySummary } = get();
		const days = 7;
		const summaries: DailyNutritionSummary[] = [];

		for (let i = 0; i < days; i++) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			summaries.push(getDailySummary(date));
		}

		const daysWithData = summaries.filter((s) => s.mealCount > 0).length || 1;

		return {
			date: "weekly_average",
			totalCalories: Math.round(
				summaries.reduce((sum, s) => sum + s.totalCalories, 0) / daysWithData
			),
			totalProtein: Math.round(
				summaries.reduce((sum, s) => sum + s.totalProtein, 0) / daysWithData
			),
			totalCarbs: Math.round(
				summaries.reduce((sum, s) => sum + s.totalCarbs, 0) / daysWithData
			),
			totalFat: Math.round(
				summaries.reduce((sum, s) => sum + s.totalFat, 0) / daysWithData
			),
			totalFiber: Math.round(
				summaries.reduce((sum, s) => sum + s.totalFiber, 0) / daysWithData
			),
			totalSugar: Math.round(
				summaries.reduce((sum, s) => sum + s.totalSugar, 0) / daysWithData
			),
			totalWater: Math.round(
				summaries.reduce((sum, s) => sum + s.totalWater, 0) / daysWithData
			),
			mealCount: Math.round(
				summaries.reduce((sum, s) => sum + s.mealCount, 0) / days
			),
			calorieGoal: summaries[0]?.calorieGoal || 2000,
			proteinGoal: summaries[0]?.proteinGoal || 60,
			carbGoal: summaries[0]?.carbGoal || 250,
			fatGoal: summaries[0]?.fatGoal || 65,
			waterGoal: summaries[0]?.waterGoal || 2500,
		};
	},

	getNutritionInsights: () => {
		const { getDailySummary, getGutHealthTrend, currentFasting, mealLogs } =
			get();
		const insights: NutritionInsight[] = [];
		const today = new Date();
		const todaySummary = getDailySummary(today);

		// Calorie insight
		const caloriePercentage =
			(todaySummary.totalCalories / todaySummary.calorieGoal) * 100;
		if (caloriePercentage >= 90 && caloriePercentage <= 110) {
			insights.push({
				type: "success",
				title: "Great Calorie Balance!",
				message: "You're right on track with your calorie goal today.",
				icon: "checkmark-circle",
			});
		} else if (caloriePercentage < 50 && todaySummary.mealCount > 0) {
			insights.push({
				type: "warning",
				title: "Low Calorie Intake",
				message: "You may need to eat more to reach your daily goal.",
				icon: "alert-circle",
			});
		}

		// Protein insight
		const proteinPercentage =
			(todaySummary.totalProtein / todaySummary.proteinGoal) * 100;
		if (proteinPercentage >= 80) {
			insights.push({
				type: "success",
				title: "Protein Goal Met!",
				message: "Excellent protein intake today for muscle health.",
				icon: "fitness",
			});
		} else if (proteinPercentage < 40 && todaySummary.mealCount >= 2) {
			insights.push({
				type: "tip",
				title: "Boost Your Protein",
				message: "Consider adding eggs, paneer, or legumes to your next meal.",
				icon: "bulb",
			});
		}

		// Hydration insight
		const waterPercentage =
			(todaySummary.totalWater / todaySummary.waterGoal) * 100;
		if (waterPercentage < 50) {
			insights.push({
				type: "warning",
				title: "Stay Hydrated",
				message: `Drink more water! ${Math.round(
					(todaySummary.waterGoal - todaySummary.totalWater) / 1000
				)}L remaining.`,
				icon: "water",
			});
		}

		// Gut health insight
		const recentGutHealth = getGutHealthTrend(7);
		const avgDigestion =
			recentGutHealth.reduce(
				(sum, log) => sum + (log.digestionRating || 3),
				0
			) / (recentGutHealth.length || 1);
		if (avgDigestion < 3 && recentGutHealth.length > 0) {
			insights.push({
				type: "tip",
				title: "Gut Health Tip",
				message:
					"Try adding probiotic foods like curd, kimchi, or kombucha to improve digestion.",
				icon: "leaf",
			});
		}

		// Fasting insight
		if (currentFasting) {
			const progress =
				((new Date().getTime() - currentFasting.startTime.getTime()) /
					(currentFasting.targetHours * 60 * 60 * 1000)) *
				100;
			insights.push({
				type: "info",
				title: "Fasting in Progress",
				message: `${Math.round(progress)}% complete. Keep going!`,
				icon: "timer",
			});
		}

		// Fiber insight
		if (todaySummary.totalFiber < 15 && todaySummary.mealCount >= 2) {
			insights.push({
				type: "tip",
				title: "Increase Fiber Intake",
				message:
					"Add more vegetables, whole grains, or fruits for better digestion.",
				icon: "nutrition",
			});
		}

		return insights;
	},

	getMacroBreakdown: (date) => {
		const { getDailySummary } = get();
		const summary = getDailySummary(date);

		const totalMacros =
			summary.totalProtein + summary.totalCarbs + summary.totalFat;
		if (totalMacros === 0) {
			return { protein: 33, carbs: 33, fat: 34 };
		}

		return {
			protein: Math.round((summary.totalProtein / totalMacros) * 100),
			carbs: Math.round((summary.totalCarbs / totalMacros) * 100),
			fat: Math.round((summary.totalFat / totalMacros) * 100),
		};
	},
}));

export default useNutritionStore;
