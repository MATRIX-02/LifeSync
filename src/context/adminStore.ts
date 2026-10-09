import { create } from "zustand";
import { supabase, supabaseDirect } from "../config/supabase";
import {
	Coupon,
	Payment,
	ProfileWithSubscription,
	SubscriptionPlanRow,
	UserRole,
} from "../types/database";

export type PushAudience = "users" | "all" | "free" | "premium";

export interface PushResult {
	targeted: number;
	noDevice: number;
	sent: number;
}

export type AnnouncementAudience = "all" | "free" | "premium";

export interface Announcement {
	id: string;
	title: string;
	body: string;
	audience: AnnouncementAudience;
	is_active: boolean;
	created_at: string;
}

// The function's JSON error code, so callers can say something specific.
const functionError = async (error: any): Promise<Error> => {
	try {
		const body = await error?.context?.json?.();
		if (body?.error) return new Error(body.error);
	} catch {
		// Not a JSON response.
	}
	return new Error(error?.message ?? "Request failed");
};

interface AdminStats {
	totalUsers: number;
	activeUsers: number;
	totalRevenue: number;
	monthlyRevenue: number;
	subscriptionsByPlan: { plan: string; count: number }[];
	recentSignups: number;
}

interface AdminState {
	users: ProfileWithSubscription[];
	coupons: Coupon[];
	plans: SubscriptionPlanRow[];
	payments: Payment[];
	stats: AdminStats | null;
	selectedUser: ProfileWithSubscription | null;
	isLoading: boolean;
	error: string | null;
	searchQuery: string;
	currentPage: number;
	totalPages: number;
	pageSize: number;
}

interface AdminActions {
	// Users
	fetchUsers: (page?: number, search?: string) => Promise<void>;
	updateUserRole: (
		userId: string,
		role: UserRole
	) => Promise<{ error: Error | null }>;
	toggleUserActive: (
		userId: string,
		isActive: boolean
	) => Promise<{ error: Error | null }>;
	updateUserSubscription: (
		userId: string,
		planId: string,
		status: string
	) => Promise<{ error: Error | null }>;
	setSelectedUser: (user: ProfileWithSubscription | null) => void;
	sendPush: (params: {
		audience: PushAudience;
		userIds?: string[];
		title: string;
		body: string;
		route?: string;
	}) => Promise<{ result: PushResult | null; error: Error | null }>;
	/** "Update available" push; title/body default on the server. */
	sendUpdatePush: (params: {
		audience: PushAudience;
		userIds?: string[];
		version: string;
		title?: string;
		body?: string;
	}) => Promise<{ result: PushResult | null; error: Error | null }>;
	deleteUser: (userId: string) => Promise<{ error: Error | null }>;

	// Announcements
	announcements: Announcement[];
	fetchAnnouncements: () => Promise<void>;
	createAnnouncement: (
		a: Pick<Announcement, "title" | "body" | "audience">
	) => Promise<{ error: Error | null }>;
	setAnnouncementActive: (
		id: string,
		isActive: boolean
	) => Promise<{ error: Error | null }>;
	deleteAnnouncement: (id: string) => Promise<{ error: Error | null }>;

	// Coupons
	fetchCoupons: () => Promise<void>;
	createCoupon: (
		coupon: Omit<Coupon, "id" | "created_at" | "updated_at" | "used_count">
	) => Promise<{ error: Error | null }>;
	updateCoupon: (
		id: string,
		updates: Partial<Coupon>
	) => Promise<{ error: Error | null }>;
	deleteCoupon: (id: string) => Promise<{ error: Error | null }>;
	toggleCouponActive: (
		id: string,
		isActive: boolean
	) => Promise<{ error: Error | null }>;

	// Plans
	fetchPlans: () => Promise<void>;
	updatePlan: (
		id: string,
		updates: Partial<SubscriptionPlanRow>
	) => Promise<{ error: Error | null }>;

	// Payments
	fetchPayments: (page?: number) => Promise<void>;

	// Stats
	fetchStats: () => Promise<void>;

	// Utility
	setSearchQuery: (query: string) => void;
	clearError: () => void;
}

type AdminStore = AdminState & AdminActions;

const PAGE_SIZE = 20;

