import { Alert } from "@/src/components/CustomAlert";
import { supabase } from "@/src/config/supabase";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

type Status = "verifying" | "code" | "ready" | "invalid" | "done";

/**
 * Two ways in: the recovery deep link (tokens in the URL fragment, which
 * `detectSessionInUrl: false` means we must parse ourselves) or the 6-digit
 * code from the same email, which survives mail clients that drop custom
 * schemes.
 */
export default function ResetPasswordScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const params = useLocalSearchParams<{ email?: string }>();
	const { updatePassword, signOut, verifyRecoveryOtp } = useAuthStore();

	// Arriving with an email means the user came from the request screen, not a
	// deep link, so there is no token to wait for.
	const [status, setStatus] = useState<Status>(
		params.email ? "code" : "verifying",
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [email, setEmail] = useState(params.email ?? "");
	const [otp, setOtp] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const handledRef = useRef(false);

	const handleUrl = useCallback(async (urlString: string | null) => {
		if (!urlString || handledRef.current) return;

		const { hash, search } = parseUrlParts(urlString);
		let params = new URLSearchParams(hash);
		if (
			!params.has("access_token") &&
			!params.has("error") &&
			!params.has("code")
		) {
			params = new URLSearchParams(search);
		}

		const errorDescription =
			params.get("error_description") || params.get("error");
		if (errorDescription) {
			handledRef.current = true;
			setErrorMessage(errorDescription.replace(/\+/g, " "));
			setStatus("invalid");
			return;
		}

		const accessToken = params.get("access_token");
		const refreshToken = params.get("refresh_token");
		const code = params.get("code");

		try {
			if (accessToken && refreshToken) {
				handledRef.current = true;
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});
				if (error) throw error;
				setStatus("ready");
				return;
			}

			if (code) {
				handledRef.current = true;
				const { error } = await supabase.auth.exchangeCodeForSession(code);
				if (error) throw error;
				setStatus("ready");
				return;
			}
		} catch (err) {
			handledRef.current = true;
			setErrorMessage((err as Error).message);
			setStatus("invalid");
		}
	}, []);

	useEffect(() => {
		Linking.getInitialURL().then(handleUrl);
		const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
		return () => sub.remove();
	}, [handleUrl]);

	// A recovery session may already have been established by the time this
	// screen mounts (cold start races the listener).
	useEffect(() => {
		const timer = setTimeout(async () => {
			if (handledRef.current) return;
			const { data } = await supabase.auth.getSession();
			handledRef.current = true;
			if (data.session) {
				setStatus("ready");
			} else {
				setStatus("code");
			}
		}, 1200);
		return () => clearTimeout(timer);
	}, []);

	const handleVerifyOtp = async () => {
		if (!email.trim()) {
			Alert.alert("Error", "Please enter your email address");
			return;
		}
		if (otp.trim().length < 6) {
			Alert.alert("Error", "Please enter the 6-digit code from your email");
			return;
		}

		setIsVerifying(true);
		const { error } = await verifyRecoveryOtp(email, otp);
		setIsVerifying(false);

		if (error) {
			Alert.error("Invalid Code", error.message);
			return;
		}

		handledRef.current = true;
		setStatus("ready");
	};

	const handleSave = async () => {
		if (!password || !confirmPassword) {
			Alert.alert("Error", "Please fill in both password fields");
			return;
		}
		if (password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters");
			return;
		}
		if (password !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		setIsSaving(true);
		const { error } = await updatePassword(password);
		setIsSaving(false);

		if (error) {
			Alert.error("Error", error.message);
			return;
		}

		setStatus("done");
		// The recovery session must not become a normal login session.
		await signOut();
		Alert.success(
			"Password Updated",
			"You can now sign in with your new password.",
		);
		router.replace("/auth/login");
	};

	const styles = createStyles(theme);

	if (status === "verifying") {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color={theme.primary} />
				<Text style={styles.subtitle}>Verifying reset link...</Text>
			</View>
		);
	}

	if (status === "invalid") {
		return (
			<View style={[styles.container, styles.centered]}>
				<Ionicons name="alert-circle-outline" size={64} color={theme.error} />
				<Text style={styles.title}>Link Not Valid</Text>
				<Text style={styles.subtitle}>
					{errorMessage ?? "This reset link is invalid or has expired."}
				</Text>
				<TouchableOpacity
					style={styles.button}
					onPress={() => router.replace("/auth/forgot-password")}
				>
					<Text style={styles.buttonText}>Request a New Link</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (status === "code") {
		return (
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.header}>
						<Ionicons name="keypad-outline" size={48} color={theme.primary} />
						<Text style={styles.title}>Enter Reset Code</Text>
						<Text style={styles.subtitle}>
							We emailed you a 6-digit code. Enter it below to continue.
						</Text>
					</View>

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

					<View style={styles.inputContainer}>
						<Ionicons
							name="keypad-outline"
							size={20}
							color={theme.textSecondary}
							style={styles.inputIcon}
						/>
						<TextInput
							style={[styles.input, styles.otpInput]}
							placeholder="000000"
							placeholderTextColor={theme.textMuted}
							value={otp}
							onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
							keyboardType="number-pad"
							maxLength={6}
							textContentType="oneTimeCode"
							autoComplete="one-time-code"
						/>
					</View>

					<TouchableOpacity
						style={[styles.button, isVerifying && styles.buttonDisabled]}
						onPress={handleVerifyOtp}
						disabled={isVerifying}
					>
						{isVerifying ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.buttonText}>Verify Code</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.linkButton}
						onPress={() => router.replace("/auth/forgot-password")}
					>
						<Text style={styles.linkText}>Send a new code</Text>
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
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
				<View style={styles.header}>
					<Ionicons
						name="lock-closed-outline"
						size={48}
						color={theme.primary}
					/>
					<Text style={styles.title}>Set a New Password</Text>
					<Text style={styles.subtitle}>
						Choose a password you haven't used before.
					</Text>
				</View>

				<View style={styles.inputContainer}>
					<Ionicons
						name="lock-closed-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="New password"
						placeholderTextColor={theme.textMuted}
						value={password}
						onChangeText={setPassword}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
					/>
					<TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
						<Ionicons
							name={showPassword ? "eye-off-outline" : "eye-outline"}
							size={20}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.inputContainer}>
					<Ionicons
						name="lock-closed-outline"
						size={20}
						color={theme.textSecondary}
						style={styles.inputIcon}
					/>
					<TextInput
						style={styles.input}
						placeholder="Confirm new password"
						placeholderTextColor={theme.textMuted}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
					/>
				</View>

				<TouchableOpacity
					style={[styles.button, isSaving && styles.buttonDisabled]}
					onPress={handleSave}
					disabled={isSaving}
				>
					{isSaving ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Update Password</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.linkButton}
					onPress={() => router.replace("/auth/login")}
				>
					<Text style={styles.linkText}>Back to Login</Text>
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

function parseUrlParts(urlString: string): { hash: string; search: string } {
	const hashIndex = urlString.indexOf("#");
	const hash = hashIndex >= 0 ? urlString.substring(hashIndex + 1) : "";
	const withoutHash =
		hashIndex >= 0 ? urlString.substring(0, hashIndex) : urlString;
	const queryIndex = withoutHash.indexOf("?");
	const search = queryIndex >= 0 ? withoutHash.substring(queryIndex + 1) : "";
	return { hash, search };
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		centered: {
			justifyContent: "center",
			alignItems: "center",
			padding: 24,
		},
		scrollContent: {
			flexGrow: 1,
			justifyContent: "center",
			padding: 24,
		},
		header: {
			alignItems: "center",
			marginBottom: 32,
		},
		title: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginTop: 16,
			textAlign: "center",
		},
		subtitle: {
			fontSize: 14,
			color: theme.textSecondary,
			marginTop: 8,
			textAlign: "center",
		},
		inputContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.card,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			paddingHorizontal: 16,
			paddingVertical: 4,
			marginBottom: 16,
		},
		inputIcon: {
			marginRight: 12,
		},
		input: {
			flex: 1,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
		},
		otpInput: {
			fontSize: 22,
			letterSpacing: 8,
			fontWeight: "600",
		},
		button: {
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 16,
			alignItems: "center",
			marginTop: 8,
		},
		buttonDisabled: {
			opacity: 0.6,
		},
		buttonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
		linkButton: {
			marginTop: 20,
			alignItems: "center",
		},
		linkText: {
			color: theme.primary,
			fontSize: 14,
			fontWeight: "500",
		},
	});
