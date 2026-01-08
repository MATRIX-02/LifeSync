// NutriPlan - Comprehensive Meal & Nutrition Tracker
// Features: Meal logging, Food search, Gut health, Hydration, Fasting, Insights

import { Alert } from "@/src/components/CustomAlert";
import { supabase } from "@/src/config/supabase";
import { useAuthStore } from "@/src/context/authStore";
import { useNutritionStore } from "@/src/context/nutritionStoreDB";
import { Theme } from "@/src/context/themeContext";
import { getFoodRecommendations, searchFoods } from "@/src/data/mealDatabase";
import { NotificationService } from "@/src/services/notificationService";
import type {
	BristolStoolType,
	FastingType,
	FoodItem,
	GutSymptom,
	MealType,
} from "@/src/types/nutrition";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
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
import Svg, { Circle, G } from "react-native-svg";
import { FastingTab } from "./nutriplan/FastingTab";
import { GutHealthTab } from "./nutriplan/GutHealthTab";
import { InsightsTab } from "./nutriplan/InsightsTab";
import {
	BRISTOL_SCALE_INFO,
	FASTING_PRESETS,
	GUT_SYMPTOMS,
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

	// Water reminder state
	const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
	const [showReminderSettingsModal, setShowReminderSettingsModal] =
		useState(false);
	const [showCustomWaterModal, setShowCustomWaterModal] = useState(false);
	const [customWaterAmount, setCustomWaterAmount] = useState("");

	// Load persisted toggle or fallback to scheduled notifications
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const stored = await AsyncStorage.getItem("waterRemindersEnabled");
				if (mounted && stored !== null) {
					setWaterRemindersEnabled(stored === "true");
					// If persisted ON but no scheduled notifications exist, try to reschedule
					if (stored === "true") {
						try {
							const scheduled =
								await NotificationService.getAllScheduledNotifications();
							const hasWater = scheduled.some(
								(s) =>
									s.content?.data?.type === "water_reminder" ||
									s.content?.data?.type === "water_reminder_single"
							);
							if (!hasWater) {
								const granted = await NotificationService.requestPermissions();
								if (granted) {
									await NotificationService.scheduleWaterReminders(
										dailySummary.waterGoal,
										7,
										22
									);
									console.log(
										"Auto-rescheduled water reminders from persisted flag"
									);
								}
							}
						} catch (e) {
							console.error("Error during auto-reschedule:", e);
						}
					}
					return;
				}
				const scheduled =
					await NotificationService.getAllScheduledNotifications();
				const hasWater = scheduled.some(
					(s) =>
						s.content?.data?.type === "water_reminder" ||
						s.content?.data?.type === "water_reminder_single"
				);
				if (mounted) setWaterRemindersEnabled(hasWater);
			} catch (err) {
				console.error("Error checking stored/scheduled water reminders:", err);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	// Hydration tips array for random display
	const hydrationTips = [
		"Drink your glass of water slowly with some small sips",
		"Start your day with a glass of water upon waking",
		"Carry a water bottle with you throughout the day",
		"Set reminders to drink water every hour",
		"Drink a glass of water before each meal",
		"Add lemon or cucumber for a refreshing twist",
		"Drink more water during exercise and hot weather",
		"Listen to your body - drink when you're thirsty",
		"Water helps maintain energy levels throughout the day",
		"Stay hydrated for better focus and concentration",
	];
	const [currentTipIndex, setCurrentTipIndex] = useState(() =>
		Math.floor(Math.random() * hydrationTips.length)
	);

	// Get today's water logs for history display
	const todayWaterLogs = useMemo(() => {
		return store.getHydrationByDate(new Date()).sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeB - timeA; // Most recent first
		});
	}, [store.hydrationLogs]);

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

		// Schedule fasting milestone notifications
		await NotificationService.startFastingTimerNotification(
			preset?.label || selectedFastingType,
			hours,
			new Date()
		);

		setShowFastingModal(false);
		Alert.success(
			"Fasting Started",
			`Your ${hours} hour fast has begun! You'll receive milestone notifications.`
		);
	};

	const handleEndFast = async () => {
		Alert.confirm(
			"End Fast",
			"Are you sure you want to end your fast?",
			async () => {
				await store.endFast();
				// Cancel any pending fasting notifications
				await NotificationService.cancelFastingNotifications();
				Alert.success("Fast Completed", "Great job completing your fast! 🎉");
			}
		);
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

		// Circular progress calculations
		const circleSize = width * 0.65;
		const strokeWidth = 12;
		const radius = (circleSize - strokeWidth) / 2;
		const circumference = 2 * Math.PI * radius;
		const progressOffset =
			circumference - (waterProgress / 100) * circumference;

		// Format time for water logs
		const formatTime = (timestamp: Date | string) => {
			const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
			return date.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			});
		};

		// Calculate next reminder time
		const getNextReminderTime = () => {
			const now = new Date();
			const glassesLeft = Math.ceil(remainingWater / 250);
			if (glassesLeft <= 0) return null;

			const hoursLeft = 22 - now.getHours(); // Until 10 PM
			if (hoursLeft <= 0) return null;

			const minutesInterval = Math.floor((hoursLeft * 60) / glassesLeft);
			const nextTime = new Date(now.getTime() + minutesInterval * 60 * 1000);
			return formatTime(nextTime);
		};

		return (
			<ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
				{/* Mascot with Tip */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: 16,
						marginBottom: 8,
					}}
				>
					<Text style={{ fontSize: 40 }}>💧</Text>
					<View
						style={{
							flex: 1,
							backgroundColor: isDark ? "#2A2A3E" : "#F0F4FF",
							borderRadius: 16,
							padding: 12,
							marginLeft: 8,
						}}
					>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 13,
								fontStyle: "italic",
							}}
						>
							{hydrationTips[currentTipIndex]}
						</Text>
					</View>
				</View>

				{/* Main Circular Progress */}
				<View
					style={{
						alignItems: "center",
						justifyContent: "center",
						marginVertical: 16,
					}}
				>
					<View
						style={{
							width: circleSize,
							height: circleSize,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{/* SVG Circle Progress */}
						<Svg
							width={circleSize}
							height={circleSize}
							style={{ position: "absolute" }}
						>
							<G rotation="-90" origin={`${circleSize / 2}, ${circleSize / 2}`}>
								{/* Background Circle */}
								<Circle
									cx={circleSize / 2}
									cy={circleSize / 2}
									r={radius}
									stroke={isDark ? "#2A2A3E" : "#E8E8E8"}
									strokeWidth={strokeWidth}
									fill="none"
								/>
								{/* Progress Circle */}
								<Circle
									cx={circleSize / 2}
									cy={circleSize / 2}
									r={radius}
									stroke={waterProgress >= 100 ? "#4ADE80" : "#A78BFA"}
									strokeWidth={strokeWidth}
									fill="none"
									strokeDasharray={circumference}
									strokeDashoffset={progressOffset}
									strokeLinecap="round"
								/>
							</G>
						</Svg>

						{/* Center Content */}
						<View
							style={{
								alignItems: "center",
								justifyContent: "center",
								backgroundColor: isDark ? "#1A1A2E" : "#FFFFFF",
								width: circleSize - strokeWidth * 4,
								height: circleSize - strokeWidth * 4,
								borderRadius: (circleSize - strokeWidth * 4) / 2,
							}}
						>
							<View style={{ flexDirection: "row", alignItems: "baseline" }}>
								<Text
									style={{
										fontSize: 42,
										fontWeight: "700",
										color: "#A78BFA",
									}}
								>
									{todayWater}
								</Text>
								<Text
									style={{
										fontSize: 18,
										fontWeight: "500",
										color: theme.textSecondary,
									}}
								>
									/{dailySummary.waterGoal}ml
								</Text>
							</View>
							<Text
								style={{
									fontSize: 14,
									color: theme.textSecondary,
									marginTop: 4,
								}}
							>
								Daily Drink Target
							</Text>
						</View>

						{/* Decorative water drops */}
						<View
							style={{
								position: "absolute",
								top: 20,
								right: 20,
							}}
						>
							<Text style={{ fontSize: 16, opacity: 0.6 }}>💧</Text>
						</View>
					</View>
				</View>

				{/* Quick Add Water Button */}
				<View
					style={{
						alignItems: "center",
						marginBottom: 16,
					}}
				>
					{/* Water Wave Effect Background */}
					<View
						style={{
							backgroundColor: isDark ? "#E8F4FD20" : "#E8F4FD",
							borderRadius: 20,
							padding: 24,
							paddingBottom: 32,
							alignItems: "center",
							width: width * 0.5,
						}}
					>
						<Text
							style={{
								color: "#A78BFA",
								fontSize: 14,
								fontWeight: "600",
								marginBottom: 8,
							}}
						>
							200 ml
						</Text>
						<TouchableOpacity
							onPress={() => handleLogWater(200)}
							style={{
								width: 70,
								height: 70,
								backgroundColor: isDark ? "#3A2D5E" : "#2D1B4E",
								borderRadius: 12,
								alignItems: "center",
								justifyContent: "center",
								shadowColor: "#A78BFA",
								shadowOffset: { width: 0, height: 4 },
								shadowOpacity: 0.3,
								shadowRadius: 8,
								elevation: 8,
							}}
						>
							<Ionicons name="add" size={32} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
					<Text
						style={{
							color: theme.textSecondary,
							fontSize: 12,
							marginTop: 8,
						}}
					>
						↑ Confirm that you have just drunk water
					</Text>
				</View>

				{/* Quick Actions Row */}
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-around",
						paddingHorizontal: 16,
						marginBottom: 16,
					}}
				>
					{/* Set Goal */}
					<TouchableOpacity
						onPress={() => setShowWaterGoalModal(true)}
						style={{
							alignItems: "center",
							padding: 12,
						}}
					>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: isDark ? "#2A2A3E" : "#F0F0F0",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 4,
							}}
						>
							<Ionicons name="flag" size={24} color={theme.primary} />
						</View>
						<Text style={{ color: theme.textSecondary, fontSize: 11 }}>
							Set Goal
						</Text>
					</TouchableOpacity>

					{/* Reminders */}
					<TouchableOpacity
						onPress={() => setShowReminderSettingsModal(true)}
						style={{
							alignItems: "center",
							padding: 12,
						}}
					>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: waterRemindersEnabled
									? theme.primary + "20"
									: isDark
									? "#2A2A3E"
									: "#F0F0F0",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 4,
							}}
						>
							<Ionicons
								name={
									waterRemindersEnabled
										? "notifications"
										: "notifications-outline"
								}
								size={24}
								color={
									waterRemindersEnabled ? theme.primary : theme.textSecondary
								}
							/>
						</View>
						<Text style={{ color: theme.textSecondary, fontSize: 11 }}>
							Reminders
						</Text>
					</TouchableOpacity>

					{/* Reset */}
					<TouchableOpacity
						onPress={handleResetWater}
						disabled={todayWater === 0}
						style={{
							alignItems: "center",
							padding: 12,
							opacity: todayWater === 0 ? 0.5 : 1,
						}}
					>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: isDark ? "#2A2A3E" : "#F0F0F0",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 4,
							}}
						>
							<Ionicons name="refresh" size={24} color={theme.error} />
						</View>
						<Text style={{ color: theme.textSecondary, fontSize: 11 }}>
							Reset
						</Text>
					</TouchableOpacity>

					{/* Custom Amount */}
					<TouchableOpacity
						onPress={() => {
							setCustomWaterAmount("");
							setShowCustomWaterModal(true);
						}}
						style={{
							alignItems: "center",
							padding: 12,
						}}
					>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: isDark ? "#2A2A3E" : "#F0F0F0",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 4,
							}}
						>
							<Ionicons name="water" size={24} color="#4FC3F7" />
						</View>
						<Text style={{ color: theme.textSecondary, fontSize: 11 }}>
							Custom
						</Text>
					</TouchableOpacity>
				</View>

				{/* Today's Records */}
				<View
					style={{
						paddingHorizontal: 16,
						marginBottom: 20,
					}}
				>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 12,
						}}
					>
						<Text
							style={{
								fontSize: 16,
								fontWeight: "600",
								color: theme.text,
							}}
						>
							Today's records
						</Text>
						<TouchableOpacity onPress={() => handleLogWater(250)}>
							<Ionicons name="add-circle" size={28} color={theme.primary} />
						</TouchableOpacity>
					</View>

					{/* Next Reminder */}
					{waterRemindersEnabled && getNextReminderTime() && (
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								paddingVertical: 16,
								borderBottomWidth: 1,
								borderBottomColor: theme.border,
							}}
						>
							<View
								style={{
									width: 32,
									height: 32,
									borderRadius: 16,
									backgroundColor: theme.primary + "20",
									alignItems: "center",
									justifyContent: "center",
									marginRight: 16,
								}}
							>
								<Ionicons name="time-outline" size={18} color={theme.primary} />
							</View>
							<View
								style={{
									borderLeftWidth: 2,
									borderLeftColor: theme.border,
									height: 40,
									position: "absolute",
									left: 15,
									top: 48,
								}}
							/>
							<View style={{ flex: 1 }}>
								<Text
									style={{
										fontSize: 14,
										fontWeight: "600",
										color: theme.text,
									}}
								>
									{getNextReminderTime()}
								</Text>
								<Text
									style={{
										fontSize: 12,
										color: theme.textSecondary,
									}}
								>
									Next time
								</Text>
							</View>
							<Text
								style={{
									fontSize: 14,
									color: theme.textSecondary,
								}}
							>
								200 ml
							</Text>
						</View>
					)}

					{/* Water Logs */}
					{todayWaterLogs.length === 0 ? (
						<View
							style={{
								alignItems: "center",
								paddingVertical: 32,
							}}
						>
							<Ionicons
								name="water-outline"
								size={48}
								color={theme.textSecondary}
							/>
							<Text
								style={{
									color: theme.textSecondary,
									marginTop: 8,
								}}
							>
								No water logged today
							</Text>
							<Text
								style={{
									color: theme.textMuted,
									fontSize: 12,
									marginTop: 4,
								}}
							>
								Tap the cup above to start tracking
							</Text>
						</View>
					) : (
						todayWaterLogs.slice(0, 10).map((log, index) => (
							<View
								key={log.id}
								style={{
									flexDirection: "row",
									alignItems: "center",
									paddingVertical: 12,
									borderBottomWidth: index < todayWaterLogs.length - 1 ? 1 : 0,
									borderBottomColor: theme.border,
								}}
							>
								<View
									style={{
										width: 32,
										height: 32,
										marginRight: 16,
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Text style={{ fontSize: 20 }}>💧</Text>
									{index < todayWaterLogs.length - 1 && (
										<View
											style={{
												position: "absolute",
												top: 32,
												width: 2,
												height: 20,
												backgroundColor: theme.border,
											}}
										/>
									)}
								</View>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											fontSize: 14,
											fontWeight: "500",
											color: theme.text,
										}}
									>
										{formatTime(log.timestamp)}
									</Text>
								</View>
								<Text
									style={{
										fontSize: 14,
										color: theme.textSecondary,
										marginRight: 8,
									}}
								>
									{log.amount} ml
								</Text>
								<TouchableOpacity
									onPress={() => {
										Alert.confirm(
											"Delete Entry",
											"Remove this water entry?",
											async () => {
												await store.deleteHydrationLog(log.id);
											}
										);
									}}
								>
									<Ionicons
										name="trash"
										size={18}
										color={theme.textSecondary}
									/>
								</TouchableOpacity>
							</View>
						))
					)}
				</View>

				{/* Quick Add Buttons */}
				<View
					style={{
						paddingHorizontal: 16,
						marginBottom: 20,
					}}
				>
					<Text
						style={{
							fontSize: 14,
							fontWeight: "600",
							color: theme.textSecondary,
							marginBottom: 12,
						}}
					>
						Quick Add
					</Text>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: 8,
						}}
					>
						{[100, 150, 200, 250, 300, 500].map((amount) => (
							<TouchableOpacity
								key={amount}
								onPress={() => handleLogWater(amount)}
								style={{
									paddingVertical: 10,
									paddingHorizontal: 16,
									backgroundColor: isDark ? "#2A2A3E" : "#F5F5F5",
									borderRadius: 20,
								}}
							>
								<Text
									style={{
										color: theme.text,
										fontSize: 13,
										fontWeight: "500",
									}}
								>
									{amount} ml
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Stats Card */}
				<View style={[styles.card, { marginHorizontal: 16, marginBottom: 20 }]}>
					<Text style={styles.cardTitle}>📊 Today's Stats</Text>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-around",
							marginTop: 8,
						}}
					>
						<View style={{ alignItems: "center" }}>
							<Text
								style={{
									fontSize: 24,
									fontWeight: "700",
									color: theme.primary,
								}}
							>
								{todayWaterLogs.length}
							</Text>
							<Text style={{ fontSize: 12, color: theme.textSecondary }}>
								Glasses
							</Text>
						</View>
						<View style={{ alignItems: "center" }}>
							<Text
								style={{
									fontSize: 24,
									fontWeight: "700",
									color: waterProgress >= 100 ? "#4ADE80" : theme.text,
								}}
							>
								{Math.round(waterProgress)}%
							</Text>
							<Text style={{ fontSize: 12, color: theme.textSecondary }}>
								Progress
							</Text>
						</View>
						<View style={{ alignItems: "center" }}>
							<Text
								style={{ fontSize: 24, fontWeight: "700", color: theme.text }}
							>
								{Math.ceil(remainingWater / 250)}
							</Text>
							<Text style={{ fontSize: 12, color: theme.textSecondary }}>
								Glasses Left
							</Text>
						</View>
					</View>
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
				<Text style={styles.headerTitle}>NutriPlan</Text>
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

			{/* Water Reminder Settings Modal */}
			<Modal
				visible={showReminderSettingsModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowReminderSettingsModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>💧 Water Reminders</Text>
							<TouchableOpacity
								onPress={() => setShowReminderSettingsModal(false)}
							>
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
									lineHeight: 20,
								}}
							>
								Get gentle reminders throughout the day to stay hydrated.
								Reminders are automatically calculated based on your water goal.
							</Text>

							{/* Enable/Disable Toggle */}
							<TouchableOpacity
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
									backgroundColor: theme.surface,
									padding: 16,
									borderRadius: 12,
									marginBottom: 16,
								}}
								onPress={async () => {
									const newState = !waterRemindersEnabled;
									setWaterRemindersEnabled(newState);
									try {
										await AsyncStorage.setItem(
											"waterRemindersEnabled",
											JSON.stringify(newState)
										);
									} catch (e) {
										console.error("Error persisting waterRemindersEnabled:", e);
									}

									if (newState) {
										// Schedule water reminders
										await NotificationService.scheduleWaterReminders(
											dailySummary.waterGoal,
											7, // Wake up at 7 AM
											22 // Sleep at 10 PM
										);
										Alert.success(
											"Reminders Enabled",
											"You'll receive water reminders throughout the day!"
										);
									} else {
										// Cancel all water reminders
										await NotificationService.cancelWaterReminders();
										Alert.info(
											"Reminders Disabled",
											"Water reminders have been turned off."
										);
									}
								}}
							>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											fontSize: 16,
											fontWeight: "600",
											color: theme.text,
										}}
									>
										Enable Reminders
									</Text>
									<Text
										style={{
											fontSize: 12,
											color: theme.textSecondary,
											marginTop: 4,
										}}
									>
										Get notified to drink water regularly
									</Text>
								</View>
								<View
									style={{
										width: 50,
										height: 30,
										borderRadius: 15,
										backgroundColor: waterRemindersEnabled
											? theme.primary
											: theme.border,
										justifyContent: "center",
										paddingHorizontal: 2,
									}}
								>
									<View
										style={{
											width: 26,
											height: 26,
											borderRadius: 13,
											backgroundColor: "#FFFFFF",
											alignSelf: waterRemindersEnabled
												? "flex-end"
												: "flex-start",
										}}
									/>
								</View>
							</TouchableOpacity>

							{/* How it works */}
							<View
								style={{
									backgroundColor: isDark ? "#2A2A3E" : "#F0F4FF",
									padding: 16,
									borderRadius: 12,
									marginBottom: 16,
								}}
							>
								<Text
									style={{
										fontSize: 14,
										fontWeight: "600",
										color: theme.text,
										marginBottom: 8,
									}}
								>
									How it works
								</Text>
								<View style={{ gap: 8 }}>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Text style={{ fontSize: 16, marginRight: 8 }}>⏰</Text>
										<Text
											style={{
												color: theme.textSecondary,
												fontSize: 13,
												flex: 1,
											}}
										>
											Reminders from 7 AM to 10 PM
										</Text>
									</View>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Text style={{ fontSize: 16, marginRight: 8 }}>🎯</Text>
										<Text
											style={{
												color: theme.textSecondary,
												fontSize: 13,
												flex: 1,
											}}
										>
											Frequency based on your {dailySummary.waterGoal}ml goal
										</Text>
									</View>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Text style={{ fontSize: 16, marginRight: 8 }}>💧</Text>
										<Text
											style={{
												color: theme.textSecondary,
												fontSize: 13,
												flex: 1,
											}}
										>
											~{Math.ceil(dailySummary.waterGoal / 250)} reminders per
											day
										</Text>
									</View>
								</View>
							</View>

							{/* Quick Reminder Button */}
							<TouchableOpacity
								style={{
									backgroundColor: theme.primary + "15",
									padding: 16,
									borderRadius: 12,
									flexDirection: "row",
									alignItems: "center",
									marginBottom: 16,
								}}
								onPress={async () => {
									await NotificationService.scheduleNextWaterReminder(
										30,
										"Time to drink some water! Stay hydrated! 💧"
									);
									Alert.success(
										"Reminder Set",
										"You'll be reminded in 30 minutes!"
									);
								}}
							>
								<View
									style={{
										width: 40,
										height: 40,
										borderRadius: 20,
										backgroundColor: theme.primary + "20",
										alignItems: "center",
										justifyContent: "center",
										marginRight: 12,
									}}
								>
									<Ionicons name="alarm" size={20} color={theme.primary} />
								</View>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.text,
										}}
									>
										Remind me in 30 minutes
									</Text>
									<Text
										style={{
											fontSize: 12,
											color: theme.textSecondary,
										}}
									>
										Get a one-time water reminder
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>

							{/* Tips */}
							<View
								style={{
									backgroundColor: theme.surface,
									padding: 16,
									borderRadius: 12,
								}}
							>
								<Text
									style={{
										fontSize: 14,
										fontWeight: "600",
										color: theme.text,
										marginBottom: 8,
									}}
								>
									💡 Hydration Tips
								</Text>
								<Text
									style={{
										color: theme.textSecondary,
										fontSize: 13,
										lineHeight: 20,
									}}
								>
									• Drink water when you wake up{"\n"}• Have a glass before each
									meal{"\n"}• Keep a water bottle at your desk{"\n"}• Drink more
									during exercise{"\n"}• Add fruits for natural flavor
								</Text>
							</View>

							{/* Close Button */}
							<TouchableOpacity
								style={{
									backgroundColor: theme.primary,
									paddingVertical: 14,
									borderRadius: 12,
									alignItems: "center",
									marginTop: 20,
								}}
								onPress={() => setShowReminderSettingsModal(false)}
							>
								<Text
									style={{ color: "#FFF", fontWeight: "600", fontSize: 16 }}
								>
									Done
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Custom Water Amount Modal */}
			<Modal
				visible={showCustomWaterModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowCustomWaterModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: 300 }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>💧 Custom Amount</Text>
							<TouchableOpacity onPress={() => setShowCustomWaterModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>
						<View style={styles.modalBody}>
							<Text
								style={{
									fontSize: 13,
									color: theme.textSecondary,
									marginBottom: 16,
								}}
							>
								Enter the amount of water you drank (in ml)
							</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., 350"
								placeholderTextColor={theme.textSecondary}
								value={customWaterAmount}
								onChangeText={setCustomWaterAmount}
								keyboardType="numeric"
								autoFocus
							/>
							<View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 14,
										backgroundColor: theme.surface,
										borderRadius: 12,
										alignItems: "center",
										borderWidth: 1,
										borderColor: theme.border,
									}}
									onPress={() => setShowCustomWaterModal(false)}
								>
									<Text style={{ color: theme.text, fontWeight: "600" }}>
										Cancel
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 14,
										backgroundColor: theme.primary,
										borderRadius: 12,
										alignItems: "center",
									}}
									onPress={() => {
										const amount = parseInt(customWaterAmount);
										if (!isNaN(amount) && amount > 0 && amount <= 5000) {
											handleLogWater(amount);
											setShowCustomWaterModal(false);
											setCustomWaterAmount("");
										} else {
											Alert.error(
												"Invalid Amount",
												"Please enter a valid amount between 1-5000ml"
											);
										}
									}}
								>
									<Text style={{ color: "#FFF", fontWeight: "600" }}>
										Add Water
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