export const useAdminStore = create<AdminStore>((set, get) => ({
	// State
	users: [],
	coupons: [],
	plans: [],
	payments: [],
	stats: null,
	selectedUser: null,
	isLoading: false,
	error: null,
	searchQuery: "",
	currentPage: 1,
	totalPages: 1,
	pageSize: PAGE_SIZE,

	announcements: [],

	// User Actions
	sendPush: async (params) => {
		const { data, error } = await supabaseDirect.functions.invoke<PushResult>(
			"admin-actions",
			{ body: { action: "send_push", ...params } }
		);
		if (error) return { result: null, error: await functionError(error) };
		return { result: data, error: null };
	},

	sendUpdatePush: async (params) => {
		const { data, error } = await supabaseDirect.functions.invoke<PushResult>(
			"admin-actions",
			{ body: { action: "send_update", ...params } }
		);
		if (error) return { result: null, error: await functionError(error) };
		return { result: data, error: null };
	},

	deleteUser: async (userId) => {
		const { error } = await supabaseDirect.functions.invoke("admin-actions", {
			body: { action: "delete_user", userId },
		});
		if (error) return { error: await functionError(error) };
		set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
		return { error: null };
	},

	fetchAnnouncements: async () => {
		const { data, error } = await (supabase.from("announcements" as any) as any)
			.select("*")
			.order("created_at", { ascending: false });
		if (error) {
			set({ error: error.message });
			return;
		}
		set({ announcements: (data ?? []) as Announcement[] });
	},

	createAnnouncement: async (a) => {
		const { error } = await (supabase.from("announcements" as any) as any).insert({
			...a,
			is_active: true,
		});
		if (error) return { error: new Error(error.message) };
		await get().fetchAnnouncements();
		return { error: null };
	},

	setAnnouncementActive: async (id, isActive) => {
		const { error } = await (supabase.from("announcements" as any) as any)
			.update({ is_active: isActive })
			.eq("id", id);
		if (error) return { error: new Error(error.message) };
		set((state) => ({
			announcements: state.announcements.map((a) =>
				a.id === id ? { ...a, is_active: isActive } : a
			),
		}));
		return { error: null };
	},

	deleteAnnouncement: async (id) => {
		const { error } = await (supabase.from("announcements" as any) as any)
			.delete()
			.eq("id", id);
		if (error) return { error: new Error(error.message) };
		set((state) => ({
			announcements: state.announcements.filter((a) => a.id !== id),
		}));
		return { error: null };
	},

	fetchUsers: async (page = 1, search = "") => {
		set({ isLoading: true, error: null });
		try {
			const from = (page - 1) * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			// Filter user_subscriptions to only include active ones
			let query = supabase
				.from("profiles")
				.select(
					`
					*,
					user_subscriptions!left (
						*,
						subscription_plans (*)
					)
				`,
					{ count: "exact" }
				)
				.order("created_at", { ascending: false })
				.range(from, to);

			if (search) {
				query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
			}

			const { data, error, count } = await query;

			if (error) throw error;

			// Filter subscriptions to only show active ones (client-side filter)
			// This is needed because Supabase doesn't support filtering nested relations directly
			// user_subscriptions might be null, array, or object depending on the join result
			const filteredData = (data || []).map((user: any) => {
				let subscriptions = user.user_subscriptions;

				// Handle different possible structures
				if (!subscriptions) {
					subscriptions = [];
				} else if (!Array.isArray(subscriptions)) {
					// If it's an object (single subscription), wrap it in an array
					subscriptions = [subscriptions];
				}

				return {
					...user,
					user_subscriptions: subscriptions.filter(
						(sub: any) => sub && sub.status === "active"
					),
				};
			});

			set({
				users: filteredData as ProfileWithSubscription[],
				currentPage: page,
				totalPages: Math.ceil((count || 0) / PAGE_SIZE),
				searchQuery: search,
			});
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	updateUserRole: async (userId: string, role: UserRole) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("profiles") as any)
				.update({ role, updated_at: new Date().toISOString() })
				.eq("id", userId);

			if (error) throw error;

			// Update local state
			set((state) => ({
				users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
			}));

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	toggleUserActive: async (userId: string, isActive: boolean) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("profiles") as any)
				.update({ is_active: isActive, updated_at: new Date().toISOString() })
				.eq("id", userId);

			if (error) throw error;

			set((state) => ({
				users: state.users.map((u) =>
					u.id === userId ? { ...u, is_active: isActive } : u
				),
			}));

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	updateUserSubscription: async (
		userId: string,
		planId: string,
		status: string
	) => {
		set({ isLoading: true, error: null });
		try {
			// Get the user's current subscription
			const { data: existingSub } = await supabase
				.from("user_subscriptions")
				.select("id")
				.eq("user_id", userId)
				.eq("status", "active")
				.single();

			if (existingSub) {
				// Update existing subscription
				const { error } = await (supabase.from("user_subscriptions") as any)
					.update({
						plan_id: planId,
						status: status as any,
						updated_at: new Date().toISOString(),
					})
					.eq("id", (existingSub as any).id);

				if (error) throw error;
			} else {
				// Create new subscription
				const now = new Date();
				const endDate = new Date();
				endDate.setFullYear(endDate.getFullYear() + 1);

				const { error } = await (
					supabase.from("user_subscriptions") as any
				).insert({
					user_id: userId,
					plan_id: planId,
					status: status as any,
					billing_cycle: "yearly",
					current_period_start: now.toISOString(),
					current_period_end: endDate.toISOString(),
				});

				if (error) throw error;
			}

			// Refresh users
			await get().fetchUsers(get().currentPage, get().searchQuery);

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	setSelectedUser: (user) => set({ selectedUser: user }),

	// Coupon Actions
	fetchCoupons: async () => {
		set({ isLoading: true, error: null });
		try {
			const { data, error } = await supabase
				.from("coupons")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;

			set({ coupons: data || [] });
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	createCoupon: async (coupon) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("coupons") as any).insert({
				...coupon,
				code: coupon.code.toUpperCase(),
				used_count: 0,
			});

			if (error) throw error;

			await get().fetchCoupons();
			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	updateCoupon: async (id: string, updates: Partial<Coupon>) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("coupons") as any)
				.update({ ...updates, updated_at: new Date().toISOString() } as any)
				.eq("id", id);

			if (error) throw error;

			await get().fetchCoupons();
			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	deleteCoupon: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await supabase.from("coupons").delete().eq("id", id);

			if (error) throw error;

			set((state) => ({
				coupons: state.coupons.filter((c) => c.id !== id),
			}));

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	toggleCouponActive: async (id: string, isActive: boolean) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("coupons") as any)
				.update({ is_active: isActive, updated_at: new Date().toISOString() })
				.eq("id", id);

			if (error) throw error;

			set((state) => ({
				coupons: state.coupons.map((c) =>
					c.id === id ? { ...c, is_active: isActive } : c
				),
			}));

			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	// Plan Actions
	fetchPlans: async () => {
		set({ isLoading: true, error: null });
		try {
			const { data, error } = await supabase
				.from("subscription_plans")
				.select("*")
				.order("price_monthly", { ascending: true });

			if (error) throw error;

			set({ plans: data || [] });
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	updatePlan: async (id: string, updates: Partial<SubscriptionPlanRow>) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await (supabase.from("subscription_plans") as any)
				.update({ ...updates, updated_at: new Date().toISOString() } as any)
				.eq("id", id);

			if (error) throw error;

			await get().fetchPlans();
			return { error: null };
		} catch (error) {
			set({ error: (error as Error).message });
			return { error: error as Error };
		} finally {
			set({ isLoading: false });
		}
	},

	// Payment Actions
	fetchPayments: async (page = 1) => {
		set({ isLoading: true, error: null });
		try {
			const from = (page - 1) * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			const { data, error } = await supabase
				.from("payments")
				.select("*")
				.order("created_at", { ascending: false })
				.range(from, to);

			if (error) throw error;

			set({ payments: data || [] });
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	// Stats Actions
	fetchStats: async () => {
		set({ isLoading: true, error: null });
		try {
			// Fetch total users
			const { count: totalUsers } = await supabase
				.from("profiles")
				.select("*", { count: "exact", head: true });

			// Fetch active users (logged in last 30 days would need a last_login field)
			const { count: activeUsers } = await supabase
				.from("profiles")
				.select("*", { count: "exact", head: true })
				.eq("is_active", true);

			// Fetch total revenue
			const { data: revenueData } = await supabase
				.from("payments")
				.select("amount")
				.eq("status", "completed");

			const totalRevenue =
				revenueData?.reduce(
					(sum: number, p: { amount: number }) => sum + p.amount,
					0
				) || 0;

			// Fetch monthly revenue (current month)
			const startOfMonth = new Date();
			startOfMonth.setDate(1);
			startOfMonth.setHours(0, 0, 0, 0);

			const { data: monthlyData } = await supabase
				.from("payments")
				.select("amount")
				.eq("status", "completed")
				.gte("created_at", startOfMonth.toISOString());

			const monthlyRevenue =
				monthlyData?.reduce(
					(sum: number, p: { amount: number }) => sum + p.amount,
					0
				) || 0;

			// Fetch subscriptions by plan
			const { data: subsByPlan } = await supabase
				.from("user_subscriptions")
				.select(
					`
					plan_id,
					subscription_plans (name)
				`
				)
				.eq("status", "active");

			const planCounts: Record<string, number> = {};
			subsByPlan?.forEach((sub: any) => {
				const planName = sub.subscription_plans?.name || "Unknown";
				planCounts[planName] = (planCounts[planName] || 0) + 1;
			});

			const subscriptionsByPlan = Object.entries(planCounts).map(
				([plan, count]) => ({ plan, count })
			);

			// Recent signups (last 7 days)
			const weekAgo = new Date();
			weekAgo.setDate(weekAgo.getDate() - 7);

			const { count: recentSignups } = await supabase
				.from("profiles")
				.select("*", { count: "exact", head: true })
				.gte("created_at", weekAgo.toISOString());

			set({
				stats: {
					totalUsers: totalUsers || 0,
					activeUsers: activeUsers || 0,
					totalRevenue,
					monthlyRevenue,
					subscriptionsByPlan,
					recentSignups: recentSignups || 0,
				},
			});
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	setSearchQuery: (query) => set({ searchQuery: query }),
	clearError: () => set({ error: null }),
}));
