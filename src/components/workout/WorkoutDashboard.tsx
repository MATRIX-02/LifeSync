// Workout Dashboard - Quick overview and start workout

import { Alert } from "@/src/components/CustomAlert";
import { LoadingState } from "@/src/components/LoadingState";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useAuthStore } from "@/src/context/authStore";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import { CustomExercise } from "@/src/context/workoutStoreDB/types";
import {
	EXERCISE_DATABASE,
	MUSCLE_GROUP_INFO,
} from "@/src/data/exerciseDatabase";
import { useModuleRefresh } from "@/src/hooks/useModuleRefresh";
import { Exercise, MuscleGroup } from "@/src/types/workout";
import { generateUUID } from "@/src/utils/uuid";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
	Dimensions,
	FlatList,
	Modal,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import { createStyles } from "./WorkoutDashboard.styles";

const { width } = Dimensions.get("window");

interface WorkoutDashboardProps {
	theme: Theme;
	onStartWorkout?: () => void;
	onNavigateToTab?: (
		tab: "dashboard" | "statistics" | "plans" | "history",
	) => void;
	subscriptionCheck?: SubscriptionCheckResult;
}

export default function WorkoutDashboard({
	theme,
	onStartWorkout,
	onNavigateToTab,
	subscriptionCheck,
}: WorkoutDashboardProps) {
	const router = useRouter();
	const { profile } = useAuthStore();
	const {
		getWorkoutStats,
		getRecentWorkouts,
		getActivePlan,
		workoutPlans,
		currentSession,
		startWorkout,
		bodyWeights,
		logBodyWeight,
		customExercises,
		addCustomExercise,
		fitnessProfile,
		isLoading,
	} = useWorkoutStore();

	// Modal states
	const [showExerciseBrowser, setShowExerciseBrowser] = useState(false);
	const [showRestTimer, setShowRestTimer] = useState(false);
	const [showWeightLogger, setShowWeightLogger] = useState(false);
	const [showCreateExercise, setShowCreateExercise] = useState(false);
	const [detailExercise, setDetailExercise] = useState<
		Exercise | CustomExercise | null
	>(null);

	// Exercise browser state
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
		"all",
	);
	const [selectedCategory, setSelectedCategory] = useState<
		| "all"
		| "strength"
		| "cardio"
		| "flexibility"
		| "hiit"
		| "calisthenics"
		| "plyometrics"
	>("all");
	const [exerciseSearch, setExerciseSearch] = useState("");

	// Custom exercise form state
	const [customExerciseName, setCustomExerciseName] = useState("");
	const [customExerciseMuscles, setCustomExerciseMuscles] = useState<
		MuscleGroup[]
	>([]);
	const [customExerciseDescription, setCustomExerciseDescription] =
		useState("");
	const [customExerciseCategory, setCustomExerciseCategory] = useState<
		| "strength"
		| "cardio"
		| "flexibility"
		| "hiit"
		| "calisthenics"
		| "plyometrics"
	>("strength");

	// Rest timer state
	const [restTime, setRestTime] = useState(90);
	const [restRemaining, setRestRemaining] = useState<number | null>(null);
	const [isRestRunning, setIsRestRunning] = useState(false);

	// Weight logger state
	const [newWeight, setNewWeight] = useState("");
	// Seeded from the fitness profile; the toggle below still lets the user
	// log a one-off entry in the other unit.
	const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(
		fitnessProfile?.weightUnit || "kg",
	);

	const stats = getWorkoutStats();
	const recentWorkouts = getRecentWorkouts(3);
	const activePlan = getActivePlan();
	const styles = createStyles(theme);
	const { refreshing, onRefresh } = useModuleRefresh("workout");

	// (2) Show this week against the user's own weekly target when they have one.
	const weeklyGoal = fitnessProfile?.weeklyWorkoutGoal || 0;
	const weeklyGoalMet = weeklyGoal > 0 && stats.workoutsThisWeek >= weeklyGoal;

	const quickStats = [
		{
			label: weeklyGoal > 0 ? "Weekly Goal" : "This Week",
			value:
				weeklyGoal > 0
					? `${stats.workoutsThisWeek}/${weeklyGoal}`
					: stats.workoutsThisWeek,
			icon: weeklyGoalMet ? "checkmark-circle" : "calendar",
			color: weeklyGoalMet ? theme.success : theme.primary,
		},
		{
			label: "Streak",
			value: `${stats.currentStreak}`,
			icon: "flame",
			color: theme.warning,
		},
		{
			label: "Total",
			value: stats.totalWorkouts,
			icon: "barbell",
			color: theme.success,
		},
		{
			label: "Avg Time",
			value: `${stats.averageWorkoutDuration}m`,
			icon: "time",
			color: theme.accent,
		},
	];

	const handleStartWorkout = (planId?: string, planName?: string) => {
		// Prevent starting a new workout if one is already active
		if (currentSession) {
			// Just open the active workout screen
			if (onStartWorkout) {
				onStartWorkout();
			}
			return;
		}
		startWorkout(planId, planName);
		// Open active workout screen
		if (onStartWorkout) {
			onStartWorkout();
		}
	};

	const handleQuickWorkout = () => {
		handleStartWorkout(undefined, "Quick Workout");
	};

	const handleBrowseExercises = () => {
		setShowExerciseBrowser(true);
	};

	const handleRestTimer = () => {
		setShowRestTimer(true);
	};

	const handleLogWeight = () => {
		setShowWeightLogger(true);
	};

	const handleSeeAllPlans = () => {
		if (onNavigateToTab) {
			onNavigateToTab("plans");
		}
	};

	const handleSeeAllHistory = () => {
		if (onNavigateToTab) {
			onNavigateToTab("history");
		}
	};

	// Rest timer effect
	useEffect(() => {
		if (!isRestRunning || restRemaining === null || restRemaining <= 0) {
			if (restRemaining === 0) {
				setIsRestRunning(false);
				Alert.alert("Rest Complete! 💪", "Time to get back to work!");
			}
			return;
		}

		const timer = setInterval(() => {
			setRestRemaining((prev) => (prev && prev > 0 ? prev - 1 : 0));
		}, 1000);

		return () => clearInterval(timer);
	}, [isRestRunning, restRemaining]);

	const startRestTimer = () => {
		setRestRemaining(restTime);
		setIsRestRunning(true);
	};

	const stopRestTimer = () => {
		setIsRestRunning(false);
		setRestRemaining(null);
	};

	const formatRestTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Get filtered exercises (including custom)
	const getFilteredExercises = useCallback(() => {
		const allExercises = [...EXERCISE_DATABASE, ...(customExercises || [])];
		let exercises =
			selectedMuscle === "all"
				? allExercises
				: allExercises.filter(
						(ex) =>
							ex.primaryMuscles.includes(selectedMuscle) ||
							ex.secondaryMuscles?.includes(selectedMuscle),
					);

		// Filter by category
		if (selectedCategory !== "all") {
			exercises = exercises.filter((ex) => ex.category === selectedCategory);
		}

		if (exerciseSearch.trim()) {
			const query = exerciseSearch.toLowerCase();
			exercises = exercises.filter(
				(ex) =>
					ex.name.toLowerCase().includes(query) ||
					ex.primaryMuscles.some((m) => m.toLowerCase().includes(query)),
			);
		}
		return exercises;
	}, [selectedMuscle, selectedCategory, exerciseSearch, customExercises]);

	const handleSaveWeight = () => {
		const weight = parseFloat(newWeight);
		if (isNaN(weight) || weight <= 0) {
			Alert.alert("Invalid Weight", "Please enter a valid weight value.");
			return;
		}

		logBodyWeight(weight, weightUnit);
		setNewWeight("");
		setShowWeightLogger(false);
		Alert.alert(
			"Weight Logged! 📊",
			`${weight} ${weightUnit} has been recorded.`,
		);
	};

	const handleCreateExercise = () => {
		if (!customExerciseName.trim()) {
			Alert.alert("Error", "Please enter an exercise name.");
			return;
		}
		if (customExerciseMuscles.length === 0) {
			Alert.alert("Error", "Please select at least one target muscle.");
			return;
		}

		// Every key here becomes a column in the PostgREST payload, and one
		// unknown key rejects the whole insert. `muscleGroup` and `isCompound`
		// were not columns, and custom_exercises.id is a uuid - so this write
		// could never have succeeded.
		const newExercise: Exercise = {
			id: generateUUID(),
			name: customExerciseName.trim(),
			category: customExerciseCategory,
			primaryMuscles: customExerciseMuscles,
			secondaryMuscles: [],
			targetMuscles: customExerciseMuscles,
			equipment: [],
			difficulty: "intermediate",
			description: customExerciseDescription.trim() || "Custom exercise",
			instructions: [],
			isCustom: true,
		};

		addCustomExercise(newExercise);
		setCustomExerciseName("");
		setCustomExerciseMuscles([]);
		setCustomExerciseDescription("");
		setCustomExerciseCategory("strength");
		setShowCreateExercise(false);
		Alert.alert(
			"Success! 💪",
			`${newExercise.name} has been added to your exercises.`,
		);
	};

	const toggleCustomMuscle = (muscle: MuscleGroup) => {
		if (customExerciseMuscles.includes(muscle)) {
			setCustomExerciseMuscles(
				customExerciseMuscles.filter((m) => m !== muscle),
			);
		} else {
			setCustomExerciseMuscles([...customExerciseMuscles, muscle]);
		}
	};

	// Get recent body weights
	const recentWeights = bodyWeights?.slice(-7).reverse() || [];

	// First load only: a refresh keeps the existing content on screen.
	if (isLoading && workoutPlans.length === 0 && recentWorkouts.length === 0) {
		return <LoadingState label="Loading your workouts…" />;
	}

	return (
		<ScrollView
			style={styles.container}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor={theme.primary}
					colors={[theme.primary]}
				/>
			}
		>
			{/* Greeting */}
			<View style={styles.greetingSection}>
				<Text style={styles.greeting}>
					Hello, {profile?.full_name?.split(" ")[0] || "Athlete"}! 💪
				</Text>
				<Text style={styles.subGreeting}>
					{currentSession
						? "You have an active workout!"
						: "Ready to crush your goals today?"}
				</Text>
			</View>

			{/* Quick Stats */}
			<View style={styles.statsGrid}>
				{quickStats.map((stat, index) => (
					<View key={index} style={styles.statCard}>
						<View
							style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}
						>
							<Ionicons name={stat.icon as any} size={18} color={stat.color} />
						</View>
						<Text
							style={styles.statValue}
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							{stat.value}
						</Text>
						<Text
							style={styles.statLabel}
							numberOfLines={2}
							adjustsFontSizeToFit
						>
							{stat.label}
						</Text>
					</View>
				))}
			</View>

			{/* Active Workout Banner */}
			{currentSession && (
				<TouchableOpacity
					style={styles.activeWorkoutBanner}
					onPress={onStartWorkout}
				>
					<View style={styles.activePulse} />
					<View style={styles.activeWorkoutContent}>
						<Text style={styles.activeWorkoutTitle}>Workout In Progress</Text>
						<Text style={styles.activeWorkoutSubtitle}>
							{currentSession.name} • {currentSession.exercises.length}{" "}
							exercises
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
				</TouchableOpacity>
			)}

			{/* Quick Start Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Quick Start</Text>
				<View style={styles.quickStartGrid}>
					<TouchableOpacity
						style={[styles.quickStartCard, { backgroundColor: theme.success }]}
						onPress={handleQuickWorkout}
					>
						<Ionicons name="flash" size={32} color="#FFFFFF" />
						<Text style={styles.quickStartText}>Quick Workout</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.quickStartCard, { backgroundColor: theme.primary }]}
						onPress={handleBrowseExercises}
					>
						<Ionicons name="search" size={32} color="#FFFFFF" />
						<Text style={styles.quickStartText}>Browse Exercises</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.quickStartCard, { backgroundColor: theme.warning }]}
						onPress={handleRestTimer}
					>
						<Ionicons name="stopwatch" size={32} color="#FFFFFF" />
						<Text style={styles.quickStartText}>Rest Timer</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.quickStartCard, { backgroundColor: theme.accent }]}
						onPress={handleLogWeight}
					>
						<Ionicons name="body" size={32} color="#FFFFFF" />
						<Text style={styles.quickStartText}>Log Weight</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Active Plan */}
			{activePlan && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Active Plan</Text>
					<TouchableOpacity style={styles.activePlanCard}>
						<View
							style={[
								styles.planIcon,
								{ backgroundColor: activePlan.color + "20" },
							]}
						>
							<Ionicons
								name={activePlan.icon as any}
								size={24}
								color={activePlan.color}
							/>
						</View>
						<View style={styles.planContent}>
							<Text style={styles.planName}>{activePlan.name}</Text>
							<Text style={styles.planMeta}>
								{activePlan.exercises.length} exercises •{" "}
								{activePlan.estimatedDuration} min
							</Text>
						</View>
						<TouchableOpacity
							style={styles.startPlanButton}
							onPress={() => handleStartWorkout(activePlan.id, activePlan.name)}
						>
							<Ionicons name="play" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					</TouchableOpacity>
				</View>
			)}

			{/* My Workout Plans */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>My Workout Plans</Text>
					<TouchableOpacity onPress={handleSeeAllPlans}>
						<Text style={styles.seeAll}>See All</Text>
					</TouchableOpacity>
				</View>

				{workoutPlans.length === 0 ? (
					<TouchableOpacity
						style={styles.emptyCard}
						onPress={handleSeeAllPlans}
					>
						<Ionicons
							name="add-circle-outline"
							size={40}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyText}>Create Your First Plan</Text>
						<Text style={styles.emptySubtext}>
							Design custom workout routines
						</Text>
					</TouchableOpacity>
				) : (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.plansScroll}
					>
						{workoutPlans.slice(0, 5).map((plan) => (
							<TouchableOpacity
								key={plan.id}
								style={[styles.planCard, { borderLeftColor: plan.color }]}
								onPress={() => handleStartWorkout(plan.id, plan.name)}
							>
								<View style={styles.planCardHeader}>
									<View
										style={[
											styles.planCardIcon,
											{ backgroundColor: plan.color + "20" },
										]}
									>
										<Ionicons
											name={plan.icon as any}
											size={18}
											color={plan.color}
										/>
									</View>
									<Text style={styles.planCardDuration}>
										{plan.estimatedDuration}m
									</Text>
								</View>
								<Text style={styles.planCardName} numberOfLines={1}>
									{plan.name}
								</Text>
								<Text style={styles.planCardExercises}>
									{plan.exercises.length} exercises
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				)}
			</View>

			{/* Recent Activity */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Recent Activity</Text>
					<TouchableOpacity onPress={handleSeeAllHistory}>
						<Text style={styles.seeAll}>View All</Text>
					</TouchableOpacity>
				</View>

				{recentWorkouts.length === 0 ? (
					<View style={styles.emptyRecentCard}>
						<Ionicons
							name="barbell-outline"
							size={32}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyRecentText}>No workouts yet</Text>
						<Text style={styles.emptyRecentSubtext}>
							Start a workout to see your history
						</Text>
					</View>
				) : (
					recentWorkouts.map((workout) => (
						<TouchableOpacity key={workout.id} style={styles.recentCard}>
							<View style={styles.recentIcon}>
								<Ionicons name="barbell" size={20} color={theme.primary} />
							</View>
							<View style={styles.recentContent}>
								<Text style={styles.recentName}>{workout.name}</Text>
								<Text style={styles.recentMeta}>
									{new Date(workout.date).toLocaleDateString()} •{" "}
									{workout.duration} min • {workout.exercises.length} exercises
								</Text>
							</View>
							<View style={styles.recentVolume}>
								<Text style={styles.recentVolumeValue}>
									{Math.round(workout.totalVolume / 1000)}k
								</Text>
								<Text style={styles.recentVolumeLabel}>
									{fitnessProfile?.weightUnit || "kg"}
								</Text>
							</View>
						</TouchableOpacity>
					))
				)}
			</View>

			{/* Motivational Tips */}
			<View style={styles.tipCard}>
				<Ionicons name="bulb" size={24} color={theme.warning} />
				<View style={styles.tipContent}>
					<Text style={styles.tipTitle}>Pro Tip</Text>
					<Text style={styles.tipText}>
						Progressive overload is key! Try to increase weight or reps each
						week for consistent gains.
					</Text>
				</View>
			</View>

			<View style={{ height: 40 }} />

			{/* Exercise Browser Modal */}
			<Modal
				visible={showExerciseBrowser}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<SafeAreaView style={styles.exerciseBrowserContainer}>
					{/* Header with gradient feel */}
					<View style={styles.exerciseBrowserHeader}>
						<View style={styles.exerciseBrowserHeaderTop}>
							<TouchableOpacity
								style={styles.exerciseBrowserCloseBtn}
								onPress={() => setShowExerciseBrowser(false)}
							>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
							<Text style={styles.exerciseBrowserTitle}>Exercise Library</Text>
							<TouchableOpacity
								style={styles.exerciseBrowserCreateBtn}
								onPress={() => setShowCreateExercise(true)}
							>
								<Ionicons name="add-circle" size={28} color={theme.primary} />
							</TouchableOpacity>
						</View>

						{/* Search Bar */}
						<View style={styles.exerciseSearchBar}>
							<Ionicons name="search" size={20} color={theme.textMuted} />
							<TextInput
								style={styles.exerciseSearchInput}
								placeholder="Search by name or muscle..."
								placeholderTextColor={theme.textMuted}
								value={exerciseSearch}
								onChangeText={setExerciseSearch}
							/>
							{exerciseSearch.length > 0 && (
								<TouchableOpacity onPress={() => setExerciseSearch("")}>
									<Ionicons
										name="close-circle"
										size={20}
										color={theme.textMuted}
									/>
								</TouchableOpacity>
							)}
						</View>

						{/* Muscle Group Filter */}
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.muscleGroupFilter}
							contentContainerStyle={styles.muscleGroupFilterContent}
						>
							<TouchableOpacity
								style={[
									styles.muscleGroupChip,
									selectedMuscle === "all" && styles.muscleGroupChipActive,
								]}
								onPress={() => setSelectedMuscle("all")}
							>
								<Ionicons
									name="body"
									size={16}
									color={selectedMuscle === "all" ? "#FFFFFF" : theme.primary}
								/>
								<Text
									style={[
										styles.muscleGroupChipText,
										selectedMuscle === "all" &&
											styles.muscleGroupChipTextActive,
									]}
								>
									All
								</Text>
							</TouchableOpacity>
							{Object.keys(MUSCLE_GROUP_INFO).map((muscle) => {
								const isActive = selectedMuscle === muscle;
								const info = MUSCLE_GROUP_INFO[muscle as MuscleGroup];
								return (
									<TouchableOpacity
										key={muscle}
										style={[
											styles.muscleGroupChip,
											isActive && styles.muscleGroupChipActive,
										]}
										onPress={() => setSelectedMuscle(muscle as MuscleGroup)}
									>
										<Text
											style={[
												styles.muscleGroupChipText,
												isActive && styles.muscleGroupChipTextActive,
											]}
										>
											{info.name}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>

						{/* Category Filter */}
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.categoryFilter}
							contentContainerStyle={styles.categoryFilterContent}
						>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "all" && styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("all")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "all" && styles.categoryChipTextActive,
									]}
								>
									All Types
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "strength" && styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("strength")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "strength" &&
											styles.categoryChipTextActive,
									]}
								>
									💪 Strength
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "cardio" && styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("cardio")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "cardio" &&
											styles.categoryChipTextActive,
									]}
								>
									🏃 Cardio
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "flexibility" &&
										styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("flexibility")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "flexibility" &&
											styles.categoryChipTextActive,
									]}
								>
									🧘 Yoga
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "hiit" && styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("hiit")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "hiit" &&
											styles.categoryChipTextActive,
									]}
								>
									⚡ HIIT
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "calisthenics" &&
										styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("calisthenics")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "calisthenics" &&
											styles.categoryChipTextActive,
									]}
								>
									🤸 Calisthenics
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.categoryChip,
									selectedCategory === "plyometrics" &&
										styles.categoryChipActive,
								]}
								onPress={() => setSelectedCategory("plyometrics")}
							>
								<Text
									style={[
										styles.categoryChipText,
										selectedCategory === "plyometrics" &&
											styles.categoryChipTextActive,
									]}
								>
									🚀 Plyometrics
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>

					{/* Results Count */}
					<View style={styles.exerciseResultsHeader}>
						<Text style={styles.exerciseResultsCount}>
							{getFilteredExercises().length} exercises
						</Text>
					</View>

					{/* Exercise List */}
					<FlatList
						data={getFilteredExercises()}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => {
							const difficultyColor =
								item.difficulty === "beginner"
									? theme.success
									: item.difficulty === "intermediate"
										? theme.warning
										: theme.error;

							return (
								<TouchableOpacity
									style={styles.exerciseCard}
									activeOpacity={0.7}
									onPress={() => setDetailExercise(item)}
								>
									{/* Exercise Icon */}
									<View
										style={[
											styles.exerciseCardIcon,
											{ backgroundColor: difficultyColor + "15" },
										]}
									>
										<Ionicons
											name="barbell"
											size={24}
											color={difficultyColor}
										/>
									</View>

									{/* Exercise Info */}
									<View style={styles.exerciseCardContent}>
										<View style={styles.exerciseCardHeader}>
											<Text style={styles.exerciseCardName} numberOfLines={1}>
												{item.name}
											</Text>
											{item.isCustom && (
												<View style={styles.exerciseCustomTag}>
													<Text style={styles.exerciseCustomTagText}>
														Custom
													</Text>
												</View>
											)}
										</View>

										{/* Muscles */}
										<View style={styles.exerciseCardMuscles}>
											{item.primaryMuscles.slice(0, 3).map((muscle, idx) => (
												<View key={idx} style={styles.exerciseMuscleTag}>
													<Text style={styles.exerciseMuscleTagText}>
														{muscle}
													</Text>
												</View>
											))}
											{item.primaryMuscles.length > 3 && (
												<Text style={styles.exerciseMoreMuscles}>
													+{item.primaryMuscles.length - 3}
												</Text>
											)}
										</View>

										{/* Bottom row */}
										<View style={styles.exerciseCardFooter}>
											<View style={styles.exerciseCardMeta}>
												<View
													style={[
														styles.exerciseDifficultyDot,
														{ backgroundColor: difficultyColor },
													]}
												/>
												<Text style={styles.exerciseDifficultyLabel}>
													{item.difficulty}
												</Text>
											</View>
											{item.equipment && item.equipment.length > 0 && (
												<View style={styles.exerciseEquipment}>
													<Ionicons
														name="fitness"
														size={12}
														color={theme.textMuted}
													/>
													<Text style={styles.exerciseEquipmentText}>
														{item.equipment[0]}
													</Text>
												</View>
											)}
										</View>
									</View>

									{/* Chevron */}
									<Ionicons
										name="chevron-forward"
										size={20}
										color={theme.textMuted}
									/>
								</TouchableOpacity>
							);
						}}
						contentContainerStyle={styles.exerciseListContent}
						ListEmptyComponent={
							<View style={styles.exerciseEmptyState}>
								<View style={styles.exerciseEmptyIcon}>
									<Ionicons
										name="search-outline"
										size={48}
										color={theme.textMuted}
									/>
								</View>
								<Text style={styles.exerciseEmptyTitle}>
									No exercises found
								</Text>
								<Text style={styles.exerciseEmptySubtitle}>
									Try a different search term or filter
								</Text>
								<TouchableOpacity
									style={styles.exerciseEmptyButton}
									onPress={() => {
										setExerciseSearch("");
										setSelectedMuscle("all");
									}}
								>
									<Text style={styles.exerciseEmptyButtonText}>
										Clear filters
									</Text>
								</TouchableOpacity>
							</View>
						}
						ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
						showsVerticalScrollIndicator={false}
					/>

					<ExerciseDetailSheet
						exercise={detailExercise}
						theme={theme}
						onClose={() => setDetailExercise(null)}
					/>
				</SafeAreaView>
			</Modal>

			{/* Create Exercise Modal */}
			<Modal
				visible={showCreateExercise}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<SafeAreaView style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<TouchableOpacity onPress={() => setShowCreateExercise(false)}>
							<Ionicons name="arrow-back" size={24} color={theme.text} />
						</TouchableOpacity>
						<Text style={styles.modalTitle}>Create Exercise</Text>
						<TouchableOpacity onPress={handleCreateExercise}>
							<Text style={styles.saveButtonText}>Save</Text>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.createExerciseForm}>
						{/* Exercise Name */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Exercise Name *</Text>
							<TextInput
								style={styles.formInput}
								placeholder="e.g., Cable Crossover"
								placeholderTextColor={theme.textMuted}
								value={customExerciseName}
								onChangeText={setCustomExerciseName}
							/>
						</View>

						{/* Category */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Category *</Text>
							<View style={styles.categorySelector}>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "strength" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("strength")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "strength" &&
												styles.categorySelectorTextActive,
										]}
									>
										💪 Strength
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "cardio" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("cardio")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "cardio" &&
												styles.categorySelectorTextActive,
										]}
									>
										🏃 Cardio
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "flexibility" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("flexibility")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "flexibility" &&
												styles.categorySelectorTextActive,
										]}
									>
										🧘 Yoga
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "hiit" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("hiit")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "hiit" &&
												styles.categorySelectorTextActive,
										]}
									>
										⚡ HIIT
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "calisthenics" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("calisthenics")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "calisthenics" &&
												styles.categorySelectorTextActive,
										]}
									>
										🤸 Calisthenics
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.categorySelectorChip,
										customExerciseCategory === "plyometrics" &&
											styles.categorySelectorChipActive,
									]}
									onPress={() => setCustomExerciseCategory("plyometrics")}
								>
									<Text
										style={[
											styles.categorySelectorText,
											customExerciseCategory === "plyometrics" &&
												styles.categorySelectorTextActive,
										]}
									>
										🚀 Plyometrics
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Target Muscles */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Target Muscles *</Text>
							<View style={styles.muscleSelector}>
								{Object.keys(MUSCLE_GROUP_INFO).map((muscle) => (
									<TouchableOpacity
										key={muscle}
										style={[
											styles.muscleSelectorChip,
											customExerciseMuscles.includes(muscle as MuscleGroup) &&
												styles.muscleSelectorChipActive,
										]}
										onPress={() => toggleCustomMuscle(muscle as MuscleGroup)}
									>
										<Text
											style={[
												styles.muscleSelectorText,
												customExerciseMuscles.includes(muscle as MuscleGroup) &&
													styles.muscleSelectorTextActive,
											]}
										>
											{MUSCLE_GROUP_INFO[muscle as MuscleGroup].name}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Description */}
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Description (Optional)</Text>
							<TextInput
								style={[styles.formInput, styles.formInputMultiline]}
								placeholder="Describe how to perform this exercise..."
								placeholderTextColor={theme.textMuted}
								value={customExerciseDescription}
								onChangeText={setCustomExerciseDescription}
								multiline
								numberOfLines={4}
							/>
						</View>
					</ScrollView>
				</SafeAreaView>
			</Modal>

			{/* Rest Timer Modal */}
			<Modal visible={showRestTimer} animationType="fade" transparent>
				<View style={styles.timerOverlay}>
					<View style={styles.timerModal}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Rest Timer</Text>
							<TouchableOpacity
								onPress={() => {
									stopRestTimer();
									setShowRestTimer(false);
								}}
							>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{/* Timer Display */}
						<View style={styles.timerDisplay}>
							<Text style={styles.timerText}>
								{formatRestTime(restRemaining ?? restTime)}
							</Text>
							{isRestRunning && (
								<Text style={styles.timerLabel}>remaining</Text>
							)}
						</View>

						{/* Preset Times */}
						{!isRestRunning && (
							<View style={styles.presetTimes}>
								{[30, 60, 90, 120, 180].map((time) => (
									<TouchableOpacity
										key={time}
										style={[
											styles.presetButton,
											restTime === time && styles.presetButtonActive,
										]}
										onPress={() => setRestTime(time)}
									>
										<Text
											style={[
												styles.presetText,
												restTime === time && styles.presetTextActive,
											]}
										>
											{time < 60 ? `${time}s` : `${time / 60}m`}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						)}

						{/* Controls */}
						<View style={styles.timerControls}>
							{!isRestRunning ? (
								<TouchableOpacity
									style={styles.startTimerButton}
									onPress={startRestTimer}
								>
									<Ionicons name="play" size={28} color="#FFFFFF" />
									<Text style={styles.startTimerText}>Start</Text>
								</TouchableOpacity>
							) : (
								<TouchableOpacity
									style={[
										styles.startTimerButton,
										{ backgroundColor: theme.error },
									]}
									onPress={stopRestTimer}
								>
									<Ionicons name="stop" size={28} color="#FFFFFF" />
									<Text style={styles.startTimerText}>Stop</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			</Modal>

			{/* Weight Logger Modal */}
			<Modal
				visible={showWeightLogger}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<SafeAreaView style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Log Body Weight</Text>
						<TouchableOpacity onPress={() => setShowWeightLogger(false)}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					{/* Weight Input */}
					<View style={styles.weightInputSection}>
						<View style={styles.weightInputRow}>
							<TextInput
								style={styles.weightInput}
								value={newWeight}
								onChangeText={setNewWeight}
								keyboardType="decimal-pad"
								placeholder="0.0"
								placeholderTextColor={theme.textMuted}
							/>
							<View style={styles.unitToggle}>
								<TouchableOpacity
									style={[
										styles.unitButton,
										weightUnit === "kg" && styles.unitButtonActive,
									]}
									onPress={() => setWeightUnit("kg")}
								>
									<Text
										style={[
											styles.unitText,
											weightUnit === "kg" && styles.unitTextActive,
										]}
									>
										kg
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.unitButton,
										weightUnit === "lbs" && styles.unitButtonActive,
									]}
									onPress={() => setWeightUnit("lbs")}
								>
									<Text
										style={[
											styles.unitText,
											weightUnit === "lbs" && styles.unitTextActive,
										]}
									>
										lbs
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						<TouchableOpacity
							style={styles.saveWeightButton}
							onPress={handleSaveWeight}
						>
							<Text style={styles.saveWeightText}>Log Weight</Text>
						</TouchableOpacity>
					</View>

					{/* Recent Weights */}
					<View style={styles.recentWeightsSection}>
						<Text style={styles.recentWeightsTitle}>Recent Entries</Text>
						{recentWeights.length === 0 ? (
							<View style={styles.emptyWeights}>
								<Ionicons
									name="scale-outline"
									size={40}
									color={theme.textMuted}
								/>
								<Text style={styles.emptyWeightsText}>
									No weight entries yet
								</Text>
							</View>
						) : (
							recentWeights.map((entry, index) => (
								<View key={index} style={styles.weightEntry}>
									<Text style={styles.weightEntryDate}>
										{new Date(entry.date).toLocaleDateString()}
									</Text>
									<Text style={styles.weightEntryValue}>
										{entry.weight} {entry.unit}
									</Text>
								</View>
							))
						)}
					</View>
				</SafeAreaView>
			</Modal>
		</ScrollView>
	);
}
