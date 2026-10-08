import { create } from "zustand";
import { supabase } from "../config/supabase";
import {
	CheckoutResult,
	PaymentProvider,
	startCheckout,
} from "../services/paymentService";
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
		billingCycle: "monthly" | "yearly",
	) => Promise<{
		valid: boolean;
		coupon: Coupon | null;
		message: string;
	}>;
	calculatePrice: (
		plan: SubscriptionPlanRow,
		billingCycle: "monthly" | "yearly",
		coupon?: Coupon | null,
	) => { originalPrice: number; finalPrice: number; discount: number };
	subscribeToPlan: (
		userId: string,
		planId: string,
		billingCycle: "monthly" | "yearly",
		couponId?: string,
	) => Promise<{ error: Error | null; subscription: UserSubscription | null }>;
	cancelSubscription: (
		subscriptionId: string,
	) => Promise<{ error: Error | null }>;
	/** Paid plans only. Activation happens server-side after payment. */
	startCheckout: (
		planId: string,
		billingCycle: "monthly" | "yearly",
		provider: PaymentProvider,
	) => Promise<CheckoutResult>;
	clearCoupon: () => void;
	clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

// Collapses concurrent subscribeToPlan calls for the same plan onto one request.
const subscribeInFlight = new Map<
	string,
	Promise<{ error: Error | null; subscription: UserSubscription | null }>
>();

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
		billingCycle: "monthly" | "yearly",
	) => {
		set({ isLoading: true, error: null });
		try {
			// The coupons table is admin-only; validate_coupon() answers for one
			// code at a time, so the full list of codes cannot be read.
			const { data: rows, error } = await (supabase.rpc as any)(
				"validate_coupon",
				{ p_code: code.trim().toUpperCase() },
			);
			const coupon = Array.isArray(rows) ? rows[0] : rows;

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
		coupon?: Coupon | null,
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
		couponId?: string,
	) => {
		// A retry after the cancel-then-insert pair partly ran would cancel the
		// subscription it just created and charge for a second one.
		const inFlightKey = `${userId}:${planId}:${billingCycle}`;
		if (subscribeInFlight.has(inFlightKey)) {
			return subscribeInFlight.get(inFlightKey)!;
		}

		const run = async () => {
			set({ isLoading: true, error: null });
			try {
				// The app may only switch a user onto the free plan. Paid plans are
				// activated by the payment webhook or by an admin, and the database
				// rejects a client insert for any other plan.
				const plan = get().plans.find((p) => p.id === planId);
				if (!plan || plan.slug !== "free") {
					throw new Error("Paid plans are activated after payment.");
				}

				// Calculate period dates
				const now = new Date();
				const endDate = new Date();
				if (billingCycle === "monthly") {
					endDate.setMonth(endDate.getMonth() + 1);
				} else {
					endDate.setFullYear(endDate.getFullYear() + 1);
				}

				// If this exact plan is already active, a previous attempt got through.
				// Return it rather than cancelling and re-inserting a duplicate.
				const { data: existing } = await (
					supabase.from("user_subscriptions") as any
				)
					.select("*")
					.eq("user_id", userId)
					.eq("plan_id", planId)
					.eq("billing_cycle", billingCycle)
					.eq("status", "active")
					.maybeSingle();

				if (existing) {
					set({ currentCoupon: null });
					return { error: null, subscription: existing };
				}

				// Deactivate existing subscription
				await (supabase.from("user_subscriptions") as any)
					.update({ status: "cancelled", cancelled_at: now.toISOString() })
					.eq("user_id", userId)
					.eq("status", "active");

				// Create new subscription
				const { data: subscription, error } = await (
					supabase.from("user_subscriptions") as any
				)
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

				set({ currentCoupon: null });
				return { error: null, subscription };
			} catch (error) {
				set({ error: (error as Error).message });
				return { error: error as Error, subscription: null };
			} finally {
				set({ isLoading: false });
			}
		};

		const promise = run().finally(() => subscribeInFlight.delete(inFlightKey));
		subscribeInFlight.set(inFlightKey, promise);
		return promise;
	},

	cancelSubscription: async (subscriptionId: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("user_subscriptions") as any)
				.update({
					cancel_at_period_end: true,
					updated_at: new Date().toISOString(),
				})
				.eq("id", subscriptionId);

			if (error) throw error;

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	startCheckout: async (planId, billingCycle, provider) => {
		set({ isLoading: true, error: null });
		try {
			return await startCheckout({
				planId,
				billingCycle,
				provider,
				couponCode: get().currentCoupon?.code,
			});
		} finally {
			set({ isLoading: false });
		}
	},

	clearCoupon: () => set({ currentCoupon: null, discountedPrice: null }),
	clearError: () => set({ error: null }),
}));
