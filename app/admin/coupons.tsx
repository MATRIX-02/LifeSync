import { useAdminStore } from "@/src/context/adminStore";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Coupon, SubscriptionPlan } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const PLAN_OPTIONS: SubscriptionPlan[] = [
	"free",
	"basic",
	"premium",
	"enterprise",
];

export default function AdminCouponsScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin, user } = useAuthStore();
	const {
		coupons,
		fetchCoupons,
		createCoupon,
		updateCoupon,
		deleteCoupon,
		toggleCouponActive,
		isLoading,
	} = useAdminStore();

	const [showModal, setShowModal] = useState(false);
	const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
	const [formData, setFormData] = useState({
		code: "",
		description: "",
		discount_type: "percentage" as "percentage" | "fixed",
		discount_value: "",
		max_uses: "",
		valid_from: new Date().toISOString().split("T")[0],
		valid_until: "",
		applicable_plans: [] as SubscriptionPlan[],
		min_billing_cycle: null as "monthly" | "yearly" | null,
	});

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchCoupons();
	}, []);

	const resetForm = () => {
		setFormData({
			code: "",
			description: "",
			discount_type: "percentage",
			discount_value: "",
			max_uses: "",
			valid_from: new Date().toISOString().split("T")[0],
			valid_until: "",
			applicable_plans: [],
			min_billing_cycle: null,
		});
		setEditingCoupon(null);
	};

	const handleEdit = (coupon: Coupon) => {
		setEditingCoupon(coupon);
		setFormData({
			code: coupon.code,
			description: coupon.description || "",
			discount_type: coupon.discount_type,
			discount_value: coupon.discount_value.toString(),
			max_uses: coupon.max_uses?.toString() || "",
			valid_from: coupon.valid_from.split("T")[0],
			valid_until: coupon.valid_until?.split("T")[0] || "",
			applicable_plans: coupon.applicable_plans || [],
			min_billing_cycle: coupon.min_billing_cycle,
		});
		setShowModal(true);
	};

	const handleSave = async () => {
		if (!formData.code || !formData.discount_value) {
			Alert.alert(
				"Error",
				"Please fill in required fields (code and discount value)"
			);
			return;
		}

		const couponData = {
			code: formData.code.toUpperCase(),
			description: formData.description || null,
			discount_type: formData.discount_type,
			discount_value: parseFloat(formData.discount_value),
			max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
			valid_from: new Date(formData.valid_from).toISOString(),
			valid_until: formData.valid_until
				? new Date(formData.valid_until).toISOString()
				: null,
			applicable_plans: formData.applicable_plans,
			min_billing_cycle: formData.min_billing_cycle,
			is_active: true,
			created_by: user?.id || null,
		};

		let result;
		if (editingCoupon) {
			result = await updateCoupon(editingCoupon.id, couponData);
		} else {
			result = await createCoupon(couponData);
		}

		if (!result.error) {
			setShowModal(false);
			resetForm();
		} else {
			Alert.alert("Error", result.error.message);
		}
	};

	const handleDelete = (coupon: Coupon) => {
		Alert.alert(
			"Delete Coupon",
			`Are you sure you want to delete "${coupon.code}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteCoupon(coupon.id);
					},
				},
			]
		);
	};

	const togglePlan = (plan: SubscriptionPlan) => {
		const plans = formData.applicable_plans.includes(plan)
			? formData.applicable_plans.filter((p) => p !== plan)
			: [...formData.applicable_plans, plan];
		setFormData({ ...formData, applicable_plans: plans });
	};

	const styles = createStyles(theme);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Manage Coupons</Text>
				<TouchableOpacity
					onPress={() => {
						resetForm();
						setShowModal(true);
					}}
				>
					<Ionicons name="add-circle" size={28} color={theme.primary} />
				</TouchableOpacity>
			</View>

			{/* Coupons List */}
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{isLoading && coupons.length === 0 ? (
					<ActivityIndicator
						size="large"
						color={theme.primary}
						style={{ marginTop: 40 }}
					/>
				) : coupons.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							name="pricetag-outline"
							size={48}
							color={theme.textMuted}
						/>
						<Text style={styles.emptyText}>No coupons created yet</Text>
						<TouchableOpacity
							style={styles.createButton}
							onPress={() => {
								resetForm();
								setShowModal(true);
							}}
						>
							<Text style={styles.createButtonText}>Create First Coupon</Text>
						</TouchableOpacity>
					</View>
				) : (
					coupons.map((coupon) => (
						<View key={coupon.id} style={styles.couponCard}>
							<View style={styles.couponHeader}>
								<View style={styles.couponCodeContainer}>
									<Text style={styles.couponCode}>{coupon.code}</Text>
									<View
										style={[
											styles.statusBadge,
											{
												backgroundColor: coupon.is_active
													? theme.success + "20"
													: theme.error + "20",
											},
										]}
									>
										<Text
											style={[
												styles.statusBadgeText,
												{
													color: coupon.is_active ? theme.success : theme.error,
												},
											]}
										>
											{coupon.is_active ? "Active" : "Inactive"}
										</Text>
									</View>
								</View>
								<View style={styles.couponActions}>
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() =>
											toggleCouponActive(coupon.id, !coupon.is_active)
										}
									>
										<Ionicons
											name={coupon.is_active ? "pause" : "play"}
											size={18}
											color={theme.textSecondary}
										/>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleEdit(coupon)}
									>
										<Ionicons name="pencil" size={18} color={theme.primary} />
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleDelete(coupon)}
									>
										<Ionicons name="trash" size={18} color={theme.error} />
									</TouchableOpacity>
								</View>
							</View>

							{coupon.description && (
								<Text style={styles.couponDescription}>
									{coupon.description}
								</Text>
							)}

							<View style={styles.couponDetails}>
								<View style={styles.detailItem}>
									<Ionicons name="pricetag" size={16} color={theme.primary} />
									<Text style={styles.detailText}>
										{coupon.discount_type === "percentage"
											? `${coupon.discount_value}% off`
											: `$${coupon.discount_value} off`}
									</Text>
								</View>
								<View style={styles.detailItem}>
									<Ionicons name="people" size={16} color={theme.warning} />
									<Text style={styles.detailText}>
										{coupon.used_count}/{coupon.max_uses || "∞"} used
									</Text>
								</View>
								<View style={styles.detailItem}>
									<Ionicons name="calendar" size={16} color={theme.info} />
									<Text style={styles.detailText}>
										{coupon.valid_until
											? `Until ${new Date(
													coupon.valid_until
											  ).toLocaleDateString()}`
											: "No expiry"}
									</Text>
								</View>
							</View>

							{coupon.applicable_plans &&
								coupon.applicable_plans.length > 0 && (
									<View style={styles.plansContainer}>
										<Text style={styles.plansLabel}>Valid for:</Text>
										{coupon.applicable_plans.map((plan) => (
											<View key={plan} style={styles.planTag}>
												<Text style={styles.planTagText}>{plan}</Text>
											</View>
										))}
									</View>
								)}
						</View>
					))
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* Create/Edit Modal */}
			<Modal visible={showModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingCoupon ? "Edit Coupon" : "Create Coupon"}
							</Text>
							<TouchableOpacity
								onPress={() => {
									setShowModal(false);
									resetForm();
								}}
							>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalBody}>
							{/* Code */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Coupon Code *</Text>
								<TextInput
									style={styles.formInput}
									placeholder="e.g., SAVE20"
									placeholderTextColor={theme.textMuted}
									value={formData.code}
									onChangeText={(text) =>
										setFormData({ ...formData, code: text.toUpperCase() })
									}
									autoCapitalize="characters"
								/>
							</View>

							{/* Description */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Description</Text>
								<TextInput
									style={[styles.formInput, styles.formTextarea]}
									placeholder="Describe what this coupon is for"
									placeholderTextColor={theme.textMuted}
									value={formData.description}
									onChangeText={(text) =>
										setFormData({ ...formData, description: text })
									}
									multiline
									numberOfLines={3}
								/>
							</View>

							{/* Discount Type */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Discount Type</Text>
								<View style={styles.segmentedControl}>
									<TouchableOpacity
										style={[
											styles.segmentButton,
											formData.discount_type === "percentage" &&
												styles.segmentButtonActive,
										]}
										onPress={() =>
											setFormData({ ...formData, discount_type: "percentage" })
										}
									>
										<Text
											style={[
												styles.segmentText,
												formData.discount_type === "percentage" &&
													styles.segmentTextActive,
											]}
										>
											Percentage (%)
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.segmentButton,
											formData.discount_type === "fixed" &&
												styles.segmentButtonActive,
										]}
										onPress={() =>
											setFormData({ ...formData, discount_type: "fixed" })
										}
									>
										<Text
											style={[
												styles.segmentText,
												formData.discount_type === "fixed" &&
													styles.segmentTextActive,
											]}
										>
											Fixed Amount ($)
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Discount Value */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Discount Value *</Text>
								<TextInput
									style={styles.formInput}
									placeholder={
										formData.discount_type === "percentage"
											? "e.g., 20"
											: "e.g., 5.00"
									}
									placeholderTextColor={theme.textMuted}
									value={formData.discount_value}
									onChangeText={(text) =>
										setFormData({ ...formData, discount_value: text })
									}
									keyboardType="numeric"
								/>
							</View>

							{/* Max Uses */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>
									Max Uses (leave empty for unlimited)
								</Text>
								<TextInput
									style={styles.formInput}
									placeholder="e.g., 100"
									placeholderTextColor={theme.textMuted}
									value={formData.max_uses}
									onChangeText={(text) =>
										setFormData({ ...formData, max_uses: text })
									}
									keyboardType="numeric"
								/>
							</View>

							{/* Valid From */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Valid From</Text>
								<TextInput
									style={styles.formInput}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={theme.textMuted}
									value={formData.valid_from}
									onChangeText={(text) =>
										setFormData({ ...formData, valid_from: text })
									}
								/>
							</View>

							{/* Valid Until */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Valid Until (optional)</Text>
								<TextInput
									style={styles.formInput}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={theme.textMuted}
									value={formData.valid_until}
									onChangeText={(text) =>
										setFormData({ ...formData, valid_until: text })
									}
								/>
							</View>

							{/* Applicable Plans */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>
									Applicable Plans (leave empty for all)
								</Text>
								<View style={styles.plansSelector}>
									{PLAN_OPTIONS.map((plan) => (
										<TouchableOpacity
											key={plan}
											style={[
												styles.planOption,
												formData.applicable_plans.includes(plan) &&
													styles.planOptionActive,
											]}
											onPress={() => togglePlan(plan)}
										>
											<Text
												style={[
													styles.planOptionText,
													formData.applicable_plans.includes(plan) &&
														styles.planOptionTextActive,
												]}
											>
												{plan}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							{/* Min Billing Cycle */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Minimum Billing Cycle</Text>
								<View style={styles.segmentedControl}>
									<TouchableOpacity
										style={[
											styles.segmentButton,
											formData.min_billing_cycle === null &&
												styles.segmentButtonActive,
										]}
										onPress={() =>
											setFormData({ ...formData, min_billing_cycle: null })
										}
									>
										<Text
											style={[
												styles.segmentText,
												formData.min_billing_cycle === null &&
													styles.segmentTextActive,
											]}
										>
											Any
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.segmentButton,
											formData.min_billing_cycle === "monthly" &&
												styles.segmentButtonActive,
										]}
										onPress={() =>
											setFormData({ ...formData, min_billing_cycle: "monthly" })
										}
									>
										<Text
											style={[
												styles.segmentText,
												formData.min_billing_cycle === "monthly" &&
													styles.segmentTextActive,
											]}
										>
											Monthly+
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.segmentButton,
											formData.min_billing_cycle === "yearly" &&
												styles.segmentButtonActive,
										]}
										onPress={() =>
											setFormData({ ...formData, min_billing_cycle: "yearly" })
										}
									>
										<Text
											style={[
												styles.segmentText,
												formData.min_billing_cycle === "yearly" &&
													styles.segmentTextActive,
											]}
										>
											Yearly Only
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Save Button */}
							<TouchableOpacity
								style={styles.saveButton}
								onPress={handleSave}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.saveButtonText}>
										{editingCoupon ? "Update Coupon" : "Create Coupon"}
									</Text>
								)}
							</TouchableOpacity>

							<View style={{ height: 40 }} />
						</ScrollView>
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
		content: {
			flex: 1,
			padding: 16,
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
		createButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 8,
			marginTop: 20,
		},
		createButtonText: {
			color: "#fff",
			fontWeight: "600",
		},
		couponCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
		},
		couponHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		couponCodeContainer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		couponCode: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.text,
			fontFamily: "monospace",
		},
		statusBadge: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
		},
		statusBadgeText: {
			fontSize: 10,
			fontWeight: "600",
		},
		couponActions: {
			flexDirection: "row",
			gap: 8,
		},
		actionButton: {
			padding: 8,
			borderRadius: 8,
			backgroundColor: theme.background,
		},
		couponDescription: {
			color: theme.textSecondary,
			fontSize: 14,
			marginBottom: 12,
		},
		couponDetails: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 16,
		},
		detailItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		detailText: {
			color: theme.textSecondary,
			fontSize: 12,
		},
		plansContainer: {
			flexDirection: "row",
			alignItems: "center",
			flexWrap: "wrap",
			gap: 8,
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		plansLabel: {
			color: theme.textMuted,
			fontSize: 12,
		},
		planTag: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 4,
		},
		planTagText: {
			color: theme.primary,
			fontSize: 10,
			fontWeight: "600",
			textTransform: "capitalize",
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
			maxHeight: "90%",
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
		modalBody: {
			padding: 20,
		},
		formGroup: {
			marginBottom: 20,
		},
		formLabel: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
			marginBottom: 8,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 12,
			color: theme.text,
			fontSize: 14,
			borderWidth: 1,
			borderColor: theme.border,
		},
		formTextarea: {
			minHeight: 80,
			textAlignVertical: "top",
		},
		segmentedControl: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 4,
		},
		segmentButton: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 6,
		},
		segmentButtonActive: {
			backgroundColor: theme.primary,
		},
		segmentText: {
			color: theme.textSecondary,
			fontSize: 12,
			fontWeight: "500",
		},
		segmentTextActive: {
			color: "#fff",
		},
		plansSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		planOption: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 8,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		planOptionActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		planOptionText: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
			textTransform: "capitalize",
		},
		planOptionTextActive: {
			color: "#fff",
		},
		saveButton: {
			backgroundColor: theme.primary,
			height: 52,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginTop: 20,
		},
		saveButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
	});
