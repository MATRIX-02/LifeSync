// NutriPlan - Constants and Helper Data

import {
	CuisineType,
	DietaryPreference,
	FoodCategory,
} from "@/src/types/nutrition";

// ============================================
// SERVING SIZE REFERENCES
// ============================================

export const SERVING_SIZES = {
	// Indian specific
	roti: 30, // grams per roti
	paratha: 60,
	rice_bowl: 150, // cooked rice
	dal_bowl: 150,
	sabji_serving: 100,
	curry_serving: 150,
	idli: 40, // per piece
	dosa: 80,
	vada: 50,
	samosa: 80,
	pakora: 30,
	puri: 25,
	naan: 90,
	kulcha: 100,
	chapati: 30,
	bhakri: 40,
	thepla: 35,

	// International
	bread_slice: 30,
	pasta_serving: 100, // cooked
	pizza_slice: 100,
	burger: 200,
	sandwich: 150,
	salad_bowl: 200,
	soup_bowl: 250,
	steak: 200,
	chicken_breast: 150,
	fish_fillet: 120,

	// Common
	egg: 50,
	milk_glass: 200, // ml
	curd_bowl: 100,
	paneer_serving: 50,
	cheese_slice: 20,
	butter_tbsp: 14,
	oil_tbsp: 14,
	sugar_tsp: 4,
	honey_tbsp: 21,

	// Fruits
	apple_medium: 180,
	banana_medium: 120,
	orange_medium: 130,
	mango_medium: 200,
	papaya_slice: 150,
	watermelon_slice: 300,
	grapes_cup: 150,

	// Nuts & Seeds
	almonds_handful: 28,
	cashews_handful: 28,
	walnuts_handful: 28,
	peanuts_handful: 28,
	chia_tbsp: 12,
	flax_tbsp: 10,
};

// ============================================
// DAILY RECOMMENDED VALUES (Based on 2000 cal diet)
// ============================================

export const DAILY_RECOMMENDED_VALUES = {
	calories: 2000,
	protein: 50, // grams
	carbohydrates: 300, // grams
	fat: 65, // grams
	saturatedFat: 20, // grams
	fiber: 25, // grams
	sugar: 50, // grams
	sodium: 2300, // mg
	cholesterol: 300, // mg
	vitaminA: 900, // mcg
	vitaminC: 90, // mg
	vitaminD: 20, // mcg
	vitaminE: 15, // mg
	vitaminK: 120, // mcg
	calcium: 1000, // mg
	iron: 18, // mg
	potassium: 4700, // mg
	magnesium: 400, // mg
	zinc: 11, // mg
};

// ============================================
// MEAL TIMING RECOMMENDATIONS
// ============================================

export const MEAL_TIMING = {
	breakfast: { start: "06:00", end: "10:00", idealTime: "08:00" },
	lunch: { start: "12:00", end: "14:00", idealTime: "13:00" },
	snack: { start: "16:00", end: "18:00", idealTime: "17:00" },
	dinner: { start: "19:00", end: "21:00", idealTime: "20:00" },
	pre_workout: { start: "05:00", end: "18:00", idealTime: "06:00" },
	post_workout: { start: "06:00", end: "20:00", idealTime: "07:30" },
};

// ============================================
// GLYCEMIC INDEX CATEGORIES
// ============================================

export const GLYCEMIC_INDEX_RANGES = {
	low: { min: 0, max: 55, label: "Low GI", color: "#22C55E" },
	medium: { min: 56, max: 69, label: "Medium GI", color: "#F59E0B" },
	high: { min: 70, max: 100, label: "High GI", color: "#EF4444" },
};

// ============================================
// FOOD CATEGORY INFO
// ============================================

export const FOOD_CATEGORY_INFO: Record<
	FoodCategory,
	{ name: string; emoji: string; color: string }
