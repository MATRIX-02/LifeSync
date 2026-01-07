// NutriPlan - Comprehensive Meal & Nutrition Tracker
// Features: Meal logging, Food search, Gut health, Hydration, Fasting, Insights

import { supabase } from "@/src/config/supabase";
import { useAuthStore } from "@/src/context/authStore";
import { useNutritionStore } from "@/src/context/nutritionStoreDB";
import { Theme } from "@/src/context/themeContext";
import { getFoodRecommendations, searchFoods } from "@/src/data/mealDatabase";
import type {
	BristolStoolType,
	FastingType,
	FoodItem,
	GutSymptom,
	MealType,
} from "@/src/types/nutrition";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Dimensions,
	FlatList,
	Modal,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { FastingTab } from "./nutriplan/FastingTab";
import { GutHealthTab } from "./nutriplan/GutHealthTab";
import { InsightsTab } from "./nutriplan/InsightsTab";
import {
	BRISTOL_SCALE_INFO,
	FASTING_PRESETS,
	GUT_SYMPTOMS,
	WATER_AMOUNTS,
} from "./nutriplan/constants";
import type { FoodWithQuantity, SubTab } from "./nutriplan/types";

const { width } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================

interface NutriPlanProps {
	theme: Theme;
}

export default function NutriPlan({ theme }: NutriPlanProps) {
	const store = useNutritionStore();
	const profile = useAuthStore((state) => state.profile);

	// Derive isDark from theme background color
	const isDark =
		theme.background === "#0D0D0D" ||
		theme.background.startsWith("#0") ||
		theme.background.startsWith("#1");

	// Force re-render at midnight to reset water intake display
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		const now = new Date();
		const midnight = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1,
			0,
			0,
			0,
			0
		);
		const timeUntilMidnight = midnight.getTime() - now.getTime();

		const timer = setTimeout(() => {
			forceUpdate((n) => n + 1);
			// Set up daily interval after first midnight
			const dailyInterval = setInterval(() => {
				forceUpdate((n) => n + 1);
			}, 24 * 60 * 60 * 1000);
			return () => clearInterval(dailyInterval);
		}, timeUntilMidnight);

		return () => clearTimeout(timer);
	}, []);

	// Initialize store and auto-calculate goals from fitness profile
	useEffect(() => {
		if (profile?.id) {
			store.initialize(profile.id);
			// Auto-calculate daily goals if fitness profile exists
			if (store.nutritionProfile) {
				store.calculateDailyGoals();
			}
		}
	}, [profile?.id]);

	// State
	const [activeSubTab, setActiveSubTab] = useState<SubTab>("log");
	const [showAddMealModal, setShowAddMealModal] = useState(false);
	const [showFoodSearchModal, setShowFoodSearchModal] = useState(false);
	const [showGutLogModal, setShowGutLogModal] = useState(false);
	const [showFastingModal, setShowFastingModal] = useState(false);
	const [showWaterGoalModal, setShowWaterGoalModal] = useState(false);
	const [showCalorieGoalModal, setShowCalorieGoalModal] = useState(false);
	const [customWaterGoal, setCustomWaterGoal] = useState("");
	const [customCalories, setCustomCalories] = useState("");
	const [customProtein, setCustomProtein] = useState("");
	const [customCarbs, setCustomCarbs] = useState("");
	const [customFat, setCustomFat] = useState("");
	const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFoods, setSelectedFoods] = useState<FoodWithQuantity[]>([]);
	const [mealNotes, setMealNotes] = useState("");

	// Gut health state
	const [selectedStoolType, setSelectedStoolType] =
		useState<BristolStoolType | null>(null);
	const [selectedSymptoms, setSelectedSymptoms] = useState<GutSymptom[]>([]);
	const [digestionRating, setDigestionRating] = useState(3);
	const [energyLevel, setEnergyLevel] = useState(3);
	const [gutNotes, setGutNotes] = useState("");

	// Fasting state
	const [selectedFastingType, setSelectedFastingType] =
		useState<FastingType>("16_8");
	const [customFastingHours, setCustomFastingHours] = useState(16);

	// Goal setup state
	const [showGoalSetupModal, setShowGoalSetupModal] = useState(false);
	const [selectedGoal, setSelectedGoal] = useState<string>("maintenance");

	// Calculate preview goals for a specific goal type
	const calculatePreviewGoals = (goalType: string) => {
		const nutritionProfile = store.nutritionProfile;
		if (!nutritionProfile) {
			return { calories: 2000, protein: 60, carbs: 250, fat: 65 };
		}

		// Calculate BMR
		let bmr = 10 * (nutritionProfile.weight || 70);
		bmr += 6.25 * (nutritionProfile.height || 170);
		bmr -= 5 * (nutritionProfile.age || 30);
		bmr += nutritionProfile.gender === "male" ? 5 : -161;

		// TDEE
		const activityMultipliers: Record<string, number> = {
			sedentary: 1.2,
			light: 1.375,
			moderate: 1.55,
			active: 1.725,
			extremely_active: 1.9,
		};
		const tdee =
			bmr * (activityMultipliers[nutritionProfile.activityLevel] || 1.55);

		// Adjust for goal
		let calories = tdee;
		let proteinRatio = 0.25;
		let carbRatio = 0.45;
		let fatRatio = 0.3;

		if (goalType === "weight_loss") {
			calories = tdee - 500;
			proteinRatio = 0.3;
			carbRatio = 0.35;
			fatRatio = 0.35;
		} else if (goalType === "muscle_gain") {
			calories = tdee + 300;
			proteinRatio = 0.3;
			carbRatio = 0.45;
			fatRatio = 0.25;
		}

		return {
			calories: Math.round(calories),
			protein: Math.round((calories * proteinRatio) / 4),
			carbs: Math.round((calories * carbRatio) / 4),
			fat: Math.round((calories * fatRatio) / 9),
		};
	};

	// Daily summary
	const today = new Date();
	const dailySummary = store.getDailySummary(today);
	const todayMeals = store.getMealsByDate(today);
	const todayWater = store.getTodayWaterIntake();
	const currentFast = store.getCurrentFastProgress();
	const insights = store.getNutritionInsights();
	const macroBreakdown = store.getMacroBreakdown(today);

	// Search results
	const searchResults = useMemo(() => {
		if (searchQuery.length < 2) return [];
		return searchFoods(searchQuery).slice(0, 20);
	}, [searchQuery]);

	// Recommendations
	const foodRecommendations = useMemo(() => {
		return getFoodRecommendations("general").slice(0, 10);
	}, []);

	// ============================================
	// STYLES
	// ============================================

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			padding: 16,
			paddingTop: 8,
		},
		headerTitle: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 4,
		},
		headerSubtitle: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		subTabContainer: {
			flexDirection: "row",
			paddingHorizontal: 12,
			marginBottom: 12,
		},
		subTab: {
			flex: 1,
			paddingVertical: 10,
			paddingHorizontal: 8,
			alignItems: "center",
			borderRadius: 8,
			marginHorizontal: 4,
		},
		subTabActive: {
			backgroundColor: theme.primary,
		},
		subTabInactive: {
			backgroundColor: theme.surface,
		},
		subTabText: {
			fontSize: 12,
			fontWeight: "600",
		},
		subTabTextActive: {
			color: "#FFFFFF",
		},
		subTabTextInactive: {
			color: theme.textSecondary,
		},
		content: {
			flex: 1,
			paddingHorizontal: 16,
		},
		card: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		cardTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		calorieRing: {
			alignItems: "center",
			marginBottom: 16,
		},
		calorieText: {
			fontSize: 32,
			fontWeight: "700",
			color: theme.text,
		},
		calorieLabel: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		macroRow: {
			flexDirection: "row",
			justifyContent: "space-around",
			marginTop: 12,
		},
		macroItem: {
			alignItems: "center",
		},
		macroValue: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		macroLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
		},
		progressBar: {
			height: 8,
			backgroundColor: theme.border,
			borderRadius: 4,
			overflow: "hidden",
			marginTop: 8,
		},
		progressFill: {
			height: "100%",
			borderRadius: 4,
		},
		mealTypeRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		mealTypeButton: {
			flex: 1,
			paddingVertical: 12,
			alignItems: "center",
			borderRadius: 12,
			marginHorizontal: 4,
			backgroundColor: theme.surface,
			borderWidth: 2,
			borderColor: "transparent",
		},
		mealTypeButtonActive: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "20",
		},
		mealTypeIcon: {
			marginBottom: 4,
		},
		mealTypeText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		mealTypeTextActive: {
			color: theme.primary,
		},
		addButton: {
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: "center",
			marginTop: 8,
		},
		addButtonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
		mealLogItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		mealLogInfo: {
			flex: 1,
		},
		mealLogTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		mealLogSubtitle: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
		},
		mealLogCalories: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		// Modal styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "90%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		modalBody: {
			padding: 16,
		},
		searchInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			fontSize: 16,
			color: theme.text,
			marginBottom: 12,
		},
		foodItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			marginBottom: 8,
		},
		foodItemSelected: {
			borderWidth: 2,
			borderColor: theme.primary,
		},
		foodName: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		foodCalories: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		quantityControl: {
			flexDirection: "row",
			alignItems: "center",
		},
		quantityButton: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.primary,
			alignItems: "center",
			justifyContent: "center",
		},
		quantityText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginHorizontal: 12,
		},
		// Hydration styles
		waterContainer: {
			alignItems: "center",
			marginBottom: 24,
		},
		waterAmount: {
			fontSize: 48,
			fontWeight: "700",
			color: theme.primary,
		},
		waterLabel: {
			fontSize: 16,
			color: theme.textSecondary,
			marginTop: 4,
		},
		waterButtonRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			flexWrap: "wrap",
		},
		waterButton: {
			width: (width - 64) / 4,
			aspectRatio: 1,
			backgroundColor: theme.surface,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: 8,
		},
		waterButtonText: {
			fontSize: 12,
			color: theme.text,
			marginTop: 4,
		},
		// Gut health styles
		stoolTypeGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "flex-start",
			gap: 8,
			marginBottom: 16,
		},
		stoolTypeItem: {
			width: (width - 56) / 4,
			aspectRatio: 1,
			backgroundColor: theme.surface,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: 8,
			borderWidth: 2,
			borderColor: "transparent",
		},
		stoolTypeSelected: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "20",
		},
		stoolTypeText: {
			fontSize: 10,
			color: theme.textSecondary,
			textAlign: "center",
			marginTop: 4,
		},
		symptomChip: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 12,
			paddingVertical: 8,
			backgroundColor: theme.surface,
			borderRadius: 20,
			marginRight: 8,
			marginBottom: 8,
			borderWidth: 2,
			borderColor: "transparent",
		},
		symptomChipSelected: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "20",
		},
		symptomChipText: {
			fontSize: 12,
			color: theme.text,
			marginLeft: 4,
		},
		ratingRow: {
			flexDirection: "row",
			justifyContent: "center",
			marginVertical: 12,
		},
		ratingButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.surface,
			alignItems: "center",
			justifyContent: "center",
			marginHorizontal: 4,
		},
		ratingButtonActive: {
			backgroundColor: theme.primary,
		},
		ratingButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		ratingButtonTextActive: {
			color: "#FFFFFF",
		},
		// Fasting styles
		fastingCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
			alignItems: "center",
		},
		fastingTimer: {
			fontSize: 48,
			fontWeight: "700",
			color: theme.primary,
		},
		fastingProgress: {
			fontSize: 24,
			fontWeight: "600",
			color: theme.text,
			marginTop: 8,
		},
		fastingLabel: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		fastingPreset: {
			flex: 1,
			paddingVertical: 16,
			paddingHorizontal: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
			marginHorizontal: 4,
			alignItems: "center",
			borderWidth: 2,
			borderColor: "transparent",
		},
		fastingPresetSelected: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "20",
		},
		fastingPresetLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		fastingPresetHours: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
		},
		// Insights styles
		insightCard: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 8,
		},
		insightIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: "center",
			justifyContent: "center",
			marginRight: 12,
		},
		insightContent: {
			flex: 1,
		},
		insightTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		insightMessage: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		emptyState: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 40,
		},
		emptyStateText: {
			fontSize: 16,
			color: theme.textSecondary,
			marginTop: 12,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 12,
			marginTop: 8,
		},
		// Goal Setup Modal Styles
		goalCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			borderWidth: 2,
			borderColor: "transparent",
			flexDirection: "row",
			alignItems: "center",
		},
		goalCardSelected: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "15",
		},
		goalLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		goalDesc: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 4,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			fontSize: 16,
			color: theme.text,
			marginBottom: 12,
			borderWidth: 1,
			borderColor: theme.border,
		},
		inputLabelText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
		},
		modalButton: {
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 12,
			alignItems: "center",
		},
	});

	// ============================================
	// HANDLERS
	// ============================================

	const handleAddFood = (food: FoodItem) => {
		const existing = selectedFoods.find((f) => f.food.id === food.id);
		if (existing) {
			setSelectedFoods(
				selectedFoods.map((f) =>
					f.food.id === food.id ? { ...f, quantity: f.quantity + 1 } : f
				)
			);
		} else {
			setSelectedFoods([...selectedFoods, { food, quantity: 1 }]);
		}
	};

	const handleRemoveFood = (foodId: string) => {
		const existing = selectedFoods.find((f) => f.food.id === foodId);
		if (existing && existing.quantity > 1) {
			setSelectedFoods(
				selectedFoods.map((f) =>
					f.food.id === foodId ? { ...f, quantity: f.quantity - 1 } : f
				)
			);
		} else {
			setSelectedFoods(selectedFoods.filter((f) => f.food.id !== foodId));
		}
	};

	const calculateMealNutrition = () => {
		return selectedFoods.reduce(
			(total, item) => {
				const multiplier = item.quantity;
				return {
					calories: total.calories + item.food.nutrition.calories * multiplier,
					protein: total.protein + item.food.nutrition.protein * multiplier,
					carbohydrates:
						total.carbohydrates +
						item.food.nutrition.carbohydrates * multiplier,
					fat: total.fat + item.food.nutrition.fat * multiplier,
					fiber: total.fiber + item.food.nutrition.fiber * multiplier,
					sugar: total.sugar + item.food.nutrition.sugar * multiplier,
					servingSize: 0,
					servingUnit: "",
				};
			},
			{
				calories: 0,
				protein: 0,
				carbohydrates: 0,
				fat: 0,
				fiber: 0,
				sugar: 0,
				servingSize: 0,
				servingUnit: "",
			}
		);
	};

	const handleLogMeal = async () => {
		if (selectedFoods.length === 0) {
			Alert.alert("Error", "Please add at least one food item");
			return;
		}

		const nutrition = calculateMealNutrition();
		await store.logMeal({
			date: new Date() as any, // Store handles Date to string conversion
			mealType: selectedMealType,
			foods: selectedFoods.map((f) => ({
				foodId: f.food.id,
				foodName: f.food.name,
				quantity: f.quantity,
				unit: "serving",
				nutrition: {
					calories: f.food.nutrition.calories * f.quantity,
					protein: f.food.nutrition.protein * f.quantity,
					carbohydrates: f.food.nutrition.carbohydrates * f.quantity,
					fat: f.food.nutrition.fat * f.quantity,
					fiber: f.food.nutrition.fiber * f.quantity,
					sugar: f.food.nutrition.sugar * f.quantity,
				},
			})),
			nutrition: nutrition as any,
			notes: mealNotes,
		} as any);

		setSelectedFoods([]);
		setMealNotes("");
		setShowAddMealModal(false);
		Alert.alert("Success", "Meal logged successfully!");
	};

	const handleDeleteMeal = async (mealId: string) => {
		Alert.alert("Delete Meal", "Are you sure you want to delete this meal?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					await store.deleteMealLog(mealId);
					Alert.alert("Success", "Meal deleted");
				},
			},
		]);
	};

	const handleLogGutHealth = async () => {
		if (!selectedStoolType) {
			Alert.alert("Error", "Please select stool type");
			return;
		}

		await store.logGutHealth({
			date: new Date() as any, // Store handles Date to string conversion
			stoolType: selectedStoolType,
			symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : [],
			digestionRating,
			energyLevel,
			notes: gutNotes,
		} as any);

		setSelectedStoolType(null);
		setSelectedSymptoms([]);
		setDigestionRating(3);
		setEnergyLevel(3);
		setGutNotes("");
		setShowGutLogModal(false);
		Alert.alert("Success", "Gut health logged!");
	};

	const handleStartFast = async () => {
		const preset = FASTING_PRESETS.find((p) => p.type === selectedFastingType);
		const hours =
			preset?.type === "custom" ? customFastingHours : preset?.hours || 16;

		await store.startFast(selectedFastingType, hours);
		setShowFastingModal(false);
		Alert.alert("Fasting Started", `Your ${hours} hour fast has begun!`);
	};

	const handleEndFast = async () => {
		Alert.alert("End Fast", "Are you sure you want to end your fast?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "End Fast",
				onPress: async () => {
					await store.endFast();
					Alert.alert("Fast Completed", "Great job completing your fast!");
				},
			},
		]);
	};

	const handleLogWater = async (amount: number) => {
		// Prevent water intake from going below 0
		if (amount < 0 && todayWater + amount < 0) {
			return;
		}
		await store.logWater(amount);
	};

	const handleResetWater = async () => {
		Alert.alert(
			"Reset Water Intake",
			"Are you sure you want to reset today's water intake to 0?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: async () => {
						await store.logWater(-todayWater);
					},
				},
			]
		);
	};

	const handleSetWaterGoal = async () => {
		const goalMl = parseInt(customWaterGoal);
		if (isNaN(goalMl) || goalMl < 500 || goalMl > 10000) {
			Alert.alert(
				"Invalid Goal",
				"Please enter a water goal between 500ml and 10000ml"
			);
			return;
		}
		await store.setCustomWaterGoal(goalMl);
		setShowWaterGoalModal(false);
		setCustomWaterGoal("");
		Alert.alert(
			"Success",
			`Water goal set to ${(goalMl / 1000).toFixed(1)}L per day`
		);
	};

	const handleSetCalorieGoal = async () => {
		const calories = parseInt(customCalories);
		const protein = customProtein ? parseInt(customProtein) : undefined;
		const carbs = customCarbs ? parseInt(customCarbs) : undefined;
		const fat = customFat ? parseInt(customFat) : undefined;

		if (isNaN(calories) || calories < 1000 || calories > 5000) {
			Alert.alert(
				"Invalid Goal",
				"Please enter calories between 1000 and 5000"
			);
			return;
		}

		await store.setCustomCalorieGoal(calories, protein, carbs, fat);
		setShowCalorieGoalModal(false);
		setCustomCalories("");
		setCustomProtein("");
		setCustomCarbs("");
		setCustomFat("");
		Alert.alert("Success", "Calorie goals updated successfully!");
	};

	const handleCompleteGoalSetup = async () => {
		// Auto-calculate based on fitness profile and selected goal
		try {
			console.log("=== GOAL SETUP START ===");
			console.log("Selected Goal:", selectedGoal);
			console.log(
				"Current Nutrition Profile:",
				JSON.stringify(store.nutritionProfile, null, 2)
			);

			// Map UI goal values to database enum values
			const goalMapping: Record<string, string> = {
				weight_loss: "lose_weight",
				maintenance: "maintain",
				muscle_gain: "gain_muscle",
			};
			const dbGoal = goalMapping[selectedGoal] || "maintain";
			console.log("Mapped DB Goal:", dbGoal);

			// First, check if we have a fitness profile and create/update nutrition profile
			if (!store.nutritionProfile && profile?.id) {
				console.log(
					"No nutrition profile found, checking for fitness profile..."
				);

				// Get fitness profile from database
				const { data: fitnessProfile } = await (supabase as any)
					.from("fitness_profiles")
					.select("*")
					.eq("user_id", profile.id)
					.single();

				console.log(
					"Fitness Profile from DB:",
					JSON.stringify(fitnessProfile, null, 2)
				);

				if (fitnessProfile) {
					// Create nutrition profile from fitness profile
					const newNutritionProfile = {
						user_id: profile.id,
						age: fitnessProfile.age || 25,
						gender: fitnessProfile.gender || "male",
						height: fitnessProfile.height || 170,
						weight: fitnessProfile.weight || 70,
						activity_level: fitnessProfile.activity_level || "moderate",
						goal: dbGoal,
						dietary_preferences: [],
						allergies: [],
						target_calories: 2000,
						target_protein: 150,
						target_carbs: 200,
						target_fat: 65,
						target_fiber: 30,
						target_water: 2500,
						meal_frequency: 3,
					};

					console.log(
						"Creating new nutrition profile:",
						JSON.stringify(newNutritionProfile, null, 2)
					);

					const { data: createdProfile, error } = await (supabase as any)
						.from("nutrition_profiles")
						.insert(newNutritionProfile)
						.select()
						.single();

					if (error) {
						console.error("Error creating nutrition profile:", error);
						throw error;
					}

					console.log(
						"Created Nutrition Profile:",
						JSON.stringify(createdProfile, null, 2)
					);
					store.nutritionProfile = createdProfile;
				}
			} else if (store.nutritionProfile) {
				// Update existing nutrition profile with the selected goal
				console.log("Updating nutrition profile goal to:", dbGoal);
				await (supabase as any)
					.from("nutrition_profiles")
					.update({ goal: dbGoal })
					.eq("id", store.nutritionProfile.id);

				// Refresh the nutrition profile to get updated goal
				const { data } = await (supabase as any)
					.from("nutrition_profiles")
					.select("*")
					.eq("id", store.nutritionProfile.id)
					.single();

				console.log(
					"Refreshed Profile from DB:",
					JSON.stringify(data, null, 2)
				);

				if (data) {
					// Update the store with refreshed profile
					store.nutritionProfile = data;
					console.log(
						"Updated store.nutritionProfile:",
						JSON.stringify(store.nutritionProfile, null, 2)
					);
				}
			}

			// Calculate goals based on fitness profile from DB (now with updated goal)
			const goals = store.calculateDailyGoals();
			console.log("Calculated Daily Goals:", JSON.stringify(goals, null, 2));
			console.log("=== GOAL SETUP END ===");

			setShowGoalSetupModal(false);
			Alert.alert(
				"Success",
				`Daily goals set based on your ${selectedGoal.replace(
					"_",
					" "
				)} goal!\n\nCalories: ${Math.round(
					goals.calories
				)} kcal\nProtein: ${Math.round(goals.protein)}g\nCarbs: ${Math.round(
					goals.carbs
				)}g\nFat: ${Math.round(goals.fat)}g`
			);
		} catch (error) {
			console.error("Error setting goals:", error);
			Alert.alert("Error", "Failed to set goals. Please try again.");
		}
	};

	const formatTime = (hours: number) => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h}h ${m}m`;
	};

	// ============================================
	// RENDER FUNCTIONS
	// ============================================

	const renderMealLogTab = () => (
		<ScrollView showsVerticalScrollIndicator={false}>
			{/* Daily Summary Card */}
			<View style={styles.card}>
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
					}}
				>
					<Text style={styles.cardTitle}>Daily Goals</Text>
					<TouchableOpacity
						onPress={() => setShowGoalSetupModal(true)}
						style={{
							paddingHorizontal: 12,
							paddingVertical: 6,
							backgroundColor: theme.primary + "20",
							borderRadius: 8,
						}}
					>
						<Text
							style={{ color: theme.primary, fontSize: 12, fontWeight: "600" }}
						>
							Set Goals
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.calorieRing}>
					<Text style={styles.calorieText}>{dailySummary.totalCalories}</Text>
					<Text style={styles.calorieLabel}>
						of {dailySummary.calorieGoal} kcal
					</Text>
					<View style={[styles.progressBar, { width: "80%" }]}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${Math.min(
										100,
										(dailySummary.totalCalories / dailySummary.calorieGoal) *
											100
									)}%`,
									backgroundColor: theme.primary,
								},
							]}
						/>
					</View>
				</View>

				<View style={styles.macroRow}>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>{dailySummary.totalProtein}g</Text>
						<Text style={styles.macroLabel}>Protein</Text>
						<Text style={{ fontSize: 10, color: theme.textSecondary }}>
							/ {dailySummary.proteinGoal}g
						</Text>
					</View>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>{dailySummary.totalCarbs}g</Text>
						<Text style={styles.macroLabel}>Carbs</Text>
						<Text style={{ fontSize: 10, color: theme.textSecondary }}>
							/ {dailySummary.carbGoal}g
						</Text>
					</View>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>{dailySummary.totalFat}g</Text>
						<Text style={styles.macroLabel}>Fat</Text>
						<Text style={{ fontSize: 10, color: theme.textSecondary }}>
							/ {dailySummary.fatGoal}g
						</Text>
					</View>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>{dailySummary.totalFiber}g</Text>
						<Text style={styles.macroLabel}>Fiber</Text>
					</View>
				</View>
			</View>

			{/* Meal Type Selection */}
			<View style={styles.mealTypeRow}>
				{(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
					(type) => (
						<TouchableOpacity
							key={type}
							style={[
								styles.mealTypeButton,
								selectedMealType === type && styles.mealTypeButtonActive,
							]}
							onPress={() => setSelectedMealType(type)}
						>
							<Ionicons
								name={
									type === "breakfast"
										? "sunny"
										: type === "lunch"
										? "restaurant"
										: type === "dinner"
										? "moon"
										: "nutrition"
								}
								size={24}
								color={
									selectedMealType === type
										? theme.primary
										: theme.textSecondary
								}
								style={styles.mealTypeIcon}
							/>
							<Text
								style={[
									styles.mealTypeText,
									selectedMealType === type && styles.mealTypeTextActive,
								]}
							>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</Text>
						</TouchableOpacity>
					)
				)}
			</View>

			{/* Add Meal Button */}
			<TouchableOpacity
				style={styles.addButton}
				onPress={() => setShowAddMealModal(true)}
			>
				<Text style={styles.addButtonText}>
					+ Add{" "}
					{selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
				</Text>
			</TouchableOpacity>

			{/* Today's Meals */}
			<Text style={styles.sectionTitle}>Today's Meals</Text>
			{todayMeals.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons
						name="restaurant-outline"
						size={48}
						color={theme.textSecondary}
					/>
					<Text style={styles.emptyStateText}>No meals logged today</Text>
				</View>
			) : (
				<View style={styles.card}>
					{todayMeals.map((meal: any, index) => {
						const mealCalories =
							meal.nutrition?.calories || meal.totalNutrition?.calories || 0;
						return (
							<TouchableOpacity
								key={meal.id}
								style={[
									styles.mealLogItem,
									index === todayMeals.length - 1 && { borderBottomWidth: 0 },
								]}
								onPress={() => {
									// Could open meal detail/edit modal
								}}
							>
								<View style={styles.mealLogInfo}>
									<Text style={styles.mealLogTitle}>
										{meal.mealType.charAt(0).toUpperCase() +
											meal.mealType.slice(1)}
									</Text>
									<Text style={styles.mealLogSubtitle}>
										{meal.foods?.map((f: any) => f.foodName).join(", ") ||
											"No foods"}
									</Text>
								</View>
								<Text style={styles.mealLogCalories}>
									{Math.round(mealCalories)} kcal
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			)}

			{/* Quick Recommendations */}
			<Text style={styles.sectionTitle}>Recommended Foods</Text>
			<FlatList
				horizontal
				data={foodRecommendations}
				keyExtractor={(item) => item.id}
				showsHorizontalScrollIndicator={false}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[styles.foodItem, { width: 150, marginRight: 8 }]}
						onPress={() => {
							setSelectedFoods([{ food: item, quantity: 1 }]);
							setShowAddMealModal(true);
						}}
					>
						<View>
							<Text style={styles.foodName} numberOfLines={1}>
								{item.name}
							</Text>
							<Text style={styles.foodCalories}>
								{item.nutrition.calories} kcal
							</Text>
						</View>
					</TouchableOpacity>
				)}
			/>
		</ScrollView>
	);

	const renderHydrationTab = () => {
		const waterProgress = Math.min(
			100,
			(todayWater / dailySummary.waterGoal) * 100
		);
		const remainingWater = Math.max(0, dailySummary.waterGoal - todayWater);

		return (
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Water Progress Card */}
				<View style={styles.card}>
					<View style={styles.waterContainer}>
						<Ionicons
							name="water"
							size={56}
							color={waterProgress >= 100 ? theme.success : theme.primary}
						/>
						<Text style={styles.waterAmount}>
							{(todayWater / 1000).toFixed(2)}L
						</Text>
						<Text style={styles.waterLabel}>
							of {(dailySummary.waterGoal / 1000).toFixed(1)}L daily goal
						</Text>

						{/* Progress Bar */}
						<View style={[styles.progressBar, { width: "85%", marginTop: 16 }]}>
							<View
								style={[
									styles.progressFill,
									{
										width: `${waterProgress}%`,
										backgroundColor:
											waterProgress >= 100 ? theme.success : "#4FC3F7",
									},
								]}
							/>
						</View>

						{/* Status Text */}
						<Text
							style={{
								color: waterProgress >= 100 ? theme.success : theme.textMuted,
								fontSize: 13,
								fontWeight: "600",
								marginTop: 12,
							}}
						>
							{waterProgress >= 100
								? "🎉 Goal Achieved!"
								: `${(remainingWater / 1000).toFixed(2)}L remaining`}
						</Text>

						{/* Action Buttons */}
						<View
							style={{
								flexDirection: "row",
								gap: 12,
								marginTop: 20,
								width: "100%",
							}}
						>
							<TouchableOpacity
								style={{
									flex: 1,
									paddingVertical: 12,
									paddingHorizontal: 16,
									backgroundColor: theme.primary + "15",
									borderRadius: 12,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
								}}
								onPress={() => setShowWaterGoalModal(true)}
							>
								<Ionicons name="flag" size={18} color={theme.primary} />
								<Text
									style={{
										color: theme.primary,
										fontSize: 14,
										fontWeight: "600",
									}}
								>
									Set Goal
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleResetWater}
								disabled={todayWater === 0}
								style={{
									flex: 1,
									paddingVertical: 12,
									paddingHorizontal: 16,
									backgroundColor:
										todayWater === 0 ? theme.surface : theme.error + "15",
									borderRadius: 12,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									opacity: todayWater === 0 ? 0.5 : 1,
								}}
							>
								<Ionicons
									name="refresh"
									size={18}
									color={todayWater === 0 ? theme.textMuted : theme.error}
								/>
								<Text
									style={{
										color: todayWater === 0 ? theme.textMuted : theme.error,
										fontSize: 14,
										fontWeight: "600",
									}}
								>
									Reset
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Quick Add Card */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Quick Add Water</Text>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: 12,
							marginTop: 12,
						}}
					>
						{WATER_AMOUNTS.map((item) => (
							<TouchableOpacity
								key={item.amount}
								style={{
									flex: 1,
									minWidth: "45%",
									backgroundColor: theme.primary + "10",
									borderRadius: 12,
									paddingVertical: 16,
									paddingHorizontal: 12,
									alignItems: "center",
									gap: 8,
								}}
								onPress={() => handleLogWater(item.amount)}
							>
								<Ionicons
									name={item.icon as any}
									size={28}
									color={theme.primary}
								/>
								<Text
									style={{
										color: theme.text,
										fontSize: 16,
										fontWeight: "700",
									}}
								>
									{item.amount}ml
								</Text>
								<Text
									style={{
										color: theme.textMuted,
										fontSize: 12,
										fontWeight: "500",
									}}
								>
									{item.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* Minus Buttons for Undo */}
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: 12,
							marginTop: 12,
						}}
					>
						{WATER_AMOUNTS.map((item) => (
							<TouchableOpacity
								key={`minus-${item.amount}`}
								style={{
									flex: 1,
									minWidth: "45%",
									backgroundColor:
										todayWater === 0 ? theme.surface : theme.error + "10",
									borderRadius: 12,
									paddingVertical: 12,
									paddingHorizontal: 12,
									alignItems: "center",
									flexDirection: "row",
									justifyContent: "center",
									gap: 6,
									opacity: todayWater === 0 ? 0.5 : 1,
								}}
								onPress={() => handleLogWater(-item.amount)}
								disabled={todayWater === 0}
							>
								<Ionicons
									name="remove-circle"
									size={20}
									color={todayWater === 0 ? theme.textMuted : theme.error}
								/>
								<Text
									style={{
										color: todayWater === 0 ? theme.textMuted : theme.error,
										fontSize: 14,
										fontWeight: "600",
									}}
								>
									-{item.amount}ml
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Hydration Tips */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>💡 Hydration Tips</Text>
					<Text style={{ color: theme.textSecondary, lineHeight: 22 }}>
						• Drink water first thing in the morning{"\n"}• Keep a water bottle
						at your desk{"\n"}• Drink before you feel thirsty{"\n"}• Add lemon
						or cucumber for flavor{"\n"}• Increase intake during exercise
					</Text>
				</View>
			</ScrollView>
		);
	};

	// ============================================
	// MODALS
	// ============================================

	const renderAddMealModal = () => (
		<Modal
			visible={showAddMealModal}
			animationType="slide"
			transparent
			onRequestClose={() => setShowAddMealModal(false)}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Add {selectedMealType}</Text>
						<TouchableOpacity onPress={() => setShowAddMealModal(false)}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.modalBody}>
						{/* Search */}
						<TextInput
							style={styles.searchInput}
							placeholder="Search foods..."
							placeholderTextColor={theme.textSecondary}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>

						{/* Search Results */}
						{searchQuery.length >= 2 && (
							<>
								<Text style={styles.sectionTitle}>Search Results</Text>
								{searchResults.map((food) => (
									<TouchableOpacity
										key={food.id}
										style={[
											styles.foodItem,
											selectedFoods.some((f) => f.food.id === food.id) &&
												styles.foodItemSelected,
										]}
										onPress={() => handleAddFood(food)}
									>
										<View>
											<Text style={styles.foodName}>{food.name}</Text>
											<Text style={styles.foodCalories}>
												{food.nutrition.calories} kcal •{" "}
												{food.nutrition.protein}g protein
											</Text>
										</View>
										<Ionicons
											name="add-circle"
											size={24}
											color={theme.primary}
										/>
									</TouchableOpacity>
								))}
							</>
						)}

						{/* Selected Foods */}
						{selectedFoods.length > 0 && (
							<>
								<Text style={styles.sectionTitle}>Selected Foods</Text>
								{selectedFoods.map((item) => (
									<View key={item.food.id} style={styles.foodItem}>
										<View>
											<Text style={styles.foodName}>{item.food.name}</Text>
											<Text style={styles.foodCalories}>
												{Math.round(
													item.food.nutrition.calories * item.quantity
												)}{" "}
												kcal
											</Text>
										</View>
										<View style={styles.quantityControl}>
											<TouchableOpacity
												style={styles.quantityButton}
												onPress={() => handleRemoveFood(item.food.id)}
											>
												<Ionicons name="remove" size={20} color="#FFF" />
											</TouchableOpacity>
											<Text style={styles.quantityText}>{item.quantity}</Text>
											<TouchableOpacity
												style={styles.quantityButton}
												onPress={() => handleAddFood(item.food)}
											>
												<Ionicons name="add" size={20} color="#FFF" />
											</TouchableOpacity>
										</View>
									</View>
								))}

								{/* Total */}
								<View style={[styles.card, { marginTop: 16 }]}>
									<Text style={styles.cardTitle}>Meal Total</Text>
									<View style={styles.macroRow}>
										<View style={styles.macroItem}>
											<Text style={styles.macroValue}>
												{Math.round(calculateMealNutrition().calories)}
											</Text>
											<Text style={styles.macroLabel}>kcal</Text>
										</View>
										<View style={styles.macroItem}>
											<Text style={styles.macroValue}>
												{Math.round(calculateMealNutrition().protein)}g
											</Text>
											<Text style={styles.macroLabel}>Protein</Text>
										</View>
										<View style={styles.macroItem}>
											<Text style={styles.macroValue}>
												{Math.round(calculateMealNutrition().carbohydrates)}g
											</Text>
											<Text style={styles.macroLabel}>Carbs</Text>
										</View>
										<View style={styles.macroItem}>
											<Text style={styles.macroValue}>
												{Math.round(calculateMealNutrition().fat)}g
											</Text>
											<Text style={styles.macroLabel}>Fat</Text>
										</View>
									</View>
								</View>

								{/* Notes */}
								<TextInput
									style={[styles.searchInput, { marginTop: 16 }]}
									placeholder="Add notes (optional)"
									placeholderTextColor={theme.textSecondary}
									value={mealNotes}
									onChangeText={setMealNotes}
									multiline
								/>

								{/* Log Button */}
								<TouchableOpacity
									style={styles.addButton}
									onPress={handleLogMeal}
								>
									<Text style={styles.addButtonText}>Log Meal</Text>
								</TouchableOpacity>
							</>
						)}

						{/* Recommendations when not searching */}
						{searchQuery.length < 2 && selectedFoods.length === 0 && (
							<>
								<Text style={styles.sectionTitle}>Popular Foods</Text>
								{foodRecommendations.slice(0, 10).map((food) => (
									<TouchableOpacity
										key={food.id}
										style={styles.foodItem}
										onPress={() => handleAddFood(food)}
									>
										<View>
											<Text style={styles.foodName}>{food.name}</Text>
											<Text style={styles.foodCalories}>
												{food.nutrition.calories} kcal •{" "}
												{food.nutrition.protein}g protein
											</Text>
										</View>
										<Ionicons
											name="add-circle"
											size={24}
											color={theme.primary}
										/>
									</TouchableOpacity>
								))}
							</>
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);

	const renderGutHealthModal = () => (
		<Modal
			visible={showGutLogModal}
			animationType="slide"
			transparent
			onRequestClose={() => setShowGutLogModal(false)}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Log Gut Health</Text>
						<TouchableOpacity onPress={() => setShowGutLogModal(false)}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.modalBody}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 100 }}
					>
						{/* Stool Type Selection */}
						<Text style={[styles.sectionTitle, { marginBottom: 4 }]}>
							Bristol Stool Scale
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: theme.textMuted,
								marginBottom: 16,
								lineHeight: 16,
							}}
						>
							Select the type that best matches your stool
						</Text>
						<View style={styles.stoolTypeGrid}>
							{([1, 2, 3, 4, 5, 6, 7] as BristolStoolType[]).map((type) => {
								const info = BRISTOL_SCALE_INFO[type];
								const isSelected = selectedStoolType === type;
								return (
									<TouchableOpacity
										key={type}
										style={[
											styles.stoolTypeItem,
											isSelected && styles.stoolTypeSelected,
											{
												borderWidth: 2,
												borderColor: isSelected
													? theme.primary
													: info.health === "good"
													? theme.success + "30"
													: info.health === "concerning"
													? theme.warning + "30"
													: theme.error + "30",
												backgroundColor: isSelected
													? theme.primary + "20"
													: theme.surface,
											},
										]}
										onPress={() => setSelectedStoolType(type)}
									>
										<Text style={{ fontSize: 28, marginBottom: 4 }}>
											{info.emoji}
										</Text>
										<Text
											style={[
												styles.stoolTypeText,
												{ fontWeight: "700", marginBottom: 2 },
											]}
										>
											Type {type}
										</Text>
										<Text
											style={{
												fontSize: 10,
												color: theme.textMuted,
												textAlign: "center",
												lineHeight: 12,
											}}
											numberOfLines={2}
										>
											{info.description}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Selected Type Info */}
						{selectedStoolType && (
							<View
								style={{
									backgroundColor:
										BRISTOL_SCALE_INFO[selectedStoolType].health === "good"
											? theme.success + "15"
											: BRISTOL_SCALE_INFO[selectedStoolType].health ===
											  "concerning"
											? theme.warning + "15"
											: theme.error + "15",
									padding: 12,
									borderRadius: 12,
									marginTop: 12,
									borderWidth: 1,
									borderColor:
										BRISTOL_SCALE_INFO[selectedStoolType].health === "good"
											? theme.success + "30"
											: BRISTOL_SCALE_INFO[selectedStoolType].health ===
											  "concerning"
											? theme.warning + "30"
											: theme.error + "30",
								}}
							>
								<Text
									style={{
										fontSize: 12,
										color:
											BRISTOL_SCALE_INFO[selectedStoolType].health === "good"
												? theme.success
												: BRISTOL_SCALE_INFO[selectedStoolType].health ===
												  "concerning"
												? theme.warning
												: theme.error,
										fontWeight: "600",
									}}
								>
									{BRISTOL_SCALE_INFO[selectedStoolType].health === "good"
										? "✓ Healthy stool type"
										: BRISTOL_SCALE_INFO[selectedStoolType].health ===
										  "concerning"
										? "⚠ May indicate constipation or diarrhea"
										: "⚠ Consult a healthcare provider if persistent"}
								</Text>
							</View>
						)}

						{/* Symptoms */}
						<Text
							style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}
						>
							Symptoms (Optional)
						</Text>
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
							{GUT_SYMPTOMS.map((symptom) => {
								const isSelected = selectedSymptoms.includes(symptom.id);
								return (
									<TouchableOpacity
										key={symptom.id}
										style={[
											styles.symptomChip,
											{
												backgroundColor: isSelected
													? theme.primary + "20"
													: theme.surface,
												borderWidth: 1.5,
												borderColor: isSelected ? theme.primary : theme.border,
											},
										]}
										onPress={() => {
											if (isSelected) {
												setSelectedSymptoms(
													selectedSymptoms.filter((s) => s !== symptom.id)
												);
											} else {
												setSelectedSymptoms([...selectedSymptoms, symptom.id]);
											}
										}}
									>
										<Ionicons
											name={symptom.icon as any}
											size={16}
											color={isSelected ? theme.primary : theme.textSecondary}
										/>
										<Text
											style={[
												styles.symptomChipText,
												{ color: isSelected ? theme.primary : theme.text },
											]}
										>
											{symptom.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Digestion Rating */}
						<Text
							style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}
						>
							Digestion Rating
						</Text>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								marginBottom: 12,
							}}
						>
							How well did you digest your last meal?
						</Text>
						<View style={styles.ratingRow}>
							{[1, 2, 3, 4, 5].map((rating) => (
								<TouchableOpacity
									key={rating}
									style={[
										styles.ratingButton,
										digestionRating === rating && styles.ratingButtonActive,
									]}
									onPress={() => setDigestionRating(rating)}
								>
									<Text
										style={[
											styles.ratingButtonText,
											digestionRating === rating &&
												styles.ratingButtonTextActive,
										]}
									>
										{rating}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginTop: 6,
							}}
						>
							<Text style={{ fontSize: 10, color: theme.textMuted }}>Poor</Text>
							<Text style={{ fontSize: 10, color: theme.textMuted }}>
								Excellent
							</Text>
						</View>

						{/* Energy Level */}
						<Text
							style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}
						>
							Energy Level
						</Text>
						<Text
							style={{
								fontSize: 11,
								color: theme.textMuted,
								marginBottom: 12,
							}}
						>
							How energetic do you feel?
						</Text>
						<View style={styles.ratingRow}>
							{[1, 2, 3, 4, 5].map((level) => (
								<TouchableOpacity
									key={level}
									style={[
										styles.ratingButton,
										energyLevel === level && styles.ratingButtonActive,
									]}
									onPress={() => setEnergyLevel(level)}
								>
									<Text
										style={[
											styles.ratingButtonText,
											energyLevel === level && styles.ratingButtonTextActive,
										]}
									>
										{level}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginTop: 6,
							}}
						>
							<Text style={{ fontSize: 10, color: theme.textMuted }}>Low</Text>
							<Text style={{ fontSize: 10, color: theme.textMuted }}>High</Text>
						</View>

						{/* Notes */}
						<Text
							style={[styles.sectionTitle, { marginTop: 24, marginBottom: 8 }]}
						>
							Additional Notes (Optional)
						</Text>
						<TextInput
							style={[
								styles.searchInput,
								{ height: 80, textAlignVertical: "top", paddingTop: 12 },
							]}
							placeholder="Any additional observations or notes..."
							placeholderTextColor={theme.textSecondary}
							value={gutNotes}
							onChangeText={setGutNotes}
							multiline
						/>

						{/* Log Button */}
						<TouchableOpacity
							style={[styles.addButton, { marginTop: 24 }]}
							onPress={handleLogGutHealth}
						>
							<Text style={styles.addButtonText}>Log Gut Health</Text>
						</TouchableOpacity>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);

	// ============================================
	// MAIN RENDER
	// ============================================

	return (
		<View style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>🍎 NutriPlan</Text>
				<Text style={styles.headerSubtitle}>
					Track meals, hydration & gut health
				</Text>
			</View>

			{/* Sub Tabs */}
			<View style={styles.subTabContainer}>
				{(["log", "hydration", "gut", "fasting", "insights"] as SubTab[]).map(
					(tab) => (
						<TouchableOpacity
							key={tab}
							style={[
								styles.subTab,
								activeSubTab === tab
									? styles.subTabActive
									: styles.subTabInactive,
							]}
							onPress={() => setActiveSubTab(tab)}
						>
							<Ionicons
								name={
									tab === "log"
										? "restaurant"
										: tab === "hydration"
										? "water"
										: tab === "gut"
										? "leaf"
										: tab === "fasting"
										? "timer"
										: "analytics"
								}
								size={16}
								color={activeSubTab === tab ? "#FFF" : theme.textSecondary}
							/>
							<Text
								style={[
									styles.subTabText,
									activeSubTab === tab
										? styles.subTabTextActive
										: styles.subTabTextInactive,
								]}
							>
								{tab === "log"
									? "Meals"
									: tab === "hydration"
									? "Water"
									: tab === "gut"
									? "Gut"
									: tab === "fasting"
									? "Fast"
									: "Insights"}
							</Text>
						</TouchableOpacity>
					)
				)}
			</View>

			{/* Content */}
			<View style={styles.content}>
				{activeSubTab === "log" && renderMealLogTab()}
				{activeSubTab === "hydration" && renderHydrationTab()}
				{activeSubTab === "gut" && (
					<GutHealthTab
						theme={theme}
						store={store}
						styles={styles}
						onLogPress={() => setShowGutLogModal(true)}
					/>
				)}
				{activeSubTab === "fasting" && (
					<FastingTab
						theme={theme}
						store={store}
						styles={styles}
						currentFast={currentFast}
						formatTime={formatTime}
						selectedFastingType={selectedFastingType}
						setSelectedFastingType={setSelectedFastingType}
						customFastingHours={customFastingHours}
						setCustomFastingHours={setCustomFastingHours}
						handleStartFast={handleStartFast}
						handleEndFast={handleEndFast}
					/>
				)}
				{activeSubTab === "insights" && (
					<InsightsTab
						theme={theme}
						store={store}
						styles={styles}
						macroBreakdown={macroBreakdown}
						insights={insights}
					/>
				)}
			</View>

			{/* Modals */}
			{renderAddMealModal()}
			{renderGutHealthModal()}

			{/* Goal Setup Modal */}
			<Modal
				visible={showGoalSetupModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowGoalSetupModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Set Nutrition Goals</Text>
							<TouchableOpacity onPress={() => setShowGoalSetupModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalBody}>
							<Text style={styles.sectionTitle}>What's your goal?</Text>

							{[
								{
									id: "weight_loss",
									label: "💪 Lose Weight",
									desc: "Calorie deficit for fat loss",
								},
								{
									id: "maintenance",
									label: "⚖️ Maintenance",
									desc: "Maintain current weight",
								},
								{
									id: "muscle_gain",
									label: "🏋️ Gain Muscle",
									desc: "Calorie surplus for muscle growth",
								},
							].map((goal) => {
								const preview = calculatePreviewGoals(goal.id);
								return (
									<TouchableOpacity
										key={goal.id}
										style={[
											styles.goalCard,
											selectedGoal === goal.id && styles.goalCardSelected,
										]}
										onPress={() => setSelectedGoal(goal.id)}
									>
										<View style={{ flex: 1 }}>
											<Text style={styles.goalLabel}>{goal.label}</Text>
											<Text style={styles.goalDesc}>{goal.desc}</Text>

											{/* Preview Macros */}
											<View
												style={{
													flexDirection: "row",
													marginTop: 8,
													gap: 12,
													flexWrap: "wrap",
												}}
											>
												<View
													style={{
														backgroundColor: theme.primary + "15",
														paddingHorizontal: 8,
														paddingVertical: 4,
														borderRadius: 6,
													}}
												>
													<Text
														style={{
															fontSize: 11,
															color: theme.primary,
															fontWeight: "600",
														}}
													>
														{preview.calories} kcal
													</Text>
												</View>
												<View
													style={{
														backgroundColor: theme.success + "15",
														paddingHorizontal: 8,
														paddingVertical: 4,
														borderRadius: 6,
													}}
												>
													<Text
														style={{
															fontSize: 11,
															color: theme.success,
															fontWeight: "600",
														}}
													>
														P: {preview.protein}g
													</Text>
												</View>
												<View
													style={{
														backgroundColor: theme.warning + "15",
														paddingHorizontal: 8,
														paddingVertical: 4,
														borderRadius: 6,
													}}
												>
													<Text
														style={{
															fontSize: 11,
															color: theme.warning,
															fontWeight: "600",
														}}
													>
														C: {preview.carbs}g
													</Text>
												</View>
												<View
													style={{
														backgroundColor: theme.accent + "15",
														paddingHorizontal: 8,
														paddingVertical: 4,
														borderRadius: 6,
													}}
												>
													<Text
														style={{
															fontSize: 11,
															color: theme.accent,
															fontWeight: "600",
														}}
													>
														F: {preview.fat}g
													</Text>
												</View>
											</View>
										</View>

										{selectedGoal === goal.id && (
											<Ionicons
												name="checkmark-circle"
												size={24}
												color={theme.primary}
												style={{ marginLeft: 12 }}
											/>
										)}
									</TouchableOpacity>
								);
							})}

							<View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
								<TouchableOpacity
									style={[
										styles.modalButton,
										{ backgroundColor: theme.surface, flex: 1 },
									]}
									onPress={() => {
										setShowGoalSetupModal(false);
										setShowCalorieGoalModal(true);
									}}
								>
									<Text style={{ color: theme.text, fontWeight: "600" }}>
										Manual
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.modalButton,
										{ backgroundColor: theme.primary, flex: 1 },
									]}
									onPress={handleCompleteGoalSetup}
								>
									<Text style={{ color: "#FFF", fontWeight: "600" }}>
										Continue
									</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Water Goal Modal */}
			<Modal
				visible={showWaterGoalModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowWaterGoalModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Set Daily Water Goal</Text>
							<TouchableOpacity onPress={() => setShowWaterGoalModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.modalBody}
							showsVerticalScrollIndicator={false}
						>
							<Text
								style={{
									fontSize: 13,
									color: theme.textSecondary,
									marginBottom: 20,
									lineHeight: 18,
								}}
							>
								Set your daily water intake goal. Recommended: 2-3 liters for
								most adults.
							</Text>

							{/* Preset Goals */}
							<Text style={styles.inputLabelText}>Quick Presets</Text>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: 10,
									marginBottom: 20,
								}}
							>
								{[
									{ amount: 2000, label: "2L (Standard)" },
									{ amount: 2500, label: "2.5L (Active)" },
									{ amount: 3000, label: "3L (Athlete)" },
									{ amount: 3500, label: "3.5L (Intense)" },
								].map((preset) => (
									<TouchableOpacity
										key={preset.amount}
										style={{
											flex: 1,
											minWidth: "45%",
											backgroundColor: theme.primary + "15",
											paddingVertical: 14,
											paddingHorizontal: 16,
											borderRadius: 12,
											alignItems: "center",
											borderWidth: 2,
											borderColor:
												customWaterGoal === preset.amount.toString()
													? theme.primary
													: "transparent",
										}}
										onPress={() => setCustomWaterGoal(preset.amount.toString())}
									>
										<Text
											style={{
												color: theme.text,
												fontWeight: "700",
												fontSize: 16,
												marginBottom: 2,
											}}
										>
											{preset.amount}ml
										</Text>
										<Text
											style={{
												color: theme.textMuted,
												fontSize: 11,
												fontWeight: "500",
											}}
										>
											{preset.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							{/* Custom Input */}
							<Text style={styles.inputLabelText}>Custom Goal (ml)</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., 2500"
								placeholderTextColor={theme.textSecondary}
								value={customWaterGoal}
								onChangeText={setCustomWaterGoal}
								keyboardType="numeric"
							/>
							<Text
								style={{
									fontSize: 11,
									color: theme.textMuted,
									marginTop: 6,
									marginBottom: 20,
								}}
							>
								💡 Typical range: 1500ml - 4000ml per day
							</Text>

							{/* Action Buttons */}
							<View style={{ flexDirection: "row", gap: 12 }}>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 14,
										paddingHorizontal: 16,
										backgroundColor: theme.surface,
										borderRadius: 12,
										alignItems: "center",
										borderWidth: 1,
										borderColor: theme.border,
									}}
									onPress={() => {
										setCustomWaterGoal("");
										setShowWaterGoalModal(false);
									}}
								>
									<Text style={{ color: theme.text, fontWeight: "600" }}>
										Cancel
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 14,
										paddingHorizontal: 16,
										backgroundColor: theme.primary,
										borderRadius: 12,
										alignItems: "center",
									}}
									onPress={handleSetWaterGoal}
								>
									<Text style={{ color: "#FFF", fontWeight: "600" }}>
										Set Goal
									</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Calorie Goal Modal */}
			<Modal
				visible={showCalorieGoalModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowCalorieGoalModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Set Daily Goals Manually</Text>
							<TouchableOpacity onPress={() => setShowCalorieGoalModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalBody}>
							<Text
								style={{
									fontSize: 13,
									color: theme.textSecondary,
									marginBottom: 16,
									lineHeight: 18,
								}}
							>
								Enter your custom daily nutrition targets. Macros will be
								auto-calculated if left empty.
							</Text>

							{/* Calories */}
							<View style={{ marginBottom: 16 }}>
								<Text style={styles.inputLabelText}>Daily Calories *</Text>
								<TextInput
									style={styles.input}
									placeholder="e.g., 2000"
									placeholderTextColor={theme.textSecondary}
									value={customCalories}
									onChangeText={setCustomCalories}
									keyboardType="numeric"
								/>
							</View>

							{/* Protein */}
							<View style={{ marginBottom: 16 }}>
								<Text style={styles.inputLabelText}>Protein (g)</Text>
								<TextInput
									style={styles.input}
									placeholder="e.g., 150"
									placeholderTextColor={theme.textSecondary}
									value={customProtein}
									onChangeText={setCustomProtein}
									keyboardType="numeric"
								/>
								<Text
									style={{
										fontSize: 11,
										color: theme.textMuted,
										marginTop: 4,
									}}
								>
									Recommended: 1.6-2.2g per kg body weight
								</Text>
							</View>

							{/* Carbs */}
							<View style={{ marginBottom: 16 }}>
								<Text style={styles.inputLabelText}>Carbohydrates (g)</Text>
								<TextInput
									style={styles.input}
									placeholder="e.g., 200"
									placeholderTextColor={theme.textSecondary}
									value={customCarbs}
									onChangeText={setCustomCarbs}
									keyboardType="numeric"
								/>
								<Text
									style={{
										fontSize: 11,
										color: theme.textMuted,
										marginTop: 4,
									}}
								>
									4 calories per gram
								</Text>
							</View>

							{/* Fat */}
							<View style={{ marginBottom: 20 }}>
								<Text style={styles.inputLabelText}>Fat (g)</Text>
								<TextInput
									style={styles.input}
									placeholder="e.g., 65"
									placeholderTextColor={theme.textSecondary}
									value={customFat}
									onChangeText={setCustomFat}
									keyboardType="numeric"
								/>
								<Text
									style={{
										fontSize: 11,
										color: theme.textMuted,
										marginTop: 4,
									}}
								>
									9 calories per gram
								</Text>
							</View>

							{/* Buttons */}
							<View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
								<TouchableOpacity
									style={[
										styles.modalButton,
										{
											backgroundColor: theme.surface,
											flex: 1,
											borderWidth: 1,
											borderColor: theme.border,
										},
									]}
									onPress={() => setShowCalorieGoalModal(false)}
								>
									<Text style={{ color: theme.text, fontWeight: "600" }}>
										Cancel
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.modalButton,
										{ backgroundColor: theme.primary, flex: 1 },
									]}
									onPress={handleSetCalorieGoal}
								>
									<Text style={{ color: "#FFF", fontWeight: "600" }}>
										Set Goals
									</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}
