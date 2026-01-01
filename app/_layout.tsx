import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { ThemeProvider, useTheme } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import { AudioService } from "@/src/services/audioService";

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

	// Initialize notification service
	useEffect(() => {
		NotificationService.setNotificationHandler();
		AudioService.setAudioMode();

		// Request notification permissions
		(async () => {
			const permitted = await NotificationService.requestPermissions();
			if (permitted) {
				console.log("✅ Notification permissions granted");
			} else {
				console.log("❌ Notification permissions denied");
			}
		})();
	}, []);

	if (!loaded) {
		return null;
	}

	return (
		<ThemeProvider>
			<RootLayoutNav />
		</ThemeProvider>
	);
}

function RootLayoutNav() {
	const { isDark } = useTheme();

	return (
		<NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="modal" options={{ presentation: "modal" }} />
			</Stack>
		</NavigationThemeProvider>
	);
}
