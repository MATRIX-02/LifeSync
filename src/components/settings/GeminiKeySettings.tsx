import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import {
	GEMINI_KEY_URL,
	getUserGeminiKey,
	setUserGeminiKey,
	subscribeToUserKey,
	testGeminiKey,
} from "@/src/services/insights/userKey";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const STEPS = [
	"Open Google AI Studio and sign in with any Google account.",
	'Tap "Create API key". If it asks, let it create a project for you.',
	"Copy the key (it starts with AIza) and paste it below.",
];

/** Lets the user add their own free Gemini key, used instead of the shared AI allowance. */
export function useUserGeminiKey(): string | null {
	const [key, setKey] = useState<string | null>(null);
	useEffect(() => {
		getUserGeminiKey().then(setKey);
		return subscribeToUserKey(setKey);
	}, []);
	return key;
}

const maskKey = (key: string) =>
	key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••";

export default function GeminiKeySettings({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const theme = useColors();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const savedKey = useUserGeminiKey();
	const [input, setInput] = useState("");
	const [isTesting, setIsTesting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		setInput("");
		setError(null);
		onClose();
	};

	const handleSave = async () => {
		const key = input.trim();
		if (!key) return;
		setIsTesting(true);
		setError(null);
		const result = await testGeminiKey(key);
		if (!result.ok) {
			setIsTesting(false);
			setError(result.message);
			return;
		}
		try {
			await setUserGeminiKey(key);
		} catch {
			setIsTesting(false);
			setError("Could not save the key on this device. Please try again.");
			return;
		}
		setIsTesting(false);
		close();
		Alert.success(
			"Key works ✓",
			"AI insights now use your own Gemini key.",
		);
	};

	const handleRemove = () => {
		Alert.alert(
			"Remove Gemini key?",
			"AI insights will go back to the shared daily allowance.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						await setUserGeminiKey(null);
						close();
					},
				},
			],
		);
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<Text style={styles.title}>Your Gemini Key</Text>
						<TouchableOpacity onPress={close} hitSlop={12}>
							<Ionicons name="close" size={24} color={theme.textSecondary} />
						</TouchableOpacity>
					</View>

					<Text style={styles.intro}>
						A free key from Google gives you your own AI allowance instead of
						sharing one with everyone. No card needed, about 2 minutes.
					</Text>

					{STEPS.map((step, i) => (
						<View key={i} style={styles.step}>
							<View style={styles.stepNumber}>
								<Text style={styles.stepNumberText}>{i + 1}</Text>
							</View>
							<Text style={styles.stepText}>{step}</Text>
						</View>
					))}

					<TouchableOpacity
						style={styles.linkButton}
						onPress={() => Linking.openURL(GEMINI_KEY_URL)}
					>
						<Ionicons name="open-outline" size={18} color={theme.primary} />
						<Text style={styles.linkButtonText}>Open Google AI Studio</Text>
					</TouchableOpacity>

					{savedKey && (
						<Text style={styles.current}>
							Current key: {maskKey(savedKey)}
						</Text>
					)}

					<TextInput
						style={styles.input}
						value={input}
						onChangeText={(text) => {
							setInput(text);
							setError(null);
						}}
						placeholder={savedKey ? "Paste a new key to replace it" : "AIza…"}
						placeholderTextColor={theme.textMuted}
						autoCapitalize="none"
						autoCorrect={false}
						secureTextEntry
					/>
					{error && <Text style={styles.error}>{error}</Text>}

					<TouchableOpacity
						style={[styles.saveButton, (!input.trim() || isTesting) && styles.disabled]}
						onPress={handleSave}
						disabled={!input.trim() || isTesting}
					>
						{isTesting ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Text style={styles.saveButtonText}>Test & Save</Text>
						)}
					</TouchableOpacity>

					{savedKey && (
						<TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
							<Text style={styles.removeButtonText}>Remove key</Text>
						</TouchableOpacity>
					)}

					<Text style={styles.note}>
						The key is stored only on this device. On Google's free tier,
						Google may use what's sent to improve its models; that includes
						the summaries of your data that AI insights send.
					</Text>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			justifyContent: "flex-end",
			backgroundColor: theme.overlay,
		},
		sheet: {
			backgroundColor: theme.surface,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			paddingBottom: 32,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		title: { fontSize: 20, fontWeight: "700", color: theme.text },
		intro: {
			fontSize: 14,
			color: theme.textSecondary,
			lineHeight: 20,
			marginBottom: 16,
		},
		step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
		stepNumber: {
			width: 22,
			height: 22,
			borderRadius: 11,
			backgroundColor: theme.primary + "20",
			alignItems: "center",
			justifyContent: "center",
			marginRight: 10,
		},
		stepNumberText: { fontSize: 12, fontWeight: "700", color: theme.primary },
		stepText: { flex: 1, fontSize: 14, color: theme.text, lineHeight: 20 },
		linkButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.primary,
			marginTop: 6,
			marginBottom: 16,
		},
		linkButtonText: { fontSize: 15, fontWeight: "600", color: theme.primary },
		current: { fontSize: 13, color: theme.textSecondary, marginBottom: 8 },
		input: {
			backgroundColor: theme.surfaceLight,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: theme.text,
		},
		error: { fontSize: 13, color: theme.error, marginTop: 8 },
		saveButton: {
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: "center",
			marginTop: 14,
		},
		disabled: { opacity: 0.5 },
		saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
		removeButton: { alignItems: "center", paddingVertical: 12 },
		removeButtonText: { fontSize: 15, fontWeight: "600", color: theme.error },
		note: {
			fontSize: 12,
			color: theme.textMuted,
			lineHeight: 17,
			marginTop: 10,
		},
	});
