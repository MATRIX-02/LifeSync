import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import {
	currentVersion,
	fetchLatestRelease,
	fetchReleaseForVersion,
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

const RELEASES_URL = "https://github.com/MATRIX-02/LifeSync/releases";

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Settings > About > Check for updates, laid out like Android's System update
 * screen: a status header, version details, the release notes, and one action
 * at the bottom. With a newer APK it shows that release's notes; when up to
 * date, the notes for the installed version ("What's new in x.y.z").
 */
export function AppUpdatesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [loading, setLoading] = useState(false);
	const [release, setRelease] = useState<LatestRelease | null>(null);
	const [installed, setInstalled] = useState<LatestRelease | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [checkedAt, setCheckedAt] = useState<Date | null>(null);
	const [ota, setOta] = useState<Ota>("unsupported");

	const check = async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await fetchLatestRelease();
		setRelease(data);
		setError(error);
		if (!error) setCheckedAt(new Date());
		if (data && !isNewerVersion(data.version, currentVersion())) {
			// Up to date: show what's new in the version they have.
			const mine =
				data.version === currentVersion() ? { data } : await fetchReleaseForVersion(currentVersion());
			setInstalled(mine.data);
			void checkOta();
		}
		setLoading(false);
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
	const notes = hasNewApk ? release : installed;

	const status = loading
		? { icon: "sync" as const, color: theme.primary, title: "Checking for updates…" }
		: error
			? { icon: "cloud-offline-outline" as const, color: theme.textMuted, title: "Couldn't check for updates" }
			: hasNewApk
				? { icon: "arrow-down-circle" as const, color: theme.primary, title: "Update available" }
				: { icon: "checkmark-circle" as const, color: theme.success, title: "Your app is up to date" };

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={s.overlay}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={s.sheet}>
					<View style={s.handle} />
					<View style={s.header}>
						<Text style={s.title}>App update</Text>
						<TouchableOpacity onPress={onClose} hitSlop={12}>
							<Ionicons name="close" size={22} color={theme.textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
						<View style={s.hero}>
							<View style={[s.heroIcon, { backgroundColor: status.color + "22" }]}>
								{loading ? (
									<ActivityIndicator color={status.color} size="large" />
								) : (
									<Ionicons name={status.icon} size={44} color={status.color} />
								)}
							</View>
							<Text style={s.heroTitle}>{status.title}</Text>
							<Text style={s.heroVersion}>
								LifeSync {hasNewApk && release && !loading ? release.version : currentVersion()}
							</Text>
							{hasNewApk && release && !loading && (
								<Text style={s.heroMeta}>
									{[
										release.apkSize ? formatSize(release.apkSize) : null,
										release.publishedAt ? `Released ${formatDate(release.publishedAt)}` : null,
									]
										.filter(Boolean)
										.join("  ·  ")}
								</Text>
							)}
							{!!error && !loading && <Text style={s.muted}>{error}</Text>}
						</View>

						<View style={s.infoCard}>
							<InfoRow s={s} label="Current version" value={currentVersion()} />
							{hasNewApk && release && <InfoRow s={s} label="New version" value={release.version} />}
							<InfoRow
								s={s}
								label="Last checked"
								value={
									checkedAt
										? checkedAt.toLocaleString([], {
												day: "numeric",
												month: "short",
												hour: "numeric",
												minute: "2-digit",
											})
										: "—"
								}
								last
							/>
						</View>

						{!loading && ota === "checking" && <Text style={s.otaNote}>Looking for smaller updates…</Text>}

						{!loading && !!notes?.notes && (
							<>
								<Text style={s.notesHeading}>
									{hasNewApk ? "What's new" : `What's new in ${currentVersion()}`}
								</Text>
								<ReleaseNotes text={notes.notes} s={s} />
							</>
						)}

						<TouchableOpacity style={s.link} onPress={() => Linking.openURL(notes?.pageUrl ?? RELEASES_URL)}>
							<Text style={s.linkText}>See all releases</Text>
							<Ionicons name="open-outline" size={14} color={theme.primary} />
						</TouchableOpacity>
					</ScrollView>

					{loading ? null : hasNewApk && release ? (
						<TouchableOpacity
							style={[s.primary, !release.apkUrl && { opacity: 0.5 }]}
							disabled={!release.apkUrl}
							onPress={() => {
								onClose();
								void installUpdate(release.version, release.apkUrl!);
							}}
						>
							<Ionicons name="download-outline" size={18} color="#FFFFFF" />
							<Text style={s.primaryText}>
								Download & install{release.apkSize ? ` (${formatSize(release.apkSize)})` : ""}
							</Text>
						</TouchableOpacity>
					) : ota === "available" ? (
						<TouchableOpacity style={s.primary} onPress={applyOta}>
							<Text style={s.primaryText}>Get the latest fixes</Text>
						</TouchableOpacity>
					) : ota === "downloading" ? (
						<View style={s.primary}>
							<ActivityIndicator color="#FFFFFF" />
							<Text style={s.primaryText}>Downloading fixes…</Text>
						</View>
					) : ota === "ready" ? (
						<TouchableOpacity style={s.primary} onPress={() => Updates.reloadAsync()}>
							<Text style={s.primaryText}>Restart to finish updating</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity style={s.secondaryWide} onPress={check}>
							<Ionicons name="refresh" size={18} color={theme.text} />
							<Text style={s.secondaryText}>{error ? "Try again" : "Check for updates"}</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	);
}

function InfoRow({
	s,
	label,
	value,
	last,
}: {
	s: ReturnType<typeof createStyles>;
	label: string;
	value: string;
	last?: boolean;
}) {
	return (
		<View style={[s.infoRow, !last && s.infoDivider]}>
			<Text style={s.infoLabel}>{label}</Text>
			<Text style={s.infoValue}>{value}</Text>
		</View>
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
		if (/^##\s/.test(line)) continue; // "## LifeSync x.y.z" - shown in the header
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
		muted: { fontSize: 13, color: theme.textSecondary, textAlign: "center", marginTop: 6 },
		scroll: { flex: 1, marginTop: 8 },
		hero: { alignItems: "center", paddingVertical: 20 },
		heroIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
		heroTitle: { fontSize: 22, fontWeight: "800", color: theme.text, marginTop: 16, textAlign: "center" },
		heroVersion: { fontSize: 15, fontWeight: "600", color: theme.textSecondary, marginTop: 4 },
		heroMeta: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
		infoCard: { borderRadius: 18, backgroundColor: theme.surface, paddingHorizontal: 16 },
		infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13 },
		infoDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
		infoLabel: { fontSize: 14, color: theme.textSecondary },
		infoValue: { fontSize: 14, fontWeight: "600", color: theme.text },
		otaNote: { fontSize: 13, color: theme.textSecondary, textAlign: "center", marginTop: 12 },
		notesHeading: { fontSize: 18, fontWeight: "800", color: theme.text, marginTop: 22 },
		intro: { fontSize: 15, color: theme.text, lineHeight: 22, marginTop: 12 },
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
		secondaryWide: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			marginTop: 16,
			paddingVertical: 14,
			borderRadius: 16,
			backgroundColor: theme.surface,
		},
		secondaryText: { fontSize: 15, fontWeight: "700", color: theme.text },
		link: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginVertical: 18 },
		linkText: { fontSize: 13, fontWeight: "600", color: theme.primary },
	});
