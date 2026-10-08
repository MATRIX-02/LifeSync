// Create / Edit Habit sheet.
//
// One form for both flows, so a field added to habits only has to be wired up
// here. Pass `habit` to edit it; leave it out to create a new one. The modal
// only collects and validates values - the caller decides what to persist and
// which reminders to schedule.
import { Alert } from "@/src/components/CustomAlert";
import { PerDaySection } from "@/src/components/habits/PerDaySection";
import { Theme, useColors } from "@/src/context/themeContext";
import { FrequencyType, Habit, HabitType, TargetType } from "@/src/types";
import {
	Frequency,
	PerDay,
	Schedule,
	describeFrequency,
	expandDayTimes,
	normalizeFrequency,
} from "@/src/utils/frequency";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Modal,
	PanResponder,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { createStyles } from "./HabitFormModal.styles";

export const HABIT_COLORS = [
	"#A78BFA",
	"#F472B6",
	"#FB923C",
	"#FBBF24",
	"#34D399",
	"#2DD4BF",
	"#22D3EE",
	"#60A5FA",
	"#818CF8",
	"#E879F9",
	"#F87171",
];

export const HABIT_ICONS = [
	// Health & Fitness
	"water-outline",
	"fitness-outline",
	"barbell-outline",
	"walk-outline",
	"bicycle-outline",
	"heart-outline",
	"pulse-outline",
	"body-outline",
	"footsteps-outline",
	// Mind & Wellness
	"leaf-outline",
	"moon-outline",
	"bed-outline",
	"sunny-outline",
	"happy-outline",
	"sparkles-outline",
	"rose-outline",
	// Learning & Productivity
	"book-outline",
	"school-outline",
	"language-outline",
	"pencil-outline",
	"code-slash-outline",
	"laptop-outline",
	"bulb-outline",
	"newspaper-outline",
	"document-text-outline",
	// Food & Drink
	"nutrition-outline",
	"cafe-outline",
	"beer-outline",
	"restaurant-outline",
	"fast-food-outline",
	"pizza-outline",
	// Hobbies & Entertainment
	"musical-notes-outline",
	"game-controller-outline",
	"camera-outline",
	"film-outline",
	"brush-outline",
	"color-palette-outline",
	"headset-outline",
	"mic-outline",
	// Social & Communication
	"call-outline",
	"chatbubble-outline",
	"people-outline",
	"person-outline",
	"home-outline",
	"paw-outline",
	// Finance & Goals
	"cash-outline",
	"wallet-outline",
	"card-outline",
	"trending-up-outline",
	"trophy-outline",
	"ribbon-outline",
	"star-outline",
	"flame-outline",
	"flag-outline",
	// Misc
	"airplane-outline",
	"car-outline",
	"medkit-outline",
	"bandage-outline",
	"time-outline",
	"alarm-outline",
	"checkbox-outline",
	"list-outline",
	"cloud-outline",
	"earth-outline",
	"flower-outline",
	"gift-outline",
	"hand-left-outline",
	"checkmark-circle-outline",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_COLOR = "#A78BFA";
const DEFAULT_REMINDER_TIME = "09:00";

const TARGET_TYPES: { value: TargetType; label: string }[] = [
	{ value: "at_least", label: "At Least" },
	{ value: "at_most", label: "At Most" },
	{ value: "exactly", label: "Exactly" },
];

const FREQUENCY_OPTIONS: {
	type: FrequencyType;
	label: string;
	icon: string;
	description: string;
}[] = [
	{
		type: "daily",
		label: "Daily",
		icon: "today",
		description: "Complete once every day",
	},
	{
		type: "specific_days",
		label: "Specific days",
		icon: "calendar",
		description: "Choose which days of the week",
	},
];

const HABIT_TYPES = [
	{
		value: "yesno",
		icon: "checkmark-circle",
		label: "Yes/No",
		hint: "Did you do it?",
	},
	{
		value: "measurable",
		icon: "bar-chart",
		label: "Measurable",
		hint: "Track a value",
	},
] as const;

const toStorageTime = (date: Date) =>
	`${date.getHours().toString().padStart(2, "0")}:${date
		.getMinutes()
		.toString()
		.padStart(2, "0")}`;

const toDate = (time: string) => {
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date();
	date.setHours(hours || 0, minutes || 0, 0, 0);
	return date;
};

const formatTime = (date: Date) =>
	date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

export interface HabitFormValues {
	name: string;
	description: string;
	/** Trimmed; empty when the user left it blank. */
	question: string;
	color: string;
	icon?: string;
	type: HabitType;
	unit?: string;
	target?: number;
	targetType?: TargetType;
	frequency: Frequency;
	/** First reminder of the day - with several times a day it is only the anchor. */
	notificationTime: string;
	/** The single reminder time the user picked. */
	reminderTime: string;
	notificationEnabled: boolean;
	alarmEnabled: boolean;
	notes?: string;
}

interface HabitFormModalProps {
	visible: boolean;
	/** The habit to edit. Omit to create a new one. */
	habit?: Habit | null;
	onClose: () => void;
	onSubmit: (values: HabitFormValues) => void | Promise<void>;
}

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
	visible,
	habit,
	onClose,
	onSubmit,
}) => {
	const theme = useColors();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const isEdit = !!habit;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [question, setQuestion] = useState("");
	const [color, setColor] = useState(DEFAULT_COLOR);
	const [icon, setIcon] = useState<string | undefined>(undefined);
	const [habitType, setHabitType] = useState<HabitType>("yesno");
	const [unit, setUnit] = useState("");
	const [target, setTarget] = useState("");
	const [targetType, setTargetType] = useState<TargetType>("at_least");
	const [frequencyType, setFrequencyType] = useState<FrequencyType>("daily");
	const [selectedDays, setSelectedDays] = useState<number[]>(ALL_DAYS);
	// HOW MANY times on an active day, and when. Independent of the schedule,
	// so "3x a day on Mon/Wed/Fri" is expressible - see utils/frequency.
	const [perDay, setPerDay] = useState<PerDay>({ target: 1 });
	const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
	const [reminderEnabled, setReminderEnabled] = useState(true);
	const [alarmEnabled, setAlarmEnabled] = useState(false);
	const [notes, setNotes] = useState("");

	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [saving, setSaving] = useState(false);

	// The schedule half of the frequency. Only two kinds are offered: every day,
	// or a fixed set of weekdays. The other kinds normalizeFrequency() knows
	// about are still parsed on read, for habits created by an older build.
	const schedule = useMemo(
		(): Schedule =>
			frequencyType === "specific_days"
				? { kind: "weekdays", days: selectedDays }
				: { kind: "daily" },
		[frequencyType, selectedDays],
	);
	const frequency = useMemo(
		(): Frequency => normalizeFrequency({ schedule, perDay }),
		[schedule, perDay],
	);
	const dayTimes = useMemo(
		() => expandDayTimes(perDay, reminderTime),
		[perDay, reminderTime],
	);

	// Slide to dismiss
	const translateY = useRef(new Animated.Value(0)).current;
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10,
			onPanResponderMove: (_, gesture) => {
				if (gesture.dy > 0) translateY.setValue(gesture.dy);
			},
			onPanResponderRelease: (_, gesture) => {
				if (gesture.dy > 100) {
					Animated.timing(translateY, {
						toValue: Dimensions.get("window").height,
						duration: 200,
						useNativeDriver: true,
					}).start(() => onCloseRef.current());
				} else {
					Animated.spring(translateY, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		}),
	).current;

	// Load the form whenever the sheet opens: from the habit when editing,
	// otherwise back to defaults.
	useEffect(() => {
		if (!visible) return;
		translateY.setValue(0);
		setShowIconPicker(false);
		setShowFrequencyPicker(false);
		setShowTimePicker(false);
		setSaving(false);

		if (!habit) {
			setName("");
			setDescription("");
			setQuestion("");
			setColor(DEFAULT_COLOR);
			setIcon(undefined);
			setHabitType("yesno");
			setUnit("");
			setTarget("");
			setTargetType("at_least");
			setFrequencyType("daily");
			setSelectedDays(ALL_DAYS);
			setPerDay({ target: 1 });
			setReminderTime(toStorageTime(new Date()));
			setReminderEnabled(true);
			setAlarmEnabled(false);
			setNotes("");
			return;
		}

		setName(habit.name);
		setDescription(habit.description || "");
		setQuestion(habit.question || "");
		setColor(habit.color);
		setIcon(habit.icon || "checkmark-circle-outline");
		setHabitType(habit.type || "yesno");
		setUnit(habit.unit || "");
		setTarget(habit.target?.toString() || "");
		setTargetType(habit.targetType || "at_least");
		const freq = normalizeFrequency(habit.frequency, habit.notificationTime);
		const sch = freq.schedule;
		// Kinds that are no longer offered (times per week/month, every N days,
		// N in X days) collapse to "every day" so the picker always has a
		// selection. Saving then rewrites the habit into the supported shape.
		setFrequencyType(sch.kind === "weekdays" ? "specific_days" : "daily");
		setSelectedDays(
			sch.kind === "weekdays" && sch.days.length ? sch.days : ALL_DAYS,
		);
		setPerDay(freq.perDay);
		setReminderTime(
			habit.reminderTime || habit.notificationTime || DEFAULT_REMINDER_TIME,
		);
		setReminderEnabled(
			habit.reminderEnabled ?? habit.notificationEnabled ?? true,
		);
		setAlarmEnabled(habit.alarmEnabled ?? false);
		setNotes(habit.notes || "");
	}, [visible, habit, translateY]);

	const toggleDay = (dayIndex: number) => {
		if (selectedDays.includes(dayIndex)) {
			if (selectedDays.length > 1) {
				setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
			}
		} else {
			setSelectedDays([...selectedDays, dayIndex].sort());
		}
	};

	const handleTimeChange = (_event: any, date?: Date) => {
		if (Platform.OS === "android") setShowTimePicker(false);
		if (date) setReminderTime(toStorageTime(date));
	};

	const handleSubmit = async () => {
		if (!name.trim()) {
			Alert.alert("Missing Information", "Please enter a habit name");
			return;
		}
		if (habitType === "measurable" && (!unit.trim() || !target.trim())) {
			Alert.alert(
				"Missing Information",
				"Please enter unit and target for measurable habit",
			);
			return;
		}

		const measurable = habitType === "measurable";
		setSaving(true);
		try {
			await onSubmit({
				name: name.trim(),
				description: description.trim(),
				question: question.trim(),
				color,
				icon,
				type: habitType,
				unit: measurable ? unit.trim() : undefined,
				target: measurable ? parseFloat(target) : undefined,
				targetType: measurable ? targetType : undefined,
				frequency,
				notificationTime: perDay.target > 1 ? dayTimes[0] : reminderTime,
				reminderTime,
				notificationEnabled: reminderEnabled,
				alarmEnabled,
				notes: notes.trim() || undefined,
			});
			onClose();
		} finally {
			setSaving(false);
		}
	};

	const frequencyLabel = describeFrequency(frequency, reminderTime);
	const previewIcon = icon || "checkmark-circle-outline";

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			{/* Backdrop is a sibling of the sheet: wrapping the sheet in a
			    TouchableWithoutFeedback makes it claim the touch responder and
			    swallows scroll gestures started on the sheet's background. */}
			<View style={styles.modalOverlay}>
				<TouchableWithoutFeedback onPress={onClose}>
					<View style={StyleSheet.absoluteFill} />
				</TouchableWithoutFeedback>
				<Animated.View
					style={[styles.modalContent, { transform: [{ translateY }] }]}
				>
					<View
						{...panResponder.panHandlers}
						style={styles.dragHandleContainer}
					>
						<View style={styles.dragHandle} />
					</View>

					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>
							{isEdit ? "Edit Habit" : "New Habit"}
						</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false}>
						<Text style={styles.sectionLabel}>BASIC INFO</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Name *</Text>
							<TextInput
								style={styles.textInput}
								value={name}
								onChangeText={setName}
								placeholder="e.g., Drink 8 glasses of water"
								placeholderTextColor={theme.textMuted}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Question (optional)</Text>
							<TextInput
								style={styles.textInput}
								value={question}
								onChangeText={setQuestion}
								placeholder={`Did you complete ${name || "this habit"} today?`}
								placeholderTextColor={theme.textMuted}
							/>
							<Text style={styles.inputHint}>
								Shown in notifications and check-ins
							</Text>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Description (optional)</Text>
							<TextInput
								style={[styles.textInput, styles.textArea]}
								value={description}
								onChangeText={setDescription}
								placeholder="Add a description..."
								placeholderTextColor={theme.textMuted}
								multiline
								numberOfLines={3}
							/>
						</View>

						<Text style={styles.sectionLabel}>HABIT TYPE</Text>
						<View style={styles.inputGroup}>
							<View style={{ flexDirection: "row", gap: 12 }}>
								{HABIT_TYPES.map((option) => {
									const active = habitType === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											style={[
												styles.typeOption,
												active && {
													backgroundColor: color + "20",
													borderColor: color,
												},
											]}
											onPress={() => setHabitType(option.value)}
										>
											<Ionicons
												name={option.icon}
												size={24}
												color={active ? color : theme.textMuted}
											/>
											<Text
												style={[styles.typeOptionLabel, active && { color }]}
											>
												{option.label}
											</Text>
											<Text style={styles.typeOptionHint}>{option.hint}</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{habitType === "measurable" && (
							<>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Unit *</Text>
									<TextInput
										style={styles.textInput}
										value={unit}
										onChangeText={setUnit}
										placeholder="e.g., glasses, pages, miles"
										placeholderTextColor={theme.textMuted}
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Target *</Text>
									<TextInput
										style={styles.textInput}
										value={target}
										onChangeText={setTarget}
										placeholder="e.g., 8"
										placeholderTextColor={theme.textMuted}
										keyboardType="numeric"
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Target Type</Text>
									<View style={{ flexDirection: "row", gap: 8 }}>
										{TARGET_TYPES.map((option) => {
											const active = targetType === option.value;
											return (
												<TouchableOpacity
													key={option.value}
													style={[
														styles.targetTypeOption,
														active && {
															backgroundColor: color + "20",
															borderColor: color,
														},
													]}
													onPress={() => setTargetType(option.value)}
												>
													<Text
														style={[styles.targetTypeText, active && { color }]}
													>
														{option.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</View>
								</View>
							</>
						)}

						<Text style={styles.sectionLabel}>APPEARANCE</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Color</Text>
							<View style={styles.colorGrid}>
								{HABIT_COLORS.map((c) => (
									<TouchableOpacity
										key={c}
										style={[
											styles.colorOption,
											{ backgroundColor: c },
											color === c && styles.colorOptionSelected,
										]}
										onPress={() => setColor(c)}
									>
										{color === c && (
											<Ionicons name="checkmark" size={18} color="#fff" />
										)}
									</TouchableOpacity>
								))}
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Icon</Text>
							<TouchableOpacity
								style={styles.iconSelector}
								onPress={() => setShowIconPicker(!showIconPicker)}
							>
								<View
									style={[styles.selectedIcon, { backgroundColor: color + "20" }]}
								>
									<Ionicons name={previewIcon as any} size={24} color={color} />
								</View>
								<Text style={styles.iconSelectorText}>
									{showIconPicker ? "Hide icons" : "Change icon"}
								</Text>
								<Ionicons
									name={showIconPicker ? "chevron-up" : "chevron-down"}
									size={20}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>

							{showIconPicker && (
								<View style={styles.iconGrid}>
									{HABIT_ICONS.map((option) => (
										<TouchableOpacity
											key={option}
											style={[
												styles.iconOption,
												icon === option && { backgroundColor: color + "20" },
											]}
											onPress={() => {
												setIcon(option);
												setShowIconPicker(false);
											}}
										>
											<Ionicons
												name={option as any}
												size={24}
												color={icon === option ? color : theme.textSecondary}
											/>
										</TouchableOpacity>
									))}
								</View>
							)}
						</View>

						<Text style={styles.sectionLabel}>SCHEDULE</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Frequency</Text>
							<TouchableOpacity
								style={styles.iconSelector}
								onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
							>
								<View
									style={[styles.selectedIcon, { backgroundColor: color + "20" }]}
								>
									<Ionicons name="repeat" size={24} color={color} />
								</View>
								<Text style={styles.iconSelectorText}>{frequencyLabel}</Text>
								<Ionicons
									name={showFrequencyPicker ? "chevron-up" : "chevron-down"}
									size={20}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>

							{showFrequencyPicker && (
								<View style={styles.frequencyPickerContainer}>
									<View style={styles.frequencyOptions}>
										{FREQUENCY_OPTIONS.map((option) => {
											const active = frequencyType === option.type;
											return (
												<TouchableOpacity
													key={option.type}
													style={[
														styles.frequencyOptionEnhanced,
														active && {
															backgroundColor: color + "15",
															borderColor: color,
														},
													]}
													onPress={() => setFrequencyType(option.type)}
												>
													<View
														style={[
															styles.frequencyOptionIconBox,
															{
																backgroundColor: active
																	? color + "20"
																	: theme.border,
															},
														]}
													>
														<Ionicons
															name={option.icon as any}
															size={20}
															color={active ? color : theme.textSecondary}
														/>
													</View>
													<View style={styles.frequencyOptionContent}>
														<Text
															style={[
																styles.frequencyOptionText,
																active && { color },
															]}
														>
															{option.label}
														</Text>
														<Text style={styles.frequencyOptionDescription}>
															{option.description}
														</Text>
													</View>
													{active && (
														<Ionicons
															name="checkmark-circle"
															size={22}
															color={color}
														/>
													)}
												</TouchableOpacity>
											);
										})}
									</View>

									{frequencyType === "specific_days" && (
										<View style={styles.daysSelector}>
											<Text style={styles.daysSelectorLabel}>Select days:</Text>
											<View style={styles.daysRow}>
												{DAY_NAMES.map((day, index) => {
													const active = selectedDays.includes(index);
													return (
														<TouchableOpacity
															key={day}
															style={[
																styles.dayButton,
																active && {
																	backgroundColor: color,
																	borderColor: color,
																},
															]}
															onPress={() => toggleDay(index)}
														>
															<Text
																style={[
																	styles.dayButtonText,
																	active && { color: "#fff" },
																]}
															>
																{day}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									)}
								</View>
							)}
						</View>

						{/* HOW MANY TIMES a day - independent of the schedule above,
						    so any combination is reachable. */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Times per day</Text>
							<PerDaySection
								value={perDay}
								onChange={setPerDay}
								accent={color}
								activeDayCount={
									frequencyType === "specific_days" ? selectedDays.length : 7
								}
								fallbackTime={reminderTime}
							/>
						</View>

						<Text style={styles.sectionLabel}>REMINDERS</Text>

						<View style={styles.switchRow}>
							<View style={styles.switchInfo}>
								<View
									style={[styles.selectedIcon, { backgroundColor: color + "20" }]}
								>
									<Ionicons name="notifications" size={24} color={color} />
								</View>
								<View style={styles.switchTextContainer}>
									<Text style={styles.switchTitle}>Daily Reminder</Text>
									<Text style={styles.switchSubtitle}>
										Get notified to complete your habit
									</Text>
								</View>
							</View>
							<Switch
								value={reminderEnabled}
								onValueChange={setReminderEnabled}
								trackColor={{ false: theme.border, true: color + "60" }}
								thumbColor={reminderEnabled ? color : theme.textMuted}
							/>
						</View>

						<View style={styles.switchRow}>
							<View style={styles.switchInfo}>
								<View
									style={[styles.selectedIcon, { backgroundColor: color + "20" }]}
								>
									<Ionicons name="alarm" size={24} color={color} />
								</View>
								<View style={styles.switchTextContainer}>
									<Text style={styles.switchTitle}>Alarm</Text>
									<Text style={styles.switchSubtitle}>
										Alarm volume, ignores silent mode and DND
									</Text>
								</View>
							</View>
							<Switch
								value={alarmEnabled}
								onValueChange={setAlarmEnabled}
								trackColor={{ false: theme.border, true: color + "60" }}
								thumbColor={alarmEnabled ? color : theme.textMuted}
							/>
						</View>

						{/* With several times a day the reminders come from Times per
						    day, so a single time would be ignored. */}
						{reminderEnabled && perDay.target <= 1 && (
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Reminder Time</Text>
								<TouchableOpacity
									style={styles.iconSelector}
									onPress={() => setShowTimePicker(true)}
								>
									<View
										style={[
											styles.selectedIcon,
											{ backgroundColor: color + "20" },
										]}
									>
										<Ionicons name="time" size={24} color={color} />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.iconSelectorText}>
											{formatTime(toDate(reminderTime))}
										</Text>
										<Text style={{ fontSize: 13, color: theme.textMuted }}>
											Tap to change
										</Text>
									</View>
									<Ionicons
										name="chevron-forward"
										size={20}
										color={theme.textSecondary}
									/>
								</TouchableOpacity>

								{/* iOS shows inline, Android shows a dialog */}
								{showTimePicker && (
									<View style={styles.timePickerContainer}>
										<DateTimePicker
											value={toDate(reminderTime)}
											mode="time"
											display={Platform.OS === "ios" ? "spinner" : "default"}
											onChange={handleTimeChange}
											textColor={theme.text}
											themeVariant={theme.mode}
										/>
										{Platform.OS === "ios" && (
											<TouchableOpacity
												style={[
													styles.timePickerDone,
													{ backgroundColor: color },
												]}
												onPress={() => setShowTimePicker(false)}
											>
												<Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
													Done
												</Text>
											</TouchableOpacity>
										)}
									</View>
								)}
							</View>
						)}

						<Text style={styles.sectionLabel}>NOTES</Text>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Personal Notes (optional)</Text>
							<TextInput
								style={[styles.textInput, styles.textArea]}
								value={notes}
								onChangeText={setNotes}
								placeholder="Add personal notes, tips, or motivation..."
								placeholderTextColor={theme.textMuted}
								multiline
								numberOfLines={4}
							/>
						</View>

						<Text style={styles.sectionLabel}>PREVIEW</Text>
						<View style={styles.inputGroup}>
							<View style={styles.previewCard}>
								<View
									style={[styles.previewIcon, { backgroundColor: color + "20" }]}
								>
									<Ionicons name={previewIcon as any} size={28} color={color} />
								</View>
								<View style={styles.previewInfo}>
									<Text style={[styles.previewName, { color }]}>
										{name || "Habit Name"}
									</Text>
									<Text style={styles.previewDescription} numberOfLines={1}>
										{habitType === "measurable"
											? `${target || "?"} ${unit || "units"} • `
											: ""}
										{frequencyLabel}
										{reminderEnabled ? ` • ${reminderTime}` : " • No reminder"}
									</Text>
								</View>
							</View>
						</View>

						<View style={{ height: 20 }} />
					</ScrollView>

					<TouchableOpacity
						style={[
							styles.saveButton,
							{ backgroundColor: color },
							saving && { opacity: 0.6 },
						]}
						onPress={handleSubmit}
						disabled={saving}
					>
						<Text style={styles.saveButtonText}>
							{isEdit ? "Save Changes" : "Create Habit"}
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</Modal>
	);
};
