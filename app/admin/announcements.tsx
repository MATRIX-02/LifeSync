import { Alert } from "@/src/components/CustomAlert";
import {
	AnnouncementAudience,
	useAdminStore,
} from "@/src/context/adminStore";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const AUDIENCES: { key: AnnouncementAudience; label: string }[] = [
	{ key: "all", label: "Everyone" },
	{ key: "free", label: "Free users" },
	{ key: "premium", label: "Paid users" },
];

export default function AdminAnnouncementsScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { isAdmin } = useAuthStore();
	const {
		announcements,
		fetchAnnouncements,
		createAnnouncement,
		setAnnouncementActive,
		deleteAnnouncement,
	} = useAdminStore();

	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [audience, setAudience] = useState<AnnouncementAudience>("all");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!isAdmin()) {
			router.replace("/(tabs)");
			return;
		}
		fetchAnnouncements();
	}, []);

	const styles = createStyles(theme);

	const publish = async () => {
		if (!title.trim() || !body.trim()) {
			Alert.warning("Missing text", "Add a title and a message.");
			return;
		}
		setSaving(true);
		const { error } = await createAnnouncement({
			title: title.trim(),
			body: body.trim(),
			audience,
		});
		setSaving(false);
		if (error) {
			Alert.error(
				"Not published",
				`${error.message}\n\nHas the announcements table been created? See docs/ADMIN_SETUP.md.`
			);
			return;
		}
		setTitle("");
		setBody("");
		Alert.success("Published", "Users will see it the next time they open the app.");
	};

	const confirmDelete = (id: string) => {
		Alert.alert("Delete announcement", "Remove this announcement?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteAnnouncement(id),
			},
		]);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Announcements</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>New announcement</Text>
					<TextInput
						style={styles.input}
						value={title}
						onChangeText={setTitle}
						placeholder="Title"
						placeholderTextColor={theme.textMuted}
						maxLength={80}
					/>
					<TextInput
						style={[styles.input, styles.multiline]}
						value={body}
						onChangeText={setBody}
						placeholder="Message shown in the app"
						placeholderTextColor={theme.textMuted}
						multiline
						maxLength={1000}
					/>
					<View style={styles.chips}>
						{AUDIENCES.map((a) => (
							<TouchableOpacity
								key={a.key}
								style={[styles.chip, audience === a.key && styles.chipActive]}
								onPress={() => setAudience(a.key)}
							>
								<Text
									style={[styles.chipText, audience === a.key && styles.chipTextActive]}
								>
									{a.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<TouchableOpacity
						style={[styles.publishButton, saving && { opacity: 0.5 }]}
						onPress={publish}
						disabled={saving}
					>
						{saving ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.publishText}>Publish</Text>
						)}
					</TouchableOpacity>
				</View>

				<Text style={styles.listTitle}>Published</Text>
				{announcements.length === 0 && (
					<Text style={styles.empty}>No announcements yet.</Text>
				)}
				{announcements.map((a) => (
					<View key={a.id} style={styles.card}>
						<View style={styles.row}>
							<Text style={styles.itemTitle} numberOfLines={1}>
								{a.title}
							</Text>
							<Switch
								value={a.is_active}
								onValueChange={(v) => {
									void setAnnouncementActive(a.id, v);
								}}
								trackColor={{ true: theme.primary, false: theme.border }}
							/>
						</View>
						<Text style={styles.itemBody}>{a.body}</Text>
						<View style={styles.row}>
							<Text style={styles.meta}>
								{AUDIENCES.find((x) => x.key === a.audience)?.label ?? a.audience} ·{" "}
								{new Date(a.created_at).toLocaleDateString()} ·{" "}
								{a.is_active ? "Live" : "Hidden"}
							</Text>
							<TouchableOpacity onPress={() => confirmDelete(a.id)}>
								<Ionicons name="trash-outline" size={20} color={theme.error} />
							</TouchableOpacity>
						</View>
					</View>
				))}
				<View style={{ height: 40 }} />
			</ScrollView>
		</View>
	);
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingTop: 60,
			paddingBottom: 16,
			backgroundColor: theme.surface,
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		content: {
			flex: 1,
			padding: 16,
		},
		card: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			gap: 10,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			textTransform: "uppercase",
		},
		input: {
			backgroundColor: theme.background,
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
		chip: {
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 16,
			backgroundColor: theme.background,
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
		publishButton: {
			backgroundColor: theme.primary,
			borderRadius: 10,
			paddingVertical: 12,
			alignItems: "center",
		},
		publishText: {
			color: "#fff",
			fontSize: 15,
			fontWeight: "600",
		},
		listTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			textTransform: "uppercase",
			marginTop: 8,
			marginBottom: 12,
		},
		empty: {
			color: theme.textMuted,
			fontSize: 14,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
		},
		itemTitle: {
			flex: 1,
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
		},
		itemBody: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		meta: {
			color: theme.textMuted,
			fontSize: 12,
		},
	});
