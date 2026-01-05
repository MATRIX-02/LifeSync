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

export default function SignupScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { signUpWithEmail, signInWithGoogle, isLoading, error, clearError } =
		useAuthStore();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [agreedToTerms, setAgreedToTerms] = useState(false);

	const validatePassword = (pass: string) => {
		const minLength = pass.length >= 8;
		const hasUppercase = /[A-Z]/.test(pass);
		const hasLowercase = /[a-z]/.test(pass);
		const hasNumber = /[0-9]/.test(pass);
		return { minLength, hasUppercase, hasLowercase, hasNumber };
	};

	const passwordValidation = validatePassword(password);
	const isPasswordValid =
		passwordValidation.minLength &&
		passwordValidation.hasUppercase &&
		passwordValidation.hasLowercase &&
		passwordValidation.hasNumber;

	const handleSignup = async () => {
		if (!fullName || !email || !password || !confirmPassword) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		if (!isPasswordValid) {
			Alert.alert("Error", "Please meet all password requirements");
			return;
		}

		if (password !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		if (!agreedToTerms) {
			Alert.alert("Error", "Please agree to the Terms of Service");
			return;
		}

		const { error } = await signUpWithEmail(email, password, fullName);
		if (!error) {
			Alert.alert(
				"Success",
				"Account created! Please check your email to verify your account.",
				[{ text: "OK", onPress: () => router.replace("/auth/login") }]
			);
		}
	};

	const handleGoogleSignup = async () => {
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
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="arrow-back" size={24} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.title}>Create Account</Text>
					<Text style={styles.subtitle}>
						Start your journey to a better life
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

				{/* Full Name Input */}
				<View style={styles.inputContainer}>
					<Ionicons
						name="person-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="Full Name"
						placeholderTextColor={theme.textMuted}
						value={fullName}
						onChangeText={setFullName}
						autoCapitalize="words"
					/>
				</View>

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

				{/* Password Requirements */}
				{password.length > 0 && (
					<View style={styles.passwordRequirements}>
						<PasswordRequirement
							met={passwordValidation.minLength}
							text="At least 8 characters"
							theme={theme}
						/>
						<PasswordRequirement
							met={passwordValidation.hasUppercase}
							text="One uppercase letter"
							theme={theme}
						/>
						<PasswordRequirement
							met={passwordValidation.hasLowercase}
							text="One lowercase letter"
							theme={theme}
						/>
						<PasswordRequirement
							met={passwordValidation.hasNumber}
							text="One number"
							theme={theme}
						/>
					</View>
				)}

				{/* Confirm Password Input */}
				<View style={styles.inputContainer}>
					<Ionicons
						name="lock-closed-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="Confirm Password"
						placeholderTextColor={theme.textMuted}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
					/>
					{confirmPassword.length > 0 && (
						<Ionicons
							name={
								password === confirmPassword
									? "checkmark-circle"
									: "close-circle"
							}
							size={20}
							color={password === confirmPassword ? theme.success : theme.error}
						/>
					)}
				</View>

				{/* Terms Checkbox */}
				<TouchableOpacity
					style={styles.termsContainer}
					onPress={() => setAgreedToTerms(!agreedToTerms)}
				>
					<View
						style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
					>
						{agreedToTerms && (
							<Ionicons name="checkmark" size={14} color="#fff" />
						)}
					</View>
					<Text style={styles.termsText}>
						I agree to the{" "}
						<Text style={styles.termsLink}>Terms of Service</Text> and{" "}
						<Text style={styles.termsLink}>Privacy Policy</Text>
					</Text>
				</TouchableOpacity>

				{/* Sign Up Button */}
				<TouchableOpacity
					style={[
						styles.button,
						styles.primaryButton,
						(!isPasswordValid || !agreedToTerms) && styles.buttonDisabled,
					]}
					onPress={handleSignup}
					disabled={isLoading || !isPasswordValid || !agreedToTerms}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Create Account</Text>
					)}
				</TouchableOpacity>

				{/* Divider */}
				<View style={styles.divider}>
					<View style={styles.dividerLine} />
					<Text style={styles.dividerText}>or</Text>
					<View style={styles.dividerLine} />
				</View>

				{/* Google Sign Up */}
				<TouchableOpacity
					style={[styles.button, styles.socialButton]}
					onPress={handleGoogleSignup}
					disabled={isLoading}
				>
					<Ionicons name="logo-google" size={24} color={theme.text} />
					<Text style={styles.socialButtonText}>Continue with Google</Text>
				</TouchableOpacity>

				{/* Sign In Link */}
				<View style={styles.signinContainer}>
					<Text style={styles.signinText}>Already have an account? </Text>
					<TouchableOpacity onPress={() => router.push("/auth/login")}>
						<Text style={styles.signinLink}>Sign In</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const PasswordRequirement = ({
	met,
	text,
	theme,
}: {
	met: boolean;
	text: string;
	theme: any;
}) => (
	<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
		<Ionicons
			name={met ? "checkmark-circle" : "ellipse-outline"}
			size={16}
			color={met ? theme.success : theme.textMuted}
			style={{ marginRight: 8 }}
		/>
		<Text
			style={{ color: met ? theme.success : theme.textMuted, fontSize: 12 }}
		>
			{text}
		</Text>
	</View>
);

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
			marginBottom: 16,
		},
		title: {
			fontSize: 28,
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
		passwordRequirements: {
			backgroundColor: theme.surface,
			padding: 12,
			borderRadius: 12,
			marginBottom: 16,
		},
		termsContainer: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 24,
		},
		checkbox: {
			width: 22,
			height: 22,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: theme.border,
			marginRight: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		checkboxChecked: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		termsText: {
			flex: 1,
			color: theme.textSecondary,
			fontSize: 14,
		},
		termsLink: {
			color: theme.primary,
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
		buttonDisabled: {
			opacity: 0.5,
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
		signinContainer: {
			flexDirection: "row",
			justifyContent: "center",
			marginTop: 24,
			marginBottom: 32,
		},
		signinText: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		signinLink: {
			color: theme.primary,
			fontSize: 14,
			fontWeight: "600",
		},
	});
