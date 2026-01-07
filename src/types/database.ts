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
export type ExerciseCategory =
	| "strength"
	| "cardio"
	| "flexibility"
	| "hiit"
	| "calisthenics"
	| "plyometrics";
export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "athlete";
export type WeightUnit = "kg" | "lbs";
export type PRType = "weight" | "reps" | "duration" | "distance";

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					full_name: string | null;
					avatar_url: string | null;
					bio: string | null;
					role: UserRole;
					is_active: boolean;
					expo_push_token: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					full_name?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
					role?: UserRole;
					is_active?: boolean;
					expo_push_token?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string;
					full_name?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
					role?: UserRole;
					is_active?: boolean;
					expo_push_token?: string | null;
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
					// Habits limits
					max_habits: number;
					// Workout limits
					max_workouts: number;
					max_workout_plans: number;
					max_history_days: number;
					has_custom_exercises: boolean;
					has_advanced_stats: boolean;
					// Finance limits
					max_accounts: number;
					max_transactions_per_month: number;
					max_budgets: number;
					max_savings_goals: number;
					// General features
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
					// Habits limits
					max_habits?: number;
					// Workout limits
					max_workouts?: number;
					max_workout_plans?: number;
					max_history_days?: number;
					has_custom_exercises?: boolean;
					has_advanced_stats?: boolean;
					// Finance limits
					max_accounts?: number;
					max_transactions_per_month?: number;
					max_budgets?: number;
					max_savings_goals?: number;
					// General features
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
					// Habits limits
					max_habits?: number;
					// Workout limits
					max_workouts?: number;
					max_workout_plans?: number;
					max_history_days?: number;
					has_custom_exercises?: boolean;
					has_advanced_stats?: boolean;
					// Finance limits
					max_accounts?: number;
					max_transactions_per_month?: number;
					max_budgets?: number;
					max_savings_goals?: number;
					// General features
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
			custom_exercises: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					category: ExerciseCategory;
					primary_muscles: string[];
					secondary_muscles: string[];
					target_muscles: string[];
					equipment: string[];
					difficulty: FitnessLevel;
					description: string | null;
					instructions: string[];
					tips: string[];
					video_url: string | null;
					image_url: string | null;
					is_custom: boolean;
					muscle_group: string | null;
					is_compound: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					user_id: string;
					name: string;
					category?: ExerciseCategory;
					primary_muscles: string[];
					secondary_muscles?: string[];
					target_muscles: string[];
					equipment?: string[];
					difficulty?: FitnessLevel;
					description?: string | null;
					instructions?: string[];
					tips?: string[];
					video_url?: string | null;
					image_url?: string | null;
					is_custom?: boolean;
					muscle_group?: string | null;
					is_compound?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					name?: string;
					category?: ExerciseCategory;
					primary_muscles?: string[];
					secondary_muscles?: string[];
					target_muscles?: string[];
					equipment?: string[];
					difficulty?: FitnessLevel;
					description?: string | null;
					instructions?: string[];
					tips?: string[];
					video_url?: string | null;
					image_url?: string | null;
					muscle_group?: string | null;
					is_compound?: boolean;
					updated_at?: string;
				};
			};
			workout_plans: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					description: string | null;
					category: ExerciseCategory;
					difficulty: FitnessLevel;
					target_muscle_groups: string[];
					estimated_duration: number;
					exercises: Json;
					is_custom: boolean;
					is_active: boolean;
					color: string;
					icon: string;
					days_per_week: number | null;
					schedule: Json | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					user_id: string;
					name: string;
					description?: string | null;
					category?: ExerciseCategory;
					difficulty?: FitnessLevel;
					target_muscle_groups: string[];
					estimated_duration?: number;
					exercises?: Json;
					is_custom?: boolean;
					is_active?: boolean;
					color?: string;
					icon?: string;
					days_per_week?: number | null;
					schedule?: Json | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					name?: string;
					description?: string | null;
					category?: ExerciseCategory;
					difficulty?: FitnessLevel;
					target_muscle_groups?: string[];
					estimated_duration?: number;
					exercises?: Json;
					is_active?: boolean;
					color?: string;
					icon?: string;
					days_per_week?: number | null;
					schedule?: Json | null;
					updated_at?: string;
				};
			};
			workout_sessions: {
				Row: {
					id: string;
					user_id: string;
					plan_id: string | null;
					plan_name: string | null;
					name: string;
					date: string;
					start_time: string;
					end_time: string | null;
					duration: number;
					exercises: Json;
					total_volume: number;
					calories_burned: number | null;
					mood: number | null;
					energy_level: number | null;
					notes: string | null;
					photo_urls: string[];
					is_completed: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					user_id: string;
					plan_id?: string | null;
					plan_name?: string | null;
					name: string;
					date: string;
					start_time: string;
					end_time?: string | null;
					duration?: number;
					exercises?: Json;
					total_volume?: number;
					calories_burned?: number | null;
					mood?: number | null;
					energy_level?: number | null;
					notes?: string | null;
					photo_urls?: string[];
					is_completed?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					plan_id?: string | null;
					plan_name?: string | null;
					name?: string;
					date?: string;
					start_time?: string;
					end_time?: string | null;
					duration?: number;
					exercises?: Json;
					total_volume?: number;
					calories_burned?: number | null;
					mood?: number | null;
					energy_level?: number | null;
					notes?: string | null;
					photo_urls?: string[];
					is_completed?: boolean;
					updated_at?: string;
				};
			};
			personal_records: {
				Row: {
					id: string;
					user_id: string;
					exercise_id: string;
					exercise_name: string;
					type: PRType;
					value: number;
					previous_value: number | null;
					date: string;
					workout_session_id: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					user_id: string;
					exercise_id: string;
					exercise_name: string;
					type: PRType;
					value: number;
					previous_value?: number | null;
					date: string;
					workout_session_id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					exercise_id?: string;
					exercise_name?: string;
					type?: PRType;
					value?: number;
					previous_value?: number | null;
					date?: string;
					workout_session_id?: string;
					updated_at?: string;
				};
			};
			body_weights: {
				Row: {
					id: string;
					user_id: string;
					date: string;
					weight: number;
					unit: WeightUnit;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					user_id: string;
					date: string;
					weight: number;
					unit?: WeightUnit;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					date?: string;
					weight?: number;
					unit?: WeightUnit;
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

// Workout module helper types
export type CustomExerciseRow =
	Database["public"]["Tables"]["custom_exercises"]["Row"];
export type WorkoutPlanRow =
	Database["public"]["Tables"]["workout_plans"]["Row"];
export type WorkoutSessionRow =
	Database["public"]["Tables"]["workout_sessions"]["Row"];
export type PersonalRecordRow =
	Database["public"]["Tables"]["personal_records"]["Row"];
export type BodyWeightRow = Database["public"]["Tables"]["body_weights"]["Row"];

// Extended types with relations
export type UserSubscriptionWithPlan = UserSubscription & {
	subscription_plans: SubscriptionPlanRow;
};

export type ProfileWithSubscription = Profile & {
	user_subscriptions: UserSubscriptionWithPlan[];
};
