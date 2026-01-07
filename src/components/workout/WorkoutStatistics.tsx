// Workout Statistics - Detailed analytics with muscle map visualization

import { MuscleBodyMap } from "@/src/components/muscle-map";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import {
	EXERCISE_DATABASE,
	MUSCLE_GROUP_INFO,
} from "@/src/data/exerciseDatabase";
import { MuscleGroup } from "@/src/types/workout";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useRef, useState } from "react";
import {
	Dimensions,
	PanResponder,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

interface WorkoutStatisticsProps {
	theme: Theme;
	gender: "male" | "female" | "other";
	subscriptionCheck?: SubscriptionCheckResult;
}

export default function WorkoutStatistics({
	theme,
	gender,
	subscriptionCheck,
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
	const [zoomLevel, setZoomLevel] = useState(1);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const panRef = useRef({ x: 0, y: 0 });
	const scrollViewRef = useRef<ScrollView>(null);

	// PanResponder for dragging the muscle map
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponderCapture: () => zoomLevel > 1,
			onMoveShouldSetPanResponderCapture: () => zoomLevel > 1 && isPanning,
			onPanResponderGrant: () => {
				if (zoomLevel > 1) {
					setIsPanning(true);
					panRef.current = { x: panOffset.x, y: panOffset.y };
				}
			},
			onPanResponderMove: (_, gestureState) => {
				if (zoomLevel > 1 && isPanning) {
					const maxPan = (zoomLevel - 1) * 150;
					const newX = Math.max(
						-maxPan,
						Math.min(maxPan, panRef.current.x + gestureState.dx)
					);
					const newY = Math.max(
						-maxPan,
						Math.min(maxPan, panRef.current.y + gestureState.dy)
					);
					setPanOffset({ x: newX, y: newY });
				}
			},
			onPanResponderRelease: () => {
				setIsPanning(false);
			},
		})
	).current;

	// Reset pan when zoom resets
	const handleResetZoom = () => {
		setZoomLevel(1);
		setPanOffset({ x: 0, y: 0 });
	};

	const stats = getWorkoutStats();
	const styles = createStyles(theme);

	// Calculate workout stats by category (Strength, Cardio, Yoga)
	const categoryStats = useMemo(() => {
		const now = new Date();
		let startDate = new Date();
		if (timeRange === "week") {
			startDate.setDate(now.getDate() - 7);
		} else if (timeRange === "month") {
			startDate.setMonth(now.getMonth() - 1);
		} else if (timeRange === "year") {
			startDate.setFullYear(now.getFullYear() - 1);
		} else {
			startDate = new Date(0);
		}

		const filteredSessions = workoutSessions.filter(
			(s) => s.isCompleted && new Date(s.date) >= startDate
		);

		const stats = {
			strength: { sessions: 0, duration: 0, exercises: 0 },
			cardio: { sessions: 0, duration: 0, exercises: 0 },
			yoga: { sessions: 0, duration: 0, exercises: 0 },
		};

		filteredSessions.forEach((session) => {
			let hasStrength = false;
			let hasCardio = false;
			let hasYoga = false;

			session.exercises.forEach((ex) => {
				// Look up exercise category from database
				const dbExercise = EXERCISE_DATABASE.find(
					(e) => e.id === ex.exerciseId
				);
				const category = dbExercise?.category || "strength";

				if (category === "strength" || category === "calisthenics") {
					hasStrength = true;
					stats.strength.exercises += 1;
				} else if (
					category === "cardio" ||
					category === "hiit" ||
					category === "plyometrics"
				) {
					hasCardio = true;
					stats.cardio.exercises += 1;
				} else if (category === "flexibility") {
					hasYoga = true;
					stats.yoga.exercises += 1;
				}
			});

			const duration = session.duration || 0;
			if (hasStrength) {
				stats.strength.sessions += 1;
				stats.strength.duration += duration;
			}
			if (hasCardio) {
				stats.cardio.sessions += 1;
				stats.cardio.duration += duration;
			}
			if (hasYoga) {
				stats.yoga.sessions += 1;
				stats.yoga.duration += duration;
			}
		});

		return stats;
	}, [workoutSessions, timeRange]);

	// Calculate weekly distribution from REAL data
	const weeklyDistribution = useMemo(() => {
		const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		const distribution: { day: string; count: number; duration: number }[] =
			days.map((d) => ({
				day: d,
				count: 0,
				duration: 0,
			}));

		// Get workouts from the past week
		const now = new Date();
		const oneWeekAgo = new Date(now);
		oneWeekAgo.setDate(now.getDate() - 7);

		workoutSessions
			.filter((s) => s.isCompleted && new Date(s.date) >= oneWeekAgo)
			.forEach((session) => {
				const date = new Date(session.date);
				// getDay() returns 0 for Sunday, we want Monday = 0
				const dayIndex = (date.getDay() + 6) % 7;
				distribution[dayIndex].count += 1;
				distribution[dayIndex].duration += session.duration || 0;
			});

		return distribution;
	}, [workoutSessions]);

	// Calculate this month's workout days from REAL data
	const monthWorkoutDays = useMemo(() => {
		const now = new Date();
		const daysInMonth = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0
		).getDate();
		const workoutDays = new Set<number>();

		workoutSessions
			.filter((s) => {
				const sessionDate = new Date(s.date);
				return (
					s.isCompleted &&
					sessionDate.getMonth() === now.getMonth() &&
					sessionDate.getFullYear() === now.getFullYear()
				);
			})
			.forEach((session) => {
				const date = new Date(session.date);
				workoutDays.add(date.getDate());
			});

		return { daysInMonth, workoutDays };
	}, [workoutSessions]);

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
			legs: 0,
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

	const handleMusclePress = (muscle: { slug: string } | string) => {
		const muscleSlug = (
			typeof muscle === "string" ? muscle : muscle.slug
		) as MuscleGroup;
		setSelectedMuscle(muscleSlug === selectedMuscle ? null : muscleSlug);
	};

	// Get highlighted muscles - if a muscle is selected, only show that one
	const displayedMuscleActivity = useMemo((): Record<MuscleGroup, number> => {
		if (!selectedMuscle) {
			return muscleActivity;
		}
		// Only show the selected muscle, rest are 0
		const filtered: Record<MuscleGroup, number> = {
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
			legs: 0,
		};
		filtered[selectedMuscle] = muscleActivity[selectedMuscle];
		return filtered;
	}, [muscleActivity, selectedMuscle]);

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
		<ScrollView
			ref={scrollViewRef}
			style={styles.container}
			showsVerticalScrollIndicator={false}
			scrollEnabled={!isPanning}
		>
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
					{/* Zoomable Body Map Area */}
					<View style={styles.muscleMapZoomArea} {...panResponder.panHandlers}>
						<View
							style={{
								transform: [
									{ scale: zoomLevel },
									{ translateX: panOffset.x },
									{ translateY: panOffset.y },
								],
							}}
						>
							<MuscleBodyMap
								gender={gender === "other" ? "male" : gender}
								highlightedMuscles={displayedMuscleActivity}
								onMusclePress={handleMusclePress}
								width={width * 0.55}
								height={400}
								showLabels
								theme={theme}
								view={bodyView}
							/>
						</View>

						{/* Yoga/Cardio Activity Overlay */}
						{(categoryStats.yoga.sessions > 0 ||
							categoryStats.cardio.sessions > 0) && (
							<View style={styles.activityOverlay}>
								{categoryStats.cardio.sessions > 0 && (
									<View
										style={[
											styles.activityBadge,
											{
												backgroundColor: theme.error + "20",
												borderColor: theme.error,
											},
										]}
									>
										<Text style={styles.activityBadgeEmoji}>🏃</Text>
										<Text
											style={[styles.activityBadgeText, { color: theme.error }]}
										>
											{categoryStats.cardio.sessions} Cardio
										</Text>
									</View>
								)}
								{categoryStats.yoga.sessions > 0 && (
									<View
										style={[
											styles.activityBadge,
											{
												backgroundColor: theme.success + "20",
												borderColor: theme.success,
											},
										]}
									>
										<Text style={styles.activityBadgeEmoji}>🧘</Text>
										<Text
											style={[
												styles.activityBadgeText,
												{ color: theme.success },
											]}
										>
											{categoryStats.yoga.sessions} Yoga
										</Text>
									</View>
								)}
							</View>
						)}

						{/* Zoom Controls - Bottom Right */}
						<View style={styles.zoomControls}>
							<TouchableOpacity
								style={styles.zoomButton}
								onPress={() => setZoomLevel(Math.min(zoomLevel + 0.2, 2))}
							>
								<Ionicons name="add" size={20} color={theme.text} />
							</TouchableOpacity>
							<Text style={styles.zoomText}>
								{Math.round(zoomLevel * 100)}%
							</Text>
							<TouchableOpacity
								style={styles.zoomButton}
								onPress={() => setZoomLevel(Math.max(zoomLevel - 0.2, 0.6))}
							>
								<Ionicons name="remove" size={20} color={theme.text} />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.zoomButton, { marginLeft: 8 }]}
								onPress={handleResetZoom}
							>
								<Ionicons
									name="refresh"
									size={16}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>
						</View>

						{/* Drag hint when zoomed */}
						{zoomLevel > 1 && (
							<View style={styles.dragHint}>
								<Ionicons name="move" size={12} color={theme.textMuted} />
								<Text style={styles.dragHintText}>Drag to pan</Text>
							</View>
						)}
					</View>

					{/* Muscle Legend */}
					<View style={styles.muscleLegend}>
						<Text style={styles.legendTitle}>Activity Level</Text>
						<View style={styles.legendItems}>
							<View style={styles.legendItem}>
								<View
									style={[styles.legendColor, { backgroundColor: "#4A4A4A" }]}
								/>
								<Text style={styles.legendText}>0%</Text>
							</View>
							<View style={styles.legendItem}>
								<View
									style={[styles.legendColor, { backgroundColor: "#4CAF50" }]}
								/>
								<Text style={styles.legendText}>25%</Text>
							</View>
							<View style={styles.legendItem}>
								<View
									style={[styles.legendColor, { backgroundColor: "#FF9800" }]}
								/>
								<Text style={styles.legendText}>50%</Text>
							</View>
							<View style={styles.legendItem}>
								<View
									style={[styles.legendColor, { backgroundColor: "#9C27B0" }]}
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
					{weeklyDistribution.map((data, i) => {
						const maxDuration = Math.max(
							...weeklyDistribution.map((d) => d.duration),
							1
						);
						const barHeight =
							data.count > 0 ? 20 + (data.duration / maxDuration) * 60 : 10;
						return (
							<View key={data.day} style={styles.dayColumn}>
								<View
									style={[
										styles.dayBar,
										{
											height: barHeight,
											backgroundColor:
												data.count > 0 ? theme.primary : theme.border,
										},
									]}
								/>
								{data.count > 0 && (
									<Text style={styles.dayCount}>{data.count}</Text>
								)}
								<Text style={styles.dayLabel}>{data.day}</Text>
							</View>
						);
					})}
				</View>
			</View>

			{/* Workout Frequency */}
			<View style={styles.frequencySection}>
				<Text style={styles.sectionTitle}>This Month</Text>
				<View style={styles.frequencyGrid}>
					{Array.from({ length: monthWorkoutDays.daysInMonth }, (_, i) => {
						const dayNum = i + 1;
						const hasWorkout = monthWorkoutDays.workoutDays.has(dayNum);
						const isToday = dayNum === new Date().getDate();
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
									isToday && styles.frequencyDotToday,
								]}
							>
								{isToday && (
									<View
										style={[
											styles.todayIndicator,
											{ backgroundColor: theme.warning },
										]}
									/>
								)}
							</View>
						);
					})}
				</View>
				<View style={styles.frequencyLegend}>
					<Text style={styles.frequencyLegendText}>
						{stats.workoutsThisMonth} workouts this month
					</Text>
				</View>
			</View>

			{/* Workout Category Breakdown */}
			<View style={styles.categorySection}>
				<Text style={styles.sectionTitle}>Workout Types</Text>
				<View style={styles.categoryGrid}>
					<View
						style={[
							styles.categoryCard,
							{ backgroundColor: theme.primary + "15" },
						]}
					>
						<View
							style={[
								styles.categoryIcon,
								{ backgroundColor: theme.primary + "30" },
							]}
						>
							<Text style={styles.categoryEmoji}>💪</Text>
						</View>
						<Text style={styles.categoryName}>Strength</Text>
						<Text style={[styles.categoryValue, { color: theme.primary }]}>
							{categoryStats.strength.sessions} sessions
						</Text>
						<Text style={styles.categoryMeta}>
							{categoryStats.strength.exercises} exercises
						</Text>
					</View>
					<View
						style={[
							styles.categoryCard,
							{ backgroundColor: theme.error + "15" },
						]}
					>
						<View
							style={[
								styles.categoryIcon,
								{ backgroundColor: theme.error + "30" },
							]}
						>
							<Text style={styles.categoryEmoji}>🏃</Text>
						</View>
						<Text style={styles.categoryName}>Cardio</Text>
						<Text style={[styles.categoryValue, { color: theme.error }]}>
							{categoryStats.cardio.sessions} sessions
						</Text>
						<Text style={styles.categoryMeta}>
							{categoryStats.cardio.exercises} exercises
						</Text>
					</View>
					<View
						style={[
							styles.categoryCard,
							{ backgroundColor: theme.success + "15" },
						]}
					>
						<View
							style={[
								styles.categoryIcon,
								{ backgroundColor: theme.success + "30" },
							]}
						>
							<Text style={styles.categoryEmoji}>🧘</Text>
						</View>
						<Text style={styles.categoryName}>Yoga</Text>
						<Text style={[styles.categoryValue, { color: theme.success }]}>
							{categoryStats.yoga.sessions} sessions
						</Text>
						<Text style={styles.categoryMeta}>
							{categoryStats.yoga.exercises} exercises
						</Text>
					</View>
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
			flexWrap: "wrap",
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
			justifyContent: "center" as const,
			alignItems: "center" as const,
		},
		frequencyDotToday: {
			borderWidth: 2,
			borderColor: theme.warning,
		},
		todayIndicator: {
			width: 6,
			height: 6,
			borderRadius: 3,
		},
		dayCount: {
			fontSize: 8,
			fontWeight: "600" as const,
			color: theme.text,
		},
		frequencyLegend: {
			marginTop: 8,
		},
		frequencyLegendText: {
			fontSize: 12,
			color: theme.textMuted,
			textAlign: "center" as const,
		},
		// Muscle map zoom area
		muscleMapZoomArea: {
			overflow: "hidden" as const,
			borderRadius: 16,
			backgroundColor: theme.surfaceLight,
			minHeight: 420,
			justifyContent: "center" as const,
			alignItems: "center" as const,
			position: "relative" as const,
		},
		// Activity overlay for yoga/cardio
		activityOverlay: {
			position: "absolute" as const,
			top: 12,
			left: 12,
			gap: 8,
		},
		activityBadge: {
			flexDirection: "row" as const,
			alignItems: "center" as const,
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 20,
			borderWidth: 1,
			gap: 6,
		},
		activityBadgeEmoji: {
			fontSize: 14,
		},
		activityBadgeText: {
			fontSize: 12,
			fontWeight: "600" as const,
		},
		// Zoom controls
		zoomControls: {
			position: "absolute" as const,
			right: 12,
			bottom: 12,
			flexDirection: "row" as const,
			alignItems: "center" as const,
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 4,
			zIndex: 10,
		},
		zoomButton: {
			width: 28,
			height: 28,
			borderRadius: 6,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center" as const,
			alignItems: "center" as const,
		},
		zoomText: {
			fontSize: 11,
			color: theme.textMuted,
			marginHorizontal: 8,
			minWidth: 36,
			textAlign: "center" as const,
		},
		// Category breakdown
		categorySection: {
			marginBottom: 24,
		},
		categoryGrid: {
			flexDirection: "row" as const,
			gap: 10,
		},
		categoryCard: {
			flex: 1,
			borderRadius: 14,
			padding: 14,
			alignItems: "center" as const,
		},
		categoryIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center" as const,
			alignItems: "center" as const,
			marginBottom: 8,
		},
		categoryEmoji: {
			fontSize: 22,
		},
		categoryName: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 4,
		},
		categoryValue: {
			fontSize: 14,
			fontWeight: "700" as const,
		},
		categoryMeta: {
			fontSize: 10,
			color: theme.textMuted,
			marginTop: 2,
		},
		// Drag hint
		dragHint: {
			position: "absolute" as const,
			bottom: 12,
			left: 12,
			flexDirection: "row" as const,
			alignItems: "center" as const,
			backgroundColor: theme.surface + "CC",
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12,
			gap: 4,
		},
		dragHintText: {
			fontSize: 10,
			color: theme.textMuted,
		},
	});
