import { useFinanceStore } from "@/src/context/financeStoreDB";
import {
	buildReport,
	currentMonthKey,
	fetchMonthlyReports,
	MonthKey,
	MonthlyReport,
	sameReport,
	saveMonthlyReport,
	shiftMonth,
} from "@/src/services/financeMonthlyReports";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads the stored monthly reports and keeps them current.
 *
 * Saves (debounced) the current month, the previous month (which freezes its
 * limits once the month rolls over) and whichever month is on screen. Nothing
 * is saved until the stored reports have loaded: saving earlier would replace
 * a past month's frozen limits with today's budgets.
 */
export const useMonthlyReports = (viewedMonth: MonthKey) => {
	const { userId, budgets, transactions, billReminders } = useFinanceStore();
	const [stored, setStored] = useState<Record<MonthKey, MonthlyReport> | null>(
		null,
	);
	const storedRef = useRef(stored);
	storedRef.current = stored;

	useEffect(() => {
		if (!userId) return;
		let cancelled = false;
		fetchMonthlyReports(userId).then((r) => {
			if (!cancelled && r) setStored(r);
		});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	const getReport = useCallback(
		(month: MonthKey): MonthlyReport =>
			buildReport(
				month,
				{ budgets, transactions, bills: billReminders },
				stored?.[month] ?? null,
			),
		[budgets, transactions, billReminders, stored],
	);

	useEffect(() => {
		if (!userId || !stored) return;
		const id = setTimeout(async () => {
			const current = currentMonthKey();
			const months = Array.from(
				new Set([current, shiftMonth(current, -1), viewedMonth]),
			).filter((m) => m <= current);
			for (const m of months) {
				const next = getReport(m);
				const prev = storedRef.current?.[m];
				// Don't invent a report for an untouched past month with nothing in it.
				if (!prev && m !== current && !next.budgets.length && !next.bills.length)
					continue;
				if (prev && sameReport(prev, next)) continue;
				if (await saveMonthlyReport(userId, next)) {
					setStored((s) => ({ ...(s || {}), [m]: next }));
				}
			}
		}, 1500);
		return () => clearTimeout(id);
	}, [userId, stored, getReport, viewedMonth]);

	return { getReport, loaded: stored !== null };
};
