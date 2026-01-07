// Study Analytics - Charts and Statistics

import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useStudyStore } from "@/src/context/studyStoreDB/index";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
	Dimensions,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

interface StudyAnalyticsProps {
	theme: Theme;
	onOpenDrawer?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	currentMonthSessionCount: number;
}

type TimeRange = "week" | "month" | "year" | "all";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export default function StudyAnalytics({
	theme,
	onOpenDrawer,
	subscriptionCheck,
	currentMonthSessionCount,
}: StudyAnalyticsProps) {
	const {
		studyGoals,
		subjects,
		studySessions,
		streak: studyStreak,
		flashcards,
		flashcardDecks,
	} = useStudyStore();

	const styles = createStyles(theme);
	const [timeRange, setTimeRange] = useState<TimeRange>("week");

	// Calculate date range
	const dateRange = useMemo(() => {
		const now = new Date();
		const end = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59
		);
		let start = new Date();

		switch (timeRange) {
			case "week":
				start = new Date(end);
				start.setDate(start.getDate() - 6);
				start.setHours(0, 0, 0, 0);
				break;
			case "month":
				start = new Date(end.getFullYear(), end.getMonth(), 1);
				break;
			case "year":
				start = new Date(end.getFullYear(), 0, 1);
				break;
			case "all":
				start = new Date(2020, 0, 1);
				break;
		}

		return { start, end };
	}, [timeRange]);

	// Filter sessions by date range
	const filteredSessions = useMemo(() => {
		return studySessions.filter((session) => {
			const sessionDate = new Date(session.startTime);
			return sessionDate >= dateRange.start && sessionDate <= dateRange.end;
		});
	}, [studySessions, dateRange]);

	// Total study time
	const totalMinutes = useMemo(() => {
		return filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
	}, [filteredSessions]);

	const totalHours = Math.floor(totalMinutes / 60);
	const remainingMinutes = Math.round(totalMinutes % 60);

	// Average session duration
	const avgSessionDuration = useMemo(() => {
		if (filteredSessions.length === 0) return 0;
		return Math.round(totalMinutes / filteredSessions.length);
	}, [filteredSessions, totalMinutes]);

	// Average focus score
	const avgFocusScore = useMemo(() => {
		const sessionsWithFocus = filteredSessions.filter((s) => s.focusScore);
		if (sessionsWithFocus.length === 0) return 0;
		const total = sessionsWithFocus.reduce(
			(acc, s) => acc + (s.focusScore || 0),
			0
		);
		return (total / sessionsWithFocus.length).toFixed(1);
	}, [filteredSessions]);

	// Total pomodoros
	const totalPomodoros = useMemo(() => {
		return filteredSessions.reduce((acc, s) => acc + (s.pomodoroCount || 0), 0);
	}, [filteredSessions]);

	// Daily study time for chart (last 7 days)
	const dailyData = useMemo(() => {
		const data: { day: string; minutes: number; date: Date }[] = [];
		const now = new Date();

		for (let i = 6; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			date.setHours(0, 0, 0, 0);

			const nextDay = new Date(date);
			nextDay.setDate(nextDay.getDate() + 1);

			const dayMinutes = studySessions
				.filter((s) => {
					const sessionDate = new Date(s.startTime);
					return sessionDate >= date && sessionDate < nextDay;
				})
				.reduce((acc, s) => acc + (s.duration || 0), 0);

			data.push({
				day: DAYS[date.getDay()],
				minutes: dayMinutes,
				date,
			});
		}

		return data;
	}, [studySessions]);

	const maxDailyMinutes = Math.max(...dailyData.map((d) => d.minutes), 1);

	// Subject distribution
	const subjectDistribution = useMemo(() => {
		const distribution: { [key: string]: number } = {};

		filteredSessions.forEach((session) => {
			if (session.subjectId) {
				distribution[session.subjectId] =
					(distribution[session.subjectId] || 0) + (session.duration || 0);
			}
		});

		return Object.entries(distribution)
			.map(([subjectId, minutes]) => {
				const subject = subjects.find((s) => s.id === subjectId);
				return {
					id: subjectId,
					name: subject?.name || "Unknown",
					color: subject?.color || theme.primary,
					minutes,
					percentage: Math.round((minutes / totalMinutes) * 100) || 0,
				};
			})
			.sort((a, b) => b.minutes - a.minutes)
			.slice(0, 5);
	}, [filteredSessions, subjects, totalMinutes]);

	// Goal progress
	const goalProgress = useMemo(() => {
		return studyGoals
			.filter((g) => g.status === "in_progress")
			.map((goal) => {
				const goalSubjects = subjects.filter((s) => s.goalId === goal.id);
				const totalProgress = goalSubjects.reduce(
					(acc, s) => acc + (s.progress || 0),
					0
				);
				const avgProgress =
					goalSubjects.length > 0
						? Math.round(totalProgress / goalSubjects.length)
						: 0;

				const goalSessions = filteredSessions.filter(
					(s) => s.goalId === goal.id
				);
				const totalTime = goalSessions.reduce(
					(acc, s) => acc + (s.duration || 0),
					0
				);

				return {
					...goal,
					avgProgress,
					totalTime,
					subjectCount: goalSubjects.length,
				};
			});
	}, [studyGoals, subjects, filteredSessions]);

	// Flashcard stats
	const flashcardStats = useMemo(() => {
		const totalCards = flashcards.length;
		const masteredCards = flashcards.filter(
			(c) => c.easeFactor >= 2.5 && c.reviewCount >= 3
		).length;
		const learningCards = flashcards.filter(
			(c) => c.reviewCount > 0 && c.reviewCount < 3
		).length;
		const newCards = flashcards.filter((c) => c.reviewCount === 0).length;

		const now = new Date();
		const dueToday = flashcards.filter((c) => {
			if (!c.nextReviewAt) return true;
			return new Date(c.nextReviewAt) <= now;
		}).length;

		return {
			total: totalCards,
			mastered: masteredCards,
			learning: learningCards,
			new: newCards,
			dueToday,
		};
	}, [flashcards]);

	// Session type distribution
	const sessionTypeDistribution = useMemo(() => {
		const distribution: { [key: string]: number } = {};

		filteredSessions.forEach((session) => {
			distribution[session.type] = (distribution[session.type] || 0) + 1;
		});

		const colors: { [key: string]: string } = {
			study: theme.primary,
			revision: theme.success,
			practice: theme.warning,
			test: theme.error,
			reading: theme.accent,
		};

		return Object.entries(distribution)
			.map(([type, count]) => ({
				type: type.charAt(0).toUpperCase() + type.slice(1),
				count,
				color: colors[type] || theme.primary,
				percentage: Math.round((count / filteredSessions.length) * 100) || 0,
			}))
			.sort((a, b) => b.count - a.count);
	}, [filteredSessions]);

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Time Range Selector */}
			<View style={styles.rangeSelector}>
				{(["week", "month", "year", "all"] as TimeRange[]).map((range) => (
					<TouchableOpacity
						key={range}
						style={[
							styles.rangeOption,
							timeRange === range && styles.rangeOptionActive,
						]}
						onPress={() => setTimeRange(range)}
					>
						<Text
							style={[
								styles.rangeOptionText,
								timeRange === range && styles.rangeOptionTextActive,
							]}
						>
							{range.charAt(0).toUpperCase() + range.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Summary Stats */}
			<View style={styles.summaryGrid}>
				<View style={styles.summaryCard}>
					<Ionicons name="time-outline" size={24} color={theme.primary} />
					<Text style={styles.summaryValue}>
						{totalHours}h {remainingMinutes}m
					</Text>
					<Text style={styles.summaryLabel}>Total Study Time</Text>
				</View>
				<View style={styles.summaryCard}>
					<Ionicons name="flame-outline" size={24} color={theme.warning} />
					<Text style={styles.summaryValue}>
						{studyStreak?.currentStreak || 0}
					</Text>
					<Text style={styles.summaryLabel}>Day Streak</Text>
				</View>
				<View style={styles.summaryCard}>
					<Ionicons
						name="speedometer-outline"
						size={24}
						color={theme.success}
					/>
					<Text style={styles.summaryValue}>{avgSessionDuration}m</Text>
					<Text style={styles.summaryLabel}>Avg Session</Text>
				</View>
				<View style={styles.summaryCard}>
					<Ionicons name="eye-outline" size={24} color={theme.accent} />
					<Text style={styles.summaryValue}>{avgFocusScore}</Text>
					<Text style={styles.summaryLabel}>Avg Focus</Text>
				</View>
			</View>

			{/* Weekly Chart */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Daily Study Time</Text>
				<View style={styles.chartContainer}>
					{dailyData.map((day, index) => (
						<View key={index} style={styles.chartBar}>
							<View style={styles.barContainer}>
								<View
									style={[
										styles.bar,
										{
											height: `${(day.minutes / maxDailyMinutes) * 100}%`,
											backgroundColor:
												day.minutes > 0 ? theme.primary : theme.border,
										},
									]}
								/>
							</View>
							<Text style={styles.barLabel}>{day.day}</Text>
							{day.minutes > 0 && (
								<Text style={styles.barValue}>{Math.round(day.minutes)}m</Text>
							)}
						</View>
					))}
				</View>
			</View>

			{/* Session Type Distribution */}
			{sessionTypeDistribution.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Session Types</Text>
					<View style={styles.horizontalBars}>
						{sessionTypeDistribution.map((item, index) => (
							<View key={index} style={styles.horizontalBarRow}>
								<View style={styles.horizontalBarLabel}>
									<Text style={styles.horizontalBarName}>{item.type}</Text>
									<Text style={styles.horizontalBarCount}>
										{item.count} sessions
									</Text>
								</View>
								<View style={styles.horizontalBarTrack}>
									<View
										style={[
											styles.horizontalBarFill,
											{
												width: `${item.percentage}%`,
												backgroundColor: item.color,
											},
										]}
									/>
								</View>
								<Text style={styles.horizontalBarPercent}>
									{item.percentage}%
								</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Subject Distribution */}
			{subjectDistribution.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Time by Subject</Text>
					<View style={styles.subjectList}>
						{subjectDistribution.map((subject) => (
							<View key={subject.id} style={styles.subjectItem}>
								<View style={styles.subjectLeft}>
									<View
										style={[
											styles.subjectDot,
											{ backgroundColor: subject.color },
										]}
									/>
									<Text style={styles.subjectName}>{subject.name}</Text>
								</View>
								<View style={styles.subjectRight}>
									<Text style={styles.subjectTime}>
										{Math.round(subject.minutes)}m
									</Text>
									<Text style={styles.subjectPercent}>
										{subject.percentage}%
									</Text>
								</View>
							</View>
						))}
					</View>

					{/* Pie chart visual */}
					<View style={styles.pieContainer}>
						<View style={styles.pieChart}>
							{subjectDistribution.map((subject, index) => {
								const previousTotal = subjectDistribution
									.slice(0, index)
									.reduce((acc, s) => acc + s.percentage, 0);
								return (
									<View
										key={subject.id}
										style={[
											styles.pieSegment,
											{
												backgroundColor: subject.color,
												transform: [{ rotate: `${previousTotal * 3.6}deg` }],
											},
										]}
									/>
								);
							})}
						</View>
					</View>
				</View>
			)}

			{/* Goal Progress */}
			{goalProgress.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Goal Progress</Text>
					{goalProgress.map((goal) => (
						<View key={goal.id} style={styles.goalCard}>
							<View style={styles.goalHeader}>
								<View
									style={[
										styles.goalDot,
										{ backgroundColor: goal.color || theme.primary },
									]}
								/>
								<Text style={styles.goalName}>{goal.name}</Text>
							</View>
							<View style={styles.goalStats}>
								<View style={styles.goalStat}>
									<Text style={styles.goalStatValue}>{goal.avgProgress}%</Text>
									<Text style={styles.goalStatLabel}>Progress</Text>
								</View>
								<View style={styles.goalStat}>
									<Text style={styles.goalStatValue}>
										{Math.round(goal.totalTime)}m
									</Text>
									<Text style={styles.goalStatLabel}>Study Time</Text>
								</View>
								<View style={styles.goalStat}>
									<Text style={styles.goalStatValue}>{goal.subjectCount}</Text>
									<Text style={styles.goalStatLabel}>Subjects</Text>
								</View>
							</View>
							<View style={styles.goalProgressBar}>
								<View
									style={[
										styles.goalProgressFill,
										{
											width: `${goal.avgProgress}%`,
											backgroundColor: goal.color || theme.primary,
										},
									]}
								/>
							</View>
						</View>
					))}
				</View>
			)}

			{/* Flashcard Stats */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Flashcard Progress</Text>
				<View style={styles.flashcardGrid}>
					<View style={styles.flashcardStat}>
						<Ionicons name="albums-outline" size={22} color={theme.primary} />
						<Text style={styles.flashcardValue}>{flashcardStats.total}</Text>
						<Text style={styles.flashcardLabel}>Total Cards</Text>
					</View>
					<View style={styles.flashcardStat}>
						<Ionicons
							name="checkmark-done-outline"
							size={22}
							color={theme.success}
						/>
						<Text style={styles.flashcardValue}>{flashcardStats.mastered}</Text>
						<Text style={styles.flashcardLabel}>Mastered</Text>
					</View>
					<View style={styles.flashcardStat}>
						<Ionicons name="sync-outline" size={22} color={theme.warning} />
						<Text style={styles.flashcardValue}>{flashcardStats.learning}</Text>
						<Text style={styles.flashcardLabel}>Learning</Text>
					</View>
					<View style={styles.flashcardStat}>
						<Ionicons
							name="add-circle-outline"
							size={22}
							color={theme.textMuted}
						/>
						<Text style={styles.flashcardValue}>{flashcardStats.new}</Text>
						<Text style={styles.flashcardLabel}>New</Text>
					</View>
				</View>

				{flashcardStats.dueToday > 0 && (
					<View style={styles.dueAlert}>
						<Ionicons name="notifications" size={20} color={theme.warning} />
						<Text style={styles.dueAlertText}>
							{flashcardStats.dueToday} cards due for review today
						</Text>
					</View>
				)}
			</View>

			{/* Pomodoro Stats */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Pomodoro Stats</Text>
				<View style={styles.pomodoroCard}>
					<Ionicons name="timer-outline" size={40} color={theme.error} />
					<View style={styles.pomodoroInfo}>
						<Text style={styles.pomodoroValue}>{totalPomodoros}</Text>
						<Text style={styles.pomodoroLabel}>Pomodoros Completed</Text>
					</View>
					<View style={styles.pomodoroHours}>
						<Text style={styles.pomodoroHoursValue}>
							{Math.round((totalPomodoros * 25) / 60)}h
						</Text>
						<Text style={styles.pomodoroHoursLabel}>Focus Time</Text>
					</View>
				</View>
			</View>

			{/* Streak Info */}
			{studyStreak && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Streak Details</Text>
					<View style={styles.streakCard}>
						<View style={styles.streakMain}>
							<Ionicons name="flame" size={48} color="#f97316" />
							<View>
								<Text style={styles.streakValue}>
									{studyStreak.currentStreak} days
								</Text>
								<Text style={styles.streakLabel}>Current Streak</Text>
							</View>
						</View>
						<View style={styles.streakDivider} />
						<View style={styles.streakSecondary}>
							<View style={styles.streakSecondaryItem}>
								<Text style={styles.streakSecondaryValue}>
									{studyStreak.longestStreak}
								</Text>
								<Text style={styles.streakSecondaryLabel}>Best Streak</Text>
							</View>
							<View style={styles.streakSecondaryItem}>
								<Text style={styles.streakSecondaryValue}>
									{new Date(
										studyStreak.lastStudyDate || Date.now()
									).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									})}
								</Text>
								<Text style={styles.streakSecondaryLabel}>Last Study</Text>
							</View>
						</View>
					</View>
				</View>
			)}

			<View style={{ height: 120 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
			padding: 16,
		},
		// Range Selector
		rangeSelector: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		rangeOption: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 10,
		},
		rangeOptionActive: {
			backgroundColor: theme.primary,
		},
		rangeOptionText: {
			fontSize: 14,
			color: theme.textSecondary,
			fontWeight: "500",
		},
		rangeOptionTextActive: {
			color: "#fff",
			fontWeight: "600",
		},
		// Summary Grid
		summaryGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
			marginBottom: 24,
		},
		summaryCard: {
			width: (width - 44) / 2,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		summaryValue: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
			marginTop: 8,
		},
		summaryLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		// Section
		section: {
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 16,
		},
		// Chart
		chartContainer: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-end",
			height: 160,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		chartBar: {
			alignItems: "center",
			flex: 1,
		},
		barContainer: {
			height: 100,
			width: 24,
			justifyContent: "flex-end",
		},
		bar: {
			width: 24,
			borderRadius: 4,
			minHeight: 4,
		},
		barLabel: {
			fontSize: 11,
			color: theme.textSecondary,
			marginTop: 8,
		},
		barValue: {
			fontSize: 10,
			color: theme.primary,
			fontWeight: "600",
		},
		// Horizontal Bars
		horizontalBars: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		horizontalBarRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		horizontalBarLabel: {
			width: 80,
		},
		horizontalBarName: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		horizontalBarCount: {
			fontSize: 11,
			color: theme.textMuted,
		},
		horizontalBarTrack: {
			flex: 1,
			height: 8,
			backgroundColor: theme.border,
			borderRadius: 4,
			marginHorizontal: 10,
		},
		horizontalBarFill: {
			height: 8,
			borderRadius: 4,
		},
		horizontalBarPercent: {
			width: 40,
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
			textAlign: "right",
		},
		// Subject Distribution
		subjectList: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		subjectItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		subjectLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		subjectDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
		},
		subjectName: {
			fontSize: 15,
			color: theme.text,
		},
		subjectRight: {
			alignItems: "flex-end",
		},
		subjectTime: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		subjectPercent: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		// Pie Chart (simple visual)
		pieContainer: {
			alignItems: "center",
			marginTop: 20,
		},
		pieChart: {
			width: 120,
			height: 120,
			borderRadius: 60,
			backgroundColor: theme.border,
			overflow: "hidden",
		},
		pieSegment: {
			position: "absolute",
			width: 60,
			height: 120,
			left: 60,
			transformOrigin: "left center",
		},
		// Goal Progress
		goalCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		goalHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		goalDot: {
			width: 12,
			height: 12,
			borderRadius: 6,
		},
		goalName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		goalStats: {
			flexDirection: "row",
			justifyContent: "space-around",
			marginTop: 16,
			marginBottom: 12,
		},
		goalStat: {
			alignItems: "center",
		},
		goalStatValue: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		goalStatLabel: {
			fontSize: 11,
			color: theme.textSecondary,
		},
		goalProgressBar: {
			height: 6,
			backgroundColor: theme.border,
			borderRadius: 3,
		},
		goalProgressFill: {
			height: 6,
			borderRadius: 3,
		},
		// Flashcard Stats
		flashcardGrid: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		flashcardStat: {
			flex: 1,
			alignItems: "center",
		},
		flashcardValue: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
			marginTop: 8,
		},
		flashcardLabel: {
			fontSize: 11,
			color: theme.textSecondary,
			marginTop: 2,
		},
		dueAlert: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			backgroundColor: theme.warning + "20",
			padding: 12,
			borderRadius: 10,
			marginTop: 12,
		},
		dueAlertText: {
			fontSize: 14,
			color: theme.warning,
			fontWeight: "500",
		},
		// Pomodoro
		pomodoroCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
		},
		pomodoroInfo: {
			flex: 1,
			marginLeft: 16,
		},
		pomodoroValue: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.text,
		},
		pomodoroLabel: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		pomodoroHours: {
			alignItems: "flex-end",
		},
		pomodoroHoursValue: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.primary,
		},
		pomodoroHoursLabel: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		// Streak
		streakCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 20,
		},
		streakMain: {
			flexDirection: "row",
			alignItems: "center",
			gap: 16,
		},
		streakValue: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.text,
		},
		streakLabel: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		streakDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 16,
		},
		streakSecondary: {
			flexDirection: "row",
			justifyContent: "space-around",
		},
		streakSecondaryItem: {
			alignItems: "center",
		},
		streakSecondaryValue: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		streakSecondaryLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 2,
		},
	});
