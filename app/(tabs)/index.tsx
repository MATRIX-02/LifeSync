import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { SharedDrawer } from "@/src/components/SharedDrawer";
import { useHabitStore } from "@/src/context/habitStore";
import { useModuleStore } from "@/src/context/moduleContext";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { NotificationService } from "@/src/services/notificationService";
import {
	FrequencyType,
	Habit,
	HabitLog,
	HabitType,
	TargetType,
} from "@/src/types";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Progress Ring Component for habit icons
const ProgressRing = ({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
	children,
}: {
	progress: number;
	size: number;
	strokeWidth: number;
	color: string;
	backgroundColor: string;
	children?: React.ReactNode;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const strokeDashoffset = circumference - (progress / 100) * circumference;

	return (
		<View
			style={{
				width: size,
				height: size,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Svg width={size} height={size} style={{ position: "absolute" }}>
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
			{children}
		</View>
	);
};

export default function DashboardScreen() {
	const router = useRouter();
	const { isDark, toggleTheme } = useTheme();
	const theme = useColors();
	const { isModuleEnabled, getFirstEnabledModule } = useModuleStore();

	// Check if module is disabled
	const isHabitsEnabled = isModuleEnabled("habits");
	const firstEnabledModule = getFirstEnabledModule();

	const {
		habits,
		addHabit,
		deleteHabit,
		archiveHabit,
		logHabitCompletion,
		toggleHabitForDate,
		calculateStats,
		stats,
		logs,
		getActiveHabits,
		searchHabits,
		profile,
		isHabitCompletedOnDate,
	} = useHabitStore();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [searchQuery, setSearchQuery] = useState("");
	const [showSortMenu, setShowSortMenu] = useState(false);
	const [sortBy, setSortBy] = useState<
		"manual" | "name" | "color" | "score" | "status" | "created"
	>("manual");
	const [drawerAnim] = useState(new Animated.Value(-width * 0.8));
	const [daysOffset, setDaysOffset] = useState(0); // For scrollable date navigation

	const activeHabits = getActiveHabits();

	// Sort habits based on selected sort option
	const sortedHabits = useMemo(() => {
		const habitsToSort = [...activeHabits];

		switch (sortBy) {
			case "name":
				return habitsToSort.sort((a, b) => a.name.localeCompare(b.name));
			case "color":
				return habitsToSort.sort((a, b) => a.color.localeCompare(b.color));
			case "score":
				// Sort by completion rate (highest first)
				return habitsToSort.sort((a, b) => {
					const aLogs = logs.filter((l: HabitLog) => l.habitId === a.id).length;
					const bLogs = logs.filter((l: HabitLog) => l.habitId === b.id).length;
					return bLogs - aLogs;
				});
			case "status":
				// Completed today first, then incomplete
				return habitsToSort.sort((a, b) => {
					const aCompleted = isHabitCompletedToday(a.id) ? 1 : 0;
					const bCompleted = isHabitCompletedToday(b.id) ? 1 : 0;
					return bCompleted - aCompleted;
				});
			case "created":
				// Newest first
				return habitsToSort.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			case "manual":
			default:
				return habitsToSort;
		}
	}, [activeHabits, sortBy, logs]);

	const displayedHabits = sortedHabits;
	const today = new Date();
	const userName = profile?.name || "User";

	// Get workout stats
	const { getWorkoutStats, workoutPlans, activePlanId } = useWorkoutStore();
	const workoutStats = getWorkoutStats();

	// Calculate monthly progress for a habit (percentage of days completed this month)
	const getMonthlyProgress = useCallback(
		(habitId: string) => {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth();

			// Get total days in current month
			const daysInMonth = new Date(year, month + 1, 0).getDate();

			// Get unique completed days this month (not just log count)
			const completedDays = new Set<string>();

			logs.forEach((log: HabitLog) => {
				if (log.habitId !== habitId) return;
				const logDate = new Date(log.completedAt);
				if (logDate.getFullYear() === year && logDate.getMonth() === month) {
					// Store day as string to ensure uniqueness
					completedDays.add(logDate.getDate().toString());
				}
			});

			// Calculate percentage (unique days completed / total days in month)
			const progress = Math.min(
				100,
				Math.round((completedDays.size / daysInMonth) * 100)
			);
			return progress;
		},
		[logs]
	);

	const handleCompleteHabit = useCallback(
		(habitId: string) => {
			logHabitCompletion(habitId);
			calculateStats(habitId);
		},
		[logHabitCompletion, calculateStats]
	);

	// Animate drawer
	useEffect(() => {
		Animated.timing(drawerAnim, {
			toValue: drawerOpen ? 0 : -width * 0.8,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [drawerOpen]);

	// Redirect if module is disabled - MUST be a hook, cannot be conditional
	useEffect(() => {
		if (!isHabitsEnabled) {
			if (firstEnabledModule === "workout") {
				router.replace("/(tabs)/workout");
			} else if (firstEnabledModule === "finance") {
				router.replace("/(tabs)/finance");
			}
		}
	}, [isHabitsEnabled, firstEnabledModule, router]);

	if (!isHabitsEnabled) {
		return null;
	}

	const getWeekDates = () => {
		const dates = [];
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay());
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			dates.push(date);
		}
		return dates;
	};

	const weekDates = getWeekDates();
	const isSelected = (date: Date) =>
		date.toDateString() === selectedDate.toDateString();
	const isToday = (date: Date) => date.toDateString() === today.toDateString();

	const isHabitCompletedToday = (habitId: string) => {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		const todayEnd = new Date();
		todayEnd.setHours(23, 59, 59, 999);
		return logs.some(
			(log: HabitLog) =>
				log.habitId === habitId &&
				new Date(log.completedAt) >= todayStart &&
				new Date(log.completedAt) <= todayEnd
		);
	};

	const handleHabitLongPress = (habit: Habit) => {
		Alert.alert(habit.name, "What would you like to do?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Archive", onPress: () => archiveHabit(habit.id) },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteHabit(habit.id),
			},
		]);
	};

	const getLast5Days = () => {
		const days = [];
		for (let i = 0; i < 5; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() - i - daysOffset);
			days.push(date);
		}
		return days;
	};

	// Navigate to previous/next days
	const goToPreviousDays = () => {
		setDaysOffset((prev) => prev + 5);
	};

	const goToNextDays = () => {
		setDaysOffset((prev) => Math.max(0, prev - 5));
	};

	const goToToday = () => {
		setDaysOffset(0);
	};

	const getGreeting = () => {
		const hour = today.getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 17) return "Good Afternoon";
		return "Good Evening";
	};

	const getCompletionRate = () => {
		if (activeHabits.length === 0) return 0;
		const completed = activeHabits.filter((h: Habit) =>
			isHabitCompletedToday(h.id)
		).length;
		return Math.round((completed / activeHabits.length) * 100);
	};

	const styles = createStyles(theme);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			{/* Drawer Overlay */}
			{drawerOpen && (
				<TouchableOpacity
					style={[styles.drawerOverlay, { zIndex: 15 }]}
					activeOpacity={1}
					onPress={() => setDrawerOpen(false)}
				/>
			)}

			{/* Shared Drawer Component */}
			<SharedDrawer
				theme={theme}
				isDark={isDark}
				toggleTheme={toggleTheme}
				drawerAnim={drawerAnim}
				currentModule="habits"
				onCloseDrawer={() => setDrawerOpen(false)}
			/>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Habits Section with Day Headers */}
				<View style={styles.habitsSection}>
					{/* Header Row with Days */}
					<View style={styles.habitTableHeader}>
						<Text style={styles.habitsTitle}>Habits Tracker</Text>
						{/* Header Actions */}
						<View style={styles.headerActions}>
							<TouchableOpacity onPress={() => setModalVisible(true)}>
								<Ionicons name="add" size={24} color={theme.text} />
							</TouchableOpacity>
							<View>
								<TouchableOpacity
									onPress={() => setShowSortMenu(!showSortMenu)}
								>
									<Ionicons
										name="filter"
										size={22}
										color={sortBy !== "manual" ? theme.primary : theme.text}
									/>
								</TouchableOpacity>
							</View>
							<TouchableOpacity onPress={() => setDrawerOpen(true)}>
								<Ionicons
									name="ellipsis-vertical"
									size={22}
									color={theme.text}
								/>
							</TouchableOpacity>
						</View>
					</View>

					{/* Day Headers Row - aligned to right like habit checkboxes */}
					<View style={styles.dayHeaders}>
						{/* Left side: navigation arrows and back to today */}
						<View style={styles.dateNavLeft}>
							<TouchableOpacity
								style={styles.dateNavButton}
								onPress={goToPreviousDays}
							>
								<Ionicons
									name="chevron-back"
									size={18}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.dateNavButton,
									daysOffset === 0 && styles.dateNavButtonDisabled,
								]}
								onPress={goToNextDays}
								disabled={daysOffset === 0}
							>
								<Ionicons
									name="chevron-forward"
									size={18}
									color={
										daysOffset === 0 ? theme.textMuted : theme.textSecondary
									}
								/>
							</TouchableOpacity>
							{daysOffset > 0 && (
								<TouchableOpacity
									style={styles.backToTodayButton}
									onPress={goToToday}
								>
									<Text style={styles.backToTodayText}>Today</Text>
								</TouchableOpacity>
							)}
						</View>

						{/* Right side: day columns matching habit checkboxes */}
						<View style={styles.dayHeadersRight}>
							{getLast5Days().map((date, index) => {
								const isTodayDate =
									date.toDateString() === today.toDateString();
								return (
									<View
										key={index}
										style={[
											styles.dayHeader,
											isTodayDate && styles.dayHeaderToday,
										]}
									>
										<Text
											style={[
												styles.dayHeaderText,
												isTodayDate && styles.dayHeaderTextToday,
											]}
										>
											{DAYS[date.getDay()].substring(0, 3).toUpperCase()}
										</Text>
										<Text
											style={[
												styles.dayHeaderNumber,
												isTodayDate && styles.dayHeaderNumberToday,
											]}
										>
											{date.getDate()}
										</Text>
									</View>
								);
							})}
						</View>
					</View>

					{displayedHabits.length === 0 ? (
						<TouchableOpacity
							style={styles.emptyState}
							onPress={() => setModalVisible(true)}
						>
							<View style={styles.emptyIcon}>
								<Ionicons
									name="leaf-outline"
									size={48}
									color={theme.textMuted}
								/>
							</View>
							<Text style={styles.emptyTitle}>No habits yet</Text>
							<Text style={styles.emptySubtitle}>
								Tap + to create your first habit
							</Text>
						</TouchableOpacity>
					) : (
						<ScrollView
							style={styles.habitsList}
							nestedScrollEnabled={true}
							showsVerticalScrollIndicator={false}
						>
							{displayedHabits.map((habit: Habit) => (
								<HabitRowItem
									key={habit.id}
									habit={habit}
									last5Days={getLast5Days()}
									isHabitCompletedOnDate={isHabitCompletedOnDate}
									monthlyProgress={getMonthlyProgress(habit.id)}
									onToggleDate={(date) => toggleHabitForDate(habit.id, date)}
									onHabitPress={() =>
										router.push({
											pathname: "/(tabs)/statistics",
											params: { habitId: habit.id },
										} as any)
									}
									onLongPress={() => handleHabitLongPress(habit)}
									theme={theme}
								/>
							))}
						</ScrollView>
					)}
				</View>
			</ScrollView>

			{/* Sort Menu Popover */}
			{showSortMenu && (
				<>
					<TouchableOpacity
						style={styles.sortMenuOverlay}
						activeOpacity={1}
						onPress={() => setShowSortMenu(false)}
					/>
					<View style={styles.sortMenuPopover}>
						<Text style={styles.sortMenuTitle}>Sort By</Text>
						{[
							{
								key: "manual",
								label: "Manually",
								icon: "reorder-four-outline",
							},
							{ key: "name", label: "By Name", icon: "text-outline" },
							{
								key: "color",
								label: "By Color",
								icon: "color-palette-outline",
							},
							{ key: "score", label: "By Score", icon: "trending-up-outline" },
							{
								key: "status",
								label: "By Status",
								icon: "checkmark-done-outline",
							},
							{
								key: "created",
								label: "By Date Created",
								icon: "calendar-outline",
							},
						].map((option) => (
							<TouchableOpacity
								key={option.key}
								style={[
									styles.sortMenuItem,
									sortBy === option.key && styles.sortMenuItemActive,
								]}
								onPress={() => {
									setSortBy(option.key as any);
									setShowSortMenu(false);
								}}
							>
								<Ionicons
									name={option.icon as any}
									size={18}
									color={
										sortBy === option.key ? theme.primary : theme.textSecondary
									}
								/>
								<Text
									style={[
										styles.sortMenuItemText,
										sortBy === option.key && styles.sortMenuItemTextActive,
									]}
								>
									{option.label}
								</Text>
								{sortBy === option.key && (
									<Ionicons name="checkmark" size={18} color={theme.primary} />
								)}
							</TouchableOpacity>
						))}
					</View>
				</>
			)}

			{/* Create Habit Modal */}
			<CreateHabitModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onCreateHabit={async (habit: Habit) => {
					addHabit(habit);
					// Schedule notification if enabled
					if (habit.notificationEnabled && habit.notificationTime) {
						try {
							await NotificationService.scheduleHabitReminder(
								habit.id,
								habit.name,
								habit.notificationTime
							);
							console.log(
								`✅ Notification scheduled for ${habit.name} at ${habit.notificationTime}`
							);
						} catch (error) {
							console.error("Failed to schedule notification:", error);
						}
					}
				}}
				theme={theme}
			/>
		</SafeAreaView>
	);
}

