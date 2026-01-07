// NutriPlan - Comprehensive Meal & Nutrition Tracker
// Features: Meal logging, Food search, Gut health, Hydration, Fasting, Insights

import { useAuthStore } from "@/src/context/authStore";
import { useNutritionStore } from "@/src/context/nutritionStoreDB";
import { Theme } from "@/src/context/themeContext";
import {
	getFoodRecommendations,
	getPrebioticFoods,
	getProbioticFoods,
	searchFoods,
} from "@/src/data/mealDatabase";
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
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================

interface NutriPlanProps {
	theme: Theme;
}

type SubTab = "log" | "hydration" | "gut" | "fasting" | "insights";

interface FoodWithQuantity {
	food: FoodItem;
	quantity: number;
}

// ============================================
// GUT SYMPTOMS LIST
// ============================================

const GUT_SYMPTOMS: { id: GutSymptom; label: string; icon: string }[] = [
	{ id: "bloating", label: "Bloating", icon: "ellipse" },
	{ id: "gas", label: "Gas", icon: "cloud" },
	{ id: "cramps", label: "Cramps", icon: "flash" },
	{ id: "constipation", label: "Constipation", icon: "remove-circle" },
	{ id: "diarrhea", label: "Diarrhea", icon: "water" },
	{ id: "heartburn", label: "Heartburn", icon: "flame" },
	{ id: "nausea", label: "Nausea", icon: "medical" },
	{ id: "none", label: "No Issues", icon: "checkmark-circle" },
];

// ============================================
// FASTING PRESETS
// ============================================

const FASTING_PRESETS: {
	type: FastingType;
	label: string;
	hours: number;
	description: string;
}[] = [
	{
		type: "16_8",
		label: "16:8",
		hours: 16,
		description: "Fast 16 hours, eat within 8 hour window",
	},
	{
		type: "18_6",
		label: "18:6",
		hours: 18,
		description: "Fast 18 hours, eat within 6 hour window",
	},
	{
		type: "20_4",
		label: "20:4 (Warrior)",
		hours: 20,
		description: "Fast 20 hours, eat within 4 hour window",
	},
	{ type: "omad", label: "OMAD", hours: 23, description: "One Meal A Day" },
	{
		type: "eat_stop_eat",
		label: "24 Hour",
		hours: 24,
		description: "Full 24 hour fast",
	},
	{
		type: "custom",
		label: "Custom",
		hours: 0,
		description: "Set your own duration",
	},
];

// ============================================
// WATER AMOUNTS
// ============================================

