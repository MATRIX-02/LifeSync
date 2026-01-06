import { Theme } from "@/src/context/themeContext";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface ContributionGraphProps {
	habitId: string;
	habitColor: string;
	isHabitCompletedOnDate: (habitId: string, date: Date) => boolean;
	theme: Theme;
	isDark: boolean;
	days?: number; // Number of days to show (default 365)
}

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
const DAYS_OF_WEEK = ["", "Mon", "", "Wed", "", "Fri", ""];

/**
 * GitHub-style contribution graph showing habit completion history
 */
export const ContributionGraph: React.FC<ContributionGraphProps> = ({
	habitId,
	habitColor,
	isHabitCompletedOnDate,
	theme,
	isDark,
	days = 365,
}) => {
	// Generate dates grid
	const { weeks, monthLabels } = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Calculate how many weeks we need
		const totalWeeks = Math.ceil(days / 7) + 1;
		const weeks: Date[][] = [];
		const monthLabelPositions: { label: string; week: number }[] = [];

		// Start from the first day that aligns with Sunday
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - days);
		// Align to Sunday
		const dayOffset = startDate.getDay();
		startDate.setDate(startDate.getDate() - dayOffset);

		let currentMonth = -1;

		for (let week = 0; week < totalWeeks; week++) {
			const weekDates: Date[] = [];

			for (let day = 0; day < 7; day++) {
				const date = new Date(startDate);
				date.setDate(startDate.getDate() + week * 7 + day);
				weekDates.push(date);

				// Track month labels
				if (date.getMonth() !== currentMonth && date <= today) {
					currentMonth = date.getMonth();
					monthLabelPositions.push({
						label: MONTHS[currentMonth],
						week: week,
					});
				}
			}

			weeks.push(weekDates);
		}

		return { weeks, monthLabels: monthLabelPositions };
	}, [days]);

	// Get completion intensity (for potential future use with multiple completions per day)
	const getIntensity = (date: Date): number => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (date > today) return -1; // Future date

		const isCompleted = isHabitCompletedOnDate(habitId, date);
		return isCompleted ? 1 : 0;
	};

	// Get color based on intensity
	const getColor = (intensity: number): string => {
		if (intensity === -1) return "transparent"; // Future
		if (intensity === 0) return isDark ? "#2d333b" : "#ebedf0"; // Empty

		// Use habit color with varying opacity
		// For now, single intensity level
		return habitColor;
	};

	const cellSize = 12;
	const cellGap = 3;

	return (
		<View style={styles.container}>
			{/* Month labels */}
			<View style={styles.monthLabelsContainer}>
				<View style={{ width: 28 }} />
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.monthLabels}
				>
					{monthLabels.map((item, index) => (
						<Text
							key={index}
							style={[
								styles.monthLabel,
								{
									color: theme.textMuted,
									left: item.week * (cellSize + cellGap),
								},
							]}
						>
							{item.label}
						</Text>
					))}
				</ScrollView>
			</View>

			<View style={styles.graphContainer}>
				{/* Day labels */}
				<View style={styles.dayLabels}>
					{DAYS_OF_WEEK.map((day, index) => (
						<Text
							key={index}
							style={[
								styles.dayLabel,
								{
									color: theme.textMuted,
									height: cellSize + cellGap,
								},
							]}
						>
							{day}
						</Text>
					))}
				</View>

				{/* Contribution grid */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.gridContainer}
				>
					{weeks.map((week, weekIndex) => (
						<View key={weekIndex} style={styles.weekColumn}>
							{week.map((date, dayIndex) => {
								const intensity = getIntensity(date);
								return (
									<View
										key={dayIndex}
										style={[
											styles.cell,
											{
												width: cellSize,
												height: cellSize,
												backgroundColor: getColor(intensity),
												marginBottom: cellGap,
											},
										]}
									/>
								);
							})}
						</View>
					))}
				</ScrollView>
			</View>

			{/* Legend */}
			<View style={styles.legend}>
				<Text style={[styles.legendText, { color: theme.textMuted }]}>
					Less
				</Text>
				<View style={styles.legendCells}>
					<View
						style={[
							styles.legendCell,
							{ backgroundColor: isDark ? "#2d333b" : "#ebedf0" },
						]}
					/>
					<View
						style={[
							styles.legendCell,
							{ backgroundColor: habitColor, opacity: 0.3 },
						]}
					/>
					<View
						style={[
							styles.legendCell,
							{ backgroundColor: habitColor, opacity: 0.6 },
						]}
					/>
					<View style={[styles.legendCell, { backgroundColor: habitColor }]} />
				</View>
				<Text style={[styles.legendText, { color: theme.textMuted }]}>
					More
				</Text>
			</View>
		</View>
	);
};

/**
 * Compact 30-day contribution graph for habit list view
 */
interface CompactContributionGraphProps {
	habitId: string;
	habitColor: string;
	isHabitCompletedOnDate: (habitId: string, date: Date) => boolean;
	theme: Theme;
	isDark: boolean;
	days?: number;
}

export const CompactContributionGraph: React.FC<
	CompactContributionGraphProps
> = ({
	habitId,
	habitColor,
	isHabitCompletedOnDate,
	theme,
	isDark,
	days = 30,
}) => {
	// Generate last N days
	const dates = useMemo(() => {
		const result: Date[] = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			result.push(date);
		}

		return result;
	}, [days]);

	const getColor = (date: Date): string => {
		const isCompleted = isHabitCompletedOnDate(habitId, date);
		if (isCompleted) return habitColor;
		return isDark ? "#2d333b" : "#ebedf0";
	};

	const cellSize = 8;
	const cellGap = 2;
	const columns = 6; // Show in grid format
	const rows = Math.ceil(days / columns);

	return (
		<View style={compactStyles.container}>
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<View key={rowIndex} style={compactStyles.row}>
					{Array.from({ length: columns }).map((_, colIndex) => {
						const dateIndex = rowIndex * columns + colIndex;
						if (dateIndex >= dates.length) return null;

						const date = dates[dateIndex];
						return (
							<View
								key={colIndex}
								style={[
									compactStyles.cell,
									{
										width: cellSize,
										height: cellSize,
										backgroundColor: getColor(date),
										marginRight: cellGap,
										marginBottom: cellGap,
										borderRadius: 2,
									},
								]}
							/>
						);
					})}
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 8,
	},
	monthLabelsContainer: {
		flexDirection: "row",
		marginBottom: 4,
	},
	monthLabels: {
		flexDirection: "row",
		position: "relative",
		height: 16,
		paddingRight: 50,
	},
	monthLabel: {
		fontSize: 10,
		position: "absolute",
	},
	graphContainer: {
		flexDirection: "row",
	},
	dayLabels: {
		marginRight: 4,
	},
	dayLabel: {
		fontSize: 9,
		width: 24,
		textAlign: "right",
		paddingRight: 4,
	},
	gridContainer: {
		flexDirection: "row",
	},
	weekColumn: {
		marginRight: 3,
	},
	cell: {
		borderRadius: 2,
	},
	legend: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		marginTop: 8,
		gap: 4,
	},
	legendText: {
		fontSize: 10,
	},
	legendCells: {
		flexDirection: "row",
		gap: 2,
	},
	legendCell: {
		width: 10,
		height: 10,
		borderRadius: 2,
	},
});

const compactStyles = StyleSheet.create({
	container: {
		flexDirection: "column",
	},
	row: {
		flexDirection: "row",
	},
	cell: {},
});
