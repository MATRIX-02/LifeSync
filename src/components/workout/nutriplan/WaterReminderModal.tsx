import { Alert } from "@/src/components/CustomAlert";
import { SoundPickerModal } from "@/src/components/SoundPickerModal";
import { soundLabel } from "@/src/constants/notificationSounds";
import { Theme, useColors } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import {
	applyWaterConfig,
	DEFAULT_WATER_SOUND,
	nextWaterReminder,
	WaterReminderConfig,
	waterReminderTimes,
} from "@/src/services/waterReminders";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
	LayoutAnimation,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

const FREQUENCIES: { label: string; value: number | null }[] = [
	{ label: "Smart", value: null },
	{ label: "30m", value: 30 },
	{ label: "1h", value: 60 },
	{ label: "1.5h", value: 90 },
	{ label: "2h", value: 120 },
	{ label: "3h", value: 180 },
];

type Section = "hours" | "frequency" | "days";

const toMinutes = (hhmm: string) => {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
};
const toDate = (hhmm: string) => {
	const d = new Date();
	d.setHours(0, toMinutes(hhmm), 0, 0);
	return d;
};
const toHHmm = (d: Date) =>
	`${d.getHours().toString().padStart(2, "0")}:${d
		.getMinutes()
		.toString()
		.padStart(2, "0")}`;
const display = (hhmm: string) =>
	toDate(hhmm).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const sameDays = (a: number[], b: number[]) =>
	a.length === b.length && a.every((d) => b.includes(d));

function describeDays(days: number[] | null): string {
	if (!days || days.length === 7) return "Every day";
	if (sameDays(days, WEEKDAYS)) return "Weekdays";
	if (sameDays(days, WEEKENDS)) return "Weekends";
	return days.map((d) => DAY_NAMES[d]).join(", ");
}

function describeFrequency(config: WaterReminderConfig, times: string[]): string {
	if (config.intervalMinutes) {
		const h = config.intervalMinutes / 60;
		return `Every ${h >= 1 ? `${h} h` : `${config.intervalMinutes} min`}`;
	}
	if (times.length < 2) return "Smart";
	const gap = (toMinutes(times[times.length - 1]) - toMinutes(times[0])) / (times.length - 1);
	const h = Math.round(gap / 30) / 2;
	return `Smart · about every ${h >= 1 ? `${h} h` : `${Math.round(gap)} min`}`;
}

interface Props {
	visible: boolean;
	onClose: () => void;
	config: WaterReminderConfig;
	onChange: (config: WaterReminderConfig) => void;
	goalMl: number;
}

