// NutriPlan - Comprehensive Nutrition & Meal Tracking Types

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type MealType =
	| "breakfast"
	| "lunch"
	| "dinner"
	| "snack"
	| "pre_workout"
	| "post_workout";

export type FoodCategory =
	| "grains"
	| "protein"
	| "dairy"
	| "vegetables"
	| "fruits"
	| "legumes"
	| "nuts_seeds"
	| "oils_fats"
	| "beverages"
	| "sweets"
	| "condiments"
	| "prepared_meals"
	| "supplements";

export type CuisineType =
	| "indian_north"
	| "indian_south"
	| "indian_west"
	| "indian_east"
	| "indian_street"
	| "continental"
	| "mediterranean"
	| "asian"
	| "american"
	| "mexican"
	| "middle_eastern"
	| "african"
	| "fusion"
	| "healthy"
	| "keto"
	| "vegan"
	| "vegetarian";

export type DietaryPreference =
	| "vegetarian"
	| "vegan"
	| "eggetarian"
	| "non_vegetarian"
	| "pescatarian"
	| "jain"
	| "sattvic"
	| "halal"
	| "kosher"
	| "gluten_free"
	| "dairy_free"
	| "keto"
	| "paleo"
	| "low_carb"
	| "whole_grain"
	| "high_protein";

export type GutHealthIndicator =
	| "bloating"
	| "gas"
	| "acidity"
	| "constipation"
	| "diarrhea"
	| "indigestion"
	| "heartburn"
	| "nausea"
	| "cramps"
	| "none";

// Alias for UI components
export type GutSymptom = GutHealthIndicator;

export type StoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Bristol Stool Chart

// Alias for UI components
export type BristolStoolType = StoolType;

export type HydrationUnit = "ml" | "glasses" | "liters";

export type FastingType =
	| "16_8"
	| "18_6"
	| "20_4"
	| "omad"
	| "eat_stop_eat"
	| "custom";

export type NutrientGoalType =
	| "lose_weight"
	| "maintain"
	| "gain_muscle"
	| "athletic"
	| "health_focus";

// ============================================
// MACRONUTRIENTS & MICRONUTRIENTS
// ============================================

export interface Macronutrients {
	calories: number;
	protein: number; // grams
	carbohydrates: number; // grams
	fat: number; // grams
	fiber: number; // grams
	sugar: number; // grams
	saturatedFat?: number; // grams
	transFat?: number; // grams
	cholesterol?: number; // mg
	sodium?: number; // mg
}

export interface Micronutrients {
	vitaminA?: number; // mcg
	vitaminB1?: number; // mg (Thiamine)
	vitaminB2?: number; // mg (Riboflavin)
	vitaminB3?: number; // mg (Niacin)
	vitaminB6?: number; // mg
	vitaminB12?: number; // mcg
	vitaminC?: number; // mg
	vitaminD?: number; // mcg
	vitaminE?: number; // mg
	vitaminK?: number; // mcg
	folate?: number; // mcg
	calcium?: number; // mg
	iron?: number; // mg
	magnesium?: number; // mg
	phosphorus?: number; // mg
	potassium?: number; // mg
	zinc?: number; // mg
	selenium?: number; // mcg
	copper?: number; // mg
	manganese?: number; // mg
	omega3?: number; // mg
	omega6?: number; // mg
}

export interface NutritionInfo extends Macronutrients {
	micronutrients?: Micronutrients;
	servingSize: number; // grams
	servingUnit: string;
}

// ============================================
// FOOD ITEM & DATABASE
// ============================================

export interface FoodItem {
	id: string;
	name: string;
	nameHindi?: string; // Hindi name for Indian foods
	nameRegional?: string; // Regional language name
	category: FoodCategory;
	cuisineType: CuisineType[];
	dietaryTags: DietaryPreference[];
	nutrition: NutritionInfo;
	glycemicIndex?: number; // 0-100
	isProbiotic?: boolean; // Good for gut health
	isPrebiotic?: boolean; // Feeds good gut bacteria
	isAntiInflammatory?: boolean;
	allergens?: string[];
	ingredients?: string[];
	preparationTime?: number; // minutes
	cookingMethod?: string;
	bestTimeToEat?: MealType[];
	healthBenefits?: string[];
	gutHealthNotes?: string;
	ayurvedicProperties?: {
		dosha: ("vata" | "pitta" | "kapha")[];
		taste: ("sweet" | "sour" | "salty" | "bitter" | "pungent" | "astringent")[];
		energy: "heating" | "cooling" | "neutral";
	};
	isCustom?: boolean;
	imageUrl?: string;
	popularity?: number; // 1-10
	createdAt?: string;
}

