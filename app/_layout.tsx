import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import {
	Stack,
	useRootNavigationState,
	useRouter,
	useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	StatusBar,
	StyleSheet,
	View,
} from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AlertProvider } from "@/src/components/CustomAlert";
import { SafeAreaFrame } from "@/src/components/SafeAreaFrame";
import { SyncStatusBanner } from "@/src/components/SyncStatusBanner";
import { isSupabaseConfigured } from "@/src/config/supabase";
import { useAuthStore } from "@/src/context/authStore";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { useModuleStore } from "@/src/context/moduleContext";
import { ThemeProvider, useTheme } from "@/src/context/themeContext";
import { useNavigationPersistence } from "@/src/hooks/useNavigationPersistence";
import { useSyncManager } from "@/src/hooks/useSyncManager";
import { AudioService } from "@/src/services/audioService";
import { NotificationService } from "@/src/services/notificationService";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
		...FontAwesome.font,
	});

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error;
	}, [error]);

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	const [notificationsPermitted, setNotificationsPermitted] = useState(false);
	const hasRescheduledRef = useRef(false);
	// Subscribed, not read via getState(), so the reschedule effect re-runs the
	// moment the store finishes loading.
	const habitsHasLoaded = useHabitStore((state) => state.hasLoaded);

	// Permissions and handlers only. The rescheduling below deliberately does
	// NOT live here - see the next effect.
	useEffect(() => {
		NotificationService.setNotificationHandler();
		AudioService.setAudioMode();

		(async () => {
			const permitted = await NotificationService.requestPermissions();
			setNotificationsPermitted(permitted);
			console.log(
				permitted
					? "✅ Notification permissions granted"
					: "❌ Notification permissions denied"
			);
		})();
	}, []);

	// Reschedule habit reminders ONCE PER LAUNCH, but only after the habit store
	// has actually loaded.
	//
	// This used to run on mount with an empty dependency array. At that point
	// `habits` is still [] - the store is not populated until initialize(), which
	// runs later, behind auth, the offline-queue flush and two migrations. So the
	// effect cancelled every scheduled habit reminder, found zero habits, and
	// scheduled nothing. Reminders worked until the next app launch and then
	// stopped for good, with "View Scheduled Reminders" showing an empty list.
	//
	// The blanket cancelAllHabitNotifications() is gone too: scheduleHabitReminders
	// already cancels that habit's own reminders first, and delete/archive cancel
	// theirs. Cancelling everything up front only created a window where a failure
	// left the user with no reminders at all.
	useEffect(() => {
		if (!notificationsPermitted || !habitsHasLoaded) return;
		if (hasRescheduledRef.current) return;
		hasRescheduledRef.current = true;

		(async () => {
			const { habits } = useHabitStore.getState();
			const activeHabits = habits.filter(
				(h) => !h.isArchived && h.notificationEnabled && h.notificationTime
			);

			console.log(
				`📱 Rescheduling reminders for ${activeHabits.length} habit(s)`
			);

			for (const habit of activeHabits) {
				try {
					// No id is persisted: reminders are cancelled by matching the
					// notification's `data.habitId`, so this avoids a DB write per
					// habit on every app launch.
					await NotificationService.scheduleHabitReminders(habit);
				} catch (error) {
					console.error(
						`Failed to reschedule notification for ${habit.name}:`,
						error
					);
				}
			}

			await NotificationService.debugListScheduledNotifications();
		})();
	}, [notificationsPermitted, habitsHasLoaded]);

	if (!loaded) {
		return null;
	}

	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<AlertProvider>
					{/* Android 15+ forces edge-to-edge, so `translucent` is no longer
					    meaningful; the bar is always drawn over the app. */}
					<StatusBar translucent />
					{/* One place applies the system-bar insets for every screen. */}
					<SafeAreaFrame>
						{/* Sits above every screen: the user must be able to see that a
						    change is saved locally but not yet on the server. */}
						<SyncStatusBanner />
						<RootLayoutNav />
					</SafeAreaFrame>
				</AlertProvider>
			</ThemeProvider>
		</SafeAreaProvider>
	);
}

function RootLayoutNav() {
	const { isDark, theme } = useTheme();
	const {
		user,
		profile,
		isLoading: authLoading,
		initialize: initializeAuth,
	} = useAuthStore();
	const segments = useSegments();
	const router = useRouter();
	// Undefined until the root navigator has actually mounted. Dispatching a
	// navigation action before that produces the "not handled by any navigator"
	// warning and the redirect is dropped on the floor.
	const rootNavigationState = useRootNavigationState();
	const navigatorReady = !!rootNavigationState?.key;
	const [isInitialized, setIsInitialized] = useState(false);

	// Persist and restore navigation state
	useNavigationPersistence();

	// Initialize sync manager - handles fetching/syncing data with Supabase
	const { syncState, isFetching } = useSyncManager();

	// Initialize auth on mount
	useEffect(() => {
		const init = async () => {
			if (isSupabaseConfigured()) {
				await initializeAuth();
			}
			setIsInitialized(true);
		};
		init();
	}, []);

	// Set up notification response listener (when user taps notification)
	useEffect(() => {
		const subscription = Notifications.addNotificationResponseReceivedListener(
			(response) => {
				const data = response.notification.request.content.data;

				// Handle group invitation notification
				if (data?.type === "group_invitation") {
					// Navigate to finance module to show the group invitations
					router.push({
						pathname: "/(tabs)/finance",
						params: { showInvitations: "true" },
					});
				}
			}
		);

		return () => {
			subscription.remove();
		};
	}, [router]);

	// Handle auth state and route protection
	useEffect(() => {
		if (!isInitialized || authLoading) return;
		// Wait for the navigator. This effect re-runs when navigatorReady flips,
		// so the redirect still happens - just once there is something to receive it.
		if (!navigatorReady) return;

		// Skip auth check if Supabase is not configured (development mode)
		if (!isSupabaseConfigured()) return;

		const inAuthGroup = segments[0] === "auth";
		const inAdminGroup = segments[0] === "admin";

		if (!user && !inAuthGroup) {
			// Redirect to login if not authenticated
			router.replace("/auth/login");
		} else if (user && profile && inAuthGroup) {
			// Redirect to home if authenticated WITH profile loaded and trying to access auth screens
			// Wait for profile to be loaded before navigating away from auth screens
			router.replace("/(tabs)");
		}
	}, [user, profile, segments, isInitialized, authLoading, navigatorReady]);

	// Only the very first initialization takes over the screen. Every later
	// auth transition (sign in, sign out, password reset - eight places set
	// isLoading) overlays a spinner instead, because unmounting the Stack
	// throws away any navigation dispatched while it is gone.
	if (!isInitialized) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: isDark ? "#1a1a2e" : "#f8f9fa",
				}}
			>
				<ActivityIndicator size="large" color={theme.primary} />
			</View>
		);
	}

	const showAuthOverlay = authLoading && isSupabaseConfigured();

	return (
		<NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen name="admin" options={{ headerShown: false }} />
				<Stack.Screen name="subscription" options={{ headerShown: false }} />
				<Stack.Screen name="modal" options={{ presentation: "modal" }} />
			</Stack>
			{showAuthOverlay && (
				<View
					style={{
						...StyleSheet.absoluteFillObject,
						justifyContent: "center",
						alignItems: "center",
						backgroundColor: isDark ? "#1a1a2e" : "#f8f9fa",
					}}
					pointerEvents="auto"
				>
					<ActivityIndicator size="large" color={theme.primary} />
				</View>
			)}
		</NavigationThemeProvider>
	);
}
