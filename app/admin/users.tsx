import { Alert } from "@/src/components/CustomAlert";
import { useAdminStore } from "@/src/context/adminStore";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { ProfileWithSubscription, UserRole } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function AdminUsersScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin } = useAuthStore();
	const {
		users,
		plans,
		fetchUsers,
		fetchPlans,
		updateUserRole,
		toggleUserActive,
		updateUserSubscription,
		searchQuery,
		setSearchQuery,
		currentPage,
		totalPages,
		isLoading,
	} = useAdminStore();

	const [selectedUser, setSelectedUser] =
		useState<ProfileWithSubscription | null>(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchUsers();
		fetchPlans();
	}, []);

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		fetchUsers(1, query);
	};

	const handleLoadMore = () => {
		if (currentPage < totalPages && !isLoading) {
			fetchUsers(currentPage + 1, searchQuery);
		}
	};

	const handleToggleActive = async (user: ProfileWithSubscription) => {
		Alert.alert(
			user.is_active ? "Deactivate User" : "Activate User",
			`Are you sure you want to ${user.is_active ? "deactivate" : "activate"} ${
				user.email
			}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Confirm",
					onPress: async () => {
						await toggleUserActive(user.id, !user.is_active);
					},
				},
			]
		);
	};

	const handleUpdateRole = async (userId: string, role: UserRole) => {
		await updateUserRole(userId, role);
		setShowModal(false);
	};

	const handleUpdatePlan = async (userId: string, planId: string) => {
		await updateUserSubscription(userId, planId, "active");
		setShowModal(false);
	};

	const styles = createStyles(theme);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Manage Users</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Search */}
			<View style={styles.searchContainer}>
				<Ionicons name="search" size={20} color={theme.textMuted} />
				<TextInput
					style={styles.searchInput}
					placeholder="Search by email or name..."
					placeholderTextColor={theme.textMuted}
					value={searchQuery}
					onChangeText={handleSearch}
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => handleSearch("")}>
						<Ionicons name="close-circle" size={20} color={theme.textMuted} />
					</TouchableOpacity>
				)}
			</View>

			{/* Users List */}
			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				onScroll={({ nativeEvent }) => {
					const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
					const isEndReached =
						layoutMeasurement.height + contentOffset.y >=
						contentSize.height - 50;
					if (isEndReached) handleLoadMore();
				}}
				scrollEventThrottle={400}
			>
				{users.map((user) => {
					const activeSubscription = user.user_subscriptions?.find(
						(sub) => sub.status === "active"
					);
					const planName =
						activeSubscription?.subscription_plans?.name || "Free";

					return (
						<TouchableOpacity
							key={user.id}
							style={styles.userCard}
							onPress={() => {
								setSelectedUser(user);
								setShowModal(true);
							}}
						>
							<View style={styles.userAvatar}>
								<Text style={styles.userAvatarText}>
									{user.full_name?.charAt(0) ||
										user.email.charAt(0).toUpperCase()}
								</Text>
							</View>
							<View style={styles.userInfo}>
								<Text style={styles.userName}>
									{user.full_name || "No Name"}
								</Text>
								<Text style={styles.userEmail}>{user.email}</Text>
								<View style={styles.userBadges}>
									<View
										style={[
											styles.badge,
											{
												backgroundColor: user.is_active
													? theme.success + "20"
													: theme.error + "20",
											},
										]}
									>
										<Text
											style={[
												styles.badgeText,
												{ color: user.is_active ? theme.success : theme.error },
											]}
										>
											{user.is_active ? "Active" : "Inactive"}
										</Text>
									</View>
									<View
										style={[
											styles.badge,
											{ backgroundColor: theme.primary + "20" },
										]}
									>
										<Text style={[styles.badgeText, { color: theme.primary }]}>
											{user.role}
										</Text>
									</View>
									<View
										style={[
											styles.badge,
											{ backgroundColor: theme.warning + "20" },
										]}
									>
										<Text style={[styles.badgeText, { color: theme.warning }]}>
											{planName}
										</Text>
									</View>
								</View>
							</View>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={theme.textMuted}
							/>
						</TouchableOpacity>
					);
				})}

				{isLoading && (
					<View style={styles.loadingMore}>
						<ActivityIndicator color={theme.primary} />
					</View>
				)}

				{users.length === 0 && !isLoading && (
					<View style={styles.emptyState}>
						<Ionicons name="people-outline" size={48} color={theme.textMuted} />
						<Text style={styles.emptyText}>No users found</Text>
					</View>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* User Detail Modal */}
			<Modal visible={showModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>User Details</Text>
							<TouchableOpacity onPress={() => setShowModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						{selectedUser && (
							<ScrollView>
								{/* User Info */}
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>Profile</Text>
									<View style={styles.modalRow}>
										<Text style={styles.modalLabel}>Name:</Text>
										<Text style={styles.modalValue}>
											{selectedUser.full_name || "Not set"}
										</Text>
									</View>
									<View style={styles.modalRow}>
										<Text style={styles.modalLabel}>Email:</Text>
										<Text style={styles.modalValue}>{selectedUser.email}</Text>
									</View>
									<View style={styles.modalRow}>
										<Text style={styles.modalLabel}>Joined:</Text>
										<Text style={styles.modalValue}>
											{new Date(selectedUser.created_at).toLocaleDateString()}
										</Text>
									</View>
								</View>

								{/* Status Toggle */}
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>Account Status</Text>
									<TouchableOpacity
										style={[
											styles.statusButton,
											{
												backgroundColor: selectedUser.is_active
													? theme.error + "20"
													: theme.success + "20",
											},
										]}
										onPress={() => handleToggleActive(selectedUser)}
									>
										<Text
											style={[
												styles.statusButtonText,
												{
													color: selectedUser.is_active
														? theme.error
														: theme.success,
												},
											]}
										>
											{selectedUser.is_active
												? "Deactivate Account"
												: "Activate Account"}
										</Text>
									</TouchableOpacity>
								</View>

								{/* Role Selection */}
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>User Role</Text>
									<View style={styles.roleButtons}>
										{(["user", "admin", "super_admin"] as UserRole[]).map(
											(role) => (
												<TouchableOpacity
													key={role}
													style={[
														styles.roleButton,
														selectedUser.role === role &&
															styles.roleButtonActive,
													]}
													onPress={() =>
														handleUpdateRole(selectedUser.id, role)
													}
												>
													<Text
														style={[
															styles.roleButtonText,
															selectedUser.role === role &&
																styles.roleButtonTextActive,
														]}
													>
														{role.replace("_", " ")}
													</Text>
												</TouchableOpacity>
											)
										)}
									</View>
								</View>

								{/* Plan Selection */}
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>
										Subscription Plan
									</Text>
									<View style={styles.planButtons}>
										{plans.map((plan) => {
											const activeSubscription =
												selectedUser.user_subscriptions?.find(
													(sub) => sub.status === "active"
												);
											const currentPlanId = activeSubscription?.plan_id;
											const isSelected = currentPlanId === plan.id;

											return (
												<TouchableOpacity
													key={plan.id}
													style={[
														styles.planButton,
														isSelected && styles.planButtonActive,
													]}
													onPress={() =>
														handleUpdatePlan(selectedUser.id, plan.id)
													}
												>
													<Text
														style={[
															styles.planButtonText,
															isSelected && styles.planButtonTextActive,
														]}
													>
														{plan.name}
													</Text>
												</TouchableOpacity>
											);
										})}
									</View>
								</View>
							</ScrollView>
						)}
					</View>
				</View>
			</Modal>
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
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			margin: 16,
			paddingHorizontal: 16,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
		},
		searchInput: {
			flex: 1,
			height: 44,
			marginLeft: 12,
			color: theme.text,
			fontSize: 14,
		},
		content: {
			flex: 1,
			paddingHorizontal: 16,
		},
		userCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
		},
		userAvatar: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		userAvatarText: {
			color: "#fff",
			fontSize: 18,
			fontWeight: "bold",
		},
		userInfo: {
			flex: 1,
		},
		userName: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
		},
		userEmail: {
			color: theme.textSecondary,
			fontSize: 14,
			marginTop: 2,
		},
		userBadges: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginTop: 8,
		},
		badge: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
		},
		badgeText: {
			fontSize: 10,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		loadingMore: {
			paddingVertical: 20,
			alignItems: "center",
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
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			maxHeight: "80%",
			paddingBottom: 40,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 20,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.text,
		},
		modalSection: {
			padding: 20,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalSectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 12,
			textTransform: "uppercase",
		},
		modalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 8,
		},
		modalLabel: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		modalValue: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "500",
		},
		statusButton: {
			padding: 12,
			borderRadius: 8,
			alignItems: "center",
		},
		statusButtonText: {
			fontSize: 14,
			fontWeight: "600",
		},
		roleButtons: {
			flexDirection: "row",
			gap: 8,
		},
		roleButton: {
			flex: 1,
			padding: 12,
			borderRadius: 8,
			backgroundColor: theme.surface,
			alignItems: "center",
			borderWidth: 1,
			borderColor: theme.border,
		},
		roleButtonActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		roleButtonText: {
			color: theme.textSecondary,
			fontSize: 12,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		roleButtonTextActive: {
			color: "#fff",
		},
		planButtons: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		planButton: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 8,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		planButtonActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		planButtonText: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
		},
		planButtonTextActive: {
			color: "#fff",
		},
	});