> = {
	grains: { name: "Grains & Cereals", emoji: "🌾", color: "#D97706" },
	protein: { name: "Protein", emoji: "🥩", color: "#DC2626" },
	dairy: { name: "Dairy", emoji: "🥛", color: "#F3F4F6" },
	vegetables: { name: "Vegetables", emoji: "🥬", color: "#22C55E" },
	fruits: { name: "Fruits", emoji: "🍎", color: "#F97316" },
	legumes: { name: "Legumes & Lentils", emoji: "🫘", color: "#92400E" },
	nuts_seeds: { name: "Nuts & Seeds", emoji: "🥜", color: "#A16207" },
	oils_fats: { name: "Oils & Fats", emoji: "🫒", color: "#65A30D" },
	beverages: { name: "Beverages", emoji: "🥤", color: "#0EA5E9" },
	sweets: { name: "Sweets & Desserts", emoji: "🍰", color: "#EC4899" },
	condiments: { name: "Condiments & Spices", emoji: "🧂", color: "#6B7280" },
	prepared_meals: { name: "Prepared Meals", emoji: "🍱", color: "#8B5CF6" },
	supplements: { name: "Supplements", emoji: "💊", color: "#14B8A6" },
};

// ============================================
// CUISINE TYPE INFO
// ============================================

export const CUISINE_TYPE_INFO: Record<
	CuisineType,
	{ name: string; emoji: string }
> = {
	indian_north: { name: "North Indian", emoji: "🇮🇳" },
	indian_south: { name: "South Indian", emoji: "🇮🇳" },
	indian_west: { name: "West Indian", emoji: "🇮🇳" },
	indian_east: { name: "East Indian", emoji: "🇮🇳" },
	indian_street: { name: "Indian Street Food", emoji: "🛒" },
	continental: { name: "Continental", emoji: "🍽️" },
	mediterranean: { name: "Mediterranean", emoji: "🫒" },
	asian: { name: "Asian", emoji: "🥢" },
	american: { name: "American", emoji: "🍔" },
	mexican: { name: "Mexican", emoji: "🌮" },
	middle_eastern: { name: "Middle Eastern", emoji: "🧆" },
	african: { name: "African", emoji: "🌍" },
	fusion: { name: "Fusion", emoji: "✨" },
	healthy: { name: "Health Food", emoji: "🥗" },
	keto: { name: "Keto", emoji: "🥑" },
	vegan: { name: "Vegan", emoji: "🌱" },
	vegetarian: { name: "Vegetarian", emoji: "🥬" },
};

// ============================================
// DIETARY TAGS INFO
// ============================================

export const DIETARY_TAG_INFO: Record<
	DietaryPreference,
	{ name: string; emoji: string; color: string }
> = {
	vegetarian: { name: "Vegetarian", emoji: "🟢", color: "#22C55E" },
	vegan: { name: "Vegan", emoji: "🌱", color: "#16A34A" },
	eggetarian: { name: "Eggetarian", emoji: "🥚", color: "#F59E0B" },
	non_vegetarian: { name: "Non-Veg", emoji: "🔴", color: "#DC2626" },
	pescatarian: { name: "Pescatarian", emoji: "🐟", color: "#0EA5E9" },
	jain: { name: "Jain", emoji: "☸️", color: "#F97316" },
	sattvic: { name: "Sattvic", emoji: "🕉️", color: "#A855F7" },
	halal: { name: "Halal", emoji: "☪️", color: "#10B981" },
	kosher: { name: "Kosher", emoji: "✡️", color: "#3B82F6" },
	gluten_free: { name: "Gluten-Free", emoji: "🌾", color: "#EAB308" },
	dairy_free: { name: "Dairy-Free", emoji: "🥛", color: "#06B6D4" },
	keto: { name: "Keto", emoji: "🥑", color: "#84CC16" },
	paleo: { name: "Paleo", emoji: "🦴", color: "#D97706" },
	low_carb: { name: "Low Carb", emoji: "📉", color: "#8B5CF6" },
	high_protein: { name: "High Protein", emoji: "💪", color: "#EF4444" },
	whole_grain: { name: "Whole Grain", emoji: "🌾", color: "#22C55E" },
};

// ============================================
// GUT HEALTH FOOD CATEGORIES
// ============================================

