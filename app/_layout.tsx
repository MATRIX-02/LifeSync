import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AlertProvider } from "@/src/components/CustomAlert";
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
	ErrorBoundary
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

	// Initialize notification service and reschedule notifications for existing habits
	useEffect(() => {
		NotificationService.setNotificationHandler();
		AudioService.setAudioMode();

		// Request notification permissions and reschedule habit reminders
		(async () => {
			const permitted = await NotificationService.requestPermissions();
			if (permitted) {
				console.log("✅ Notification permissions granted");

				// IMPORTANT: Cancel all scheduled notifications first to prevent duplicates
				// This ensures we don't create new notifications if they already exist
				try {
					await NotificationService.cancelAllNotifications();
					console.log("🗑️  Cleared all previously scheduled notifications");
				} catch (error) {
					console.error("Failed to clear old notifications:", error);
				}

				// Reschedule notifications for all habits with notifications enabled
				const { habits } = useHabitStore.getState();
				const activeHabits = habits.filter(
					(h) => !h.isArchived && h.notificationEnabled && h.notificationTime
				);

				console.log(
					`📱 Found ${activeHabits.length} habits with notifications enabled`
				);

				for (const habit of activeHabits) {
					try {
						const notificationId =
							await NotificationService.scheduleHabitReminder(
								habit.id,
								habit.name,
								habit.notificationTime!
							);
						// Store the notification ID in the habit for future reference
						useHabitStore.getState().updateHabit(habit.id, { notificationId });
					} catch (error) {
						console.error(
							`Failed to reschedule notification for ${habit.name}:`,
							error
						);
					}
				}

				// Debug: show all scheduled notifications
				await NotificationService.debugListScheduledNotifications();
			} else {
				console.log("❌ Notification permissions denied");
			}
		})();
	}, []);

	if (!loaded) {
		return null;
	}

	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<AlertProvider>
					<StatusBar translucent={false} />
					<RootLayoutNav />
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
	}, [user, profile, segments, isInitialized, authLoading]);

	// Show loading screen while initializing
	if (!isInitialized || (authLoading && isSupabaseConfigured())) {
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

	return (
		<NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen name="admin" options={{ headerShown: false }} />
				<Stack.Screen name="subscription" options={{ headerShown: false }} />
				<Stack.Screen name="modal" options={{ presentation: "modal" }} />
			</Stack>
		</NavigationThemeProvider>
	);
}
