// Subject Manager - Manage subjects/topics within study goals

import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import {
	Difficulty,
	Priority,
	Subject,
	useStudyStore,
} from "@/src/context/studyStoreDB/index";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
	Dimensions,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

interface SubjectManagerProps {
	theme: Theme;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentSubjectCount: number;
}

const DIFFICULTY_OPTIONS: {
	value: Difficulty;
	label: string;
	color: string;
}[] = [
	{ value: "easy", label: "Easy", color: "#22C55E" },
	{ value: "medium", label: "Medium", color: "#FBBF24" },
	{ value: "hard", label: "Hard", color: "#F97316" },
	{ value: "expert", label: "Expert", color: "#EF4444" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; icon: string }[] = [
	{ value: "low", label: "Low", icon: "arrow-down" },
	{ value: "medium", label: "Medium", icon: "remove" },
	{ value: "high", label: "High", icon: "arrow-up" },
	{ value: "critical", label: "Critical", icon: "warning" },
];

const SUBJECT_COLORS = [
	"#6366F1",
	"#8B5CF6",
	"#EC4899",
	"#EF4444",
	"#F97316",
	"#FBBF24",
	"#22C55E",
	"#14B8A6",
];

const SUBJECT_ICONS = [
	"book",
	"calculator",
	"flask",
	"globe",
	"code-slash",
	"musical-notes",
	"language",
	"fitness",
	"bulb",
	"cube",
];

export default function SubjectManager({
	theme,
	onOpenDrawer,
	subscriptionCheck,
	currentSubjectCount,
}: SubjectManagerProps) {
	const {
		studyGoals,
		subjects,
		addSubject,
		updateSubject,
		deleteSubject,
		getSubjectsByGoal,
		addStudyGoal,
	} = useStudyStore();

	const styles = createStyles(theme);

	const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
		studyGoals.length > 0 ? studyGoals[0].id : null
	);
	const [showAddSubject, setShowAddSubject] = useState(false);
	const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
	const [showAddGoal, setShowAddGoal] = useState(false);
	const [newGoalName, setNewGoalName] = useState("");

	// Form State
	const [subjectName, setSubjectName] = useState("");
	const [subjectDescription, setSubjectDescription] = useState("");
	const [subjectDifficulty, setSubjectDifficulty] =
		useState<Difficulty>("medium");
	const [subjectPriority, setSubjectPriority] = useState<Priority>("medium");
	const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0]);
	const [subjectIcon, setSubjectIcon] = useState(SUBJECT_ICONS[0]);
	const [targetHours, setTargetHours] = useState("");

	const activeGoals = useMemo(
		() => studyGoals.filter((g) => g.status !== "archived"),
		[studyGoals]
	);

	const goalSubjects = useMemo(() => {
		if (!selectedGoalId) return [];
		return subjects
			.filter((s) => s.goalId === selectedGoalId)
			.sort((a, b) => a.order - b.order);
	}, [subjects, selectedGoalId]);

	const resetForm = () => {
		setSubjectName("");
		setSubjectDescription("");
		setSubjectDifficulty("medium");
		setSubjectPriority("medium");
		setSubjectColor(SUBJECT_COLORS[0]);
		setSubjectIcon(SUBJECT_ICONS[0]);
		setTargetHours("");
		setEditingSubject(null);
	};

	const handleAddSubject = () => {
		if (!subjectName.trim()) {
			Alert.alert("Error", "Please enter subject name");
			return;
		}
		if (!selectedGoalId) {
			Alert.alert("Error", "Please select a goal first");
			return;
		}

		if (editingSubject) {
			updateSubject(editingSubject.id, {
				name: subjectName,
				description: subjectDescription || undefined,
				difficulty: subjectDifficulty,
				priority: subjectPriority,
				color: subjectColor,
				icon: subjectIcon,
				targetHours: targetHours ? parseFloat(targetHours) : undefined,
			});
			Alert.alert("Success", "Subject updated!");
		} else {
			addSubject({
				goalId: selectedGoalId,
				name: subjectName,
				description: subjectDescription || undefined,
				difficulty: subjectDifficulty,
				priority: subjectPriority,
				color: subjectColor,
				icon: subjectIcon,
				targetHours: targetHours ? parseFloat(targetHours) : undefined,
				status: "not_started",
				order: goalSubjects.length,
			});
			Alert.alert("Success", "Subject added!");
		}

		resetForm();
		setShowAddSubject(false);
	};

	const handleEditSubject = (subject: Subject) => {
		setEditingSubject(subject);
		setSubjectName(subject.name);
		setSubjectDescription(subject.description || "");
		setSubjectDifficulty(subject.difficulty);
		setSubjectPriority(subject.priority);
		setSubjectColor(subject.color || SUBJECT_COLORS[0]);
		setSubjectIcon(subject.icon || SUBJECT_ICONS[0]);
		setTargetHours(subject.targetHours?.toString() || "");
		setShowAddSubject(true);
	};

	const handleDeleteSubject = (subject: Subject) => {
		Alert.alert(
			"Delete Subject",
			`Are you sure you want to delete "${subject.name}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => deleteSubject(subject.id),
				},
			]
		);
	};
	const handleCreateGoal = async () => {
		if (!newGoalName.trim()) {
			Alert.alert("Error", "Please enter a goal name");
			return;
		}

		await addStudyGoal({
			name: newGoalName,
			type: "exam" as any,
			status: "in_progress" as any,
			priority: "medium" as any,
			startDate: new Date().toISOString(),
			color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)],
		});

		Alert.alert("Success", "Study goal created!");
		setNewGoalName("");
		setShowAddGoal(false);

		// Select the newly created goal
		if (studyGoals.length > 0) {
			setSelectedGoalId(studyGoals[studyGoals.length - 1].id);
		}
	};
	const updateSubjectProgress = (subject: Subject, progress: number) => {
		updateSubject(subject.id, {
			progress: Math.min(100, Math.max(0, progress)),
			status:
				progress >= 100
					? "completed"
					: progress > 0
					? "in_progress"
					: "not_started",
		});
	};

	const getDifficultyColor = (difficulty: Difficulty) => {
		return (
			DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.color ||
			theme.text
		);
	};

	return (
		<View style={styles.container}>
			{/* Goal Selector */}
			<View style={styles.goalSelectorWrapper}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.goalSelector}
					contentContainerStyle={styles.goalSelectorContent}
				>
					{activeGoals.map((goal) => (
						<TouchableOpacity
							key={goal.id}
							style={[
								styles.goalTab,
								selectedGoalId === goal.id && styles.goalTabActive,
								{ borderColor: goal.color || theme.primary },
							]}
							onPress={() => setSelectedGoalId(goal.id)}
						>
							<View
								style={[
									styles.goalDot,
									{ backgroundColor: goal.color || theme.primary },
								]}
							/>
							<Text
								style={[
									styles.goalTabText,
									selectedGoalId === goal.id && styles.goalTabTextActive,
								]}
								numberOfLines={1}
							>
								{goal.name}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
				<TouchableOpacity
					style={styles.addGoalTab}
					onPress={() => setShowAddGoal(true)}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons name="add" size={20} color={theme.primary} />
				</TouchableOpacity>
			</View>

			{/* Subject List */}
			<ScrollView
				style={styles.subjectList}
				showsVerticalScrollIndicator={false}
			>
				{goalSubjects.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							name="library-outline"
							size={56}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyText}>No subjects yet</Text>
						<Text style={styles.emptySubtext}>
							Add subjects to organize your study
						</Text>
					</View>
				) : (
					goalSubjects.map((subject) => (
						<TouchableOpacity
							key={subject.id}
							style={styles.subjectCard}
							onPress={() => handleEditSubject(subject)}
							onLongPress={() => handleDeleteSubject(subject)}
						>
							<View style={styles.subjectHeader}>
								<View
									style={[
										styles.subjectIconContainer,
										{ backgroundColor: subject.color + "20" },
									]}
								>
									<Ionicons
										name={(subject.icon as any) || "book"}
										size={24}
										color={subject.color || theme.primary}
									/>
								</View>
								<View style={styles.subjectInfo}>
									<Text style={styles.subjectName}>{subject.name}</Text>
									<View style={styles.subjectMeta}>
										<View
											style={[
												styles.difficultyBadge,
												{
													backgroundColor:
														getDifficultyColor(subject.difficulty) + "20",
												},
											]}
										>
											<Text
												style={[
													styles.difficultyText,
													{ color: getDifficultyColor(subject.difficulty) },
												]}
											>
												{subject.difficulty}
											</Text>
										</View>
										<Text style={styles.hoursText}>
											{subject.hoursSpent.toFixed(1)}h
											{subject.targetHours && ` / ${subject.targetHours}h`}
										</Text>
									</View>
								</View>
								<TouchableOpacity
									style={styles.moreButton}
									onPress={() => handleEditSubject(subject)}
								>
									<Ionicons
										name="ellipsis-vertical"
										size={18}
										color={theme.textMuted}
									/>
								</TouchableOpacity>
							</View>

							{/* Progress Bar */}
							<View style={styles.progressSection}>
								<View style={styles.progressBar}>
									<View
										style={[
											styles.progressFill,
											{
												width: `${subject.progress}%`,
												backgroundColor: subject.color || theme.primary,
											},
										]}
									/>
								</View>
								<Text style={styles.progressText}>{subject.progress}%</Text>
							</View>

							{/* Quick Progress Buttons */}
							<View style={styles.quickProgress}>
								{[0, 25, 50, 75, 100].map((val) => (
									<TouchableOpacity
										key={val}
										style={[
											styles.quickProgressBtn,
											subject.progress >= val && styles.quickProgressBtnActive,
											subject.progress >= val && {
												backgroundColor:
													(subject.color || theme.primary) + "30",
											},
										]}
										onPress={() => updateSubjectProgress(subject, val)}
									>
										<Text
											style={[
												styles.quickProgressText,
												subject.progress >= val && {
													color: subject.color || theme.primary,
												},
											]}
										>
											{val}%
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</TouchableOpacity>
					))
				)}
				<View style={{ height: 120 }} />
			</ScrollView>

			{/* Floating Add Button */}
			{selectedGoalId && (
				<TouchableOpacity
					style={styles.fab}
					onPress={() => {
						resetForm();
						setShowAddSubject(true);
					}}
				>
					<Ionicons name="add" size={28} color="#fff" />
				</TouchableOpacity>
			)}

			{/* Add/Edit Subject Modal */}
			<Modal visible={showAddSubject} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingSubject ? "Edit Subject" : "Add Subject"}
							</Text>
							<TouchableOpacity
								onPress={() => {
									resetForm();
									setShowAddSubject(false);
								}}
							>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.inputLabel}>Subject Name *</Text>
							<TextInput
								style={styles.input}
								value={subjectName}
								onChangeText={setSubjectName}
								placeholder="e.g., Physics, Data Structures"
								placeholderTextColor={theme.textMuted}
							/>

							<Text style={styles.inputLabel}>Description</Text>
							<TextInput
								style={[styles.input, styles.inputMultiline]}
								value={subjectDescription}
								onChangeText={setSubjectDescription}
								placeholder="What topics does this cover?"
								placeholderTextColor={theme.textMuted}
								multiline
								numberOfLines={2}
							/>

							<Text style={styles.inputLabel}>Difficulty</Text>
							<View style={styles.optionsRow}>
								{DIFFICULTY_OPTIONS.map((opt) => (
									<TouchableOpacity
										key={opt.value}
										style={[
											styles.optionBtn,
											subjectDifficulty === opt.value && {
												backgroundColor: opt.color + "20",
												borderColor: opt.color,
											},
										]}
										onPress={() => setSubjectDifficulty(opt.value)}
									>
										<Text
											style={[
												styles.optionText,
												subjectDifficulty === opt.value && { color: opt.color },
											]}
										>
											{opt.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.inputLabel}>Priority</Text>
							<View style={styles.optionsRow}>
								{PRIORITY_OPTIONS.map((opt) => (
									<TouchableOpacity
										key={opt.value}
										style={[
											styles.optionBtn,
											subjectPriority === opt.value && styles.optionBtnActive,
										]}
										onPress={() => setSubjectPriority(opt.value)}
									>
										<Ionicons
											name={opt.icon as any}
											size={14}
											color={
												subjectPriority === opt.value ? "#fff" : theme.text
											}
										/>
										<Text
											style={[
												styles.optionText,
												subjectPriority === opt.value &&
													styles.optionTextActive,
											]}
										>
											{opt.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.inputLabel}>Target Hours</Text>
							<TextInput
								style={styles.input}
								value={targetHours}
								onChangeText={setTargetHours}
								placeholder="e.g., 20"
								placeholderTextColor={theme.textMuted}
								keyboardType="numeric"
							/>

							<Text style={styles.inputLabel}>Icon</Text>
							<View style={styles.iconGrid}>
								{SUBJECT_ICONS.map((icon) => (
									<TouchableOpacity
										key={icon}
										style={[
											styles.iconOption,
											subjectIcon === icon && {
												backgroundColor: subjectColor + "30",
												borderColor: subjectColor,
											},
										]}
										onPress={() => setSubjectIcon(icon)}
									>
										<Ionicons
											name={icon as any}
											size={22}
											color={subjectIcon === icon ? subjectColor : theme.text}
										/>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.inputLabel}>Color</Text>
							<View style={styles.colorRow}>
								{SUBJECT_COLORS.map((color) => (
									<TouchableOpacity
										key={color}
										style={[
											styles.colorOption,
											{ backgroundColor: color },
											subjectColor === color && styles.colorOptionActive,
										]}
										onPress={() => setSubjectColor(color)}
									>
										{subjectColor === color && (
											<Ionicons name="checkmark" size={18} color="#fff" />
										)}
									</TouchableOpacity>
								))}
							</View>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleAddSubject}
							>
								<Text style={styles.submitButtonText}>
									{editingSubject ? "Update Subject" : "Add Subject"}
								</Text>
							</TouchableOpacity>

							{editingSubject && (
								<TouchableOpacity
									style={styles.deleteButton}
									onPress={() => {
										handleDeleteSubject(editingSubject);
										setShowAddSubject(false);
									}}
								>
									<Ionicons name="trash" size={18} color={theme.error} />
									<Text style={styles.deleteButtonText}>Delete Subject</Text>
								</TouchableOpacity>
							)}
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Add Goal Modal */}
			<Modal visible={showAddGoal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Create Study Goal</Text>
							<TouchableOpacity
								onPress={() => {
									setShowAddGoal(false);
									setNewGoalName("");
								}}
							>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.inputLabel}>Goal Name *</Text>
							<TextInput
								style={styles.input}
								value={newGoalName}
								onChangeText={setNewGoalName}
								placeholder="e.g., JEE Preparation, UPSC 2025"
								placeholderTextColor={theme.textMuted}
								autoFocus
							/>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleCreateGoal}
							>
								<Text style={styles.submitButtonText}>Create Goal</Text>
							</TouchableOpacity>
						</ScrollView>
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
		goalSelectorWrapper: {
			flexDirection: "row",
			alignItems: "center",
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
			paddingRight: 8,
		},
		goalSelector: {
			flex: 1,
			maxHeight: 60,
		},
		goalSelectorContent: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 10,
		},
		goalTab: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 8,
			marginRight: 10,
		},
		goalTabActive: {
			borderWidth: 2,
		},
		goalDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		goalTabText: {
			fontSize: 14,
			color: theme.textSecondary,
			maxWidth: 120,
		},
		goalTabTextActive: {
			color: theme.text,
			fontWeight: "600",
		},
		subjectList: {
			flex: 1,
			padding: 16,
		},
		emptyState: {
			alignItems: "center",
			padding: 48,
		},
		emptyText: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginTop: 16,
		},
		emptySubtext: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		subjectCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		subjectHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		subjectIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		subjectInfo: {
			flex: 1,
		},
		subjectName: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		subjectMeta: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginTop: 4,
		},
		difficultyBadge: {
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 6,
		},
		difficultyText: {
			fontSize: 11,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		hoursText: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		moreButton: {
			padding: 4,
		},
		progressSection: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginTop: 14,
		},
		progressBar: {
			flex: 1,
			height: 8,
			backgroundColor: theme.border,
			borderRadius: 4,
			overflow: "hidden",
		},
		progressFill: {
			height: "100%",
			borderRadius: 4,
		},
		progressText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
			width: 36,
			textAlign: "right",
		},
		quickProgress: {
			flexDirection: "row",
			gap: 8,
			marginTop: 12,
		},
		quickProgressBtn: {
			flex: 1,
			paddingVertical: 6,
			borderRadius: 6,
			backgroundColor: theme.background,
			alignItems: "center",
		},
		quickProgressBtnActive: {},
		quickProgressText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		fab: {
			position: "absolute",
			right: 20,
			bottom: 90,
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 8,
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
			padding: 20,
			maxHeight: "90%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
			marginTop: 16,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		inputMultiline: {
			minHeight: 60,
			textAlignVertical: "top",
		},
		optionsRow: {
			flexDirection: "row",
			gap: 8,
		},
		optionBtn: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
			paddingVertical: 10,
			borderRadius: 8,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		optionBtnActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		optionText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.text,
		},
		optionTextActive: {
			color: "#fff",
		},
		iconGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		iconOption: {
			width: 44,
			height: 44,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		colorRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
		},
		colorOption: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		colorOptionActive: {
			borderWidth: 3,
			borderColor: "#fff",
		},
		submitButton: {
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 24,
		},
		submitButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "700",
		},
		deleteButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: 16,
			marginTop: 12,
			marginBottom: 20,
		},
		deleteButtonText: {
			color: theme.error,
			fontSize: 15,
			fontWeight: "600",
		},
		addGoalTab: {
			width: 40,
			height: 40,
			borderRadius: 22,
			margin: 8,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
		},
		addGoalText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
		},
		typeRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginBottom: 16,
		},
		typeButton: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		typeButtonActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		typeButtonText: {
			fontSize: 13,
			color: theme.text,
		},
		typeButtonTextActive: {
			color: "#fff",
			fontWeight: "600",
		},
	});
