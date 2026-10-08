import { Theme } from "@/src/context/themeContext";
import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

// Dynamic styles based on theme
export const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},
		// Module Cards
		moduleCardsSection: {
			paddingHorizontal: 16,
			paddingTop: 8,
			paddingBottom: 16,
		},
		moduleCard: {
			backgroundColor: theme.primary,
			borderRadius: 20,
			overflow: "hidden",
		},
		moduleCardGradient: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		moduleIconContainer: {
			width: 52,
			height: 52,
			borderRadius: 14,
			backgroundColor: "rgba(255,255,255,0.2)",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		moduleContent: {
			flex: 1,
		},
		moduleTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		moduleSubtitle: {
			fontSize: 13,
			color: "rgba(255,255,255,0.8)",
			marginTop: 2,
		},
		moduleArrow: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: "rgba(255,255,255,0.15)",
			justifyContent: "center",
			alignItems: "center",
		},
		moduleActivePlan: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "rgba(0,0,0,0.15)",
			paddingVertical: 8,
			paddingHorizontal: 16,
			gap: 6,
		},
		moduleActivePlanText: {
			fontSize: 12,
			fontWeight: "500",
			color: "rgba(255,255,255,0.9)",
		},
		// Sort Menu Popover
		sortMenuOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.3)",
			zIndex: 50,
		},
		sortMenuPopover: {
			position: "absolute",
			top: 100,
			right: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingVertical: 8,
			minWidth: 200,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.25,
			shadowRadius: 8,
			elevation: 8,
			zIndex: 51,
			borderWidth: 1,
			borderColor: theme.border,
		},
		sortMenu: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			marginHorizontal: 16,
			marginBottom: 12,
			paddingVertical: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		sortMenuTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			textTransform: "uppercase",
			paddingHorizontal: 16,
			paddingVertical: 8,
			letterSpacing: 0.5,
		},
		sortMenuItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			gap: 12,
		},
		sortMenuItemActive: {
			backgroundColor: theme.primary + "15",
		},
		sortMenuItemText: {
			flex: 1,
			fontSize: 15,
			color: theme.text,
		},
		sortMenuItemTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},
		// Search (kept for potential future use)
		searchContainer: {
			paddingHorizontal: 20,
			paddingBottom: 12,
		},
		searchBar: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 10,
		},
		searchInput: {
			flex: 1,
			fontSize: 16,
			color: theme.text,
		},

		// Drawer
		drawerOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.5)",
			zIndex: 100,
		},
		drawer: {
			position: "absolute",
			top: 0,
			left: 0,
			bottom: 0,
			width: width * 0.8,
			backgroundColor: theme.surface,
			zIndex: 101,
			paddingTop: 60,
		},
		drawerHeader: {
			alignItems: "center",
			paddingHorizontal: 24,
			paddingBottom: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		drawerAvatar: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		drawerAvatarImage: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 12,
		},
		drawerName: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		drawerEmail: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},
		drawerContent: {
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		drawerSectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.textMuted,
			letterSpacing: 1,
			marginBottom: 12,
			marginLeft: 4,
		},
		drawerItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 14,
			borderRadius: 16,
			marginBottom: 8,
			backgroundColor: theme.surfaceLight,
		},
		drawerItemActive: {
			backgroundColor: theme.primary + "15",
			borderWidth: 1,
			borderColor: theme.primary + "30",
		},
		drawerItemIconNew: {
			width: 42,
			height: 42,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		drawerItemIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		drawerItemContent: {
			flex: 1,
		},
		drawerItemText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		drawerItemTextActive: {
			color: theme.primary,
		},
		drawerItemSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		drawerItemBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		drawerDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 16,
			marginHorizontal: 4,
		},
		drawerFooter: {
			position: "absolute",
			bottom: 40,
			left: 24,
			right: 24,
		},
		themeToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surfaceLight,
			padding: 16,
			borderRadius: 14,
		},
		themeToggleLabel: {
			flexDirection: "row",
			alignItems: "center",
		},
		themeToggleText: {
			fontSize: 16,
			fontWeight: "500",
			color: theme.text,
			marginLeft: 12,
		},
		toggle: {
			width: 52,
			height: 30,
			borderRadius: 15,
			backgroundColor: theme.border,
			padding: 2,
			justifyContent: "center",
		},
		toggleOn: {
			backgroundColor: theme.primary,
		},
		toggleThumb: {
			width: 26,
			height: 26,
			borderRadius: 13,
			backgroundColor: "#FFFFFF",
			alignSelf: "flex-start",
		},
		toggleThumbOn: {
			alignSelf: "flex-end",
		},

		// Header
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 10,
			paddingBottom: 10,
		},
		menuButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerRight: {
			flexDirection: "row",
			gap: 8,
		},
		iconButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		notificationBadge: {
			position: "absolute",
			top: 10,
			right: 10,
			width: 8,
			height: 8,
			borderRadius: 4,
			backgroundColor: theme.error,
		},

		// Greeting
		greetingSection: {
			paddingHorizontal: 20,
			marginTop: 16,
			marginBottom: 20,
		},
		greetingText: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		userName: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.text,
			marginTop: 4,
		},

		// Progress Card
		progressCard: {
			marginHorizontal: 20,
			backgroundColor: theme.primary,
			borderRadius: 24,
			padding: 20,
			marginBottom: 24,
		},
		progressHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		progressTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFFFFF",
			opacity: 0.9,
		},
		progressDate: {
			fontSize: 14,
			color: "#FFFFFF",
			opacity: 0.7,
		},
		progressContent: {
			flexDirection: "row",
			alignItems: "center",
		},
		progressCircle: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: "rgba(255,255,255,0.2)",
			justifyContent: "center",
			alignItems: "center",
		},
		progressPercent: {
			fontSize: 24,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		progressLabel: {
			fontSize: 11,
			color: "#FFFFFF",
			opacity: 0.8,
		},
		progressStats: {
			flex: 1,
			marginLeft: 20,
		},
		progressStat: {
			marginBottom: 8,
		},
		progressStatValue: {
			fontSize: 20,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		progressStatLabel: {
			fontSize: 13,
			color: "#FFFFFF",
			opacity: 0.7,
		},

		// Calendar
		calendarSection: {
			paddingHorizontal: 20,
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 16,
		},
		weekCalendar: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		dayItem: {
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 12,
			borderRadius: 14,
			backgroundColor: theme.surface,
		},
		dayItemSelected: {
			backgroundColor: theme.primary,
		},
		dayItemToday: {
			borderWidth: 2,
			borderColor: theme.primary,
		},
		dayName: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 6,
		},
		dayNameSelected: {
			color: "#FFFFFF",
		},
		dayNumber: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		dayNumberSelected: {
			color: "#FFFFFF",
		},
		todayDot: {
			width: 4,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.primary,
			marginTop: 4,
		},

		// Habits
		archivedSection: {
			marginHorizontal: 16,
			marginTop: 8,
			marginBottom: 24,
		},
		archivedHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 12,
		},
		archivedTitle: {
			flex: 1,
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		archivedItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			marginBottom: 8,
		},
		archivedIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		archivedInfo: {
			flex: 1,
		},
		archivedName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		archivedDate: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		archivedAction: {
			padding: 6,
		},
		habitsSection: {
			flex: 1,
			paddingBottom: 40,
		},
		habitTableHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		habitsTitle: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		dayHeaders: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			marginBottom: 8,
		},
		dateNavLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		dateNavButton: {
			padding: 6,
			borderRadius: 8,
		},
		dateNavButtonDisabled: {
			opacity: 0.3,
		},
		backToTodayButton: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
			backgroundColor: theme.primary + "15",
			marginLeft: 4,
		},
		backToTodayText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		dayHeadersRight: {
			flexDirection: "row",
			gap: 8,
		},
		dayHeader: {
			width: 28,
			alignItems: "center",
			paddingVertical: 4,
			borderRadius: 8,
		},
		dayHeaderToday: {
			backgroundColor: theme.primary + "20",
		},
		dayHeaderText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textMuted,
		},
		dayHeaderTextToday: {
			color: theme.primary,
		},
		dayHeaderNumber: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		dayHeaderNumberToday: {
			color: theme.primary,
			fontWeight: "700",
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		headerAvatar: {
			width: 28,
			height: 28,
			borderRadius: 14,
		},
		habitsList: {
			paddingHorizontal: 16,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 40,
			marginHorizontal: 20,
			backgroundColor: theme.surface,
			borderRadius: 20,
			borderWidth: 2,
			borderColor: theme.border,
			borderStyle: "dashed",
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},

		// Featured Card
		featuredCard: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 20,
			marginBottom: 16,
		},
		featuredHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		featuredIcon: {
			width: 52,
			height: 52,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
		},
		featuredBadge: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.warning + "20",
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 20,
		},
		featuredBadgeText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.warning,
			marginLeft: 4,
		},
		featuredTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		featuredMeta: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 16,
		},
		featuredActions: {
			flexDirection: "row",
		},
		featuredButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surfaceLight,
			paddingVertical: 14,
			borderRadius: 14,
			gap: 8,
		},
		featuredButtonCompleted: {
			backgroundColor: theme.success + "20",
		},
		featuredButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		featuredButtonTextCompleted: {
			color: theme.success,
		},
	});
