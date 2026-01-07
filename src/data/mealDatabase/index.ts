// NutriPlan - Meal Database Index
// Combines all food databases into one comprehensive collection

import { FoodItem } from "@/src/types/nutrition";

// Import all food databases
import {
	ALL_BASIC_FOODS,
	BEVERAGES,
	DAIRY,
	FRUITS,
	GRAINS,
	LEGUMES,
	NUTS_SEEDS,
	PROTEINS,
	VEGETABLES,
} from "./basicFoods";
import {
	ACTIVITY_MULTIPLIERS,
	AYURVEDIC_DOSHAS,
	BRISTOL_STOOL_CHART,
	CUISINE_TYPE_INFO,
	DAILY_RECOMMENDED_VALUES,
	DIETARY_TAG_INFO,
	FOOD_CATEGORY_INFO,
	GLYCEMIC_INDEX_RANGES,
	GUT_HEALTH_FOODS,
	MACRO_RATIOS,
	MEAL_TIMING,
	SERVING_SIZES,
} from "./constants";
import {
	ALL_INDIAN_FOODS,
	EAST_INDIAN_FOODS,
	INDIAN_STREET_FOODS,
	NORTH_INDIAN_FOODS,
	SOUTH_INDIAN_FOODS,
	WEST_INDIAN_FOODS,
} from "./indianFoods";
import {
	ALL_INTERNATIONAL_FOODS,
	AMERICAN_FOODS,
	ASIAN_FOODS,
	CONTINENTAL_FOODS,
	HEALTH_FOODS,
	MEDITERRANEAN_FOODS,
	MEXICAN_FOODS,
} from "./internationalFoods";

// ============================================
// COMPLETE FOOD DATABASE
// ============================================

/**
 * Complete food database combining all cuisines and categories
 * Total: 200+ foods with detailed nutrition info
 */
export const FOOD_DATABASE: FoodItem[] = [
	...ALL_INDIAN_FOODS,
	...ALL_INTERNATIONAL_FOODS,
	...ALL_BASIC_FOODS,
];

// ============================================
// FOOD LOOKUP UTILITIES
// ============================================

/**
 * Get food item by ID
 */
export const getFoodById = (id: string): FoodItem | undefined => {
	return FOOD_DATABASE.find((food) => food.id === id);
};

/**
 * Search foods by name (fuzzy search)
 */
export const searchFoods = (query: string): FoodItem[] => {
	const lowerQuery = query.toLowerCase();
	return FOOD_DATABASE.filter(
		(food) =>
			food.name.toLowerCase().includes(lowerQuery) ||
			food.nameHindi?.toLowerCase().includes(lowerQuery) ||
			food.nameRegional?.toLowerCase().includes(lowerQuery)
	);
};

/**
 * Get foods by category
 */
export const getFoodsByCategory = (
	category: FoodItem["category"]
): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => food.category === category);
};

/**
 * Get foods by cuisine type
 */
export const getFoodsByCuisine = (cuisine: string): FoodItem[] => {
	return FOOD_DATABASE.filter((food) =>
		food.cuisineType?.includes(cuisine as any)
	);
};

/**
 * Get foods by dietary preference
 */
export const getFoodsByDietaryTag = (tag: string): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => food.dietaryTags?.includes(tag as any));
};

/**
 * Get probiotic foods for gut health
 */
export const getProbioticFoods = (): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => food.isProbiotic === true);
};

/**
 * Get prebiotic foods for gut health
 */
export const getPrebioticFoods = (): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => food.isPrebiotic === true);
};

/**
 * Get anti-inflammatory foods
 */
export const getAntiInflammatoryFoods = (): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => food.isAntiInflammatory === true);
};

/**
 * Get low glycemic foods (GI < 55)
 */
export const getLowGlycemicFoods = (): FoodItem[] => {
	return FOOD_DATABASE.filter(
		(food) => food.glycemicIndex !== undefined && food.glycemicIndex < 55
	);
};

/**
 * Get foods for specific meal time
 */
export const getFoodsForMealTime = (mealTime: string): FoodItem[] => {
	return FOOD_DATABASE.filter((food) =>
		food.bestTimeToEat?.includes(mealTime as any)
	);
};

/**
 * Get foods by Ayurvedic dosha
 */
export const getFoodsByDosha = (
	dosha: "vata" | "pitta" | "kapha"
): FoodItem[] => {
	return FOOD_DATABASE.filter((food) =>
		food.ayurvedicProperties?.dosha.includes(dosha)
	);
};

/**
 * Get popular foods (popularity >= 8)
 */
