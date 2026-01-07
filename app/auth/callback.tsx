import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";

/**
 * OAuth Callback Screen
 *
 * This screen handles the OAuth redirect callback (lifesync://auth/callback).
 * When Google Sign-In completes, it redirects here with tokens in the URL.
 * The actual token processing is handled by the authStore's signInWithGoogle function.
 *
 * This screen simply shows a loading state and redirects once auth is complete.
 */
export default function AuthCallbackScreen() {
	const { theme, isDark } = useTheme();
	const router = useRouter();
	const { user, isLoading, session } = useAuthStore();

	useEffect(() => {
		// If user is authenticated, redirect to home
		if (user && session && !isLoading) {
			console.log(
				"🔄 [AuthCallback] User authenticated, redirecting to home..."
			);
			// Small delay to ensure state is fully synced
			const timer = setTimeout(() => {
				router.replace("/(tabs)");
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [user, session, isLoading, router]);

	// If not loading and no user, there might be an error - redirect to login
	useEffect(() => {
		if (!isLoading && !user && !session) {
			const timer = setTimeout(() => {
				console.log(
					"🔄 [AuthCallback] No user after loading, redirecting to login..."
				);
				router.replace("/auth/login");
			}, 3000); // Wait 3 seconds before redirecting to login
			return () => clearTimeout(timer);
		}
	}, [isLoading, user, session, router]);

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: isDark ? "#1a1a2e" : "#f8f9fa" },
			]}
		>
			<ActivityIndicator size="large" color={theme.primary} />
			<Text style={[styles.text, { color: isDark ? "#fff" : "#333" }]}>
				Completing sign in...
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	text: {
		marginTop: 16,
		fontSize: 16,
	},
});
