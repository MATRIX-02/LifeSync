// Merged view of built-in + user-defined finance categories.
//
// Two different lists, on purpose:
//   - `expense` / `income` (lookup maps) include EVERYTHING, hidden or not, so
//     a transaction saved under a since-hidden or since-deleted category still
//     renders (unknown keys fall back to "Other").
//   - `expenseOptions` / `incomeOptions` are what pickers should offer: hidden
//     built-ins are left out.

import {
	CategoryKind,
	useFinanceCategoryStore,
} from "@/src/context/financeCategoryStore";
import {
	CategoryInfo,
	EXPENSE_CATEGORIES,
	INCOME_CATEGORIES,
} from "@/src/types/finance";
import { useMemo } from "react";

export interface CategoryOption extends CategoryInfo {
	key: string;
	isBuiltin: boolean;
}

const build = (
	kind: CategoryKind,
	builtins: Record<string, CategoryInfo>,
	rows: ReturnType<typeof useFinanceCategoryStore.getState>["rows"],
) => {
	const hidden = new Set(
		rows
			.filter((r) => r.isBuiltin && r.type === kind && r.hidden)
			.map((r) => r.key),
	);
	// "other" is the fallback for orphaned keys, so it is never hideable.
	hidden.delete("other");

	const custom = rows.filter((r) => !r.isBuiltin && r.type === kind);
	const all: Record<string, CategoryInfo> = { ...builtins };
	custom.forEach((r) => {
		all[r.key] = { name: r.name, icon: r.icon, color: r.color };
	});

	const options: CategoryOption[] = [
		...Object.entries(builtins)
			.filter(([key]) => !hidden.has(key))
			.map(([key, info]) => ({ key, ...info, isBuiltin: true })),
		...custom.map((r) => ({
			key: r.key,
			name: r.name,
			icon: r.icon,
			color: r.color,
			isBuiltin: false,
		})),
	];
	// Keep "Other" last in the picker.
	options.sort((a, b) => Number(a.key === "other") - Number(b.key === "other"));

	return { all, options, hidden };
};

export function useFinanceCategories() {
	const rows = useFinanceCategoryStore((s) => s.rows);

	return useMemo(() => {
		const expense = build("expense", EXPENSE_CATEGORIES, rows);
		const income = build("income", INCOME_CATEGORIES, rows);

		return {
			expense: expense.all,
			income: income.all,
			expenseOptions: expense.options,
			incomeOptions: income.options,
			hiddenExpense: expense.hidden,
			hiddenIncome: income.hidden,
			/** Info for a transaction/budget category; never undefined. */
			getInfo: (
				type: "expense" | "income" | "transfer",
				key: string,
			): CategoryInfo => {
				const map = type === "income" ? income.all : expense.all;
				return map[key] ?? map.other;
			},
		};
	}, [rows]);
}
