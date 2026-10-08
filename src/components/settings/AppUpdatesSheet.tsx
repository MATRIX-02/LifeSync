import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import {
	currentVersion,
	fetchLatestRelease,
	installUpdate,
	isNewerVersion,
	LatestRelease,
} from "@/src/services/appUpdateService";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Updates from "expo-updates";
import React, { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Linking,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

type Ota = "unsupported" | "checking" | "none" | "available" | "downloading" | "ready";

/** Settings > About > Check for updates: new APK releases, then over-the-air updates. */
export function AppUpdatesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [loading, setLoading] = useState(false);
	const [release, setRelease] = useState<LatestRelease | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [ota, setOta] = useState<Ota>("unsupported");

	const check = async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await fetchLatestRelease();
		setRelease(data);
		setError(error);
		setLoading(false);
		// Over-the-air updates only matter when there's no new APK to install.
		if (data && !isNewerVersion(data.version, currentVersion())) void checkOta();
	};

	const checkOta = async () => {
		if (!Updates.isEnabled) return setOta("unsupported");
		setOta("checking");
		try {
			const result = await Updates.checkForUpdateAsync();
			setOta(result.isAvailable ? "available" : "none");
		} catch {
			setOta("none");
		}
	};

	const applyOta = async () => {
		setOta("downloading");
		try {
			await Updates.fetchUpdateAsync();
			setOta("ready");
		} catch {
			setOta("available");
			Alert.error("Couldn't download", "Check your connection and try again.");
		}
	};

	useEffect(() => {
		if (visible) void check();
	}, [visible]);

	const hasNewApk = !!release && isNewerVersion(release.version, currentVersion());

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={s.overlay}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={s.sheet}>
					<View style={s.handle} />
					<View style={s.header}>
						<Text style={s.title}>App updates</Text>
						<TouchableOpacity onPress={onClose} hitSlop={12}>
							<Ionicons name="close" size={22} color={theme.textSecondary} />
						</TouchableOpacity>
					</View>
					<Text style={s.current}>You have LifeSync {currentVersion()}</Text>

					{loading ? (
						<View style={s.center}>
							<ActivityIndicator color={theme.primary} />
							<Text style={s.muted}>Checking…</Text>
						</View>
					) : error ? (
						<View style={s.center}>
							<Ionicons name="cloud-offline-outline" size={36} color={theme.textMuted} />
							<Text style={s.muted}>{error}</Text>
							<TouchableOpacity style={s.secondary} onPress={check}>
								<Text style={s.secondaryText}>Try again</Text>
							</TouchableOpacity>
						</View>
					) : release && hasNewApk ? (
						<>
							<ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
								<View style={s.banner}>
									<Ionicons name="sparkles" size={22} color="#FFFFFF" />
									<View style={{ flex: 1 }}>
										<Text style={s.bannerTitle}>Version {release.version} is here</Text>
										{!!release.publishedAt && (
											<Text style={s.bannerSub}>
												Released{" "}
												{new Date(release.publishedAt).toLocaleDateString([], {
													day: "numeric",
													month: "long",
													year: "numeric",
												})}
											</Text>
										)}
									</View>
								</View>
								<ReleaseNotes text={release.notes} s={s} />
							</ScrollView>
							<TouchableOpacity
								style={[s.primary, !release.apkUrl && { opacity: 0.5 }]}
								disabled={!release.apkUrl}
								onPress={() => {
									onClose();
									void installUpdate(release.version, release.apkUrl!);
								}}
							>
								<Ionicons name="download-outline" size={18} color="#FFFFFF" />
								<Text style={s.primaryText}>Download & install</Text>
							</TouchableOpacity>
						</>
					) : (
						<View style={s.center}>
							<Ionicons name="checkmark-circle" size={44} color={theme.success} />
							<Text style={s.upToDate}>You're on the latest version</Text>
							{ota === "checking" && <Text style={s.muted}>Looking for smaller updates…</Text>}
							{ota === "available" && (
								<TouchableOpacity style={s.primary} onPress={applyOta}>
									<Text style={s.primaryText}>Get the latest fixes</Text>
								</TouchableOpacity>
							)}
							{ota === "downloading" && <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />}
							{ota === "ready" && (
								<TouchableOpacity style={s.primary} onPress={() => Updates.reloadAsync()}>
									<Text style={s.primaryText}>Restart to finish updating</Text>
								</TouchableOpacity>
							)}
						</View>
					)}

					<TouchableOpacity
						style={s.link}
						onPress={() => Linking.openURL(release?.pageUrl ?? "https://github.com/MATRIX-02/LifeSync/releases")}
					>
						<Text style={s.linkText}>See all releases</Text>
						<Ionicons name="open-outline" size={14} color={theme.primary} />
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

