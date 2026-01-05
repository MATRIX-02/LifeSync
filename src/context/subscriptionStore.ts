import { create } from "zustand";
import { supabase } from "../config/supabase";
import { PhonePeOrder, phonepeService } from "../services/phonepeService";
import { RazorpayOrder, razorpayService } from "../services/razorpayService";
import {
	Coupon,
	SubscriptionPlan,
	SubscriptionPlanRow,
	UserSubscription,
} from "../types/database";

interface SubscriptionState {
	plans: SubscriptionPlanRow[];
	currentCoupon: Coupon | null;
	discountedPrice: number | null;
	isLoading: boolean;
	error: string | null;
}

interface SubscriptionActions {
	fetchPlans: () => Promise<void>;
	validateCoupon: (
		code: string,
		planSlug: SubscriptionPlan,
		billingCycle: "monthly" | "yearly"
	) => Promise<{
		valid: boolean;
		coupon: Coupon | null;
		message: string;
	}>;
	calculatePrice: (
		plan: SubscriptionPlanRow,
		billingCycle: "monthly" | "yearly",
		coupon?: Coupon | null
	) => { originalPrice: number; finalPrice: number; discount: number };
	subscribeToPlan: (
		userId: string,
		planId: string,
		billingCycle: "monthly" | "yearly",
		couponId?: string
	) => Promise<{ error: Error | null; subscription: UserSubscription | null }>;
	cancelSubscription: (
		subscriptionId: string
	) => Promise<{ error: Error | null }>;
	createRazorpayOrder: (
		userId: string,
		planId: string,
		amount: number,
		planName: string,
		billingCycle: "monthly" | "yearly",
		userEmail: string,
		userName: string,
		couponId?: string
	) => Promise<{ error: Error | null; order: RazorpayOrder | null }>;
	createPhonePePayment: (
		userId: string,
		planId: string,
		amount: number,
		planName: string,
		billingCycle: "monthly" | "yearly",
		userEmail: string,
		userName: string,
		userPhone: string,
		couponId?: string
	) => Promise<{ error: Error | null; order: PhonePeOrder | null }>;
	clearCoupon: () => void;
	clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
	// State
	plans: [],
	currentCoupon: null,
	discountedPrice: null,
	isLoading: false,
	error: null,

