import { Alert } from "@/src/components/CustomAlert";
import { PushAudience, useAdminStore } from "@/src/context/adminStore";
import { useTheme } from "@/src/context/themeContext";
import { fetchLatestRelease } from "@/src/services/appUpdateService";
import { ProfileWithSubscription } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

// Where a tap on the notification takes the user. Keys go in the push payload.
const DESTINATIONS: { label: string; route?: string }[] = [
	{ label: "Just open app" },
	{ label: "Habits", route: "/(tabs)" },
	{ label: "Money Hub", route: "/(tabs)/finance" },
	{ label: "Workout", route: "/(tabs)/workout" },
	{ label: "Plans", route: "/subscription" },
];

const AUDIENCES: { key: Exclude<PushAudience, "users">; label: string }[] = [
	{ key: "all", label: "Everyone" },
	{ key: "free", label: "Free users" },
	{ key: "premium", label: "Paid users" },
];

const PLACEHOLDERS = ["{first_name}", "{name}", "{plan}"];

interface Props {
	visible: boolean;
	onClose: () => void;
	/** Set to send to one user; leave out to pick an audience. */
	user?: ProfileWithSubscription | null;
}

export default function SendNotificationModal({ visible, onClose, user }: Props) {
	const { theme } = useTheme();
	const sendPush = useAdminStore((s) => s.sendPush);
	const sendUpdatePush = useAdminStore((s) => s.sendUpdatePush);
	const [mode, setMode] = useState<"message" | "update">("message");
	const [version, setVersion] = useState("");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [audience, setAudience] = useState<Exclude<PushAudience, "users">>("all");
	const [route, setRoute] = useState<string | undefined>(undefined);
	const [focused, setFocused] = useState<"title" | "body">("body");
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (visible) {
			setTitle("");
			setBody("");
			setAudience("all");
			setRoute(undefined);
			setMode("message");
			setVersion("");
			// Pre-fill with the newest published release.
			fetchLatestRelease().then(({ data }) => {
				if (data?.version) setVersion((v) => v || data.version);
			});
		}
	}, [visible]);

	const isUpdate = mode === "update";

	const styles = createStyles(theme);
	const noDevice = !!user && !user.expo_push_token;

	const insertPlaceholder = (p: string) => {
		if (focused === "title") setTitle((t) => t + p);
		else setBody((b) => b + p);
	};

	const send = async () => {
		if (isUpdate) {
			if (!/^\d+\.\d+\.\d+$/.test(version.trim())) {
				Alert.warning("Version", "Enter a version like 2.1.0.");
				return;
			}
		} else if (!title.trim() || !body.trim()) {
			Alert.warning("Missing text", "Add a title and a message.");
			return;
		}
		setSending(true);
		const target = user
			? { audience: "users" as const, userIds: [user.id] }
			: { audience };
		const { result, error } = isUpdate
			? await sendUpdatePush({
					...target,
					version: version.trim(),
					title: title.trim() || undefined,
					body: body.trim() || undefined,
				})
			: await sendPush({ ...target, title, body, route });
		setSending(false);
		if (error || !result) {
			Alert.error(
				"Not sent",
				error?.message === "forbidden"
					? "Your account is not an admin on the server."
					: error?.message === "apk_not_found"
					? `No APK found for v${version.trim()}. Publish the GitHub Release first.`
					: `Could not send: ${error?.message ?? "unknown error"}. Is the admin-actions function deployed?`
			);
			return;
		}
		const skipped = result.noDevice
			? `\n${result.noDevice} without a registered device were skipped.`
			: "";
		Alert.success(
			"Sent",
			`Delivered to ${result.sent} of ${result.targeted} ${
				result.targeted === 1 ? "user" : "users"
			}.${skipped}`
		);
		onClose();
	};

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<Text style={styles.title}>
							{user ? "Send notification" : "Broadcast notification"}
						</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
						<View style={styles.modeRow}>
							{(["message", "update"] as const).map((m) => (
								<TouchableOpacity
									key={m}
									style={[styles.modeButton, mode === m && styles.chipActive]}
									onPress={() => setMode(m)}
								>
									<Ionicons
										name={m === "message" ? "chatbubble-outline" : "cloud-download-outline"}
										size={16}
										color={mode === m ? "#fff" : theme.textSecondary}
									/>
									<Text style={[styles.chipText, mode === m && styles.chipTextActive]}>
										{m === "message" ? "Message" : "App update"}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{user ? (
							<Text style={styles.recipient}>
								To {user.full_name || user.email}
							</Text>
						) : (
							<>
								<Text style={styles.label}>Send to</Text>
								<View style={styles.chips}>
									{AUDIENCES.map((a) => (
										<TouchableOpacity
											key={a.key}
											style={[styles.chip, audience === a.key && styles.chipActive]}
											onPress={() => setAudience(a.key)}
										>
											<Text
												style={[
													styles.chipText,
													audience === a.key && styles.chipTextActive,
												]}
											>
												{a.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</>
						)}

						{noDevice && (
							<View style={styles.warning}>
								<Ionicons name="warning" size={16} color={theme.warning} />
								<Text style={styles.warningText}>
									This user has no registered device, so the notification
									can't be delivered.
								</Text>
							</View>
						)}

						{isUpdate && (
							<>
								<Text style={styles.label}>Version</Text>
								<TextInput
									style={styles.input}
									value={version}
									onChangeText={setVersion}
									placeholder="2.1.0"
									placeholderTextColor={theme.textMuted}
									keyboardType="numbers-and-punctuation"
								/>
								<Text style={styles.hint}>
									Tapping it downloads and installs that release's APK. Title and
									message are optional; leave them empty for the standard text.
								</Text>
							</>
						)}

						<Text style={styles.label}>Title</Text>
						<TextInput
							style={styles.input}
							value={title}
							onChangeText={setTitle}
							onFocus={() => setFocused("title")}
							placeholder={
								isUpdate
									? `LifeSync ${version || "x.y.z"} is available`
									: "Hi {first_name}!"
							}
							placeholderTextColor={theme.textMuted}
							maxLength={80}
						/>

						<Text style={styles.label}>Message</Text>
						<TextInput
							style={[styles.input, styles.multiline]}
							value={body}
							onChangeText={setBody}
							onFocus={() => setFocused("body")}
							placeholder={
								isUpdate
									? "Tap to download and install the update."
									: "Write your message..."
							}
							placeholderTextColor={theme.textMuted}
							multiline
							maxLength={300}
						/>

						<Text style={styles.hint}>
							Tap to insert. It's replaced with each person's details.
						</Text>
						<View style={styles.chips}>
							{PLACEHOLDERS.map((p) => (
								<TouchableOpacity
									key={p}
									style={styles.chip}
									onPress={() => insertPlaceholder(p)}
								>
									<Text style={styles.chipText}>{p}</Text>
								</TouchableOpacity>
							))}
						</View>

						{!isUpdate && (
							<Text style={styles.label}>On tap, open</Text>
						)}
						<View style={[styles.chips, isUpdate && { display: "none" }]}>
							{DESTINATIONS.map((d) => (
								<TouchableOpacity
									key={d.label}
									style={[styles.chip, route === d.route && styles.chipActive]}
									onPress={() => setRoute(d.route)}
								>
									<Text
										style={[styles.chipText, route === d.route && styles.chipTextActive]}
									>
										{d.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<TouchableOpacity
							style={[styles.sendButton, (sending || noDevice) && { opacity: 0.5 }]}
							onPress={send}
							disabled={sending || noDevice}
						>
							{sending ? (
								<ActivityIndicator color={"#fff"} />
							) : (
								<>
									<Ionicons name="send" size={16} color={"#fff"} />
									<Text style={styles.sendText}>Send</Text>
								</>
							)}
						</TouchableOpacity>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			maxHeight: "90%",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 20,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		title: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.text,
		},
		content: {
			padding: 20,
			paddingBottom: 40,
		},
		recipient: {
			color: theme.textSecondary,
			fontSize: 14,
			marginBottom: 8,
		},
		label: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginTop: 16,
			marginBottom: 8,
			textTransform: "uppercase",
		},
		hint: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 8,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 10,
			paddingHorizontal: 12,
			paddingVertical: 10,
			color: theme.text,
			fontSize: 15,
		},
		multiline: {
			minHeight: 90,
			textAlignVertical: "top",
		},
		chips: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		modeRow: {
			flexDirection: "row",
			gap: 8,
			marginBottom: 8,
		},
		modeButton: {
			flex: 1,
			flexDirection: "row",
			gap: 6,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		chip: {
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 16,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		chipActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		chipText: {
			color: theme.textSecondary,
			fontSize: 13,
			fontWeight: "500",
		},
		chipTextActive: {
			color: "#fff",
		},
		warning: {
			flexDirection: "row",
			gap: 8,
			alignItems: "center",
			backgroundColor: theme.warning + "20",
			padding: 12,
			borderRadius: 10,
			marginTop: 8,
		},
		warningText: {
			flex: 1,
			color: theme.text,
			fontSize: 13,
		},
		sendButton: {
			flexDirection: "row",
			gap: 8,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 14,
			marginTop: 24,
		},
		sendText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
	});
