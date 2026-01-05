// Database types for Supabase

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type SubscriptionPlan = "free" | "basic" | "premium" | "enterprise";
export type SubscriptionStatus =
	| "active"
	| "cancelled"
	| "expired"
	| "trial"
	| "past_due";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type UserRole = "user" | "admin" | "super_admin";

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					full_name: string | null;
					avatar_url: string | null;
					role: UserRole;
					is_active: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					full_name?: string | null;
					avatar_url?: string | null;
					role?: UserRole;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string;
					full_name?: string | null;
					avatar_url?: string | null;
					role?: UserRole;
					is_active?: boolean;
					updated_at?: string;
				};
			};
			subscription_plans: {
				Row: {
					id: string;
					name: string;
					slug: SubscriptionPlan;
					description: string | null;
					price_monthly: number;
					price_yearly: number;
					currency: string;
					features: Json;
					max_habits: number;
					max_workouts: number;
					has_analytics: boolean;
					has_export: boolean;
					has_sync: boolean;
					has_priority_support: boolean;
					is_active: boolean;
					stripe_price_id_monthly: string | null;
					stripe_price_id_yearly: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					slug: SubscriptionPlan;
					description?: string | null;
					price_monthly: number;
					price_yearly: number;
					currency?: string;
					features?: Json;
					max_habits?: number;
					max_workouts?: number;
					has_analytics?: boolean;
					has_export?: boolean;
					has_sync?: boolean;
					has_priority_support?: boolean;
					is_active?: boolean;
					stripe_price_id_monthly?: string | null;
					stripe_price_id_yearly?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					name?: string;
					slug?: SubscriptionPlan;
					description?: string | null;
					price_monthly?: number;
					price_yearly?: number;
					currency?: string;
					features?: Json;
					max_habits?: number;
					max_workouts?: number;
					has_analytics?: boolean;
					has_export?: boolean;
					has_sync?: boolean;
					has_priority_support?: boolean;
					is_active?: boolean;
					stripe_price_id_monthly?: string | null;
					stripe_price_id_yearly?: string | null;
					updated_at?: string;
				};
			};
			user_subscriptions: {
				Row: {
					id: string;
					user_id: string;
					plan_id: string;
					status: SubscriptionStatus;
					billing_cycle: "monthly" | "yearly";
					current_period_start: string;
					current_period_end: string;
					cancel_at_period_end: boolean;
					cancelled_at: string | null;
					trial_start: string | null;
					trial_end: string | null;
					stripe_subscription_id: string | null;
					stripe_customer_id: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					plan_id: string;
					status?: SubscriptionStatus;
					billing_cycle?: "monthly" | "yearly";
					current_period_start?: string;
					current_period_end?: string;
					cancel_at_period_end?: boolean;
					cancelled_at?: string | null;
					trial_start?: string | null;
					trial_end?: string | null;
					stripe_subscription_id?: string | null;
					stripe_customer_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					plan_id?: string;
					status?: SubscriptionStatus;
					billing_cycle?: "monthly" | "yearly";
					current_period_start?: string;
					current_period_end?: string;
					cancel_at_period_end?: boolean;
					cancelled_at?: string | null;
					trial_start?: string | null;
					trial_end?: string | null;
					stripe_subscription_id?: string | null;
					stripe_customer_id?: string | null;
					updated_at?: string;
				};
			};
			coupons: {
				Row: {
					id: string;
					code: string;
					description: string | null;
					discount_type: "percentage" | "fixed";
					discount_value: number;
					max_uses: number | null;
					used_count: number;
					valid_from: string;
					valid_until: string | null;
					applicable_plans: SubscriptionPlan[];
					min_billing_cycle: "monthly" | "yearly" | null;
					is_active: boolean;
					created_by: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					code: string;
					description?: string | null;
					discount_type: "percentage" | "fixed";
					discount_value: number;
					max_uses?: number | null;
					used_count?: number;
					valid_from?: string;
					valid_until?: string | null;
					applicable_plans?: SubscriptionPlan[];
					min_billing_cycle?: "monthly" | "yearly" | null;
					is_active?: boolean;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					code?: string;
					description?: string | null;
					discount_type?: "percentage" | "fixed";
					discount_value?: number;
					max_uses?: number | null;
					used_count?: number;
					valid_from?: string;
					valid_until?: string | null;
					applicable_plans?: SubscriptionPlan[];
					min_billing_cycle?: "monthly" | "yearly" | null;
					is_active?: boolean;
					created_by?: string | null;
					updated_at?: string;
				};
			};
			coupon_redemptions: {
				Row: {
					id: string;
					coupon_id: string;
					user_id: string;
					subscription_id: string | null;
					redeemed_at: string;
					discount_applied: number;
				};
				Insert: {
					id?: string;
					coupon_id: string;
					user_id: string;
					subscription_id?: string | null;
					redeemed_at?: string;
					discount_applied: number;
				};
				Update: {
					coupon_id?: string;
					user_id?: string;
					subscription_id?: string | null;
					redeemed_at?: string;
					discount_applied?: number;
				};
			};
			payments: {
				Row: {
					id: string;
					user_id: string;
					subscription_id: string | null;
					amount: number;
					currency: string;
					status: PaymentStatus;
					payment_method: string | null;
					stripe_payment_intent_id: string | null;
					stripe_invoice_id: string | null;
					coupon_id: string | null;
					discount_amount: number;
					description: string | null;
					metadata: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					subscription_id?: string | null;
					amount: number;
					currency?: string;
					status?: PaymentStatus;
					payment_method?: string | null;
					stripe_payment_intent_id?: string | null;
					stripe_invoice_id?: string | null;
					coupon_id?: string | null;
					discount_amount?: number;
					description?: string | null;
					metadata?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					subscription_id?: string | null;
					amount?: number;
					currency?: string;
					status?: PaymentStatus;
					payment_method?: string | null;
					stripe_payment_intent_id?: string | null;
					stripe_invoice_id?: string | null;
					coupon_id?: string | null;
					discount_amount?: number;
					description?: string | null;
					metadata?: Json;
					updated_at?: string;
				};
			};
		};
		Views: {};
		Functions: {};
		Enums: {
			subscription_plan: SubscriptionPlan;
			subscription_status: SubscriptionStatus;
			payment_status: PaymentStatus;
			user_role: UserRole;
		};
	};
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SubscriptionPlanRow =
	Database["public"]["Tables"]["subscription_plans"]["Row"];
export type UserSubscription =
	Database["public"]["Tables"]["user_subscriptions"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponRedemption =
	Database["public"]["Tables"]["coupon_redemptions"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

// Extended types with relations
export type UserSubscriptionWithPlan = UserSubscription & {
	subscription_plans: SubscriptionPlanRow;
};

export type ProfileWithSubscription = Profile & {
	user_subscriptions: UserSubscriptionWithPlan[];
};