export const getPopularFoods = (): FoodItem[] => {
	return FOOD_DATABASE.filter((food) => (food.popularity ?? 0) >= 8).sort(
		(a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
	);
};

/**
 * Calculate total nutrition for multiple food items
 */
export const calculateTotalNutrition = (
	items: { foodId: string; quantity: number }[]
): {
	calories: number;
	protein: number;
	carbohydrates: number;
	fat: number;
	fiber: number;
	sugar: number;
} => {
	return items.reduce(
		(total, item) => {
			const food = getFoodById(item.foodId);
			if (food) {
				const multiplier = item.quantity / (food.nutrition.servingSize || 100);
				return {
					calories: total.calories + food.nutrition.calories * multiplier,
					protein: total.protein + food.nutrition.protein * multiplier,
					carbohydrates:
						total.carbohydrates + food.nutrition.carbohydrates * multiplier,
					fat: total.fat + food.nutrition.fat * multiplier,
					fiber: total.fiber + food.nutrition.fiber * multiplier,
					sugar: total.sugar + food.nutrition.sugar * multiplier,
				};
			}
			return total;
		},
		{ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0 }
	);
};

// ============================================
// FOOD RECOMMENDATIONS
// ============================================

/**
 * Get food recommendations based on goals
 */
export const getFoodRecommendations = (
	goal: "weight_loss" | "muscle_gain" | "gut_health" | "energy" | "general"
): FoodItem[] => {
	switch (goal) {
		case "weight_loss":
			return FOOD_DATABASE.filter(
				(food) =>
					food.nutrition.calories < 200 &&
					food.nutrition.fiber >= 2 &&
					(food.glycemicIndex === undefined || food.glycemicIndex < 55)
			).slice(0, 20);

		case "muscle_gain":
			return FOOD_DATABASE.filter(
				(food) =>
					food.nutrition.protein >= 15 ||
					food.dietaryTags?.includes("high_protein")
			).slice(0, 20);

		case "gut_health":
			return FOOD_DATABASE.filter(
				(food) =>
					food.isProbiotic || food.isPrebiotic || food.isAntiInflammatory
			).slice(0, 20);

		case "energy":
			return FOOD_DATABASE.filter(
				(food) =>
					(food.glycemicIndex !== undefined &&
						food.glycemicIndex >= 30 &&
						food.glycemicIndex <= 55) ||
					food.category === "grains" ||
					food.category === "fruits"
			).slice(0, 20);

		default:
			return getPopularFoods().slice(0, 20);
	}
};

/**
 * Get gut health recommendations based on symptoms
 */
export const getGutHealthRecommendations = (
	symptom: "bloating" | "constipation" | "diarrhea" | "acidity" | "general"
): FoodItem[] => {
	switch (symptom) {
		case "bloating":
			// Anti-inflammatory, easy to digest foods
			return FOOD_DATABASE.filter(
				(food) =>
					food.isAntiInflammatory &&
					!food.ingredients?.some((i) =>
						["beans", "lentils", "cabbage", "onion"].includes(i.toLowerCase())
					)
			).slice(0, 15);

		case "constipation":
			// High fiber, prebiotic foods
			return FOOD_DATABASE.filter(
				(food) => food.isPrebiotic || food.nutrition.fiber >= 4
			).slice(0, 15);

		case "diarrhea":
			// Probiotic, binding foods
			return FOOD_DATABASE.filter(
				(food) =>
					food.isProbiotic ||
					food.id.includes("banana") ||
					food.id.includes("rice") ||
					food.category === "dairy"
			).slice(0, 15);

		case "acidity":
			// Cooling, alkaline foods
			return FOOD_DATABASE.filter(
				(food) =>
					food.ayurvedicProperties?.energy === "cooling" ||
					food.category === "vegetables" ||
					food.id.includes("cucumber") ||
					food.id.includes("buttermilk")
			).slice(0, 15);

		default:
			return [...getProbioticFoods(), ...getPrebioticFoods()].slice(0, 15);
	}
};

// ============================================
// EXPORTS
// ============================================

// Re-export individual cuisine collections
export {
	ACTIVITY_MULTIPLIERS,
	// Basic foods
	ALL_BASIC_FOODS,
	// Indian foods
	ALL_INDIAN_FOODS,
	// International foods
	ALL_INTERNATIONAL_FOODS,
	AMERICAN_FOODS,
	ASIAN_FOODS,
	AYURVEDIC_DOSHAS,
	BEVERAGES,
	BRISTOL_STOOL_CHART,
	CONTINENTAL_FOODS,
	CUISINE_TYPE_INFO,
	DAILY_RECOMMENDED_VALUES,
	DAIRY,
	DIETARY_TAG_INFO,
	EAST_INDIAN_FOODS,
	FOOD_CATEGORY_INFO,
	FRUITS,
	GLYCEMIC_INDEX_RANGES,
	GRAINS,
	GUT_HEALTH_FOODS,
	HEALTH_FOODS,
	INDIAN_STREET_FOODS,
	LEGUMES,
	MACRO_RATIOS,
	MEAL_TIMING,
	MEDITERRANEAN_FOODS,
	MEXICAN_FOODS,
	NORTH_INDIAN_FOODS,
	NUTS_SEEDS,
	PROTEINS,
	// Constants
	SERVING_SIZES,
	SOUTH_INDIAN_FOODS,
	VEGETABLES,
	WEST_INDIAN_FOODS,
};

// Default export
export default FOOD_DATABASE;
