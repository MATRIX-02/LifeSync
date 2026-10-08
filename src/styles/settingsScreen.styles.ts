import { Theme } from "@/src/context/themeContext";
import { StyleSheet } from "react-native";

// Dynamic styles
export const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},

		// Header
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		backButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		placeholder: {
			width: 44,
		},

		// Sections
		section: {
			marginTop: 24,
			paddingHorizontal: 20,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.textMuted,
			marginBottom: 12,
			letterSpacing: 1.2,
		},
		quotaNote: {
			fontSize: 11,
			color: theme.textMuted,
			lineHeight: 16,
			marginTop: 8,
			paddingHorizontal: 4,
		},

		// Setting Cards
		settingCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			overflow: "hidden",
		},
		settingRow: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		settingIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		settingContent: {
			flex: 1,
			marginLeft: 14,
		},
		settingLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		settingDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		divider: {
			height: 1,
			backgroundColor: theme.border,
			marginLeft: 74,
		},
		thinDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginHorizontal: 12,
		},

		// Compact Data Management
		compactHeader: {
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 8,
		},
		compactHeaderText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		compactActions: {
			flexDirection: "row",
			padding: 12,
			gap: 8,
		},
		compactButton: {
			flex: 1,
			flexDirection: "column",
			alignItems: "center",
			padding: 12,
			borderRadius: 12,
			backgroundColor: theme.background,
			gap: 6,
		},
		compactIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		compactButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
		},
		compactButtonSubText: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		moduleRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		moduleRowControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		moduleRowContainer: {
			backgroundColor: theme.surface,
		},
		moduleMoveButtons: {
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 0,
		},
		moduleMoveButton: {
			width: 32,
			height: 20,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 6,
		},
		moduleMoveButtonDisabled: {
			opacity: 0.35,
		},
		moduleInfo: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		moduleLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		moduleActions: {
			flexDirection: "row",
			gap: 16,
		},
		iconButton: {
			padding: 4,
		},

		// Cloud Sync Styles
		cloudHeaderRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		cloudBadge: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#10B981" + "20",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12,
			gap: 4,
		},
		cloudBadgeText: {
			fontSize: 11,
			fontWeight: "600",
			color: "#10B981",
		},
		syncTimeText: {
			fontSize: 10,
			color: theme.textMuted,
			marginTop: 1,
		},
		signInPrompt: {
			alignItems: "center",
			padding: 24,
		},
		signInPromptTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginTop: 12,
		},
		signInPromptText: {
			fontSize: 13,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 8,
			lineHeight: 18,
		},
		signInButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 12,
			marginTop: 16,
		},
		signInButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFFFFF",
		},

		// Badge
		badge: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
		},
		badgeText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},

		// Footer
		footer: {
			alignItems: "center",
			marginVertical: 40,
			paddingHorizontal: 24,
		},
		logoContainer: {
			width: 72,
			height: 72,
			borderRadius: 20,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
			overflow: "hidden",
		},
		logoImage: {
			width: 64,
			height: 64,
			borderRadius: 16,
		},
		footerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		footerSubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 6,
			textAlign: "center",
		},
		footerCopyright: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 16,
		},

		// Modal Styles
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		modalContent: {
			// flex: 1,
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		emptyState: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 60,
		},
		emptyStateText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			textAlign: "center",
		},
		emptyStateSubtext: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 8,
			textAlign: "center",
			maxWidth: "80%",
		},
		remindersList: {
			gap: 12,
		},
		reminderCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			gap: 10,
			marginBottom: 10,
		},
		reminderCardHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		reminderKindIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		reminderNext: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.primary,
		},
		reminderCount: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		reminderTimeRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
		},
		reminderTimeChip: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
			backgroundColor: theme.surfaceLight,
		},
		reminderTimeChipText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textSecondary,
			fontVariant: ["tabular-nums"],
		},
		reminderSummary: {
			paddingHorizontal: 16,
			paddingBottom: 12,
			gap: 8,
		},
		reminderSummaryCount: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.textSecondary,
		},
		reminderChipRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
		},
		reminderKindChip: {
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 20,
			borderWidth: 1,
		},
		reminderKindChipText: {
			fontSize: 11,
			fontWeight: "700",
		},
		reminderTitle: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 4,
		},
		reminderBody: {
			fontSize: 13,
			color: theme.textSecondary,
			marginBottom: 8,
		},
		modalOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.4)",
			justifyContent: "center",
			alignItems: "center",
		},
		modalCard: {
			width: "92%",
			borderRadius: 12,
			overflow: "hidden",
			backgroundColor: theme.surface,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.1,
			shadowRadius: 8,
			elevation: 8,
		},
		modalOption: {
			paddingVertical: 12,
			paddingHorizontal: 16,
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalActions: {
			flexDirection: "row",
			padding: 12,
			gap: 12,
			justifyContent: "space-between",
		},
		modalActionBtn: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.background,
		},
	});
