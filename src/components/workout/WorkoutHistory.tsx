// Workout History - View past workout sessions

import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SectionList,
	Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStore";
import { WorkoutSession, MuscleGroup } from "@/src/types/workout";
import { MUSCLE_GROUP_INFO } from "@/src/data/exerciseDatabase";

interface WorkoutHistoryProps {
	theme: Theme;
}

interface DaySection {
	title: string;
	date: string;
	data: WorkoutSession[];
}

export default function WorkoutHistory({ theme }: WorkoutHistoryProps) {
	const { workoutSessions, deleteWorkoutSession } = useWorkoutStore();
	const [expandedSession, setExpandedSession] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "week" | "month">("all");

	const styles = createStyles(theme);

	const handleDeleteSession = (session: WorkoutSession) => {
		Alert.alert(
			"Delete Workout",
			`Delete "${session.name || "Workout"}" from ${new Date(
				session.date
			).toLocaleDateString()}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						deleteWorkoutSession(session.id);
						if (expandedSession === session.id) {
							setExpandedSession(null);
						}
					},
				},
			]
		);
	};

	// Filter and group sessions by date
	const groupedSessions = useMemo(() => {
		let filtered = [...workoutSessions];

		// Apply date filter
		const now = new Date();
		if (filter === "week") {
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			filtered = filtered.filter((s) => new Date(s.date) >= weekAgo);
		} else if (filter === "month") {
			const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			filtered = filtered.filter((s) => new Date(s.date) >= monthAgo);
		}

		// Sort by date descending
		filtered.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);

		// Group by date
		const groups: Record<string, WorkoutSession[]> = {};
		filtered.forEach((session) => {
			const dateKey = new Date(session.date).toDateString();
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(session);
		});

		// Convert to sections
		const sections: DaySection[] = Object.entries(groups).map(
			([dateStr, sessions]) => {
				const date = new Date(dateStr);
				const today = new Date();
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);

				let title = "";
				if (date.toDateString() === today.toDateString()) {
					title = "Today";
				} else if (date.toDateString() === yesterday.toDateString()) {
					title = "Yesterday";
				} else {
					title = date.toLocaleDateString("en-US", {
						weekday: "long",
						month: "short",
						day: "numeric",
					});
				}

				return { title, date: dateStr, data: sessions };
			}
		);

		return sections;
	}, [workoutSessions, filter]);

	// Calculate total stats
	const totalStats = useMemo(() => {
		return workoutSessions.reduce(
			(acc, session) => ({
				workouts: acc.workouts + 1,
				duration: acc.duration + session.duration,
				volume: acc.volume + session.totalVolume,
				sets:
					acc.sets +
					session.exercises.reduce(
						(s, e) => s + e.sets.filter((set) => set.completed).length,
						0
					),
			}),
			{ workouts: 0, duration: 0, volume: 0, sets: 0 }
		);
	}, [workoutSessions]);

	const toggleSession = (sessionId: string) => {
		setExpandedSession(expandedSession === sessionId ? null : sessionId);
	};

	const formatDuration = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const getSessionMuscles = (session: WorkoutSession): MuscleGroup[] => {
		const muscles = new Set<MuscleGroup>();
		session.exercises.forEach((ex) =>
			ex.targetMuscles.forEach((m: MuscleGroup) => muscles.add(m))
		);
		return Array.from(muscles);
	};

	const renderSessionItem = ({ item: session }: { item: WorkoutSession }) => {
		const isExpanded = expandedSession === session.id;
		const muscles = getSessionMuscles(session);
		const completedSets = session.exercises.reduce(
			(sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
			0
		);
		const totalSets = session.exercises.reduce(
			(sum, ex) => sum + ex.sets.length,
			0
		);

		return (
			<TouchableOpacity
				style={styles.sessionCard}
				onPress={() => toggleSession(session.id)}
				activeOpacity={0.8}
			>
				<View style={styles.sessionHeader}>
					<View style={styles.sessionLeft}>
						<View style={styles.sessionIconContainer}>
							<Ionicons name="barbell" size={20} color={theme.primary} />
						</View>
						<View style={styles.sessionInfo}>
							<Text style={styles.sessionName}>
								{session.name || "Workout"}
							</Text>
							<Text style={styles.sessionMeta}>
								{formatDuration(session.duration)} • {completedSets}/{totalSets}{" "}
								sets
							</Text>
						</View>
					</View>
					<View style={styles.sessionRight}>
						<Text style={styles.sessionVolume}>
							{(session.totalVolume / 1000).toFixed(1)}k kg
						</Text>
						<Ionicons
							name={isExpanded ? "chevron-up" : "chevron-down"}
							size={18}
							color={theme.textMuted}
						/>
					</View>
				</View>

				{/* Muscle Tags */}
				<View style={styles.muscleTags}>
					{muscles.slice(0, 4).map((muscle) => (
						<View
							key={muscle}
							style={[
								styles.muscleTag,
								{
									backgroundColor:
										(MUSCLE_GROUP_INFO[muscle]?.color || theme.primary) + "20",
								},
							]}
						>
							<Text
								style={[
									styles.muscleTagText,
									{ color: MUSCLE_GROUP_INFO[muscle]?.color || theme.primary },
								]}
							>
								{MUSCLE_GROUP_INFO[muscle]?.name || muscle}
							</Text>
						</View>
					))}
				</View>

				{/* Expanded Details */}
				{isExpanded && (
					<View style={styles.expandedContent}>
						<View style={styles.divider} />

						{session.exercises.map((exercise, index) => (
							<View key={exercise.id} style={styles.exerciseRow}>
								<View style={styles.exerciseNumber}>
									<Text style={styles.exerciseNumberText}>{index + 1}</Text>
								</View>
								<View style={styles.exerciseDetails}>
									<Text style={styles.exerciseName}>
										{exercise.exerciseName}
									</Text>
									<View style={styles.setsContainer}>
										{exercise.sets.map((set, setIndex) => (
											<View
												key={set.id}
												style={[
													styles.setChip,
													set.completed && styles.setChipCompleted,
												]}
											>
												<Text
													style={[
														styles.setChipText,
														set.completed && styles.setChipTextCompleted,
													]}
												>
													{set.weight}kg × {set.reps}
												</Text>
											</View>
										))}
									</View>
								</View>
							</View>
						))}

						{/* Session Notes */}
						{session.notes && (
							<View style={styles.notesContainer}>
								<Ionicons
									name="document-text-outline"
									size={14}
									color={theme.textMuted}
								/>
								<Text style={styles.notesText}>{session.notes}</Text>
							</View>
						)}

						{/* Session Footer */}
						<View style={styles.sessionFooter}>
							<View style={styles.footerStat}>
								<Ionicons
									name="time-outline"
									size={14}
									color={theme.textMuted}
								/>
								<Text style={styles.footerStatText}>
									{new Date(session.startTime).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</Text>
							</View>
							<View style={styles.footerStat}>
								<Ionicons
									name="flame-outline"
									size={14}
									color={theme.textMuted}
								/>
								<Text style={styles.footerStatText}>
									{session.caloriesBurned || 0} cal
								</Text>
							</View>
							<TouchableOpacity
								style={styles.deleteButton}
								onPress={(e) => {
									e.stopPropagation();
									handleDeleteSession(session);
								}}
							>
								<Ionicons name="trash-outline" size={16} color={theme.error} />
								<Text style={styles.deleteButtonText}>Delete</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			{/* Stats Overview */}
			<View style={styles.statsOverview}>
				<View style={styles.statItem}>
					<Text style={styles.statValue}>{totalStats.workouts}</Text>
					<Text style={styles.statLabel}>Workouts</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statItem}>
					<Text style={styles.statValue}>
						{Math.round(totalStats.duration / 60)}h
					</Text>
					<Text style={styles.statLabel}>Total Time</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statItem}>
					<Text style={styles.statValue}>
						{(totalStats.volume / 1000).toFixed(0)}k
					</Text>
					<Text style={styles.statLabel}>Volume (kg)</Text>
				</View>
			</View>

			{/* Filter Tabs */}
			<View style={styles.filterContainer}>
				{(["all", "month", "week"] as const).map((f) => (
					<TouchableOpacity
						key={f}
						style={[styles.filterTab, filter === f && styles.filterTabActive]}
						onPress={() => setFilter(f)}
					>
						<Text
							style={[
								styles.filterTabText,
								filter === f && styles.filterTabTextActive,
							]}
						>
							{f === "all"
								? "All Time"
								: f === "week"
								? "This Week"
								: "This Month"}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* History List */}
			{workoutSessions.length === 0 ? (
				<View style={styles.emptyState}>
					<View style={styles.emptyIcon}>
						<Ionicons
							name="calendar-outline"
							size={48}
							color={theme.textMuted}
						/>
					</View>
					<Text style={styles.emptyTitle}>No Workout History</Text>
					<Text style={styles.emptySubtitle}>
						Complete your first workout to see it here
					</Text>
					<TouchableOpacity style={styles.emptyButton}>
						<Text style={styles.emptyButtonText}>Start Workout</Text>
					</TouchableOpacity>
				</View>
			) : groupedSessions.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="search-outline" size={40} color={theme.textMuted} />
					<Text style={styles.emptyTitle}>No workouts in this period</Text>
					<Text style={styles.emptySubtitle}>
						Try changing the filter to see more
					</Text>
				</View>
			) : (
				<SectionList
					sections={groupedSessions}
					keyExtractor={(item) => item.id}
					renderItem={renderSessionItem}
					renderSectionHeader={({ section }) => (
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>{section.title}</Text>
							<Text style={styles.sectionCount}>
								{section.data.length} workout
								{section.data.length !== 1 ? "s" : ""}
							</Text>
						</View>
					)}
					stickySectionHeadersEnabled={false}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
				/>
			)}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
		},
		statsOverview: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
		},
		statItem: {
			flex: 1,
			alignItems: "center",
		},
		statValue: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		statLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		statDivider: {
			width: 1,
			backgroundColor: theme.border,
			marginHorizontal: 8,
		},
		filterContainer: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 16,
		},
		filterTab: {
			flex: 1,
			paddingVertical: 8,
			alignItems: "center",
			borderRadius: 10,
		},
		filterTabActive: {
			backgroundColor: theme.primary,
		},
		filterTabText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		filterTabTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
		},
		sectionTitle: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.text,
		},
		sectionCount: {
			fontSize: 12,
			color: theme.textMuted,
		},
		listContent: {
			paddingBottom: 40,
		},
		sessionCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 14,
			marginBottom: 10,
		},
		sessionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		sessionLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		sessionIconContainer: {
			width: 42,
			height: 42,
			borderRadius: 12,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		sessionInfo: {
			flex: 1,
		},
		sessionName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		sessionMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		sessionRight: {
			alignItems: "flex-end",
		},
		sessionVolume: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.primary,
			marginBottom: 2,
		},
		muscleTags: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			marginTop: 10,
		},
		muscleTag: {
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 6,
		},
		muscleTagText: {
			fontSize: 10,
			fontWeight: "600",
		},
		expandedContent: {
			marginTop: 12,
		},
		divider: {
			height: 1,
			backgroundColor: theme.border,
			marginBottom: 12,
		},
		exerciseRow: {
			flexDirection: "row",
			marginBottom: 12,
		},
		exerciseNumber: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 10,
		},
		exerciseNumberText: {
			fontSize: 11,
			fontWeight: "600",
			color: theme.textMuted,
		},
		exerciseDetails: {
			flex: 1,
		},
		exerciseName: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 6,
		},
		setsContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
		},
		setChip: {
			backgroundColor: theme.surfaceLight,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
		},
		setChipCompleted: {
			backgroundColor: theme.success + "20",
		},
		setChipText: {
			fontSize: 11,
			color: theme.textMuted,
		},
		setChipTextCompleted: {
			color: theme.success,
			fontWeight: "500",
		},
		notesContainer: {
			flexDirection: "row",
			alignItems: "flex-start",
			backgroundColor: theme.surfaceLight,
			borderRadius: 10,
			padding: 10,
			gap: 8,
			marginBottom: 12,
		},
		notesText: {
			flex: 1,
			fontSize: 12,
			color: theme.textSecondary,
			lineHeight: 18,
		},
		sessionFooter: {
			flexDirection: "row",
			gap: 16,
			paddingTop: 8,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		footerStat: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		footerStatText: {
			fontSize: 12,
			color: theme.textMuted,
		},
		deleteButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			marginLeft: "auto",
			paddingHorizontal: 10,
			paddingVertical: 4,
			backgroundColor: theme.error + "15",
			borderRadius: 6,
		},
		deleteButtonText: {
			fontSize: 12,
			color: theme.error,
			fontWeight: "500",
		},
		emptyState: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyTitle: {
			fontSize: 17,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 4,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginBottom: 20,
		},
		emptyButton: {
			backgroundColor: theme.primary,
			paddingVertical: 12,
			paddingHorizontal: 24,
			borderRadius: 12,
		},
		emptyButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFFFFF",
		},
	});
