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

export default function AdminDashboard() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin, profile } = useAuthStore();
	const { stats, fetchStats, isLoading } = useAdminStore();

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchStats();
	}, []);

	const styles = createStyles(theme);

	if (!isAdmin()) {
		return (
			<View style={styles.container}>
				<View style={styles.unauthorizedContainer}>
					<Ionicons name="lock-closed" size={64} color={theme.error} />
					<Text style={styles.unauthorizedText}>Unauthorized Access</Text>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.replace("/(tabs)")}
					>
						<Text style={styles.backButtonText}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Admin Dashboard</Text>
				<View style={{ width: 24 }} />
			</View>

			{isLoading && !stats ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.primary} />
				</View>
			) : (
				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Welcome */}
					<View style={styles.welcomeCard}>
						<Text style={styles.welcomeText}>Welcome back,</Text>
						<Text style={styles.welcomeName}>
							{profile?.full_name || "Admin"}
						</Text>
					</View>

					{/* Stats Grid */}
					<View style={styles.statsGrid}>
						<View
							style={[
								styles.statCard,
								{ backgroundColor: theme.primary + "20" },
							]}
						>
							<Ionicons name="people" size={28} color={theme.primary} />
							<Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
							<Text style={styles.statLabel}>Total Users</Text>
						</View>
						<View
							style={[
								styles.statCard,
								{ backgroundColor: theme.success + "20" },
							]}
						>
							<Ionicons
								name="checkmark-circle"
								size={28}
								color={theme.success}
							/>
							<Text style={styles.statValue}>{stats?.activeUsers || 0}</Text>
							<Text style={styles.statLabel}>Active Users</Text>
						</View>
						<View
							style={[
								styles.statCard,
								{ backgroundColor: theme.warning + "20" },
							]}
						>
							<Ionicons name="cash" size={28} color={theme.warning} />
							<Text style={styles.statValue}>
								${stats?.totalRevenue?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.statLabel}>Total Revenue</Text>
						</View>
						<View
							style={[styles.statCard, { backgroundColor: theme.info + "20" }]}
						>
							<Ionicons name="trending-up" size={28} color={theme.info} />
							<Text style={styles.statValue}>
								${stats?.monthlyRevenue?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.statLabel}>This Month</Text>
						</View>
					</View>

					{/* Recent Signups */}
					<View style={styles.infoCard}>
						<View style={styles.infoCardHeader}>
							<Ionicons name="person-add" size={24} color={theme.primary} />
							<Text style={styles.infoCardTitle}>Recent Signups</Text>
						</View>
						<Text style={styles.infoCardValue}>
							{stats?.recentSignups || 0} new users in the last 7 days
						</Text>
					</View>

					{/* Subscriptions by Plan */}
					<View style={styles.chartCard}>
						<Text style={styles.chartTitle}>Subscriptions by Plan</Text>
						{stats?.subscriptionsByPlan?.map((item, index) => (
							<View key={index} style={styles.chartItem}>
								<Text style={styles.chartItemLabel}>{item.plan}</Text>
								<View style={styles.chartBar}>
									<View
										style={[
											styles.chartBarFill,
											{
												width: `${Math.min(
													(item.count / (stats?.totalUsers || 1)) * 100,
													100
												)}%`,
												backgroundColor: theme.primary,
											},
										]}
									/>
								</View>
								<Text style={styles.chartItemValue}>{item.count}</Text>
							</View>
						))}
					</View>

					{/* Quick Actions */}
					<Text style={styles.sectionTitle}>Quick Actions</Text>
					<View
						style={{
							...styles.actionsGrid,
						}}
					>
						<TouchableOpacity
							style={styles.actionCard}
							onPress={() => router.push("/admin/users")}
						>
							<View
								style={[
									styles.actionIcon,
									{ backgroundColor: theme.primary + "20" },
								]}
							>
								<Ionicons name="people" size={24} color={theme.primary} />
							</View>
							<View
								style={{
									display: "flex",
									flexDirection: "column",
								}}
							>
								<Text style={styles.actionTitle}>Manage Users</Text>
								<Text style={styles.actionDescription}>
									View, edit, and manage user accounts
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
								style={styles.actionArrow}
							/>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.actionCard}
							onPress={() => router.push("/admin/coupons")}
						>
							<View
								style={[
									styles.actionIcon,
									{ backgroundColor: theme.success + "20" },
								]}
							>
								<Ionicons name="pricetag" size={24} color={theme.success} />
							</View>
							<View
								style={{
									display: "flex",
									flexDirection: "column",
								}}
							>
								<Text style={styles.actionTitle}>Manage Coupons</Text>
								<Text style={styles.actionDescription}>
									Create and manage discount codes
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
								style={styles.actionArrow}
							/>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.actionCard}
							onPress={() => router.push("/admin/plans")}
						>
							<View
								style={[
									styles.actionIcon,
									{ backgroundColor: theme.warning + "20" },
								]}
							>
								<Ionicons name="diamond" size={24} color={theme.warning} />
							</View>
							<View
								style={{
									display: "flex",
									flexDirection: "column",
								}}
							>
								<Text style={styles.actionTitle}>Subscription Plans</Text>
								<Text style={styles.actionDescription}>
									Configure pricing and features
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
								style={styles.actionArrow}
							/>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.actionCard}
							onPress={() => router.push("/admin/payments")}
						>
							<View
								style={[
									styles.actionIcon,
									{ backgroundColor: theme.info + "20" },
								]}
							>
								<Ionicons name="card" size={24} color={theme.info} />
							</View>
							<View
								style={{
									display: "flex",
									flexDirection: "column",
								}}
							>
								<Text style={styles.actionTitle}>Payment History</Text>
								<Text style={styles.actionDescription}>
									View all transactions
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
								style={styles.actionArrow}
							/>
						</TouchableOpacity>
					</View>

					<View style={{ height: 40 }} />
				</ScrollView>
			)}
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
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		unauthorizedContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 24,
		},
		unauthorizedText: {
			color: theme.error,
			fontSize: 18,
			fontWeight: "600",
			marginTop: 16,
		},
		backButton: {
			marginTop: 24,
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 8,
		},
		backButtonText: {
			color: "#fff",
			fontWeight: "600",
		},
		content: {
			flex: 1,
			padding: 16,
		},
		welcomeCard: {
			backgroundColor: theme.primary,
			borderRadius: 16,
			padding: 20,
			marginBottom: 20,
		},
		welcomeText: {
			color: "rgba(255,255,255,0.8)",
			fontSize: 14,
		},
		welcomeName: {
			color: "#fff",
			fontSize: 24,
			fontWeight: "bold",
			marginTop: 4,
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
			marginBottom: 20,
		},
		statCard: {
			flex: 1,
			minWidth: "45%",
			borderRadius: 12,
			padding: 16,
			alignItems: "center",
		},
		statValue: {
			color: theme.text,
			fontSize: 24,
			fontWeight: "bold",
			marginTop: 8,
		},
		statLabel: {
			color: theme.textSecondary,
			fontSize: 12,
			marginTop: 4,
		},
		infoCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 20,
		},
		infoCardHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 8,
		},
		infoCardTitle: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
			marginLeft: 8,
		},
		infoCardValue: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		chartCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 20,
		},
		chartTitle: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
			marginBottom: 16,
		},
		chartItem: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		chartItemLabel: {
			color: theme.textSecondary,
			fontSize: 14,
			width: 80,
		},
		chartBar: {
			flex: 1,
			height: 8,
			backgroundColor: theme.border,
			borderRadius: 4,
			marginHorizontal: 12,
		},
		chartBarFill: {
			height: "100%",
			borderRadius: 4,
		},
		chartItemValue: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "600",
			width: 40,
			textAlign: "right",
		},
		sectionTitle: {
			color: theme.text,
			fontSize: 18,
			fontWeight: "bold",
			marginBottom: 16,
		},
		actionsGrid: {
			gap: 12,
		},
		actionCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			flexDirection: "row",
			alignItems: "center",
			display: "flex",
		},
		actionIcon: {
			width: 48,
			height: 48,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		actionTitle: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
		},
		actionDescription: {
			color: theme.textSecondary,
			fontSize: 12,
			marginTop: 2,
			flex: 1,
		},
		actionArrow: {
			marginLeft: "auto",
		},
	});
