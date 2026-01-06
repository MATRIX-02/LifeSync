import { useHabitStore } from "@/src/context/habitStoreDB";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { FrequencyType, HabitType, TargetType } from "@/src/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Dimensions,
	Modal,
	PanResponder,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const { width } = Dimensions.get("window");

// Available colors for habit
const HABIT_COLORS = [
	"#A78BFA",
	"#F472B6",
	"#FB923C",
	"#FBBF24",
	"#34D399",
	"#22D3EE",
	"#60A5FA",
	"#818CF8",
	"#E879F9",
	"#F87171",
];

// Available icons for habits - Extended list matching Create Habit
const HABIT_ICONS = [
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

// Progress Ring Component
const ProgressRing = ({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
}: {
	progress: number;
	size: number;
	strokeWidth: number;
	color: string;
	backgroundColor: string;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const strokeDashoffset = circumference - (progress / 100) * circumference;

	return (
		<Svg width={size} height={size}>
			<Circle
				stroke={backgroundColor}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
			/>
			<Circle
				stroke={color}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				strokeDasharray={`${circumference} ${circumference}`}
				strokeDashoffset={strokeDashoffset}
				strokeLinecap="round"
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</Svg>
	);
};

export default function StatisticsScreen() {
	const router = useRouter();
	const { habitId } = useLocalSearchParams<{ habitId?: string }>();
	const { isDark } = useTheme();
	const theme = useColors();
	const {
		getActiveHabits,
		stats,
		calculateStats,
		logs,
		deleteHabit,
		updateHabit,
	} = useHabitStore();
	const [selectedPeriod, setSelectedPeriod] = useState<
		"Week" | "Month" | "Year"
	>("Week");
	const [historyPeriod, setHistoryPeriod] = useState<"Week" | "Month" | "Year">(
		"Week"
	);
	const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
	const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

	// Edit modal state
	const [showEditModal, setShowEditModal] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editColor, setEditColor] = useState("");
	const [editIcon, setEditIcon] = useState("");
	const [showIconPicker, setShowIconPicker] = useState(false);

	// Additional edit fields
	const [editQuestion, setEditQuestion] = useState("");
	const [editFrequencyType, setEditFrequencyType] =
		useState<FrequencyType>("daily");
	const [editFrequencyValue, setEditFrequencyValue] = useState(1);
	const [editFrequencySecondValue, setEditFrequencySecondValue] = useState(14);
	const [editSelectedDays, setEditSelectedDays] = useState<number[]>([
		0, 1, 2, 3, 4, 5, 6,
	]);
	const [editReminderTime, setEditReminderTime] = useState("09:00");
	const [editSelectedTime, setEditSelectedTime] = useState(new Date());
	const [editReminderEnabled, setEditReminderEnabled] = useState(true);
	const [editAlarmEnabled, setEditAlarmEnabled] = useState(false);
	const [editNotes, setEditNotes] = useState("");
	const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);

	// Habit type fields
	const [editHabitType, setEditHabitType] = useState<HabitType>("yesno");
	const [editUnit, setEditUnit] = useState("");
	const [editTarget, setEditTarget] = useState("");
	const [editTargetType, setEditTargetType] = useState<TargetType>("at_least");

	// Animation for edit modal slide-to-dismiss
	const editModalTranslateY = useRef(new Animated.Value(0)).current;
	const SCREEN_HEIGHT = Dimensions.get("window").height;

	const editModalPanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return gestureState.dy > 10;
			},
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy > 0) {
					editModalTranslateY.setValue(gestureState.dy);
				}
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > 100) {
					Animated.timing(editModalTranslateY, {
						toValue: SCREEN_HEIGHT,
						duration: 200,
						useNativeDriver: true,
					}).start(() => {
						setShowEditModal(false);
						editModalTranslateY.setValue(0);
					});
				} else {
					Animated.spring(editModalTranslateY, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		})
	).current;

	const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	const toggleEditDay = (dayIndex: number) => {
		if (editSelectedDays.includes(dayIndex)) {
			if (editSelectedDays.length > 1) {
				setEditSelectedDays(editSelectedDays.filter((d) => d !== dayIndex));
			}
		} else {
			setEditSelectedDays([...editSelectedDays, dayIndex].sort());
		}
	};

	const habits = getActiveHabits();
	const styles = createStyles(theme);

	// Get selected habit from route params
	const selectedHabit = habitId ? habits.find((h) => h.id === habitId) : null;

	// Calculate stats when habit changes
	useEffect(() => {
		if (selectedHabit) {
			calculateStats(selectedHabit.id);
		}
	}, [selectedHabit?.id]);

	// Initialize edit form when modal opens
	useEffect(() => {
		if (showEditModal && selectedHabit) {
			setEditName(selectedHabit.name);
			setEditDescription(selectedHabit.description || "");
			setEditColor(selectedHabit.color);
			setEditIcon(selectedHabit.icon || "checkmark-circle-outline");
			setEditQuestion(selectedHabit.question || "");
			setEditFrequencyType(selectedHabit.frequency?.type || "daily");
			setEditFrequencyValue(selectedHabit.frequency?.value || 1);
			setEditFrequencySecondValue(selectedHabit.frequency?.secondValue || 14);
			setEditSelectedDays(
				selectedHabit.frequency?.days || [0, 1, 2, 3, 4, 5, 6]
			);
			const reminderTimeStr =
				selectedHabit.reminderTime || selectedHabit.notificationTime || "09:00";
			setEditReminderTime(reminderTimeStr);
			// Parse time string to Date object for DateTimePicker
			const [hours, minutes] = reminderTimeStr.split(":").map(Number);
			const timeDate = new Date();
			timeDate.setHours(hours, minutes, 0, 0);
			setEditSelectedTime(timeDate);
			setEditReminderEnabled(
				selectedHabit.reminderEnabled ??
					selectedHabit.notificationEnabled ??
					true
			);
			setEditAlarmEnabled(selectedHabit.alarmEnabled ?? false);
			setEditNotes(selectedHabit.notes || "");
			// Habit type fields
			setEditHabitType(selectedHabit.type || "yesno");
			setEditUnit(selectedHabit.unit || "");
			setEditTarget(selectedHabit.target?.toString() || "");
			setEditTargetType(selectedHabit.targetType || "at_least");
			// Reset pickers
			setShowIconPicker(false);
			setShowFrequencyPicker(false);
			setShowTimePicker(false);
			editModalTranslateY.setValue(0);
		}
	}, [showEditModal, selectedHabit]);

	const habitStats = selectedHabit ? stats.get(selectedHabit.id) : null;

	// Get habit logs for the selected habit
	const habitLogs = useMemo(() => {
		if (!selectedHabit) return [];
		return logs.filter((log) => log.habitId === selectedHabit.id);
	}, [selectedHabit?.id, logs]);

	// Calculate score percentage based on period
	const getScoreForPeriod = () => {
		if (!habitStats) return 0;
		switch (selectedPeriod) {
			case "Week":
				const weekData = habitStats.last7Days || [];
				if (weekData.length === 0) return 0;
				return Math.round(
					(weekData.filter((d) => d.completed).length / weekData.length) * 100
				);
			case "Month":
				const monthData = habitStats.last30Days || [];
				if (monthData.length === 0) return 0;
				return Math.round(
					(monthData.filter((d) => d.completed).length / monthData.length) * 100
				);
			case "Year":
				if (habitStats.totalCompleted === 0) return 0;
				return Math.round((habitStats.totalCompleted / 365) * 100);
			default:
				return 0;
		}
	};

	// Calculate month change percentage
	const getMonthChange = () => {
		if (!habitStats) return "0%";
		return habitStats.monthlyCompletions > 0
			? `+${Math.min(habitStats.monthlyCompletions, 99)}%`
			: "0%";
	};

	// Calculate year change percentage
	const getYearChange = () => {
		if (!habitStats) return "0%";
		return habitStats.totalCompleted > 0
			? `+${Math.min(habitStats.totalCompleted, 99)}%`
			: "0%";
	};

	// Get chart data points for score chart
	const getScoreChartData = () => {
		if (!habitStats) return [];
		const data =
			selectedPeriod === "Week"
				? habitStats.last7Days || []
				: habitStats.last30Days || [];

		return data.map((day, index) => ({
			date: new Date(day.date),
			value: day.completed ? 20 : 10,
			completed: day.completed,
		}));
	};

	// Get history chart data
	const getHistoryChartData = () => {
		if (!habitStats) return [];
		const data =
			historyPeriod === "Week"
				? habitStats.last7Days || []
				: habitStats.last30Days || [];

		const weeklyData: { week: string; count: number }[] = [];
		let currentWeek = 0;
		let weekCount = 0;

		data.forEach((day, index) => {
			if (day.completed) weekCount++;
			if ((index + 1) % 7 === 0 || index === data.length - 1) {
				weeklyData.push({ week: `W${currentWeek + 1}`, count: weekCount });
				weekCount = 0;
				currentWeek++;
			}
		});

		return weeklyData;
	};

	// Generate calendar data for 4 months
	const getCalendarData = () => {
		const months: {
			name: string;
			year: number;
			days: { date: Date; completed: boolean; isCurrentMonth: boolean }[][];
		}[] = [];
		const today = new Date();

		for (let m = 3; m >= 0; m--) {
			const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
			const monthName = monthDate.toLocaleDateString("en-US", {
				month: "short",
			});
			const year = monthDate.getFullYear();

			const weeks: {
				date: Date;
				completed: boolean;
				isCurrentMonth: boolean;
			}[][] = [];
			const firstDay = new Date(
				monthDate.getFullYear(),
				monthDate.getMonth(),
				1
			);
			const lastDay = new Date(
				monthDate.getFullYear(),
				monthDate.getMonth() + 1,
				0
			);

			const startDate = new Date(firstDay);
			startDate.setDate(startDate.getDate() - startDate.getDay());

			let currentWeek: {
				date: Date;
				completed: boolean;
				isCurrentMonth: boolean;
			}[] = [];
			let currentDate = new Date(startDate);

			while (currentDate <= lastDay || currentWeek.length > 0) {
				const isCurrentMonth = currentDate.getMonth() === monthDate.getMonth();
				const isCompleted = selectedHabit
					? habitLogs.some((log) => {
							const logDate = new Date(log.completedAt);
							return logDate.toDateString() === currentDate.toDateString();
					  })
					: false;

				currentWeek.push({
					date: new Date(currentDate),
					completed: isCompleted && isCurrentMonth,
					isCurrentMonth,
				});

				if (currentWeek.length === 7) {
					weeks.push(currentWeek);
					currentWeek = [];
					if (currentDate > lastDay) break;
				}

				currentDate.setDate(currentDate.getDate() + 1);
			}

			months.push({ name: monthName, year, days: weeks });
		}

		return months;
	};

	// Get best streaks
	const getBestStreaks = () => {
		if (!habitLogs.length) return [];

		const sortedLogs = [...habitLogs].sort(
			(a, b) =>
				new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
		);

		const streaks: { startDate: Date; endDate: Date; count: number }[] = [];
		let currentStreak = {
			startDate: new Date(),
			endDate: new Date(),
			count: 0,
		};
		let lastDate: Date | null = null;

		sortedLogs.forEach((log) => {
			const logDate = new Date(log.completedAt);
			logDate.setHours(0, 0, 0, 0);

			if (!lastDate) {
				currentStreak = { startDate: logDate, endDate: logDate, count: 1 };
			} else {
				const dayDiff = Math.round(
					(lastDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (dayDiff === 1) {
					currentStreak.startDate = logDate;
					currentStreak.count++;
				} else {
					if (currentStreak.count > 0) {
						streaks.push({ ...currentStreak });
					}
					currentStreak = { startDate: logDate, endDate: logDate, count: 1 };
				}
			}
			lastDate = logDate;
		});

		if (currentStreak.count > 0) {
			streaks.push(currentStreak);
		}

		return streaks.sort((a, b) => b.count - a.count).slice(0, 5);
	};

	// Get frequency data
	const getFrequencyData = () => {
		const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		const today = new Date();
		const monthNames: string[] = [];

		for (let i = 11; i >= 0; i--) {
			const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
			monthNames.push(d.toLocaleDateString("en-US", { month: "short" }));
		}

		const frequencyGrid: {
			month: string;
			dayOfWeek: number;
			completed: boolean;
		}[] = [];

		habitLogs.forEach((log) => {
			const date = new Date(log.completedAt);
			const month = date.toLocaleDateString("en-US", { month: "short" });
			const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
			frequencyGrid.push({ month, dayOfWeek, completed: true });
		});

		return { dayNames, monthNames, frequencyGrid };
	};

	// Handle delete
	const handleDeleteHabit = () => {
		if (!selectedHabit) return;

		Alert.alert(
			"Delete Habit",
			`Are you sure you want to delete "${selectedHabit.name}"? This action cannot be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteHabit(selectedHabit.id);
						router.back();
					},
				},
			]
		);
	};

	const handleEditHabit = () => {
		setShowEditModal(true);
	};

	// Time formatting functions
	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	};

	const formatTimeForStorage = (date: Date) => {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	const handleEditTimeChange = (event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowTimePicker(false);
		}
		if (date) {
			setEditSelectedTime(date);
			setEditReminderTime(formatTimeForStorage(date));
		}
	};

	const handleSaveEdit = async () => {
		if (!selectedHabit || !editName.trim()) {
			Alert.alert("Error", "Habit name is required");
			return;
		}

		// Validate measurable habit fields
		if (
			editHabitType === "measurable" &&
			(!editUnit.trim() || !editTarget.trim())
		) {
			Alert.alert(
				"Missing Information",
				"Please enter unit and target for measurable habit"
			);
			return;
		}

		await updateHabit(selectedHabit.id, {
			name: editName.trim(),
			description: editDescription.trim(),
			color: editColor,
			icon: editIcon,
			type: editHabitType,
			question: editQuestion.trim() || undefined,
			// Measurable habit fields
			unit: editHabitType === "measurable" ? editUnit.trim() : undefined,
			target:
				editHabitType === "measurable" ? parseFloat(editTarget) : undefined,
			targetType: editHabitType === "measurable" ? editTargetType : undefined,
			frequency: {
				type: editFrequencyType,
				value: editFrequencyValue,
				secondValue:
					editFrequencyType === "times_in_x_days"
						? editFrequencySecondValue
						: undefined,
				days:
					editFrequencyType === "specific_days" ? editSelectedDays : undefined,
			},
			reminderTime: editReminderTime,
			notificationTime: editReminderTime,
			reminderEnabled: editReminderEnabled,
			notificationEnabled: editReminderEnabled,
			alarmEnabled: editAlarmEnabled,
			notes: editNotes.trim() || undefined,
		});

		setShowEditModal(false);
		Alert.alert("Success", "Habit updated successfully!");
	};

	const scorePercentage = getScoreForPeriod();
	const calendarData = getCalendarData();
	const bestStreaks = getBestStreaks();
	const frequencyData = getFrequencyData();
	const scoreChartData = getScoreChartData();

	if (!selectedHabit) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="arrow-back" size={24} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Statistics</Text>
					<View style={styles.placeholder} />
				</View>
				<View style={styles.emptyState}>
					<Ionicons
						name="bar-chart-outline"
						size={60}
						color={theme.textMuted}
					/>
					<Text style={styles.emptyTitle}>No habit selected</Text>
					<Text style={styles.emptySubtitle}>
						Select a habit from the home screen
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>{selectedHabit.name}</Text>
				<View style={styles.headerRight}>
					<TouchableOpacity style={styles.iconButton} onPress={handleEditHabit}>
						<Ionicons name="pencil" size={20} color={theme.text} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.iconButton}
						onPress={handleDeleteHabit}
					>
						<Ionicons name="trash" size={20} color={theme.text} />
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Habit Info */}
				<View style={styles.habitInfo}>
					<Text style={[styles.habitQuestion, { color: selectedHabit.color }]}>
						{selectedHabit.question ||
							`Did you complete ${selectedHabit.name} today?`}
					</Text>
					<View style={styles.habitMeta}>
						<View style={styles.metaItem}>
							<Ionicons
								name="calendar-outline"
								size={14}
								color={theme.textMuted}
							/>
							<Text style={styles.metaText}>
								{selectedHabit.frequency?.type === "daily"
									? "Every day"
									: selectedHabit.frequency?.type === "times_per_week"
									? `${selectedHabit.frequency.value}x per week`
									: "Custom"}
							</Text>
						</View>
						<View style={styles.metaItem}>
							<Ionicons
								name="notifications-outline"
								size={14}
								color={theme.textMuted}
							/>
							<Text style={styles.metaText}>
								{selectedHabit.notificationTime || "9:00 AM"}
							</Text>
						</View>
					</View>
				</View>

				{/* Overview Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Overview</Text>
					<View style={styles.overviewCard}>
						<View style={styles.progressRingContainer}>
							<ProgressRing
								progress={scorePercentage}
								size={70}
								strokeWidth={6}
								color={selectedHabit.color}
								backgroundColor={theme.surfaceLight}
							/>
							<View style={styles.progressTextContainer}>
								<Text
									style={[
										styles.progressPercent,
										{ color: selectedHabit.color },
									]}
								>
									{scorePercentage}%
								</Text>
							</View>
						</View>

						<View style={styles.overviewStats}>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{scorePercentage}%
								</Text>
								<Text style={styles.overviewLabel}>Score</Text>
							</View>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{getMonthChange()}
								</Text>
								<Text style={styles.overviewLabel}>Month</Text>
							</View>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{getYearChange()}
								</Text>
								<Text style={styles.overviewLabel}>Year</Text>
							</View>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{habitStats?.totalCompleted || 0}
								</Text>
								<Text style={styles.overviewLabel}>Total</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Score Chart Section */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitleInline}>Score</Text>
						<TouchableOpacity
							style={styles.periodDropdown}
							onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
						>
							<Text style={styles.periodText}>{selectedPeriod}</Text>
							<Ionicons name="chevron-down" size={16} color={theme.textMuted} />
						</TouchableOpacity>
					</View>

					{showPeriodDropdown && (
						<View style={styles.dropdownMenu}>
							{(["Week", "Month", "Year"] as const).map((period) => (
								<TouchableOpacity
									key={period}
									style={styles.dropdownItem}
									onPress={() => {
										setSelectedPeriod(period);
										setShowPeriodDropdown(false);
									}}
								>
									<Text
										style={[
											styles.dropdownItemText,
											selectedPeriod === period && {
												color: selectedHabit.color,
											},
										]}
									>
										{period}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					<View style={styles.chartContainer}>
						<View style={styles.yAxisLabels}>
							{["100%", "80%", "60%", "40%", "20%"].map((label) => (
								<Text key={label} style={styles.yAxisLabel}>
									{label}
								</Text>
							))}
						</View>

						<View style={styles.chartArea}>
							{[0, 1, 2, 3, 4].map((i) => (
								<View
									key={i}
									style={[styles.gridLine, { top: `${i * 25}%` }]}
								/>
							))}

							<View style={styles.dataLine}>
								{scoreChartData.map((point, index) => (
									<View
										key={index}
										style={[
											styles.dataPoint,
											{
												backgroundColor: point.completed
													? selectedHabit.color
													: theme.textMuted,
												bottom: `${point.completed ? 20 : 10}%`,
											},
										]}
									/>
								))}
							</View>
						</View>
					</View>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.xAxisContainer}
					>
						<View style={styles.xAxisLabels}>
							{scoreChartData.map((point, index) => (
								<Text key={index} style={styles.xAxisLabel}>
									{point.date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									})}
								</Text>
							))}
						</View>
					</ScrollView>
				</View>

				{/* History Section */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitleInline}>History</Text>
						<TouchableOpacity
							style={styles.periodDropdown}
							onPress={() => setShowHistoryDropdown(!showHistoryDropdown)}
						>
							<Text style={styles.periodText}>{historyPeriod}</Text>
							<Ionicons name="chevron-down" size={16} color={theme.textMuted} />
						</TouchableOpacity>
					</View>

					{showHistoryDropdown && (
						<View style={styles.dropdownMenu}>
							{(["Week", "Month", "Year"] as const).map((period) => (
								<TouchableOpacity
									key={period}
									style={styles.dropdownItem}
									onPress={() => {
										setHistoryPeriod(period);
										setShowHistoryDropdown(false);
									}}
								>
									<Text
										style={[
											styles.dropdownItemText,
											historyPeriod === period && {
												color: selectedHabit.color,
											},
										]}
									>
										{period}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					<View style={styles.historyChart}>
						<View style={styles.barChartContainer}>
							{getHistoryChartData().map((item, index) => (
								<View key={index} style={styles.barWrapper}>
									<View
										style={[
											styles.bar,
											{
												height: `${Math.min(item.count * 15, 100)}%`,
												backgroundColor: selectedHabit.color,
											},
										]}
									/>
								</View>
							))}
						</View>
					</View>
				</View>

				{/* Calendar Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Calendar</Text>
					<View style={styles.calendarContainer}>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View style={styles.calendarGrid}>
								<View style={styles.calendarRow}>
									<View style={styles.dayLabelPlaceholder} />
									{calendarData.map((month, idx) => (
										<View key={idx} style={styles.monthHeader}>
											<Text style={styles.monthHeaderText}>{month.name}</Text>
										</View>
									))}
								</View>

								{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
									(day, dayIdx) => (
										<View key={day} style={styles.calendarRow}>
											<Text style={styles.dayLabel}>{day}</Text>
											{calendarData.map((month, monthIdx) => (
												<View key={monthIdx} style={styles.monthDays}>
													{month.days.map((week, weekIdx) => (
														<View
															key={weekIdx}
															style={[
																styles.calendarDay,
																week[dayIdx]?.completed && {
																	backgroundColor: selectedHabit.color,
																},
																!week[dayIdx]?.isCurrentMonth &&
																	styles.otherMonthDay,
															]}
														>
															<Text
																style={[
																	styles.calendarDayText,
																	week[dayIdx]?.completed &&
																		styles.calendarDayTextCompleted,
																]}
															>
																{week[dayIdx]?.date.getDate()}
															</Text>
														</View>
													))}
												</View>
											))}
										</View>
									)
								)}
							</View>
						</ScrollView>
					</View>

					<TouchableOpacity style={styles.editButton} onPress={handleEditHabit}>
						<Text
							style={[styles.editButtonText, { color: selectedHabit.color }]}
						>
							EDIT
						</Text>
					</TouchableOpacity>
				</View>

				{/* Best Streaks Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Best streaks</Text>
					<View style={styles.streaksContainer}>
						{bestStreaks.length > 0 ? (
							bestStreaks.map((streak, index) => (
								<View key={index} style={styles.streakRow}>
									<Text style={styles.streakDate}>
										{streak.startDate.toLocaleDateString("en-US", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</Text>
									<View style={styles.streakBar}>
										<View
											style={[
												styles.streakFill,
												{
													width: `${Math.min(streak.count * 10, 100)}%`,
													backgroundColor: selectedHabit.color,
												},
											]}
										/>
										<Text style={styles.streakCount}>{streak.count}</Text>
									</View>
									<Text style={styles.streakEndDate}>
										{streak.endDate.toLocaleDateString("en-US", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</Text>
								</View>
							))
						) : (
							<Text style={styles.noDataText}>No streaks yet. Keep going!</Text>
						)}
					</View>
				</View>

				{/* Frequency Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Frequency</Text>
					<View style={styles.frequencyContainer}>
						<View style={styles.frequencyGrid}>
							{frequencyData.dayNames.map((day, dayIdx) => (
								<View key={day} style={styles.frequencyRow}>
									{frequencyData.monthNames.map((month, monthIdx) => {
										const hasCompletion = frequencyData.frequencyGrid.some(
											(g) => g.month === month && g.dayOfWeek === dayIdx
										);
										return (
											<View
												key={`${day}-${month}`}
												style={[
													styles.frequencyDot,
													hasCompletion && {
														backgroundColor: selectedHabit.color,
													},
												]}
											/>
										);
									})}
									<Text style={styles.frequencyDayLabel}>{day}</Text>
								</View>
							))}
						</View>
						<View style={styles.frequencyMonths}>
							{frequencyData.monthNames.map((month, idx) => (
								<Text key={idx} style={styles.frequencyMonthLabel}>
									{month}
								</Text>
							))}
						</View>
					</View>
				</View>

				{/* Delete Button */}
				<TouchableOpacity
					style={styles.deleteButton}
					onPress={handleDeleteHabit}
				>
					<Ionicons name="trash-outline" size={20} color={theme.error} />
					<Text style={[styles.deleteButtonText, { color: theme.error }]}>
						Delete Habit
					</Text>
				</TouchableOpacity>

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* Edit Habit Modal */}
			<Modal
				visible={showEditModal}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowEditModal(false)}
			>
				<TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<Animated.View
								style={[
									styles.modalContent,
									{ transform: [{ translateY: editModalTranslateY }] },
								]}
							>
								{/* Drag Handle */}
								<View
									{...editModalPanResponder.panHandlers}
									style={styles.dragHandleContainer}
								>
									<View style={styles.dragHandle} />
								</View>

								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Edit Habit</Text>
									<TouchableOpacity onPress={() => setShowEditModal(false)}>
										<Ionicons name="close" size={24} color={theme.text} />
									</TouchableOpacity>
								</View>

								<ScrollView showsVerticalScrollIndicator={false}>
									{/* Basic Info Section */}
									<Text style={styles.sectionLabel}>BASIC INFO</Text>

									{/* Habit Name */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Name</Text>
										<TextInput
											style={styles.textInput}
											value={editName}
											onChangeText={setEditName}
											placeholder="Habit name"
											placeholderTextColor={theme.textMuted}
										/>
									</View>

									{/* Question */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Question (optional)</Text>
										<TextInput
											style={styles.textInput}
											value={editQuestion}
											onChangeText={setEditQuestion}
											placeholder={`Did you complete ${
												editName || "this habit"
											} today?`}
											placeholderTextColor={theme.textMuted}
										/>
										<Text style={styles.inputHint}>
											Shown in notifications and check-ins
										</Text>
									</View>

									{/* Description */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>
											Description (optional)
										</Text>
										<TextInput
											style={[styles.textInput, styles.textArea]}
											value={editDescription}
											onChangeText={setEditDescription}
											placeholder="Add a description..."
											placeholderTextColor={theme.textMuted}
											multiline
											numberOfLines={3}
										/>
									</View>

									{/* Habit Type Section */}
									<Text style={styles.sectionLabel}>HABIT TYPE</Text>
									<View style={styles.inputGroup}>
										<View style={{ flexDirection: "row", gap: 12 }}>
											<TouchableOpacity
												style={{
													flex: 1,
													padding: 16,
													borderRadius: 14,
													backgroundColor:
														editHabitType === "yesno"
															? editColor + "20"
															: theme.surfaceLight,
													borderWidth: 2,
													borderColor:
														editHabitType === "yesno"
															? editColor
															: theme.border,
													alignItems: "center",
												}}
												onPress={() => setEditHabitType("yesno")}
											>
												<Ionicons
													name="checkmark-circle"
													size={24}
													color={
														editHabitType === "yesno"
															? editColor
															: theme.textMuted
													}
												/>
												<Text
													style={{
														marginTop: 8,
														fontWeight: "600",
														color:
															editHabitType === "yesno"
																? editColor
																: theme.text,
													}}
												>
													Yes/No
												</Text>
												<Text
													style={{
														fontSize: 11,
														color: theme.textMuted,
														marginTop: 2,
													}}
												>
													Did you do it?
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={{
													flex: 1,
													padding: 16,
													borderRadius: 14,
													backgroundColor:
														editHabitType === "measurable"
															? editColor + "20"
															: theme.surfaceLight,
													borderWidth: 2,
													borderColor:
														editHabitType === "measurable"
															? editColor
															: theme.border,
													alignItems: "center",
												}}
												onPress={() => setEditHabitType("measurable")}
											>
												<Ionicons
													name="bar-chart"
													size={24}
													color={
														editHabitType === "measurable"
															? editColor
															: theme.textMuted
													}
												/>
												<Text
													style={{
														marginTop: 8,
														fontWeight: "600",
														color:
															editHabitType === "measurable"
																? editColor
																: theme.text,
													}}
												>
													Measurable
												</Text>
												<Text
													style={{
														fontSize: 11,
														color: theme.textMuted,
														marginTop: 2,
													}}
												>
													Track a value
												</Text>
											</TouchableOpacity>
										</View>
									</View>

									{/* Measurable Habit Fields */}
									{editHabitType === "measurable" && (
										<>
											<View style={styles.inputGroup}>
												<Text style={styles.inputLabel}>Unit *</Text>
												<TextInput
													style={styles.textInput}
													value={editUnit}
													onChangeText={setEditUnit}
													placeholder="e.g., glasses, pages, miles"
													placeholderTextColor={theme.textMuted}
												/>
											</View>

											<View style={styles.inputGroup}>
												<Text style={styles.inputLabel}>Target *</Text>
												<TextInput
													style={styles.textInput}
													value={editTarget}
													onChangeText={setEditTarget}
													placeholder="e.g., 8"
													placeholderTextColor={theme.textMuted}
													keyboardType="numeric"
												/>
											</View>

											<View style={styles.inputGroup}>
												<Text style={styles.inputLabel}>Target Type</Text>
												<View style={{ flexDirection: "row", gap: 8 }}>
													{[
														{
															value: "at_least" as TargetType,
															label: "At Least",
														},
														{
															value: "at_most" as TargetType,
															label: "At Most",
														},
														{
															value: "exactly" as TargetType,
															label: "Exactly",
														},
													].map((option) => (
														<TouchableOpacity
															key={option.value}
															style={{
																flex: 1,
																paddingVertical: 12,
																borderRadius: 10,
																backgroundColor:
																	editTargetType === option.value
																		? editColor + "20"
																		: theme.surfaceLight,
																borderWidth: 1,
																borderColor:
																	editTargetType === option.value
																		? editColor
																		: theme.border,
																alignItems: "center",
															}}
															onPress={() => setEditTargetType(option.value)}
														>
															<Text
																style={{
																	fontSize: 13,
																	fontWeight: "500",
																	color:
																		editTargetType === option.value
																			? editColor
																			: theme.textSecondary,
																}}
															>
																{option.label}
															</Text>
														</TouchableOpacity>
													))}
												</View>
											</View>
										</>
									)}

									{/* Appearance Section */}
									<Text style={styles.sectionLabel}>APPEARANCE</Text>

									{/* Color Selection */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Color</Text>
										<View style={styles.colorGrid}>
											{HABIT_COLORS.map((color) => (
												<TouchableOpacity
													key={color}
													style={[
														styles.colorOption,
														{ backgroundColor: color },
														editColor === color && styles.colorOptionSelected,
													]}
													onPress={() => setEditColor(color)}
												>
													{editColor === color && (
														<Ionicons name="checkmark" size={18} color="#fff" />
													)}
												</TouchableOpacity>
											))}
										</View>
									</View>

									{/* Icon Selection */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Icon</Text>
										<TouchableOpacity
											style={styles.iconSelector}
											onPress={() => setShowIconPicker(!showIconPicker)}
										>
											<View
												style={[
													styles.selectedIcon,
													{ backgroundColor: editColor + "20" },
												]}
											>
												<Ionicons
													name={editIcon as any}
													size={24}
													color={editColor}
												/>
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
												{HABIT_ICONS.map((icon) => (
													<TouchableOpacity
														key={icon}
														style={[
															styles.iconOption,
															editIcon === icon && {
																backgroundColor: editColor + "20",
															},
														]}
														onPress={() => {
															setEditIcon(icon);
															setShowIconPicker(false);
														}}
													>
														<Ionicons
															name={icon as any}
															size={24}
															color={
																editIcon === icon
																	? editColor
																	: theme.textSecondary
															}
														/>
													</TouchableOpacity>
												))}
											</View>
										)}
									</View>

									{/* Schedule Section */}
									<Text style={styles.sectionLabel}>SCHEDULE</Text>

									{/* Frequency */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Frequency</Text>
										<TouchableOpacity
											style={styles.iconSelector}
											onPress={() =>
												setShowFrequencyPicker(!showFrequencyPicker)
											}
										>
											<View
												style={[
													styles.selectedIcon,
													{ backgroundColor: editColor + "20" },
												]}
											>
												<Ionicons name="repeat" size={24} color={editColor} />
											</View>
											<Text style={styles.iconSelectorText}>
												{editFrequencyType === "daily"
													? "Every day"
													: editFrequencyType === "times_per_day"
													? `${editFrequencyValue}x per day`
													: editFrequencyType === "specific_days"
													? `${editSelectedDays.length} days/week`
													: editFrequencyType === "times_per_week"
													? `${editFrequencyValue}x per week`
													: editFrequencyType === "times_per_month"
													? `${editFrequencyValue}x per month`
													: editFrequencyType === "every_n_days"
													? `Every ${editFrequencyValue} days`
													: editFrequencyType === "times_in_x_days"
													? `${editFrequencyValue}x in ${editFrequencySecondValue} days`
													: "Custom"}
											</Text>
											<Ionicons
												name={
													showFrequencyPicker ? "chevron-up" : "chevron-down"
												}
												size={20}
												color={theme.textSecondary}
											/>
										</TouchableOpacity>

										{showFrequencyPicker && (
											<View style={styles.frequencyPickerContainer}>
												{/* Frequency Type Options */}
												<View style={styles.frequencyOptions}>
													{[
														{
															type: "daily" as FrequencyType,
															label: "Daily",
															icon: "today",
															description: "Complete once every day",
														},
														{
															type: "times_per_day" as FrequencyType,
															label: "Multiple times/day",
															icon: "repeat",
															description: "Complete several times each day",
														},
														{
															type: "specific_days" as FrequencyType,
															label: "Specific days",
															icon: "calendar",
															description: "Choose which days of the week",
														},
														{
															type: "times_per_week" as FrequencyType,
															label: "Times per week",
															icon: "calendar-outline",
															description: "Flexible weekly goal",
														},
														{
															type: "times_per_month" as FrequencyType,
															label: "Times per month",
															icon: "calendar-number-outline",
															description: "Monthly completion goal",
														},
														{
															type: "every_n_days" as FrequencyType,
															label: "Every N days",
															icon: "refresh",
															description:
																"Custom interval between completions",
														},
														{
															type: "times_in_x_days" as FrequencyType,
															label: "Times in X days",
															icon: "timer-outline",
															description: "Complete N times within X days",
														},
													].map((option) => (
														<TouchableOpacity
															key={option.type}
															style={[
																styles.frequencyOptionEnhanced,
																editFrequencyType === option.type && {
																	backgroundColor: editColor + "15",
																	borderColor: editColor,
																},
															]}
															onPress={() => {
																setEditFrequencyType(option.type);
																if (option.type === "daily") {
																	setEditFrequencyValue(1);
																} else if (option.type === "times_per_day") {
																	setEditFrequencyValue(2);
																} else if (option.type === "times_per_week") {
																	setEditFrequencyValue(3);
																} else if (option.type === "times_per_month") {
																	setEditFrequencyValue(10);
																} else if (option.type === "every_n_days") {
																	setEditFrequencyValue(2);
																} else if (option.type === "times_in_x_days") {
																	setEditFrequencyValue(3);
																	setEditFrequencySecondValue(14);
																}
															}}
														>
															<View
																style={[
																	styles.frequencyOptionIconBox,
																	{
																		backgroundColor:
																			editFrequencyType === option.type
																				? editColor + "20"
																				: theme.border,
																	},
																]}
															>
																<Ionicons
																	name={option.icon as any}
																	size={20}
																	color={
																		editFrequencyType === option.type
																			? editColor
																			: theme.textSecondary
																	}
																/>
															</View>
															<View style={styles.frequencyOptionContent}>
																<Text
																	style={[
																		styles.frequencyOptionText,
																		editFrequencyType === option.type && {
																			color: editColor,
																		},
																	]}
																>
																	{option.label}
																</Text>
																<Text style={styles.frequencyOptionDescription}>
																	{option.description}
																</Text>
															</View>
															{editFrequencyType === option.type && (
																<Ionicons
																	name="checkmark-circle"
																	size={22}
																	color={editColor}
																/>
															)}
														</TouchableOpacity>
													))}
												</View>

												{/* Specific Days Selector */}
												{editFrequencyType === "specific_days" && (
													<View style={styles.daysSelector}>
														<Text style={styles.daysSelectorLabel}>
															Select days:
														</Text>
														<View style={styles.daysRow}>
															{DAY_NAMES.map((day, index) => (
																<TouchableOpacity
																	key={day}
																	style={[
																		styles.dayButton,
																		editSelectedDays.includes(index) && {
																			backgroundColor: editColor,
																			borderColor: editColor,
																		},
																	]}
																	onPress={() => toggleEditDay(index)}
																>
																	<Text
																		style={[
																			styles.dayButtonText,
																			editSelectedDays.includes(index) && {
																				color: "#fff",
																			},
																		]}
																	>
																		{day}
																	</Text>
																</TouchableOpacity>
															))}
														</View>
													</View>
												)}

												{/* Value Selector for non-daily frequencies */}
												{editFrequencyType !== "daily" &&
													editFrequencyType !== "specific_days" &&
													editFrequencyType !== "times_in_x_days" && (
														<View style={styles.frequencyValueContainer}>
															<Text style={styles.frequencyValueLabel}>
																{editFrequencyType === "times_per_day"
																	? "Times per day:"
																	: editFrequencyType === "times_per_week"
																	? "Times per week:"
																	: editFrequencyType === "times_per_month"
																	? "Times per month:"
																	: "Every N days:"}
															</Text>
															<View style={styles.frequencyValueSelector}>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencyValue(
																			Math.max(1, editFrequencyValue - 1)
																		)
																	}
																>
																	<Ionicons
																		name="remove"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
																<Text
																	style={[
																		styles.frequencyValueText,
																		{ color: editColor },
																	]}
																>
																	{editFrequencyValue}
																</Text>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencyValue(
																			editFrequencyValue + 1
																		)
																	}
																>
																	<Ionicons
																		name="add"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
															</View>
														</View>
													)}

												{/* Times in X Days - Two Value Selectors */}
												{editFrequencyType === "times_in_x_days" && (
													<View style={{ gap: 16 }}>
														<View style={styles.frequencyValueContainer}>
															<Text style={styles.frequencyValueLabel}>
																Complete N times:
															</Text>
															<View style={styles.frequencyValueSelector}>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencyValue(
																			Math.max(1, editFrequencyValue - 1)
																		)
																	}
																>
																	<Ionicons
																		name="remove"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
																<Text
																	style={[
																		styles.frequencyValueText,
																		{ color: editColor },
																	]}
																>
																	{editFrequencyValue}
																</Text>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencyValue(
																			editFrequencyValue + 1
																		)
																	}
																>
																	<Ionicons
																		name="add"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
															</View>
														</View>
														<View style={styles.frequencyValueContainer}>
															<Text style={styles.frequencyValueLabel}>
																Within X days:
															</Text>
															<View style={styles.frequencyValueSelector}>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencySecondValue(
																			Math.max(2, editFrequencySecondValue - 1)
																		)
																	}
																>
																	<Ionicons
																		name="remove"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
																<Text
																	style={[
																		styles.frequencyValueText,
																		{ color: editColor },
																	]}
																>
																	{editFrequencySecondValue}
																</Text>
																<TouchableOpacity
																	style={[
																		styles.frequencyValueButton,
																		{ backgroundColor: editColor + "20" },
																	]}
																	onPress={() =>
																		setEditFrequencySecondValue(
																			editFrequencySecondValue + 1
																		)
																	}
																>
																	<Ionicons
																		name="add"
																		size={20}
																		color={editColor}
																	/>
																</TouchableOpacity>
															</View>
														</View>
													</View>
												)}
											</View>
										)}
									</View>

									{/* Reminder Section */}
									<Text style={styles.sectionLabel}>REMINDERS</Text>

									{/* Reminder Toggle */}
									<View style={styles.switchRow}>
										<View style={styles.switchInfo}>
											<View
												style={[
													styles.selectedIcon,
													{ backgroundColor: editColor + "20" },
												]}
											>
												<Ionicons
													name="notifications"
													size={24}
													color={editColor}
												/>
											</View>
											<View style={styles.switchTextContainer}>
												<Text style={styles.switchTitle}>Daily Reminder</Text>
												<Text style={styles.switchSubtitle}>
													Get notified to complete your habit
												</Text>
											</View>
										</View>
										<Switch
											value={editReminderEnabled}
											onValueChange={setEditReminderEnabled}
											trackColor={{
												false: theme.border,
												true: editColor + "60",
											}}
											thumbColor={
												editReminderEnabled ? editColor : theme.textMuted
											}
										/>
									</View>

									{/* Alarm Toggle */}
									<View style={styles.switchRow}>
										<View style={styles.switchInfo}>
											<View
												style={[
													styles.selectedIcon,
													{ backgroundColor: editColor + "20" },
												]}
											>
												<Ionicons name="alarm" size={24} color={editColor} />
											</View>
											<View style={styles.switchTextContainer}>
												<Text style={styles.switchTitle}>Alarm Sound</Text>
												<Text style={styles.switchSubtitle}>
													Play alarm sound with notification
												</Text>
											</View>
										</View>
										<Switch
											value={editAlarmEnabled}
											onValueChange={setEditAlarmEnabled}
											trackColor={{
												false: theme.border,
												true: editColor + "60",
											}}
											thumbColor={
												editAlarmEnabled ? editColor : theme.textMuted
											}
										/>
									</View>

									{/* Reminder Time */}
									{editReminderEnabled && (
										<View style={styles.inputGroup}>
											<Text style={styles.inputLabel}>Reminder Time</Text>
											<TouchableOpacity
												style={styles.iconSelector}
												onPress={() => setShowTimePicker(true)}
											>
												<View
													style={[
														styles.selectedIcon,
														{ backgroundColor: editColor + "20" },
													]}
												>
													<Ionicons name="time" size={24} color={editColor} />
												</View>
												<View style={{ flex: 1 }}>
													<Text style={styles.iconSelectorText}>
														{formatTime(editSelectedTime)}
													</Text>
													<Text
														style={{
															fontSize: 13,
															color: theme.textMuted,
														}}
													>
														Tap to change
													</Text>
												</View>
												<Ionicons
													name="chevron-forward"
													size={20}
													color={theme.textSecondary}
												/>
											</TouchableOpacity>

											{/* Time Picker (iOS shows inline, Android shows dialog) */}
											{showTimePicker && (
												<View
													style={{
														backgroundColor: theme.surfaceLight,
														borderRadius: 14,
														marginTop: 12,
														overflow: "hidden",
													}}
												>
													<DateTimePicker
														value={editSelectedTime}
														mode="time"
														display={
															Platform.OS === "ios" ? "spinner" : "default"
														}
														onChange={handleEditTimeChange}
														textColor={theme.text}
														themeVariant={theme.mode}
													/>
													{Platform.OS === "ios" && (
														<TouchableOpacity
															style={{
																padding: 14,
																backgroundColor: editColor,
																alignItems: "center",
															}}
															onPress={() => setShowTimePicker(false)}
														>
															<Text
																style={{ color: "#FFFFFF", fontWeight: "600" }}
															>
																Done
															</Text>
														</TouchableOpacity>
													)}
												</View>
											)}
										</View>
									)}

									{/* Notes Section */}
									<Text style={styles.sectionLabel}>NOTES</Text>

									{/* Notes */}
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>
											Personal Notes (optional)
										</Text>
										<TextInput
											style={[styles.textInput, styles.textArea]}
											value={editNotes}
											onChangeText={setEditNotes}
											placeholder="Add personal notes, tips, or motivation..."
											placeholderTextColor={theme.textMuted}
											multiline
											numberOfLines={4}
										/>
									</View>

									{/* Preview */}
									<Text style={styles.sectionLabel}>PREVIEW</Text>
									<View style={styles.inputGroup}>
										<View style={styles.previewCard}>
											<View
												style={[
													styles.previewIcon,
													{ backgroundColor: editColor + "20" },
												]}
											>
												<Ionicons
													name={editIcon as any}
													size={28}
													color={editColor}
												/>
											</View>
											<View style={styles.previewInfo}>
												<Text
													style={[styles.previewName, { color: editColor }]}
												>
													{editName || "Habit Name"}
												</Text>
												<Text
													style={styles.previewDescription}
													numberOfLines={1}
												>
													{editHabitType === "measurable"
														? `${editTarget || "?"} ${editUnit || "units"} • `
														: ""}
													{editFrequencyType === "daily"
														? "Every day"
														: editFrequencyType === "times_per_day"
														? `${editFrequencyValue}x per day`
														: editFrequencyType === "specific_days"
														? `${editSelectedDays.length} days/week`
														: editFrequencyType === "times_per_week"
														? `${editFrequencyValue}x per week`
														: editFrequencyType === "times_per_month"
														? `${editFrequencyValue}x per month`
														: editFrequencyType === "every_n_days"
														? `Every ${editFrequencyValue} days`
														: editFrequencyType === "times_in_x_days"
														? `${editFrequencyValue}x in ${editFrequencySecondValue} days`
														: "Custom"}
													{editReminderEnabled
														? ` • ${editReminderTime}`
														: " • No reminder"}
												</Text>
											</View>
										</View>
									</View>

									<View style={{ height: 20 }} />
								</ScrollView>

								{/* Save Button */}
								<TouchableOpacity
									style={[styles.saveButton, { backgroundColor: editColor }]}
									onPress={handleSaveEdit}
								>
									<Text style={styles.saveButtonText}>Save Changes</Text>
								</TouchableOpacity>
							</Animated.View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		</SafeAreaView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		backButton: {
			width: 40,
			height: 40,
			justifyContent: "center",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		headerRight: {
			flexDirection: "row",
			gap: 8,
		},
		iconButton: {
			width: 40,
			height: 40,
			justifyContent: "center",
			alignItems: "center",
		},
		placeholder: {
			width: 40,
		},

		habitInfo: {
			paddingHorizontal: 20,
			paddingBottom: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		habitQuestion: {
			fontSize: 16,
			fontWeight: "500",
			marginBottom: 8,
		},
		habitMeta: {
			flexDirection: "row",
			gap: 16,
		},
		metaItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		metaText: {
			fontSize: 13,
			color: theme.textMuted,
		},

		section: {
			paddingHorizontal: 20,
			paddingTop: 20,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 12,
		},
		sectionTitleInline: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textMuted,
		},

		overviewCard: {
			flexDirection: "row",
			alignItems: "center",
			gap: 20,
		},
		progressRingContainer: {
			position: "relative",
			width: 70,
			height: 70,
			justifyContent: "center",
			alignItems: "center",
		},
		progressTextContainer: {
			position: "absolute",
			justifyContent: "center",
			alignItems: "center",
		},
		progressPercent: {
			fontSize: 14,
			fontWeight: "700",
		},
		overviewStats: {
			flex: 1,
			flexDirection: "row",
			justifyContent: "space-around",
		},
		overviewStat: {
			alignItems: "center",
		},
		overviewValue: {
			fontSize: 16,
			fontWeight: "600",
		},
		overviewLabel: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},

		periodDropdown: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		periodText: {
			fontSize: 14,
			color: theme.textMuted,
		},
		dropdownMenu: {
			position: "absolute",
			right: 20,
			top: 40,
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 4,
			zIndex: 100,
			elevation: 5,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.25,
			shadowRadius: 4,
		},
		dropdownItem: {
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		dropdownItemText: {
			fontSize: 14,
			color: theme.text,
		},

		chartContainer: {
			flexDirection: "row",
			height: 150,
		},
		yAxisLabels: {
			width: 40,
			justifyContent: "space-between",
			paddingVertical: 5,
		},
		yAxisLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		chartArea: {
			flex: 1,
			position: "relative",
		},
		gridLine: {
			position: "absolute",
			left: 0,
			right: 0,
			height: 1,
			backgroundColor: theme.border,
		},
		dataLine: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: 0,
			top: 0,
			flexDirection: "row",
			justifyContent: "space-around",
			alignItems: "flex-end",
		},
		dataPoint: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		xAxisContainer: {
			marginTop: 8,
		},
		xAxisLabels: {
			flexDirection: "row",
			gap: 20,
			paddingLeft: 40,
		},
		xAxisLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},

		historyChart: {
			height: 120,
		},
		barChartContainer: {
			flex: 1,
			flexDirection: "row",
			alignItems: "flex-end",
			justifyContent: "space-around",
			paddingHorizontal: 10,
		},
		barWrapper: {
			flex: 1,
			height: "100%",
			justifyContent: "flex-end",
			alignItems: "center",
			marginHorizontal: 2,
		},
		bar: {
			width: "80%",
			borderRadius: 4,
			minHeight: 4,
		},

		calendarContainer: {
			marginBottom: 12,
		},
		calendarGrid: {
			flexDirection: "column",
		},
		calendarRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		dayLabelPlaceholder: {
			width: 30,
		},
		dayLabel: {
			width: 30,
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "right",
			paddingRight: 8,
		},
		monthHeader: {
			flex: 1,
			minWidth: 100,
		},
		monthHeaderText: {
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "center",
		},
		monthDays: {
			flexDirection: "row",
			gap: 2,
		},
		calendarDay: {
			width: 18,
			height: 18,
			borderRadius: 4,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
		},
		calendarDayText: {
			fontSize: 9,
			color: theme.textMuted,
		},
		calendarDayTextCompleted: {
			color: "#fff",
		},
		otherMonthDay: {
			opacity: 0.3,
		},
		editButton: {
			alignItems: "center",
			paddingVertical: 12,
		},
		editButtonText: {
			fontSize: 14,
			fontWeight: "600",
		},

		streaksContainer: {
			gap: 8,
		},
		streakRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		streakDate: {
			fontSize: 11,
			color: theme.textMuted,
			width: 80,
		},
		streakBar: {
			flex: 1,
			height: 24,
			backgroundColor: theme.surfaceLight,
			borderRadius: 4,
			flexDirection: "row",
			alignItems: "center",
			overflow: "hidden",
		},
		streakFill: {
			height: "100%",
			borderRadius: 4,
			justifyContent: "center",
			alignItems: "flex-end",
			paddingRight: 8,
		},
		streakCount: {
			fontSize: 12,
			fontWeight: "600",
			color: "#fff",
			position: "absolute",
			right: 8,
		},
		streakEndDate: {
			fontSize: 11,
			color: theme.textMuted,
			width: 80,
			textAlign: "right",
		},
		noDataText: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			paddingVertical: 20,
		},

		frequencyContainer: {
			marginTop: 8,
		},
		frequencyGrid: {
			gap: 4,
		},
		frequencyRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		frequencyDot: {
			width: 10,
			height: 10,
			borderRadius: 2,
			backgroundColor: theme.surfaceLight,
			flex: 1,
			maxWidth: 16,
			marginHorizontal: 2,
		},
		frequencyDayLabel: {
			fontSize: 11,
			color: theme.textMuted,
			width: 30,
			textAlign: "right",
		},
		frequencyMonths: {
			flexDirection: "row",
			marginTop: 8,
			justifyContent: "space-between",
			paddingRight: 38,
		},
		frequencyMonthLabel: {
			fontSize: 9,
			color: theme.textMuted,
			flex: 1,
			maxWidth: 20,
			textAlign: "center",
		},

		deleteButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 16,
			marginHorizontal: 20,
			marginTop: 20,
			borderWidth: 1,
			borderColor: theme.error,
			borderRadius: 12,
			gap: 8,
		},
		deleteButtonText: {
			fontSize: 14,
			fontWeight: "600",
		},

		emptyState: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 40,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginTop: 16,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 8,
		},

		// Edit Modal Styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			paddingHorizontal: 20,
			paddingBottom: 34,
			maxHeight: "90%",
		},
		dragHandleContainer: {
			alignItems: "center",
			paddingVertical: 12,
		},
		dragHandle: {
			width: 40,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.border,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		inputGroup: {
			marginBottom: 20,
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		textInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		textArea: {
			minHeight: 80,
			textAlignVertical: "top",
		},
		colorGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
		},
		colorOption: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
		},
		colorOptionSelected: {
			borderWidth: 3,
			borderColor: "#fff",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			elevation: 4,
		},
		iconSelector: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderWidth: 1,
			borderColor: theme.border,
		},
		selectedIcon: {
			width: 40,
			height: 40,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		iconSelectorText: {
			flex: 1,
			fontSize: 15,
			color: theme.text,
		},
		iconGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginTop: 12,
			padding: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
		},
		iconOption: {
			width: 44,
			height: 44,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		previewCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			borderWidth: 1,
			borderColor: theme.border,
		},
		previewIcon: {
			width: 50,
			height: 50,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		previewInfo: {
			flex: 1,
		},
		previewName: {
			fontSize: 17,
			fontWeight: "600",
		},
		previewDescription: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		sectionLabel: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.textMuted,
			letterSpacing: 1,
			marginTop: 20,
			marginBottom: 12,
		},
		inputHint: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 6,
		},
		switchRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 16,
		},
		switchInfo: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		switchTextContainer: {
			flex: 1,
		},
		switchTitle: {
			fontSize: 15,
			fontWeight: "500",
			color: theme.text,
		},
		switchSubtitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		frequencyPickerContainer: {
			marginTop: 12,
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
		},
		frequencyOptions: {
			gap: 8,
		},
		frequencyOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			borderWidth: 1,
			borderColor: theme.border,
			gap: 12,
		},
		frequencyOptionEnhanced: {
			flexDirection: "row",
			alignItems: "center",
			padding: 12,
			borderRadius: 10,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		frequencyOptionIconBox: {
			width: 36,
			height: 36,
			borderRadius: 8,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		frequencyOptionContent: {
			flex: 1,
		},
		frequencyOptionText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		frequencyOptionDescription: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
		},
		daysSelector: {
			marginTop: 12,
			padding: 12,
			backgroundColor: theme.surface,
			borderRadius: 10,
		},
		daysSelectorLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 10,
		},
		daysRow: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		dayButton: {
			width: 38,
			height: 38,
			borderRadius: 19,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 1,
			borderColor: theme.border,
		},
		dayButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		frequencyValueContainer: {
			marginTop: 16,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 12,
			backgroundColor: theme.surface,
			borderRadius: 10,
		},
		frequencyValueLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		frequencyValueSelector: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		frequencyValueButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		frequencyValueText: {
			fontSize: 20,
			fontWeight: "700",
			minWidth: 30,
			textAlign: "center",
		},
		timePickerContainer: {
			marginTop: 12,
		},
		timeOptions: {
			flexDirection: "row",
			gap: 8,
			paddingVertical: 4,
		},
		timeOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			borderWidth: 1,
			borderColor: theme.border,
		},
		timeOptionText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		saveButton: {
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 10,
		},
		saveButtonText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#fff",
		},
	});