// ============================================
// MEAL LOGGING
// ============================================

export interface MealLogEntry {
	id: string;
	odosId: string;
	date: string; // YYYY-MM-DD
	mealType: MealType;
	time: string; // HH:MM
	foods: MealFoodItem[];
	totalNutrition: Macronutrients;
	notes?: string;
	mood?: 1 | 2 | 3 | 4 | 5; // How did you feel after eating
	hungerLevel?: 1 | 2 | 3 | 4 | 5; // Before eating
	satisfactionLevel?: 1 | 2 | 3 | 4 | 5; // After eating
	photos?: string[];
	location?: string;
	eatingDuration?: number; // minutes
	createdAt: string;
	updatedAt: string;
	syncedAt?: string;
}

export interface MealFoodItem {
	foodId: string;
	foodName: string;
	quantity: number;
	unit: string; // grams, cups, pieces, bowls, etc.
	nutrition: Macronutrients;
	isCustom?: boolean;
}

// ============================================
// GUT HEALTH TRACKING
// ============================================

export interface GutHealthLog {
	id: string;
	odosId: string;
	date: string;
	time: string;
	symptoms: GutHealthIndicator[];
	severity?: 1 | 2 | 3 | 4 | 5; // 1 = mild, 5 = severe
	stoolLog?: {
		type: StoolType; // Bristol Stool Chart
		frequency: number;
		notes?: string;
	};
	triggers?: string[]; // Foods that might have caused issues
	probioticsTaken?: boolean;
	prebioticFoods?: string[];
	notes?: string;
	overallGutFeeling: 1 | 2 | 3 | 4 | 5; // 1 = poor, 5 = excellent
	createdAt: string;
}

// ============================================
// HYDRATION TRACKING
// ============================================

export interface HydrationLog {
	id: string;
	odosId: string;
	date: string;
	entries: HydrationEntry[];
	totalMl: number;
	goal: number; // ml
	createdAt: string;
	updatedAt: string;
}

export interface HydrationEntry {
	id: string;
	time: string;
	amount: number; // ml
	beverageType:
		| "water"
		| "coconut_water"
		| "buttermilk"
		| "green_tea"
		| "herbal_tea"
		| "juice"
		| "milk"
		| "coffee"
		| "other";
	notes?: string;
}

// ============================================
// MEAL PLANS & RECOMMENDATIONS
// ============================================

