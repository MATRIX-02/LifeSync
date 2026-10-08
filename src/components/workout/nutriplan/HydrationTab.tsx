import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	LayoutAnimation,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const GLASS_ML = 250;
const UNDO_MS = 5000;
const GLASS_HEIGHT = 190;

export interface WaterLogEntry {
	id: string;
	amount: number;
	timestamp: Date | string;
}

export interface WaterDay {
	date: Date;
	totalMl: number;
}

interface Props {
	todayMl: number;
	goalMl: number;
	/** Today's entries, newest first. */
	logs: WaterLogEntry[];
	/** The last 7 days, oldest first, ending today. */
	week: WaterDay[];
	remindersOn: boolean;
	/** e.g. "11:30 AM" / "tomorrow 7:00 AM"; null when none is due. */
	nextReminder: string | null;
	onLog: (amount: number) => Promise<void>;
	onDeleteLog: (id: string) => Promise<void>;
	onOpenGoal: () => void;
	onOpenReminders: () => void;
	onOpenCustom: () => void;
}

const formatMl = (ml: number) => ml.toLocaleString();
const formatTime = (t: Date | string) =>
	(t instanceof Date ? t : new Date(t)).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});

export function HydrationTab({
	todayMl,
	goalMl,
	logs,
	week,
	remindersOn,
	nextReminder,
	onLog,
	onDeleteLog,
	onOpenGoal,
	onOpenReminders,
	onOpenCustom,
}: Props) {
	const theme = useColors();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const progress = goalMl > 0 ? Math.min(1, todayMl / goalMl) : 0;
	const remaining = Math.max(0, goalMl - todayMl);
	const glassesLeft = Math.ceil(remaining / GLASS_ML);
	const done = remaining === 0 && todayMl > 0;

	// Fill animates to the new level after every log.
	const fill = useRef(new Animated.Value(progress)).current;
	useEffect(() => {
		Animated.timing(fill, {
			toValue: progress,
			duration: 600,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [progress]);

	// Undo for the most recent add, shown briefly after logging.
	const [undo, setUndo] = useState<{ amount: number } | null>(null);
	const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => {
		if (undoTimer.current) clearTimeout(undoTimer.current);
	}, []);

	const add = async (amount: number) => {
		await onLog(amount);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setUndo({ amount });
		if (undoTimer.current) clearTimeout(undoTimer.current);
		undoTimer.current = setTimeout(() => {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setUndo(null);
		}, UNDO_MS);
	};

	const handleUndo = async () => {
		const latest = logs[0];
		if (undoTimer.current) clearTimeout(undoTimer.current);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setUndo(null);
		if (latest) await onDeleteLog(latest.id);
	};

	const handleClearAll = () => {
		Alert.alert("Clear today?", "This removes every water entry logged today.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Clear",
				style: "destructive",
				onPress: async () => {
					for (const log of logs) await onDeleteLog(log.id);
				},
			},
		]);
	};

	const fillHeight = fill.interpolate({
		inputRange: [0, 1],
		outputRange: [0, GLASS_HEIGHT],
	});

	return (
		<ScrollView
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.container}
		>
			{/* Reminder status: one pill, opens the reminder sheet. */}
			<TouchableOpacity style={styles.reminderPill} onPress={onOpenReminders}>
				<Ionicons
					name={remindersOn ? "notifications" : "notifications-off-outline"}
					size={14}
					color={remindersOn ? theme.info : theme.textMuted}
				/>
				<Text style={[styles.reminderText, remindersOn && { color: theme.info }]}>
					{remindersOn
						? nextReminder
							? `Next reminder ${nextReminder}`
							: "Reminders on"
						: "Set reminders"}
				</Text>
				<Ionicons name="chevron-forward" size={12} color={theme.textMuted} />
			</TouchableOpacity>

			{/* Hero: a glass that fills, beside the numbers. */}
			<View style={styles.hero}>
				<View style={styles.glass}>
					<Animated.View
						style={[
							styles.water,
							{
								height: fillHeight,
								backgroundColor: done ? theme.success : theme.info,
							},
						]}
					/>
					{[0.25, 0.5, 0.75].map((mark) => (
						<View key={mark} style={[styles.tick, { bottom: GLASS_HEIGHT * mark }]} />
					))}
					<Text style={styles.glassPercent}>{Math.round(progress * 100)}%</Text>
				</View>

				<View style={styles.heroInfo}>
					<Text style={styles.amount}>{formatMl(todayMl)}</Text>
					<TouchableOpacity style={styles.goalRow} onPress={onOpenGoal} hitSlop={8}>
						<Text style={styles.goalText}>of {formatMl(goalMl)} ml</Text>
						<Ionicons name="pencil" size={12} color={theme.textMuted} />
					</TouchableOpacity>
					<View style={[styles.statusChip, done && styles.statusChipDone]}>
						<Text style={[styles.statusText, done && { color: theme.success }]}>
							{done
								? "Goal reached 🎉"
								: `${glassesLeft} glass${glassesLeft === 1 ? "" : "es"} to go`}
						</Text>
					</View>
				</View>
			</View>

			{/* Add: three choices, nothing else. */}
			<View style={styles.addRow}>
				<AddButton
					styles={styles}
					theme={theme}
					icon="water"
					label="Glass"
					sub="250 ml"
					primary
					onPress={() => add(250)}
				/>
				<AddButton
					styles={styles}
					theme={theme}
					icon="flask"
					label="Bottle"
					sub="500 ml"
					onPress={() => add(500)}
				/>
				<AddButton
					styles={styles}
					theme={theme}
					icon="add"
					label="Custom"
					sub="Any amount"
					onPress={onOpenCustom}
				/>
			</View>

			{undo && (
				<View style={styles.undoBar}>
					<Ionicons name="checkmark-circle" size={18} color={theme.success} />
					<Text style={styles.undoText}>Added {undo.amount} ml</Text>
					<TouchableOpacity onPress={handleUndo} hitSlop={8}>
						<Text style={styles.undoAction}>Undo</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Last 7 days. */}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>This week</Text>
				<View style={styles.weekRow}>
					{week.map((day, i) => {
						const pct = goalMl > 0 ? Math.min(1, day.totalMl / goalMl) : 0;
						const isToday = i === week.length - 1;
						const hit = pct >= 1;
						return (
							<View key={day.date.toDateString()} style={styles.weekDay}>
								<View style={styles.weekBar}>
									<View
										style={[
											styles.weekFill,
											{
												height: `${Math.max(pct * 100, day.totalMl > 0 ? 6 : 0)}%`,
												backgroundColor: hit ? theme.success : theme.info,
												opacity: isToday ? 1 : 0.7,
											},
										]}
									/>
								</View>
								<Text style={[styles.weekLabel, isToday && styles.weekLabelToday]}>
									{day.date.toLocaleDateString([], { weekday: "narrow" })}
								</Text>
							</View>
						);
					})}
				</View>
			</View>

			{/* Today's entries. */}
			<View style={styles.card}>
				<View style={styles.cardHeader}>
					<Text style={styles.cardTitle}>Today</Text>
					{logs.length > 0 && (
						<TouchableOpacity onPress={handleClearAll} hitSlop={8}>
							<Text style={styles.clearText}>Clear all</Text>
						</TouchableOpacity>
					)}
				</View>
				{logs.length === 0 ? (
					<Text style={styles.empty}>Nothing yet. Your first glass goes here.</Text>
				) : (
					logs.map((log, i) => (
						<View key={log.id} style={[styles.logRow, i > 0 && styles.logRowBorder]}>
							<View style={styles.logIcon}>
								<Ionicons name="water" size={14} color={theme.info} />
							</View>
							<Text style={styles.logAmount}>{log.amount} ml</Text>
							<Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
							<TouchableOpacity onPress={() => onDeleteLog(log.id)} hitSlop={10}>
								<Ionicons name="close" size={16} color={theme.textMuted} />
							</TouchableOpacity>
						</View>
					))
				)}
			</View>
		</ScrollView>
	);
}

