import { AuthError, Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
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
	setupRealtimeListeners: () => void;
	cleanupRealtimeListeners: () => void;
	isAdmin: () => boolean;
	isPremium: () => boolean;
	clearError: () => void;
}

// Store realtime subscription references for cleanup
let profileSubscription: ReturnType<typeof supabase.channel> | null = null;
let subscriptionChannel: ReturnType<typeof supabase.channel> | null = null;

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
			console.log("🔐 [Initialize] Starting auth initialization...");

			// Get current session from storage
			console.log("🔐 [Initialize] Getting session from storage...");
			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error) {
				console.error("❌ [Initialize] Error getting session:", error);
				throw error;
			}

			console.log("📱 [Initialize] Session found:", session ? "Yes" : "No");

			if (session) {
				console.log("✅ [Initialize] User logged in:", session.user.email);
				set({ session, user: session.user });
				// Fetch profile and subscription in parallel
				console.log("🔐 [Initialize] Fetching profile and subscription...");
				await Promise.all([get().fetchProfile(), get().fetchSubscription()]);
				console.log("🔐 [Initialize] Profile and subscription fetched");

				// Check if user account is active after fetching profile
				const profile = get().profile;
				console.log("🔐 [Initialize] Profile is_active:", profile?.is_active);
				if (profile && !profile.is_active) {
					console.log(
						"⚠️ [Initialize] User account is deactivated, signing out..."
					);
					await get().signOut();
					set({
						error: "Your account has been deactivated. Please contact support.",
					});
					return;
				}

				// Setup realtime listeners for profile and subscription changes
				console.log("🔐 [Initialize] Setting up realtime listeners...");
				get().setupRealtimeListeners();
			} else {
				console.log("ℹ️ [Initialize] No saved session found");
			}

			// Listen for auth state changes
			console.log("🔐 [Initialize] Setting up onAuthStateChange listener...");
			supabase.auth.onAuthStateChange(
				async (_event: string, session: Session | null) => {
					console.log(
						"🔔 [onAuthStateChange] Event:",
						_event,
						"Session:",
						session ? "present" : "null"
					);

					// Skip if signInWithGoogle is handling this (isLoading will be true)
					const isCurrentlyLoading = get().isLoading;
					if (isCurrentlyLoading && _event === "SIGNED_IN") {
						console.log(
							"🔔 [onAuthStateChange] Sign-in in progress, letting signInWithGoogle handle fetch"
						);
						set({ session, user: session?.user || null });
						return;
					}

					// Only fetch profile/subscription if session changed and not already loaded
					const currentSession = get().session;
					const currentProfile = get().profile;
					console.log(
						"🔔 [onAuthStateChange] Current session:",
						currentSession?.user?.id || "null"
					);
					console.log(
						"🔔 [onAuthStateChange] Current profile:",
						currentProfile?.id || "null"
					);

					const shouldFetch =
						session?.user &&
						(!currentSession ||
							currentSession.user.id !== session.user.id ||
							(_event === "SIGNED_IN" && !currentProfile));
					console.log("🔔 [onAuthStateChange] Should fetch:", shouldFetch);

					set({ session, user: session?.user || null });

					if (shouldFetch) {
						// Only fetch if we don't already have profile data for this user
						if (!get().profile || get().profile?.id !== session.user.id) {
							console.log(
								"🔔 [onAuthStateChange] Fetching profile and subscription..."
							);
							try {
								await Promise.all([
									get().fetchProfile(),
									get().fetchSubscription(),
								]);
								console.log("🔔 [onAuthStateChange] Fetch complete");
							} catch (fetchError) {
								console.error(
									"🔴 [onAuthStateChange] Fetch error:",
									fetchError
								);
							} finally {
								// Always set isLoading to false after fetch attempt
								set({ isLoading: false });
							}

							// Check if user account is active
							const profile = get().profile;
							if (profile && !profile.is_active) {
								console.log(
									"⚠️ [onAuthStateChange] User account is deactivated, signing out..."
								);
								await get().signOut();
								set({
									error:
										"Your account has been deactivated. Please contact support.",
								});
								return;
							}

							// Setup realtime listeners
							console.log(
								"🔔 [onAuthStateChange] Setting up realtime listeners..."
							);
							get().setupRealtimeListeners();
						} else {
							console.log(
								"🔔 [onAuthStateChange] Profile already exists for user, skipping fetch"
							);
						}
					} else if (!session) {
						console.log("🔔 [onAuthStateChange] No session, cleaning up...");
						// Cleanup realtime listeners when signed out
						get().cleanupRealtimeListeners();
						set({ profile: null, subscription: null });
					}
					console.log("🔔 [onAuthStateChange] Handler complete");
				}
			);
		} catch (error) {
			console.error("❌ [Initialize] Auth initialization error:", error);
			set({ error: (error as Error).message });
		} finally {
			console.log(
				"🔐 [Initialize] Complete, setting isLoading=false, isInitialized=true"
			);
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
		console.log("🔵 [Google Sign-In] Starting Google OAuth flow...");
		try {
			// For deep link back to app after auth
			const appRedirectUrl = __DEV__
				? Linking.createURL("auth/callback")
				: makeRedirectUri({ scheme: "lifesync", path: "auth/callback" });

			console.log("🔵 [Google Sign-In] App redirect URL:", appRedirectUrl);

			// Use Supabase's signInWithOAuth which handles the OAuth flow properly
			const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: appRedirectUrl,
					skipBrowserRedirect: true, // We handle browser manually
				},
			});

			if (oauthError) {
				console.log("🔴 [Google Sign-In] OAuth error:", oauthError.message);
				set({ error: oauthError.message, isLoading: false });
				return { error: oauthError };
			}

			if (!data?.url) {
				console.log("🔴 [Google Sign-In] No OAuth URL received");
				set({ error: "Failed to get OAuth URL", isLoading: false });
				return { error: new Error("No OAuth URL") };
			}

			console.log("🔵 [Google Sign-In] Got OAuth URL, opening browser...");

			// Flag to prevent processing tokens twice
			let tokensProcessed = false;

			// Helper function to process tokens from URL
			const processTokensFromUrl = async (
				urlString: string
			): Promise<{ error: Error | null }> => {
				if (tokensProcessed) {
					console.log(
						"🔵 [Google Sign-In] Tokens already processed, skipping..."
					);
					return { error: null };
				}

				try {
					const url = new URL(urlString);
					let params = new URLSearchParams(url.hash.substring(1));
					if (!params.has("access_token")) {
						params = new URLSearchParams(url.search);
					}

					const accessToken = params.get("access_token");
					const refreshToken = params.get("refresh_token");

					console.log(
						"🔵 [Google Sign-In] Tokens found - access:",
						!!accessToken,
						"refresh:",
						!!refreshToken
					);

					if (accessToken && refreshToken) {
						tokensProcessed = true;
						console.log("🔵 [Google Sign-In] Setting session...");

						const { data: sessionData, error: sessionError } =
							await supabase.auth.setSession({
								access_token: accessToken,
								refresh_token: refreshToken,
							});

						if (sessionError) {
							console.log(
								"🔴 [Google Sign-In] Session error:",
								sessionError.message
							);
							return { error: sessionError };
						}

						if (sessionData.session) {
							console.log(
								"🟢 [Google Sign-In] Session set! User:",
								sessionData.session.user.email
							);

							// Update state with session
							set({
								session: sessionData.session,
								user: sessionData.session.user,
							});

							// Wait a moment for Supabase client to sync auth headers
							console.log("🔵 [Google Sign-In] Waiting for auth sync...");
							await new Promise((resolve) => setTimeout(resolve, 500));

							// Now fetch profile and subscription
							console.log("🔵 [Google Sign-In] Fetching profile...");
							try {
								await Promise.all([
									get().fetchProfile(),
									get().fetchSubscription(),
								]);
								console.log(
									"🟢 [Google Sign-In] Profile fetched successfully!"
								);
							} catch (fetchErr) {
								console.log(
									"⚠️ [Google Sign-In] Fetch error (non-fatal):",
									fetchErr
								);
								// Don't fail sign-in if profile fetch fails - it will retry on next app load
							}

							// Setup realtime listeners
							get().setupRealtimeListeners();
						}

						return { error: null };
					} else {
						return { error: new Error("No tokens in URL") };
					}
				} catch (err) {
					console.log("🔴 [Google Sign-In] Error processing URL:", err);
					return { error: err as Error };
				}
			};

			// Open browser and wait for result
			console.log("🔵 [Google Sign-In] Opening browser...");
			const result = await WebBrowser.openAuthSessionAsync(
				data.url,
				appRedirectUrl
			);
			console.log("🔵 [Google Sign-In] Browser result type:", result.type);

			if (result.type === "success" && result.url) {
				console.log("🟢 [Google Sign-In] Browser returned success");
				const processResult = await processTokensFromUrl(result.url);
				if (processResult.error) {
					set({ error: processResult.error.message, isLoading: false });
					return processResult;
				}
				set({ isLoading: false });
				return { error: null };
			} else if (result.type === "cancel") {
				console.log("🔴 [Google Sign-In] User cancelled");
				set({ error: "Authentication cancelled", isLoading: false });
				return { error: new Error("Authentication cancelled") };
			} else if (result.type === "dismiss") {
				console.log(
					"🔵 [Google Sign-In] Browser dismissed, checking for session..."
				);

				// Wait a moment and check if session was set
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData.session) {
					console.log("🟢 [Google Sign-In] Session found after dismiss!");
					set({
						session: sessionData.session,
						user: sessionData.session.user,
						isLoading: false,
					});

					// Fetch profile
					try {
						await Promise.all([
							get().fetchProfile(),
							get().fetchSubscription(),
						]);
					} catch (fetchErr) {
						console.log("⚠️ [Google Sign-In] Fetch error:", fetchErr);
					}

					get().setupRealtimeListeners();
					return { error: null };
				} else {
					console.log("🔴 [Google Sign-In] No session after dismiss");
					set({ error: "Authentication failed", isLoading: false });
					return { error: new Error("Authentication failed") };
				}
			}

			set({ isLoading: false });
			return { error: new Error("Unknown browser result") };
		} catch (error) {
			const err = error as Error;
			console.error("🔴 [Google Sign-In] Unexpected error:", err);
			set({ error: err.message, isLoading: false });
			return { error: err };
		}
	},

	signOut: async () => {
		set({ isLoading: true, error: null });
		try {
			// Cleanup realtime listeners before signing out
			get().cleanupRealtimeListeners();
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
		const { user, session } = get();
		console.log("🔵 [fetchProfile] Starting, user:", user?.id || "null");
		console.log("🔵 [fetchProfile] Session exists:", !!session);
		if (!user) {
			console.log("🔵 [fetchProfile] No user, returning early");
			return;
		}

		try {
			console.log("🔵 [fetchProfile] Fetching from Supabase...");

			// Add timeout to prevent hanging
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("fetchProfile timeout after 10s")),
					10000
				)
			);

			const fetchPromise = supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.maybeSingle();

			const { data, error } = (await Promise.race([
				fetchPromise,
				timeoutPromise,
			])) as Awaited<typeof fetchPromise>;

			console.log(
				"🔵 [fetchProfile] Response - data:",
				!!data,
				"error:",
				!!error
			);
			if (error) throw error;

			if (data) {
				console.log("🟢 [fetchProfile] Profile found, setting state");
				set({ profile: data });
			} else {
				console.log(
					"🔵 [fetchProfile] Profile not found for user:",
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

				console.log("🔵 [fetchProfile] Creating new profile...");
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
							"🔵 [fetchProfile] Profile already exists (created by database trigger), fetching..."
						);
						const { data: existingProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", user.id)
							.single();
						if (existingProfile) {
							console.log("🟢 [fetchProfile] Profile fetched successfully");
							set({ profile: existingProfile });
							return;
						}
					} else {
						// Only log as error if it's NOT a duplicate key error
						console.error(
							"🔴 [fetchProfile] Error creating profile:",
							createError
						);
					}
					set({ profile: null });
				} else if (createdProfile) {
					console.log(
						"🟢 [fetchProfile] Profile created successfully for user:",
						user.id
					);
					set({ profile: createdProfile });
				}
			}
		} catch (error) {
			console.error("🔴 [fetchProfile] Error:", error);
		}
		console.log("🔵 [fetchProfile] Complete");
	},

	fetchSubscription: async () => {
		const { user, session } = get();
		console.log("🔵 [fetchSubscription] Starting, user:", user?.id || "null");
		console.log("🔵 [fetchSubscription] Session exists:", !!session);
		if (!user) {
			console.log("🔵 [fetchSubscription] No user, returning early");
			return;
		}

		try {
			console.log("🔵 [fetchSubscription] Fetching from Supabase...");

			// Add timeout to prevent hanging
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("fetchSubscription timeout after 10s")),
					10000
				)
			);

			const fetchPromise = supabase
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

			const { data, error } = (await Promise.race([
				fetchPromise,
				timeoutPromise,
			])) as Awaited<typeof fetchPromise>;

			console.log(
				"🔵 [fetchSubscription] Response - data:",
				!!data,
				"error:",
				error?.code || "none"
			);
			if (error && error.code !== "PGRST116") throw error;

			set({ subscription: (data || null) as UserSubscriptionWithPlan | null });
			console.log(
				"🟢 [fetchSubscription] Complete, subscription:",
				data ? "found" : "none"
			);
		} catch (error) {
			console.error("🔴 [fetchSubscription] Error:", error);
		}
	},

	// Setup realtime listeners for profile and subscription changes
	// This enables real-time updates when admin changes user settings
	setupRealtimeListeners: () => {
		const { user } = get();
		if (!user) return;

		// Cleanup any existing subscriptions first
		get().cleanupRealtimeListeners();

		console.log("🔄 Setting up realtime listeners for user:", user.id);

		// Listen for profile changes (role, is_active, etc.)
		profileSubscription = supabase
			.channel(`profile-changes-${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "profiles",
					filter: `id=eq.${user.id}`,
				},
				async (payload) => {
					console.log("📡 Profile updated via realtime:", payload.new);
					const newProfile = payload.new as Profile;

					// Check if account was deactivated
					if (!newProfile.is_active) {
						console.log("⚠️ Account deactivated via realtime, signing out...");
						await get().signOut();
						set({
							error:
								"Your account has been deactivated. Please contact support.",
						});
						return;
					}

					// Update profile in state
					set({ profile: newProfile });
				}
			)
			.subscribe((status) => {
				console.log("Profile subscription status:", status);
			});

		// Listen for subscription changes (plan changes, etc.)
		subscriptionChannel = supabase
			.channel(`subscription-changes-${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*", // Listen to INSERT, UPDATE, DELETE
					schema: "public",
					table: "user_subscriptions",
					filter: `user_id=eq.${user.id}`,
				},
				async (payload) => {
					console.log("📡 Subscription changed via realtime:", payload);
					// Refetch subscription to get the full plan details
					await get().fetchSubscription();
				}
			)
			.subscribe((status) => {
				console.log("Subscription channel status:", status);
			});
	},

	// Cleanup realtime listeners
	cleanupRealtimeListeners: () => {
		console.log("🧹 Cleaning up realtime listeners");
		if (profileSubscription) {
			supabase.removeChannel(profileSubscription);
			profileSubscription = null;
		}
		if (subscriptionChannel) {
			supabase.removeChannel(subscriptionChannel);
			subscriptionChannel = null;
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
