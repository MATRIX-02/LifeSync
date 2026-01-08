import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export default function ForgotPasswordScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { resetPassword, isLoading, error, clearError } = useAuthStore();

	const [email, setEmail] = useState("");
	const [emailSent, setEmailSent] = useState(false);

	const handleResetPassword = async () => {
		if (!email) {
			Alert.alert("Error", "Please enter your email address");
			return;
		}

		const { error } = await resetPassword(email);
		if (!error) {
			setEmailSent(true);
		}
	};

	const styles = createStyles(theme);

	if (emailSent) {
		return (
			<View style={styles.container}>
				<View style={styles.successContainer}>
					<View style={styles.successIcon}>
						<Ionicons name="mail-open" size={64} color={theme.primary} />
					</View>
					<Text style={styles.successTitle}>Check Your Email</Text>
					<Text style={styles.successText}>
						We've sent a password reset link to{"\n"}
						<Text style={styles.emailHighlight}>{email}</Text>
					</Text>
					<TouchableOpacity
						style={[styles.button, styles.primaryButton]}
						onPress={() => router.replace("/auth/login")}
					>
						<Text style={styles.buttonText}>Back to Login</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.resendButton}
						onPress={() => setEmailSent(false)}
					>
						<Text style={styles.resendText}>
							Didn't receive email? Try again
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="arrow-back" size={24} color={theme.text} />
					</TouchableOpacity>
					<View style={styles.iconContainer}>
						<Ionicons name="key-outline" size={48} color={theme.primary} />
					</View>
					<Text style={styles.title}>Forgot Password?</Text>
					<Text style={styles.subtitle}>
						No worries! Enter your email and we'll send you a reset link.
					</Text>
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

				{/* Reset Button */}
				<TouchableOpacity
					style={[styles.button, styles.primaryButton]}
					onPress={handleResetPassword}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<Ionicons
								name="send"
								size={20}
								color="#fff"
								style={{ marginRight: 8 }}
							/>
							<Text style={styles.buttonText}>Send Reset Link</Text>
						</>
					)}
				</TouchableOpacity>

				{/* Back to Login */}
				<TouchableOpacity
					style={styles.backToLogin}
					onPress={() => router.push("/auth/login")}
				>
					<Ionicons
						name="arrow-back"
						size={16}
						color={theme.primary}
						style={{ marginRight: 4 }}
					/>
					<Text style={styles.backToLoginText}>Back to Login</Text>
				</TouchableOpacity>
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
		},
		header: {
			marginBottom: 32,
			marginTop: 20,
		},
		backButton: {
			marginBottom: 24,
		},
		iconContainer: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			alignSelf: "center",
			marginBottom: 24,
		},
		title: {
			fontSize: 28,
			fontWeight: "bold",
			color: theme.text,
			textAlign: "center",
			marginBottom: 8,
		},
		subtitle: {
			fontSize: 16,
			color: theme.textSecondary,
			textAlign: "center",
			lineHeight: 24,
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
			marginBottom: 24,
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
		backToLogin: {
			flexDirection: "row",
			justifyContent: "center",
			alignItems: "center",
			marginTop: 24,
		},
		backToLoginText: {
			color: theme.primary,
			fontSize: 14,
			fontWeight: "500",
		},
		// Success state styles
		successContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 24,
		},
		successIcon: {
			width: 120,
			height: 120,
			borderRadius: 60,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 24,
		},
		successTitle: {
			fontSize: 24,
			fontWeight: "bold",
			color: theme.text,
			marginBottom: 12,
		},
		successText: {
			fontSize: 16,
			color: theme.textSecondary,
			textAlign: "center",
			lineHeight: 24,
			marginBottom: 32,
		},
		emailHighlight: {
			color: theme.primary,
			fontWeight: "600",
		},
		resendButton: {
			marginTop: 16,
		},
		resendText: {
			color: theme.primary,
			fontSize: 14,
		},
	});
