import { useCreditCardManager } from "@/src/hooks/useCreditCardManager";
import { Account, Debt } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	Platform,
	ProgressBarAndroid,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface CreditCardInfoProps {
	account: Account;
	debt?: Debt;
	onPayNow?: () => void;
	onSettleCard?: () => void;
	theme: any;
}

/**
 * Component to display credit card information including:
 * - Credit limit and usage
 * - Available credit
 * - Outstanding debt
 * - Quick action buttons
 */
export const CreditCardInfo: React.FC<CreditCardInfoProps> = ({
	account,
	debt,
	onPayNow,
	onSettleCard,
	theme,
}) => {
	const { getCreditCardUtilization } = useCreditCardManager();
	const utilization = getCreditCardUtilization(account.id);

	const isSettled = account.isSettled || (debt && debt.isSettled);
	const utilizationPercentage = Math.round(utilization.percentage);

	// Determine color based on utilization
	const getUtilizationColor = (percentage: number) => {
		if (percentage < 50) return "#22C55E"; // green
		if (percentage < 80) return "#F59E0B"; // amber
		return "#EF4444"; // red
	};

	const utilizationColor = getUtilizationColor(utilization.percentage);

	return (
		<View style={[styles.container, { backgroundColor: theme.surface }]}>
			{/* Card Header */}
			<View style={styles.header}>
				<View style={styles.headerInfo}>
					<Text style={[styles.cardName, { color: theme.text }]}>
						{account.name}
					</Text>
					{isSettled && (
						<View style={styles.settledBadge}>
							<Ionicons name="checkmark-circle" size={14} color="#22C55E" />
							<Text style={styles.settledText}>Settled</Text>
						</View>
					)}
				</View>
				<Ionicons name={account.icon as any} size={32} color={account.color} />
			</View>

			{!isSettled && (
				<>
					{/* Credit Utilization */}
					<View style={styles.section}>
						<View style={styles.utilHeader}>
							<Text style={[styles.label, { color: theme.textSecondary }]}>
								Credit Utilization
							</Text>
							<Text style={[styles.percentage, { color: utilizationColor }]}>
								{utilizationPercentage}%
							</Text>
						</View>

						<View style={styles.amountRow}>
							<Text style={[styles.amount, { color: theme.text }]}>
								₹
								{utilization.used.toLocaleString("en-IN", {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2,
								})}
							</Text>
							<Text style={[styles.divider, { color: theme.textSecondary }]}>
								/
							</Text>
							<Text style={[styles.amount, { color: theme.text }]}>
								₹
								{utilization.limit.toLocaleString("en-IN", {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2,
								})}
							</Text>
						</View>

						{/* Progress Bar */}
						{Platform.OS === "android" ? (
							<ProgressBarAndroid
								styleAttr="Horizontal"
								indeterminate={false}
								progress={utilization.percentage / 100}
								color={utilizationColor}
								style={styles.progressBar}
							/>
						) : (
							<View style={styles.progressBarIOS}>
								<View
									style={[
										styles.progressBarIOSFill,
										{
											width: `${utilization.percentage}%`,
											backgroundColor: utilizationColor,
										},
									]}
								/>
							</View>
						)}
					</View>

					{/* Available Credit */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: theme.textSecondary }]}>
							Available Credit
						</Text>
						<Text style={[styles.availableAmount, { color: utilizationColor }]}>
							₹
							{(utilization.limit - utilization.used).toLocaleString("en-IN", {
								minimumFractionDigits: 0,
								maximumFractionDigits: 2,
							})}
						</Text>
					</View>

					{/* Outstanding Debt */}
					{debt && debt.remainingAmount > 0 && (
						<View style={styles.section}>
							<View style={styles.debtHeader}>
								<Text style={[styles.label, { color: theme.textSecondary }]}>
									Outstanding Balance
								</Text>
								<Text style={[styles.debtAmount, { color: "#EF4444" }]}>
									₹
									{debt.remainingAmount.toLocaleString("en-IN", {
										minimumFractionDigits: 0,
										maximumFractionDigits: 2,
									})}
								</Text>
							</View>

							{/* Payment History Summary */}
							{debt.payments.length > 0 && (
								<View style={styles.paymentsSummary}>
									<Text
										style={[
											styles.paymentsLabel,
											{ color: theme.textSecondary },
										]}
									>
										Payments Made: {debt.payments.length}
									</Text>
									<Text style={[styles.paymentAmount, { color: theme.text }]}>
										₹
										{debt.payments
											.reduce((sum, p) => sum + p.amount, 0)
											.toLocaleString("en-IN", {
												minimumFractionDigits: 0,
												maximumFractionDigits: 2,
											})}
									</Text>
								</View>
							)}

							{/* Action Buttons */}
							<View style={styles.actionButtons}>
								{onPayNow && (
									<TouchableOpacity
										style={[styles.button, { backgroundColor: theme.primary }]}
										onPress={onPayNow}
									>
										<Ionicons
											name="card-outline"
											size={18}
											color="#fff"
											style={{ marginRight: 6 }}
										/>
										<Text style={styles.buttonText}>Pay Now</Text>
									</TouchableOpacity>
								)}

								{onSettleCard && debt.remainingAmount <= 0 && (
									<TouchableOpacity
										style={[
											styles.button,
											{
												backgroundColor: theme.primary,
												marginTop: 8,
											},
										]}
										onPress={onSettleCard}
									>
										<Ionicons
											name="checkmark-done"
											size={18}
											color="#fff"
											style={{ marginRight: 6 }}
										/>
										<Text style={styles.buttonText}>Settle Card</Text>
									</TouchableOpacity>
								)}
							</View>
						</View>
					)}
				</>
			)}

			{/* Settled State */}
			{isSettled && (
				<View style={styles.settledContent}>
					<Ionicons
						name="checkmark-circle"
						size={48}
						color="#22C55E"
						style={{ marginBottom: 8 }}
					/>
					<Text style={[styles.settledMessage, { color: theme.text }]}>
						Card Paid Off
					</Text>
					<Text style={[styles.settledSubtext, { color: theme.textSecondary }]}>
						No outstanding balance
					</Text>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 2,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	headerInfo: {
		flex: 1,
	},
	cardName: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	settledBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	settledText: {
		fontSize: 12,
		color: "#22C55E",
		fontWeight: "600",
	},
	section: {
		marginTop: 12,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.1)",
	},
	utilHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	label: {
		fontSize: 12,
		fontWeight: "500",
	},
	percentage: {
		fontSize: 14,
		fontWeight: "700",
	},
	amountRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		gap: 4,
	},
	amount: {
		fontSize: 16,
		fontWeight: "600",
	},
	divider: {
		fontSize: 18,
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
	},
	progressBarIOS: {
		height: 8,
		borderRadius: 4,
		backgroundColor: "rgba(0,0,0,0.1)",
		overflow: "hidden",
	},
	progressBarIOSFill: {
		height: "100%",
		borderRadius: 4,
	},
	availableAmount: {
		fontSize: 18,
		fontWeight: "700",
		marginTop: 4,
	},
	debtHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	debtAmount: {
		fontSize: 16,
		fontWeight: "700",
	},
	paymentsSummary: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.05)",
	},
	paymentsLabel: {
		fontSize: 12,
		fontWeight: "500",
	},
	paymentAmount: {
		fontSize: 14,
		fontWeight: "600",
	},
	actionButtons: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.1)",
	},
	button: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	buttonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	settledContent: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 20,
	},
	settledMessage: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	settledSubtext: {
		fontSize: 13,
	},
});

export default CreditCardInfo;
