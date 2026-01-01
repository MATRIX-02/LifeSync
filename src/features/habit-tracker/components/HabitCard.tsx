import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Habit } from "../../../types";
import { COLORS } from "../../../constants";
import { useHabitManager } from "../../../hooks/useHabitManager";

interface HabitCardProps {
	habit: Habit;
	onComplete: () => void;
	onDelete: () => void;
}

const HabitCard: React.FC<HabitCardProps> = ({
	habit,
	onComplete,
	onDelete,
}) => {
	const { getHabitStats } = useHabitManager();
	const stats = getHabitStats(habit.id);

	return (
		<View
			style={[
				styles.card,
				{ borderLeftColor: habit.color, borderLeftWidth: 4 },
			]}
		>
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					<Text style={styles.habitName}>{habit.name}</Text>
					{habit.notificationEnabled && (
						<View style={styles.notificationBadge}>
							<Ionicons name="notifications" size={12} color={COLORS.primary} />
							<Text style={styles.notificationTime}>
								{habit.notificationTime}
							</Text>
						</View>
					)}
				</View>
				<TouchableOpacity onPress={onDelete}>
					<Ionicons name="trash-outline" size={20} color={COLORS.error} />
				</TouchableOpacity>
			</View>

			{habit.description && (
				<Text style={styles.description}>{habit.description}</Text>
			)}

			{stats && (
				<View style={styles.statsContainer}>
					<StatItem label="Streak" value={stats.currentStreak} icon="flame" />
					<StatItem
						label="Completed"
						value={stats.totalCompleted}
						icon="checkmark-circle"
					/>
					<StatItem
						label="Rate"
						value={`${stats.completionRate}%`}
						icon="trending-up"
					/>
				</View>
			)}

			<TouchableOpacity
				style={styles.completeButton}
				onPress={onComplete}
				activeOpacity={0.7}
			>
				<Ionicons name="checkmark" size={20} color="#fff" />
				<Text style={styles.completeButtonText}>Complete Today</Text>
			</TouchableOpacity>
		</View>
	);
};

interface StatItemProps {
	label: string;
	value: string | number;
	icon: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon }) => (
	<View style={styles.statItem}>
		<Ionicons name={icon as any} size={16} color={COLORS.primary} />
		<Text style={styles.statLabel}>{label}</Text>
		<Text style={styles.statValue}>{value}</Text>
	</View>
);

const styles = StyleSheet.create({
	card: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	titleContainer: {
		flex: 1,
	},
	habitName: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.text,
		marginBottom: 4,
	},
	notificationBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: `${COLORS.primary}15`,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginTop: 4,
		alignSelf: "flex-start",
	},
	notificationTime: {
		fontSize: 11,
		color: COLORS.primary,
		marginLeft: 4,
		fontWeight: "500",
	},
	description: {
		fontSize: 13,
		color: COLORS.textSecondary,
		marginBottom: 12,
		lineHeight: 18,
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		backgroundColor: `${COLORS.background}`,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	statItem: {
		alignItems: "center",
	},
	statLabel: {
		fontSize: 11,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	statValue: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
		marginTop: 2,
	},
	completeButton: {
		backgroundColor: COLORS.success,
		borderRadius: 8,
		paddingVertical: 10,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	completeButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		marginLeft: 8,
	},
});

export default HabitCard;