// Helper function to get habit icon
const getHabitIcon = (name: string): string => {
	const n = name.toLowerCase();
	if (n.includes("water") || n.includes("drink")) return "water-outline";
	if (n.includes("read") || n.includes("book")) return "book-outline";
	if (n.includes("exercise") || n.includes("workout") || n.includes("gym"))
		return "barbell-outline";
	if (n.includes("meditat") || n.includes("mindful")) return "leaf-outline";
	if (n.includes("sleep") || n.includes("bed")) return "moon-outline";
	if (n.includes("walk") || n.includes("run")) return "walk-outline";
	if (n.includes("code") || n.includes("program")) return "code-slash-outline";
	if (n.includes("write") || n.includes("journal")) return "pencil-outline";
	if (n.includes("music") || n.includes("piano"))
		return "musical-notes-outline";
	if (n.includes("eat") || n.includes("food") || n.includes("diet"))
		return "nutrition-outline";
	return "checkmark-circle-outline";
};

// Habit Row Item Component - like the reference UI with day checkmarks
interface HabitRowItemProps {
	habit: Habit;
	last5Days: Date[];
	isHabitCompletedOnDate: (habitId: string, date: Date) => boolean;
	monthlyProgress: number; // 0-100 percentage
	onToggleDate: (date: Date) => void;
	onHabitPress: () => void;
	onLongPress: () => void;
	theme: Theme;
}