type NoteBlock =
	| { kind: "subheading"; text: string }
	| { kind: "bullet"; text: string }
	| { kind: "text"; text: string };

/**
 * Release notes as cards: one per "###" section (module), with **bold-only**
 * lines as subheadings. Handles just the markdown the notes actually use.
 */
function ReleaseNotes({ text, s }: { text: string; s: ReturnType<typeof createStyles> }) {
	const sections: { title: string; blocks: NoteBlock[] }[] = [];
	let intro = "";
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith("<!--")) continue;
		if (/^##\s/.test(line)) continue; // "## LifeSync x.y.z" - shown in the banner
		const heading = line.match(/^#{3,}\s*(.*)$/);
		if (heading) {
			sections.push({ title: heading[1], blocks: [] });
			continue;
		}
		const current = sections[sections.length - 1];
		if (!current) {
			intro += (intro ? " " : "") + line;
			continue;
		}
		const bold = line.match(/^\*\*(.+)\*\*$/);
		if (bold) current.blocks.push({ kind: "subheading", text: bold[1] });
		else if (/^[-*]\s/.test(line)) current.blocks.push({ kind: "bullet", text: line.slice(2) });
		else current.blocks.push({ kind: "text", text: line });
	}
	// The Install section is for the GitHub page, not in-app.
	const shown = sections.filter((sec) => !/install/i.test(sec.title));

	const inline = (t: string) =>
		t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
			part.startsWith("**") && part.endsWith("**") ? (
				<Text key={i} style={s.bold}>
					{part.slice(2, -2)}
				</Text>
			) : (
				part.replace(/[`_]/g, "").replace(/\*/g, "")
			),
		);

	return (
		<View>
			{!!intro && <Text style={s.intro}>{inline(intro)}</Text>}
			{shown.map((sec, i) => (
				<View key={i} style={s.section}>
					<Text style={s.sectionTitle}>{sec.title}</Text>
					{sec.blocks.map((block, j) =>
						block.kind === "subheading" ? (
							<Text key={j} style={[s.subheading, j === 0 && { marginTop: 4 }]}>
								{block.text}
							</Text>
						) : block.kind === "bullet" ? (
							<View key={j} style={s.bulletRow}>
								<View style={s.bulletDot} />
								<Text style={s.noteText}>{inline(block.text)}</Text>
							</View>
						) : (
							<Text key={j} style={[s.noteText, { marginTop: 8 }]}>
								{inline(block.text)}
							</Text>
						),
					)}
				</View>
			))}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay },
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 26,
			borderTopRightRadius: 26,
			paddingHorizontal: 20,
			paddingBottom: 28,
			height: "92%",
		},
		handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginTop: 10 },
		header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14 },
		title: { fontSize: 20, fontWeight: "700", color: theme.text },
		current: { fontSize: 13, color: theme.textSecondary, marginTop: 2, marginBottom: 14 },
		center: { alignItems: "center", paddingVertical: 24, gap: 8 },
		muted: { fontSize: 13, color: theme.textSecondary, textAlign: "center" },
		upToDate: { fontSize: 16, fontWeight: "700", color: theme.text },
		scroll: { flex: 1 },
		banner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			padding: 16,
			borderRadius: 18,
			backgroundColor: theme.primary,
		},
		bannerTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
		bannerSub: { fontSize: 13, color: "#FFFFFFD0", marginTop: 2 },
		intro: { fontSize: 15, color: theme.text, lineHeight: 22, marginTop: 16 },
		section: { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: theme.surface },
		sectionTitle: { fontSize: 17, fontWeight: "800", color: theme.text, marginBottom: 4 },
		subheading: { fontSize: 15, fontWeight: "700", color: theme.primary, marginTop: 14, marginBottom: 2 },
		noteText: { flex: 1, fontSize: 15, color: theme.text, lineHeight: 22 },
		bold: { fontWeight: "700" },
		bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
		bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginTop: 8 },
		primary: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			marginTop: 16,
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 16,
			backgroundColor: theme.primary,
			alignSelf: "stretch",
		},
		primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
		secondary: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, backgroundColor: theme.surface },
		secondaryText: { fontSize: 14, fontWeight: "700", color: theme.text },
		link: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
		linkText: { fontSize: 13, fontWeight: "600", color: theme.primary },
	});
