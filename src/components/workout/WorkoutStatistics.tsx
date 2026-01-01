// Workout Statistics - Detailed analytics with muscle map visualization

import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { MuscleBodyMap } from "@/src/components/muscle-map";
import { MuscleGroup } from "@/src/types/workout";
import {
	MUSCLE_GROUP_INFO,
	EXERCISE_DATABASE,
} from "@/src/data/exerciseDatabase";

const { width } = Dimensions.get("window");

interface WorkoutStatisticsProps {
	theme: Theme;
	gender: "male" | "female" | "other";
}

export default function WorkoutStatistics({
	theme,
	gender,
}: WorkoutStatisticsProps) {
	const { getWorkoutStats, workoutSessions, personalRecords } =
		useWorkoutStore();

	const [bodyView, setBodyView] = useState<"front" | "back">("front");
	const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(
		null
	);
	const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "all">(
		"month"
	);

	const stats = getWorkoutStats();
	const styles = createStyles(theme);

	// Calculate muscle group activity from REAL workout data
	const muscleActivity = useMemo((): Record<MuscleGroup, number> => {
		const activity: Record<MuscleGroup, number> = {
			chest: 0,
			back: 0,
			shoulders: 0,
			biceps: 0,
			triceps: 0,
			forearms: 0,
			abs: 0,
			obliques: 0,
			quadriceps: 0,
			hamstrings: 0,
			glutes: 0,
			calves: 0,
			traps: 0,
			lats: 0,
			lower_back: 0,
		};

		// Get date range based on selected timeRange
		const now = new Date();
		let startDate = new Date();
		if (timeRange === "week") {
			startDate.setDate(now.getDate() - 7);
		} else if (timeRange === "month") {
			startDate.setMonth(now.getMonth() - 1);
		} else if (timeRange === "year") {
			startDate.setFullYear(now.getFullYear() - 1);
		} else {
			startDate = new Date(0); // All time
		}

		// Filter sessions by date range
		const filteredSessions = workoutSessions.filter(
			(s) => s.isCompleted && new Date(s.date) >= startDate
		);

		// Count sets per muscle group
		const muscleSets: Record<MuscleGroup, number> = { ...activity };
		let maxSets = 0;

		filteredSessions.forEach((session) => {
			session.exercises.forEach((exercise) => {
				const completedSets = exercise.sets.filter((s) => s.completed).length;
				exercise.targetMuscles.forEach((muscle) => {
					muscleSets[muscle] = (muscleSets[muscle] || 0) + completedSets;
					if (muscleSets[muscle] > maxSets) maxSets = muscleSets[muscle];
				});
			});
		});

		// Normalize to 0-100 scale
		if (maxSets > 0) {
			Object.keys(muscleSets).forEach((muscle) => {
				activity[muscle as MuscleGroup] = Math.round(
					(muscleSets[muscle as MuscleGroup] / maxSets) * 100
				);
			});
		}

		return activity;
	}, [workoutSessions, timeRange]);

	const handleMusclePress = (muscle: MuscleGroup) => {
		setSelectedMuscle(muscle === selectedMuscle ? null : muscle);
	};

	// Get top exercises for selected muscle from real data
	const getTopExercisesForMuscle = (muscle: MuscleGroup) => {
		const exerciseStats: Record<
			string,
			{ sets: number; volume: number; name: string }
		> = {};

		workoutSessions.forEach((session) => {
			if (!session.isCompleted) return;
			session.exercises.forEach((ex) => {
				if (ex.targetMuscles.includes(muscle)) {
					if (!exerciseStats[ex.exerciseId]) {
						exerciseStats[ex.exerciseId] = {
							sets: 0,
							volume: 0,
							name: ex.exerciseName,
						};
					}
					ex.sets.forEach((set) => {
						if (set.completed) {
							exerciseStats[ex.exerciseId].sets += 1;
							exerciseStats[ex.exerciseId].volume +=
								(set.weight || 0) * (set.reps || 0);
						}
					});
				}
			});
		});

		return Object.values(exerciseStats)
			.sort((a, b) => b.sets - a.sets)
			.slice(0, 3)
			.map((e) => ({
				name: e.name,
				sets: e.sets,
				volume:
					e.volume >= 1000
						? `${(e.volume / 1000).toFixed(1)}k kg`
						: `${e.volume} kg`,
			}));
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Time Range Selector */}
			<View style={styles.timeRangeContainer}>
				{(["week", "month", "year", "all"] as const).map((range) => (
					<TouchableOpacity
						key={range}
						style={[
							styles.timeRangeButton,
							timeRange === range && styles.timeRangeButtonActive,
						]}
						onPress={() => setTimeRange(range)}
					>
						<Text
							style={[
								styles.timeRangeText,
								timeRange === range && styles.timeRangeTextActive,
							]}
						>
							{range === "all"
								? "All Time"
								: range.charAt(0).toUpperCase() + range.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Overview Stats */}
			<View style={styles.overviewSection}>
				<Text style={styles.sectionTitle}>Overview</Text>
				<View style={styles.statsRow}>
					<View style={styles.statBox}>
						<Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
						<Text style={styles.statLabel}>Workouts</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={styles.statNumber}>
							{Math.round(stats.totalDuration / 60)}h
						</Text>
						<Text style={styles.statLabel}>Time Spent</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={styles.statNumber}>
							{Math.round(stats.totalVolume / 1000)}k
						</Text>
						<Text style={styles.statLabel}>Volume (kg)</Text>
					</View>
				</View>
			</View>

			{/* Streak & Consistency */}
			<View style={styles.streakSection}>
				<View style={styles.streakCard}>
					<View style={styles.streakIconContainer}>
						<Ionicons name="flame" size={28} color={theme.warning} />
					</View>
					<View>
						<Text style={styles.streakValue}>{stats.currentStreak}</Text>
						<Text style={styles.streakLabel}>Day Streak</Text>
					</View>
				</View>
				<View style={styles.streakCard}>
					<View
						style={[
							styles.streakIconContainer,
							{ backgroundColor: theme.success + "20" },
						]}
					>
						<Ionicons name="trophy" size={28} color={theme.success} />
					</View>
					<View>
						<Text style={styles.streakValue}>{stats.longestStreak}</Text>
						<Text style={styles.streakLabel}>Best Streak</Text>
					</View>
				</View>
			</View>

			{/* Muscle Map Section */}
			<View style={styles.muscleMapSection}>
				<View style={styles.muscleMapHeader}>
					<Text style={styles.sectionTitle}>Muscle Activity</Text>
					<View style={styles.viewToggle}>
						<TouchableOpacity
							style={[
								styles.viewToggleButton,
								bodyView === "front" && styles.viewToggleButtonActive,
							]}
							onPress={() => setBodyView("front")}
						>
							<Text
								style={[
									styles.viewToggleText,
									bodyView === "front" && styles.viewToggleTextActive,
								]}
							>
								Front
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.viewToggleButton,
								bodyView === "back" && styles.viewToggleButtonActive,
							]}
							onPress={() => setBodyView("back")}
						>
							<Text
								style={[
									styles.viewToggleText,
									bodyView === "back" && styles.viewToggleTextActive,
								]}
							>
								Back
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.muscleMapContainer}>
					<MuscleBodyMap
						gender={gender === "other" ? "male" : gender}
						highlightedMuscles={muscleActivity}
						onMusclePress={handleMusclePress}
						width={width * 0.55}
						height={400}
						showLabels
						theme={theme}
						view={bodyView}
					/>

					{/* Muscle Legend */}
					<View style={styles.muscleLegend}>
						<Text style={styles.legendTitle}>Activity Level</Text>
						<View style={styles.legendItems}>
							<View style={styles.legendItem}>
								<View
									style={[
										styles.legendColor,
										{ backgroundColor: theme.surface },
									]}
								/>
								<Text style={styles.legendText}>0%</Text>
							</View>
							<View style={styles.legendItem}>
								<View
									style={[
										styles.legendColor,
										{ backgroundColor: theme.success + "60" },
									]}
								/>
								<Text style={styles.legendText}>50%</Text>
							</View>
							<View style={styles.legendItem}>
								<View
									style={[
										styles.legendColor,
										{ backgroundColor: theme.success },
									]}
								/>
								<Text style={styles.legendText}>100%</Text>
							</View>
						</View>

						{/* Muscle Stats List */}
						<View style={styles.muscleStatsList}>
							{Object.entries(muscleActivity)
								.sort((a, b) => b[1] - a[1])
								.slice(0, 6)
								.map(([muscle, activity]) => (
									<TouchableOpacity
										key={muscle}
										style={[
											styles.muscleStatItem,
											selectedMuscle === muscle &&
												styles.muscleStatItemSelected,
										]}
										onPress={() => handleMusclePress(muscle as MuscleGroup)}
									>
										<View
											style={[
												styles.muscleStatDot,
												{
													backgroundColor:
														MUSCLE_GROUP_INFO[muscle as MuscleGroup]?.color,
												},
											]}
										/>
										<Text style={styles.muscleStatName} numberOfLines={1}>
											{MUSCLE_GROUP_INFO[muscle as MuscleGroup]?.name}
										</Text>
										<Text style={styles.muscleStatPercent}>{activity}%</Text>
									</TouchableOpacity>
								))}
						</View>
					</View>
				</View>
			</View>

			{/* Selected Muscle Detail */}
			{selectedMuscle && (
				<View style={styles.muscleDetailCard}>
					<View style={styles.muscleDetailHeader}>
						<View
							style={[
								styles.muscleDetailIcon,
								{
									backgroundColor:
										MUSCLE_GROUP_INFO[selectedMuscle]?.color + "20",
								},
							]}
						>
							<View
								style={[
									styles.muscleDetailDot,
									{ backgroundColor: MUSCLE_GROUP_INFO[selectedMuscle]?.color },
								]}
							/>
						</View>
						<View style={styles.muscleDetailInfo}>
							<Text style={styles.muscleDetailName}>
								{MUSCLE_GROUP_INFO[selectedMuscle]?.name}
							</Text>
							<Text style={styles.muscleDetailMeta}>
								{muscleActivity[selectedMuscle]}% activity this {timeRange}
							</Text>
						</View>
					</View>

					<Text style={styles.muscleDetailSectionTitle}>Top Exercises</Text>
					{getTopExercisesForMuscle(selectedMuscle).map((ex, i) => (
						<View key={i} style={styles.exerciseRow}>
							<Text style={styles.exerciseRank}>#{i + 1}</Text>
							<Text style={styles.exerciseName}>{ex.name}</Text>
							<Text style={styles.exerciseSets}>{ex.sets} sets</Text>
							<Text style={styles.exerciseVolume}>{ex.volume}</Text>
						</View>
					))}
				</View>
			)}

			{/* Personal Records */}
			<View style={styles.prSection}>
				<Text style={styles.sectionTitle}>Personal Records 🏆</Text>
				{personalRecords.length === 0 ? (
					<View style={styles.emptyPr}>
						<Ionicons name="ribbon-outline" size={32} color={theme.textMuted} />
						<Text style={styles.emptyPrText}>No PRs yet</Text>
						<Text style={styles.emptyPrSubtext}>
							Complete workouts to set personal records
						</Text>
					</View>
				) : (
					personalRecords.slice(0, 5).map((pr) => (
						<View key={pr.id} style={styles.prCard}>
							<View style={styles.prIcon}>
								<Ionicons name="trophy" size={20} color={theme.warning} />
							</View>
							<View style={styles.prContent}>
								<Text style={styles.prExercise}>{pr.exerciseName}</Text>
								<Text style={styles.prDate}>
									{new Date(pr.date).toLocaleDateString()}
								</Text>
							</View>
							<View style={styles.prValue}>
								<Text style={styles.prNumber}>
									{pr.value}
									{pr.type === "weight"
										? " kg"
										: pr.type === "reps"
										? " reps"
										: ""}
								</Text>
								{pr.previousValue && (
									<Text style={styles.prImprovement}>
										+{pr.value - pr.previousValue}
									</Text>
								)}
							</View>
						</View>
					))
				)}
			</View>

			{/* Weekly Distribution */}
			<View style={styles.distributionSection}>
				<Text style={styles.sectionTitle}>Weekly Distribution</Text>
				<View style={styles.weekDays}>
					{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
						const hasWorkout = Math.random() > 0.5; // Mock data
						return (
							<View key={day} style={styles.dayColumn}>
								<View
									style={[
										styles.dayBar,
										{
											height: hasWorkout ? 40 + Math.random() * 40 : 10,
											backgroundColor: hasWorkout
												? theme.primary
												: theme.border,
										},
									]}
								/>
								<Text style={styles.dayLabel}>{day}</Text>
							</View>
						);
					})}
				</View>
			</View>

			{/* Workout Frequency */}
			<View style={styles.frequencySection}>
				<Text style={styles.sectionTitle}>This Month</Text>
				<View style={styles.frequencyGrid}>
					{Array.from({ length: 30 }, (_, i) => {
						const hasWorkout = Math.random() > 0.6;
						return (
							<View
								key={i}
								style={[
									styles.frequencyDot,
									{
										backgroundColor: hasWorkout
											? theme.primary
											: theme.surfaceLight,
									},
								]}
							/>
						);
					})}
				</View>
				<View style={styles.frequencyLegend}>
					<Text style={styles.frequencyLegendText}>
						{stats.workoutsThisMonth} workouts this month
					</Text>
				</View>
			</View>

			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
		},
		timeRangeContainer: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		timeRangeButton: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 10,
		},
		timeRangeButtonActive: {
			backgroundColor: theme.primary,
		},
		timeRangeText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		timeRangeTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 12,
		},
		overviewSection: {
			marginBottom: 20,
		},
		statsRow: {
			flexDirection: "row",
			gap: 12,
		},
		statBox: {
			flex: 1,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			alignItems: "center",
		},
		statNumber: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 4,
		},
		streakSection: {
			flexDirection: "row",
			gap: 12,
			marginBottom: 24,
		},
		streakCard: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			gap: 12,
		},
		streakIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 14,
			backgroundColor: theme.warning + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		streakValue: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		streakLabel: {
			fontSize: 11,
			color: theme.textMuted,
		},
		muscleMapSection: {
			marginBottom: 24,
		},
		muscleMapHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		viewToggle: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 10,
			padding: 3,
		},
		viewToggleButton: {
			paddingVertical: 6,
			paddingHorizontal: 14,
			borderRadius: 8,
		},
		viewToggleButtonActive: {
			backgroundColor: theme.primary,
		},
		viewToggleText: {
			fontSize: 12,
			fontWeight: "500",
			color: theme.textMuted,
		},
		viewToggleTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		muscleMapContainer: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 16,
		},
		muscleLegend: {
			flex: 1,
			paddingLeft: 12,
		},
		legendTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			marginBottom: 8,
		},
		legendItems: {
			flexDirection: "row",
			gap: 8,
			marginBottom: 16,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		legendColor: {
			width: 12,
			height: 12,
			borderRadius: 3,
		},
		legendText: {
			fontSize: 10,
			color: theme.textMuted,
		},
		muscleStatsList: {
			gap: 8,
		},
		muscleStatItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 6,
			paddingHorizontal: 8,
			borderRadius: 8,
		},
		muscleStatItemSelected: {
			backgroundColor: theme.primary + "20",
		},
		muscleStatDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
			marginRight: 8,
		},
		muscleStatName: {
			flex: 1,
			fontSize: 12,
			color: theme.text,
		},
		muscleStatPercent: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		muscleDetailCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 24,
		},
		muscleDetailHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 16,
		},
		muscleDetailIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		muscleDetailDot: {
			width: 20,
			height: 20,
			borderRadius: 10,
		},
		muscleDetailInfo: {
			flex: 1,
		},
		muscleDetailName: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		muscleDetailMeta: {
			fontSize: 12,
			color: theme.textMuted,
		},
		muscleDetailSectionTitle: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		exerciseRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		exerciseRank: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textMuted,
			width: 28,
		},
		exerciseName: {
			flex: 1,
			fontSize: 14,
			color: theme.text,
		},
		exerciseSets: {
			fontSize: 12,
			color: theme.textMuted,
			marginRight: 12,
		},
		exerciseVolume: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.primary,
		},
		prSection: {
			marginBottom: 24,
		},
		emptyPr: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 24,
			alignItems: "center",
		},
		emptyPrText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginTop: 8,
		},
		emptyPrSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 4,
		},
		prCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 14,
			marginBottom: 8,
		},
		prIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: theme.warning + "20",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		prContent: {
			flex: 1,
		},
		prExercise: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		prDate: {
			fontSize: 11,
			color: theme.textMuted,
		},
		prValue: {
			alignItems: "flex-end",
		},
		prNumber: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.primary,
		},
		prImprovement: {
			fontSize: 11,
			color: theme.success,
			fontWeight: "600",
		},
		distributionSection: {
			marginBottom: 24,
		},
		weekDays: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-end",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			height: 120,
		},
		dayColumn: {
			alignItems: "center",
			gap: 8,
		},
		dayBar: {
			width: 28,
			borderRadius: 6,
		},
		dayLabel: {
			fontSize: 10,
			color: theme.textMuted,
		},
		frequencySection: {
			marginBottom: 24,
		},
		frequencyGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		frequencyDot: {
			width: 18,
			height: 18,
			borderRadius: 4,
		},
		frequencyLegend: {
			marginTop: 8,
		},
		frequencyLegendText: {
			fontSize: 12,
			color: theme.textMuted,
			textAlign: "center",
		},
	});
