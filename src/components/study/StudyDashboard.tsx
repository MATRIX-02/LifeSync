// Study Dashboard - Main overview with quick actions and progress

import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useStudyStore } from "@/src/context/studyStoreDB/index";
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

interface StudyDashboardProps {
	theme: Theme;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
}

const GOAL_TYPES = [
	{ id: "exam", label: "Exam", icon: "school" },
	{ id: "competitive", label: "Competitive", icon: "trophy" },
	{ id: "interview", label: "Interview", icon: "briefcase" },
	{ id: "skill", label: "Skill Building", icon: "construct" },
	{ id: "certification", label: "Certification", icon: "ribbon" },
	{ id: "language", label: "Language", icon: "language" },
	{ id: "reading", label: "Reading", icon: "book" },
	{ id: "project", label: "Project", icon: "code-slash" },
] as const;

const GOAL_COLORS = [
	"#6366F1",
	"#8B5CF6",
	"#EC4899",
	"#EF4444",
	"#F97316",
	"#FBBF24",
	"#22C55E",
	"#14B8A6",
	"#06B6D4",
	"#3B82F6",
];

// SSB Interview Preparation Checklist
const SSB_PREPARATION_CHECKLIST = [
	{
		category: "Psychological Tests",
		items: [
			"TAT (Thematic Apperception Test)",
			"WAT (Word Association Test)",
			"SRT (Situation Reaction Test)",
			"SD (Self Description)",
		],
	},
	{
		category: "GTO (Group Testing Officer)",
		items: [
			"Group Discussion",
			"Group Planning Exercise",
			"Progressive Group Task",
			"Half Group Task",
			"Individual Obstacles",
			"Command Task",
			"Final Group Task",
		],
	},
	{
		category: "Personal Interview",
		items: [
			"Self-awareness & confidence",
			"Current Affairs & General Knowledge",
			"Subject knowledge (Academic background)",
			"Reasoning & Communication skills",
		],
	},
	{
		category: "Physical Fitness",
		items: [
			"Running (1.6 km in 7-8 minutes)",
			"Push-ups, Pull-ups, Sit-ups",
			"Obstacle training",
			"Swimming (if applicable)",
		],
	},
	{
		category: "Knowledge Areas",
		items: [
			"Current Affairs (National & International)",
			"Defense & Military knowledge",
			"Indian Armed Forces structure",
			"Geography, History, Polity basics",
		],
	},
	{
		category: "Personal Development",
		items: [
			"Leadership qualities",
			"OLQs (Officer Like Qualities)",
			"Communication skills",
			"Body language & presentation",
		],
	},
];

