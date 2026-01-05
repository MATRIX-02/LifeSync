import { useAdminStore } from "@/src/context/adminStore";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

export default function AdminPaymentsScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin } = useAuthStore();
	const { payments, fetchPayments, isLoading } = useAdminStore();

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchPayments();
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return theme.success;
			case "pending":
				return theme.warning;
			case "failed":
				return theme.error;
			case "refunded":
				return theme.info;
			default:
				return theme.textMuted;
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return "checkmark-circle";
			case "pending":
				return "time";
			case "failed":
				return "close-circle";
			case "refunded":
				return "arrow-undo";
			default:
				return "ellipse";
		}
	};

	const styles = createStyles(theme);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Payment History</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Summary Cards */}
			<View style={styles.summaryRow}>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: theme.success + "20" },
					]}
				>
					<Ionicons name="checkmark-circle" size={24} color={theme.success} />
					<Text style={styles.summaryValue}>
						$
						{payments
							.filter((p) => p.status === "completed")
							.reduce((sum, p) => sum + p.amount, 0)
							.toFixed(2)}
					</Text>
					<Text style={styles.summaryLabel}>Completed</Text>
				</View>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: theme.warning + "20" },
					]}
				>
					<Ionicons name="time" size={24} color={theme.warning} />
					<Text style={styles.summaryValue}>
						$
						{payments
							.filter((p) => p.status === "pending")
							.reduce((sum, p) => sum + p.amount, 0)
							.toFixed(2)}
					</Text>
					<Text style={styles.summaryLabel}>Pending</Text>
				</View>
				<View
					style={[styles.summaryCard, { backgroundColor: theme.info + "20" }]}
				>
					<Ionicons name="arrow-undo" size={24} color={theme.info} />
					<Text style={styles.summaryValue}>
						$
						{payments
							.filter((p) => p.status === "refunded")
							.reduce((sum, p) => sum + p.amount, 0)
							.toFixed(2)}
					</Text>
					<Text style={styles.summaryLabel}>Refunded</Text>
				</View>
			</View>

			{/* Payments List */}
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{isLoading && payments.length === 0 ? (
					<ActivityIndicator
						size="large"
						color={theme.primary}
						style={{ marginTop: 40 }}
					/>
				) : payments.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons name="card-outline" size={48} color={theme.textMuted} />
						<Text style={styles.emptyText}>No payments yet</Text>
						<Text style={styles.emptySubtext}>
							Payments will appear here when users subscribe
						</Text>
					</View>
				) : (
					payments.map((payment) => (
						<View key={payment.id} style={styles.paymentCard}>
							<View style={styles.paymentHeader}>
								<View style={styles.paymentInfo}>
									<Text style={styles.paymentId}>
										#{payment.id.slice(0, 8).toUpperCase()}
									</Text>
									<Text style={styles.paymentDate}>
										{new Date(payment.created_at).toLocaleDateString("en-US", {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</Text>
								</View>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: getStatusColor(payment.status) + "20" },
									]}
								>
									<Ionicons
										name={getStatusIcon(payment.status) as any}
										size={14}
										color={getStatusColor(payment.status)}
									/>
									<Text
										style={[
											styles.statusText,
											{ color: getStatusColor(payment.status) },
										]}
									>
										{payment.status}
									</Text>
								</View>
							</View>

							<View style={styles.paymentDetails}>
								<View style={styles.detailRow}>
									<Text style={styles.detailLabel}>Amount</Text>
									<Text style={styles.detailValue}>
										{payment.currency.toUpperCase()} $
										{payment.amount.toFixed(2)}
									</Text>
								</View>
								{payment.discount_amount > 0 && (
									<View style={styles.detailRow}>
										<Text style={styles.detailLabel}>Discount</Text>
										<Text
											style={[styles.detailValue, { color: theme.success }]}
										>
											-${payment.discount_amount.toFixed(2)}
										</Text>
									</View>
								)}
								{payment.payment_method && (
									<View style={styles.detailRow}>
										<Text style={styles.detailLabel}>Method</Text>
										<Text style={styles.detailValue}>
											{payment.payment_method}
										</Text>
									</View>
								)}
								{payment.description && (
									<View style={styles.detailRow}>
										<Text style={styles.detailLabel}>Description</Text>
										<Text style={styles.detailValue} numberOfLines={1}>
											{payment.description}
										</Text>
									</View>
								)}
							</View>

							{payment.stripe_payment_intent_id && (
								<View style={styles.stripeInfo}>
									<Ionicons name="card" size={16} color={theme.primary} />
									<Text style={styles.stripeId}>
										{payment.stripe_payment_intent_id}
									</Text>
								</View>
							)}
						</View>
					))
				)}

				<View style={{ height: 40 }} />
			</ScrollView>
		</View>
	);
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingTop: 60,
			paddingBottom: 16,
			backgroundColor: theme.surface,
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		summaryRow: {
			flexDirection: "row",
			padding: 16,
			gap: 12,
		},
		summaryCard: {
			flex: 1,
			borderRadius: 12,
			padding: 12,
			alignItems: "center",
		},
		summaryValue: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "bold",
			marginTop: 8,
		},
		summaryLabel: {
			color: theme.textSecondary,
			fontSize: 10,
			marginTop: 2,
		},
		content: {
			flex: 1,
			paddingHorizontal: 16,
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyText: {
			color: theme.textMuted,
			fontSize: 16,
			marginTop: 12,
		},
		emptySubtext: {
			color: theme.textMuted,
			fontSize: 14,
			marginTop: 4,
			textAlign: "center",
		},
		paymentCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
		},
		paymentHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 16,
		},
		paymentInfo: {},
		paymentId: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "600",
			fontFamily: "monospace",
		},
		paymentDate: {
			color: theme.textMuted,
			fontSize: 12,
			marginTop: 2,
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 8,
			gap: 4,
		},
		statusText: {
			fontSize: 12,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		paymentDetails: {
			backgroundColor: theme.background,
			borderRadius: 8,
			padding: 12,
		},
		detailRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 8,
		},
		detailLabel: {
			color: theme.textMuted,
			fontSize: 12,
		},
		detailValue: {
			color: theme.text,
			fontSize: 12,
			fontWeight: "500",
		},
		stripeInfo: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.border,
			gap: 8,
		},
		stripeId: {
			color: theme.textMuted,
			fontSize: 10,
			fontFamily: "monospace",
			flex: 1,
		},
	});
