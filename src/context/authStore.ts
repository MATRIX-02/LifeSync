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
			console.log("🔐 Initializing auth...");

			// Get current session from storage
			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error) {
				console.error("❌ Error getting session:", error);
				throw error;
			}

			console.log("📱 Session found:", session ? "Yes" : "No");

			if (session) {
				console.log("✅ User logged in:", session.user.email);
				set({ session, user: session.user });
				// Fetch profile and subscription in parallel
				await Promise.all([get().fetchProfile(), get().fetchSubscription()]);
			} else {
				console.log("ℹ️ No saved session found");
			}

			// Listen for auth state changes
			supabase.auth.onAuthStateChange(
				async (_event: string, session: Session | null) => {
					console.log("Auth state changed:", _event);

					// Only fetch profile/subscription if session changed and not already loaded
					const currentSession = get().session;
					const shouldFetch =
						session?.user &&
						(!currentSession ||
							currentSession.user.id !== session.user.id ||
							_event === "SIGNED_IN");

					set({ session, user: session?.user || null });

					if (shouldFetch) {
						// Only fetch if we don't already have profile data for this user
						if (!get().profile || get().profile?.id !== session.user.id) {
							await Promise.all([
								get().fetchProfile(),
								get().fetchSubscription(),
							]);
						}
					} else if (!session) {
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
			console.log(
				"Note: Profile and subscription will be created automatically"
			);

			// Profile is created automatically by database trigger (handle_new_user)
			// Subscription will be created on first login or can be handled separately
			// We don't wait here because the user isn't fully authenticated until email verification

			return { error: null };
		} catch (err) {
			const error = err as AuthError;
			console.error("Sign up error:", error);
			set({ error: error.message || "Sign up failed" });
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
					skipBrowserRedirect: false, // Let Supabase handle redirect
				},
			});

			if (error) {
				set({ error: error.message });
				return { error };
			}

			if (data?.url) {
				console.log("Opening OAuth URL:", data.url);

				// In production with custom schemes, we need to handle the deep link
				// Set up a promise that resolves when we get the deep link callback
				let linkingListener: any = null;
				const authPromise = new Promise<{ error: Error | null }>((resolve) => {
					// Timeout after 60 seconds
					const timeout = setTimeout(() => {
						if (linkingListener) {
							linkingListener.remove();
						}
						set({ isLoading: false });
						resolve({ error: new Error("Authentication timeout") });
					}, 60000);

					// Listen for deep link
					linkingListener = Linking.addEventListener("url", async (event) => {
						clearTimeout(timeout);
						if (linkingListener) {
							linkingListener.remove();
						}

						console.log("Deep link received:", event.url);

						try {
							const url = new URL(event.url);

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
								const { data: sessionData, error: sessionError } =
									await supabase.auth.setSession({
										access_token: accessToken,
										refresh_token: refreshToken,
									});

								if (sessionError) {
									resolve({ error: sessionError });
								} else {
									// Update state immediately with session
									if (sessionData.session) {
										set({
											session: sessionData.session,
											user: sessionData.session.user,
										});
										// Fetch profile immediately to avoid delay
										await Promise.all([
											get().fetchProfile(),
											get().fetchSubscription(),
										]);
									}
									resolve({ error: null });
								}
							} else {
								resolve({ error: new Error("No tokens in redirect URL") });
							}
						} catch (err) {
							resolve({ error: err as Error });
						}
					});

					// Open the browser
					WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
						.then((result) => {
							console.log("WebBrowser result:", result.type);

							// If WebBrowser returns success (happens on some devices/configs)
							if (result.type === "success" && result.url) {
								clearTimeout(timeout);
								if (linkingListener) {
									linkingListener.remove();
								}

								const url = new URL(result.url);
								let params = new URLSearchParams(url.hash.substring(1));
								if (!params.has("access_token")) {
									params = new URLSearchParams(url.search);
								}

								const accessToken = params.get("access_token");
								const refreshToken = params.get("refresh_token");

								if (accessToken && refreshToken) {
									supabase.auth
										.setSession({
											access_token: accessToken,
											refresh_token: refreshToken,
										})
										.then(
											async ({ data: sessionData, error: sessionError }) => {
												if (sessionError) {
													resolve({ error: sessionError });
												} else {
													// Update state immediately
													if (sessionData.session) {
														set({
															session: sessionData.session,
															user: sessionData.session.user,
														});
														// Fetch profile immediately
														await Promise.all([
															get().fetchProfile(),
															get().fetchSubscription(),
														]);
													}
													resolve({ error: null });
												}
											}
										);
								} else {
									resolve({ error: new Error("No tokens in redirect URL") });
								}
							} else if (result.type === "cancel") {
								clearTimeout(timeout);
								if (linkingListener) {
									linkingListener.remove();
								}
								resolve({ error: new Error("Authentication cancelled") });
							}
							// If result.type is "dismiss", we'll wait for the deep link
						})
						.catch((err) => {
							clearTimeout(timeout);
							if (linkingListener) {
								linkingListener.remove();
							}
							resolve({ error: err });
						});
				});

				const result = await authPromise;
				if (result.error) {
					set({ error: result.error.message });
					return { error: result.error };
				}
			}

			return { error: null };
		} catch (error) {
			const err = error as Error;
			console.error("Google sign-in error:", err);
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
			console.log("Updating profile in Supabase for user:", user.id);
			console.log("Updates:", updates);

			const { error } = await (supabase.from("profiles") as any)
				.update({ ...updates, updated_at: new Date().toISOString() } as any)
				.eq("id", user.id);

			if (error) {
				console.error("Supabase update error:", error);
				set({ error: error.message });
				return { error };
			}

			console.log("Profile updated successfully in Supabase");

			// Refresh profile
			await get().fetchProfile();
			return { error: null };
		} catch (err) {
			console.error("Update profile exception:", err);
			const error = err as Error;
			set({ error: error.message });
			return { error };
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
				.maybeSingle();

			if (error) throw error;

			if (data) {
				set({ profile: data });
			} else {
				console.log(
					"Profile not found for user:",
					user.id,
					"- Creating one automatically"
				);
				// Profile doesn't exist - create one automatically
				const newProfile = {
					id: user.id,
					email: user.email || "",
					full_name:
						user.user_metadata?.full_name || user.user_metadata?.name || null,
					avatar_url: user.user_metadata?.avatar_url || null,
					role: "user" as const,
					is_active: true,
				};

				const { data: createdProfile, error: createError } = await (
					supabase.from("profiles") as any
				)
					.insert(newProfile)
					.select()
					.single();

				if (createError) {
					// If it's a duplicate key error, profile was created by database trigger - fetch it
					if (createError.code === "23505") {
						console.log(
							"Profile already exists (created by database trigger), fetching..."
						);
						const { data: existingProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", user.id)
							.single();
						if (existingProfile) {
							console.log("✅ Profile fetched successfully");
							set({ profile: existingProfile });
							return;
						}
					} else {
						// Only log as error if it's NOT a duplicate key error
						console.error("Error creating profile:", createError);
					}
					set({ profile: null });
				} else if (createdProfile) {
					console.log("✅ Profile created successfully for user:", user.id);
					set({ profile: createdProfile });
				}
			}
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

			set({ subscription: (data || null) as UserSubscriptionWithPlan | null });
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