export function WaterReminderModal({ visible, onClose, config, onChange, goalMl }: Props) {
	const theme = useColors();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [open, setOpen] = useState<Section | null>(null);
	const [editingTime, setEditingTime] = useState<"start" | "end" | null>(null);
	const [showSoundPicker, setShowSoundPicker] = useState(false);

	const times = waterReminderTimes(config, goalMl);
	const next = config.enabled ? nextWaterReminder(config, goalMl) : null;

	// Every edit reschedules straight away, so there is no "save" to forget.
	const update = async (patch: Partial<WaterReminderConfig>) => {
		const nextConfig = { ...config, ...patch };
		if (patch.enabled && !config.enabled) {
			const granted = await NotificationService.requestPermissions();
			if (!granted) {
				Alert.error(
					"Notifications are off",
					"Allow notifications for LifeSync in your phone's settings to get water reminders.",
				);
				return;
			}
		}
		if (patch.enabled !== undefined) {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			if (!patch.enabled) setOpen(null);
		}
		onChange(nextConfig);
		try {
			onChange(await applyWaterConfig(nextConfig, goalMl));
		} catch (error) {
			console.error("Error applying water reminders:", error);
			Alert.error("Couldn't update reminders", "Please try again.");
		}
	};

	const toggleSection = (section: Section) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setEditingTime(null);
		setOpen(open === section ? null : section);
	};

	const handleTime = (_: unknown, date?: Date) => {
		const which = editingTime;
		if (Platform.OS === "android") setEditingTime(null);
		if (!date || !which) return;
		const value = toHHmm(date);
		if (which === "start" ? value >= config.endTime : value <= config.startTime) {
			Alert.warning("Check the times", "The start has to be before the end.");
			return;
		}
		update(which === "start" ? { startTime: value } : { endTime: value });
	};

	const toggleDay = (day: number) => {
		const current = config.days ?? ALL_DAYS;
		const nextDays = current.includes(day)
			? current.filter((d) => d !== day)
			: [...current, day].sort();
		if (nextDays.length === 0) return;
		update({ days: nextDays.length === 7 ? null : nextDays });
	};

	// Timeline: dots placed across the active window.
	const startMin = toMinutes(config.startTime);
	const span = Math.max(1, toMinutes(config.endTime) - startMin);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<View style={styles.handle} />
					<View style={styles.header}>
						<Text style={styles.title}>Water reminders</Text>
						<TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeButton}>
							<Ionicons name="close" size={20} color={theme.textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false} bounces={false}>
						{/* Hero: the one control that matters, plus a plain summary. */}
						<View style={[styles.hero, config.enabled && styles.heroOn]}>
							<View style={[styles.heroIcon, config.enabled && styles.heroIconOn]}>
								<Ionicons
									name={config.enabled ? "water" : "water-outline"}
									size={26}
									color={config.enabled ? "#FFFFFF" : theme.info}
								/>
							</View>
							<View style={styles.heroText}>
								<Text style={styles.heroTitle}>
									{config.enabled ? `${times.length} reminders a day` : "Reminders are off"}
								</Text>
								<Text style={styles.heroSub}>
									{config.enabled
										? next
											? `Next at ${next}`
											: "No upcoming reminders"
										: `Get nudged to reach your ${goalMl} ml goal`}
								</Text>
							</View>
							<Switch
								value={config.enabled}
								onValueChange={(enabled) => update({ enabled })}
								trackColor={{ true: theme.info, false: theme.border }}
								thumbColor="#FFFFFF"
							/>
						</View>

						{config.enabled && (
							<>
								<View style={styles.timeline}>
									<View style={styles.track}>
										<View style={styles.trackFill} />
										{times.map((t) => (
											<View
												key={t}
												style={[
													styles.dot,
													{ left: `${((toMinutes(t) - startMin) / span) * 100}%` },
												]}
											/>
										))}
									</View>
									<View style={styles.trackLabels}>
										<Text style={styles.trackLabel}>{display(config.startTime)}</Text>
										<Text style={styles.trackLabel}>{display(config.endTime)}</Text>
									</View>
								</View>

								<View style={styles.group}>
									<Row
										styles={styles}
										theme={theme}
										icon="time-outline"
										label="Hours"
										value={`${display(config.startTime)} – ${display(config.endTime)}`}
										open={open === "hours"}
										onPress={() => toggleSection("hours")}
									>
										<View style={styles.timeRow}>
											{(["start", "end"] as const).map((which) => (
												<TouchableOpacity
													key={which}
													style={[
														styles.timeBox,
														editingTime === which && styles.timeBoxActive,
													]}
													onPress={() => setEditingTime(which)}
												>
													<Text style={styles.timeCaption}>
														{which === "start" ? "Start" : "End"}
													</Text>
													<Text style={styles.timeValue}>
														{display(which === "start" ? config.startTime : config.endTime)}
													</Text>
												</TouchableOpacity>
											))}
										</View>
										{editingTime && (
											<DateTimePicker
												value={toDate(
													editingTime === "start" ? config.startTime : config.endTime,
												)}
												mode="time"
												display={Platform.OS === "ios" ? "spinner" : "default"}
												onChange={handleTime}
												textColor={theme.text}
												themeVariant={theme.mode}
											/>
										)}
									</Row>

									<View style={styles.separator} />

									<Row
										styles={styles}
										theme={theme}
										icon="repeat-outline"
										label="Frequency"
										value={describeFrequency(config, times)}
										open={open === "frequency"}
										onPress={() => toggleSection("frequency")}
									>
										<View style={styles.segment}>
											{FREQUENCIES.map((opt) => {
												const active = config.intervalMinutes === opt.value;
												return (
													<TouchableOpacity
														key={opt.label}
														style={[styles.segmentItem, active && styles.segmentItemActive]}
														onPress={() => update({ intervalMinutes: opt.value })}
													>
														<Text
															style={[styles.segmentText, active && styles.segmentTextActive]}
														>
															{opt.label}
														</Text>
													</TouchableOpacity>
												);
											})}
										</View>
										{config.intervalMinutes === null && (
											<Text style={styles.caption}>
												Smart spaces one reminder per glass of your {goalMl} ml goal.
											</Text>
										)}
									</Row>

									<View style={styles.separator} />

									<Row
										styles={styles}
										theme={theme}
										icon="calendar-outline"
										label="Days"
										value={describeDays(config.days)}
										open={open === "days"}
										onPress={() => toggleSection("days")}
									>
										<View style={styles.dayRow}>
											{DAY_LETTERS.map((letter, day) => {
												const active = !config.days || config.days.includes(day);
												return (
													<TouchableOpacity
														key={day}
														style={[styles.dayCircle, active && styles.dayCircleActive]}
														onPress={() => toggleDay(day)}
													>
														<Text style={[styles.dayText, active && styles.dayTextActive]}>
															{letter}
														</Text>
													</TouchableOpacity>
												);
											})}
										</View>
									</Row>

									<View style={styles.separator} />

									<Row
										styles={styles}
										theme={theme}
										icon="musical-notes-outline"
										label="Sound"
										value={soundLabel(config.sound)}
										onPress={() => setShowSoundPicker(true)}
									/>
								</View>

								<Text style={styles.footnote}>
									Tap +250 ml or +500 ml on a reminder to log water without opening the
									app.
								</Text>
							</>
						)}

						{/* Dev builds only (__DEV__ is false in release APKs). Fires in 5s
						    so there's time to background the app and test the buttons. */}
						{__DEV__ && (
							<TouchableOpacity
								style={styles.devLink}
								onPress={async () => {
									const granted = await NotificationService.requestPermissions();
									if (!granted) {
										Alert.error("Notifications are off", "Allow notifications to test.");
										return;
									}
									await NotificationService.scheduleNextWaterReminder(
										5 / 60,
										"Test reminder - try the +250 ml, +500 ml and Snooze buttons.",
										config.sound,
									);
									Alert.success("Test scheduled", "Arrives in 5 seconds.");
								}}
							>
								<Ionicons name="flask-outline" size={14} color={theme.textMuted} />
								<Text style={styles.devLinkText}>Send test notification (dev)</Text>
							</TouchableOpacity>
						)}
					</ScrollView>
				</Pressable>
			</Pressable>

			<SoundPickerModal
				visible={showSoundPicker}
				kind="reminder"
				value={config.sound}
				onSelect={(sound) => update({ sound: sound || DEFAULT_WATER_SOUND })}
				onClose={() => setShowSoundPicker(false)}
				accent={theme.info}
			/>
		</Modal>
	);
}

