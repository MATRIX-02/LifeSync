import { supabaseDirect } from "@/src/config/supabase";
import { useAuthStore } from "@/src/context/authStore";
import { useTheme } from "@/src/context/themeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	AppState,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

// Admin announcements (app/admin/announcements.tsx), shown once each. Seen ids
// are kept per device; a reinstall shows live ones again, which is harmless.
const SEEN_KEY = "seen_announcements";

interface Announcement {
	id: string;
	title: string;
	body: string;
	audience: "all" | "free" | "premium";
}

export default function AnnouncementModal() {
	const { theme } = useTheme();
	const userId = useAuthStore((s) => s.user?.id);
	const subscription = useAuthStore((s) => s.subscription);
	const [queue, setQueue] = useState<Announcement[]>([]);

	useEffect(() => {
		if (!userId) return;
		const load = async () => {
			try {
				const { data, error } = await (supabaseDirect.from("announcements" as any) as any)
					.select("id, title, body, audience")
					.eq("is_active", true)
					.order("created_at", { ascending: true });
				// Table missing or offline: say nothing.
				if (error || !data) return;
				const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? "[]");
				const premium = useAuthStore.getState().isPremium();
				setQueue(
					(data as Announcement[]).filter(
						(a) =>
							!seen.includes(a.id) &&
							(a.audience === "all" || (a.audience === "premium") === premium)
					)
				);
			} catch {
				// Never block the app on announcements.
			}
		};
		load();
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") load();
		});
		return () => sub.remove();
	}, [userId, subscription?.id]);

	const current = queue[0];
	if (!current) return null;

	const dismiss = async () => {
		setQueue((q) => q.slice(1));
		try {
			const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? "[]");
			await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen, current.id]));
		} catch {
			// Worst case it shows again next launch.
		}
	};

	const styles = createStyles(theme);

	return (
		<Modal visible transparent animationType="fade" onRequestClose={dismiss}>
			<View style={styles.overlay}>
				<View style={styles.card}>
					<View style={styles.icon}>
						<Ionicons name="megaphone" size={28} color={theme.primary} />
					</View>
					<Text style={styles.title}>{current.title}</Text>
					<ScrollView style={styles.bodyScroll}>
						<Text style={styles.body}>{current.body}</Text>
					</ScrollView>
					<TouchableOpacity style={styles.button} onPress={dismiss}>
						<Text style={styles.buttonText}>Got it</Text>
					</TouchableOpacity>
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
			justifyContent: "center",
			padding: 24,
		},
		card: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 24,
			alignItems: "center",
			maxHeight: "80%",
		},
		icon: {
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		title: {
			color: theme.text,
			fontSize: 20,
			fontWeight: "bold",
			textAlign: "center",
			marginBottom: 12,
		},
		bodyScroll: {
			alignSelf: "stretch",
		},
		body: {
			color: theme.textSecondary,
			fontSize: 15,
			lineHeight: 22,
			textAlign: "center",
		},
		button: {
			alignSelf: "stretch",
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: "center",
			marginTop: 20,
		},
		buttonText: {
			color: "#fff",
			fontSize: 16,
			fontWeight: "600",
		},
	});
