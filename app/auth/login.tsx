import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import {
	SavedAccount,
	savedAccountsService,
} from "@/src/services/savedAccountsService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
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
	const [rememberMe, setRememberMe] = useState(true);
	const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
	const [showSavedAccounts, setShowSavedAccounts] = useState(true);

	// Load saved accounts on mount
	useEffect(() => {
		loadSavedAccounts();
	}, []);

	const loadSavedAccounts = async () => {
		const accounts = await savedAccountsService.getSavedAccounts();
		setSavedAccounts(accounts);
	};

	const handleEmailLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please enter both email and password");
			return;
		}

		const { error } = await signInWithEmail(email, password);
		if (!error) {
			// Save credentials if remember me is checked
			if (rememberMe) {
				await savedAccountsService.saveAccount(email, password);
			}
			router.replace("/(tabs)");
		}
	};

	const handleSavedAccountLogin = async (account: SavedAccount) => {
		const credentials = await savedAccountsService.getCredentials(account.id);
		if (!credentials) {
			Alert.alert(
				"Error",
				"Saved credentials not found. Please log in manually."
			);
			await savedAccountsService.removeAccount(account.id);
			loadSavedAccounts();
			return;
		}

		setEmail(credentials.email);
		setPassword(credentials.password);
		setShowSavedAccounts(false);

		const { error } = await signInWithEmail(
			credentials.email,
			credentials.password
		);
		if (!error) {
			// Update saved timestamp
			await savedAccountsService.saveAccount(
				credentials.email,
				credentials.password,
				account.name,
				account.avatarUrl
			);
			router.replace("/(tabs)");
		}
	};

	const handleRemoveSavedAccount = (account: SavedAccount) => {
		Alert.alert(
			"Remove Saved Account",
			`Remove ${account.email} from saved accounts?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						await savedAccountsService.removeAccount(account.id);
						loadSavedAccounts();
					},
				},
			]
		);
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
						<Image
							source={require("@/assets/images/icon.png")}
							style={styles.logo}
						/>
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

				{/* Saved Accounts */}
				{savedAccounts.length > 0 && showSavedAccounts && (
					<View style={styles.savedAccountsSection}>
						<Text style={styles.savedAccountsTitle}>Saved Accounts</Text>
						{savedAccounts.map((account) => (
							<TouchableOpacity
								key={account.id}
								style={styles.savedAccountItem}
								onPress={() => handleSavedAccountLogin(account)}
								onLongPress={() => handleRemoveSavedAccount(account)}
								disabled={isLoading}
							>
								<View style={styles.savedAccountAvatar}>
									{account.avatarUrl ? (
										<Image
											source={{ uri: account.avatarUrl }}
											style={styles.avatarImage}
										/>
									) : (
										<Ionicons
											name="person-circle"
											size={44}
											color={theme.primary}
										/>
									)}
								</View>
								<View style={styles.savedAccountInfo}>
									<Text style={styles.savedAccountEmail} numberOfLines={1}>
										{account.email}
									</Text>
									<Text style={styles.savedAccountHint}>
										Tap to sign in • Hold to remove
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={theme.textMuted}
								/>
							</TouchableOpacity>
						))}
						<TouchableOpacity
							style={styles.useAnotherAccount}
							onPress={() => setShowSavedAccounts(false)}
						>
							<Ionicons
								name="add-circle-outline"
								size={20}
								color={theme.primary}
							/>
							<Text style={styles.useAnotherAccountText}>
								Use another account
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Manual Login Form */}
				{(!savedAccounts.length || !showSavedAccounts) && (
					<>
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

						{/* Remember Me & Forgot Password Row */}
						<View style={styles.optionsRow}>
							<TouchableOpacity
								style={styles.rememberMe}
								onPress={() => setRememberMe(!rememberMe)}
							>
								<View
									style={[
										styles.checkbox,
										rememberMe && styles.checkboxChecked,
									]}
								>
									{rememberMe && (
										<Ionicons name="checkmark" size={14} color="#fff" />
									)}
								</View>
								<Text style={styles.rememberMeText}>Remember me</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => router.push("/auth/forgot-password")}
							>
								<Text style={styles.forgotPasswordText}>Forgot Password?</Text>
							</TouchableOpacity>
						</View>

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

						{/* Back to Saved Accounts */}
						{savedAccounts.length > 0 && !showSavedAccounts && (
							<TouchableOpacity
								style={styles.backToSaved}
								onPress={() => setShowSavedAccounts(true)}
							>
								<Ionicons name="people" size={18} color={theme.primary} />
								<Text style={styles.backToSavedText}>
									Back to saved accounts
								</Text>
							</TouchableOpacity>
						)}
					</>
				)}

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
		logo: {
			width: 100,
			height: 100,
			borderRadius: 50,
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
		// Saved Accounts Styles
		savedAccountsSection: {
			marginBottom: 24,
		},
		savedAccountsTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 12,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		savedAccountItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		savedAccountAvatar: {
			width: 44,
			height: 44,
			borderRadius: 22,
			marginRight: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		avatarImage: {
			width: 44,
			height: 44,
			borderRadius: 22,
		},
		savedAccountInfo: {
			flex: 1,
		},
		savedAccountEmail: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 2,
		},
		savedAccountHint: {
			fontSize: 12,
			color: theme.textMuted,
		},
		useAnotherAccount: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			gap: 8,
		},
		useAnotherAccountText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.primary,
		},
		backToSaved: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			marginTop: 8,
			gap: 8,
		},
		backToSavedText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.primary,
		},
		// Input Styles
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
		// Options Row
		optionsRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 24,
		},
		rememberMe: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		checkbox: {
			width: 22,
			height: 22,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		checkboxChecked: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		rememberMeText: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		forgotPasswordText: {
			color: theme.primary,
			fontSize: 14,
		},
		// Button Styles
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