function Row({
	styles,
	theme,
	icon,
	label,
	value,
	open,
	onPress,
	children,
}: {
	styles: ReturnType<typeof createStyles>;
	theme: Theme;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	label: string;
	value: string;
	open?: boolean;
	onPress: () => void;
	children?: React.ReactNode;
}) {
	return (
		<View>
			<TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
				<Ionicons name={icon} size={20} color={theme.info} />
				<Text style={styles.rowLabel}>{label}</Text>
				<Text style={styles.rowValue} numberOfLines={1}>
					{value}
				</Text>
				<Ionicons
					name={children ? (open ? "chevron-up" : "chevron-down") : "chevron-forward"}
					size={16}
					color={theme.textMuted}
				/>
			</TouchableOpacity>
			{open && children && <View style={styles.rowBody}>{children}</View>}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay },
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 28,
			borderTopRightRadius: 28,
			paddingHorizontal: 20,
			paddingBottom: 28,
			maxHeight: "88%",
		},
		handle: {
			alignSelf: "center",
			width: 40,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.border,
			marginTop: 10,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 16,
		},
		title: { fontSize: 22, fontWeight: "700", color: theme.text },
		closeButton: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: theme.surfaceLight,
			alignItems: "center",
			justifyContent: "center",
		},

		hero: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
			borderRadius: 20,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		heroOn: { backgroundColor: theme.info + "14", borderColor: theme.info + "40" },
		heroIcon: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: theme.info + "1F",
			alignItems: "center",
			justifyContent: "center",
		},
		heroIconOn: { backgroundColor: theme.info },
		heroText: { flex: 1, marginHorizontal: 14 },
		heroTitle: { fontSize: 17, fontWeight: "700", color: theme.text },
		heroSub: { fontSize: 13, color: theme.textSecondary, marginTop: 3 },

		timeline: { paddingHorizontal: 6, paddingTop: 22, paddingBottom: 6 },
		track: { height: 14, justifyContent: "center" },
		trackFill: { height: 4, borderRadius: 2, backgroundColor: theme.info + "33" },
		dot: {
			position: "absolute",
			width: 10,
			height: 10,
			borderRadius: 5,
			marginLeft: -5,
			backgroundColor: theme.info,
			borderWidth: 2,
			borderColor: theme.background,
		},
		trackLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
		trackLabel: { fontSize: 11, color: theme.textMuted },

		group: {
			marginTop: 16,
			backgroundColor: theme.surface,
			borderRadius: 18,
			overflow: "hidden",
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 15,
			gap: 12,
		},
		rowLabel: { fontSize: 15, fontWeight: "600", color: theme.text },
		rowValue: { flex: 1, textAlign: "right", fontSize: 14, color: theme.textSecondary },
		rowBody: { paddingHorizontal: 16, paddingBottom: 16 },
		separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 48 },

		timeRow: { flexDirection: "row", gap: 10 },
		timeBox: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 14,
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
			borderWidth: 1.5,
			borderColor: "transparent",
		},
		timeBoxActive: { borderColor: theme.info },
		timeCaption: { fontSize: 12, color: theme.textMuted },
		timeValue: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 2 },

		segment: {
			flexDirection: "row",
			backgroundColor: theme.surfaceLight,
			borderRadius: 12,
			padding: 3,
		},
		segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
		segmentItemActive: { backgroundColor: theme.info },
		segmentText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
		segmentTextActive: { color: "#FFFFFF" },
		caption: { fontSize: 12, color: theme.textMuted, marginTop: 10 },

		dayRow: { flexDirection: "row", justifyContent: "space-between" },
		dayCircle: {
			width: 38,
			height: 38,
			borderRadius: 19,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surfaceLight,
		},
		dayCircleActive: { backgroundColor: theme.info },
		dayText: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
		dayTextActive: { color: "#FFFFFF" },

		footnote: {
			fontSize: 12,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 14,
			paddingHorizontal: 12,
		},
		devLink: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			marginTop: 16,
			paddingVertical: 8,
		},
		devLinkText: { fontSize: 12, color: theme.textMuted },
	});
