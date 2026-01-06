// Workout Plans - Create and manage workout routines

import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
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
	WorkoutPlan,
} from "@/src/types/workout";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	Alert,
	FlatList,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface WorkoutPlansProps {
	theme: Theme;
	onStartWorkout?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentPlanCount?: number;
}

export default function WorkoutPlans({
	theme,
	onStartWorkout,
	subscriptionCheck,
	currentPlanCount = 0,
}: WorkoutPlansProps) {
	const {
		workoutPlans,
		addWorkoutPlan,
		updateWorkoutPlan,
		deleteWorkoutPlan,
		setActivePlan,
		activePlanId,
		startWorkout,
	} = useWorkoutStore();

	const [isEditing, setIsEditing] = useState(false);
	const [showExerciseModal, setShowExerciseModal] = useState(false);
	const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

	// Plan form state
	const [planName, setPlanName] = useState("");
	const [planDescription, setPlanDescription] = useState("");
	const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>(
		[]
	);
	const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<
		MuscleGroup | "all"
	>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

	const styles = createStyles(theme);

	const openCreateEditor = () => {
		setPlanName("");
		setPlanDescription("");
		setSelectedExercises([]);
		setEditingPlan(null);
		setExpandedExercise(null);
		setIsEditing(true);
	};

	const openEditEditor = (plan: WorkoutPlan) => {
		setPlanName(plan.name);
		setPlanDescription(plan.description || "");
		setSelectedExercises(plan.exercises);
		setEditingPlan(plan);
		setExpandedExercise(null);
		setIsEditing(true);
	};

	const closeEditor = () => {
		setIsEditing(false);
		setPlanName("");
		setPlanDescription("");
		setSelectedExercises([]);
		setEditingPlan(null);
		setSearchQuery("");
		setSelectedMuscleFilter("all");
		setExpandedExercise(null);
	};

	const handleSavePlan = () => {
		if (!planName.trim()) {
			Alert.alert("Error", "Please enter a plan name");
			return;
		}

		if (selectedExercises.length === 0) {
			Alert.alert("Error", "Please add at least one exercise");
			return;
		}

		const planData = {
			name: planName.trim(),
			description: planDescription.trim() || undefined,
			exercises: selectedExercises,
			estimatedDuration: selectedExercises.length * 5 + 10, // Rough estimate
			targetMuscles: [
				...new Set(selectedExercises.flatMap((e) => e.targetMuscles)),
			],
		};

		if (editingPlan) {
			updateWorkoutPlan(editingPlan.id, planData);
		} else {
			addWorkoutPlan({
				...planData,
				id: Date.now().toString(),
				category: "strength",
				difficulty: "intermediate",
				targetMuscleGroups: planData.targetMuscles,
				isCustom: true,
				color: "#6366F1",
				icon: "barbell",
				createdAt: new Date(),
				updatedAt: new Date(),
				isActive: false,
			});
		}

		closeEditor();
	};

	const handleDeletePlan = (plan: WorkoutPlan) => {
		Alert.alert(
			"Delete Plan",
			`Are you sure you want to delete "${plan.name}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => deleteWorkoutPlan(plan.id),
				},
			]
		);
	};

	const addExerciseToPlan = (exercise: Exercise) => {
		const newExercise: WorkoutExercise = {
			id: Date.now().toString(),
			exerciseId: exercise.id,
			exerciseName: exercise.name,
			targetMuscles: exercise.targetMuscles,
			sets: [
				{
					id: "1",
					setNumber: 1,
					reps: 10,
					weight: 0,
					completed: false,
					isWarmup: false,
					isDropset: false,
				},
				{
					id: "2",
					setNumber: 2,
					reps: 10,
					weight: 0,
					completed: false,
					isWarmup: false,
					isDropset: false,
				},
				{
					id: "3",
					setNumber: 3,
					reps: 10,
					weight: 0,
					completed: false,
					isWarmup: false,
					isDropset: false,
				},
			],
			targetSets: 3,
			restBetweenSets: 60,
			order: selectedExercises.length,
		};
		setSelectedExercises([...selectedExercises, newExercise]);
	};

	const removeExerciseFromPlan = (exerciseId: string) => {
		setSelectedExercises(selectedExercises.filter((e) => e.id !== exerciseId));
	};

	const updateExerciseSets = (exerciseId: string, setCount: number) => {
		setSelectedExercises(
			selectedExercises.map((e) => {
				if (e.id === exerciseId) {
					const currentSets = e.sets.length;
					if (setCount > currentSets) {
						// Add sets
						const newSets = Array.from(
							{ length: setCount - currentSets },
							(_, i) => ({
								id: (currentSets + i + 1).toString(),
								setNumber: currentSets + i + 1,
								reps: 10,
								weight: 0,
								completed: false,
								isWarmup: false,
								isDropset: false,
							})
						);
						return {
							...e,
							sets: [...e.sets, ...newSets],
							targetSets: setCount,
						};
					} else if (setCount < currentSets) {
						// Remove sets
						return {
							...e,
							sets: e.sets.slice(0, setCount),
							targetSets: setCount,
						};
					}
				}
				return e;
			})
		);
	};

	const filteredExercises =
		selectedMuscleFilter === "all"
			? EXERCISE_DATABASE
			: getExercisesByMuscle(selectedMuscleFilter);

	const searchedExercises = searchQuery
		? filteredExercises.filter(
				(e) =>
					e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					e.targetMuscles.some((m: MuscleGroup) =>
						m.toLowerCase().includes(searchQuery.toLowerCase())
					)
		  )
		: filteredExercises;

	// Template exercise mappings
	const TEMPLATE_EXERCISES: Record<string, string[]> = {
		"Push Day": [
			"ex_bench_press",
			"ex_incline_bench",
			"ex_overhead_press",
			"ex_tricep_dips",
			"ex_cable_crossover",
		],
		"Pull Day": [
			"ex_deadlift",
			"ex_pullups",
			"ex_barbell_row",
			"ex_lat_pulldown",
			"ex_barbell_curl",
		],
		"Leg Day": [
			"ex_squat",
			"ex_leg_press",
			"ex_lunges",
			"ex_leg_curl",
			"ex_calf_raise",
		],
		"Full Body": [
			"ex_squat",
			"ex_bench_press",
			"ex_deadlift",
			"ex_overhead_press",
			"ex_barbell_row",
		],
		"Upper Body": [
			"ex_bench_press",
			"ex_barbell_row",
			"ex_overhead_press",
			"ex_barbell_curl",
			"ex_tricep_pushdown",
		],
		"Core Focus": [
			"ex_plank",
			"ex_bicycle_crunch",
			"ex_cable_crunch",
			"ex_leg_raise",
			"ex_russian_twist",
		],
	};

	const handleSelectTemplate = (templateName: string) => {
		setPlanName(templateName);

		// Auto-fill exercises based on template
		const exerciseIds = TEMPLATE_EXERCISES[templateName] || [];
		const exercises: WorkoutExercise[] = [];

		exerciseIds.forEach((exId, index) => {
			const exercise = EXERCISE_DATABASE.find((e) => e.id === exId);
			if (exercise) {
				exercises.push({
					id: `${Date.now()}_${index}`,
					exerciseId: exercise.id,
					exerciseName: exercise.name,
					targetMuscles: exercise.targetMuscles,
					sets: [
						{
							id: "1",
							setNumber: 1,
							reps: 10,
							weight: 0,
							completed: false,
							isWarmup: false,
							isDropset: false,
						},
						{
							id: "2",
							setNumber: 2,
							reps: 10,
							weight: 0,
							completed: false,
							isWarmup: false,
							isDropset: false,
						},
						{
							id: "3",
							setNumber: 3,
							reps: 10,
							weight: 0,
							completed: false,
							isWarmup: false,
							isDropset: false,
						},
					],
					targetSets: 3,
					restBetweenSets: 60,
					order: index,
				});
			}
		});

		setSelectedExercises(exercises);
	};

	const getMuscleTargets = (plan: WorkoutPlan) => {
		const muscles = new Set<MuscleGroup>();
		plan.exercises.forEach((e) =>
			e.targetMuscles.forEach((m: MuscleGroup) => muscles.add(m))
		);
		return Array.from(muscles).slice(0, 4);
	};

	// Update set values in plan editor
	const updateSetValue = (
		exerciseId: string,
		setId: string,
		field: "reps" | "weight",
		value: number
	) => {
		setSelectedExercises(
			selectedExercises.map((ex) => {
				if (ex.id === exerciseId) {
					return {
						...ex,
						sets: ex.sets.map((s) =>
							s.id === setId ? { ...s, [field]: value } : s
						),
					};
				}
				return ex;
			})
		);
	};

	const addSetToExerciseInPlan = (exerciseId: string) => {
		setSelectedExercises(
			selectedExercises.map((ex) => {
				if (ex.id === exerciseId) {
					const newSetNumber = ex.sets.length + 1;
					return {
						...ex,
						sets: [
							...ex.sets,
							{
								id: `${newSetNumber}`,
								setNumber: newSetNumber,
								reps: 10,
								weight: 0,
								completed: false,
								isWarmup: false,
								isDropset: false,
							},
						],
						targetSets: newSetNumber,
					};
				}
				return ex;
			})
		);
	};

	const removeSetFromExerciseInPlan = (exerciseId: string, setId: string) => {
		setSelectedExercises(
			selectedExercises.map((ex) => {
				if (ex.id === exerciseId && ex.sets.length > 1) {
					const newSets = ex.sets
						.filter((s) => s.id !== setId)
						.map((s, idx) => ({
							...s,
							id: `${idx + 1}`,
							setNumber: idx + 1,
						}));
					return {
						...ex,
						sets: newSets,
						targetSets: newSets.length,
					};
				}
				return ex;
			})
		);
	};

	// Reorder exercises
	const moveExerciseUp = (index: number) => {
		if (index === 0) return;
		const newExercises = [...selectedExercises];
		[newExercises[index - 1], newExercises[index]] = [
			newExercises[index],
			newExercises[index - 1],
		];
		// Update order values
		newExercises.forEach((ex, idx) => {
			ex.order = idx;
		});
		setSelectedExercises(newExercises);
	};

	const moveExerciseDown = (index: number) => {
		if (index === selectedExercises.length - 1) return;
		const newExercises = [...selectedExercises];
		[newExercises[index], newExercises[index + 1]] = [
			newExercises[index + 1],
			newExercises[index],
		];
		// Update order values
		newExercises.forEach((ex, idx) => {
			ex.order = idx;
		});
		setSelectedExercises(newExercises);
	};

	// If in editing mode, show the plan editor
	if (isEditing) {
		return (
			<View style={styles.editorContainer}>
				{/* Editor Header */}
				<View style={styles.editorHeader}>
					<TouchableOpacity onPress={closeEditor} style={styles.editorBackBtn}>
						<Ionicons name="close" size={24} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.editorTitle}>
						{editingPlan ? "Edit Plan" : "New Plan"}
					</Text>
					<TouchableOpacity
						onPress={handleSavePlan}
						style={styles.editorSaveBtn}
					>
						<Text style={styles.editorSaveText}>Save</Text>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.editorContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Plan Info Section */}
					<View style={styles.editorSection}>
						<TextInput
							style={styles.editorPlanName}
							placeholder="Plan Name"
							placeholderTextColor={theme.textMuted}
							value={planName}
							onChangeText={setPlanName}
						/>
						<TextInput
							style={styles.editorDescription}
							placeholder="Description (optional)"
							placeholderTextColor={theme.textMuted}
							value={planDescription}
							onChangeText={setPlanDescription}
							multiline
						/>
					</View>

					{/* Quick Templates */}
					{selectedExercises.length === 0 && (
						<View style={styles.editorSection}>
							<Text style={styles.editorSectionTitle}>
								Quick Start Templates
							</Text>
							<View style={styles.templateGrid}>
								{[
									{ name: "Push Day", icon: "arrow-forward-circle" },
									{ name: "Pull Day", icon: "arrow-back-circle" },
									{ name: "Leg Day", icon: "footsteps" },
									{ name: "Full Body", icon: "body" },
									{ name: "Upper Body", icon: "fitness" },
									{ name: "Core Focus", icon: "shield" },
								].map((template) => (
									<TouchableOpacity
										key={template.name}
										style={styles.templateCard}
										onPress={() => handleSelectTemplate(template.name)}
									>
										<Ionicons
											name={template.icon as any}
											size={18}
											color={theme.textMuted}
										/>
										<Text style={styles.templateText}>{template.name}</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					)}

					{/* Exercises List */}
					<View style={styles.editorSection}>
						<Text style={styles.editorSectionTitle}>
							Exercises ({selectedExercises.length})
						</Text>

						{selectedExercises.map((exercise, index) => (
							<View key={exercise.id} style={styles.exerciseCard}>
								<View style={styles.exerciseCardHeader}>
									{/* Reorder buttons */}
									<View style={styles.reorderButtons}>
										<TouchableOpacity
											style={[
												styles.reorderBtn,
												index === 0 && styles.reorderBtnDisabled,
											]}
											onPress={() => moveExerciseUp(index)}
											disabled={index === 0}
										>
											<Ionicons
												name="chevron-up"
												size={18}
												color={index === 0 ? theme.border : theme.textMuted}
											/>
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.reorderBtn,
												index === selectedExercises.length - 1 &&
													styles.reorderBtnDisabled,
											]}
											onPress={() => moveExerciseDown(index)}
											disabled={index === selectedExercises.length - 1}
										>
											<Ionicons
												name="chevron-down"
												size={18}
												color={
													index === selectedExercises.length - 1
														? theme.border
														: theme.textMuted
												}
											/>
										</TouchableOpacity>
									</View>
									<TouchableOpacity
										style={styles.exerciseCardInfoTouch}
										onPress={() =>
											setExpandedExercise(
												expandedExercise === exercise.id ? null : exercise.id
											)
										}
									>
										<View style={styles.exerciseCardInfo}>
											<Text style={styles.exerciseCardName}>
												{exercise.exerciseName}
											</Text>
											<Text style={styles.exerciseCardMuscles}>
												{exercise.targetMuscles
													.map((m) => MUSCLE_GROUP_INFO[m]?.name || m)
													.join(", ")}
											</Text>
										</View>
										<View style={styles.exerciseCardActions}>
											<Text style={styles.exerciseSetsCount}>
												{exercise.sets.length} sets
											</Text>
											<Ionicons
												name={
													expandedExercise === exercise.id
														? "chevron-up"
														: "chevron-down"
												}
												size={20}
												color={theme.textMuted}
											/>
										</View>
									</TouchableOpacity>
								</View>

								{expandedExercise === exercise.id && (
									<View style={styles.exerciseCardBody}>
										{/* Sets */}
										<View style={styles.setsHeader}>
											<Text style={styles.setsHeaderText}>Set</Text>
											<Text style={styles.setsHeaderText}>Reps</Text>
											<Text style={styles.setsHeaderText}>Weight</Text>
											<View style={{ width: 24 }} />
										</View>

										{exercise.sets.map((set) => (
											<View key={set.id} style={styles.setRow}>
												<View style={styles.setNumberBadge}>
													<Text style={styles.setNumberText}>
														{set.setNumber}
													</Text>
												</View>
												<TextInput
													style={styles.setInput}
													keyboardType="numeric"
													value={set.reps?.toString() || ""}
													onChangeText={(v) =>
														updateSetValue(
															exercise.id,
															set.id,
															"reps",
															parseInt(v) || 0
														)
													}
												/>
												<TextInput
													style={styles.setInput}
													keyboardType="numeric"
													value={set.weight?.toString() || "0"}
													onChangeText={(v) =>
														updateSetValue(
															exercise.id,
															set.id,
															"weight",
															parseFloat(v) || 0
														)
													}
												/>
												<TouchableOpacity
													onPress={() =>
														removeSetFromExerciseInPlan(exercise.id, set.id)
													}
													style={styles.removeSetBtn}
												>
													<Ionicons
														name="close-circle"
														size={20}
														color={theme.error}
													/>
												</TouchableOpacity>
											</View>
										))}

										{/* Add Set / Remove Exercise */}
										<View style={styles.exerciseCardFooter}>
											<TouchableOpacity
												style={styles.addSetBtn}
												onPress={() => addSetToExerciseInPlan(exercise.id)}
											>
												<Ionicons name="add" size={16} color={theme.primary} />
												<Text style={styles.addSetText}>Add Set</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.removeExerciseBtn}
												onPress={() => removeExerciseFromPlan(exercise.id)}
											>
												<Ionicons
													name="trash-outline"
													size={16}
													color={theme.error}
												/>
												<Text style={styles.removeExerciseText}>Remove</Text>
											</TouchableOpacity>
										</View>
									</View>
								)}
							</View>
						))}

						{/* Add Exercise Button */}
						<TouchableOpacity
							style={styles.addExerciseBtn}
							onPress={() => setShowExerciseModal(true)}
						>
							<Ionicons name="add-circle" size={24} color={theme.primary} />
							<Text style={styles.addExerciseText}>Add Exercise</Text>
						</TouchableOpacity>
					</View>

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
								<View style={{ width: 24 }} />
							</View>

							{/* Search */}
							<View style={styles.searchContainer}>
								<Ionicons name="search" size={18} color={theme.textMuted} />
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
								style={styles.filterScroll}
							>
								<TouchableOpacity
									style={[
										styles.filterChip,
										selectedMuscleFilter === "all" && styles.filterChipActive,
									]}
									onPress={() => setSelectedMuscleFilter("all")}
								>
									<Text
										style={[
											styles.filterChipText,
											selectedMuscleFilter === "all" &&
												styles.filterChipTextActive,
										]}
									>
										All
									</Text>
								</TouchableOpacity>
								{Object.entries(MUSCLE_GROUP_INFO).map(([key, info]) => (
									<TouchableOpacity
										key={key}
										style={[
											styles.filterChip,
											selectedMuscleFilter === key && styles.filterChipActive,
										]}
										onPress={() => setSelectedMuscleFilter(key as MuscleGroup)}
									>
										<Text
											style={[
												styles.filterChipText,
												selectedMuscleFilter === key &&
													styles.filterChipTextActive,
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
								renderItem={({ item }) => {
									const isSelected = selectedExercises.some(
										(e) => e.exerciseId === item.id
									);
									return (
										<TouchableOpacity
											style={[
												styles.exerciseItem,
												isSelected && styles.exerciseItemSelected,
											]}
											onPress={() => addExerciseToPlan(item)}
										>
											<View style={styles.exerciseInfo}>
												<Text style={styles.exerciseName}>{item.name}</Text>
												<View style={styles.exerciseMuscles}>
													{item.targetMuscles
														.slice(0, 2)
														.map((m: MuscleGroup) => (
															<Text key={m} style={styles.exerciseMuscle}>
																{MUSCLE_GROUP_INFO[m]?.name || m}
															</Text>
														))}
												</View>
											</View>
											<Ionicons
												name={
													isSelected ? "checkmark-circle" : "add-circle-outline"
												}
												size={24}
												color={isSelected ? theme.success : theme.primary}
											/>
										</TouchableOpacity>
									);
								}}
								style={styles.exerciseList}
								showsVerticalScrollIndicator={false}
							/>
						</View>
					</View>
				</Modal>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Header Actions */}
			<TouchableOpacity style={styles.createButton} onPress={openCreateEditor}>
				<View style={styles.createIconContainer}>
					<Ionicons name="add" size={24} color="#FFFFFF" />
				</View>
				<View style={styles.createTextContainer}>
					<Text style={styles.createTitle}>Create New Plan</Text>
					<Text style={styles.createSubtitle}>
						Design your custom workout routine
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
			</TouchableOpacity>

			{/* Active Plan Banner */}
			{activePlanId && (
				<View style={styles.activePlanBanner}>
					<View style={styles.activePlanIcon}>
						<Ionicons name="flash" size={16} color={theme.warning} />
					</View>
					<Text style={styles.activePlanText}>
						Active:{" "}
						{workoutPlans.find((p) => p.id === activePlanId)?.name || "Unknown"}
					</Text>
				</View>
			)}

			{/* Plans List */}
			<Text style={styles.sectionTitle}>
				Your Plans ({workoutPlans.length})
			</Text>

			{workoutPlans.length === 0 ? (
				<View style={styles.emptyState}>
					<View style={styles.emptyIcon}>
						<Ionicons
							name="clipboard-outline"
							size={40}
							color={theme.textMuted}
						/>
					</View>
					<Text style={styles.emptyTitle}>No Workout Plans</Text>
					<Text style={styles.emptySubtitle}>
						Create your first workout plan to get started
					</Text>
				</View>
			) : (
				workoutPlans.map((plan) => (
					<View
						key={plan.id}
						style={[
							styles.planCard,
							plan.id === activePlanId && styles.planCardActive,
						]}
					>
						<View style={styles.planHeader}>
							<View style={styles.planTitleRow}>
								<Text style={styles.planName}>{plan.name}</Text>
								{plan.id === activePlanId && (
									<View style={styles.activeBadge}>
										<Text style={styles.activeBadgeText}>Active</Text>
									</View>
								)}
							</View>
							<View style={styles.planActions}>
								<TouchableOpacity
									style={styles.actionButton}
									onPress={() => openEditEditor(plan)}
								>
									<Ionicons name="pencil" size={16} color={theme.textMuted} />
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.actionButton}
									onPress={() => handleDeletePlan(plan)}
								>
									<Ionicons
										name="trash-outline"
										size={16}
										color={theme.error}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{plan.description && (
							<Text style={styles.planDescription} numberOfLines={2}>
								{plan.description}
							</Text>
						)}

						<View style={styles.planMeta}>
							<View style={styles.metaItem}>
								<Ionicons
									name="barbell-outline"
									size={14}
									color={theme.textMuted}
								/>
								<Text style={styles.metaText}>
									{plan.exercises.length} exercises
								</Text>
							</View>
							<View style={styles.metaItem}>
								<Ionicons
									name="time-outline"
									size={14}
									color={theme.textMuted}
								/>
								<Text style={styles.metaText}>
									~{plan.estimatedDuration} min
								</Text>
							</View>
						</View>

						{/* Target Muscles */}
						<View style={styles.muscleChips}>
							{getMuscleTargets(plan).map((muscle) => (
								<View
									key={muscle}
									style={[
										styles.muscleChip,
										{
											backgroundColor:
												(MUSCLE_GROUP_INFO[muscle]?.color || theme.primary) +
												"20",
										},
									]}
								>
									<View
										style={[
											styles.muscleChipDot,
											{
												backgroundColor:
													MUSCLE_GROUP_INFO[muscle]?.color || theme.primary,
											},
										]}
									/>
									<Text style={styles.muscleChipText}>
										{MUSCLE_GROUP_INFO[muscle]?.name || muscle}
									</Text>
								</View>
							))}
						</View>

						{/* Plan Actions */}
						<View style={styles.planFooter}>
							<TouchableOpacity
								style={[
									styles.setActiveButton,
									plan.id === activePlanId && styles.setActiveButtonDisabled,
								]}
								onPress={() =>
									setActivePlan(plan.id === activePlanId ? null : plan.id)
								}
							>
								<Text
									style={[
										styles.setActiveButtonText,
										plan.id === activePlanId &&
											styles.setActiveButtonTextActive,
									]}
								>
									{plan.id === activePlanId ? "Deactivate" : "Set Active"}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.startWorkoutButton}
								onPress={() => {
									startWorkout(plan.id, plan.name);
									if (onStartWorkout) {
										onStartWorkout();
									}
								}}
							>
								<Text style={styles.startWorkoutButtonText}>Start Workout</Text>
								<Ionicons name="play" size={14} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
					</View>
				))
			)}

			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
		},
		createButton: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
		},
		createIconContainer: {
			width: 44,
			height: 44,
			borderRadius: 12,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		createTextContainer: {
			flex: 1,
		},
		createTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		createSubtitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		activePlanBanner: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.warning + "20",
			borderRadius: 10,
			paddingVertical: 8,
			paddingHorizontal: 12,
			marginBottom: 16,
		},
		activePlanIcon: {
			marginRight: 8,
		},
		activePlanText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.warning,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 12,
		},
		emptyState: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 32,
			alignItems: "center",
		},
		emptyIcon: {
			width: 64,
			height: 64,
			borderRadius: 32,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		emptyTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		emptySubtitle: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
			textAlign: "center",
		},
		planCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		planCardActive: {
			borderWidth: 2,
			borderColor: theme.primary,
		},
		planHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 8,
		},
		planTitleRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		planName: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		activeBadge: {
			backgroundColor: theme.primary,
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 6,
		},
		activeBadgeText: {
			fontSize: 10,
			fontWeight: "600",
			color: "#FFFFFF",
		},
		planActions: {
			flexDirection: "row",
			gap: 8,
		},
		actionButton: {
			padding: 4,
		},
		planDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginBottom: 12,
		},
		planMeta: {
			flexDirection: "row",
			gap: 16,
			marginBottom: 12,
		},
		metaItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		metaText: {
			fontSize: 12,
			color: theme.textMuted,
		},
		muscleChips: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			marginBottom: 12,
		},
		muscleChip: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
			gap: 4,
		},
		muscleChipDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
		},
		muscleChipText: {
			fontSize: 11,
			fontWeight: "500",
			color: theme.text,
		},
		planFooter: {
			flexDirection: "row",
			gap: 8,
		},
		setActiveButton: {
			flex: 1,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			alignItems: "center",
		},
		setActiveButtonDisabled: {
			backgroundColor: theme.border,
		},
		setActiveButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		setActiveButtonTextActive: {
			color: theme.textMuted,
		},
		startWorkoutButton: {
			flex: 1,
			flexDirection: "row",
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.primary,
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
		},
		startWorkoutButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#FFFFFF",
		},
		// Modal Styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			height: "95%",
			paddingBottom: 30,
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
			fontSize: 17,
			fontWeight: "700",
			color: theme.text,
		},
		modalAction: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.primary,
		},
		stepIndicator: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 16,
		},
		stepDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			backgroundColor: theme.border,
		},
		stepDotActive: {
			backgroundColor: theme.primary,
		},
		stepLine: {
			width: 40,
			height: 2,
			backgroundColor: theme.border,
			marginHorizontal: 8,
		},
		stepContent: {
			padding: 16,
			flex: 1,
		},
		inputGroup: {
			marginBottom: 16,
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		textInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 15,
			color: theme.text,
		},
		textArea: {
			height: 80,
			textAlignVertical: "top",
		},
		templateGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		templateCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			paddingVertical: 10,
			paddingHorizontal: 14,
			borderRadius: 10,
			gap: 6,
		},
		templateCardActive: {
			backgroundColor: theme.primary,
		},
		templateText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.text,
		},
		templateTextActive: {
			color: "#FFFFFF",
		},
		selectedSection: {
			marginBottom: 12,
		},
		selectedTitle: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		selectedScroll: {
			flexGrow: 0,
		},
		selectedChip: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.primary + "20",
			paddingVertical: 6,
			paddingLeft: 10,
			paddingRight: 6,
			borderRadius: 8,
			marginRight: 8,
			gap: 6,
		},
		selectedChipText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.primary,
		},
		setsControl: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 6,
			paddingHorizontal: 4,
			gap: 4,
		},
		setsText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
			minWidth: 16,
			textAlign: "center",
		},
		removeExercise: {
			width: 18,
			height: 18,
			borderRadius: 9,
			backgroundColor: theme.error,
			justifyContent: "center",
			alignItems: "center",
		},
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 10,
			paddingHorizontal: 12,
			marginBottom: 12,
		},
		searchInput: {
			flex: 1,
			paddingVertical: 10,
			paddingLeft: 8,
			fontSize: 14,
			color: theme.text,
		},
		filterScroll: {
			flexGrow: 0,
			marginBottom: 12,
		},
		filterChip: {
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: 8,
			backgroundColor: theme.surface,
			marginRight: 8,
		},
		filterChipActive: {
			backgroundColor: theme.primary,
		},
		filterChipText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.text,
		},
		filterChipTextActive: {
			color: "#FFFFFF",
		},
		exerciseList: {
			flex: 1,
		},
		exerciseItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			marginBottom: 8,
		},
		exerciseItemSelected: {
			backgroundColor: theme.primary + "20",
			borderWidth: 1,
			borderColor: theme.primary,
		},
		exerciseInfo: {
			flex: 1,
		},
		exerciseName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		exerciseMuscles: {
			flexDirection: "row",
			gap: 8,
		},
		exerciseMuscle: {
			fontSize: 11,
			color: theme.textMuted,
		},
		exerciseCheck: {
			width: 22,
			height: 22,
			borderRadius: 11,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		exerciseCheckSelected: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		// Editor styles
		editorContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		editorHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
			backgroundColor: theme.surface,
		},
		editorBackBtn: {
			padding: 4,
		},
		editorTitle: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.text,
		},
		editorSaveBtn: {
			paddingVertical: 6,
			paddingHorizontal: 12,
			backgroundColor: theme.primary,
			borderRadius: 8,
		},
		editorSaveText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFFFFF",
		},
		editorContent: {
			flex: 1,
			paddingHorizontal: 16,
		},
		editorSection: {
			marginTop: 16,
		},
		editorSectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 12,
		},
		editorPlanName: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		editorDescription: {
			fontSize: 14,
			color: theme.textMuted,
			paddingVertical: 12,
			minHeight: 60,
		},
		exerciseCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			marginBottom: 12,
			overflow: "hidden",
		},
		exerciseCardHeader: {
			flexDirection: "row",
			alignItems: "center",
			padding: 14,
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
		exerciseCardInfoTouch: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
		},
		exerciseOrderBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		exerciseOrderText: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.primary,
		},
		exerciseCardInfo: {
			flex: 1,
		},
		exerciseCardName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		exerciseCardMuscles: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		exerciseCardActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		exerciseSetsCount: {
			fontSize: 12,
			color: theme.textMuted,
			fontWeight: "500",
		},
		exerciseCardBody: {
			paddingHorizontal: 14,
			paddingBottom: 14,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		setsHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			gap: 12,
		},
		setsHeaderText: {
			fontSize: 11,
			fontWeight: "600",
			color: theme.textMuted,
			textTransform: "uppercase",
			flex: 1,
			textAlign: "center",
		},
		setRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 8,
			gap: 12,
		},
		setNumberBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			flex: 1,
		},
		setNumberText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		setInput: {
			flex: 1,
			backgroundColor: theme.surfaceLight,
			borderRadius: 8,
			paddingHorizontal: 12,
			paddingVertical: 8,
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
			textAlign: "center",
		},
		removeSetBtn: {
			padding: 4,
		},
		exerciseCardFooter: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginTop: 8,
			paddingTop: 8,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		addSetBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		addSetText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.primary,
		},
		removeExerciseBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		removeExerciseText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.error,
		},
		addExerciseBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: 16,
			borderRadius: 12,
			borderWidth: 2,
			borderStyle: "dashed",
			borderColor: theme.border,
		},
		addExerciseText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.primary,
		},
	});