const WATER_AMOUNTS = [
	{ amount: 250, label: "Glass", icon: "water" },
	{ amount: 500, label: "Bottle", icon: "flask" },
	{ amount: 150, label: "Cup", icon: "cafe" },
	{ amount: 1000, label: "Liter", icon: "water" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function NutriPlan({ theme }: NutriPlanProps) {
	const { profile } = useAuthStore();
	const store = useNutritionStore();

	// Initialize store
	useEffect(() => {
		if (profile?.id) {
			store.initialize(profile.id);
		}
	}, [profile?.id]);

	// State
	const [activeSubTab, setActiveSubTab] = useState<SubTab>("log");
	const [showAddMealModal, setShowAddMealModal] = useState(false);
	const [showFoodSearchModal, setShowFoodSearchModal] = useState(false);
	const [showGutLogModal, setShowGutLogModal] = useState(false);
	const [showFastingModal, setShowFastingModal] = useState(false);
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
			justifyContent: "space-between",
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
		await store.logWater(amount);
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

	const renderHydrationTab = () => (
		<ScrollView showsVerticalScrollIndicator={false}>
			<View style={styles.card}>
				<View style={styles.waterContainer}>
					<Ionicons name="water" size={48} color={theme.primary} />
					<Text style={styles.waterAmount}>
						{(todayWater / 1000).toFixed(1)}L
					</Text>
					<Text style={styles.waterLabel}>
						of {(dailySummary.waterGoal / 1000).toFixed(1)}L goal
					</Text>
					<View style={[styles.progressBar, { width: "80%", marginTop: 12 }]}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${Math.min(
										100,
										(todayWater / dailySummary.waterGoal) * 100
									)}%`,
									backgroundColor: "#4FC3F7",
								},
							]}
						/>
					</View>
				</View>

				<Text style={[styles.cardTitle, { marginTop: 16 }]}>Quick Add</Text>
				<View style={styles.waterButtonRow}>
					{WATER_AMOUNTS.map((item) => (
						<TouchableOpacity
							key={item.amount}
							style={styles.waterButton}
							onPress={() => handleLogWater(item.amount)}
						>
							<Ionicons
								name={item.icon as any}
								size={24}
								color={theme.primary}
							/>
							<Text style={styles.waterButtonText}>{item.amount}ml</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Hydration Tips */}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>💡 Hydration Tips</Text>
				<Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
					• Drink water first thing in the morning{"\n"}• Keep a water bottle at
					your desk{"\n"}• Drink before you feel thirsty{"\n"}• Add lemon or
					cucumber for flavor{"\n"}• Increase intake during exercise
				</Text>
			</View>
		</ScrollView>
	);

	const renderGutHealthTab = () => (
		<ScrollView showsVerticalScrollIndicator={false}>
			{/* Quick Log Button */}
			<TouchableOpacity
				style={styles.addButton}
				onPress={() => setShowGutLogModal(true)}
			>
				<Text style={styles.addButtonText}>+ Log Gut Health</Text>
			</TouchableOpacity>

			{/* Recent Gut Health */}
			<Text style={styles.sectionTitle}>Recent Logs</Text>
			{store.gutHealthLogs.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="leaf-outline" size={48} color={theme.textSecondary} />
					<Text style={styles.emptyStateText}>No gut health logs yet</Text>
				</View>
			) : (
				<View style={styles.card}>
					{store.gutHealthLogs.slice(0, 5).map((log: any, index) => {
						const logDate =
							log.date instanceof Date ? log.date : new Date(log.date);
						const digestionRating =
							log.digestionRating || log.overallGutFeeling || 3;
						return (
							<View
								key={log.id}
								style={[
									styles.mealLogItem,
									index === Math.min(4, store.gutHealthLogs.length - 1) && {
										borderBottomWidth: 0,
									},
								]}
							>
								<View style={styles.mealLogInfo}>
									<Text style={styles.mealLogTitle}>
										{logDate.toLocaleDateString()}
									</Text>
									<Text style={styles.mealLogSubtitle}>
										Type {log.stoolType || log.stoolLog?.type || "N/A"} •
										Digestion: {digestionRating}/5
									</Text>
								</View>
								<View style={{ flexDirection: "row", alignItems: "center" }}>
									<Ionicons
										name={
											digestionRating >= 4
												? "happy"
												: digestionRating >= 3
												? "happy-outline"
												: "sad"
										}
										size={20}
										color={
											digestionRating >= 4
												? "#4CAF50"
												: digestionRating >= 3
												? "#FFC107"
												: "#F44336"
										}
									/>
								</View>
							</View>
						);
					})}
				</View>
			)}

			{/* Probiotic Foods */}
			<Text style={styles.sectionTitle}>🦠 Probiotic Foods</Text>
			<FlatList
				horizontal
				data={getProbioticFoods().slice(0, 10)}
				keyExtractor={(item) => item.id}
				showsHorizontalScrollIndicator={false}
				renderItem={({ item }) => (
					<View style={[styles.foodItem, { width: 140, marginRight: 8 }]}>
						<Text style={styles.foodName} numberOfLines={1}>
							{item.name}
						</Text>
						<Text style={styles.foodCalories}>
							{item.gutHealthNotes || "Good for gut"}
						</Text>
					</View>
				)}
			/>

			{/* Prebiotic Foods */}
			<Text style={styles.sectionTitle}>🌱 Prebiotic Foods</Text>
			<FlatList
				horizontal
				data={getPrebioticFoods().slice(0, 10)}
				keyExtractor={(item) => item.id}
				showsHorizontalScrollIndicator={false}
				renderItem={({ item }) => (
					<View style={[styles.foodItem, { width: 140, marginRight: 8 }]}>
						<Text style={styles.foodName} numberOfLines={1}>
							{item.name}
						</Text>
						<Text style={styles.foodCalories}>
							{item.gutHealthNotes || "Feeds good bacteria"}
						</Text>
					</View>
				)}
			/>
		</ScrollView>
	);

	const renderFastingTab = () => (
		<ScrollView showsVerticalScrollIndicator={false}>
			{store.currentFasting && currentFast ? (
				<View style={styles.fastingCard}>
					<Ionicons name="timer" size={48} color={theme.primary} />
					<Text style={styles.fastingTimer}>
						{formatTime(currentFast.elapsedHours)}
					</Text>
					<Text style={styles.fastingProgress}>
						{currentFast.progress}% Complete
					</Text>
					<Text style={styles.fastingLabel}>
						{formatTime(currentFast.remainingHours)} remaining
					</Text>

					<View style={[styles.progressBar, { width: "80%", marginTop: 16 }]}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${currentFast.progress}%`,
									backgroundColor: theme.primary,
								},
							]}
						/>
					</View>

					<TouchableOpacity
						style={[
							styles.addButton,
							{ marginTop: 20, width: 200, backgroundColor: "#F44336" },
						]}
						onPress={handleEndFast}
					>
						<Text style={styles.addButtonText}>End Fast</Text>
					</TouchableOpacity>
				</View>
			) : (
				<>
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Start Intermittent Fasting</Text>
						<Text style={{ color: theme.textSecondary, marginBottom: 16 }}>
							Select a fasting protocol to begin
						</Text>

						<View
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								marginHorizontal: -4,
							}}
						>
							{FASTING_PRESETS.slice(0, 4).map((preset) => (
								<TouchableOpacity
									key={preset.type}
									style={[
										styles.fastingPreset,
										selectedFastingType === preset.type &&
											styles.fastingPresetSelected,
										{ width: (width - 64) / 2 - 8, marginBottom: 8 },
									]}
									onPress={() => setSelectedFastingType(preset.type)}
								>
									<Text style={styles.fastingPresetLabel}>{preset.label}</Text>
									<Text style={styles.fastingPresetHours}>
										{preset.hours}h fast
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<TouchableOpacity
							style={[styles.addButton, { marginTop: 16 }]}
							onPress={handleStartFast}
						>
							<Text style={styles.addButtonText}>Start Fast</Text>
						</TouchableOpacity>
					</View>

					{/* Fasting History */}
					<Text style={styles.sectionTitle}>Fasting History</Text>
					{store.getFastingHistory().length === 0 ? (
						<View style={styles.emptyState}>
							<Ionicons
								name="time-outline"
								size={48}
								color={theme.textSecondary}
							/>
							<Text style={styles.emptyStateText}>No completed fasts yet</Text>
						</View>
					) : (
						<View style={styles.card}>
							{store
								.getFastingHistory()
								.slice(0, 5)
								.map((fast: any, index) => {
									const startTime =
										fast.startTime instanceof Date
											? fast.startTime
											: new Date(fast.startTime);
									return (
										<View
											key={fast.id}
											style={[
												styles.mealLogItem,
												index ===
													Math.min(4, store.getFastingHistory().length - 1) && {
													borderBottomWidth: 0,
												},
											]}
										>
											<View style={styles.mealLogInfo}>
												<Text style={styles.mealLogTitle}>
													{(
														fast.type ||
														fast.fastingType ||
														"Custom"
													).toUpperCase()}{" "}
													Fast
												</Text>
												<Text style={styles.mealLogSubtitle}>
													{startTime.toLocaleDateString()}
												</Text>
											</View>
											<Text style={styles.mealLogCalories}>
												{(
													fast.actualDuration ||
													fast.plannedDuration ||
													0
												).toFixed(1)}
												h
											</Text>
										</View>
									);
								})}
						</View>
					)}
				</>
			)}

			{/* Fasting Benefits */}
			<View style={[styles.card, { marginTop: 16 }]}>
				<Text style={styles.cardTitle}>✨ Benefits of Fasting</Text>
				<Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
					• Improved insulin sensitivity{"\n"}• Enhanced autophagy (cell
					cleanup){"\n"}• Mental clarity and focus{"\n"}• Weight management
					{"\n"}• Reduced inflammation
				</Text>
			</View>
		</ScrollView>
	);

	const renderInsightsTab = () => (
		<ScrollView showsVerticalScrollIndicator={false}>
			{/* Weekly Summary */}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>📊 Weekly Average</Text>
				<View style={styles.macroRow}>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>
							{store.getWeeklyAverages().totalCalories}
						</Text>
						<Text style={styles.macroLabel}>Calories/day</Text>
					</View>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>
							{store.getWeeklyAverages().totalProtein}g
						</Text>
						<Text style={styles.macroLabel}>Protein</Text>
					</View>
					<View style={styles.macroItem}>
						<Text style={styles.macroValue}>
							{(store.getWeeklyAverages().totalWater / 1000).toFixed(1)}L
						</Text>
						<Text style={styles.macroLabel}>Water</Text>
					</View>
				</View>
			</View>

			{/* Macro Breakdown */}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>🥧 Today's Macro Split</Text>
				<View style={styles.macroRow}>
					<View style={styles.macroItem}>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: "#4CAF50",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text style={{ color: "#FFF", fontWeight: "700" }}>
								{macroBreakdown.protein}%
							</Text>
						</View>
						<Text style={styles.macroLabel}>Protein</Text>
					</View>
					<View style={styles.macroItem}>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: "#2196F3",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text style={{ color: "#FFF", fontWeight: "700" }}>
								{macroBreakdown.carbs}%
							</Text>
						</View>
						<Text style={styles.macroLabel}>Carbs</Text>
					</View>
					<View style={styles.macroItem}>
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 25,
								backgroundColor: "#FF9800",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text style={{ color: "#FFF", fontWeight: "700" }}>
								{macroBreakdown.fat}%
							</Text>
						</View>
						<Text style={styles.macroLabel}>Fat</Text>
					</View>
				</View>
			</View>

			{/* Insights */}
			<Text style={styles.sectionTitle}>💡 Insights & Tips</Text>
			{insights.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="bulb-outline" size={48} color={theme.textSecondary} />
					<Text style={styles.emptyStateText}>
						Log more meals for personalized insights
					</Text>
				</View>
			) : (
				insights.map((insight, index) => (
					<View key={index} style={styles.insightCard}>
						<View
							style={[
								styles.insightIcon,
								{
									backgroundColor:
										insight.type === "success"
											? "#4CAF50"
											: insight.type === "warning"
											? "#FF9800"
											: insight.type === "tip"
											? "#9C27B0"
											: "#2196F3",
								},
							]}
						>
							<Ionicons
								name={
									(insight.icon as any) ||
									(insight.type === "success"
										? "checkmark"
										: insight.type === "warning"
										? "alert"
										: "bulb")
								}
								size={20}
								color="#FFF"
							/>
						</View>
						<View style={styles.insightContent}>
							<Text style={styles.insightTitle}>{insight.title}</Text>
							<Text style={styles.insightMessage}>{insight.message}</Text>
						</View>
					</View>
				))
			)}
		</ScrollView>
	);

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

					<ScrollView style={styles.modalBody}>
						{/* Stool Type Selection */}
						<Text style={styles.sectionTitle}>Stool Type (Bristol Scale)</Text>
						<View style={styles.stoolTypeGrid}>
							{([1, 2, 3, 4, 5, 6, 7] as BristolStoolType[]).map((type) => (
								<TouchableOpacity
									key={type}
									style={[
										styles.stoolTypeItem,
										selectedStoolType === type && styles.stoolTypeSelected,
									]}
									onPress={() => setSelectedStoolType(type)}
								>
									<Text style={{ fontSize: 24 }}>
										{type <= 2 ? "🔴" : type <= 4 ? "🟢" : "🟡"}
									</Text>
									<Text style={styles.stoolTypeText}>Type {type}</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Symptoms */}
						<Text style={styles.sectionTitle}>Symptoms</Text>
						<View style={{ flexDirection: "row", flexWrap: "wrap" }}>
							{GUT_SYMPTOMS.map((symptom) => (
								<TouchableOpacity
									key={symptom.id}
									style={[
										styles.symptomChip,
										selectedSymptoms.includes(symptom.id) &&
											styles.symptomChipSelected,
									]}
									onPress={() => {
										if (selectedSymptoms.includes(symptom.id)) {
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
										color={
											selectedSymptoms.includes(symptom.id)
												? theme.primary
												: theme.textSecondary
										}
									/>
									<Text style={styles.symptomChipText}>{symptom.label}</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Digestion Rating */}
						<Text style={styles.sectionTitle}>Digestion Rating</Text>
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

						{/* Energy Level */}
						<Text style={styles.sectionTitle}>Energy Level</Text>
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

						{/* Notes */}
						<TextInput
							style={[styles.searchInput, { marginTop: 16 }]}
							placeholder="Additional notes..."
							placeholderTextColor={theme.textSecondary}
							value={gutNotes}
							onChangeText={setGutNotes}
							multiline
						/>

						{/* Log Button */}
						<TouchableOpacity
							style={styles.addButton}
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
		<SafeAreaView style={styles.container} edges={["left", "right"]}>
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
				{activeSubTab === "gut" && renderGutHealthTab()}
				{activeSubTab === "fasting" && renderFastingTab()}
				{activeSubTab === "insights" && renderInsightsTab()}
			</View>

			{/* Modals */}
			{renderAddMealModal()}
			{renderGutHealthModal()}
		</SafeAreaView>
	);
}