export interface MealPlan {
	id: string;
	odosId: string;
	name: string;
	description?: string;
	duration: number; // days
	goal: NutrientGoalType;
	targetCalories: number;
	targetProtein: number;
	targetCarbs: number;
	targetFat: number;
	dietaryPreferences: DietaryPreference[];
	meals: PlannedMeal[];
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PlannedMeal {
	day: number; // 1-7 for weekly, or specific date
	mealType: MealType;
	suggestedFoods: string[]; // food IDs
	alternativeOptions?: string[];
	targetNutrition: Macronutrients;
	notes?: string;
}

// ============================================
// NUTRITION GOALS & PROFILE
// ============================================

export interface NutritionProfile {
	id: string;
	odosId: string;
	age: number;
	gender: "male" | "female" | "other";
	height: number; // cm
	weight: number; // kg
	activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
	goal: NutrientGoalType;
	dietaryPreferences: DietaryPreference[];
	allergies: string[];
	healthConditions?: string[];
	targetCalories: number;
	targetProtein: number;
	targetCarbs: number;
	targetFat: number;
	targetFiber: number;
	targetWater: number; // ml
	mealFrequency: number; // meals per day
	intermittentFasting?: {
		enabled: boolean;
		eatingWindowStart: string; // HH:MM
		eatingWindowEnd: string;
	};
	createdAt: string;
	updatedAt: string;
}

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

export interface NutritionDaySummary {
	date: string;
	totalCalories: number;
	totalProtein: number;
	totalCarbs: number;
	totalFat: number;
	totalFiber: number;
	mealsLogged: number;
	waterIntake: number;
	gutHealthScore?: number;
	adherenceScore: number; // % of goals met
}

export interface NutritionInsight {
	id: string;
	type: "achievement" | "warning" | "tip" | "recommendation";
	title: string;
	message: string;
	icon: string;
	color: string;
	actionable?: {
		action: string;
		data?: any;
	};
	createdAt: string;
}

export interface FoodRecommendation {
	foodId: string;
	foodName: string;
	reason: string;
	score: number; // relevance score
	nutritionHighlight: string;
	bestTime: MealType;
}

// ============================================
// FASTING TRACKER
// ============================================

export interface FastingLog {
	id: string;
	odosId: string;
	startTime: string;
	endTime?: string;
	plannedDuration: number; // hours
	actualDuration?: number;
	type: "16:8" | "18:6" | "20:4" | "24h" | "36h" | "custom";
	completed: boolean;
	notes?: string;
	mood?: 1 | 2 | 3 | 4 | 5;
	energyLevel?: 1 | 2 | 3 | 4 | 5;
	createdAt: string;
}

// ============================================
// RECIPE & COOKING
// ============================================

export interface Recipe {
	id: string;
	name: string;
	nameHindi?: string;
	description: string;
	cuisineType: CuisineType;
	dietaryTags: DietaryPreference[];
	servings: number;
	prepTime: number; // minutes
	cookTime: number; // minutes
	difficulty: "easy" | "medium" | "hard";
	ingredients: RecipeIngredient[];
	instructions: string[];
	nutrition: NutritionInfo;
	tips?: string[];
	healthBenefits?: string[];
	imageUrl?: string;
	videoUrl?: string;
	createdAt: string;
}

export interface RecipeIngredient {
	foodId?: string;
	name: string;
	quantity: number;
	unit: string;
	notes?: string;
	isOptional?: boolean;
}

// ============================================
// SUPPLEMENT TRACKING
// ============================================

export interface SupplementLog {
	id: string;
	odosId: string;
	date: string;
	supplements: SupplementEntry[];
	createdAt: string;
}

export interface SupplementEntry {
	name: string;
	dosage: number;
	unit: string;
	time: string;
	withFood: boolean;
	notes?: string;
}

// ============================================
// DATABASE TYPES (for Supabase)
// ============================================

export interface MealLogRow {
	id: string;
	user_id: string;
	date: string;
	meal_type: MealType;
	time: string;
	foods: MealFoodItem[];
	total_nutrition: Macronutrients;
	notes?: string;
	mood?: number;
	hunger_level?: number;
	satisfaction_level?: number;
	photos?: string[];
	created_at: string;
	updated_at: string;
	synced_at?: string;
}

export interface GutHealthLogRow {
	id: string;
	user_id: string;
	date: string;
	time: string;
	symptoms: GutHealthIndicator[];
	severity?: number;
	stool_log?: {
		type: StoolType;
		frequency: number;
		notes?: string;
	};
	triggers?: string[];
	probiotics_taken?: boolean;
	prebiotic_foods?: string[];
	notes?: string;
	overall_gut_feeling: number;
	created_at: string;
}

export interface HydrationLogRow {
	id: string;
	user_id: string;
	date: string;
	entries: HydrationEntry[];
	total_ml: number;
	goal: number;
	created_at: string;
	updated_at: string;
}

export interface NutritionProfileRow {
	id: string;
	user_id: string;
	age: number;
	gender: string;
	height: number;
	weight: number;
	activity_level: string;
	goal: NutrientGoalType;
	dietary_preferences: DietaryPreference[];
	allergies: string[];
	health_conditions?: string[];
	target_calories: number;
	target_protein: number;
	target_carbs: number;
	target_fat: number;
	target_fiber: number;
	target_water: number;
	meal_frequency: number;
	intermittent_fasting?: {
		enabled: boolean;
		eating_window_start: string;
		eating_window_end: string;
	};
	created_at: string;
	updated_at: string;
}

export interface CustomFoodRow {
	id: string;
	user_id: string;
	name: string;
	name_hindi?: string;
	category: FoodCategory;
	cuisine_type: CuisineType[];
	dietary_tags: DietaryPreference[];
	nutrition: NutritionInfo;
	glycemic_index?: number;
	is_probiotic?: boolean;
	is_prebiotic?: boolean;
	allergens?: string[];
	ingredients?: string[];
	health_benefits?: string[];
	created_at: string;
}

export interface FastingLogRow {
	id: string;
	user_id: string;
	start_time: string;
	end_time?: string;
	planned_duration: number;
	actual_duration?: number;
	type: string;
	completed: boolean;
	notes?: string;
	mood?: number;
	energy_level?: number;
	created_at: string;
}
