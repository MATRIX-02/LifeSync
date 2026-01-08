// Active Workout Screen - In-progress workout UI

import { Alert } from "@/src/components/CustomAlert";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import {
	EXERCISE_DATABASE,
	getExercisesByMuscle,
	MUSCLE_GROUP_INFO,
} from "@/src/data/exerciseDatabase";
import {
	Exercise,
	MuscleGroup,
	WorkoutExercise,
	WorkoutSet,
} from "@/src/types/workout";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
	FlatList,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface ActiveWorkoutScreenProps {
	theme: Theme;
	onClose: () => void;
}

type SetType = "normal" | "warmup" | "dropset" | "superset";

export default function ActiveWorkoutScreen({
	theme,
	onClose,
}: ActiveWorkoutScreenProps) {
	const {
		currentSession,
		addExerciseToSession,
		removeExerciseFromSession,
		reorderExercisesInSession,
		updateSetInSession,
		addSetToExercise,
		removeSetFromExercise,
		finishWorkout,
		cancelWorkout,
	} = useWorkoutStore();

	const [elapsedTime, setElapsedTime] = useState(0);
	const [restTimer, setRestTimer] = useState<number | null>(null);
	const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
	const [showExerciseModal, setShowExerciseModal] = useState(false);
	const [showFinishModal, setShowFinishModal] = useState(false);
	const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">(
		"all"
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [workoutNotes, setWorkoutNotes] = useState("");
	const [workoutMood, setWorkoutMood] = useState(3);
	const [workoutEnergy, setWorkoutEnergy] = useState(3);

	// Custom exercise form
	const [customExerciseName, setCustomExerciseName] = useState("");
	const [customExerciseMuscles, setCustomExerciseMuscles] = useState<
		MuscleGroup[]
	>([]);

	const styles = createStyles(theme);

	// Elapsed time timer
	useEffect(() => {
		if (!currentSession) return;

		const startTime = new Date(currentSession.startTime).getTime();
		const timer = setInterval(() => {
			const now = Date.now();
			setElapsedTime(Math.floor((now - startTime) / 1000));
		}, 1000);

		return () => clearInterval(timer);
	}, [currentSession]);

	// Rest timer
	useEffect(() => {
		if (!isRestTimerRunning || restTimer === null || restTimer <= 0) return;

		const timer = setInterval(() => {
			setRestTimer((prev) => {
				if (prev && prev > 0) return prev - 1;
				setIsRestTimerRunning(false);
				return null;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [isRestTimerRunning, restTimer]);

	const formatTime = (seconds: number) => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		}
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const startRestTimer = (seconds: number) => {
		setRestTimer(seconds);
		setIsRestTimerRunning(true);
	};

	const stopRestTimer = () => {
		setIsRestTimerRunning(false);
		setRestTimer(null);
	};

	const handleAddExercise = (exercise: Exercise) => {
		const newExercise: WorkoutExercise = {
			id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			exerciseId: exercise.id,
			exerciseName: exercise.name,
			targetMuscles: exercise.targetMuscles,
			sets: [
				{
					id: `set_1`,
					setNumber: 1,
					reps: 10,
					weight: 0,
					completed: false,
					isWarmup: false,
					isDropset: false,
				},
			],
			targetSets: 3,
			restBetweenSets: 60,
			order: currentSession?.exercises.length || 0,
		};
		addExerciseToSession(newExercise);
		setShowExerciseModal(false);
	};

	const handleAddCustomExercise = () => {
		if (!customExerciseName.trim()) {
			Alert.alert("Error", "Please enter an exercise name");
			return;
		}
		if (customExerciseMuscles.length === 0) {
			Alert.alert("Error", "Please select at least one target muscle");
			return;
		}

		const newExercise: WorkoutExercise = {
			id: `custom_ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			exerciseId: `custom_${Date.now()}`,
			exerciseName: customExerciseName.trim(),
			targetMuscles: customExerciseMuscles,
			sets: [
				{
					id: `set_1`,
					setNumber: 1,
					reps: 10,
					weight: 0,
					completed: false,
					isWarmup: false,
					isDropset: false,
				},
			],
			targetSets: 3,
			restBetweenSets: 60,
			order: currentSession?.exercises.length || 0,
		};
		addExerciseToSession(newExercise);
		setCustomExerciseName("");
		setCustomExerciseMuscles([]);
		setShowCustomExerciseModal(false);
		setShowExerciseModal(false);
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

	const handleSetComplete = (
		exerciseId: string,
		setId: string,
		completed: boolean
	) => {
		updateSetInSession(exerciseId, setId, { completed });
		if (completed) {
			// Auto-start rest timer
			const exercise = currentSession?.exercises.find(
				(e) => e.id === exerciseId
			);
			if (exercise) {
				startRestTimer(exercise.restBetweenSets);
			}
		}
	};

	const handleUpdateSet = (
		exerciseId: string,
		setId: string,
		field: "weight" | "reps",
		value: string
	) => {
		const numValue = parseFloat(value) || 0;
		updateSetInSession(exerciseId, setId, { [field]: numValue });
	};

	const handleSetTypeChange = (
		exerciseId: string,
		setId: string,
		setType: SetType
	) => {
		const updates: Partial<WorkoutSet> = {
			isWarmup: setType === "warmup",
			isDropset: setType === "dropset",
			isSuperset: setType === "superset",
		};
		updateSetInSession(exerciseId, setId, updates);
	};

	const handleFinishWorkout = () => {
		finishWorkout(workoutNotes, workoutMood, workoutEnergy);
		setShowFinishModal(false);
		onClose();
	};

	const handleCancelWorkout = () => {
		Alert.alert(
			"Cancel Workout?",
			"Are you sure you want to cancel? All progress will be lost.",
			[
				{ text: "Keep Going", style: "cancel" },
				{
					text: "Cancel Workout",
					style: "destructive",
					onPress: () => {
						cancelWorkout();
						onClose();
					},
				},
			]
		);
	};

	const moveExerciseUp = (index: number) => {
		if (index === 0) return;
		reorderExercisesInSession(index, index - 1);
	};

	const moveExerciseDown = (index: number) => {
		if (!currentSession || index === currentSession.exercises.length - 1)
			return;
		reorderExercisesInSession(index, index + 1);
	};

	const getTotalVolume = () => {
		if (!currentSession) return 0;
		let volume = 0;
		currentSession.exercises.forEach((ex) => {
			ex.sets.forEach((set) => {
				if (set.completed && set.weight && set.reps) {
					volume += set.weight * set.reps;
				}
			});
		});
		return Math.round(volume);
	};

	const getCompletedSets = () => {
		if (!currentSession) return 0;
		return currentSession.exercises.reduce(
			(total, ex) => total + ex.sets.filter((s) => s.completed).length,
			0
		);
	};

	const filteredExercises =
		selectedMuscle === "all"
			? EXERCISE_DATABASE
			: getExercisesByMuscle(selectedMuscle);

	const searchedExercises = searchQuery
		? filteredExercises.filter(
				(e) =>
					e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					e.targetMuscles.some((m: MuscleGroup) =>
						m.toLowerCase().includes(searchQuery.toLowerCase())
					)
		  )
		: filteredExercises;

	if (!currentSession) {
		return (
			<View style={styles.container}>
				<Text style={styles.errorText}>No active workout session</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={handleCancelWorkout}
					style={styles.headerButton}
				>
					<Ionicons name="close" size={24} color={theme.text} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={styles.workoutName}>{currentSession.name}</Text>
					<View style={styles.timerContainer}>
						<Ionicons name="time-outline" size={16} color={theme.primary} />
						<Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
					</View>
				</View>
				<TouchableOpacity
					onPress={() => setShowFinishModal(true)}
					style={[styles.headerButton, styles.finishButton]}
				>
					<Text style={styles.finishButtonText}>Finish</Text>
				</TouchableOpacity>
			</View>

			{/* Rest Timer Banner */}
			{isRestTimerRunning && restTimer !== null && (
				<View style={styles.restTimerBanner}>
					<View style={styles.restTimerContent}>
						<Text style={styles.restTimerLabel}>Rest Time</Text>
						<Text style={styles.restTimerValue}>{formatTime(restTimer)}</Text>
					</View>
					<TouchableOpacity onPress={stopRestTimer} style={styles.skipButton}>
						<Text style={styles.skipButtonText}>Skip</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Stats Bar */}
			<View style={styles.statsBar}>
				<View style={styles.statItem}>
					<Text style={styles.statValue}>
						{currentSession.exercises.length}
					</Text>
					<Text style={styles.statLabel}>Exercises</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statItem}>
					<Text style={styles.statValue}>{getCompletedSets()}</Text>
					<Text style={styles.statLabel}>Sets Done</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statItem}>
					<Text style={styles.statValue}>
						{getTotalVolume() > 1000
							? `${(getTotalVolume() / 1000).toFixed(1)}k`
							: getTotalVolume()}
					</Text>
					<Text style={styles.statLabel}>Volume (kg)</Text>
				</View>
			</View>

			{/* Exercises List */}
			<ScrollView
				style={styles.exerciseList}
				showsVerticalScrollIndicator={false}
			>
				{currentSession.exercises.map((exercise, exIndex) => (
					<View key={exercise.id} style={styles.exerciseCard}>
						<View style={styles.exerciseHeader}>
							{/* Reorder Buttons */}
							<View style={styles.reorderButtons}>
								<TouchableOpacity
									style={[
										styles.reorderBtn,
										exIndex === 0 && styles.reorderBtnDisabled,
									]}
									onPress={() => moveExerciseUp(exIndex)}
									disabled={exIndex === 0}
								>
									<Ionicons
										name="chevron-up"
										size={16}
										color={exIndex === 0 ? theme.border : theme.textMuted}
									/>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.reorderBtn,
										exIndex === currentSession.exercises.length - 1 &&
											styles.reorderBtnDisabled,
									]}
									onPress={() => moveExerciseDown(exIndex)}
									disabled={exIndex === currentSession.exercises.length - 1}
								>
									<Ionicons
										name="chevron-down"
										size={16}
										color={
											exIndex === currentSession.exercises.length - 1
												? theme.border
												: theme.textMuted
										}
									/>
								</TouchableOpacity>
							</View>
							<View style={styles.exerciseInfo}>
								<Text style={styles.exerciseOrder}>#{exIndex + 1}</Text>
								<Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
							</View>
							<View style={styles.exerciseActions}>
								<TouchableOpacity
									style={styles.addSetButton}
									onPress={() => addSetToExercise(exercise.id)}
								>
									<Ionicons name="add" size={20} color={theme.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.removeExerciseButton}
									onPress={() => {
										Alert.alert(
											"Remove Exercise",
											`Remove "${exercise.exerciseName}" from this workout?`,
											[
												{ text: "Cancel", style: "cancel" },
												{
													text: "Remove",
													style: "destructive",
													onPress: () => removeExerciseFromSession(exercise.id),
												},
											]
										);
									}}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={theme.error}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{/* Muscle Tags */}
						<View style={styles.muscleTagsRow}>
							{exercise.targetMuscles.slice(0, 3).map((muscle) => (
								<View
									key={muscle}
									style={[
										styles.muscleTag,
										{
											backgroundColor:
												(MUSCLE_GROUP_INFO[muscle]?.color || theme.primary) +
												"20",
										},
									]}
								>
									<Text
										style={[
											styles.muscleTagText,
											{
												color:
													MUSCLE_GROUP_INFO[muscle]?.color || theme.primary,
											},
										]}
									>
										{MUSCLE_GROUP_INFO[muscle]?.name || muscle}
									</Text>
								</View>
							))}
						</View>

						{/* Sets Table Header */}
						<View style={styles.setsHeader}>
							<Text style={[styles.setHeaderText, styles.setCol]}>SET</Text>
							<Text style={[styles.setHeaderText, styles.typeCol]}>TYPE</Text>
							<Text style={[styles.setHeaderText, styles.weightCol]}>KG</Text>
							<Text style={[styles.setHeaderText, styles.repsCol]}>REPS</Text>
							<Text style={[styles.setHeaderText, styles.checkCol]}>
								<Ionicons name="checkmark" size={18} />
							</Text>
						</View>

						{/* Sets Rows */}
						{exercise.sets.map((set, setIndex) => (
							<View
								key={set.id}
								style={[
									styles.setRow,
									set.completed && styles.setRowCompleted,
									set.isWarmup && styles.setRowWarmup,
									set.isDropset && styles.setRowDropset,
								]}
							>
								<Text style={[styles.setText, styles.setCol]}>
									{set.setNumber}
								</Text>
								<TouchableOpacity
									style={[styles.typeCol, styles.typeButton]}
									onPress={() => {
										const types: SetType[] = [
											"normal",
											"warmup",
											"dropset",
											"superset",
										];
										const currentType = set.isWarmup
											? "warmup"
											: set.isDropset
											? "dropset"
											: set.isSuperset
											? "superset"
											: "normal";
										const nextIndex =
											(types.indexOf(currentType) + 1) % types.length;
										handleSetTypeChange(exercise.id, set.id, types[nextIndex]);
									}}
									onLongPress={() => {
										Alert.alert(
											"Set Types",
											"• Normal: Regular working set\n• Warm-up: Lighter weight to prepare muscles\n• Drop: Reduce weight immediately after a set\n• Superset: Paired with next exercise\n\nTap to cycle through types."
										);
									}}
								>
									<Text
										style={[
											styles.typeText,
											set.isWarmup && styles.typeTextWarmup,
											set.isDropset && styles.typeTextDropset,
											set.isSuperset && styles.typeTextSuperset,
										]}
									>
										{set.isWarmup
											? "Warmup"
											: set.isDropset
											? "Dropset"
											: set.isSuperset
											? "Superset"
											: "Normal"}
									</Text>
								</TouchableOpacity>
								<TextInput
									style={[styles.setInput, styles.weightCol]}
									value={set.weight?.toString() || ""}
									onChangeText={(v) =>
										handleUpdateSet(exercise.id, set.id, "weight", v)
									}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor={theme.textMuted}
								/>
								<TextInput
									style={[styles.setInput, styles.repsCol]}
									value={set.reps?.toString() || ""}
									onChangeText={(v) =>
										handleUpdateSet(exercise.id, set.id, "reps", v)
									}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor={theme.textMuted}
								/>
								<TouchableOpacity
									style={[
										styles.checkButton,
										styles.checkCol,
										set.completed && styles.checkButtonDone,
									]}
									onPress={() =>
										handleSetComplete(exercise.id, set.id, !set.completed)
									}
								>
									<Ionicons
										name={set.completed ? "checkmark" : "checkmark-outline"}
										size={18}
										color={set.completed ? "#FFFFFF" : theme.textMuted}
									/>
								</TouchableOpacity>
							</View>
						))}

						{/* Quick Rest Timers */}
						<View style={styles.quickRestRow}>
							<Text style={styles.quickRestLabel}>Rest:</Text>
							{[30, 60, 90, 120].map((secs) => (
								<TouchableOpacity
									key={secs}
									style={styles.quickRestButton}
									onPress={() => startRestTimer(secs)}
								>
									<Text style={styles.quickRestText}>{secs}s</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				))}

				{/* Add Exercise Button */}
				<TouchableOpacity
					style={styles.addExerciseButton}
					onPress={() => setShowExerciseModal(true)}
				>
					<Ionicons name="add-circle" size={24} color={theme.primary} />
					<Text style={styles.addExerciseText}>Add Exercise</Text>
				</TouchableOpacity>

				<View style={{ height: 100 }} />
			</ScrollView>

			{/* Add Exercise Modal */}
			<Modal visible={showExerciseModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<TouchableOpacity onPress={() => setShowExerciseModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
							<Text style={styles.modalTitle}>Add Exercise</Text>
							<TouchableOpacity
								onPress={() => setShowCustomExerciseModal(true)}
							>
								<Ionicons
									name="create-outline"
									size={24}
									color={theme.primary}
								/>
							</TouchableOpacity>
						</View>

						{/* Create Custom Exercise Button */}
						<TouchableOpacity
							style={styles.createCustomButton}
							onPress={() => setShowCustomExerciseModal(true)}
						>
							<Ionicons name="add-circle" size={20} color={theme.primary} />
							<Text style={styles.createCustomText}>
								Create Custom Exercise
							</Text>
						</TouchableOpacity>

						{/* Search */}
						<View style={styles.searchContainer}>
							<Ionicons name="search" size={20} color={theme.textMuted} />
							<TextInput
								style={styles.searchInput}
								placeholder="Search exercises..."
								placeholderTextColor={theme.textMuted}
								value={searchQuery}
								onChangeText={setSearchQuery}
							/>
						</View>

						{/* Muscle Filter */}
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.muscleFilterScroll}
						>
							<TouchableOpacity
								style={[
									styles.muscleFilterChip,
									selectedMuscle === "all" && styles.muscleFilterChipActive,
								]}
								onPress={() => setSelectedMuscle("all")}
							>
								<Text
									style={[
										styles.muscleFilterText,
										selectedMuscle === "all" && styles.muscleFilterTextActive,
									]}
								>
									All
								</Text>
							</TouchableOpacity>
							{Object.entries(MUSCLE_GROUP_INFO).map(([key, info]) => (
								<TouchableOpacity
									key={key}
									style={[
										styles.muscleFilterChip,
										selectedMuscle === key && styles.muscleFilterChipActive,
									]}
									onPress={() => setSelectedMuscle(key as MuscleGroup)}
								>
									<Text
										style={[
											styles.muscleFilterText,
											selectedMuscle === key && styles.muscleFilterTextActive,
										]}
									>
										{info.name}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>

						{/* Exercise List */}
						<FlatList
							data={searchedExercises}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.exerciseListItem}
									onPress={() => handleAddExercise(item)}
								>
									<View style={styles.exerciseListItemContent}>
										<Text style={styles.exerciseListItemName}>{item.name}</Text>
										<Text style={styles.exerciseListItemMuscles}>
											{item.targetMuscles
												.map(
													(m: MuscleGroup) => MUSCLE_GROUP_INFO[m]?.name || m
												)
												.join(", ")}
										</Text>
									</View>
									<Ionicons
										name="add-circle-outline"
										size={24}
										color={theme.primary}
									/>
								</TouchableOpacity>
							)}
							style={styles.exerciseListModal}
						/>
					</View>
				</View>
			</Modal>

			{/* Custom Exercise Modal */}
			<Modal
				visible={showCustomExerciseModal}
				animationType="slide"
				transparent
			>
				<View style={styles.modalOverlay}>
					<View style={styles.customExerciseModal}>
						<View style={styles.modalHeader}>
							<TouchableOpacity
								onPress={() => setShowCustomExerciseModal(false)}
							>
								<Ionicons name="arrow-back" size={24} color={theme.text} />
							</TouchableOpacity>
							<Text style={styles.modalTitle}>Custom Exercise</Text>
							<TouchableOpacity onPress={handleAddCustomExercise}>
								<Text style={styles.modalActionText}>Add</Text>
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.customExerciseContent}>
							{/* Exercise Name */}
							<View style={styles.customInputGroup}>
								<Text style={styles.customInputLabel}>Exercise Name</Text>
								<TextInput
									style={styles.customTextInput}
									placeholder="e.g., Bulgarian Split Squat"
									placeholderTextColor={theme.textMuted}
									value={customExerciseName}
									onChangeText={setCustomExerciseName}
								/>
							</View>

							{/* Target Muscles */}
							<View style={styles.customInputGroup}>
								<Text style={styles.customInputLabel}>
									Target Muscles ({customExerciseMuscles.length} selected)
								</Text>
								<View style={styles.muscleChipsGrid}>
									{Object.entries(MUSCLE_GROUP_INFO).map(([key, info]) => (
										<TouchableOpacity
											key={key}
											style={[
												styles.customMuscleChip,
												customExerciseMuscles.includes(key as MuscleGroup) &&
													styles.customMuscleChipActive,
											]}
											onPress={() => toggleCustomMuscle(key as MuscleGroup)}
										>
											<Text
												style={[
													styles.customMuscleChipText,
													customExerciseMuscles.includes(key as MuscleGroup) &&
														styles.customMuscleChipTextActive,
												]}
											>
												{info.name}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Finish Workout Modal */}
			<Modal visible={showFinishModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.finishModalContent}>
						<View style={styles.modalHeader}>
							<TouchableOpacity onPress={() => setShowFinishModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
							<Text style={styles.modalTitle}>Finish Workout</Text>
							<View style={{ width: 24 }} />
						</View>

						{/* Summary */}
						<View style={styles.finishSummary}>
							<View style={styles.finishSummaryItem}>
								<Text style={styles.finishSummaryValue}>
									{formatTime(elapsedTime)}
								</Text>
								<Text style={styles.finishSummaryLabel}>Duration</Text>
							</View>
							<View style={styles.finishSummaryItem}>
								<Text style={styles.finishSummaryValue}>
									{currentSession.exercises.length}
								</Text>
								<Text style={styles.finishSummaryLabel}>Exercises</Text>
							</View>
							<View style={styles.finishSummaryItem}>
								<Text style={styles.finishSummaryValue}>
									{getCompletedSets()}
								</Text>
								<Text style={styles.finishSummaryLabel}>Sets</Text>
							</View>
							<View style={styles.finishSummaryItem}>
								<Text style={styles.finishSummaryValue}>
									{(getTotalVolume() / 1000).toFixed(1)}k
								</Text>
								<Text style={styles.finishSummaryLabel}>Volume</Text>
							</View>
						</View>

						{/* Mood Selection */}
						<View style={styles.moodSection}>
							<Text style={styles.moodLabel}>How was your workout?</Text>
							<View style={styles.moodRow}>
								{[1, 2, 3, 4, 5].map((mood) => (
									<TouchableOpacity
										key={mood}
										style={[
											styles.moodButton,
											workoutMood === mood && styles.moodButtonActive,
										]}
										onPress={() => setWorkoutMood(mood)}
									>
										<Text
											style={[
												styles.moodEmoji,
												workoutMood === mood && styles.moodEmojiActive,
											]}
										>
											{mood === 1
												? "😫"
												: mood === 2
												? "😕"
												: mood === 3
												? "😐"
												: mood === 4
												? "😊"
												: "🔥"}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Energy Selection */}
						<View style={styles.moodSection}>
							<Text style={styles.moodLabel}>Energy Level</Text>
							<View style={styles.moodRow}>
								{[1, 2, 3, 4, 5].map((energy) => (
									<TouchableOpacity
										key={energy}
										style={[
											styles.energyButton,
											workoutEnergy === energy && styles.energyButtonActive,
										]}
										onPress={() => setWorkoutEnergy(energy)}
									>
										<Ionicons
											name={workoutEnergy >= energy ? "flash" : "flash-outline"}
											size={24}
											color={
												workoutEnergy >= energy
													? theme.warning
													: theme.textMuted
											}
										/>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Notes */}
						<View style={styles.notesSection}>
							<Text style={styles.moodLabel}>Notes (Optional)</Text>
							<TextInput
								style={styles.notesInput}
								placeholder="How did it go? Any PRs?"
								placeholderTextColor={theme.textMuted}
								value={workoutNotes}
								onChangeText={setWorkoutNotes}
								multiline
								numberOfLines={3}
							/>
						</View>

						{/* Finish Button */}
						<TouchableOpacity
							style={styles.finishWorkoutButton}
							onPress={handleFinishWorkout}
						>
							<Text style={styles.finishWorkoutButtonText}>
								Complete Workout
							</Text>
							<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		errorText: {
			color: theme.error,
			fontSize: 16,
			textAlign: "center",
			marginTop: 40,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		headerButton: {
			padding: 8,
		},
		headerCenter: {
			alignItems: "center",
		},
		workoutName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		timerContainer: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 4,
			gap: 4,
		},
		timerText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		finishButton: {
			backgroundColor: theme.success,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
		},
		finishButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},
		restTimerBanner: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.primary,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		restTimerContent: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		restTimerLabel: {
			fontSize: 14,
			color: "#FFFFFF",
			opacity: 0.8,
		},
		restTimerValue: {
			fontSize: 24,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		skipButton: {
			backgroundColor: "rgba(255,255,255,0.2)",
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
		},
		skipButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		statsBar: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-around",
			paddingVertical: 16,
			backgroundColor: theme.surface,
			marginHorizontal: 16,
			marginTop: 16,
			borderRadius: 12,
		},
		statItem: {
			alignItems: "center",
		},
		statValue: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		statDivider: {
			width: 1,
			height: 30,
			backgroundColor: theme.border,
		},
		exerciseList: {
			flex: 1,
			paddingHorizontal: 16,
			marginTop: 16,
		},
		exerciseCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
		},
		exerciseHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		reorderButtons: {
			flexDirection: "column",
			marginRight: 8,
		},
		reorderBtn: {
			padding: 2,
		},
		reorderBtnDisabled: {
			opacity: 0.3,
		},
		exerciseInfo: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			flex: 1,
		},
		exerciseOrder: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
		},
		exerciseName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			flex: 1,
		},
		exerciseActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		addSetButton: {
			padding: 4,
		},
		removeExerciseButton: {
			padding: 4,
		},
		muscleTagsRow: {
			flexDirection: "row",
			gap: 6,
			marginTop: 8,
			marginBottom: 12,
		},
		muscleTag: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
		},
		muscleTagText: {
			fontSize: 10,
			fontWeight: "600",
		},
		setsHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		setHeaderText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textMuted,
			textAlign: "center",
		},
		setCol: {
			width: 35,
		},
		typeCol: {
			width: 50,
		},
		weightCol: {
			flex: 1,
		},
		repsCol: {
			flex: 1,
		},
		checkCol: {
			width: 40,
			alignItems: "center",
		},
		setRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.border + "50",
		},
		setRowCompleted: {
			backgroundColor: theme.success + "10",
		},
		setRowWarmup: {
			backgroundColor: theme.warning + "10",
		},
		setRowDropset: {
			backgroundColor: theme.error + "10",
		},
		setText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			textAlign: "center",
		},
		typeButton: {
			alignItems: "center",
			justifyContent: "center",
		},
		typeText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
		},
		typeTextWarmup: {
			color: theme.warning,
		},
		typeTextDropset: {
			color: theme.error,
		},
		typeTextSuperset: {
			color: theme.info || "#3B82F6",
		},
		setInput: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
			textAlign: "center",
			paddingVertical: 4,
		},
		checkButton: {
			width: 28,
			height: 28,
			borderRadius: 14,
			borderWidth: 2,
			borderColor: theme.textMuted,
			alignItems: "center",
			justifyContent: "center",
		},
		checkButtonDone: {
			backgroundColor: theme.success,
			borderColor: theme.success,
		},
		quickRestRow: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 12,
			gap: 8,
		},
		quickRestLabel: {
			fontSize: 12,
			color: theme.textMuted,
		},
		quickRestButton: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			backgroundColor: theme.background,
			borderRadius: 8,
		},
		quickRestText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
		},
		addExerciseButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingVertical: 20,
			borderWidth: 2,
			borderColor: theme.primary + "40",
			borderStyle: "dashed",
			borderRadius: 12,
		},
		addExerciseText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primary,
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			maxHeight: "90%",
			paddingBottom: 40,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 12,
			marginHorizontal: 16,
			marginTop: 16,
			gap: 8,
		},
		searchInput: {
			flex: 1,
			paddingVertical: 12,
			fontSize: 16,
			color: theme.text,
		},
		muscleFilterScroll: {
			paddingHorizontal: 16,
			marginTop: 16,
			maxHeight: 40,
		},
		muscleFilterChip: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: theme.surface,
			borderRadius: 20,
			marginRight: 8,
		},
		muscleFilterChipActive: {
			backgroundColor: theme.primary,
		},
		muscleFilterText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
		},
		muscleFilterTextActive: {
			color: "#FFFFFF",
		},
		exerciseListModal: {
			marginTop: 16,
			paddingHorizontal: 16,
		},
		exerciseListItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		exerciseListItemContent: {
			flex: 1,
		},
		exerciseListItemName: {
			fontSize: 16,
			fontWeight: "500",
			color: theme.text,
		},
		exerciseListItemMuscles: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		finishModalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			paddingBottom: 40,
		},
		finishSummary: {
			flexDirection: "row",
			justifyContent: "space-around",
			paddingVertical: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
			marginHorizontal: 16,
		},
		finishSummaryItem: {
			alignItems: "center",
		},
		finishSummaryValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		finishSummaryLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
		},
		moodSection: {
			paddingHorizontal: 16,
			paddingVertical: 16,
		},
		moodLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		moodRow: {
			flexDirection: "row",
			justifyContent: "space-around",
		},
		moodButton: {
			width: 50,
			height: 50,
			borderRadius: 25,
			backgroundColor: theme.surface,
			alignItems: "center",
			justifyContent: "center",
		},
		moodButtonActive: {
			backgroundColor: theme.primary + "20",
			borderWidth: 2,
			borderColor: theme.primary,
		},
		moodEmoji: {
			fontSize: 24,
		},
		moodEmojiActive: {
			transform: [{ scale: 1.2 }],
		},
		energyButton: {
			width: 50,
			height: 50,
			borderRadius: 25,
			backgroundColor: theme.surface,
			alignItems: "center",
			justifyContent: "center",
		},
		energyButtonActive: {
			backgroundColor: theme.success + "20",
		},
		notesSection: {
			paddingHorizontal: 16,
		},
		notesInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			fontSize: 14,
			color: theme.text,
			minHeight: 80,
			textAlignVertical: "top",
		},
		finishWorkoutButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.success,
			marginHorizontal: 16,
			marginTop: 24,
			paddingVertical: 16,
			borderRadius: 12,
		},
		finishWorkoutButtonText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		createCustomButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingVertical: 12,
			marginHorizontal: 16,
			marginTop: 8,
			backgroundColor: theme.primary + "15",
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.primary + "40",
			borderStyle: "dashed",
		},
		createCustomText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		modalActionText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primary,
		},
		customExerciseModal: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			maxHeight: "80%",
			paddingBottom: 40,
		},
		customExerciseContent: {
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		customInputGroup: {
			marginBottom: 24,
		},
		customInputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
		},
		customTextInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
		},
		muscleChipsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		customMuscleChip: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			backgroundColor: theme.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.border,
		},
		customMuscleChipActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		customMuscleChipText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.text,
		},
		customMuscleChipTextActive: {
			color: "#FFFFFF",
		},
	});
