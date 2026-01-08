import { Alert } from "@/src/components/CustomAlert";
import { useAdminStore } from "@/src/context/adminStore";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { SubscriptionPlanRow } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function AdminPlansScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin } = useAuthStore();
	const { plans, fetchPlans, updatePlan, isLoading } = useAdminStore();

	const [showModal, setShowModal] = useState(false);
	const [editingPlan, setEditingPlan] = useState<SubscriptionPlanRow | null>(
		null
	);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		price_monthly: "",
		price_yearly: "",
		max_habits: "",
		max_workouts: "",
		has_analytics: false,
		has_export: false,
		has_sync: false,
		has_priority_support: false,
		is_active: true,
	});

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchPlans();
	}, []);

	const handleEdit = (plan: SubscriptionPlanRow) => {
		setEditingPlan(plan);
		setFormData({
			name: plan.name,
			description: plan.description || "",
			price_monthly: plan.price_monthly.toString(),
			price_yearly: plan.price_yearly.toString(),
			max_habits: plan.max_habits.toString(),
			max_workouts: plan.max_workouts.toString(),
			has_analytics: plan.has_analytics,
			has_export: plan.has_export,
			has_sync: plan.has_sync,
			has_priority_support: plan.has_priority_support,
			is_active: plan.is_active,
		});
		setShowModal(true);
	};

	const handleSave = async () => {
		if (!editingPlan) return;

		const planData = {
			name: formData.name,
			description: formData.description || null,
			price_monthly: parseFloat(formData.price_monthly) || 0,
			price_yearly: parseFloat(formData.price_yearly) || 0,
			max_habits: parseInt(formData.max_habits) || 0,
			max_workouts: parseInt(formData.max_workouts) || 0,
			has_analytics: formData.has_analytics,
			has_export: formData.has_export,
			has_sync: formData.has_sync,
			has_priority_support: formData.has_priority_support,
			is_active: formData.is_active,
		};

		const result = await updatePlan(editingPlan.id, planData);

		if (!result.error) {
			setShowModal(false);
			setEditingPlan(null);
		} else {
			Alert.alert("Error", result.error.message);
		}
	};

	const togglePlanActive = async (plan: SubscriptionPlanRow) => {
		if (plan.slug === "free") {
			Alert.alert("Error", "Cannot deactivate the free plan");
			return;
		}

		Alert.alert(
			plan.is_active ? "Deactivate Plan" : "Activate Plan",
			`Are you sure you want to ${plan.is_active ? "deactivate" : "activate"} ${
				plan.name
			}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Confirm",
					onPress: async () => {
						await updatePlan(plan.id, { is_active: !plan.is_active });
					},
				},
			]
		);
	};

	const styles = createStyles(theme);

	const getPlanIcon = (slug: string) => {
		switch (slug) {
			case "free":
				return "leaf";
			case "basic":
				return "star";
			case "premium":
				return "diamond";
			case "enterprise":
				return "rocket";
			default:
				return "cube";
		}
	};

	const getPlanColor = (slug: string) => {
		switch (slug) {
			case "free":
				return theme.textMuted;
			case "basic":
				return theme.success;
			case "premium":
				return theme.primary;
			case "enterprise":
				return theme.warning;
			default:
				return theme.textSecondary;
		}
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Subscription Plans</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Plans List */}
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{isLoading && plans.length === 0 ? (
					<ActivityIndicator
						size="large"
						color={theme.primary}
						style={{ marginTop: 40 }}
					/>
				) : (
					plans.map((plan) => (
						<View
							key={plan.id}
							style={[
								styles.planCard,
								!plan.is_active && styles.planCardInactive,
							]}
						>
							<View style={styles.planHeader}>
								<View style={styles.planTitleRow}>
									<View
										style={[
											styles.planIcon,
											{ backgroundColor: getPlanColor(plan.slug) + "20" },
										]}
									>
										<Ionicons
											name={getPlanIcon(plan.slug) as any}
											size={24}
											color={getPlanColor(plan.slug)}
										/>
									</View>
									<View>
										<Text style={styles.planName}>{plan.name}</Text>
										<Text style={styles.planSlug}>{plan.slug}</Text>
									</View>
								</View>
								<View style={styles.planActions}>
									{plan.slug !== "free" && (
										<TouchableOpacity
											style={styles.actionButton}
											onPress={() => togglePlanActive(plan)}
										>
											<Ionicons
												name={plan.is_active ? "eye-off" : "eye"}
												size={18}
												color={theme.textSecondary}
											/>
										</TouchableOpacity>
									)}
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleEdit(plan)}
									>
										<Ionicons name="pencil" size={18} color={theme.primary} />
									</TouchableOpacity>
								</View>
							</View>

							{plan.description && (
								<Text style={styles.planDescription}>{plan.description}</Text>
							)}

							{/* Pricing */}
							<View style={styles.pricingRow}>
								<View style={styles.priceBox}>
									<Text style={styles.priceLabel}>Monthly</Text>
									<Text style={styles.priceValue}>
										${plan.price_monthly.toFixed(2)}
									</Text>
								</View>
								<View style={styles.priceBox}>
									<Text style={styles.priceLabel}>Yearly</Text>
									<Text style={styles.priceValue}>
										${plan.price_yearly.toFixed(2)}
									</Text>
								</View>
								<View style={styles.priceBox}>
									<Text style={styles.priceLabel}>Yearly Savings</Text>
									<Text style={[styles.priceValue, { color: theme.success }]}>
										{plan.price_monthly > 0
											? Math.round(
													(1 - plan.price_yearly / (plan.price_monthly * 12)) *
														100
											  ) + "%"
											: "N/A"}
									</Text>
								</View>
							</View>

							{/* Limits */}
							<View style={styles.limitsRow}>
								<View style={styles.limitItem}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.success}
									/>
									<Text style={styles.limitText}>
										{plan.max_habits === -1 ? "Unlimited" : plan.max_habits}{" "}
										habits
									</Text>
								</View>
								<View style={styles.limitItem}>
									<Ionicons
										name="checkmark-circle"
										size={16}
										color={theme.success}
									/>
									<Text style={styles.limitText}>
										{plan.max_workouts === -1 ? "Unlimited" : plan.max_workouts}{" "}
										workouts
									</Text>
								</View>
							</View>

							{/* Features */}
							<View style={styles.featuresGrid}>
								<FeatureBadge
									enabled={plan.has_analytics}
									label="Analytics"
									theme={theme}
								/>
								<FeatureBadge
									enabled={plan.has_export}
									label="Export"
									theme={theme}
								/>
								<FeatureBadge
									enabled={plan.has_sync}
									label="Cloud Sync"
									theme={theme}
								/>
								<FeatureBadge
									enabled={plan.has_priority_support}
									label="Priority Support"
									theme={theme}
								/>
							</View>

							{!plan.is_active && (
								<View style={styles.inactiveBanner}>
									<Ionicons name="eye-off" size={16} color={theme.warning} />
									<Text style={styles.inactiveBannerText}>
										This plan is hidden from users
									</Text>
								</View>
							)}
						</View>
					))
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* Edit Modal */}
			<Modal visible={showModal} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Edit Plan</Text>
							<TouchableOpacity onPress={() => setShowModal(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalBody}>
							{/* Name */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Plan Name</Text>
								<TextInput
									style={styles.formInput}
									value={formData.name}
									onChangeText={(text) =>
										setFormData({ ...formData, name: text })
									}
									placeholder="Plan name"
									placeholderTextColor={theme.textMuted}
								/>
							</View>

							{/* Description */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Description</Text>
								<TextInput
									style={[styles.formInput, styles.formTextarea]}
									value={formData.description}
									onChangeText={(text) =>
										setFormData({ ...formData, description: text })
									}
									placeholder="Plan description"
									placeholderTextColor={theme.textMuted}
									multiline
								/>
							</View>

							{/* Pricing */}
							<View style={styles.formRow}>
								<View style={[styles.formGroup, { flex: 1 }]}>
									<Text style={styles.formLabel}>Monthly Price ($)</Text>
									<TextInput
										style={styles.formInput}
										value={formData.price_monthly}
										onChangeText={(text) =>
											setFormData({ ...formData, price_monthly: text })
										}
										keyboardType="numeric"
										placeholder="0.00"
										placeholderTextColor={theme.textMuted}
									/>
								</View>
								<View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
									<Text style={styles.formLabel}>Yearly Price ($)</Text>
									<TextInput
										style={styles.formInput}
										value={formData.price_yearly}
										onChangeText={(text) =>
											setFormData({ ...formData, price_yearly: text })
										}
										keyboardType="numeric"
										placeholder="0.00"
										placeholderTextColor={theme.textMuted}
									/>
								</View>
							</View>

							{/* Limits */}
							<View style={styles.formRow}>
								<View style={[styles.formGroup, { flex: 1 }]}>
									<Text style={styles.formLabel}>
										Max Habits (-1 for unlimited)
									</Text>
									<TextInput
										style={styles.formInput}
										value={formData.max_habits}
										onChangeText={(text) =>
											setFormData({ ...formData, max_habits: text })
										}
										keyboardType="numeric"
										placeholder="10"
										placeholderTextColor={theme.textMuted}
									/>
								</View>
								<View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
									<Text style={styles.formLabel}>
										Max Workouts (-1 for unlimited)
									</Text>
									<TextInput
										style={styles.formInput}
										value={formData.max_workouts}
										onChangeText={(text) =>
											setFormData({ ...formData, max_workouts: text })
										}
										keyboardType="numeric"
										placeholder="10"
										placeholderTextColor={theme.textMuted}
									/>
								</View>
							</View>

							{/* Features */}
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Features</Text>
								<View style={styles.switchGroup}>
									<SwitchRow
										label="Analytics"
										value={formData.has_analytics}
										onValueChange={(value) =>
											setFormData({ ...formData, has_analytics: value })
										}
										theme={theme}
									/>
									<SwitchRow
										label="Export Data"
										value={formData.has_export}
										onValueChange={(value) =>
											setFormData({ ...formData, has_export: value })
										}
										theme={theme}
									/>
									<SwitchRow
										label="Cloud Sync"
										value={formData.has_sync}
										onValueChange={(value) =>
											setFormData({ ...formData, has_sync: value })
										}
										theme={theme}
									/>
									<SwitchRow
										label="Priority Support"
										value={formData.has_priority_support}
										onValueChange={(value) =>
											setFormData({ ...formData, has_priority_support: value })
										}
										theme={theme}
									/>
								</View>
							</View>

							{/* Active Status */}
							{editingPlan?.slug !== "free" && (
								<View style={styles.formGroup}>
									<View style={styles.switchRow}>
										<Text style={styles.switchLabel}>Plan Active</Text>
										<Switch
											value={formData.is_active}
											onValueChange={(value) =>
												setFormData({ ...formData, is_active: value })
											}
											trackColor={{ false: theme.border, true: theme.primary }}
											thumbColor="#fff"
										/>
									</View>
								</View>
							)}

							{/* Save Button */}
							<TouchableOpacity
								style={styles.saveButton}
								onPress={handleSave}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.saveButtonText}>Save Changes</Text>
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

const FeatureBadge = ({
	enabled,
	label,
	theme,
}: {
	enabled: boolean;
	label: string;
	theme: any;
}) => (
	<View
		style={[
			{
				flexDirection: "row",
				alignItems: "center",
				paddingHorizontal: 10,
				paddingVertical: 6,
				borderRadius: 6,
				backgroundColor: enabled ? theme.success + "20" : theme.border,
			},
		]}
	>
		<Ionicons
			name={enabled ? "checkmark-circle" : "close-circle"}
			size={14}
			color={enabled ? theme.success : theme.textMuted}
		/>
		<Text
			style={{
				marginLeft: 4,
				fontSize: 12,
				color: enabled ? theme.success : theme.textMuted,
			}}
		>
			{label}
		</Text>
	</View>
);

const SwitchRow = ({
	label,
	value,
	onValueChange,
	theme,
}: {
	label: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
	theme: any;
}) => (
	<View
		style={{
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 8,
		}}
	>
		<Text style={{ color: theme.text, fontSize: 14 }}>{label}</Text>
		<Switch
			value={value}
			onValueChange={onValueChange}
			trackColor={{ false: theme.border, true: theme.primary }}
			thumbColor="#fff"
		/>
	</View>
);

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
		planCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
		},
		planCardInactive: {
			opacity: 0.7,
		},
		planHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		planTitleRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		planIcon: {
			width: 48,
			height: 48,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		planName: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.text,
		},
		planSlug: {
			fontSize: 12,
			color: theme.textMuted,
			fontFamily: "monospace",
		},
		planActions: {
			flexDirection: "row",
			gap: 8,
		},
		actionButton: {
			padding: 8,
			borderRadius: 8,
			backgroundColor: theme.background,
		},
		planDescription: {
			color: theme.textSecondary,
			fontSize: 14,
			marginBottom: 16,
		},
		pricingRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			backgroundColor: theme.background,
			borderRadius: 12,
			padding: 12,
			marginBottom: 16,
		},
		priceBox: {
			alignItems: "center",
		},
		priceLabel: {
			color: theme.textMuted,
			fontSize: 10,
			marginBottom: 4,
		},
		priceValue: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "bold",
		},
		limitsRow: {
			flexDirection: "row",
			gap: 20,
			marginBottom: 12,
		},
		limitItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		limitText: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		featuresGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		inactiveBanner: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.warning + "20",
			padding: 10,
			borderRadius: 8,
			marginTop: 16,
			gap: 8,
		},
		inactiveBannerText: {
			color: theme.warning,
			fontSize: 12,
			fontWeight: "500",
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
		formRow: {
			flexDirection: "row",
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
		switchGroup: {
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 12,
		},
		switchRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		switchLabel: {
			color: theme.text,
			fontSize: 14,
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
