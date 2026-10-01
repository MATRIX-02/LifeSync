// AI-generated finance analysis powered by Groq.

import InsightsScreen from "@/src/components/insights/InsightsScreen";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme } from "@/src/context/themeContext";
import {
	buildFinanceSummary,
	getDeepFinanceAnalysis,
} from "@/src/services/aiInsightsService";
import { DateWindow, InsightRange } from "@/src/services/insights/core";
import React, { useCallback } from "react";

interface FinanceAIInsightsProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

export default function FinanceAIInsights({
	theme,
	currency,
}: FinanceAIInsightsProps) {
	const { accounts, transactions, budgets, savingsGoals, splitGroups } =
		useFinanceStore();

	const run = useCallback(
		(range: InsightRange, customWindow: DateWindow) =>
			getDeepFinanceAnalysis(
				buildFinanceSummary({
					currency,
					range,
					customWindow,
					accounts,
					transactions,
					budgets,
					savingsGoals,
					splitGroups,
				}),
			),
		[currency, accounts, transactions, budgets, savingsGoals, splitGroups],
	);

	return (
		<InsightsScreen
			theme={theme}
			cacheNamespace="finance"
			emptyPrompt="Get a scored breakdown of every category, your cards and shared bills."
			generateLabel="Run Analysis"
			scoreLabel="Financial Health"
			breakdownTitle="Category Review"
			breakdownShareSuffix="of spending"
			formatValue={(v) => `${Math.round(v).toLocaleString()} ${currency}`}
			run={run}
		/>
	);
}