const HabitRowItem: React.FC<HabitRowItemProps> = ({
	habit,
	last5Days,
	isHabitCompletedOnDate,
	monthlyProgress,
	onToggleDate,
	onHabitPress,
	onLongPress,
	theme,
}) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingVertical: 16,
				paddingHorizontal: 4,
				borderBottomWidth: 0.5,
				borderBottomColor: theme.border,
			}}
		>
			{/* Habit icon with progress ring - NOT clickable */}
			<ProgressRing
				progress={monthlyProgress}
				size={32}
				strokeWidth={3}
				color={habit.color}
				backgroundColor={theme.surfaceLight}
			>
				<View
					style={{
						width: 22,
						height: 22,
						borderRadius: 11,
						backgroundColor: theme.surface,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Ionicons
						name={(habit.icon || "checkmark-circle-outline") as any}
						size={14}
						color={habit.color}
					/>
				</View>
			</ProgressRing>

			{/* Habit name - tap to open statistics */}
			<TouchableOpacity
				style={{ flex: 1, marginLeft: 12 }}
				onPress={onHabitPress}
				onLongPress={onLongPress}
			>
				<Text
					style={{
						fontSize: 15,
						color: habit.color,
						fontWeight: "500",
					}}
					numberOfLines={1}
				>
					{habit.name}
				</Text>
			</TouchableOpacity>

			{/* Day checkmarks - tappable to toggle */}
			<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
				{last5Days.map((date, index) => {
					const isCompleted = isHabitCompletedOnDate(habit.id, date);

					return (
						<TouchableOpacity
							key={index}
							style={{
								width: 28,
								alignItems: "center",
								padding: 4,
							}}
							onPress={() => onToggleDate(date)}
						>
							{isCompleted ? (
								<Ionicons name="checkmark" size={18} color={habit.color} />
							) : (
								<Text
									style={{
										fontSize: 14,
										color: theme.textMuted,
									}}
								>
									×
								</Text>
							)}
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
};

// Create Habit Modal with Time Picker
interface CreateHabitModalProps {
	visible: boolean;
	onClose: () => void;
	onCreateHabit: (habit: Habit) => void;
	theme: Theme;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CreateHabitModal: React.FC<CreateHabitModalProps> = ({
	visible,
	onClose,
	onCreateHabit,
	theme,
}) => {
	const [habitName, setHabitName] = useState("");
	const [description, setDescription] = useState("");
	const [question, setQuestion] = useState("");
	const [selectedTime, setSelectedTime] = useState(new Date());
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [selectedColor, setSelectedColor] = useState("#A78BFA");
	const [selectedIcon, setSelectedIcon] = useState<string | undefined>(
		undefined
	);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [notificationEnabled, setNotificationEnabled] = useState(true);
	const [alarmEnabled, setAlarmEnabled] = useState(false);
	const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

	// New habit type states
	const [habitType, setHabitType] = useState<HabitType>("yesno");
	const [unit, setUnit] = useState("");
	const [target, setTarget] = useState("");
	const [targetType, setTargetType] = useState<TargetType>("at_least");

	// Frequency states
	const [frequencyType, setFrequencyType] = useState<FrequencyType>("daily");
	const [frequencyValue, setFrequencyValue] = useState("3");
	const [frequencySecondValue, setFrequencySecondValue] = useState("14");
	const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
	const [selectedDays, setSelectedDays] = useState<number[]>([
		0, 1, 2, 3, 4, 5, 6,
	]);

	// Slide to dismiss animation
	const translateY = useRef(new Animated.Value(0)).current;
	const handleCloseRef = useRef<() => void>(() => {});

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return gestureState.dy > 10;
			},
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy > 0) {
					translateY.setValue(gestureState.dy);
				}
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > 100) {
					Animated.timing(translateY, {
						toValue: height,
						duration: 200,
						useNativeDriver: true,
					}).start(() => {
						handleCloseRef.current();
					});
				} else {
					Animated.spring(translateY, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		})
	).current;

	const toggleDay = (dayIndex: number) => {
		if (selectedDays.includes(dayIndex)) {
			if (selectedDays.length > 1) {
				setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
			}
		} else {
			setSelectedDays([...selectedDays, dayIndex].sort());
		}
	};

	const getFrequencyLabel = () => {
		switch (frequencyType) {
			case "daily":
				return "Every day";
			case "times_per_day":
				return `${frequencyValue}x per day`;
			case "specific_days":
				return `${selectedDays.length} days/week`;
			case "times_per_week":
				return `${frequencyValue}x per week`;
			case "times_per_month":
				return `${frequencyValue}x per month`;
			case "every_n_days":
				return `Every ${frequencyValue} days`;
			case "times_in_x_days":
				return `${frequencyValue}x in ${frequencySecondValue} days`;
			default:
				return "Custom";
		}
	};

	// Icon options
	const habitIcons = [
		// Health & Fitness
		{ icon: "water-outline", name: "Water" },
		{ icon: "fitness-outline", name: "Fitness" },
		{ icon: "barbell-outline", name: "Exercise" },
		{ icon: "walk-outline", name: "Walk" },
		{ icon: "bicycle-outline", name: "Bike" },
		{ icon: "heart-outline", name: "Health" },
		{ icon: "pulse-outline", name: "Cardio" },
		{ icon: "body-outline", name: "Body" },
		{ icon: "footsteps-outline", name: "Steps" },
		// Mind & Wellness
		{ icon: "leaf-outline", name: "Meditation" },
		{ icon: "moon-outline", name: "Sleep" },
		{ icon: "bed-outline", name: "Rest" },
		{ icon: "sunny-outline", name: "Morning" },
		{ icon: "happy-outline", name: "Mood" },
		{ icon: "sparkles-outline", name: "Gratitude" },
		{ icon: "rose-outline", name: "Self-care" },
		// Learning & Productivity
		{ icon: "book-outline", name: "Book" },
		{ icon: "school-outline", name: "Study" },
		{ icon: "language-outline", name: "Language" },
		{ icon: "pencil-outline", name: "Write" },
		{ icon: "code-slash-outline", name: "Code" },
		{ icon: "laptop-outline", name: "Work" },
		{ icon: "bulb-outline", name: "Ideas" },
		{ icon: "newspaper-outline", name: "News" },
		{ icon: "document-text-outline", name: "Journal" },
		// Food & Drink
		{ icon: "nutrition-outline", name: "Food" },
		{ icon: "cafe-outline", name: "Coffee" },
		{ icon: "beer-outline", name: "Drink" },
		{ icon: "restaurant-outline", name: "Meal" },
		{ icon: "fast-food-outline", name: "Snack" },
		{ icon: "pizza-outline", name: "Pizza" },
		// Hobbies & Entertainment
		{ icon: "musical-notes-outline", name: "Music" },
		{ icon: "game-controller-outline", name: "Gaming" },
		{ icon: "camera-outline", name: "Photo" },
		{ icon: "film-outline", name: "Movies" },
		{ icon: "brush-outline", name: "Art" },
		{ icon: "color-palette-outline", name: "Creative" },
		{ icon: "headset-outline", name: "Podcast" },
		{ icon: "mic-outline", name: "Voice" },
		{ icon: "guitar-outline", name: "Guitar" },
		// Social & Communication
		{ icon: "call-outline", name: "Call" },
		{ icon: "chatbubble-outline", name: "Chat" },
		{ icon: "people-outline", name: "Social" },
		{ icon: "person-outline", name: "Personal" },
		{ icon: "home-outline", name: "Home" },
		{ icon: "paw-outline", name: "Pet" },
		// Finance & Goals
		{ icon: "cash-outline", name: "Money" },
		{ icon: "wallet-outline", name: "Savings" },
		{ icon: "card-outline", name: "Finance" },
		{ icon: "trending-up-outline", name: "Growth" },
		{ icon: "trophy-outline", name: "Goal" },
		{ icon: "ribbon-outline", name: "Award" },
		{ icon: "star-outline", name: "Star" },
		{ icon: "flame-outline", name: "Streak" },
		{ icon: "flag-outline", name: "Milestone" },
		// Misc
		{ icon: "airplane-outline", name: "Travel" },
		{ icon: "car-outline", name: "Drive" },
		{ icon: "medkit-outline", name: "Medicine" },
		{ icon: "bandage-outline", name: "Recovery" },
		{ icon: "time-outline", name: "Time" },
		{ icon: "alarm-outline", name: "Alarm" },
		{ icon: "checkbox-outline", name: "Task" },
		{ icon: "list-outline", name: "List" },
		{ icon: "cloud-outline", name: "Weather" },
		{ icon: "earth-outline", name: "Nature" },
		{ icon: "flower-outline", name: "Garden" },
		{ icon: "gift-outline", name: "Gift" },
		{ icon: "hand-left-outline", name: "No" },
		{ icon: "checkmark-circle-outline", name: "Done" },
	];

	const habitColors = [
		{ color: "#A78BFA", name: "Purple" },
		{ color: "#F87171", name: "Red" },
		{ color: "#34D399", name: "Green" },
		{ color: "#FBBF24", name: "Yellow" },
		{ color: "#60A5FA", name: "Blue" },
		{ color: "#F472B6", name: "Pink" },
		{ color: "#FB923C", name: "Orange" },
		{ color: "#2DD4BF", name: "Teal" },
	];

	const targetTypes = [
		{ value: "at_least", label: "At Least" },
		{ value: "at_most", label: "At Most" },
		{ value: "exactly", label: "Exactly" },
	];

	const frequencyOptions = [
		{
			value: "daily",
			label: "Every Day",
			icon: "today",
			description: "Complete once daily",
		},
		{
			value: "times_per_day",
			label: "Multiple Times/Day",
			icon: "repeat",
			description: "Complete several times each day",
		},
		{
			value: "specific_days",
			label: "Specific Days",
			icon: "calendar",
			description: "Choose which days of the week",
		},
		{
			value: "times_per_week",
			label: "Times Per Week",
			icon: "calendar-outline",
			description: "Flexible weekly goal",
		},
		{
			value: "times_per_month",
			label: "Times Per Month",
			icon: "calendar-number-outline",
			description: "Monthly completion goal",
		},
		{
			value: "every_n_days",
			label: "Every N Days",
			icon: "refresh",
			description: "Custom interval between completions",
		},
		{
			value: "times_in_x_days",
			label: "Times In X Days",
			icon: "timer-outline",
			description: "Complete N times within X days",
		},
	];

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

	const handleTimeChange = (event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowTimePicker(false);
		}
		if (date) {
			setSelectedTime(date);
		}
	};

	const resetForm = () => {
		setHabitName("");
		setDescription("");
		setQuestion("");
		setSelectedTime(new Date());
		setSelectedColor("#A78BFA");
		setSelectedIcon(undefined);
		setShowIconPicker(false);
		setShowFrequencyPicker(false);
		setNotificationEnabled(true);
		setAlarmEnabled(false);
		setHabitType("yesno");
		setUnit("");
		setTarget("");
		setTargetType("at_least");
		setFrequencyType("daily");
		setFrequencyValue("3");
		setFrequencySecondValue("14");
		setFrequencyDays([]);
		setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
	};

	// Reset translateY when modal opens
	useEffect(() => {
		if (visible) {
			translateY.setValue(0);
		}
	}, [visible]);

	const handleClose = () => {
		resetForm();
		onClose();
	};

	// Update the ref so panResponder can access it
	handleCloseRef.current = handleClose;

	const handleCreate = () => {
		if (!habitName.trim()) {
			Alert.alert("Missing Information", "Please enter a habit name");
			return;
		}

		if (habitType === "measurable" && (!unit.trim() || !target.trim())) {
			Alert.alert(
				"Missing Information",
				"Please enter unit and target for measurable habit"
			);
			return;
		}

		const newHabit: Habit = {
			id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			name: habitName.trim(),
			description: description.trim(),
			color: selectedColor,
			icon: selectedIcon,
			type: habitType,
			question: question.trim() || `Did you complete ${habitName.trim()}?`,
			unit: habitType === "measurable" ? unit.trim() : undefined,
			target: habitType === "measurable" ? parseFloat(target) : undefined,
			targetType: habitType === "measurable" ? targetType : undefined,
			frequency: {
				type: frequencyType,
				value: parseInt(frequencyValue) || 1,
				secondValue:
					frequencyType === "times_in_x_days"
						? parseInt(frequencySecondValue) || 14
						: undefined,
				days:
					frequencyType === "specific_days"
						? selectedDays
						: frequencyDays.length > 0
						? frequencyDays
						: undefined,
			},
			notificationTime: formatTimeForStorage(selectedTime),
			notificationEnabled,
			alarmEnabled,
			ringtoneEnabled: true,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		onCreateHabit(newHabit);
		resetForm();
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			<TouchableWithoutFeedback onPress={handleClose}>
				<View
					style={{
						flex: 1,
						backgroundColor: "rgba(0,0,0,0.6)",
						justifyContent: "flex-end",
					}}
				>
					<TouchableWithoutFeedback>
						<Animated.View
							style={{
								backgroundColor: theme.surface,
								borderTopLeftRadius: 28,
								borderTopRightRadius: 28,
								paddingBottom: 40,
								maxHeight: height * 0.85,
								transform: [{ translateY }],
							}}
						>
							{/* Modal Handle - Drag to dismiss */}
							<View
								{...panResponder.panHandlers}
								style={{
									alignItems: "center",
									paddingTop: 12,
									paddingBottom: 8,
								}}
							>
								<View
									style={{
										width: 40,
										height: 4,
										borderRadius: 2,
										backgroundColor: theme.border,
									}}
								/>
							</View>

							<ScrollView showsVerticalScrollIndicator={false}>
								<View style={{ padding: 24 }}>
									{/* Header */}
									<View
										style={{
											flexDirection: "row",
											justifyContent: "space-between",
											alignItems: "center",
											marginBottom: 24,
										}}
									>
										<Text
											style={{
												fontSize: 24,
												fontWeight: "700",
												color: theme.text,
											}}
										>
											New Habit
										</Text>
										<TouchableOpacity onPress={handleClose}>
											<Ionicons
												name="close-circle"
												size={32}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									</View>

									{/* Habit Name */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Habit Name *
									</Text>
									<TextInput
										style={{
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											paddingHorizontal: 16,
											paddingVertical: 14,
											fontSize: 16,
											color: theme.text,
											marginBottom: 20,
											borderWidth: 1,
											borderColor: theme.border,
										}}
										placeholder="e.g., Drink 8 glasses of water"
										placeholderTextColor={theme.textMuted}
										value={habitName}
										onChangeText={setHabitName}
									/>

									{/* Description */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Description (Optional)
									</Text>
									<TextInput
										style={{
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											paddingHorizontal: 16,
											paddingVertical: 14,
											fontSize: 16,
											color: theme.text,
											marginBottom: 20,
											height: 80,
											textAlignVertical: "top",
											borderWidth: 1,
											borderColor: theme.border,
										}}
										placeholder="Add more details about your habit..."
										placeholderTextColor={theme.textMuted}
										value={description}
										onChangeText={setDescription}
										multiline
									/>

									{/* Habit Type Selection */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Habit Type *
									</Text>
									<View
										style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
									>
										<TouchableOpacity
											style={{
												flex: 1,
												padding: 16,
												borderRadius: 14,
												backgroundColor:
													habitType === "yesno"
														? theme.primary + "20"
														: theme.surfaceLight,
												borderWidth: 2,
												borderColor:
													habitType === "yesno" ? theme.primary : theme.border,
												alignItems: "center",
											}}
											onPress={() => setHabitType("yesno")}
										>
											<Ionicons
												name="checkmark-circle"
												size={24}
												color={
													habitType === "yesno"
														? theme.primary
														: theme.textMuted
												}
											/>
											<Text
												style={{
													marginTop: 8,
													fontWeight: "600",
													color:
														habitType === "yesno" ? theme.primary : theme.text,
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
													habitType === "measurable"
														? theme.accent + "20"
														: theme.surfaceLight,
												borderWidth: 2,
												borderColor:
													habitType === "measurable"
														? theme.accent
														: theme.border,
												alignItems: "center",
											}}
											onPress={() => setHabitType("measurable")}
										>
											<Ionicons
												name="bar-chart"
												size={24}
												color={
													habitType === "measurable"
														? theme.accent
														: theme.textMuted
												}
											/>
											<Text
												style={{
													marginTop: 8,
													fontWeight: "600",
													color:
														habitType === "measurable"
															? theme.accent
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

									{/* Question Field (for notifications) */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Notification Question
									</Text>
									<TextInput
										style={{
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											paddingHorizontal: 16,
											paddingVertical: 14,
											fontSize: 16,
											color: theme.text,
											marginBottom: 20,
											borderWidth: 1,
											borderColor: theme.border,
										}}
										placeholder={`e.g., Did you ${
											habitName || "complete your habit"
										} today?`}
										placeholderTextColor={theme.textMuted}
										value={question}
										onChangeText={setQuestion}
									/>

									{/* Measurable Habit Fields */}
									{habitType === "measurable" && (
										<>
											<Text
												style={{
													fontSize: 14,
													fontWeight: "600",
													color: theme.textSecondary,
													marginBottom: 8,
												}}
											>
												Unit & Target *
											</Text>
											<View
												style={{
													flexDirection: "row",
													gap: 12,
													marginBottom: 12,
												}}
											>
												<TextInput
													style={{
														flex: 1,
														backgroundColor: theme.surfaceLight,
														borderRadius: 14,
														paddingHorizontal: 16,
														paddingVertical: 14,
														fontSize: 16,
														color: theme.text,
														borderWidth: 1,
														borderColor: theme.border,
													}}
													placeholder="Unit (e.g., glasses, km)"
													placeholderTextColor={theme.textMuted}
													value={unit}
													onChangeText={setUnit}
												/>
												<TextInput
													style={{
														width: 100,
														backgroundColor: theme.surfaceLight,
														borderRadius: 14,
														paddingHorizontal: 16,
														paddingVertical: 14,
														fontSize: 16,
														color: theme.text,
														borderWidth: 1,
														borderColor: theme.border,
													}}
													placeholder="Target"
													placeholderTextColor={theme.textMuted}
													value={target}
													onChangeText={setTarget}
													keyboardType="numeric"
												/>
											</View>

											<Text
												style={{
													fontSize: 14,
													fontWeight: "600",
													color: theme.textSecondary,
													marginBottom: 8,
												}}
											>
												Target Type
											</Text>
											<View
												style={{
													flexDirection: "row",
													gap: 8,
													marginBottom: 20,
													flexWrap: "wrap",
												}}
											>
												{targetTypes.map((type) => (
													<TouchableOpacity
														key={type.value}
														style={{
															paddingHorizontal: 16,
															paddingVertical: 10,
															borderRadius: 20,
															backgroundColor:
																targetType === type.value
																	? theme.primary
																	: theme.surfaceLight,
															borderWidth: 1,
															borderColor:
																targetType === type.value
																	? theme.primary
																	: theme.border,
														}}
														onPress={() =>
															setTargetType(type.value as TargetType)
														}
													>
														<Text
															style={{
																color:
																	targetType === type.value
																		? "#FFFFFF"
																		: theme.text,
																fontWeight: "500",
															}}
														>
															{type.label}
														</Text>
													</TouchableOpacity>
												))}
											</View>
										</>
									)}

									{/* Frequency Selection - Like Reference Image */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Frequency
									</Text>
									<TouchableOpacity
										style={{
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											paddingHorizontal: 16,
											paddingVertical: 14,
											marginBottom: 8,
											borderWidth: 1,
											borderColor: theme.border,
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "space-between",
										}}
										onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={{
													width: 40,
													height: 40,
													borderRadius: 10,
													backgroundColor: selectedColor + "20",
													justifyContent: "center",
													alignItems: "center",
													marginRight: 12,
												}}
											>
												<Ionicons
													name="repeat"
													size={22}
													color={selectedColor}
												/>
											</View>
											<Text style={{ fontSize: 16, color: theme.text }}>
												{getFrequencyLabel()}
											</Text>
										</View>
										<Ionicons
											name={showFrequencyPicker ? "chevron-up" : "chevron-down"}
											size={20}
											color={theme.textMuted}
										/>
									</TouchableOpacity>

									{showFrequencyPicker && (
										<View
											style={{
												backgroundColor: theme.surfaceLight,
												borderRadius: 14,
												padding: 12,
												marginBottom: 20,
												borderWidth: 1,
												borderColor: theme.border,
											}}
										>
											{/* Frequency Options */}
											{frequencyOptions.map((option) => (
												<TouchableOpacity
													key={option.value}
													style={{
														flexDirection: "row",
														alignItems: "center",
														padding: 12,
														borderRadius: 10,
														marginBottom: 8,
														borderWidth: 1,
														borderColor:
															frequencyType === option.value
																? selectedColor
																: theme.border,
														backgroundColor:
															frequencyType === option.value
																? selectedColor + "15"
																: "transparent",
													}}
													onPress={() => {
														setFrequencyType(option.value as FrequencyType);
														if (option.value === "daily")
															setFrequencyValue("1");
														else if (option.value === "times_per_day")
															setFrequencyValue("2");
														else if (option.value === "times_per_week")
															setFrequencyValue("3");
														else if (option.value === "times_per_month")
															setFrequencyValue("10");
														else if (option.value === "every_n_days")
															setFrequencyValue("2");
														else if (option.value === "times_in_x_days") {
															setFrequencyValue("3");
															setFrequencySecondValue("14");
														}
													}}
												>
													<View
														style={{
															width: 36,
															height: 36,
															borderRadius: 8,
															backgroundColor:
																frequencyType === option.value
																	? selectedColor + "20"
																	: theme.border,
															justifyContent: "center",
															alignItems: "center",
															marginRight: 12,
														}}
													>
														<Ionicons
															name={option.icon as any}
															size={20}
															color={
																frequencyType === option.value
																	? selectedColor
																	: theme.textSecondary
															}
														/>
													</View>
													<View style={{ flex: 1 }}>
														<Text
															style={{
																fontSize: 14,
																fontWeight: "600",
																color:
																	frequencyType === option.value
																		? selectedColor
																		: theme.text,
															}}
														>
															{option.label}
														</Text>
														<Text
															style={{
																fontSize: 12,
																color: theme.textSecondary,
																marginTop: 2,
															}}
														>
															{option.description}
														</Text>
													</View>
													{frequencyType === option.value && (
														<Ionicons
															name="checkmark-circle"
															size={22}
															color={selectedColor}
														/>
													)}
												</TouchableOpacity>
											))}

											{/* Specific Days Selector */}
											{frequencyType === "specific_days" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
													}}
												>
													<Text
														style={{
															fontSize: 13,
															fontWeight: "600",
															color: theme.text,
															marginBottom: 10,
														}}
													>
														Select days:
													</Text>
													<View
														style={{
															flexDirection: "row",
															justifyContent: "space-between",
														}}
													>
														{DAY_NAMES.map((day, index) => (
															<TouchableOpacity
																key={day}
																style={{
																	width: 38,
																	height: 38,
																	borderRadius: 19,
																	justifyContent: "center",
																	alignItems: "center",
																	borderWidth: 1,
																	borderColor: selectedDays.includes(index)
																		? selectedColor
																		: theme.border,
																	backgroundColor: selectedDays.includes(index)
																		? selectedColor
																		: "transparent",
																}}
																onPress={() => toggleDay(index)}
															>
																<Text
																	style={{
																		fontSize: 12,
																		fontWeight: "600",
																		color: selectedDays.includes(index)
																			? "#fff"
																			: theme.textSecondary,
																	}}
																>
																	{day}
																</Text>
															</TouchableOpacity>
														))}
													</View>
												</View>
											)}

											{/* Value Selector for times_per_day */}
											{frequencyType === "times_per_day" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
														flexDirection: "row",
														alignItems: "center",
														justifyContent: "space-between",
													}}
												>
													<Text
														style={{
															fontSize: 14,
															fontWeight: "600",
															color: theme.text,
														}}
													>
														Times per day:
													</Text>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															gap: 12,
														}}
													>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(
																		Math.max(1, parseInt(frequencyValue) - 1)
																	)
																)
															}
														>
															<Ionicons
																name="remove"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
														<Text
															style={{
																fontSize: 20,
																fontWeight: "bold",
																color: selectedColor,
																minWidth: 30,
																textAlign: "center",
															}}
														>
															{frequencyValue}
														</Text>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(parseInt(frequencyValue) + 1)
																)
															}
														>
															<Ionicons
																name="add"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
													</View>
												</View>
											)}

											{/* Value Selector for every_n_days */}
											{frequencyType === "every_n_days" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
														flexDirection: "row",
														alignItems: "center",
														justifyContent: "space-between",
													}}
												>
													<Text
														style={{
															fontSize: 14,
															fontWeight: "600",
															color: theme.text,
														}}
													>
														Every N days:
													</Text>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															gap: 12,
														}}
													>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(
																		Math.max(2, parseInt(frequencyValue) - 1)
																	)
																)
															}
														>
															<Ionicons
																name="remove"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
														<Text
															style={{
																fontSize: 20,
																fontWeight: "bold",
																color: selectedColor,
																minWidth: 30,
																textAlign: "center",
															}}
														>
															{frequencyValue}
														</Text>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(parseInt(frequencyValue) + 1)
																)
															}
														>
															<Ionicons
																name="add"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
													</View>
												</View>
											)}

											{/* Value Selector for times_per_week */}
											{frequencyType === "times_per_week" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
														flexDirection: "row",
														alignItems: "center",
														justifyContent: "space-between",
													}}
												>
													<Text
														style={{
															fontSize: 14,
															fontWeight: "600",
															color: theme.text,
														}}
													>
														Times per week:
													</Text>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															gap: 12,
														}}
													>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(
																		Math.max(1, parseInt(frequencyValue) - 1)
																	)
																)
															}
														>
															<Ionicons
																name="remove"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
														<Text
															style={{
																fontSize: 20,
																fontWeight: "bold",
																color: selectedColor,
																minWidth: 30,
																textAlign: "center",
															}}
														>
															{frequencyValue}
														</Text>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(parseInt(frequencyValue) + 1)
																)
															}
														>
															<Ionicons
																name="add"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
													</View>
												</View>
											)}

											{/* Value Selector for times_per_month */}
											{frequencyType === "times_per_month" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
														flexDirection: "row",
														alignItems: "center",
														justifyContent: "space-between",
													}}
												>
													<Text
														style={{
															fontSize: 14,
															fontWeight: "600",
															color: theme.text,
														}}
													>
														Times per month:
													</Text>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															gap: 12,
														}}
													>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(
																		Math.max(1, parseInt(frequencyValue) - 1)
																	)
																)
															}
														>
															<Ionicons
																name="remove"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
														<Text
															style={{
																fontSize: 20,
																fontWeight: "bold",
																color: selectedColor,
																minWidth: 30,
																textAlign: "center",
															}}
														>
															{frequencyValue}
														</Text>
														<TouchableOpacity
															style={{
																width: 36,
																height: 36,
																borderRadius: 18,
																backgroundColor: selectedColor + "20",
																justifyContent: "center",
																alignItems: "center",
															}}
															onPress={() =>
																setFrequencyValue(
																	String(parseInt(frequencyValue) + 1)
																)
															}
														>
															<Ionicons
																name="add"
																size={20}
																color={selectedColor}
															/>
														</TouchableOpacity>
													</View>
												</View>
											)}

											{/* Value Selector for times_in_x_days */}
											{frequencyType === "times_in_x_days" && (
												<View
													style={{
														marginTop: 12,
														padding: 12,
														backgroundColor: theme.background,
														borderRadius: 10,
													}}
												>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															justifyContent: "space-between",
															marginBottom: 12,
														}}
													>
														<Text
															style={{
																fontSize: 14,
																fontWeight: "600",
																color: theme.text,
															}}
														>
															Times:
														</Text>
														<View
															style={{
																flexDirection: "row",
																alignItems: "center",
																gap: 12,
															}}
														>
															<TouchableOpacity
																style={{
																	width: 36,
																	height: 36,
																	borderRadius: 18,
																	backgroundColor: selectedColor + "20",
																	justifyContent: "center",
																	alignItems: "center",
																}}
																onPress={() =>
																	setFrequencyValue(
																		String(
																			Math.max(1, parseInt(frequencyValue) - 1)
																		)
																	)
																}
															>
																<Ionicons
																	name="remove"
																	size={20}
																	color={selectedColor}
																/>
															</TouchableOpacity>
															<Text
																style={{
																	fontSize: 20,
																	fontWeight: "bold",
																	color: selectedColor,
																	minWidth: 30,
																	textAlign: "center",
																}}
															>
																{frequencyValue}
															</Text>
															<TouchableOpacity
																style={{
																	width: 36,
																	height: 36,
																	borderRadius: 18,
																	backgroundColor: selectedColor + "20",
																	justifyContent: "center",
																	alignItems: "center",
																}}
																onPress={() =>
																	setFrequencyValue(
																		String(parseInt(frequencyValue) + 1)
																	)
																}
															>
																<Ionicons
																	name="add"
																	size={20}
																	color={selectedColor}
																/>
															</TouchableOpacity>
														</View>
													</View>
													<View
														style={{
															flexDirection: "row",
															alignItems: "center",
															justifyContent: "space-between",
														}}
													>
														<Text
															style={{
																fontSize: 14,
																fontWeight: "600",
																color: theme.text,
															}}
														>
															In days:
														</Text>
														<View
															style={{
																flexDirection: "row",
																alignItems: "center",
																gap: 12,
															}}
														>
															<TouchableOpacity
																style={{
																	width: 36,
																	height: 36,
																	borderRadius: 18,
																	backgroundColor: selectedColor + "20",
																	justifyContent: "center",
																	alignItems: "center",
																}}
																onPress={() =>
																	setFrequencySecondValue(
																		String(
																			Math.max(
																				1,
																				parseInt(frequencySecondValue) - 1
																			)
																		)
																	)
																}
															>
																<Ionicons
																	name="remove"
																	size={20}
																	color={selectedColor}
																/>
															</TouchableOpacity>
															<Text
																style={{
																	fontSize: 20,
																	fontWeight: "bold",
																	color: selectedColor,
																	minWidth: 30,
																	textAlign: "center",
																}}
															>
																{frequencySecondValue}
															</Text>
															<TouchableOpacity
																style={{
																	width: 36,
																	height: 36,
																	borderRadius: 18,
																	backgroundColor: selectedColor + "20",
																	justifyContent: "center",
																	alignItems: "center",
																}}
																onPress={() =>
																	setFrequencySecondValue(
																		String(parseInt(frequencySecondValue) + 1)
																	)
																}
															>
																<Ionicons
																	name="add"
																	size={20}
																	color={selectedColor}
																/>
															</TouchableOpacity>
														</View>
													</View>
												</View>
											)}

											{/* Done Button */}
											<TouchableOpacity
												style={{
													alignItems: "center",
													paddingVertical: 12,
													marginTop: 8,
													backgroundColor: selectedColor,
													borderRadius: 10,
												}}
												onPress={() => setShowFrequencyPicker(false)}
											>
												<Text
													style={{
														fontSize: 15,
														fontWeight: "600",
														color: "#fff",
													}}
												>
													Done
												</Text>
											</TouchableOpacity>
										</View>
									)}

									{/* Time Picker Section */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 8,
										}}
									>
										Reminder Time
									</Text>
									<TouchableOpacity
										style={{
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											padding: 16,
											marginBottom: 20,
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "space-between",
											borderWidth: 1,
											borderColor: theme.border,
										}}
										onPress={() => setShowTimePicker(true)}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={{
													width: 44,
													height: 44,
													borderRadius: 12,
													backgroundColor: theme.primary + "20",
													justifyContent: "center",
													alignItems: "center",
													marginRight: 12,
												}}
											>
												<Ionicons
													name="time-outline"
													size={22}
													color={theme.primary}
												/>
											</View>
											<View>
												<Text
													style={{
														fontSize: 16,
														fontWeight: "600",
														color: theme.text,
													}}
												>
													{formatTime(selectedTime)}
												</Text>
												<Text style={{ fontSize: 13, color: theme.textMuted }}>
													Tap to change
												</Text>
											</View>
										</View>
										<Ionicons
											name="chevron-forward"
											size={20}
											color={theme.textMuted}
										/>
									</TouchableOpacity>

									{/* Time Picker (iOS shows inline, Android shows dialog) */}
									{showTimePicker && (
										<View
											style={{
												backgroundColor: theme.surfaceLight,
												borderRadius: 14,
												marginBottom: 20,
												overflow: "hidden",
											}}
										>
											<DateTimePicker
												value={selectedTime}
												mode="time"
												display={Platform.OS === "ios" ? "spinner" : "default"}
												onChange={handleTimeChange}
												textColor={theme.text}
												themeVariant={theme.mode}
											/>
											{Platform.OS === "ios" && (
												<TouchableOpacity
													style={{
														padding: 14,
														backgroundColor: theme.primary,
														alignItems: "center",
													}}
													onPress={() => setShowTimePicker(false)}
												>
													<Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
														Done
													</Text>
												</TouchableOpacity>
											)}
										</View>
									)}

									{/* Notification Toggle */}
									<View
										style={{
											flexDirection: "row",
											justifyContent: "space-between",
											alignItems: "center",
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											padding: 16,
											marginBottom: 20,
											borderWidth: 1,
											borderColor: theme.border,
										}}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={{
													width: 44,
													height: 44,
													borderRadius: 12,
													backgroundColor: theme.accent + "20",
													justifyContent: "center",
													alignItems: "center",
													marginRight: 12,
												}}
											>
												<Ionicons
													name="notifications-outline"
													size={22}
													color={theme.accent}
												/>
											</View>
											<View>
												<Text
													style={{
														fontSize: 16,
														fontWeight: "600",
														color: theme.text,
													}}
												>
													Push Notifications
												</Text>
												<Text style={{ fontSize: 13, color: theme.textMuted }}>
													Get reminded daily
												</Text>
											</View>
										</View>
										<TouchableOpacity
											style={{
												width: 52,
												height: 30,
												borderRadius: 15,
												backgroundColor: notificationEnabled
													? theme.primary
													: theme.border,
												padding: 2,
												justifyContent: "center",
											}}
											onPress={() =>
												setNotificationEnabled(!notificationEnabled)
											}
										>
											<View
												style={{
													width: 26,
													height: 26,
													borderRadius: 13,
													backgroundColor: "#FFFFFF",
													alignSelf: notificationEnabled
														? "flex-end"
														: "flex-start",
												}}
											/>
										</TouchableOpacity>
									</View>

									{/* Alarm Toggle */}
									<View
										style={{
											flexDirection: "row",
											justifyContent: "space-between",
											alignItems: "center",
											backgroundColor: theme.surfaceLight,
											borderRadius: 14,
											padding: 16,
											marginBottom: 20,
											borderWidth: 1,
											borderColor: theme.border,
										}}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={{
													width: 44,
													height: 44,
													borderRadius: 12,
													backgroundColor: theme.warning + "20",
													justifyContent: "center",
													alignItems: "center",
													marginRight: 12,
												}}
											>
												<Ionicons
													name="alarm-outline"
													size={22}
													color={theme.warning}
												/>
											</View>
											<View>
												<Text
													style={{
														fontSize: 16,
														fontWeight: "600",
														color: theme.text,
													}}
												>
													Alarm
												</Text>
												<Text style={{ fontSize: 13, color: theme.textMuted }}>
													Wake up with sound
												</Text>
											</View>
										</View>
										<TouchableOpacity
											style={{
												width: 52,
												height: 30,
												borderRadius: 15,
												backgroundColor: alarmEnabled
													? theme.warning
													: theme.border,
												padding: 2,
												justifyContent: "center",
											}}
											onPress={() => setAlarmEnabled(!alarmEnabled)}
										>
											<View
												style={{
													width: 26,
													height: 26,
													borderRadius: 13,
													backgroundColor: "#FFFFFF",
													alignSelf: alarmEnabled ? "flex-end" : "flex-start",
												}}
											/>
										</TouchableOpacity>
									</View>

									{/* Color Picker */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 12,
										}}
									>
										Choose Color
									</Text>
									<View
										style={{
											flexDirection: "row",
											flexWrap: "wrap",
											gap: 12,
											marginBottom: 28,
										}}
									>
										{habitColors.map((item) => (
											<TouchableOpacity
												key={item.color}
												style={{
													width: 48,
													height: 48,
													borderRadius: 24,
													backgroundColor: item.color,
													justifyContent: "center",
													alignItems: "center",
													borderWidth: selectedColor === item.color ? 3 : 0,
													borderColor: theme.text,
												}}
												onPress={() => setSelectedColor(item.color)}
											>
												{selectedColor === item.color && (
													<Ionicons
														name="checkmark"
														size={24}
														color="#FFFFFF"
													/>
												)}
											</TouchableOpacity>
										))}
									</View>

									{/* Icon Picker */}
									<Text
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: theme.textSecondary,
											marginBottom: 12,
										}}
									>
										Choose Icon
									</Text>
									<View
										style={{
											flexWrap: "wrap",
											display: "flex",
											flexDirection: "row",
											gap: 2,
										}}
									>
										{habitIcons.map((item) => (
											<TouchableOpacity
												key={item.icon}
												style={{
													width: "12%",
													aspectRatio: 1,
													borderRadius: 12,
													backgroundColor:
														selectedIcon === item.icon
															? selectedColor + "30"
															: theme.surfaceLight,
													justifyContent: "center",
													alignItems: "center",
													borderWidth: selectedIcon === item.icon ? 2 : 1,
													borderColor:
														selectedIcon === item.icon
															? selectedColor
															: theme.border,
													marginBottom: 8,
												}}
												onPress={() => setSelectedIcon(item.icon)}
											>
												<Ionicons
													name={item.icon as any}
													size={22}
													color={
														selectedIcon === item.icon
															? selectedColor
															: theme.textSecondary
													}
												/>
											</TouchableOpacity>
										))}
									</View>

									{/* Bottom spacing for sticky buttons */}
									<View style={{ height: 20 }} />
								</View>
							</ScrollView>

							{/* Sticky Action Buttons */}
							<View
								style={{
									flexDirection: "row",
									gap: 12,
									paddingHorizontal: 24,
									paddingTop: 16,
									paddingBottom: 20,
									borderTopWidth: 1,
									borderTopColor: theme.border,
									backgroundColor: theme.surface,
								}}
							>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 16,
										borderRadius: 14,
										backgroundColor: theme.surfaceLight,
										alignItems: "center",
										borderWidth: 1,
										borderColor: theme.border,
									}}
									onPress={onClose}
								>
									<Text
										style={{
											fontSize: 16,
											fontWeight: "600",
											color: theme.textSecondary,
										}}
									>
										Cancel
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{
										flex: 1,
										paddingVertical: 16,
										borderRadius: 14,
										backgroundColor: selectedColor,
										alignItems: "center",
										flexDirection: "row",
										justifyContent: "center",
										gap: 8,
									}}
									onPress={handleCreate}
								>
									<Ionicons
										name="add-circle-outline"
										size={20}
										color="#FFFFFF"
									/>
									<Text
										style={{
											fontSize: 16,
											fontWeight: "600",
											color: "#FFFFFF",
										}}
									>
										Create Habit
									</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

