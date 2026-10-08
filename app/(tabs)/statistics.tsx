import { Alert } from "@/src/components/CustomAlert";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import {
	HabitFormModal,
	HabitFormValues,
} from "@/src/components/habits/HabitFormModal";
import { describeFrequency, normalizeFrequency } from "@/src/utils/frequency";
import { DayProgress } from "@/src/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
	Dimensions,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { createStyles } from "@/src/styles/statisticsScreen.styles";

// Local calendar date as "YYYY-MM-DD", matching DayProgress.date. toISOString()
// would shift the day for anyone not on UTC.
const toDateKey = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(date.getDate()).padStart(2, "0")}`;

const { width } = Dimensions.get("window");

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

	const [showEditModal, setShowEditModal] = useState(false);

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

	const habitStats = selectedHabit ? stats.get(selectedHabit.id) : null;

	// Get habit logs for the selected habit
	const habitLogs = useMemo(() => {
		if (!selectedHabit) return [];
		return logs.filter((log) => log.habitId === selectedHabit.id);
	}, [selectedHabit?.id, logs]);

	// ---------------------------------------------------------------------
	// Everything below is derived from habitStats.days - one entry per calendar
	// day, carrying `done`, `target` and `active`. Two rules apply throughout:
	//
	//   1. A day is complete when done >= target, not when a single log exists.
	//      A 3x/day habit tapped once is 1/3, not done.
	//   2. A day the habit is not scheduled on (a Mon/Wed/Fri habit on a
	//      Tuesday) is excluded from every rate and skipped by streaks. It is
	//      not a miss.
	// ---------------------------------------------------------------------

	const days: DayProgress[] = habitStats?.days || [];

	const dayByDate = useMemo(() => {
		const map = new Map<string, DayProgress>();
		for (const d of days) map.set(d.date, d);
		return map;
	}, [days]);

	// Days that fall inside the selected period, oldest first.
	const daysForPeriod = (period: "Week" | "Month" | "Year"): DayProgress[] =>
		period === "Week"
			? days.slice(-7)
			: period === "Month"
			? days.slice(-30)
			: days;

	/** Completed / scheduled, as a percentage. Unscheduled days do not count. */
	const rateOf = (window: DayProgress[]): number => {
		const due = window.filter((d) => d.active);
		if (due.length === 0) return 0;
		return Math.round(
			(due.filter((d) => d.completed).length / due.length) * 100
		);
	};

	const getScoreForPeriod = () => rateOf(daysForPeriod(selectedPeriod));

	// How many days the score above is actually based on. Shown under the ring
	// so a 100% built on two days is not mistaken for a 100% built on thirty.
	const getScoreBasis = () => {
		const due = daysForPeriod(selectedPeriod).filter((d) => d.active);
		const done = due.filter((d) => d.completed).length;
		return `${done} of ${due.length} scheduled day${
			due.length === 1 ? "" : "s"
		}`;
	};

	// Score per day, as a fraction of that day's own target. Partial progress on
	// a multi-target habit shows as a partial point rather than a flat miss.
	const getScoreChartData = () => {
		const window = daysForPeriod(selectedPeriod);

		if (selectedPeriod === "Year") {
			// A year of daily points is unreadable; aggregate into months.
			const buckets = new Map<string, { due: number; done: number }>();
			for (const d of window) {
				if (!d.active) continue;
				const key = d.date.slice(0, 7);
				const b = buckets.get(key) || { due: 0, done: 0 };
				b.due++;
				if (d.completed) b.done++;
				buckets.set(key, b);
			}
			return Array.from(buckets.entries()).map(([key, b]) => ({
				date: new Date(`${key}-01T00:00:00`),
				percent: b.due ? Math.round((b.done / b.due) * 100) : 0,
				completed: b.due > 0 && b.done === b.due,
				active: true,
			}));
		}

		return window.map((d) => ({
			date: new Date(`${d.date}T00:00:00`),
			percent: d.active
				? Math.min(100, Math.round((d.done / Math.max(1, d.target)) * 100))
				: 0,
			completed: d.completed,
			active: d.active,
		}));
	};

	// Completed days per bucket: weeks for Week/Month, months for Year.
	const getHistoryChartData = () => {
		const window = daysForPeriod(historyPeriod);
		const buckets: { label: string; count: number }[] = [];

		if (historyPeriod === "Year") {
			const byMonth = new Map<string, number>();
			for (const d of window) {
				const key = d.date.slice(0, 7);
				byMonth.set(key, (byMonth.get(key) || 0) + (d.completed ? 1 : 0));
			}
			for (const [key, count] of byMonth) {
				buckets.push({
					label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", {
						month: "short",
					}),
					count,
				});
			}
			return buckets;
		}

		// Chunk into weeks from the OLDEST day, so the final bar is the current
		// (possibly partial) week rather than an arbitrary offset.
		for (let i = 0; i < window.length; i += 7) {
			const chunk = window.slice(i, i + 7);
			buckets.push({
				label: `W${Math.floor(i / 7) + 1}`,
				count: chunk.filter((d) => d.completed).length,
			});
		}
		return buckets;
	};

	// Generate calendar data for 4 months
	const getCalendarData = () => {
		const months: {
			name: string;
			year: number;
			days: {
				date: Date;
				day: DayProgress | undefined;
				isCurrentMonth: boolean;
			}[][];
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
				day: DayProgress | undefined;
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
				day: DayProgress | undefined;
				isCurrentMonth: boolean;
			}[] = [];
			let currentDate = new Date(startDate);

			while (currentDate <= lastDay || currentWeek.length > 0) {
				const isCurrentMonth = currentDate.getMonth() === monthDate.getMonth();

				currentWeek.push({
					date: new Date(currentDate),
					day: isCurrentMonth
						? dayByDate.get(toDateKey(currentDate))
						: undefined,
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

	// Best streaks: runs of consecutive SCHEDULED days completed. Unscheduled
	// days are stepped over, so a Mon/Wed/Fri habit can build a streak at all -
	// the old version counted raw log dates, and every Tuesday reset it to 1.
	const getBestStreaks = () => {
		const scheduled = days.filter((d) => d.active);
		const runs: { startDate: Date; endDate: Date; count: number }[] = [];
		let run: DayProgress[] = [];

		const flush = () => {
			if (run.length === 0) return;
			runs.push({
				startDate: new Date(`${run[0].date}T00:00:00`),
				endDate: new Date(`${run[run.length - 1].date}T00:00:00`),
				count: run.length,
			});
			run = [];
		};

		for (const day of scheduled) {
			if (day.completed) run.push(day);
			else flush();
		}
		flush();

		return runs.sort((a, b) => b.count - a.count).slice(0, 5);
	};

	// Which weekdays this habit actually gets done on, over the last 12 months.
	// Each cell is a ratio, so a faint cell means "often missed" rather than
	// "never attempted" - the old grid was a boolean and lit up on one log.
	const getFrequencyData = () => {
		const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		const today = new Date();
		const monthNames: string[] = [];
		const monthKeys: string[] = [];

		for (let i = 11; i >= 0; i--) {
			const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
			monthNames.push(d.toLocaleDateString("en-US", { month: "short" }));
			monthKeys.push(
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
			);
		}

		// key: "<monthIdx>|<dayOfWeek 0=Mon>" -> completed / scheduled
		const cells = new Map<string, { due: number; done: number }>();
		for (const d of days) {
			if (!d.active) continue;
			const monthIdx = monthKeys.indexOf(d.date.slice(0, 7));
			if (monthIdx === -1) continue;
			const date = new Date(`${d.date}T00:00:00`);
			const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
			const key = `${monthIdx}|${dayOfWeek}`;
			const cell = cells.get(key) || { due: 0, done: 0 };
			cell.due++;
			if (d.completed) cell.done++;
			cells.set(key, cell);
		}

		return { dayNames, monthNames, cells };
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

	const handleSaveEdit = async (values: HabitFormValues) => {
		if (!selectedHabit) return;

		// Reminders are rescheduled from scratch so time/frequency edits take
		// effect immediately instead of waiting for the next app launch.
		try {
			await NotificationService.cancelHabitNotifications(selectedHabit.id);
			if (values.notificationEnabled) {
				await NotificationService.scheduleHabitReminders({
					id: selectedHabit.id,
					name: values.name,
					notificationTime: values.notificationTime,
					frequency: values.frequency,
					question: values.question || undefined,
					alarmEnabled: values.alarmEnabled,
				});
			}
		} catch (error) {
			console.error("Failed to reschedule habit reminders:", error);
		}

		await updateHabit(selectedHabit.id, {
			...values,
			question: values.question || undefined,
			reminderEnabled: values.notificationEnabled,
		});

		Alert.alert("Success", "Habit updated successfully!");
	};

	const scorePercentage = getScoreForPeriod();
	const calendarData = getCalendarData();
	const bestStreaks = getBestStreaks();
	const frequencyData = getFrequencyData();
	const scoreChartData = getScoreChartData();

	if (!selectedHabit) {
		return (
			<View style={styles.container}>
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
			</View>
		);
	}

	return (
		<View style={styles.container}>
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
								{describeFrequency(
									normalizeFrequency(
										selectedHabit.frequency,
										selectedHabit.notificationTime
									),
									selectedHabit.notificationTime
								)}
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
						<Text style={styles.scoreBasis}>{getScoreBasis()}</Text>

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
									{habitStats?.currentStreak || 0}
								</Text>
								<Text style={styles.overviewLabel}>Streak</Text>
							</View>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{habitStats?.longestStreak || 0}
								</Text>
								<Text style={styles.overviewLabel}>Best</Text>
							</View>
							<View style={styles.overviewStat}>
								<Text
									style={[styles.overviewValue, { color: selectedHabit.color }]}
								>
									{habitStats?.totalCompleted || 0}
								</Text>
								<Text style={styles.overviewLabel}>Days done</Text>
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
												backgroundColor: !point.active
													? theme.border
													: point.completed
													? selectedHabit.color
													: point.percent > 0
													? selectedHabit.color + "70"
													: theme.textMuted,
												bottom: `${point.percent}%`,
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
							{(() => {
								const bars = getHistoryChartData();
								const max = Math.max(1, ...bars.map((b) => b.count));
								return bars.map((item, index) => (
									<View key={index} style={styles.barWrapper}>
										<Text style={styles.barValue}>
											{item.count > 0 ? item.count : ""}
										</Text>
										<View
											style={[
												styles.bar,
												{
													height: `${(item.count / max) * 100}%`,
													backgroundColor: selectedHabit.color,
												},
											]}
										/>
										<Text style={styles.barLabel}>{item.label}</Text>
									</View>
								));
							})()}
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
													{month.days.map((week, weekIdx) => {
														const cell = week[dayIdx];
														const dp = cell?.day;
														// Partial progress on a multi-target habit gets a
														// proportional tint; a day the habit does not run
														// on stays blank rather than reading as a miss.
														const ratio =
															dp && dp.target > 0
																? Math.min(1, dp.done / dp.target)
																: 0;
														const fill = dp?.completed
															? selectedHabit.color
															: ratio > 0
															? selectedHabit.color +
															  Math.round(0x20 + ratio * 0x70)
																	.toString(16)
																	.padStart(2, "0")
															: undefined;
														return (
															<View
																key={weekIdx}
																style={[
																	styles.calendarDay,
																	fill ? { backgroundColor: fill } : null,
																	dp && !dp.active ? styles.inactiveDay : null,
																	!cell?.isCurrentMonth &&
																		styles.otherMonthDay,
																]}
															>
																<Text
																	style={[
																		styles.calendarDayText,
																		dp?.completed &&
																			styles.calendarDayTextCompleted,
																	]}
																>
																	{cell?.date.getDate()}
																</Text>
															</View>
														);
													})}
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
													// Relative to the best streak, so the bars compare
													// against each other rather than a fixed 10-day scale
													// that pinned everything past 10 to full width.
													width: `${Math.max(
														8,
														(streak.count / bestStreaks[0].count) * 100
													)}%`,
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
										const cell = frequencyData.cells.get(
											`${monthIdx}|${dayIdx}`
										);
										const ratio = cell?.due ? cell.done / cell.due : 0;
										return (
											<View
												key={`${day}-${month}-${monthIdx}`}
												style={[
													styles.frequencyDot,
													ratio > 0 && {
														backgroundColor:
															selectedHabit.color +
															Math.round(0x30 + ratio * 0xcf)
																.toString(16)
																.padStart(2, "0"),
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

			<HabitFormModal
				visible={showEditModal}
				habit={selectedHabit}
				onClose={() => setShowEditModal(false)}
				onSubmit={handleSaveEdit}
			/>
		</View>
	);
}
