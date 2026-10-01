// AI-generated nutrition analysis powered by Groq.

import InsightsScreen from "@/src/components/insights/InsightsScreen";
import { useNutritionStore } from "@/src/context/nutritionStoreDB";
import { Theme } from "@/src/context/themeContext";
import { DateWindow, InsightRange } from "@/src/services/insights/core";
import {
	buildNutritionSummary,
	getDeepNutritionAnalysis,
} from "@/src/services/insights/nutritionInsights";
import React, { useCallback } from "react";

interface NutritionAIInsightsProps {
	theme: Theme;
}

export default function NutritionAIInsights({
	theme,
}: NutritionAIInsightsProps) {
	const {
		mealLogs,
		gutHealthLogs,
		hydrationLogs,
		fastingLogs,
		calculateDailyGoals,
	} = useNutritionStore();

	const run = useCallback(
		(range: InsightRange, customWindow: DateWindow) => {
			const goals = calculateDailyGoals();

			return getDeepNutritionAnalysis(
				buildNutritionSummary({
					range,
					customWindow,
					mealLogs,
					gutHealthLogs,
					hydrationLogs,
					fastingLogs,
					goals: {
						calories: goals?.calories,
						protein: goals?.protein,
						carbs: goals?.carbs,
						fat: goals?.fat,
						water: goals?.water,
					},
				}),
			);
		},
		[mealLogs, gutHealthLogs, hydrationLogs, fastingLogs, calculateDailyGoals],
	);

	return (
		<InsightsScreen
			theme={theme}
			cacheNamespace="nutrition"
			emptyPrompt="Get a scored breakdown of your macros, hydration and gut health patterns."
			generateLabel="Run Analysis"
			scoreLabel="Nutrition Health"
			breakdownTitle="Macro Review"
			breakdownShareSuffix="of intake"
			formatValue={(v) => `${Math.round(v).toLocaleString()}`}
			run={run}
		/>
	);
}
