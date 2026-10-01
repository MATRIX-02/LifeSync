// AI-generated training analysis powered by Groq.

import InsightsScreen from "@/src/components/insights/InsightsScreen";
import { Theme } from "@/src/context/themeContext";
import { useWorkoutStore } from "@/src/context/workoutStoreDB";
import { DateWindow, InsightRange } from "@/src/services/insights/core";
import {
	buildWorkoutSummary,
	getDeepWorkoutAnalysis,
} from "@/src/services/insights/workoutInsights";
import React, { useCallback } from "react";

interface WorkoutAIInsightsProps {
	theme: Theme;
}

export default function WorkoutAIInsights({ theme }: WorkoutAIInsightsProps) {
	const {
		workoutSessions,
		personalRecords,
		bodyWeights,
		bodyMeasurements,
		fitnessProfile,
	} = useWorkoutStore();

	const weightUnit = fitnessProfile?.weightUnit ?? "kg";

	const run = useCallback(
		(range: InsightRange, customWindow: DateWindow) =>
			getDeepWorkoutAnalysis(
				buildWorkoutSummary({
					range,
					customWindow,
					sessions: workoutSessions,
					personalRecords,
					bodyWeights,
					bodyMeasurements,
					profile: fitnessProfile,
				}),
			),
		[
			workoutSessions,
			personalRecords,
			bodyWeights,
			bodyMeasurements,
			fitnessProfile,
		],
	);

	return (
		<InsightsScreen
			theme={theme}
			cacheNamespace="workout"
			emptyPrompt="Get a scored breakdown of your volume, muscle balance and progression."
			generateLabel="Run Analysis"
			scoreLabel="Training Health"
			breakdownTitle="Muscle Volume"
			breakdownShareSuffix="of total volume"
			formatValue={(v) => `${Math.round(v).toLocaleString()} ${weightUnit}`}
			run={run}
		/>
	);
}
