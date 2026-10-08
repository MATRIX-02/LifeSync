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
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		backButton: {
			width: 40,
			height: 40,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		headerRight: {
			flexDirection: "row",
			gap: 8,
		},
		iconButton: {
			width: 40,
			height: 40,
			justifyContent: "center",
			alignItems: "center",
		},
		placeholder: {
			width: 40,
		},

		habitInfo: {
			paddingHorizontal: 20,
			paddingBottom: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		habitQuestion: {
			fontSize: 16,
			fontWeight: "500",
			marginBottom: 8,
		},
		habitMeta: {
			flexDirection: "row",
			gap: 16,
		},
		metaItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		metaText: {
			fontSize: 13,
			color: theme.textMuted,
		},

		section: {
			paddingHorizontal: 20,
			paddingTop: 20,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 12,
		},
		sectionTitleInline: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textMuted,
		},

		overviewCard: {
			flexDirection: "row",
			alignItems: "center",
			gap: 20,
		},
		progressRingContainer: {
			position: "relative",
			width: 70,
			height: 70,
			justifyContent: "center",
			alignItems: "center",
		},
		progressTextContainer: {
			position: "absolute",
			justifyContent: "center",
			alignItems: "center",
		},
		progressPercent: {
			fontSize: 14,
			fontWeight: "700",
		},
		overviewStats: {
			flex: 1,
			flexDirection: "row",
			justifyContent: "space-around",
		},
		overviewStat: {
			alignItems: "center",
		},
		overviewValue: {
			fontSize: 16,
			fontWeight: "600",
		},
		overviewLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		scoreBasis: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 10,
			textAlign: "center",
		},

		periodDropdown: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		periodText: {
			fontSize: 14,
			color: theme.textMuted,
		},
		dropdownMenu: {
			position: "absolute",
			right: 20,
			top: 40,
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 4,
			zIndex: 100,
			elevation: 5,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.25,
			shadowRadius: 4,
		},
		dropdownItem: {
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		dropdownItemText: {
			fontSize: 14,
			color: theme.text,
		},

		chartContainer: {
			flexDirection: "row",
			height: 150,
		},
		yAxisLabels: {
			width: 40,
			justifyContent: "space-between",
			paddingVertical: 5,
		},
		yAxisLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		chartArea: {
			flex: 1,
			position: "relative",
		},
		gridLine: {
			position: "absolute",
			left: 0,
			right: 0,
			height: 1,
			backgroundColor: theme.border,
		},
		dataLine: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: 0,
			top: 0,
			flexDirection: "row",
			justifyContent: "space-around",
			alignItems: "flex-end",
		},
		dataPoint: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		xAxisContainer: {
			marginTop: 8,
		},
		xAxisLabels: {
			flexDirection: "row",
			gap: 20,
			paddingLeft: 40,
		},
		xAxisLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},

		historyChart: {
			height: 120,
		},
		barChartContainer: {
			flex: 1,
			flexDirection: "row",
			alignItems: "flex-end",
			justifyContent: "space-around",
			paddingHorizontal: 10,
		},
		barWrapper: {
			flex: 1,
			height: "100%",
			justifyContent: "flex-end",
			alignItems: "center",
			marginHorizontal: 2,
		},
		barValue: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 2,
		},
		barLabel: {
			fontSize: 9,
			color: theme.textMuted,
			marginTop: 4,
		},
		bar: {
			width: "80%",
			borderRadius: 4,
			minHeight: 4,
		},

		calendarContainer: {
			marginBottom: 12,
		},
		calendarGrid: {
			flexDirection: "column",
		},
		calendarRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		dayLabelPlaceholder: {
			width: 30,
		},
		dayLabel: {
			width: 30,
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "right",
			paddingRight: 8,
		},
		monthHeader: {
			flex: 1,
			minWidth: 100,
		},
		monthHeaderText: {
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "center",
		},
		monthDays: {
			flexDirection: "row",
			gap: 2,
		},
		calendarDay: {
			width: 18,
			height: 18,
			borderRadius: 4,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
		},
		calendarDayText: {
			fontSize: 9,
			color: theme.textMuted,
		},
		calendarDayTextCompleted: {
			color: "#fff",
		},
		otherMonthDay: {
			opacity: 0.3,
		},
		// A day the habit is not scheduled on. Deliberately not styled as a miss.
		inactiveDay: {
			opacity: 0.25,
		},
		editButton: {
			alignItems: "center",
			paddingVertical: 12,
		},
		editButtonText: {
			fontSize: 14,
			fontWeight: "600",
		},

		streaksContainer: {
			gap: 8,
		},
		streakRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		streakDate: {
			fontSize: 11,
			color: theme.textMuted,
			width: 80,
		},
		streakBar: {
			flex: 1,
			height: 24,
			backgroundColor: theme.surfaceLight,
			borderRadius: 4,
			flexDirection: "row",
			alignItems: "center",
			overflow: "hidden",
		},
		streakFill: {
			height: "100%",
			borderRadius: 4,
			justifyContent: "center",
			alignItems: "flex-end",
			paddingRight: 8,
		},
		streakCount: {
			fontSize: 12,
			fontWeight: "600",
			color: "#fff",
			position: "absolute",
			right: 8,
		},
		streakEndDate: {
			fontSize: 11,
			color: theme.textMuted,
			width: 80,
			textAlign: "right",
		},
		noDataText: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			paddingVertical: 20,
		},

		frequencyContainer: {
			marginTop: 8,
		},
		frequencyGrid: {
			gap: 4,
		},
		frequencyRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		frequencyDot: {
			width: 10,
			height: 10,
			borderRadius: 2,
			backgroundColor: theme.surfaceLight,
			flex: 1,
			maxWidth: 16,
			marginHorizontal: 2,
		},
		frequencyDayLabel: {
			fontSize: 11,
			color: theme.textMuted,
			width: 30,
			textAlign: "right",
		},
		frequencyMonths: {
			flexDirection: "row",
			marginTop: 8,
			justifyContent: "space-between",
			paddingRight: 38,
		},
		frequencyMonthLabel: {
			fontSize: 9,
			color: theme.textMuted,
			flex: 1,
			maxWidth: 20,
			textAlign: "center",
		},

		deleteButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 16,
			marginHorizontal: 20,
			marginTop: 20,
			borderWidth: 1,
			borderColor: theme.error,
			borderRadius: 12,
			gap: 8,
		},
		deleteButtonText: {
			fontSize: 14,
			fontWeight: "600",
		},

		emptyState: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 40,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginTop: 16,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 8,
		},

		frequencyOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 12,
		},
		frequencyValueContainer: {
			marginTop: 16,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 12,
			backgroundColor: theme.surface,
			borderRadius: 10,
		},
		frequencyValueLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		frequencyValueSelector: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		frequencyValueButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		frequencyValueText: {
			fontSize: 20,
			fontWeight: "700",
			minWidth: 30,
			textAlign: "center",
		},
		timePickerContainer: {
			marginTop: 12,
		},
		timeOptions: {
			flexDirection: "row",
			gap: 8,
			paddingVertical: 4,
		},
		timeOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			borderWidth: 1,
			borderColor: theme.border,
		},
		timeOptionText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
	});