function AddButton({
	styles,
	theme,
	icon,
	label,
	sub,
	primary,
	onPress,
}: {
	styles: ReturnType<typeof createStyles>;
	theme: Theme;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	label: string;
	sub: string;
	primary?: boolean;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity
			style={[styles.addButton, primary && styles.addButtonPrimary]}
			onPress={onPress}
			activeOpacity={0.7}
		>
			<Ionicons name={icon} size={22} color={primary ? "#FFFFFF" : theme.info} />
			<Text style={[styles.addLabel, primary && { color: "#FFFFFF" }]}>{label}</Text>
			<Text style={[styles.addSub, primary && { color: "#FFFFFFCC" }]}>{sub}</Text>
		</TouchableOpacity>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: { paddingHorizontal: 16, paddingBottom: 32 },

		reminderPill: {
			alignSelf: "center",
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 7,
			borderRadius: 20,
			backgroundColor: theme.surface,
			marginTop: 4,
		},
		reminderText: { fontSize: 12, fontWeight: "600", color: theme.textSecondary },

		hero: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 28,
			paddingVertical: 24,
		},
		glass: {
			width: 110,
			height: GLASS_HEIGHT,
			borderRadius: 22,
			borderBottomLeftRadius: 30,
			borderBottomRightRadius: 30,
			borderWidth: 3,
			borderTopWidth: 0,
			borderColor: theme.info + "55",
			backgroundColor: theme.info + "0D",
			overflow: "hidden",
			justifyContent: "flex-end",
		},
		water: { position: "absolute", left: 0, right: 0, bottom: 0, opacity: 0.85 },
		tick: {
			position: "absolute",
			left: 0,
			width: 14,
			height: 2,
			backgroundColor: theme.info + "40",
		},
		glassPercent: {
			position: "absolute",
			alignSelf: "center",
			top: GLASS_HEIGHT / 2 - 12,
			fontSize: 18,
			fontWeight: "800",
			color: theme.text,
		},
		heroInfo: { alignItems: "flex-start" },
		amount: { fontSize: 44, fontWeight: "800", color: theme.text, letterSpacing: -1 },
		goalRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -2 },
		goalText: { fontSize: 15, color: theme.textSecondary },
		statusChip: {
			marginTop: 14,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 12,
			backgroundColor: theme.info + "1A",
		},
		statusChipDone: { backgroundColor: theme.success + "1F" },
		statusText: { fontSize: 12, fontWeight: "700", color: theme.info },

		addRow: { flexDirection: "row", gap: 10 },
		addButton: {
			flex: 1,
			alignItems: "center",
			paddingVertical: 14,
			borderRadius: 18,
			backgroundColor: theme.surface,
		},
		addButtonPrimary: { backgroundColor: theme.info },
		addLabel: { fontSize: 14, fontWeight: "700", color: theme.text, marginTop: 6 },
		addSub: { fontSize: 11, color: theme.textMuted, marginTop: 1 },

		undoBar: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginTop: 10,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 14,
			backgroundColor: theme.surface,
		},
		undoText: { flex: 1, fontSize: 13, color: theme.text },
		undoAction: { fontSize: 13, fontWeight: "700", color: theme.info },

		card: {
			marginTop: 16,
			padding: 16,
			borderRadius: 18,
			backgroundColor: theme.surface,
		},
		cardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		cardTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
		clearText: { fontSize: 13, fontWeight: "600", color: theme.error },

		weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
		weekDay: { alignItems: "center", flex: 1 },
		weekBar: {
			width: 14,
			height: 64,
			borderRadius: 7,
			backgroundColor: theme.surfaceLight,
			justifyContent: "flex-end",
			overflow: "hidden",
		},
		weekFill: { width: "100%", borderRadius: 7 },
		weekLabel: { fontSize: 11, color: theme.textMuted, marginTop: 6 },
		weekLabelToday: { color: theme.info, fontWeight: "800" },

		empty: { fontSize: 13, color: theme.textMuted, marginTop: 12 },
		logRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12 },
		logRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
		logIcon: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.info + "1A",
			alignItems: "center",
			justifyContent: "center",
		},
		logAmount: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.text },
		logTime: { fontSize: 13, color: theme.textSecondary },
	});