// Dynamic styles based on theme
const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
		},
		// Module Cards
		moduleCardsSection: {
			paddingHorizontal: 16,
			paddingTop: 8,
			paddingBottom: 16,
		},
		moduleCard: {
			backgroundColor: theme.primary,
			borderRadius: 20,
			overflow: "hidden",
		},
		moduleCardGradient: {
			flexDirection: "row",
			alignItems: "center",
			padding: 16,
		},
		moduleIconContainer: {
			width: 52,
			height: 52,
			borderRadius: 14,
			backgroundColor: "rgba(255,255,255,0.2)",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		moduleContent: {
			flex: 1,
		},
		moduleTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		moduleSubtitle: {
			fontSize: 13,
			color: "rgba(255,255,255,0.8)",
			marginTop: 2,
		},
		moduleArrow: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: "rgba(255,255,255,0.15)",
			justifyContent: "center",
			alignItems: "center",
		},
		moduleActivePlan: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "rgba(0,0,0,0.15)",
			paddingVertical: 8,
			paddingHorizontal: 16,
			gap: 6,
		},
		moduleActivePlanText: {
			fontSize: 12,
			fontWeight: "500",
			color: "rgba(255,255,255,0.9)",
		},
		// Sort Menu Popover
		sortMenuOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.3)",
			zIndex: 50,
		},
		sortMenuPopover: {
			position: "absolute",
			top: 100,
			right: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingVertical: 8,
			minWidth: 200,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.25,
			shadowRadius: 8,
			elevation: 8,
			zIndex: 51,
			borderWidth: 1,
			borderColor: theme.border,
		},
		sortMenu: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			marginHorizontal: 16,
			marginBottom: 12,
			paddingVertical: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		sortMenuTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			textTransform: "uppercase",
			paddingHorizontal: 16,
			paddingVertical: 8,
			letterSpacing: 0.5,
		},
		sortMenuItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			gap: 12,
		},
		sortMenuItemActive: {
			backgroundColor: theme.primary + "15",
		},
		sortMenuItemText: {
			flex: 1,
			fontSize: 15,
			color: theme.text,
		},
		sortMenuItemTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},
		// Search (kept for potential future use)
		searchContainer: {
			paddingHorizontal: 20,
			paddingBottom: 12,
		},
		searchBar: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 10,
		},
		searchInput: {
			flex: 1,
			fontSize: 16,
			color: theme.text,
		},

		// Drawer
		drawerOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.5)",
			zIndex: 100,
		},
		drawer: {
			position: "absolute",
			top: 0,
			left: 0,
			bottom: 0,
			width: width * 0.8,
			backgroundColor: theme.surface,
			zIndex: 101,
			paddingTop: 60,
		},
		drawerHeader: {
			alignItems: "center",
			paddingHorizontal: 24,
			paddingBottom: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		drawerAvatar: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		drawerAvatarImage: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 12,
		},
		drawerName: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		drawerEmail: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},
		drawerContent: {
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		drawerSectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.textMuted,
			letterSpacing: 1,
			marginBottom: 12,
			marginLeft: 4,
		},
		drawerItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 14,
			borderRadius: 16,
			marginBottom: 8,
			backgroundColor: theme.surfaceLight,
		},
		drawerItemActive: {
			backgroundColor: theme.primary + "15",
			borderWidth: 1,
			borderColor: theme.primary + "30",
		},
		drawerItemIconNew: {
			width: 42,
			height: 42,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		drawerItemIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 14,
		},
		drawerItemContent: {
			flex: 1,
		},
		drawerItemText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		drawerItemTextActive: {
			color: theme.primary,
		},
		drawerItemSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		drawerItemBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		drawerDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 16,
			marginHorizontal: 4,
		},
		drawerFooter: {
			position: "absolute",
			bottom: 40,
			left: 24,
			right: 24,
		},
		themeToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surfaceLight,
			padding: 16,
			borderRadius: 14,
		},
		themeToggleLabel: {
			flexDirection: "row",
			alignItems: "center",
		},
		themeToggleText: {
			fontSize: 16,
			fontWeight: "500",
			color: theme.text,
			marginLeft: 12,
		},
		toggle: {
			width: 52,
			height: 30,
			borderRadius: 15,
			backgroundColor: theme.border,
			padding: 2,
			justifyContent: "center",
		},
		toggleOn: {
			backgroundColor: theme.primary,
		},
		toggleThumb: {
			width: 26,
			height: 26,
			borderRadius: 13,
			backgroundColor: "#FFFFFF",
			alignSelf: "flex-start",
		},
		toggleThumbOn: {
			alignSelf: "flex-end",
		},

		// Header
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 10,
			paddingBottom: 10,
		},
		menuButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		headerRight: {
			flexDirection: "row",
			gap: 8,
		},
		iconButton: {
			width: 44,
			height: 44,
			borderRadius: 14,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
		},
		notificationBadge: {
			position: "absolute",
			top: 10,
			right: 10,
			width: 8,
			height: 8,
			borderRadius: 4,
			backgroundColor: theme.error,
		},

		// Greeting
		greetingSection: {
			paddingHorizontal: 20,
			marginTop: 16,
			marginBottom: 20,
		},
		greetingText: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		userName: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.text,
			marginTop: 4,
		},

		// Progress Card
		progressCard: {
			marginHorizontal: 20,
			backgroundColor: theme.primary,
			borderRadius: 24,
			padding: 20,
			marginBottom: 24,
		},
		progressHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		progressTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFFFFF",
			opacity: 0.9,
		},
		progressDate: {
			fontSize: 14,
			color: "#FFFFFF",
			opacity: 0.7,
		},
		progressContent: {
			flexDirection: "row",
			alignItems: "center",
		},
		progressCircle: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: "rgba(255,255,255,0.2)",
			justifyContent: "center",
			alignItems: "center",
		},
		progressPercent: {
			fontSize: 24,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		progressLabel: {
			fontSize: 11,
			color: "#FFFFFF",
			opacity: 0.8,
		},
		progressStats: {
			flex: 1,
			marginLeft: 20,
		},
		progressStat: {
			marginBottom: 8,
		},
		progressStatValue: {
			fontSize: 20,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		progressStatLabel: {
			fontSize: 13,
			color: "#FFFFFF",
			opacity: 0.7,
		},

		// Calendar
		calendarSection: {
			paddingHorizontal: 20,
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 16,
		},
		weekCalendar: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		dayItem: {
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 12,
			borderRadius: 14,
			backgroundColor: theme.surface,
		},
		dayItemSelected: {
			backgroundColor: theme.primary,
		},
		dayItemToday: {
			borderWidth: 2,
			borderColor: theme.primary,
		},
		dayName: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 6,
		},
		dayNameSelected: {
			color: "#FFFFFF",
		},
		dayNumber: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		dayNumberSelected: {
			color: "#FFFFFF",
		},
		todayDot: {
			width: 4,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.primary,
			marginTop: 4,
		},

		// Habits
		habitsSection: {
			flex: 1,
			paddingBottom: 40,
		},
		habitTableHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 12,
		},
		habitsTitle: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		dayHeaders: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			marginBottom: 8,
		},
		dateNavLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		dateNavButton: {
			padding: 6,
			borderRadius: 8,
		},
		dateNavButtonDisabled: {
			opacity: 0.3,
		},
		backToTodayButton: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
			backgroundColor: theme.primary + "15",
			marginLeft: 4,
		},
		backToTodayText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		dayHeadersRight: {
			flexDirection: "row",
			gap: 8,
		},
		dayHeader: {
			width: 28,
			alignItems: "center",
			paddingVertical: 4,
			borderRadius: 8,
		},
		dayHeaderToday: {
			backgroundColor: theme.primary + "20",
		},
		dayHeaderText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textMuted,
		},
		dayHeaderTextToday: {
			color: theme.primary,
		},
		dayHeaderNumber: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		dayHeaderNumberToday: {
			color: theme.primary,
			fontWeight: "700",
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: 20,
			paddingBottom: 12,
		},
		habitsList: {
			paddingHorizontal: 16,
			maxHeight: height * 0.5, // Make scrollable if many habits
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 40,
			marginHorizontal: 20,
			backgroundColor: theme.surface,
			borderRadius: 20,
			borderWidth: 2,
			borderColor: theme.border,
			borderStyle: "dashed",
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},

		// Featured Card
		featuredCard: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 20,
			marginBottom: 16,
		},
		featuredHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		featuredIcon: {
			width: 52,
			height: 52,
			borderRadius: 16,
			justifyContent: "center",
			alignItems: "center",
		},
		featuredBadge: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.warning + "20",
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 20,
		},
		featuredBadgeText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.warning,
			marginLeft: 4,
		},
		featuredTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 8,
		},
		featuredMeta: {
			fontSize: 14,
			color: theme.textMuted,
			marginBottom: 16,
		},
		featuredActions: {
			flexDirection: "row",
		},
		featuredButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surfaceLight,
			paddingVertical: 14,
			borderRadius: 14,
			gap: 8,
		},
		featuredButtonCompleted: {
			backgroundColor: theme.success + "20",
		},
		featuredButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		featuredButtonTextCompleted: {
			color: theme.success,
		},
	});
