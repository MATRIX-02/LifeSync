import { Theme, useColors } from "@/src/context/themeContext";
import {
	cancelUpdateDownload,
	dismissUpdateDownload,
	getUpdateDownload,
	retryUpdate,
	subscribeToUpdateDownload,
	UpdateDownload,
} from "@/src/services/appUpdateService";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/** Shows app-update download progress over any screen. Mounted in the root layout. */
export function UpdateProgressSheet() {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [download, setDownload] = useState<UpdateDownload>(getUpdateDownload());
	const [hidden, setHidden] = useState(false);

	useEffect(
		() =>
			subscribeToUpdateDownload((d) => {
				// A new phase (finished, failed) shows the sheet again even if hidden.
				setDownload((prev) => {
					if (prev.state !== d.state) setHidden(false);
					return d;
				});
			}),
		[],
	);

	if (download.state === "idle") return null;
	const pct =
		download.state === "downloading" && download.total > 0
			? Math.min(100, Math.round((download.written / download.total) * 100))
			: null;

	return (
		<Modal visible={!hidden} transparent animationType="fade" onRequestClose={() => setHidden(true)}>
			<Pressable style={s.overlay} onPress={() => download.state === "downloading" && setHidden(true)}>
				<Pressable style={s.card} onPress={() => {}}>
					<View style={s.icon}>
						<Ionicons
							name={
								download.state === "failed"
									? "alert-circle"
									: download.state === "installing"
										? "checkmark-circle"
										: "cloud-download"
							}
							size={30}
							color={download.state === "failed" ? theme.error : theme.primary}
						/>
					</View>
					<Text style={s.title}>
						{download.state === "downloading"
							? `Downloading LifeSync ${download.version}`
							: download.state === "installing"
								? "Download complete"
								: "Update failed"}
					</Text>

					{download.state === "downloading" && (
						<>
							<View style={s.track}>
								<View style={[s.fill, { width: `${pct ?? 3}%` }]} />
							</View>
							<Text style={s.meta}>
								{pct === null
									? "Starting…"
									: `${pct}%  ·  ${mb(download.written)} of ${mb(download.total)} MB`}
							</Text>
							<Text style={s.hint}>You can keep using LifeSync. The installer opens when it's done.</Text>
							<View style={s.row}>
								<TouchableOpacity style={s.ghost} onPress={() => void cancelUpdateDownload()}>
									<Text style={[s.ghostText, { color: theme.error }]}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity style={s.primary} onPress={() => setHidden(true)}>
									<Text style={s.primaryText}>Hide</Text>
								</TouchableOpacity>
							</View>
						</>
					)}

					{download.state === "installing" && (
						<>
							<Text style={s.hint}>
								Tap Install in Android's prompt. The first time, Android asks you to allow LifeSync to install apps.
							</Text>
							<View style={s.row}>
								<TouchableOpacity style={s.ghost} onPress={retryUpdate}>
									<Text style={s.ghostText}>Open installer again</Text>
								</TouchableOpacity>
								<TouchableOpacity style={s.primary} onPress={dismissUpdateDownload}>
									<Text style={s.primaryText}>Done</Text>
								</TouchableOpacity>
							</View>
						</>
					)}

					{download.state === "failed" && (
						<>
							<Text style={s.hint}>{download.message}</Text>
							<View style={s.row}>
								<TouchableOpacity style={s.ghost} onPress={dismissUpdateDownload}>
									<Text style={s.ghostText}>Close</Text>
								</TouchableOpacity>
								<TouchableOpacity style={s.primary} onPress={retryUpdate}>
									<Text style={s.primaryText}>Retry</Text>
								</TouchableOpacity>
							</View>
						</>
					)}
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: "center", padding: 24 },
		card: { backgroundColor: theme.surface, borderRadius: 24, padding: 22, alignItems: "center" },
		icon: {
			width: 60,
			height: 60,
			borderRadius: 30,
			backgroundColor: theme.primary + "1A",
			alignItems: "center",
			justifyContent: "center",
		},
		title: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 12, textAlign: "center" },
		track: {
			alignSelf: "stretch",
			height: 10,
			borderRadius: 5,
			backgroundColor: theme.surfaceLight,
			overflow: "hidden",
			marginTop: 18,
		},
		fill: { height: "100%", borderRadius: 5, backgroundColor: theme.primary },
		meta: { fontSize: 13, fontWeight: "600", color: theme.text, marginTop: 8 },
		hint: { fontSize: 13, color: theme.textSecondary, textAlign: "center", marginTop: 10, lineHeight: 19 },
		row: { flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch" },
		ghost: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 14,
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
		},
		ghostText: { fontSize: 14, fontWeight: "700", color: theme.text },
		primary: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: theme.primary },
		primaryText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
	});
