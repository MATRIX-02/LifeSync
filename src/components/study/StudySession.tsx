// Study Session - Timer-based study session with Pomodoro support

import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { SessionType, useStudyStore } from "@/src/context/studyStoreDB/index";
import { Theme } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Dimensions,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	Vibration,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

interface StudySessionProps {
	theme: Theme;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentMonthSessionCount: number;
}

const SESSION_TYPES: { value: SessionType; label: string; icon: string }[] = [
	{ value: "study", label: "Study", icon: "book" },
	{ value: "revision", label: "Revision", icon: "refresh" },
	{ value: "practice", label: "Practice", icon: "create" },
	{ value: "test", label: "Mock Test", icon: "timer" },
	{ value: "reading", label: "Reading", icon: "newspaper" },
];

const POMODORO_WORK = 25 * 60; // 25 minutes
const POMODORO_BREAK = 5 * 60; // 5 minutes
const POMODORO_LONG_BREAK = 15 * 60; // 15 minutes

export default function StudySession({
	theme,
	onOpenDrawer,
	subscriptionCheck,
	currentMonthSessionCount,
}: StudySessionProps) {
	const {
		studyGoals,
		subjects,
		activeSession,
		studySessions,
		startSession,
		endSession,
		pauseSession,
		resumeSession,
		addBreak,
		completePomodoro,
	} = useStudyStore();

	const styles = createStyles(theme);

	// Timer state
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const [isBreak, setIsBreak] = useState(false);
	const [breakSeconds, setBreakSeconds] = useState(0);
	const [pomodoroCount, setPomodoroCount] = useState(0);
	const [pomodoroMode, setPomodoroMode] = useState(false);
	const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(POMODORO_WORK);

	// Setup modal state
	const [showSetup, setShowSetup] = useState(false);
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>();
	const [selectedSubjectId, setSelectedSubjectId] = useState<
		string | undefined
	>();
	const [selectedType, setSelectedType] = useState<SessionType>("study");
	const [showEndModal, setShowEndModal] = useState(false);
	const [focusScore, setFocusScore] = useState(7);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const activeGoals = useMemo(
		() => studyGoals.filter((g) => g.status === "in_progress"),
		[studyGoals]
	);

	const goalSubjects = useMemo(() => {
		if (!selectedGoalId) return [];
		return subjects.filter((s) => s.goalId === selectedGoalId);
	}, [subjects, selectedGoalId]);

	// Timer effect
	useEffect(() => {
		if (activeSession && !isPaused && !isBreak) {
			intervalRef.current = setInterval(() => {
				if (pomodoroMode) {
					setPomodoroTimeLeft((prev) => {
						if (prev <= 1) {
							// Pomodoro complete
							Vibration.vibrate([200, 100, 200]);
							setPomodoroCount((c) => c + 1);
							completePomodoro();
							setIsBreak(true);
							const isLongBreak = (pomodoroCount + 1) % 4 === 0;

							// Send notification
							NotificationService.scheduleNotification(
								"🎯 Pomodoro Complete!",
								isLongBreak
									? `Great work! Take a ${
											POMODORO_LONG_BREAK / 60
									  } minute break.`
									: `Well done! Take a ${POMODORO_BREAK / 60} minute break.`,
								null,
								{ type: "pomodoro_complete", count: pomodoroCount + 1 }
							).catch(console.error);

							return isLongBreak ? POMODORO_LONG_BREAK : POMODORO_BREAK;
						}
						return prev - 1;
					});
				}
				setElapsedSeconds((prev) => {
					const newElapsed = prev + 1;
					// Milestone notifications (every 30 minutes)
					if (newElapsed > 0 && newElapsed % 1800 === 0) {
						const minutes = newElapsed / 60;
						NotificationService.scheduleNotification(
							"📚 Study Milestone",
							`You've been studying for ${minutes} minutes! Keep it up!`,
							null,
							{ type: "milestone", minutes }
						).catch(console.error);
					}
					return newElapsed;
				});
			}, 1000);
		} else if (isBreak) {
			intervalRef.current = setInterval(() => {
				setBreakSeconds((prev) => prev + 1);
				if (pomodoroMode) {
					setPomodoroTimeLeft((prev) => {
						if (prev <= 1) {
							Vibration.vibrate([200, 100, 200]);
							setIsBreak(false);

							// Send notification
							NotificationService.scheduleNotification(
								"⏰ Break Over!",
								"Time to get back to studying. You've got this!",
								null,
								{ type: "break_complete" }
							).catch(console.error);

							return POMODORO_WORK;
						}
						return prev - 1;
					});
				}
			}, 1000);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [activeSession, isPaused, isBreak, pomodoroMode, pomodoroCount]);

	// Sync with active session on mount
	useEffect(() => {
		if (activeSession) {
			const startTime = new Date(activeSession.startTime).getTime();
			const elapsed = Math.floor((Date.now() - startTime) / 1000);
			setElapsedSeconds(elapsed);
			setPomodoroCount(activeSession.pomodoroCount || 0);
		} else {
			setElapsedSeconds(0);
			setBreakSeconds(0);
			setPomodoroCount(0);
			setPomodoroTimeLeft(POMODORO_WORK);
		}
	}, [activeSession?.id]);

	const formatTime = (seconds: number) => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		}
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	const handleStartSession = async () => {
		await startSession({
			type: selectedType,
			startTime: new Date().toISOString(),
			goalId: selectedGoalId,
			subjectId: selectedSubjectId,
			pomodoroCount: 0,
		});
		setShowSetup(false);
		setElapsedSeconds(0);
		setBreakSeconds(0);
		setPomodoroCount(0);
		setPomodoroTimeLeft(POMODORO_WORK);
	};

	const handlePauseResume = () => {
		if (isPaused) {
			resumeSession(activeSession!.id);
			setIsPaused(false);
		} else {
			pauseSession(activeSession!.id);
			setIsPaused(true);
		}
	};

	const handleTakeBreak = () => {
		setIsBreak(true);
		setIsPaused(true);
	};

	const handleEndBreak = () => {
		if (breakSeconds > 0) {
			addBreak(activeSession!.id, Math.ceil(breakSeconds / 60));
		}
		setIsBreak(false);
		setIsPaused(false);
		setBreakSeconds(0);
	};

	const handleEndSession = () => {
		setShowEndModal(true);
	};

	const confirmEndSession = async () => {
		await endSession(activeSession!.id, {
			focusScore,
			pomodoroCount,
		});
		setShowEndModal(false);
		setElapsedSeconds(0);
		setBreakSeconds(0);
		setPomodoroCount(0);
		setPomodoroTimeLeft(POMODORO_WORK);
		setIsPaused(false);
		setIsBreak(false);
	};

	const getSessionSubject = () => {
		if (!activeSession?.subjectId) return null;
		return subjects.find((s) => s.id === activeSession.subjectId);
	};

	const getSessionGoal = () => {
		if (!activeSession?.goalId) return null;
		return studyGoals.find((g) => g.id === activeSession.goalId);
	};

	// Recent sessions
	const recentSessions = useMemo(
		() => studySessions.filter((s) => !s.isActive).slice(0, 5),
		[studySessions]
	);

	return (
		<View style={styles.container}>
			{activeSession ? (
				// Active Session View
				<View style={styles.activeContainer}>
					{/* Session Info */}
					<View style={styles.sessionInfo}>
						{getSessionGoal() && (
							<Text style={styles.sessionGoal}>{getSessionGoal()?.name}</Text>
						)}
						{getSessionSubject() && (
							<View style={styles.subjectBadge}>
								<Ionicons
									name={(getSessionSubject()?.icon as any) || "book"}
									size={16}
									color={getSessionSubject()?.color || theme.primary}
								/>
								<Text style={styles.subjectBadgeText}>
									{getSessionSubject()?.name}
								</Text>
							</View>
						)}
					</View>

					{/* Timer Display */}
					<View style={styles.timerContainer}>
						{pomodoroMode && (
							<Text style={styles.pomodoroLabel}>
								{isBreak ? "Break" : `Pomodoro #${pomodoroCount + 1}`}
							</Text>
						)}
						<Text
							style={[
								styles.timerText,
								isBreak && { color: theme.success },
								isPaused && { color: theme.warning },
							]}
						>
							{pomodoroMode
								? formatTime(pomodoroTimeLeft)
								: formatTime(elapsedSeconds)}
						</Text>
						{pomodoroMode && (
							<Text style={styles.totalTime}>
								Total: {formatTime(elapsedSeconds)}
							</Text>
						)}
						{isBreak && (
							<Text style={styles.breakText}>
								Break time: {formatTime(breakSeconds)}
							</Text>
						)}
					</View>

					{/* Pomodoro Dots */}
					{pomodoroMode && (
						<View style={styles.pomodoroDots}>
							{[0, 1, 2, 3].map((i) => (
								<View
									key={i}
									style={[
										styles.pomodoroDot,
										i < pomodoroCount && { backgroundColor: theme.success },
									]}
								/>
							))}
						</View>
					)}

					{/* Status Indicator */}
					<View style={styles.statusRow}>
						<View
							style={[
								styles.statusDot,
								{
									backgroundColor: isBreak
										? theme.success
										: isPaused
										? theme.warning
										: theme.primary,
								},
							]}
						/>
						<Text style={styles.statusText}>
							{isBreak ? "On Break" : isPaused ? "Paused" : "Studying"}
						</Text>
					</View>

					{/* Controls */}
					<View style={styles.controls}>
						{isBreak ? (
							<TouchableOpacity
								style={[styles.controlBtn, { backgroundColor: theme.success }]}
								onPress={handleEndBreak}
							>
								<Ionicons name="play" size={28} color="#fff" />
								<Text style={styles.controlBtnText}>Resume Study</Text>
							</TouchableOpacity>
						) : (
							<>
								<TouchableOpacity
									style={[styles.controlBtn, styles.secondaryBtn]}
									onPress={handleTakeBreak}
								>
									<Ionicons name="cafe" size={24} color={theme.text} />
									<Text style={[styles.controlBtnText, { color: theme.text }]}>
										Break
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.controlBtn,
										{
											backgroundColor: isPaused ? theme.success : theme.warning,
										},
									]}
									onPress={handlePauseResume}
								>
									<Ionicons
										name={isPaused ? "play" : "pause"}
										size={28}
										color="#fff"
									/>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.controlBtn, { backgroundColor: theme.error }]}
									onPress={handleEndSession}
								>
									<Ionicons name="stop" size={24} color="#fff" />
									<Text style={styles.controlBtnText}>End</Text>
								</TouchableOpacity>
							</>
						)}
					</View>

					{/* Toggle Pomodoro */}
					<TouchableOpacity
						style={styles.pomodoroToggle}
						onPress={() => {
							setPomodoroMode(!pomodoroMode);
							if (!pomodoroMode) {
								setPomodoroTimeLeft(POMODORO_WORK);
							}
						}}
					>
						<Ionicons
							name="timer-outline"
							size={18}
							color={pomodoroMode ? theme.primary : theme.textMuted}
						/>
						<Text
							style={[
								styles.pomodoroToggleText,
								pomodoroMode && { color: theme.primary },
							]}
						>
							Pomodoro Mode {pomodoroMode ? "ON" : "OFF"}
						</Text>
					</TouchableOpacity>
				</View>
			) : (
				// No Active Session View
				<ScrollView
					style={styles.idleContainer}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.startSection}>
						<Ionicons name="timer-outline" size={64} color={theme.textMuted} />
						<Text style={styles.startTitle}>Ready to Study?</Text>
						<Text style={styles.startSubtitle}>
							Start a focused study session
						</Text>
						<TouchableOpacity
							style={styles.startButton}
							onPress={() => setShowSetup(true)}
						>
							<Ionicons name="play" size={24} color="#fff" />
							<Text style={styles.startButtonText}>Start Session</Text>
						</TouchableOpacity>
					</View>

					{/* Recent Sessions */}
					{recentSessions.length > 0 && (
						<View style={styles.recentSection}>
							<Text style={styles.sectionTitle}>Recent Sessions</Text>
							{recentSessions.map((session) => {
								const goal = studyGoals.find((g) => g.id === session.goalId);
								const subject = subjects.find(
									(s) => s.id === session.subjectId
								);
								return (
									<View key={session.id} style={styles.recentItem}>
										<View style={styles.recentLeft}>
											<Text style={styles.recentDate}>
												{new Date(session.startTime).toLocaleDateString()}
											</Text>
											<Text style={styles.recentTitle}>
												{subject?.name || goal?.name || "Quick Session"}
											</Text>
										</View>
										<View style={styles.recentRight}>
											<Text style={styles.recentDuration}>
												{Math.round(session.duration)}m
											</Text>
											{session.focusScore && (
												<Text style={styles.recentFocus}>
													Focus: {session.focusScore}/10
												</Text>
											)}
										</View>
									</View>
								);
							})}
						</View>
					)}

					<View style={{ height: 120 }} />
				</ScrollView>
			)}

			{/* Session Setup Modal */}
			<Modal visible={showSetup} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>New Study Session</Text>
							<TouchableOpacity onPress={() => setShowSetup(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.inputLabel}>Session Type</Text>
							<View style={styles.typeRow}>
								{SESSION_TYPES.map((type) => (
									<TouchableOpacity
										key={type.value}
										style={[
											styles.typeOption,
											selectedType === type.value && styles.typeOptionActive,
										]}
										onPress={() => setSelectedType(type.value)}
									>
										<Ionicons
											name={type.icon as any}
											size={20}
											color={selectedType === type.value ? "#fff" : theme.text}
										/>
										<Text
											style={[
												styles.typeText,
												selectedType === type.value && styles.typeTextActive,
											]}
										>
											{type.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.inputLabel}>Goal (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<TouchableOpacity
									style={[
										styles.goalOption,
										!selectedGoalId && styles.goalOptionActive,
									]}
									onPress={() => {
										setSelectedGoalId(undefined);
										setSelectedSubjectId(undefined);
									}}
								>
									<Text
										style={[
											styles.goalOptionText,
											!selectedGoalId && styles.goalOptionTextActive,
										]}
									>
										No Goal
									</Text>
								</TouchableOpacity>
								{activeGoals.map((goal) => (
									<TouchableOpacity
										key={goal.id}
										style={[
											styles.goalOption,
											selectedGoalId === goal.id && styles.goalOptionActive,
											selectedGoalId === goal.id && {
												borderColor: goal.color,
											},
										]}
										onPress={() => {
											setSelectedGoalId(goal.id);
											setSelectedSubjectId(undefined);
										}}
									>
										<View
											style={[
												styles.goalDot,
												{ backgroundColor: goal.color || theme.primary },
											]}
										/>
										<Text
											style={[
												styles.goalOptionText,
												selectedGoalId === goal.id &&
													styles.goalOptionTextActive,
											]}
										>
											{goal.name}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>

							{goalSubjects.length > 0 && (
								<>
									<Text style={styles.inputLabel}>Subject (Optional)</Text>
									<View style={styles.subjectGrid}>
										{goalSubjects.map((subject) => (
											<TouchableOpacity
												key={subject.id}
												style={[
													styles.subjectOption,
													selectedSubjectId === subject.id &&
														styles.subjectOptionActive,
												]}
												onPress={() => setSelectedSubjectId(subject.id)}
											>
												<Ionicons
													name={(subject.icon as any) || "book"}
													size={18}
													color={
														selectedSubjectId === subject.id
															? "#fff"
															: subject.color || theme.text
													}
												/>
												<Text
													style={[
														styles.subjectOptionText,
														selectedSubjectId === subject.id &&
															styles.subjectOptionTextActive,
													]}
												>
													{subject.name}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</>
							)}

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleStartSession}
							>
								<Ionicons name="play" size={22} color="#fff" />
								<Text style={styles.submitButtonText}>Start Session</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* End Session Modal */}
			<Modal visible={showEndModal} animationType="fade" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.endModalContent}>
						<Text style={styles.endModalTitle}>Session Complete! 🎉</Text>
						<Text style={styles.endModalDuration}>
							{formatTime(elapsedSeconds)}
						</Text>
						{pomodoroCount > 0 && (
							<Text style={styles.endModalPomodoro}>
								{pomodoroCount} Pomodoro{pomodoroCount > 1 ? "s" : ""} completed
							</Text>
						)}

						<Text style={styles.focusLabel}>How focused were you?</Text>
						<View style={styles.focusRow}>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
								<TouchableOpacity
									key={num}
									style={[
										styles.focusBtn,
										focusScore === num && styles.focusBtnActive,
									]}
									onPress={() => setFocusScore(num)}
								>
									<Text
										style={[
											styles.focusBtnText,
											focusScore === num && styles.focusBtnTextActive,
										]}
									>
										{num}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<View style={styles.endModalButtons}>
							<TouchableOpacity
								style={styles.endModalCancel}
								onPress={() => setShowEndModal(false)}
							>
								<Text style={styles.endModalCancelText}>Continue Studying</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.endModalConfirm}
								onPress={confirmEndSession}
							>
								<Text style={styles.endModalConfirmText}>End Session</Text>
							</TouchableOpacity>
						</View>
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
		activeContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			padding: 20,
		},
		sessionInfo: {
			alignItems: "center",
			marginBottom: 20,
		},
		sessionGoal: {
			fontSize: 16,
			color: theme.textSecondary,
			marginBottom: 8,
		},
		subjectBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: theme.surface,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 20,
		},
		subjectBadgeText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		timerContainer: {
			alignItems: "center",
			marginVertical: 40,
		},
		pomodoroLabel: {
			fontSize: 16,
			color: theme.textSecondary,
			marginBottom: 8,
		},
		timerText: {
			fontSize: 72,
			fontWeight: "200",
			color: theme.text,
			fontVariant: ["tabular-nums"],
		},
		totalTime: {
			fontSize: 16,
			color: theme.textSecondary,
			marginTop: 8,
		},
		breakText: {
			fontSize: 18,
			color: theme.success,
			marginTop: 8,
			fontWeight: "600",
		},
		pomodoroDots: {
			flexDirection: "row",
			gap: 12,
			marginBottom: 30,
		},
		pomodoroDot: {
			width: 16,
			height: 16,
			borderRadius: 8,
			backgroundColor: theme.border,
		},
		statusRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 40,
		},
		statusDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
		},
		statusText: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		controls: {
			flexDirection: "row",
			gap: 16,
		},
		controlBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingHorizontal: 24,
			paddingVertical: 16,
			borderRadius: 16,
			minWidth: 80,
		},
		secondaryBtn: {
			backgroundColor: theme.surface,
		},
		controlBtnText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#fff",
		},
		pomodoroToggle: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginTop: 40,
			padding: 12,
		},
		pomodoroToggleText: {
			fontSize: 14,
			color: theme.textMuted,
		},
		idleContainer: {
			flex: 1,
			padding: 20,
		},
		startSection: {
			alignItems: "center",
			paddingVertical: 60,
		},
		startTitle: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginTop: 20,
		},
		startSubtitle: {
			fontSize: 16,
			color: theme.textSecondary,
			marginTop: 8,
		},
		startButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			backgroundColor: theme.primary,
			paddingHorizontal: 32,
			paddingVertical: 16,
			borderRadius: 16,
			marginTop: 32,
		},
		startButtonText: {
			fontSize: 18,
			fontWeight: "700",
			color: "#fff",
		},
		recentSection: {
			marginTop: 20,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 16,
		},
		recentItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			backgroundColor: theme.surface,
			padding: 16,
			borderRadius: 12,
			marginBottom: 10,
		},
		recentLeft: {},
		recentDate: {
			fontSize: 12,
			color: theme.textMuted,
		},
		recentTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
			marginTop: 2,
		},
		recentRight: {
			alignItems: "flex-end",
		},
		recentDuration: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.primary,
		},
		recentFocus: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
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
			maxHeight: "80%",
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
			marginBottom: 12,
			marginTop: 16,
		},
		typeRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		typeOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 12,
			backgroundColor: theme.surface,
		},
		typeOptionActive: {
			backgroundColor: theme.primary,
		},
		typeText: {
			fontSize: 14,
			color: theme.text,
		},
		typeTextActive: {
			color: "#fff",
		},
		goalOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 20,
			backgroundColor: theme.surface,
			marginRight: 10,
			borderWidth: 2,
			borderColor: "transparent",
		},
		goalOptionActive: {
			borderColor: theme.primary,
		},
		goalDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
		},
		goalOptionText: {
			fontSize: 14,
			color: theme.text,
		},
		goalOptionTextActive: {
			fontWeight: "600",
		},
		subjectGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		subjectOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surface,
		},
		subjectOptionActive: {
			backgroundColor: theme.primary,
		},
		subjectOptionText: {
			fontSize: 14,
			color: theme.text,
		},
		subjectOptionTextActive: {
			color: "#fff",
		},
		submitButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 10,
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			marginTop: 24,
			marginBottom: 20,
		},
		submitButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "700",
		},
		// End Modal
		endModalContent: {
			backgroundColor: theme.background,
			margin: 20,
			borderRadius: 24,
			padding: 24,
			alignItems: "center",
		},
		endModalTitle: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		endModalDuration: {
			fontSize: 48,
			fontWeight: "200",
			color: theme.primary,
			marginVertical: 16,
		},
		endModalPomodoro: {
			fontSize: 16,
			color: theme.success,
			marginBottom: 20,
		},
		focusLabel: {
			fontSize: 16,
			color: theme.textSecondary,
			marginBottom: 12,
		},
		focusRow: {
			flexDirection: "row",
			gap: 6,
			marginBottom: 24,
		},
		focusBtn: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		focusBtnActive: {
			backgroundColor: theme.primary,
		},
		focusBtnText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		focusBtnTextActive: {
			color: "#fff",
		},
		endModalButtons: {
			flexDirection: "row",
			gap: 12,
			width: "100%",
		},
		endModalCancel: {
			flex: 1,
			padding: 14,
			borderRadius: 12,
			backgroundColor: theme.surface,
			alignItems: "center",
		},
		endModalCancelText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		endModalConfirm: {
			flex: 1,
			padding: 14,
			borderRadius: 12,
			backgroundColor: theme.primary,
			alignItems: "center",
		},
		endModalConfirmText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#fff",
		},
	});