	// Actions
	fetchPlans: async () => {
		set({ isLoading: true, error: null });
		try {
			const { data, error } = await supabase
				.from("subscription_plans")
				.select("*")
				.eq("is_active", true)
				.order("price_monthly", { ascending: true });

			if (error) throw error;

			set({ plans: data || [] });
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	validateCoupon: async (
		code: string,
		planSlug: SubscriptionPlan,
		billingCycle: "monthly" | "yearly"
	) => {
		set({ isLoading: true, error: null });
		try {
			const { data: coupon, error } = await supabase
				.from("coupons")
				.select("*")
				.eq("code", code.toUpperCase())
				.eq("is_active", true)
				.single();

			if (error || !coupon) {
				set({ currentCoupon: null });
				return { valid: false, coupon: null, message: "Invalid coupon code" };
			}

			// Check validity period
			const now = new Date();
			const validFrom = new Date((coupon as any).valid_from);
			const validUntil = (coupon as any).valid_until
				? new Date((coupon as any).valid_until)
				: null;

			if (now < validFrom) {
				return {
					valid: false,
					coupon: null,
					message: "Coupon is not yet active",
				};
			}

			if (validUntil && now > validUntil) {
				return { valid: false, coupon: null, message: "Coupon has expired" };
			}

			// Check max uses
			if (
				(coupon as any).max_uses &&
				(coupon as any).used_count >= (coupon as any).max_uses
			) {
				return {
					valid: false,
					coupon: null,
					message: "Coupon usage limit reached",
				};
			}

			// Check applicable plans
			if (
				(coupon as any).applicable_plans &&
				(coupon as any).applicable_plans.length > 0 &&
				!(coupon as any).applicable_plans.includes(planSlug)
			) {
				return {
					valid: false,
					coupon: null,
					message: `Coupon not valid for ${planSlug} plan`,
				};
			}

			// Check billing cycle requirement
			if (
				(coupon as any).min_billing_cycle === "yearly" &&
				billingCycle === "monthly"
			) {
				return {
					valid: false,
					coupon: null,
					message: "Coupon only valid for yearly billing",
				};
			}

			set({ currentCoupon: coupon });
			return { valid: true, coupon, message: "Coupon applied successfully!" };
		} catch (error) {
			set({ error: (error as Error).message });
			return { valid: false, coupon: null, message: "Error validating coupon" };
		} finally {
			set({ isLoading: false });
		}
	},

	calculatePrice: (
		plan: SubscriptionPlanRow,
		billingCycle: "monthly" | "yearly",
		coupon?: Coupon | null
	) => {
		const originalPrice =
			billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;

		if (!coupon) {
			return { originalPrice, finalPrice: originalPrice, discount: 0 };
		}

		let discount = 0;
		if (coupon.discount_type === "percentage") {
			discount = (originalPrice * coupon.discount_value) / 100;
		} else {
			discount = coupon.discount_value;
		}

		const finalPrice = Math.max(0, originalPrice - discount);

		return { originalPrice, finalPrice, discount };
	},

	subscribeToPlan: async (
		userId: string,
		planId: string,
		billingCycle: "monthly" | "yearly",
		couponId?: string
	) => {
		set({ isLoading: true, error: null });
		try {
			// Calculate period dates
			const now = new Date();
			const endDate = new Date();
			if (billingCycle === "monthly") {
				endDate.setMonth(endDate.getMonth() + 1);
			} else {
				endDate.setFullYear(endDate.getFullYear() + 1);
			}

			// Deactivate existing subscription
			await supabase
				.from("user_subscriptions")
				.update({ status: "cancelled", cancelled_at: now.toISOString() })
				.eq("user_id", userId)
				.eq("status", "active");

			// Create new subscription
			const { data: subscription, error } = await supabase
				.from("user_subscriptions")
				.insert({
					user_id: userId,
					plan_id: planId,
					status: "active",
					billing_cycle: billingCycle,
					current_period_start: now.toISOString(),
					current_period_end: endDate.toISOString(),
				})
				.select()
				.single();

			if (error) throw error;

			// Update coupon usage if used
			if (couponId) {
				await (supabase.rpc as any)("increment_coupon_usage", {
					coupon_id: couponId,
				});

				// Record coupon redemption
				const { currentCoupon } = get();
				if (currentCoupon) {
					const plan = get().plans.find((p) => p.id === planId);
					if (plan) {
						const { discount } = get().calculatePrice(
							plan,
							billingCycle,
							currentCoupon
						);
						await (supabase.from("coupon_redemptions").insert({
							coupon_id: couponId,
							user_id: userId,
							subscription_id: (subscription as any).id,
							discount_applied: discount,
						}) as any);
					}
				}
			}

			set({ currentCoupon: null });
			return { error: null, subscription };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error, subscription: null };
		} finally {
			set({ isLoading: false });
		}
	},

	cancelSubscription: async (subscriptionId: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase
				.from("user_subscriptions")
				.update({
					cancel_at_period_end: true,
					updated_at: new Date().toISOString(),
				})
				.eq("id", subscriptionId) as any);

			if (error) throw error;

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	createRazorpayOrder: async (
		userId: string,
		planId: string,
		amount: number,
		planName: string,
		billingCycle: "monthly" | "yearly",
		userEmail: string,
		userName: string,
		couponId?: string
	) => {
		set({ isLoading: true, error: null });
		try {
			const order = await razorpayService.createOrder({
				userId,
				planId,
				amount: Math.round(amount * 100), // Convert to paise
				planName,
				billingCycle,
				couponId,
				userEmail,
				userName,
			});

			return { error: null, order };
		} catch (error) {
			const errorMsg = (error as Error).message;
			set({ error: errorMsg });
			return { error: new Error(errorMsg), order: null };
		} finally {
			set({ isLoading: false });
		}
	},

	createPhonePePayment: async (
		userId: string,
		planId: string,
		amount: number,
		planName: string,
		billingCycle: "monthly" | "yearly",
		userEmail: string,
		userName: string,
		userPhone: string,
		couponId?: string
	) => {
		set({ isLoading: true, error: null });
		try {
			const order = await phonepeService.createPayment({
				userId,
				planId,
				amount: Math.round(amount * 100), // Convert to paise
				planName,
				billingCycle,
				couponId,
				userEmail,
				userName,
				userPhone,
			});

			return { error: null, order };
		} catch (error) {
			const errorMsg = (error as Error).message;
			set({ error: errorMsg });
			return { error: new Error(errorMsg), order: null };
		} finally {
			set({ isLoading: false });
		}
	},

	clearCoupon: () => set({ currentCoupon: null, discountedPrice: null }),
	clearError: () => set({ error: null }),
}));
