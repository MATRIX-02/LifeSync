import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useSubscriptionStore } from "@/src/context/subscriptionStore";
import { useTheme } from "@/src/context/themeContext";
import { SubscriptionPlanRow } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function SubscriptionScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { user, profile, subscription, fetchSubscription } = useAuthStore();
	const {
		plans,
		currentCoupon,
		fetchPlans,
		validateCoupon,
		calculatePrice,
		subscribeToPlan,
		createRazorpayOrder,
		createPhonePePayment,
		clearCoupon,
		isLoading,
	} = useSubscriptionStore();

	const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanRow | null>(
		null
	);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
		"yearly"
	);
	const [couponCode, setCouponCode] = useState("");
	const [couponMessage, setCouponMessage] = useState("");
	const [showPayment, setShowPayment] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<
		"razorpay" | "phonepe" | null
	>(null);

	useEffect(() => {
		fetchPlans();
	}, []);

	const handleApplyCoupon = async () => {
		if (!couponCode || !selectedPlan) {
			setCouponMessage("Please select a plan first");
			return;
		}

		const result = await validateCoupon(
			couponCode,
			selectedPlan.slug,
			billingCycle
		);
		setCouponMessage(result.message);
	};

	const handleSubscribe = async () => {
		if (!selectedPlan || !user) return;

		if (selectedPlan.slug === "free") {
			// Free plan, just subscribe
			const { error } = await subscribeToPlan(
				user.id,
				selectedPlan.id,
				billingCycle,
				currentCoupon?.id
			);

			if (!error) {
				await fetchSubscription();
				Alert.alert("Success", "You are now on the Free plan!", [
					{ text: "OK", onPress: () => router.back() },
				]);
			}
		} else {
			// Paid plan, show payment
			setShowPayment(true);
		}
	};

	const handlePayment = async (method: "razorpay" | "phonepe") => {
		if (!selectedPlan || !user || !user.email) return;

		const { originalPrice, finalPrice } = calculatePrice(
			selectedPlan,
			billingCycle,
			currentCoupon
		);

		try {
			if (method === "razorpay") {
				const { error, order } = await createRazorpayOrder(
					user.id,
					selectedPlan.id,
					finalPrice,
					selectedPlan.name,
					billingCycle,
					user.email,
					profile?.full_name || user.user_metadata?.full_name || "User",
					currentCoupon?.id
				);

				if (!error && order) {
					// In a real app, you would open the Razorpay modal here
					// For now, we simulate a successful payment
					Alert.alert(
						"Razorpay Payment",
						`Order created for ₹${finalPrice.toFixed(
							2
						)}. In production, this would open Razorpay payment gateway.`,
						[
							{ text: "Cancel", style: "cancel" },
							{
								text: "Simulate Success",
								onPress: async () => {
									await completeSubscription();
								},
							},
						]
					);
				} else {
					Alert.alert("Error", error?.message || "Failed to create order");
				}
			} else if (method === "phonepe") {
				// Get user phone from profile or prompt
				Alert.prompt(
					"PhonePe Payment",
					"Enter your mobile number for UPI/PhonePe payment",
					[
						{
							text: "Cancel",
							style: "cancel",
						},
						{
							text: "Pay",
							onPress: async (phone: string | undefined) => {
								if (!phone) return;

								const { error, order } = await createPhonePePayment(
									user.id,
									selectedPlan.id,
									finalPrice,
									selectedPlan.name,
									billingCycle,
									user.email || "",
									profile?.full_name || user.user_metadata?.full_name || "User",
									phone,
									currentCoupon?.id
								);

								if (!error && order) {
									Alert.alert(
										"PhonePe Payment",
										`Payment link created for ₹${finalPrice.toFixed(
											2
										)}. In production, this would open PhonePe UPI payment.`,
										[
											{ text: "Cancel", style: "cancel" },
											{
												text: "Simulate Success",
												onPress: async () => {
													await completeSubscription();
												},
											},
										]
									);
								} else {
									Alert.alert(
										"Error",
										error?.message || "Failed to create payment"
									);
								}
							},
						},
					],
					"plain-text"
				);
			}
		} catch (error) {
			Alert.alert("Error", (error as Error).message);
		}
	};

	const completeSubscription = async () => {
		if (!selectedPlan || !user) return;

		const { error } = await subscribeToPlan(
			user.id,
			selectedPlan.id,
			billingCycle,
			currentCoupon?.id
		);

		if (!error) {
			await fetchSubscription();
			setShowPayment(false);
			setPaymentMethod(null);
			Alert.alert(
				"Success",
				`You are now subscribed to ${selectedPlan.name}!`,
				[{ text: "OK", onPress: () => router.back() }]
			);
		}
	};

	const handlePaymentOld = async () => {
		if (!selectedPlan || !user) return;

		// Here you would integrate with Stripe
		// For now, we'll simulate a successful payment
		Alert.alert(
			"Payment",
			"This would integrate with Stripe for payment processing. For demo purposes, proceeding with subscription.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Simulate Payment",
					onPress: async () => {
						const { error } = await subscribeToPlan(
							user.id,
							selectedPlan.id,
							billingCycle,
							currentCoupon?.id
						);

						if (!error) {
							await fetchSubscription();
							Alert.alert(
								"Success",
								`You are now subscribed to ${selectedPlan.name}!`,
								[{ text: "OK", onPress: () => router.back() }]
							);
						}
					},
				},
			]
		);
	};

	const styles = createStyles(theme);

	const currentPlanSlug = subscription?.subscription_plans?.slug || "free";

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

			{isLoading && !plans.length ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.primary} />
				</View>
			) : (
				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Current Plan */}
					{subscription && (
						<View style={styles.currentPlanCard}>
							<View style={styles.currentPlanHeader}>
								<Ionicons
									name="checkmark-circle"
									size={24}
									color={theme.success}
								/>
								<Text style={styles.currentPlanTitle}>Current Plan</Text>
							</View>
							<Text style={styles.currentPlanName}>
								{subscription.subscription_plans.name}
							</Text>
							<Text style={styles.currentPlanExpiry}>
								Valid until:{" "}
								{new Date(subscription.current_period_end).toLocaleDateString()}
							</Text>
						</View>
					)}

					{/* Billing Cycle Toggle */}
					<View style={styles.billingToggle}>
						<TouchableOpacity
							style={[
								styles.toggleButton,
								billingCycle === "monthly" && styles.toggleButtonActive,
							]}
							onPress={() => setBillingCycle("monthly")}
						>
							<Text
								style={[
									styles.toggleText,
									billingCycle === "monthly" && styles.toggleTextActive,
								]}
							>
								Monthly
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.toggleButton,
								billingCycle === "yearly" && styles.toggleButtonActive,
							]}
							onPress={() => setBillingCycle("yearly")}
						>
							<Text
								style={[
									styles.toggleText,
									billingCycle === "yearly" && styles.toggleTextActive,
								]}
							>
								Yearly
							</Text>
							<View style={styles.saveBadge}>
								<Text style={styles.saveBadgeText}>Save 20%</Text>
							</View>
						</TouchableOpacity>
					</View>

					{/* Plans */}
					{plans.map((plan) => {
						const isCurrentPlan = plan.slug === currentPlanSlug;
						const isSelected = selectedPlan?.id === plan.id;
						const priceInfo = calculatePrice(
							plan,
							billingCycle,
							isSelected ? currentCoupon : null
						);

						return (
							<TouchableOpacity
								key={plan.id}
								style={[
									styles.planCard,
									isSelected && styles.planCardSelected,
									plan.slug === "premium" && styles.planCardPopular,
								]}
								onPress={() => {
									setSelectedPlan(plan);
									clearCoupon();
									setCouponMessage("");
								}}
								disabled={isCurrentPlan}
							>
								{plan.slug === "premium" && (
									<View style={styles.popularBadge}>
										<Text style={styles.popularBadgeText}>Most Popular</Text>
									</View>
								)}

								<View style={styles.planHeader}>
									<View>
										<Text style={styles.planName}>{plan.name}</Text>
										<Text style={styles.planDescription}>
											{plan.description}
										</Text>
									</View>
									{isSelected && (
										<Ionicons
											name="checkmark-circle"
											size={24}
											color={theme.primary}
										/>
									)}
								</View>

								<View style={styles.priceContainer}>
									{priceInfo.discount > 0 && (
										<Text style={styles.originalPrice}>
											${priceInfo.originalPrice.toFixed(2)}
										</Text>
									)}
									<Text style={styles.price}>
										${priceInfo.finalPrice.toFixed(2)}
									</Text>
									<Text style={styles.pricePeriod}>
										/{billingCycle === "monthly" ? "month" : "year"}
									</Text>
								</View>

								{/* Features */}
								<View style={styles.features}>
									<FeatureItem
										text={`${
											plan.max_habits === -1 ? "Unlimited" : plan.max_habits
										} habits`}
										theme={theme}
									/>
									<FeatureItem
										text={`${
											plan.max_workouts === -1 ? "Unlimited" : plan.max_workouts
										} workouts`}
										theme={theme}
									/>
									{plan.has_analytics && (
										<FeatureItem text="Advanced analytics" theme={theme} />
									)}
									{plan.has_export && (
										<FeatureItem text="Export data" theme={theme} />
									)}
									{plan.has_sync && (
										<FeatureItem text="Cloud sync" theme={theme} />
									)}
									{plan.has_priority_support && (
										<FeatureItem text="Priority support" theme={theme} />
									)}
								</View>

								{isCurrentPlan && (
									<View style={styles.currentBadge}>
										<Text style={styles.currentBadgeText}>Current Plan</Text>
									</View>
								)}
							</TouchableOpacity>
						);
					})}

					{/* Coupon Code */}
					{selectedPlan && selectedPlan.slug !== "free" && (
						<View style={styles.couponContainer}>
							<Text style={styles.couponLabel}>Have a coupon code?</Text>
							<View style={styles.couponInputRow}>
								<TextInput
									style={styles.couponInput}
									placeholder="Enter coupon code"
									placeholderTextColor={theme.textMuted}
									value={couponCode}
									onChangeText={setCouponCode}
									autoCapitalize="characters"
								/>
								<TouchableOpacity
									style={styles.couponButton}
									onPress={handleApplyCoupon}
								>
									<Text style={styles.couponButtonText}>Apply</Text>
								</TouchableOpacity>
							</View>
							{couponMessage && (
								<Text
									style={[
										styles.couponMessage,
										currentCoupon ? styles.couponSuccess : styles.couponError,
									]}
								>
									{couponMessage}
								</Text>
							)}
						</View>
					)}

					{/* Subscribe Button */}
					{selectedPlan && selectedPlan.slug !== currentPlanSlug && (
						<TouchableOpacity
							style={styles.subscribeButton}
							onPress={handleSubscribe}
							disabled={isLoading}
						>
							{isLoading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.subscribeButtonText}>
									{selectedPlan.slug === "free"
										? "Switch to Free"
										: `Subscribe to ${selectedPlan.name}`}
								</Text>
							)}
						</TouchableOpacity>
					)}

					<View style={{ height: 40 }} />
				</ScrollView>
			)}

			{/* Payment Method Selection Modal */}
			{showPayment && selectedPlan && selectedPlan.slug !== "free" && (
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select Payment Method</Text>
							<TouchableOpacity onPress={() => setShowPayment(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.paymentMethods}>
							{/* Razorpay Option */}
							<TouchableOpacity
								style={[
									styles.paymentOption,
									paymentMethod === "razorpay" && styles.paymentOptionActive,
								]}
								onPress={() => setPaymentMethod("razorpay")}
							>
								<View
									style={[
										styles.paymentCheckbox,
										paymentMethod === "razorpay" &&
											styles.paymentCheckboxActive,
									]}
								>
									{paymentMethod === "razorpay" && (
										<Ionicons name="checkmark" size={16} color="#fff" />
									)}
								</View>
								<View style={styles.paymentInfo}>
									<Text style={styles.paymentMethodName}>Razorpay</Text>
									<Text style={styles.paymentMethodDescription}>
										Credit/Debit Card, Netbanking, Wallet
									</Text>
								</View>
								<Ionicons name="card" size={32} color={theme.primary} />
							</TouchableOpacity>

							{/* PhonePe Option */}
							<TouchableOpacity
								style={[
									styles.paymentOption,
									paymentMethod === "phonepe" && styles.paymentOptionActive,
								]}
								onPress={() => setPaymentMethod("phonepe")}
							>
								<View
									style={[
										styles.paymentCheckbox,
										paymentMethod === "phonepe" && styles.paymentCheckboxActive,
									]}
								>
									{paymentMethod === "phonepe" && (
										<Ionicons name="checkmark" size={16} color="#fff" />
									)}
								</View>
								<View style={styles.paymentInfo}>
									<Text style={styles.paymentMethodName}>PhonePe UPI</Text>
									<Text style={styles.paymentMethodDescription}>
										UPI, PhonePe App Payment
									</Text>
								</View>
								<Ionicons
									name="phone-portrait"
									size={32}
									color={theme.success}
								/>
							</TouchableOpacity>
						</View>

						{/* Payment Button */}
						<TouchableOpacity
							style={[
								styles.payButton,
								!paymentMethod && styles.payButtonDisabled,
							]}
							onPress={() => paymentMethod && handlePayment(paymentMethod)}
							disabled={!paymentMethod || isLoading}
						>
							{isLoading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.payButtonText}>
									Continue to{" "}
									{paymentMethod === "razorpay" ? "Razorpay" : "PhonePe"}
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	);
}

const FeatureItem = ({ text, theme }: { text: string; theme: any }) => (
	<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
		<Ionicons
			name="checkmark-circle"
			size={16}
			color={theme.success}
			style={{ marginRight: 8 }}
		/>
		<Text style={{ color: theme.textSecondary, fontSize: 14 }}>{text}</Text>
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
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		content: {
			flex: 1,
			padding: 16,
		},
		currentPlanCard: {
			backgroundColor: theme.successLight,
			borderRadius: 12,
			padding: 16,
			marginBottom: 20,
		},
		currentPlanHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 8,
		},
		currentPlanTitle: {
			color: theme.success,
			fontSize: 14,
			fontWeight: "500",
			marginLeft: 8,
		},
		currentPlanName: {
			color: theme.text,
			fontSize: 20,
			fontWeight: "bold",
		},
		currentPlanExpiry: {
			color: theme.textSecondary,
			fontSize: 14,
			marginTop: 4,
		},
		billingToggle: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		toggleButton: {
			flex: 1,
			paddingVertical: 12,
			alignItems: "center",
			borderRadius: 10,
			flexDirection: "row",
			justifyContent: "center",
		},
		toggleButtonActive: {
			backgroundColor: theme.primary,
		},
		toggleText: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
		},
		toggleTextActive: {
			color: "#fff",
		},
		saveBadge: {
			backgroundColor: theme.success,
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 4,
			marginLeft: 8,
		},
		saveBadgeText: {
			color: "#fff",
			fontSize: 10,
			fontWeight: "600",
		},
		planCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			borderWidth: 2,
			borderColor: theme.border,
		},
		planCardSelected: {
			borderColor: theme.primary,
		},
		planCardPopular: {
			borderColor: theme.warning,
		},
		popularBadge: {
			position: "absolute",
			top: -10,
			right: 20,
			backgroundColor: theme.warning,
			paddingHorizontal: 12,
			paddingVertical: 4,
			borderRadius: 12,
		},
		popularBadgeText: {
			color: "#fff",
			fontSize: 12,
			fontWeight: "600",
		},
		planHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 16,
		},
		planName: {
			fontSize: 20,
			fontWeight: "bold",
			color: theme.text,
		},
		planDescription: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 4,
		},
		priceContainer: {
			flexDirection: "row",
			alignItems: "baseline",
			marginBottom: 16,
		},
		originalPrice: {
			fontSize: 16,
			color: theme.textMuted,
			textDecorationLine: "line-through",
			marginRight: 8,
		},
		price: {
			fontSize: 32,
			fontWeight: "bold",
			color: theme.text,
		},
		pricePeriod: {
			fontSize: 14,
			color: theme.textSecondary,
			marginLeft: 4,
		},
		features: {
			marginTop: 8,
		},
		currentBadge: {
			position: "absolute",
			top: 20,
			right: 20,
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 12,
			paddingVertical: 4,
			borderRadius: 12,
		},
		currentBadgeText: {
			color: theme.primary,
			fontSize: 12,
			fontWeight: "600",
		},
		couponContainer: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 20,
		},
		couponLabel: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "500",
			marginBottom: 12,
		},
		couponInputRow: {
			flexDirection: "row",
			gap: 12,
		},
		couponInput: {
			flex: 1,
			height: 44,
			backgroundColor: theme.background,
			borderRadius: 8,
			paddingHorizontal: 12,
			color: theme.text,
			fontSize: 14,
		},
		couponButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 20,
			borderRadius: 8,
			justifyContent: "center",
		},
		couponButtonText: {
			color: "#fff",
			fontWeight: "600",
		},
		couponMessage: {
			marginTop: 8,
			fontSize: 12,
		},
		couponSuccess: {
			color: theme.success,
		},
		couponError: {
			color: theme.error,
		},
		subscribeButton: {
			backgroundColor: theme.primary,
			height: 52,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		subscribeButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
		modalOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			paddingBottom: 20,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.text,
		},
		paymentMethods: {
			padding: 16,
			gap: 12,
		},
		paymentOption: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: theme.border,
			gap: 12,
		},
		paymentOptionActive: {
			borderColor: theme.primary,
			backgroundColor: theme.primary + "10",
		},
		paymentCheckbox: {
			width: 24,
			height: 24,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		paymentCheckboxActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		paymentInfo: {
			flex: 1,
		},
		paymentMethodName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		paymentMethodDescription: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		payButton: {
			marginHorizontal: 16,
			marginTop: 16,
			backgroundColor: theme.primary,
			height: 52,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		payButtonDisabled: {
			opacity: 0.5,
		},
		payButtonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
	});
