import { Theme } from "@/src/context/themeContext";
import { StyleSheet } from "react-native";

export const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
		},
		timeRangeContainer: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		timeRangeButton: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 10,
		},
		timeRangeButtonActive: {
			backgroundColor: theme.primary,
		},
		timeRangeText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		timeRangeTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 12,
		},
		overviewSection: {
			marginBottom: 20,
		},
		statsRow: {
			flexDirection: "row",
			gap: 12,
		},
		statBox: {
			flex: 1,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		statNumber: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 4,
		},
		streakSection: {
			flexDirection: "row",
			gap: 12,
			marginBottom: 24,
		},
		streakCard: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			gap: 12,
		},
		streakIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 14,
			backgroundColor: theme.warning + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		streakValue: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		streakLabel: {
			fontSize: 11,
			color: theme.textMuted,
		},
		muscleMapSection: {
			marginBottom: 24,
		},
		muscleMapHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		viewToggle: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 10,
			padding: 3,
		},
		viewToggleButton: {
			paddingVertical: 6,
			paddingHorizontal: 14,
			borderRadius: 8,
		},
		viewToggleButtonActive: {
			backgroundColor: theme.primary,
		},
		viewToggleText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textMuted,
		},
		viewToggleTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		muscleMapContainer: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 16,
		},
		muscleLegend: {
			flex: 1,
			paddingLeft: 12,
		},
		legendTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 8,
		},
		legendItems: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginBottom: 16,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		legendColor: {
			width: 12,
			height: 12,
			borderRadius: 3,
		},
		legendText: {
			fontSize: 10,
			color: theme.textMuted,
		},
		muscleStatsList: {
			gap: 8,
		},
		muscleStatItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 6,
			paddingHorizontal: 8,
			borderRadius: 8,
		},
		muscleStatItemSelected: {
			backgroundColor: theme.primary + "20",
		},
		muscleStatName: {
			flex: 1,
			fontSize: 12,
			color: theme.text,
		},
		muscleStatPercent: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		muscleDetailCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 24,
		},
		muscleDetailHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 16,
		},
		muscleDetailIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		muscleDetailDot: {
			width: 20,
			height: 20,
			borderRadius: 10,
		},
		muscleDetailInfo: {
			flex: 1,
		},
		muscleDetailName: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		muscleDetailMeta: {
			fontSize: 12,
			color: theme.textMuted,
		},
		muscleDetailSectionTitle: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		exerciseRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		exerciseRank: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			width: 28,
		},
		exerciseName: {
			flex: 1,
			fontSize: 14,
			color: theme.text,
		},
		exerciseSets: {
			fontSize: 12,
			color: theme.textMuted,
			marginRight: 12,
		},
		exerciseVolume: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		prSection: {
			marginBottom: 24,
		},
		emptyPr: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 24,
			alignItems: "center",
		},
		emptyPrText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginTop: 8,
		},
		emptyPrSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
		},
		prCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 14,
			marginBottom: 8,
		},
		prIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: theme.warning + "20",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		prContent: {
			flex: 1,
		},
		prExercise: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		prDate: {
			fontSize: 11,
			color: theme.textMuted,
		},
		prValue: {
			alignItems: "flex-end",
		},
		prNumber: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.primary,
		},
		prImprovement: {
			fontSize: 11,
			color: theme.success,
			fontWeight: "600",
		},
		distributionSection: {
			marginBottom: 24,
		},
		weekDays: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-end",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			height: 120,
		},
		dayColumn: {
			alignItems: "center",
			gap: 8,
		},
		dayBar: {
			width: 28,
			borderRadius: 6,
		},
		dayLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		frequencySection: {
			marginBottom: 24,
		},
		frequencyGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		frequencyDot: {
			width: 18,
			height: 18,
			borderRadius: 4,
			justifyContent: "center" as const,
			alignItems: "center" as const,
		},
		frequencyDotToday: {
			borderWidth: 2,
			borderColor: theme.warning,
		},
		todayIndicator: {
			width: 6,
			height: 6,
			borderRadius: 3,
		},
		dayCount: {
			fontSize: 8,
			fontWeight: "600" as const,
			color: theme.text,
		},
		frequencyLegend: {
			marginTop: 8,
		},
		frequencyLegendText: {
			fontSize: 12,
			color: theme.textMuted,
			textAlign: "center" as const,
		},
		// Muscle map zoom area
		// Positioning context for the zoom controls, which must not be children
		// of the pan-handling view.
		muscleMapZoomWrapper: {
			position: "relative" as const,
		},
		muscleMapZoomArea: {
			overflow: "hidden" as const,
			borderRadius: 16,
			backgroundColor: theme.surfaceLight,
			minHeight: 420,
			justifyContent: "center" as const,
			alignItems: "center" as const,
			position: "relative" as const,
		},
		// Activity overlay for yoga/cardio
		activityOverlay: {
			position: "absolute" as const,
			top: 12,
			left: 12,
			gap: 8,
		},
		activityBadge: {
			flexDirection: "row" as const,
			alignItems: "center" as const,
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 20,
			borderWidth: 1,
			gap: 6,
		},
		activityBadgeEmoji: {
			fontSize: 14,
		},
		activityBadgeText: {
			fontSize: 12,
			fontWeight: "600" as const,
		},
		// Zoom controls
		zoomControls: {
			position: "absolute" as const,
			right: 12,
			bottom: 12,
			flexDirection: "row" as const,
			alignItems: "center" as const,
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 4,
			zIndex: 10,
		},
		zoomButton: {
			width: 28,
			height: 28,
			borderRadius: 6,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center" as const,
			alignItems: "center" as const,
		},
		zoomText: {
			fontSize: 11,
			color: theme.textMuted,
			marginHorizontal: 8,
			minWidth: 36,
			textAlign: "center" as const,
		},
		// Category breakdown
		categorySection: {
			marginBottom: 24,
		},
		categoryGrid: {
			flexDirection: "row" as const,
			gap: 10,
		},
		categoryCard: {
			flex: 1,
			borderRadius: 14,
			padding: 14,
			alignItems: "center" as const,
		},
		categoryIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center" as const,
			alignItems: "center" as const,
			marginBottom: 8,
		},
		categoryEmoji: {
			fontSize: 22,
		},
		categoryName: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 4,
		},
		categoryValue: {
			fontSize: 14,
			fontWeight: "700" as const,
		},
		categoryMeta: {
			fontSize: 10,
			color: theme.textMuted,
			marginTop: 2,
		},
		// Drag hint
		dragHint: {
			position: "absolute" as const,
			bottom: 12,
			left: 12,
			flexDirection: "row" as const,
			alignItems: "center" as const,
			backgroundColor: theme.surface + "CC",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12,
			gap: 4,
		},
		dragHintText: {
			fontSize: 10,
			color: theme.textMuted,
		},
	});
