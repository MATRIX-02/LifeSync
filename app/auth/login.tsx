import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function LoginScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { signInWithEmail, signInWithGoogle, isLoading, error, clearError } =
		useAuthStore();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const handleEmailLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please enter both email and password");
			return;
		}

		const { error } = await signInWithEmail(email, password);
		if (!error) {
			router.replace("/(tabs)");
		}
	};

	const handleGoogleLogin = async () => {
		const { error } = await signInWithGoogle();
		if (!error) {
			router.replace("/(tabs)");
		}
	};

	const styles = createStyles(theme);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Logo/Header */}
				<View style={styles.header}>
					<View style={styles.logoContainer}>
						<Ionicons name="sync-circle" size={80} color={theme.primary} />
					</View>
					<Text style={styles.title}>LifeSync</Text>
					<Text style={styles.subtitle}>Sign in to continue</Text>
				</View>

				{/* Error Display */}
				{error && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
						<TouchableOpacity onPress={clearError}>
							<Ionicons name="close-circle" size={20} color={theme.error} />
						</TouchableOpacity>
					</View>
				)}

				{/* Email Input */}
				<View style={styles.inputContainer}>
					<Ionicons
						name="mail-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="Email"
						placeholderTextColor={theme.textMuted}
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
				</View>

				{/* Password Input */}
				<View style={styles.inputContainer}>
					<Ionicons
						name="lock-closed-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="Password"
						placeholderTextColor={theme.textMuted}
						value={password}
						onChangeText={setPassword}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
					/>
					<TouchableOpacity
						onPress={() => setShowPassword(!showPassword)}
						style={styles.eyeIcon}
					>
						<Ionicons
							name={showPassword ? "eye-outline" : "eye-off-outline"}
							size={20}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>
				</View>

				{/* Forgot Password */}
				<TouchableOpacity
					style={styles.forgotPassword}
					onPress={() => router.push("/auth/forgot-password")}
				>
					<Text style={styles.forgotPasswordText}>Forgot Password?</Text>
				</TouchableOpacity>

				{/* Login Button */}
				<TouchableOpacity
					style={[styles.button, styles.primaryButton]}
					onPress={handleEmailLogin}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Sign In</Text>
					)}
				</TouchableOpacity>

				{/* Divider */}
				<View style={styles.divider}>
					<View style={styles.dividerLine} />
					<Text style={styles.dividerText}>or continue with</Text>
					<View style={styles.dividerLine} />
				</View>

				{/* Social Login */}
				<TouchableOpacity
					style={[styles.button, styles.socialButton]}
					onPress={handleGoogleLogin}
					disabled={isLoading}
				>
					<Ionicons name="logo-google" size={24} color={theme.text} />
					<Text style={styles.socialButtonText}>Continue with Google</Text>
				</TouchableOpacity>

				{/* Sign Up Link */}
				<View style={styles.signupContainer}>
					<Text style={styles.signupText}>Don't have an account? </Text>
					<TouchableOpacity onPress={() => router.push("/auth/signup")}>
						<Text style={styles.signupLink}>Sign Up</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollContent: {
			flexGrow: 1,
			padding: 24,
			justifyContent: "center",
		},
		header: {
			alignItems: "center",
			marginBottom: 40,
		},
		logoContainer: {
			width: 120,
			height: 120,
			borderRadius: 60,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
			shadowColor: theme.shadow,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 5,
		},
		title: {
			fontSize: 32,
			fontWeight: "bold",
			color: theme.text,
			marginBottom: 8,
		},
		subtitle: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		errorContainer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.errorLight,
			padding: 12,
			borderRadius: 12,
			marginBottom: 16,
		},
		errorText: {
			color: theme.error,
			flex: 1,
			marginRight: 8,
		},
		inputContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: theme.border,
		},
		inputIcon: {
			marginRight: 12,
		},
		input: {
			flex: 1,
			height: 52,
			fontSize: 16,
			color: theme.text,
		},
		eyeIcon: {
			padding: 4,
		},
		forgotPassword: {
			alignSelf: "flex-end",
			marginBottom: 24,
		},
		forgotPasswordText: {
			color: theme.primary,
			fontSize: 14,
		},
		button: {
			height: 52,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			flexDirection: "row",
		},
		primaryButton: {
			backgroundColor: theme.primary,
		},
		buttonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
		divider: {
			flexDirection: "row",
			alignItems: "center",
			marginVertical: 24,
		},
		dividerLine: {
			flex: 1,
			height: 1,
			backgroundColor: theme.border,
		},
		dividerText: {
			color: theme.textMuted,
			marginHorizontal: 16,
			fontSize: 14,
		},
		socialButton: {
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 12,
		},
		socialButtonText: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "500",
		},
		signupContainer: {
			flexDirection: "row",
			justifyContent: "center",
			marginTop: 24,
		},
		signupText: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		signupLink: {
			color: theme.primary,
			fontSize: 14,
			fontWeight: "600",
		},
	});