export const GUT_HEALTH_FOODS = {
	probiotics: [
		"Curd/Yogurt",
		"Buttermilk (Chaas)",
		"Kefir",
		"Kimchi",
		"Sauerkraut",
		"Miso",
		"Tempeh",
		"Kombucha",
		"Idli (fermented)",
		"Dosa (fermented)",
		"Kanji",
		"Dhokla",
		"Pickles (naturally fermented)",
	],
	prebiotics: [
		"Garlic",
		"Onion",
		"Leeks",
		"Asparagus",
		"Bananas",
		"Oats",
		"Apples",
		"Flaxseeds",
		"Barley",
		"Wheat Bran",
		"Chicory Root",
		"Jerusalem Artichoke",
	],
	antiInflammatory: [
		"Turmeric",
		"Ginger",
		"Green Tea",
		"Fatty Fish",
		"Olive Oil",
		"Leafy Greens",
		"Berries",
		"Almonds",
		"Walnuts",
		"Tomatoes",
	],
	digestiveAids: [
		"Papaya",
		"Pineapple",
		"Ginger",
		"Fennel Seeds",
		"Cumin",
		"Ajwain",
		"Hing (Asafoetida)",
		"Mint",
		"Aloe Vera",
		"Apple Cider Vinegar",
	],
};

// ============================================
// AYURVEDIC PROPERTIES
// ============================================

export const AYURVEDIC_DOSHAS = {
	vata: {
		name: "Vata",
		qualities: ["dry", "cold", "light", "mobile"],
		balancingFoods: ["warm foods", "moist foods", "grounding foods"],
		aggravatingFoods: ["raw foods", "cold foods", "dry foods"],
	},
	pitta: {
		name: "Pitta",
		qualities: ["hot", "sharp", "oily", "liquid"],
		balancingFoods: ["cooling foods", "sweet foods", "bitter foods"],
		aggravatingFoods: ["spicy foods", "sour foods", "salty foods"],
	},
	kapha: {
		name: "Kapha",
		qualities: ["heavy", "cold", "oily", "stable"],
		balancingFoods: ["light foods", "warm foods", "spicy foods"],
		aggravatingFoods: ["heavy foods", "oily foods", "sweet foods"],
	},
};

// ============================================
// COMMON ALLERGENS
// ============================================

export const COMMON_ALLERGENS = [
	"Milk",
	"Eggs",
	"Fish",
	"Shellfish",
	"Tree Nuts",
	"Peanuts",
	"Wheat",
	"Soybeans",
	"Sesame",
	"Mustard",
	"Gluten",
	"Lactose",
];

// ============================================
// BRISTOL STOOL CHART
// ============================================

export const BRISTOL_STOOL_CHART = {
	1: {
		description: "Separate hard lumps",
		indication: "Severe constipation",
		color: "#7C2D12",
	},
	2: {
		description: "Lumpy and sausage-like",
		indication: "Mild constipation",
		color: "#92400E",
	},
	3: {
		description: "Sausage with cracks",
		indication: "Normal",
		color: "#A16207",
	},
	4: { description: "Smooth and soft", indication: "Ideal", color: "#65A30D" },
	5: {
		description: "Soft blobs with edges",
		indication: "Lacking fiber",
		color: "#CA8A04",
	},
	6: {
		description: "Mushy with ragged edges",
		indication: "Mild diarrhea",
		color: "#D97706",
	},
	7: {
		description: "Entirely liquid",
		indication: "Severe diarrhea",
		color: "#DC2626",
	},
};

// ============================================
// HYDRATION MULTIPLIERS
// ============================================

export const HYDRATION_FACTORS = {
	sedentary: 30, // ml per kg body weight
	light: 35,
	moderate: 40,
	active: 45,
	very_active: 50,
	hot_weather_bonus: 500, // additional ml
	exercise_bonus_per_hour: 500,
};

// ============================================
// CALORIE CALCULATION MULTIPLIERS (Mifflin-St Jeor)
// ============================================

export const ACTIVITY_MULTIPLIERS = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9,
};

export const GOAL_ADJUSTMENTS = {
	lose_weight: -500, // calories
	maintain: 0,
	gain_muscle: 300,
	athletic: 500,
	health_focus: 0,
};

// ============================================
// MACRO RATIOS BY GOAL
// ============================================

export const MACRO_RATIOS = {
	lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.3 },
	maintain: { protein: 0.25, carbs: 0.5, fat: 0.25 },
	gain_muscle: { protein: 0.35, carbs: 0.45, fat: 0.2 },
	athletic: { protein: 0.3, carbs: 0.5, fat: 0.2 },
	health_focus: { protein: 0.25, carbs: 0.45, fat: 0.3 },
	keto: { protein: 0.25, carbs: 0.05, fat: 0.7 },
	low_carb: { protein: 0.3, carbs: 0.2, fat: 0.5 },
};