export default function StudyDashboard({
	theme,
	onOpenDrawer,
	subscriptionCheck,
}: StudyDashboardProps) {
	const {
		studyGoals,
		subjects,
		studySessions,
		flashcardDecks,
		streak,
		activeSession,
		dailyPlans,
		revisionSchedule,
		addStudyGoal,
		updateStudyGoal,
		addSubject,
		startSession,
		getGoalProgress,
		getTodaySessions,
		getTodayRevisions,
		getDueCards,
		getStudyAnalytics,
		deleteStudyGoal,
		endSession,
	} = useStudyStore();

	const styles = createStyles(theme);

	const [showAddGoal, setShowAddGoal] = useState(false);
	const [showQuickSession, setShowQuickSession] = useState(false);
	const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
	const [showActiveSession, setShowActiveSession] = useState(false);
	const [editingGoal, setEditingGoal] = useState<string | null>(null);

	// Add Goal Form State
	const [goalName, setGoalName] = useState("");
	const [goalType, setGoalType] = useState<string>("exam");
	const [goalDescription, setGoalDescription] = useState("");
	const [goalTargetDate, setGoalTargetDate] = useState("");
	const [goalColor, setGoalColor] = useState(GOAL_COLORS[0]);
	const [goalTargetHours, setGoalTargetHours] = useState("");
	const [showSSBChecklist, setShowSSBChecklist] = useState(false);
	const [creatingSubjects, setCreatingSubjects] = useState(false);

	// Analytics
	const todaySessions = useMemo(() => getTodaySessions(), [studySessions]);
	const todayMinutes = useMemo(
		() => todaySessions.reduce((sum, s) => sum + s.duration, 0),
		[todaySessions]
	);
	const dueCards = useMemo(() => getDueCards(), []);
	const todayRevisions = useMemo(() => getTodayRevisions(), [revisionSchedule]);
	const analytics = useMemo(
		() => getStudyAnalytics(),
		[studySessions, subjects]
	);

	// Delete goal handler
	const handleDeleteGoal = (goalId: string, goalName: string) => {
		Alert.alert(
			"Delete Goal",
			`Are you sure you want to delete the goal "${goalName}"? This cannot be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						setDeletingGoalId(goalId);
						await deleteStudyGoal(goalId);
						setDeletingGoalId(null);
					},
				},
			]
		);
	};

	// End active session handler
	const handleEndSession = async () => {
		if (!activeSession) return;
		Alert.alert(
			"End Session",
			"Are you sure you want to end the current study session?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "End Session",
					style: "default",
					onPress: async () => {
						await endSession(activeSession.id);
						setShowActiveSession(false);
					},
				},
			]
		);
	};

	const activeGoals = useMemo(
		() => studyGoals.filter((g) => g.status === "in_progress"),
		[studyGoals]
	);

	const formatTime = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	};

	const handleAddGoal = async () => {
		if (!goalName.trim()) {
			Alert.alert("Error", "Please enter goal name");
			return;
		}

		if (editingGoal) {
			// Update existing goal
			await updateStudyGoal(editingGoal, {
				name: goalName,
				type: goalType as any,
				description: goalDescription || undefined,
				color: goalColor,
				targetDate: goalTargetDate || undefined,
				totalHoursTarget: goalTargetHours
					? parseFloat(goalTargetHours)
					: undefined,
			});
			Alert.alert("Success", "Study goal updated!");
		} else {
			// Create new goal
			const newGoalData = {
				name: goalName,
				type: goalType as any,
				description: goalDescription || undefined,
				targetDate: goalTargetDate || undefined,
				startDate: new Date().toISOString(),
				status: "in_progress" as any,
				priority: "medium" as any,
				totalHoursTarget: goalTargetHours
					? parseFloat(goalTargetHours)
					: undefined,
				color: goalColor,
			};

			await addStudyGoal(newGoalData);

			// If interview type and checklist is shown, ask to create subjects
			if (goalType === "interview" && showSSBChecklist) {
				// Give a tiny delay to let state update
				setTimeout(() => {
					const newestGoal = studyGoals[studyGoals.length - 1];
					if (newestGoal && newestGoal.name === goalName) {
						Alert.alert(
							"Create SSB Subjects?",
							`Would you like to automatically create ${SSB_PREPARATION_CHECKLIST.length} subjects for SSB preparation?`,
							[
								{ text: "Later", style: "cancel" },
								{
									text: "Create",
									onPress: () => handleCreateSSBSubjects(newestGoal.id),
								},
							]
						);
					}
				}, 300);
			}
			Alert.alert("Success", "Study goal created!");
		}

		resetGoalForm();
		setShowAddGoal(false);
	};

	const resetGoalForm = () => {
		setGoalName("");
		setGoalType("exam");
		setGoalDescription("");
		setGoalTargetDate("");
		setGoalColor(GOAL_COLORS[0]);
		setGoalTargetHours("");
		setShowSSBChecklist(false);
		setEditingGoal(null);
	};

	const handleEditGoal = (goal: any) => {
		setGoalName(goal.name);
		setGoalType(goal.type);
		setGoalDescription(goal.description || "");
		setGoalTargetDate(goal.targetDate || "");
		setGoalColor(goal.color || GOAL_COLORS[0]);
		setGoalTargetHours(goal.totalHoursTarget?.toString() || "");
		setEditingGoal(goal.id);
		setShowAddGoal(true);
	};

	const handleCreateSSBSubjects = async (goalId: string) => {
		if (creatingSubjects) return;

		setCreatingSubjects(true);
		try {
			// Create subjects for each SSB category
			for (const section of SSB_PREPARATION_CHECKLIST) {
				await addSubject({
					goalId: goalId,
					name: section.category,
					description: `Prepare for: ${section.items.join(", ")}`,
					color: goalColor,
					difficulty: "hard" as any,
					priority: "high" as any,
					status: "not_started" as any,
					order: SSB_PREPARATION_CHECKLIST.indexOf(section),
				});
			}
			Alert.alert(
				"Success",
				`Created ${SSB_PREPARATION_CHECKLIST.length} subjects for SSB preparation!`
			);
			setShowSSBChecklist(false);
		} catch (error) {
			console.error("Error creating SSB subjects:", error);
			Alert.alert("Error", "Failed to create subjects");
		} finally {
			setCreatingSubjects(false);
		}
	};

	const handleQuickStart = async (goalId?: string) => {
		await startSession({
			type: "study",
			startTime: new Date().toISOString(),
			goalId,
		});
		setShowQuickSession(false);
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Header Stats */}
			<View style={styles.statsRow}>
				<View
					style={[styles.statCard, { backgroundColor: theme.primary + "15" }]}
				>
					<Ionicons name="flame" size={24} color={theme.primary} />
					<Text style={styles.statValue}>{streak.currentStreak}</Text>
					<Text style={styles.statLabel}>Day Streak</Text>
				</View>
				<View
					style={[styles.statCard, { backgroundColor: theme.success + "15" }]}
				>
					<Ionicons name="time" size={24} color={theme.success} />
					<Text style={styles.statValue}>{formatTime(todayMinutes)}</Text>
					<Text style={styles.statLabel}>Today</Text>
				</View>
				<View
					style={[styles.statCard, { backgroundColor: theme.accent + "15" }]}
				>
					<Ionicons name="albums" size={24} color={theme.accent} />
					<Text style={styles.statValue}>{dueCards.length}</Text>
					<Text style={styles.statLabel}>Cards Due</Text>
				</View>
			</View>

			{/* Active Session Banner */}
			{activeSession && (
				<TouchableOpacity
					style={styles.activeSessionBanner}
					onPress={() => setShowActiveSession(true)}
				>
					<View style={styles.activeSessionLeft}>
						<View style={styles.pulsingDot} />
						<Text style={styles.activeSessionText}>Session in progress</Text>
					</View>
					<Ionicons name="arrow-forward" size={20} color="#fff" />
				</TouchableOpacity>
			)}

			{/* Quick Actions */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Quick Actions</Text>
				<View style={styles.quickActionsRow}>
					<TouchableOpacity
						style={[styles.quickAction, { backgroundColor: theme.primary }]}
						onPress={() => setShowQuickSession(true)}
					>
						<Ionicons name="play" size={22} color="#fff" />
						<Text style={styles.quickActionText}>Start Study</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.quickAction, { backgroundColor: theme.accent }]}
						onPress={() => setShowAddGoal(true)}
					>
						<Ionicons name="add" size={22} color="#fff" />
						<Text style={styles.quickActionText}>New Goal</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Today's Plan */}
			{todayRevisions.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Today's Revisions</Text>
						<Text style={styles.sectionBadge}>{todayRevisions.length}</Text>
					</View>
					{todayRevisions.slice(0, 3).map((revision) => (
						<View key={revision.id} style={styles.revisionItem}>
							<View
								style={[styles.revisionDot, { backgroundColor: theme.warning }]}
							/>
							<View style={styles.revisionContent}>
								<Text style={styles.revisionTitle}>{revision.title}</Text>
								{revision.scheduledTime && (
									<Text style={styles.revisionTime}>
										{revision.scheduledTime}
									</Text>
								)}
							</View>
							{revision.isCompleted ? (
								<Ionicons
									name="checkmark-circle"
									size={22}
									color={theme.success}
								/>
							) : (
								<Ionicons
									name="ellipse-outline"
									size={22}
									color={theme.textMuted}
								/>
							)}
						</View>
					))}
				</View>
			)}

			{/* Active Goals */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Active Goals</Text>
					<TouchableOpacity onPress={() => setShowAddGoal(true)}>
						<Ionicons name="add-circle" size={24} color={theme.primary} />
					</TouchableOpacity>
				</View>

				{activeGoals.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons name="flag-outline" size={48} color={theme.textMuted} />
						<Text style={styles.emptyText}>No active goals</Text>
						<Text style={styles.emptySubtext}>
							Create a study goal to get started
						</Text>
						<TouchableOpacity
							style={styles.emptyButton}
							onPress={() => setShowAddGoal(true)}
						>
							<Text style={styles.emptyButtonText}>Add Goal</Text>
						</TouchableOpacity>
					</View>
				) : (
					activeGoals.map((goal) => {
						const progress = getGoalProgress(goal.id);
						const goalSubjects = subjects.filter((s) => s.goalId === goal.id);
						return (
							<View
								key={goal.id}
								style={[
									styles.goalCard,
									{ borderLeftColor: goal.color || theme.primary },
								]}
							>
								<View style={styles.goalHeader}>
									<View style={styles.goalInfo}>
										<Text style={styles.goalName}>{goal.name}</Text>
										<Text style={styles.goalType}>
											{GOAL_TYPES.find((t) => t.id === goal.type)?.label ||
												goal.type}
										</Text>
									</View>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: 8,
										}}
									>
										<View style={styles.goalProgress}>
											<Text style={styles.goalProgressText}>{progress}%</Text>
										</View>
										<TouchableOpacity
											onPress={() => handleEditGoal(goal)}
											hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
										>
											<Ionicons
												name="pencil-outline"
												size={20}
												color={theme.primary}
											/>
										</TouchableOpacity>
										<TouchableOpacity
											onPress={() => handleDeleteGoal(goal.id, goal.name)}
											style={{ opacity: deletingGoalId === goal.id ? 0.5 : 1 }}
											disabled={deletingGoalId === goal.id}
											hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
										>
											<Ionicons
												name="trash-outline"
												size={20}
												color={theme.error}
											/>
										</TouchableOpacity>
									</View>
								</View>
								<View style={styles.progressBar}>
									<View
										style={[
											styles.progressFill,
											{
												width: `${progress}%`,
												backgroundColor: goal.color || theme.primary,
											},
										]}
									/>
								</View>
								<View style={styles.goalStats}>
									<Text style={styles.goalStatText}>
										{goal.totalHoursSpent.toFixed(1)}h studied
									</Text>
									<Text style={styles.goalStatText}>
										{goalSubjects.length} subjects
									</Text>
									{goal.targetDate && (
										<Text style={styles.goalStatText}>
											Due: {new Date(goal.targetDate).toLocaleDateString()}
										</Text>
									)}
								</View>
							</View>
						);
					})
				)}
			</View>

			{/* Weekly Overview */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>This Week</Text>
				<View style={styles.weekOverview}>
					<View style={styles.weekStat}>
						<Text style={styles.weekStatValue}>
							{analytics.totalHoursStudied.toFixed(1)}h
						</Text>
						<Text style={styles.weekStatLabel}>Total Study</Text>
					</View>
					<View style={styles.weekDivider} />
					<View style={styles.weekStat}>
						<Text style={styles.weekStatValue}>
							{Math.round(analytics.averageFocusScore * 10) / 10}
						</Text>
						<Text style={styles.weekStatLabel}>Avg Focus</Text>
					</View>
					<View style={styles.weekDivider} />
					<View style={styles.weekStat}>
						<Text style={styles.weekStatValue}>
							{analytics.flashcardStats.mastered}
						</Text>
						<Text style={styles.weekStatLabel}>Cards Mastered</Text>
					</View>
				</View>
			</View>

			{/* Add Goal Modal */}
			<Modal visible={showAddGoal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingGoal ? "Edit Study Goal" : "Create Study Goal"}
							</Text>
							<TouchableOpacity onPress={() => setShowAddGoal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.inputLabel}>Goal Name *</Text>
							<TextInput
								style={styles.input}
								value={goalName}
								onChangeText={setGoalName}
								placeholder="e.g., JEE Mains 2025, DSA for Interviews"
								placeholderTextColor={theme.textMuted}
							/>

							<Text style={styles.inputLabel}>Goal Type</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.typeSelector}
							>
								{GOAL_TYPES.map((type) => (
									<TouchableOpacity
										key={type.id}
										style={[
											styles.typeOption,
											goalType === type.id && styles.typeOptionActive,
										]}
										onPress={() => setGoalType(type.id)}
									>
										<Ionicons
											name={type.icon as any}
											size={20}
											color={goalType === type.id ? "#fff" : theme.text}
										/>
										<Text
											style={[
												styles.typeOptionText,
												goalType === type.id && styles.typeOptionTextActive,
											]}
										>
											{type.label}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>

							{/* SSB Interview Checklist Button */}
							{goalType === "interview" && (
								<TouchableOpacity
									style={styles.ssbButton}
									onPress={() => setShowSSBChecklist(!showSSBChecklist)}
								>
									<Ionicons
										name={showSSBChecklist ? "chevron-down" : "chevron-forward"}
										size={20}
										color={theme.primary}
									/>
									<Text style={styles.ssbButtonText}>
										SSB Interview Preparation Checklist
									</Text>
								</TouchableOpacity>
							)}

							{/* SSB Checklist Display */}
							{goalType === "interview" && showSSBChecklist && (
								<View>
									<ScrollView style={styles.ssbChecklist} nestedScrollEnabled>
										{SSB_PREPARATION_CHECKLIST.map((section, index) => (
											<View key={index} style={styles.ssbSection}>
												<Text style={styles.ssbSectionTitle}>
													{section.category}
												</Text>
												{section.items.map((item, itemIndex) => (
													<View key={itemIndex} style={styles.ssbItem}>
														<Ionicons
															name="checkmark-circle-outline"
															size={16}
															color="#4CAF50"
														/>
														<Text style={styles.ssbItemText}>{item}</Text>
													</View>
												))}
											</View>
										))}
									</ScrollView>
									<Text style={styles.ssbNote}>
										💡 Tip: After creating this goal, you can auto-create
										subjects for each preparation category
									</Text>
								</View>
							)}

							<Text style={styles.inputLabel}>Description (Optional)</Text>
							<TextInput
								style={[styles.input, styles.inputMultiline]}
								value={goalDescription}
								onChangeText={setGoalDescription}
								placeholder="What do you want to achieve?"
								placeholderTextColor={theme.textMuted}
								multiline
								numberOfLines={3}
							/>

							<Text style={styles.inputLabel}>Target Hours (Optional)</Text>
							<TextInput
								style={styles.input}
								value={goalTargetHours}
								onChangeText={setGoalTargetHours}
								placeholder="e.g., 100"
								placeholderTextColor={theme.textMuted}
								keyboardType="numeric"
							/>

							<Text style={styles.inputLabel}>Color</Text>
							<View style={styles.colorRow}>
								{GOAL_COLORS.map((color) => (
									<TouchableOpacity
										key={color}
										style={[
											styles.colorOption,
											{ backgroundColor: color },
											goalColor === color && styles.colorOptionActive,
										]}
										onPress={() => setGoalColor(color)}
									>
										{goalColor === color && (
											<Ionicons name="checkmark" size={16} color="#fff" />
										)}
									</TouchableOpacity>
								))}
							</View>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleAddGoal}
							>
								<Text style={styles.submitButtonText}>
									{editingGoal ? "Update Goal" : "Create Goal"}
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Quick Session Modal */}
			<Modal visible={showQuickSession} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Start Study Session</Text>
							<TouchableOpacity onPress={() => setShowQuickSession(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={styles.quickStartOption}
							onPress={() => handleQuickStart()}
						>
							<Ionicons name="flash" size={24} color={theme.primary} />
							<View style={styles.quickStartContent}>
								<Text style={styles.quickStartTitle}>Quick Session</Text>
								<Text style={styles.quickStartDesc}>
									Start without selecting a goal
								</Text>
							</View>
							<Ionicons
								name="arrow-forward"
								size={20}
								color={theme.textMuted}
							/>
						</TouchableOpacity>

						{activeGoals.length > 0 && (
							<>
								<Text style={styles.quickStartDivider}>Or select a goal</Text>
								{activeGoals.map((goal) => (
									<TouchableOpacity
										key={goal.id}
										style={styles.quickStartOption}
										onPress={() => handleQuickStart(goal.id)}
									>
										<View
											style={[
												styles.goalColorDot,
												{ backgroundColor: goal.color || theme.primary },
											]}
										/>
										<View style={styles.quickStartContent}>
											<Text style={styles.quickStartTitle}>{goal.name}</Text>
											<Text style={styles.quickStartDesc}>
												{goal.totalHoursSpent.toFixed(1)}h studied
											</Text>
										</View>
										<Ionicons
											name="arrow-forward"
											size={20}
											color={theme.textMuted}
										/>
									</TouchableOpacity>
								))}
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Active Session Modal */}
			<Modal visible={showActiveSession} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Active Session</Text>
							<TouchableOpacity onPress={() => setShowActiveSession(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{activeSession && (
							<View style={{ paddingVertical: 20 }}>
								<View style={styles.sessionDetailRow}>
									<Ionicons
										name="time-outline"
										size={24}
										color={theme.primary}
									/>
									<View style={{ flex: 1, marginLeft: 12 }}>
										<Text style={styles.sessionDetailLabel}>Duration</Text>
										<Text style={styles.sessionDetailValue}>
											{formatTime(
												Math.round(
													(Date.now() -
														new Date(activeSession.startTime).getTime()) /
														60000
												)
											)}
										</Text>
									</View>
								</View>

								{activeSession.goalId && (
									<View style={styles.sessionDetailRow}>
										<Ionicons
											name="flag-outline"
											size={24}
											color={theme.success}
										/>
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.sessionDetailLabel}>Goal</Text>
											<Text style={styles.sessionDetailValue}>
												{studyGoals.find((g) => g.id === activeSession.goalId)
													?.name || "Unknown"}
											</Text>
										</View>
									</View>
								)}

								{activeSession.subjectId && (
									<View style={styles.sessionDetailRow}>
										<Ionicons
											name="book-outline"
											size={24}
											color={theme.accent}
										/>
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.sessionDetailLabel}>Subject</Text>
											<Text style={styles.sessionDetailValue}>
												{subjects.find((s) => s.id === activeSession.subjectId)
													?.name || "Unknown"}
											</Text>
										</View>
									</View>
								)}

								<View style={styles.sessionDetailRow}>
									<Ionicons
										name="albums-outline"
										size={24}
										color={theme.warning}
									/>
									<View style={{ flex: 1, marginLeft: 12 }}>
										<Text style={styles.sessionDetailLabel}>Type</Text>
										<Text style={styles.sessionDetailValue}>
											{activeSession.type.charAt(0).toUpperCase() +
												activeSession.type.slice(1)}
										</Text>
									</View>
								</View>

								<TouchableOpacity
									style={[
										styles.endSessionButton,
										{ backgroundColor: theme.error },
									]}
									onPress={handleEndSession}
								>
									<Ionicons name="stop-circle-outline" size={24} color="#fff" />
									<Text style={styles.endSessionButtonText}>End Session</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</Modal>

			<View style={{ height: 100 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
			padding: 16,
		},
		statsRow: {
			flexDirection: "row",
			gap: 12,
			marginBottom: 20,
		},
		statCard: {
			flex: 1,
			padding: 16,
			borderRadius: 16,
			alignItems: "center",
			gap: 8,
		},
		statValue: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		activeSessionBanner: {
			backgroundColor: theme.success,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 16,
			borderRadius: 12,
			marginBottom: 20,
		},
		activeSessionLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		pulsingDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			backgroundColor: "#fff",
		},
		activeSessionText: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 15,
		},
		section: {
			marginBottom: 24,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 12,
		},
		sectionBadge: {
			backgroundColor: theme.primary,
			color: "#fff",
			fontSize: 12,
			fontWeight: "600",
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 10,
		},
		quickActionsRow: {
			flexDirection: "row",
			gap: 12,
		},
		quickAction: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: 16,
			borderRadius: 12,
		},
		quickActionText: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 15,
		},
		revisionItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			marginBottom: 8,
			gap: 12,
		},
		revisionDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		revisionContent: {
			flex: 1,
		},
		revisionTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		revisionTime: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		emptyState: {
			alignItems: "center",
			padding: 32,
			backgroundColor: theme.surface,
			borderRadius: 16,
		},
		emptyText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginTop: 12,
		},
		emptySubtext: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		emptyButton: {
			marginTop: 16,
			backgroundColor: theme.primary,
			paddingHorizontal: 20,
			paddingVertical: 10,
			borderRadius: 8,
		},
		emptyButtonText: {
			color: "#fff",
			fontWeight: "600",
		},
		goalCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			borderLeftWidth: 4,
		},
		goalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		goalInfo: {
			flex: 1,
		},
		goalName: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		goalType: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		goalProgress: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
		},
		goalProgressText: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.primary,
		},
		progressBar: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			overflow: "hidden",
		},
		progressFill: {
			height: "100%",
			borderRadius: 3,
		},
		goalStats: {
			flexDirection: "row",
			gap: 16,
			marginTop: 12,
		},
		goalStatText: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		weekOverview: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
		},
		weekStat: {
			flex: 1,
			alignItems: "center",
		},
		weekStatValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		weekStatLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		weekDivider: {
			width: 1,
			backgroundColor: theme.border,
			marginHorizontal: 8,
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
			maxHeight: "85%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
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
			minHeight: 80,
			textAlignVertical: "top",
		},
		typeSelector: {
			marginBottom: 8,
		},
		typeOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 20,
			backgroundColor: theme.surface,
			marginRight: 10,
		},
		typeOptionActive: {
			backgroundColor: theme.primary,
		},
		typeOptionText: {
			fontSize: 14,
			color: theme.text,
		},
		typeOptionTextActive: {
			color: "#fff",
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
			marginBottom: 20,
		},
		submitButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "700",
		},
		quickStartOption: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 16,
			borderRadius: 12,
			marginBottom: 10,
			gap: 14,
		},
		quickStartContent: {
			flex: 1,
		},
		quickStartTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		quickStartDesc: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		quickStartDivider: {
			textAlign: "center",
			color: theme.textMuted,
			fontSize: 13,
			marginVertical: 12,
		},
		goalColorDot: {
			width: 24,
			height: 24,
			borderRadius: 12,
		},
		ssbButton: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.primary + "40",
			padding: 12,
			borderRadius: 8,
			marginTop: 12,
			gap: 8,
		},
		ssbButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.primary,
		},
		ssbChecklist: {
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 8,
			padding: 12,
			marginTop: 8,
			maxHeight: 300,
		},
		ssbSection: {
			marginBottom: 16,
		},
		ssbSectionTitle: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		ssbItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 6,
			paddingLeft: 8,
		},
		ssbItemText: {
			fontSize: 13,
			color: theme.textSecondary,
			flex: 1,
		},
		ssbNote: {
			fontSize: 12,
			color: theme.textSecondary,
			fontStyle: "italic",
			marginTop: 8,
			padding: 8,
			backgroundColor: theme.primary + "10",
			borderRadius: 6,
		},
		sessionDetailRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		sessionDetailLabel: {
			fontSize: 13,
			color: theme.textSecondary,
			marginBottom: 4,
		},
		sessionDetailValue: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		endSessionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: 16,
			borderRadius: 12,
			marginTop: 24,
		},
		endSessionButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#fff",
		},
	});
