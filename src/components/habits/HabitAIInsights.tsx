// AI-generated habit analysis powered by Groq.

import InsightsScreen from "@/src/components/insights/InsightsScreen";
import { useHabitStore } from "@/src/context/habitStoreDB";
import { Theme } from "@/src/context/themeContext";
import { DateWindow, InsightRange } from "@/src/services/insights/core";
import {
	buildHabitsSummary,
	getDeepHabitsAnalysis,
} from "@/src/services/insights/habitInsights";
import React, { useCallback } from "react";

interface HabitAIInsightsProps {
	theme: Theme;
}

export default function HabitAIInsights({ theme }: HabitAIInsightsProps) {
	const { getActiveHabits, getArchivedHabits, calculateStats } =
		useHabitStore();

	const run = useCallback(
		(range: InsightRange, customWindow: DateWindow) => {
			const habits = getActiveHabits();
			// calculateStats writes into the store's stats map, so call it once per
			// habit up front rather than relying on whatever is already cached.
			const statsById = new Map(
				habits.map((h) => [h.id, calculateStats(h.id)]),
			);

			return getDeepHabitsAnalysis(
				buildHabitsSummary({
					range,
					customWindow,
					habits,
					archivedCount: getArchivedHabits().length,
					statsFor: (id) => statsById.get(id),
				}),
			);
		},
		[getActiveHabits, getArchivedHabits, calculateStats],
	);

	return (
		<InsightsScreen
			theme={theme}
			cacheNamespace="habits"
			emptyPrompt="Get a scored breakdown of your consistency, streaks and weak spots."
			generateLabel="Run Analysis"
			scoreLabel="Habit Health"
			breakdownTitle="Habit Review"
			breakdownShareSuffix="completion rate"
			formatValue={(v) => `${Math.round(v).toLocaleString()} days`}
			run={run}
		/>
	);
}
