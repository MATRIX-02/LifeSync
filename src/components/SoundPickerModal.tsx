// Bottom sheet for choosing a reminder/alarm tone. Tapping a row previews it.
import {
	soundsFor,
	SoundKind,
	SYSTEM_SOUND_ID,
} from "@/src/constants/notificationSounds";
import { Theme, useColors } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";

/** Sentinel for "no tone of its own" - the habit follows the Settings default. */
export const USE_DEFAULT_SOUND = "";

interface SoundPickerModalProps {
	visible: boolean;
	kind: SoundKind;
	/** Selected tone id, SYSTEM_SOUND_ID, or USE_DEFAULT_SOUND. */
	value: string;
	onSelect: (id: string) => void;
	onClose: () => void;
	/** Offer "Use default" (per-habit picker). Settings itself omits it. */
	defaultLabel?: string;
	accent?: string;
}

export const SoundPickerModal: React.FC<SoundPickerModalProps> = ({
	visible,
	kind,
	value,
	onSelect,
	onClose,
	defaultLabel,
	accent,
}) => {
	const theme = useColors();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const color = accent || theme.primary;
	const [playing, setPlaying] = useState<string | null>(null);
	const soundRef = useRef<Audio.Sound | null>(null);

	const stop = async () => {
		const current = soundRef.current;
		soundRef.current = null;
		setPlaying(null);
		if (current) {
			try {
				await current.stopAsync();
				await current.unloadAsync();
			} catch {
				// Already unloaded.
			}
		}
	};

	// Never leave a preview playing behind a closed sheet.
	useEffect(() => {
		if (!visible) stop();
		return () => {
			stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	const preview = async (id: string, asset: number) => {
		await stop();
		try {
			await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
			const { sound } = await Audio.Sound.createAsync(asset, {
				shouldPlay: true,
			});
			soundRef.current = sound;
			setPlaying(id);
			sound.setOnPlaybackStatusUpdate((status) => {
				if (status.isLoaded && status.didJustFinish) stop();
			});
		} catch (error) {
			console.warn("Sound preview failed:", error);
		}
	};

	const choose = (id: string, asset?: number) => {
		onSelect(id);
		if (id === USE_DEFAULT_SOUND) return void stop();
		if (Platform.OS === "android") {
			// Through a real notification, at notification volume - media
			// volume is often muted, which made previews silent.
			void stop();
			setPlaying(id);
			void NotificationService.previewTone(id, kind).finally(() =>
				setTimeout(() => setPlaying((p) => (p === id ? null : p)), 2500),
			);
			return;
		}
		if (asset !== undefined) preview(id, asset);
		else stop();
	};

	const Row = ({
		id,
		label,
		hint,
		icon,
		asset,
	}: {
		id: string;
		label: string;
		hint?: string;
		icon: string;
		asset?: number;
	}) => {
		const selected = value === id;
		return (
			<TouchableOpacity
				style={[styles.row, selected && { borderColor: color }]}
				onPress={() => choose(id, asset)}
			>
				<View style={[styles.rowIcon, { backgroundColor: color + "20" }]}>
					<Ionicons
						name={(playing === id ? "volume-high" : icon) as any}
						size={20}
						color={color}
					/>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={[styles.rowLabel, selected && { color }]}>{label}</Text>
					{hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
				</View>
				{selected && <Ionicons name="checkmark-circle" size={22} color={color} />}
			</TouchableOpacity>
		);
	};

	const tones = soundsFor(kind);
	const firstOther = tones.findIndex((t) => t.kind !== kind);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<TouchableWithoutFeedback onPress={onClose}>
					<View style={StyleSheet.absoluteFill} />
				</TouchableWithoutFeedback>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<Text style={styles.title}>
							{kind === "alarm" ? "Alarm Sound" : "Reminder Sound"}
						</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>
					<Text style={styles.subtitle}>Tap a sound to hear it.</Text>

					<ScrollView showsVerticalScrollIndicator={false}>
						{defaultLabel !== undefined && (
							<Row
								id={USE_DEFAULT_SOUND}
								label="Use default"
								hint={defaultLabel}
								icon="settings-outline"
							/>
						)}
						<Row
							id={SYSTEM_SOUND_ID}
							label="System default"
							hint="Your phone's notification tone"
							icon="phone-portrait-outline"
						/>
						{tones.map((tone, i) => (
							<React.Fragment key={tone.id}>
								{i === 0 && (
									<Text style={styles.group}>
										{kind === "alarm" ? "ALARM TONES" : "REMINDER TONES"}
									</Text>
								)}
								{i === firstOther && (
									<Text style={styles.group}>
										{kind === "alarm" ? "SHORT TONES" : "ALARM TONES"}
									</Text>
								)}
								<Row
									id={tone.id}
									label={tone.label}
									icon="musical-note"
									asset={tone.asset}
								/>
							</React.Fragment>
						))}
						<View style={{ height: 24 }} />
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			paddingHorizontal: 20,
			paddingTop: 20,
			maxHeight: "80%",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		subtitle: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
			marginBottom: 12,
		},
		group: {
			fontSize: 12,
			fontWeight: "700",
			letterSpacing: 0.5,
			color: theme.textMuted,
			marginTop: 12,
			marginBottom: 8,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			padding: 12,
			borderRadius: 14,
			backgroundColor: theme.surface,
			borderWidth: 1.5,
			borderColor: "transparent",
			marginBottom: 8,
		},
		rowIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		rowLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		rowHint: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
	});
