import { Theme } from "@/src/context/themeContext";
import { StyleSheet } from "react-native";

export const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		backButton: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		editButton: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: theme.primary,
			borderRadius: 20,
		},
		editButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},

		// Avatar Section
		avatarSection: {
			alignItems: "center",
			paddingVertical: 24,
		},
		avatarContainer: {
			position: "relative",
		},
		avatar: {
			width: 100,
			height: 100,
			borderRadius: 50,
		},
		avatarPlaceholder: {
			width: 100,
			height: 100,
			borderRadius: 50,
			justifyContent: "center",
			alignItems: "center",
		},
		avatarInitials: {
			fontSize: 36,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		cameraButton: {
			position: "absolute",
			bottom: 0,
			right: 0,
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.accent,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 3,
			borderColor: theme.background,
		},
		profileName: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginTop: 16,
		},
		profileEmail: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},

		// Form Section
		formSection: {
			paddingHorizontal: 20,
		},
		inputGroup: {
			marginBottom: 20,
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		bioInput: {
			height: 100,
			textAlignVertical: "top",
		},
		cancelButton: {
			alignItems: "center",
			paddingVertical: 14,
			marginTop: 8,
		},
		cancelButtonText: {
			color: theme.textMuted,
			fontWeight: "500",
		},

		// Stats Section
		statsSection: {
			paddingTop: 8,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 12,
			paddingHorizontal: 20,
			letterSpacing: 1,
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			paddingHorizontal: 16,
			gap: 12,
		},
		statCard: {
			width: "47%",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		statIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		statValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
			textAlign: "center",
		},

		// Bio Section
		bioSection: {
			marginTop: 24,
		},
		bioCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginHorizontal: 20,
		},
		bioText: {
			fontSize: 15,
			color: theme.textSecondary,
			lineHeight: 22,
		},

		// Actions Section
		actionsSection: {
			marginTop: 24,
		},
		actionsList: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			marginHorizontal: 20,
			overflow: "hidden",
		},
		actionItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		actionIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		actionContent: {
			flex: 1,
		},
		actionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		actionDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		actionDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginLeft: 70,
		},

		// Tab Styles
		tabContainer: {
			flexDirection: "row",
			marginHorizontal: 20,
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 4,
			marginBottom: 8,
		},
		tab: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 10,
			borderRadius: 10,
			gap: 6,
		},
		tabActive: {
			backgroundColor: theme.background,
		},
		tabText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		tabTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},

		// Body Map Section
		bodyMapSection: {
			alignItems: "center",
			paddingVertical: 16,
		},
		bodyViewToggle: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 16,
		},
		bodyViewBtn: {
			paddingVertical: 8,
			paddingHorizontal: 24,
			borderRadius: 8,
		},
		bodyViewBtnActive: {
			backgroundColor: theme.primary,
		},
		bodyViewBtnText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		bodyViewBtnTextActive: {
			color: "#FFFFFF",
		},
		bodyMapContainer: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 16,
			marginHorizontal: 20,
		},
		selectedMuscleCard: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.surface,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 12,
			marginTop: 12,
		},
		muscleColorDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
		},
		selectedMuscleName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		selectedMuscleActivity: {
			fontSize: 14,
			color: theme.textMuted,
			marginLeft: "auto",
		},
		bodyStats: {
			flexDirection: "row",
			justifyContent: "center",
			gap: 24,
			marginTop: 16,
		},
		bodyStat: {
			alignItems: "center",
		},
		bodyStatValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		bodyStatLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},

		// Gender Selector
		genderSelector: {
			flexDirection: "row",
			gap: 10,
		},
		genderOption: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
			gap: 6,
		},
		genderOptionActive: {
			backgroundColor: theme.primary,
		},
		genderText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		genderTextActive: {
			color: "#FFFFFF",
		},

		// Row Inputs
		rowInputs: {
			flexDirection: "row",
		},

		// Level Selector
		levelSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		levelOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
		},
		levelOptionActive: {
			backgroundColor: theme.primary,
		},
		levelText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		levelTextActive: {
			color: "#FFFFFF",
		},

		// Goals Grid
		goalsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		goalOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 10,
			gap: 6,
		},
		goalOptionActive: {
			backgroundColor: theme.primary,
		},
		goalText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		goalTextActive: {
			color: "#FFFFFF",
		},

		injuriesInput: {
			minHeight: 80,
			textAlignVertical: "top",
			paddingTop: 12,
		},
		inputHint: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 6,
		},
		// Weekly Goal Selector
		weeklyGoalSelector: {
			flexDirection: "row",
			gap: 8,
		},
		weeklyOption: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		weeklyOptionActive: {
			backgroundColor: theme.primary,
		},
		weeklyText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.textMuted,
		},
		weeklyTextActive: {
			color: "#FFFFFF",
		},

		// Fitness Cards Section
		fitnessCardsSection: {
			flexDirection: "row",
			flexWrap: "wrap",
			paddingHorizontal: 16,
			gap: 12,
		},
		fitnessCard: {
			width: "47%",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		fitnessCardIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 10,
		},
		fitnessCardTitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 4,
		},
		fitnessCardValue: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},

		// Goals Display Section
		goalsSection: {
			marginTop: 20,
		},
		goalsDisplayGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			paddingHorizontal: 20,
		},
		goalDisplayChip: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.primary + "15",
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 20,
			gap: 6,
		},
		goalDisplayText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.primary,
		},

		// Empty Fitness State
		emptyFitness: {
			alignItems: "center",
			paddingVertical: 40,
			paddingHorizontal: 20,
		},
		emptyFitnessIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyFitnessTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		emptyFitnessSubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginBottom: 20,
		},
		setupButton: {
			backgroundColor: theme.primary,
			paddingVertical: 14,
			paddingHorizontal: 28,
			borderRadius: 14,
		},
		setupButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#FFFFFF",
		},

		// Sign Out Section
		signOutSection: {
			marginTop: 24,
			marginHorizontal: 20,
		},
		signOutButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surface,
			paddingVertical: 16,
			paddingHorizontal: 24,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: "#FF3B30" + "30",
			gap: 10,
		},
		signOutText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FF3B30",
		},
	});
