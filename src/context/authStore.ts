import { AuthError, Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { create } from "zustand";
import { supabase } from "../config/supabase";
import { Profile, UserSubscriptionWithPlan } from "../types/database";

// Enable dismissing the browser after auth
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
	session: Session | null;
	user: User | null;
	profile: Profile | null;
	subscription: UserSubscriptionWithPlan | null;
	isLoading: boolean;
	isInitialized: boolean;
	error: string | null;
}

interface AuthActions {
	initialize: () => Promise<void>;
	signInWithEmail: (
		email: string,
		password: string
	) => Promise<{ error: AuthError | null }>;
	signUpWithEmail: (
		email: string,
		password: string,
		fullName?: string
	) => Promise<{ error: AuthError | null }>;
	signInWithGoogle: () => Promise<{ error: AuthError | Error | null }>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
	updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
	updateProfile: (
		updates: Partial<Profile>
	) => Promise<{ error: Error | null }>;
	fetchProfile: () => Promise<void>;
	fetchSubscription: () => Promise<void>;
	isAdmin: () => boolean;
	isPremium: () => boolean;
	clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
	// State
	session: null,
	user: null,
	profile: null,
	subscription: null,
	isLoading: false,
	isInitialized: false,
	error: null,

	// Actions
	initialize: async () => {
		try {
			set({ isLoading: true });

			// Get current session
			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error) throw error;

			if (session) {
				set({ session, user: session.user });
				// Fetch profile and subscription in parallel
				await Promise.all([get().fetchProfile(), get().fetchSubscription()]);
			}

			// Listen for auth state changes
			supabase.auth.onAuthStateChange(
				async (_event: string, session: Session | null) => {
					console.log("Auth state changed:", _event);
					set({ session, user: session?.user || null });

					if (session?.user) {
						await Promise.all([
							get().fetchProfile(),
							get().fetchSubscription(),
						]);
					} else {
						set({ profile: null, subscription: null });
					}
				}
			);
		} catch (error) {
			console.error("Auth initialization error:", error);
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false, isInitialized: true });
		}
	},

	signInWithEmail: async (email: string, password: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				set({ error: error.message });
				return { error };
			}

			return { error: null };
		} finally {
			set({ isLoading: false });
		}
	},

	signUpWithEmail: async (
		email: string,
		password: string,
		fullName?: string
	) => {
		set({ isLoading: true, error: null });
		try {
			console.log("Starting signup for:", email);

			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
					},
				},
			});

			console.log("Signup result:", { hasData: !!data, hasError: !!error });

			if (error) {
				console.error("Supabase auth signup error:", error);
				set({ error: error.message });
				return { error };
			}

			console.log("User created:", data.user?.id);
			console.log("✅ Signup completed successfully");
			console.log("Note: Profile and subscription will be created automatically");
			
			// Profile is created automatically by database trigger (handle_new_user)
			// Subscription will be created on first login or can be handled separately
			// We don't wait here because the user isn't fully authenticated until email verification
			
			return { error: null };
		} catch (err) {
			const error = err as Error;
			console.error("Sign up error:", error);
			set({ error: error.message });
			return { error };
		} finally {
			set({ isLoading: false });
		}
	},

	signInWithGoogle: async () => {
		set({ isLoading: true, error: null });
		try {
			// For Expo Go, we need to use the auth.expo.io proxy
			// Get the slug from app.json (via Constants)
			const slug = Constants.expoConfig?.slug || "lifesync";
			const owner =
				Constants.expoConfig?.owner ||
				Constants.expoConfig?.extra?.eas?.projectId
					? undefined
					: null;

			// Construct the Expo Go redirect URL
			// Format: https://auth.expo.io/@owner/slug OR https://auth.expo.io/@username/slug
			let redirectUrl: string;

			if (__DEV__) {
				// In development with Expo Go, use auth.expo.io proxy
				// You need to replace YOUR_EXPO_USERNAME with your actual Expo username
				redirectUrl = `https://auth.expo.io/@matrix122001/${slug}`;
			} else {
				// In production, use the native scheme
				redirectUrl = makeRedirectUri({
					scheme: "lifesync",
					path: "auth/callback",
				});
			}

			console.log("Google OAuth redirect URL:", redirectUrl);

			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: redirectUrl,
					skipBrowserRedirect: true,
				},
			});

			if (error) {
				set({ error: error.message });
				return { error };
			}

			if (data?.url) {
				console.log("Full OAuth URL:", data.url);

				// Parse the Supabase authorize URL
				const supabaseUrl = new URL(data.url);
				console.log("Supabase authorize URL:", supabaseUrl.href);

				// Open the OAuth URL in the browser
				const result = await WebBrowser.openAuthSessionAsync(
					data.url,
					redirectUrl
				);

				console.log("WebBrowser result:", JSON.stringify(result, null, 2));

				if (result.type === "success" && result.url) {
					console.log("Success! Result URL:", result.url);
					// Extract the tokens from the URL
					const url = new URL(result.url);

					// Tokens can be in hash or query params
					let params = new URLSearchParams(url.hash.substring(1));
					if (!params.has("access_token")) {
						params = new URLSearchParams(url.search);
					}

					const accessToken = params.get("access_token");
					const refreshToken = params.get("refresh_token");

					console.log("Access token found:", !!accessToken);
					console.log("Refresh token found:", !!refreshToken);

					if (accessToken && refreshToken) {
						// Set the session manually
						const { error: sessionError } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

						if (sessionError) {
							set({ error: sessionError.message });
							return { error: sessionError };
						}
					}
				} else if (result.type === "cancel") {
					set({ error: "Sign in cancelled" });
					return { error: new Error("Sign in cancelled") };
				}
			}

			return { error: null };
		} catch (error) {
			const err = error as Error;
			set({ error: err.message });
			return { error: err };
		} finally {
			set({ isLoading: false });
		}
	},

	signOut: async () => {
		set({ isLoading: true, error: null });
		try {
			await supabase.auth.signOut();
			set({ session: null, user: null, profile: null, subscription: null });
		} catch (error) {
			set({ error: (error as Error).message });
		} finally {
			set({ isLoading: false });
		}
	},

	resetPassword: async (email: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: Linking.createURL("reset-password"),
			});

			if (error) {
				set({ error: error.message });
				return { error };
			}

			return { error: null };
		} finally {
			set({ isLoading: false });
		}
	},

	updatePassword: async (newPassword: string) => {
		set({ isLoading: true, error: null });
		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				set({ error: error.message });
				return { error };
			}

			return { error: null };
		} finally {
			set({ isLoading: false });
		}
	},

	updateProfile: async (updates: Partial<Profile>) => {
		set({ isLoading: true, error: null });
		const { user } = get();

		if (!user) {
			set({ error: "Not authenticated" });
			return { error: new Error("Not authenticated") };
		}

		try {
			const { error } = await supabase
				.from("profiles")
				.update({ ...updates, updated_at: new Date().toISOString() })
				.eq("id", user.id);

			if (error) {
				set({ error: error.message });
				return { error };
			}

			// Refresh profile
			await get().fetchProfile();
			return { error: null };
		} finally {
			set({ isLoading: false });
		}
	},

	fetchProfile: async () => {
		const { user } = get();
		if (!user) return;

		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.single();

			if (error) throw error;

			set({ profile: data });
		} catch (error) {
			console.error("Error fetching profile:", error);
		}
	},

	fetchSubscription: async () => {
		const { user } = get();
		if (!user) return;

		try {
			const { data, error } = await supabase
				.from("user_subscriptions")
				.select(
					`
					*,
					subscription_plans (*)
				`
				)
				.eq("user_id", user.id)
				.eq("status", "active")
				.single();

			if (error && error.code !== "PGRST116") throw error;

			set({ subscription: data as UserSubscriptionWithPlan });
		} catch (error) {
			console.error("Error fetching subscription:", error);
		}
	},

	isAdmin: () => {
		const { profile } = get();
		return profile?.role === "admin" || profile?.role === "super_admin";
	},

	isPremium: () => {
		const { subscription } = get();
		if (!subscription) return false;
		const premiumPlans: string[] = ["basic", "premium", "enterprise"];
		return (
			premiumPlans.includes(subscription.subscription_plans.slug) &&
			subscription.status === "active"
		);
	},

	clearError: () => set({ error: null }),
}));
