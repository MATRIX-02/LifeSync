import { Theme } from "@/src/context/themeContext";
import { StyleSheet } from "react-native";

export const createStyles = (theme: Theme) =>
	StyleSheet.create({
		loadErrorBanner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginHorizontal: 16,
			marginTop: 12,
			padding: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.error,
			backgroundColor: theme.error + "15",
		},
		loadErrorText: {
			flex: 1,
			fontSize: 13,
			color: theme.text,
		},
		loadErrorRetry: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 8,
			backgroundColor: theme.error,
		},
		loadErrorRetryText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#FFF",
		},
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 8,
			paddingBottom: 16,
		},
		headerGreeting: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 2,
		},
		headerTitle: {
			fontSize: 26,
			fontWeight: "700",
			color: theme.text,
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		headerButton: {
			width: 42,
			height: 42,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},

		// Balance Card
		balanceCard: {
			marginHorizontal: 20,
			marginBottom: 20,
			padding: 24,
			backgroundColor: theme.primary,
			borderRadius: 24,
		},
		balanceHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		balanceHeaderLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		balanceLabel: {
			fontSize: 14,
			color: "rgba(255,255,255,0.85)",
			fontWeight: "500",
		},
		eyeButton: {
			width: 36,
			height: 36,
			borderRadius: 12,
			backgroundColor: "rgba(255,255,255,0.15)",
			justifyContent: "center",
			alignItems: "center",
		},
		balanceAmount: {
			fontSize: 40,
			fontWeight: "700",
			color: "#FFF",
			marginTop: 12,
			marginBottom: 20,
		},
		balanceStats: {
			flexDirection: "row",
			alignItems: "center",
		},
		balanceStat: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		balanceStatIcon: {
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: "rgba(74,222,128,0.2)",
			justifyContent: "center",
			alignItems: "center",
		},
		balanceStatValue: {
			fontSize: 15,
			fontWeight: "700",
			color: "#FFF",
		},
		balanceStatLabel: {
			fontSize: 12,
			color: "rgba(255,255,255,0.7)",
			marginTop: 1,
		},
		balanceStatDivider: {
			width: 1,
			height: 36,
			backgroundColor: "rgba(255,255,255,0.2)",
			marginHorizontal: 12,
		},

		// Quick Actions
		quickActionsCard: {
			flexDirection: "row",
			marginHorizontal: 20,
			marginBottom: 24,
			padding: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
			justifyContent: "space-around",
		},
		quickAction: {
			alignItems: "center",
			gap: 8,
		},
		quickActionIcon: {
			width: 52,
			height: 52,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
		},
		quickActionText: {
			fontSize: 12,
			color: theme.textSecondary,
			fontWeight: "600",
		},

		// Sections
		section: {
			marginBottom: 24,
			paddingHorizontal: 20,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 14,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		sectionBadge: {
			fontSize: 12,
			color: theme.primary,
			fontWeight: "600",
			backgroundColor: theme.primary + "15",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 8,
		},
		sectionAction: {
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
		},
		seeAll: {
			fontSize: 14,
			color: theme.primary,
			fontWeight: "600",
		},

		// Empty State
		emptyCard: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 32,
			alignItems: "center",
		},
		emptyIconWrapper: {
			width: 56,
			height: 56,
			borderRadius: 16,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		emptyTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		emptySubtitle: {
			fontSize: 13,
			color: theme.textMuted,
		},

		// Account Cards
		accountCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 14,
			marginRight: 10,
			width: 184,
			height: 182,
			alignItems: "stretch",
			justifyContent: "space-between",
		},
		accountCardHeader: {
			width: "100%",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		accountIconWrapper: {
			width: 42,
			height: 42,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		accountName: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
			marginTop: 10,
		},
		accountType: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textMuted,
			textTransform: "capitalize",
			marginTop: 2,
		},
		accountDigits: {
			textTransform: "none",
			letterSpacing: 0.5,
		},
		accountBalanceBlock: {
			width: "100%",
			marginTop: "auto",
		},
		accountBalanceLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginBottom: 3,
		},
		accountBalance: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		accountLimit: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		accountActions: {
			flexDirection: "row",
			justifyContent: "flex-end",
			alignItems: "center",
			gap: 6,
		},
		accountActionButton: {
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: theme.background,
			alignItems: "center",
			justifyContent: "center",
		},
		addAccountCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			width: 100,
			height: 182,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: theme.border,
			borderStyle: "dashed",
		},
		addAccountIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 8,
		},
		addAccountText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
		},

		// Spending
		spendingCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			gap: 16,
		},
		spendingItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 14,
		},
		spendingIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		spendingInfo: {
			flex: 1,
		},
		spendingHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		spendingCategory: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		spendingAmount: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.text,
		},
		spendingBarBg: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
		},
		spendingBar: {
			height: 6,
			borderRadius: 3,
		},

		// Bills
		billsCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			overflow: "hidden",
		},
		billItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 14,
			gap: 14,
		},
		billIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		billInfo: {
			flex: 1,
		},
		billName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		billDueWrapper: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		billDue: {
			fontSize: 12,
			color: theme.warning,
			fontWeight: "500",
		},
		billAmount: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},

		// Transactions
		transactionsCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			overflow: "hidden",
		},
		transactionItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: 14,
			gap: 14,
		},
		transactionItemBorder: {
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		transactionIcon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		transactionInfo: {
			flex: 1,
		},
		transactionDescription: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 2,
		},
		transactionCategory: {
			fontSize: 12,
			color: theme.textMuted,
		},
		transactionAmount: {
			fontSize: 15,
			fontWeight: "700",
		},

		// Goals
		goalCard: {
			backgroundColor: theme.surface,
			borderRadius: 18,
			padding: 16,
			marginRight: 12,
			width: 170,
		},
		goalIconWrapper: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		goalName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		goalProgressBg: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
			marginBottom: 10,
		},
		goalProgressBar: {
			height: 6,
			borderRadius: 3,
		},
		goalAmounts: {
			flexDirection: "row",
			alignItems: "baseline",
		},
		goalCurrent: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},
		goalTarget: {
			fontSize: 12,
			color: theme.textMuted,
			marginLeft: 4,
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
			maxHeight: "90%",
			padding: 20,
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
		formGroup: {
			marginBottom: 20,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		typeSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		typeOption: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 10,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		typeOptionActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		typeOptionText: {
			fontSize: 12,
			color: theme.text,
			fontWeight: "500",
			textTransform: "capitalize",
		},
		typeOptionTextActive: {
			color: "#FFF",
		},
		colorSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
			marginTop: 12,
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
			borderColor: "#FFF",
		},
		submitButton: {
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 10,
			marginBottom: 20,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
	});
