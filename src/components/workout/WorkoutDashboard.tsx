// Workout Dashboard - Quick overview and start workout

import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	Alert,
	Modal,
	TextInput,
	FlatList,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { useHabitStore } from "@/src/context/habitStore";
import {
	EXERCISE_DATABASE,
	getExercisesByMuscle,
	MUSCLE_GROUP_INFO,
} from "@/src/data/exerciseDatabase";
import { MuscleGroup, Exercise, BodyWeight } from "@/src/types/workout";

const { width } = Dimensions.get("window");

interface WorkoutDashboardProps {
	theme: Theme;
	onStartWorkout?: () => void;
	onNavigateToTab?: (
		tab: "dashboard" | "statistics" | "plans" | "history"
	) => void;
}

export default function WorkoutDashboard({
	theme,
	onStartWorkout,
	onNavigateToTab,
}: WorkoutDashboardProps) {
	const router = useRouter();
	const { profile } = useHabitStore();
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
	} = useWorkoutStore();

	// Modal states
	const [showExerciseBrowser, setShowExerciseBrowser] = useState(false);
	const [showRestTimer, setShowRestTimer] = useState(false);
	const [showWeightLogger, setShowWeightLogger] = useState(false);
	const [showCreateExercise, setShowCreateExercise] = useState(false);

	// Exercise browser state
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
		"all"
	);
	const [exerciseSearch, setExerciseSearch] = useState("");

	// Custom exercise form state
	const [customExerciseName, setCustomExerciseName] = useState("");
	const [customExerciseMuscles, setCustomExerciseMuscles] = useState<
		MuscleGroup[]
	>([]);
	const [customExerciseDescription, setCustomExerciseDescription] =
		useState("");

	// Rest timer state
	const [restTime, setRestTime] = useState(90);
	const [restRemaining, setRestRemaining] = useState<number | null>(null);
	const [isRestRunning, setIsRestRunning] = useState(false);

	// Weight logger state
	const [newWeight, setNewWeight] = useState("");
	const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

	const stats = getWorkoutStats();
	const recentWorkouts = getRecentWorkouts(3);
	const activePlan = getActivePlan();
	const styles = createStyles(theme);

	const quickStats = [
		{
			label: "This Week",
			value: stats.workoutsThisWeek,
			icon: "calendar",
			color: theme.primary,
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
							ex.secondaryMuscles?.includes(selectedMuscle)
				  );

		if (exerciseSearch.trim()) {
			const query = exerciseSearch.toLowerCase();
			exercises = exercises.filter(
				(ex) =>
					ex.name.toLowerCase().includes(query) ||
					ex.primaryMuscles.some((m) => m.toLowerCase().includes(query))
			);
		}
		return exercises;
	}, [selectedMuscle, exerciseSearch, customExercises]);

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
			`${weight} ${weightUnit} has been recorded.`
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

		const newExercise: Exercise = {
			id: `custom_${Date.now()}`,
			name: customExerciseName.trim(),
			category: "strength",
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
		setShowCreateExercise(false);
		Alert.alert(
			"Success! 💪",
			`${newExercise.name} has been added to your exercises.`
		);
	};

	const toggleCustomMuscle = (muscle: MuscleGroup) => {
		if (customExerciseMuscles.includes(muscle)) {
			setCustomExerciseMuscles(
				customExerciseMuscles.filter((m) => m !== muscle)
			);
		} else {
			setCustomExerciseMuscles([...customExerciseMuscles, muscle]);
		}
	};

	// Get recent body weights
	const recentWeights = bodyWeights?.slice(-7).reverse() || [];

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Greeting */}
			<View style={styles.greetingSection}>
				<Text style={styles.greeting}>
					Hello, {profile?.name?.split(" ")[0] || "Athlete"}! 💪
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
						<Text style={styles.statValue}>{stat.value}</Text>
						<Text style={styles.statLabel}>{stat.label}</Text>
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
						style={[styles.quickStartCard, { backgroundColor: theme.primary }]}
						onPress={handleQuickWorkout}
					>
						<Ionicons name="flash" size={32} color="#FFFFFF" />
						<Text style={styles.quickStartText}>Quick Workout</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.quickStartCard, { backgroundColor: theme.success }]}
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
					<TouchableOpacity style={styles.emptyCard}>
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
								<Text style={styles.recentVolumeLabel}>kg</Text>
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
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Browse Exercises</Text>
						<View style={styles.modalHeaderActions}>
							<TouchableOpacity
								style={styles.createExerciseBtn}
								onPress={() => setShowCreateExercise(true)}
							>
								<Ionicons name="add" size={20} color={theme.primary} />
								<Text style={styles.createExerciseBtnText}>Create</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setShowExerciseBrowser(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>
					</View>

					{/* Search */}
					<View style={styles.searchContainer}>
						<Ionicons name="search" size={20} color={theme.textMuted} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search exercises..."
							placeholderTextColor={theme.textMuted}
							value={exerciseSearch}
							onChangeText={setExerciseSearch}
						/>
					</View>

					{/* Muscle Filter */}
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.muscleFilter}
					>
						<TouchableOpacity
							style={[
								styles.muscleChip,
								selectedMuscle === "all" && styles.muscleChipActive,
							]}
							onPress={() => setSelectedMuscle("all")}
						>
							<Text
								style={[
									styles.muscleChipText,
									selectedMuscle === "all" && styles.muscleChipTextActive,
								]}
								numberOfLines={1}
							>
								All
							</Text>
						</TouchableOpacity>
						{Object.keys(MUSCLE_GROUP_INFO).map((muscle) => (
							<TouchableOpacity
								key={muscle}
								style={[
									styles.muscleChip,
									selectedMuscle === muscle && styles.muscleChipActive,
								]}
								onPress={() => setSelectedMuscle(muscle as MuscleGroup)}
							>
								<Text
									style={[
										styles.muscleChipText,
										selectedMuscle === muscle && styles.muscleChipTextActive,
									]}
									numberOfLines={1}
								>
									{MUSCLE_GROUP_INFO[muscle as MuscleGroup].name}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>

					{/* Exercise List */}
					<FlatList
						data={getFilteredExercises()}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<View style={styles.exerciseItem}>
								<View style={styles.exerciseItemLeft}>
									<View style={styles.exerciseNameRow}>
										<Text style={styles.exerciseItemName}>{item.name}</Text>
										{item.isCustom && (
											<View style={styles.customBadge}>
												<Text style={styles.customBadgeText}>Custom</Text>
											</View>
										)}
									</View>
									<Text style={styles.exerciseItemMuscles}>
										{item.primaryMuscles.join(", ")}
									</Text>
								</View>
								<View
									style={[
										styles.difficultyBadge,
										{
											backgroundColor:
												item.difficulty === "beginner"
													? theme.success + "20"
													: item.difficulty === "intermediate"
													? theme.warning + "20"
													: theme.error + "20",
										},
									]}
								>
									<Text
										style={[
											styles.difficultyText,
											{
												color:
													item.difficulty === "beginner"
														? theme.success
														: item.difficulty === "intermediate"
														? theme.warning
														: theme.error,
											},
										]}
									>
										{item.difficulty}
									</Text>
								</View>
							</View>
						)}
						contentContainerStyle={styles.exerciseList}
						ListEmptyComponent={
							<View style={styles.emptyList}>
								<Text style={styles.emptyListText}>No exercises found</Text>
							</View>
						}
					/>
				</View>
			</Modal>

			{/* Create Exercise Modal */}
			<Modal
				visible={showCreateExercise}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<View style={styles.modalContainer}>
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
				</View>
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
				<View style={styles.modalContainer}>
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
				</View>
			</Modal>
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
		},
		greetingSection: {
			marginBottom: 20,
		},
		greeting: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		subGreeting: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},
		statsGrid: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 20,
		},
		statCard: {
			flex: 1,
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 10,
			alignItems: "center",
			marginHorizontal: 4,
		},
		statIcon: {
			width: 32,
			height: 32,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 6,
		},
		statValue: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 9,
			color: theme.textMuted,
			marginTop: 2,
			textAlign: "center",
		},
		activeWorkoutBanner: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.success,
			borderRadius: 16,
			padding: 16,
			marginBottom: 20,
		},
		activePulse: {
			width: 12,
			height: 12,
			borderRadius: 6,
			backgroundColor: "#FFFFFF",
			marginRight: 12,
		},
		activeWorkoutContent: {
			flex: 1,
		},
		activeWorkoutTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		activeWorkoutSubtitle: {
			fontSize: 12,
			color: "#FFFFFF",
			opacity: 0.8,
		},
		section: {
			marginBottom: 24,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 12,
		},
		seeAll: {
			fontSize: 14,
			color: theme.primary,
			fontWeight: "600",
		},
		quickStartGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
		},
		quickStartCard: {
			width: (width - 44) / 2,
			padding: 20,
			borderRadius: 16,
			alignItems: "center",
			gap: 8,
		},
		quickStartText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#FFFFFF",
		},
		activePlanCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		planIcon: {
			width: 48,
			height: 48,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		planContent: {
			flex: 1,
		},
		planName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		planMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		startPlanButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
		},
		plansScroll: {
			marginLeft: -4,
		},
		planCard: {
			width: 140,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 14,
			marginRight: 12,
			borderLeftWidth: 3,
		},
		planCardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 10,
		},
		planCardIcon: {
			width: 32,
			height: 32,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		planCardDuration: {
			fontSize: 11,
			color: theme.textMuted,
		},
		planCardName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		planCardExercises: {
			fontSize: 11,
			color: theme.textMuted,
		},
		emptyCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 32,
			alignItems: "center",
			borderWidth: 2,
			borderColor: theme.border,
			borderStyle: "dashed",
		},
		emptyText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginTop: 12,
		},
		emptySubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
		},
		emptyRecentCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 24,
			alignItems: "center",
		},
		emptyRecentText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginTop: 8,
		},
		emptyRecentSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		recentCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 14,
			marginBottom: 10,
		},
		recentIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		recentContent: {
			flex: 1,
		},
		recentName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		recentMeta: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		recentVolume: {
			alignItems: "center",
		},
		recentVolumeValue: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.primary,
		},
		recentVolumeLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		tipCard: {
			flexDirection: "row",
			backgroundColor: theme.warning + "15",
			borderRadius: 16,
			padding: 16,
			gap: 12,
		},
		tipContent: {
			flex: 1,
		},
		tipTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		tipText: {
			fontSize: 12,
			color: theme.textSecondary,
			lineHeight: 18,
		},
		// Modal styles
		modalContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalHeaderActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 16,
		},
		createExerciseBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingHorizontal: 12,
			paddingVertical: 6,
			backgroundColor: theme.primary + "20",
			borderRadius: 20,
		},
		createExerciseBtnText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		saveButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primary,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 12,
			margin: 16,
			gap: 8,
		},
		searchInput: {
			flex: 1,
			paddingVertical: 12,
			fontSize: 16,
			color: theme.text,
		},
		muscleFilter: {
			paddingHorizontal: 16,
			marginBottom: 12,
			maxHeight: 44,
		},
		muscleChip: {
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 20,
			backgroundColor: theme.surface,
			marginRight: 8,
			alignItems: "center",
			justifyContent: "center",
			minHeight: 36,
			maxHeight: 36,
		},
		muscleChipActive: {
			backgroundColor: theme.primary,
		},
		muscleChipText: {
			fontSize: 13,
			color: theme.text,
			textAlign: "center",
		},
		muscleChipTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		exerciseList: {
			paddingHorizontal: 16,
			flexGrow: 1,
			paddingTop: 8,
		},
		exerciseItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 10,
		},
		exerciseItemLeft: {
			flex: 1,
		},
		exerciseNameRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		exerciseItemName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		customBadge: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 10,
		},
		customBadgeText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.primary,
		},
		exerciseItemMuscles: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
			textTransform: "capitalize",
		},
		difficultyBadge: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
		},
		difficultyText: {
			fontSize: 11,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		emptyList: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptyListText: {
			fontSize: 16,
			color: theme.textMuted,
		},
		// Create Exercise Form styles
		createExerciseForm: {
			flex: 1,
			padding: 16,
		},
		formGroup: {
			marginBottom: 24,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			fontSize: 16,
			color: theme.text,
		},
		formInputMultiline: {
			minHeight: 100,
			textAlignVertical: "top",
		},
		muscleSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		muscleSelectorChip: {
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 20,
			backgroundColor: theme.surface,
		},
		muscleSelectorChipActive: {
			backgroundColor: theme.primary,
		},
		muscleSelectorText: {
			fontSize: 13,
			color: theme.text,
		},
		muscleSelectorTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		// Rest Timer styles
		timerOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.6)",
			justifyContent: "center",
			alignItems: "center",
		},
		timerModal: {
			width: width - 48,
			backgroundColor: theme.background,
			borderRadius: 24,
			padding: 24,
		},
		timerDisplay: {
			alignItems: "center",
			marginVertical: 32,
		},
		timerText: {
			fontSize: 64,
			fontWeight: "700",
			color: theme.text,
			fontVariant: ["tabular-nums"],
		},
		timerLabel: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 8,
		},
		presetTimes: {
			flexDirection: "row",
			justifyContent: "center",
			gap: 12,
			marginBottom: 24,
		},
		presetButton: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 12,
			backgroundColor: theme.surface,
		},
		presetButtonActive: {
			backgroundColor: theme.primary + "30",
		},
		presetText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		presetTextActive: {
			color: theme.primary,
		},
		timerControls: {
			alignItems: "center",
		},
		startTimerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.primary,
			paddingVertical: 16,
			paddingHorizontal: 48,
			borderRadius: 16,
			gap: 8,
		},
		startTimerText: {
			fontSize: 18,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		// Weight Logger styles
		weightInputSection: {
			padding: 24,
		},
		weightInputRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 16,
			marginBottom: 24,
		},
		weightInput: {
			flex: 1,
			fontSize: 48,
			fontWeight: "700",
			color: theme.text,
			textAlign: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		unitToggle: {
			flexDirection: "column",
			backgroundColor: theme.surface,
			borderRadius: 12,
			overflow: "hidden",
		},
		unitButton: {
			paddingHorizontal: 20,
			paddingVertical: 12,
		},
		unitButtonActive: {
			backgroundColor: theme.primary,
		},
		unitText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		unitTextActive: {
			color: "#FFFFFF",
		},
		saveWeightButton: {
			backgroundColor: theme.primary,
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: "center",
		},
		saveWeightText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		recentWeightsSection: {
			padding: 24,
			paddingTop: 0,
		},
		recentWeightsTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 16,
		},
		emptyWeights: {
			alignItems: "center",
			paddingVertical: 32,
		},
		emptyWeightsText: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 12,
		},
		weightEntry: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 16,
			borderRadius: 12,
			marginBottom: 8,
		},
		weightEntryDate: {
			fontSize: 14,
			color: theme.textMuted,
		},
		weightEntryValue: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
	});
