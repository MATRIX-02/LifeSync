// Workout Statistics - Detailed analytics with muscle map visualization

import { formatDurationShort } from "@/src/data/exerciseTracking";
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
	useWindowDimensions,
	PanResponder,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { createStyles } from "./WorkoutStatistics.styles";

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
	// Live width - the module-level one is frozen at load and goes stale on rotation.
	const { width } = useWindowDimensions();
	const {
		getWorkoutStats,
		workoutSessions,
		personalRecords,
		fitnessProfile,
	} = useWorkoutStore();
	const weightUnit = fitnessProfile?.weightUnit || "kg";

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

	// PanResponder for dragging the muscle map.
	//
	// The responder object is created ONCE, so its callbacks close over the very
	// first render's state - where zoomLevel is 1. Reading `zoomLevel` directly in
	// them made the guards permanently false (`1 > 1`) and the drag never started.
	// Mirror the values into refs and read those instead.
	const zoomRef = useRef(zoomLevel);
	zoomRef.current = zoomLevel;
	const panOffsetRef = useRef(panOffset);
	panOffsetRef.current = panOffset;
	const isPanningRef = useRef(isPanning);
	isPanningRef.current = isPanning;

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponderCapture: () => zoomRef.current > 1,
			onMoveShouldSetPanResponderCapture: () => zoomRef.current > 1,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				if (zoomRef.current <= 1) return;
				isPanningRef.current = true;
				setIsPanning(true);
				panRef.current = { ...panOffsetRef.current };
			},
			onPanResponderMove: (_, gestureState) => {
				if (zoomRef.current <= 1 || !isPanningRef.current) return;
				const maxPan = (zoomRef.current - 1) * 150;
				const newX = Math.max(
					-maxPan,
					Math.min(maxPan, panRef.current.x + gestureState.dx)
				);
				const newY = Math.max(
					-maxPan,
					Math.min(maxPan, panRef.current.y + gestureState.dy)
				);
				setPanOffset({ x: newX, y: newY });
			},
			onPanResponderRelease: () => {
				isPanningRef.current = false;
				setIsPanning(false);
			},
			onPanResponderTerminate: () => {
				isPanningRef.current = false;
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
			shins: 0,
			feet: 0,
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
			shins: 0,
			feet: 0,
		};
		filtered[selectedMuscle] = muscleActivity[selectedMuscle];
		return filtered;
	}, [muscleActivity, selectedMuscle]);

	const formatPR = (type: string, value: number) =>
		type === "weight"
			? `${+value.toFixed(1)} ${weightUnit}`
			: type === "reps"
				? `${value} reps`
				: type === "duration"
					? formatDurationShort(value)
					: `${+value.toFixed(2)} km`;

	// Get top exercises for selected muscle from real data
	const getTopExercisesForMuscle = (muscle: MuscleGroup) => {
		const exerciseStats: Record<
			string,
			{ sets: number; volume: number; seconds: number; km: number; name: string }
		> = {};

		workoutSessions.forEach((session) => {
			if (!session.isCompleted) return;
			session.exercises.forEach((ex) => {
				if (ex.targetMuscles.includes(muscle)) {
					if (!exerciseStats[ex.exerciseId]) {
						exerciseStats[ex.exerciseId] = {
							sets: 0,
							volume: 0,
							seconds: 0,
							km: 0,
							name: ex.exerciseName,
						};
					}
					ex.sets.forEach((set) => {
						if (set.completed) {
							exerciseStats[ex.exerciseId].sets += 1;
							exerciseStats[ex.exerciseId].volume +=
								(set.weight || 0) * (set.reps || 0);
							exerciseStats[ex.exerciseId].seconds += set.duration || 0;
							exerciseStats[ex.exerciseId].km += set.distance || 0;
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
				// Volume for lifts; distance or time for runs and holds.
				volume:
					e.volume > 0
						? e.volume >= 1000
							? `${(e.volume / 1000).toFixed(1)}k ${weightUnit}`
							: `${e.volume} ${weightUnit}`
						: e.km > 0
							? `${+e.km.toFixed(2)} km`
							: e.seconds > 0
								? formatDurationShort(e.seconds)
								: `0 ${weightUnit}`,
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
					{/* Zoomable Body Map Area.
					    The zoom controls sit OUTSIDE the pan-handling view: while
					    zoomed it captures touches before its children, which made the
					    buttons unpressable when they lived inside it. */}
					<View style={styles.muscleMapZoomWrapper}>
						<View
							style={styles.muscleMapZoomArea}
							{...panResponder.panHandlers}
						>
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
						</View>

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
							onPress={() => {
								const next = Math.max(zoomLevel - 0.2, 0.6);
								setZoomLevel(next);
								// No room to pan at or below 1x - don't strand the offset.
								if (next <= 1) setPanOffset({ x: 0, y: 0 });
							}}
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
									{formatPR(pr.type, pr.value)}
								</Text>
								{!!pr.previousValue && (
									<Text style={styles.prImprovement}>
										+{formatPR(pr.type, pr.value - pr.previousValue)}
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
