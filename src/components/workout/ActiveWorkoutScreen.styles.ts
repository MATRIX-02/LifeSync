import { Theme } from "@/src/context/themeContext";
import { StyleSheet } from "react-native";

export const createStyles = (theme: Theme) =>
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
		valueCol: {
			flex: 1,
		},
		timeCell: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
		},
		timeInput: {
			minWidth: 48,
		},
		timeOvertime: {
			color: theme.warning,
		},
		timeRunning: {
			minWidth: 48,
			color: theme.primary,
			fontWeight: "700",
			fontVariant: ["tabular-nums"],
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
		exerciseListItemInfo: {
			paddingHorizontal: 10,
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
