// Finance category preferences - database-first (Supabase `finance_categories`).
//
// Holds the user's custom categories plus which built-in ones they have hidden.
// The built-in definitions themselves stay in src/types/finance.ts; use the
// useFinanceCategories() hook to get the merged view.

import { supabase as supabaseClient } from "../config/supabase";
import { create } from "zustand";
import { generateId } from "./financeStoreDB/helpers";

const supabase = supabaseClient as any;

export type CategoryKind = "expense" | "income";

export interface CategoryRow {
	id: string;
	type: CategoryKind;
	key: string;
	name: string;
	icon: string;
	color: string;
	isBuiltin: boolean;
	hidden: boolean;
}

interface CategoryDraft {
	type: CategoryKind;
	name: string;
	icon: string;
	color: string;
}

interface FinanceCategoryStore {
	userId: string | null;
	rows: CategoryRow[];
	initialize: (userId: string) => Promise<void>;
	addCategory: (draft: CategoryDraft) => Promise<void>;
	updateCategory: (
		id: string,
		updates: Partial<Pick<CategoryDraft, "name" | "icon" | "color">>,
	) => Promise<void>;
	deleteCategory: (id: string) => Promise<void>;
	setBuiltinHidden: (
		type: CategoryKind,
		key: string,
		hidden: boolean,
	) => Promise<void>;
}

const fromDb = (r: any): CategoryRow => ({
	id: r.id,
	type: r.type,
	key: r.key,
	name: r.name,
	icon: r.icon,
	color: r.color,
	isBuiltin: !!r.is_builtin,
	hidden: !!r.hidden,
});

export const useFinanceCategoryStore = create<FinanceCategoryStore>(
	(set, get) => ({
		userId: null,
		rows: [],

		initialize: async (userId) => {
			set({ userId });
			const { data, error } = await supabase
				.from("finance_categories")
				.select("*")
				.eq("user_id", userId);
			if (error) {
				// Most likely the migration hasn't been run yet. Built-in
				// categories keep working; only customisation is unavailable.
				console.error("Failed to load finance categories:", error.message);
				return;
			}
			set({ rows: (data || []).map(fromDb) });
		},

		addCategory: async ({ type, name, icon, color }) => {
			const { userId, rows } = get();
			if (!userId) throw new Error("Not signed in");
			const row = {
				id: generateId(),
				user_id: userId,
				type,
				key: `custom_${generateId().slice(0, 8)}`,
				name: name.trim(),
				icon,
				color,
				is_builtin: false,
				hidden: false,
			};
			const { error } = await supabase.from("finance_categories").insert(row);
			if (error) throw new Error(error.message);
			set({ rows: [...rows, fromDb(row)] });
		},

		updateCategory: async (id, updates) => {
			const { userId, rows } = get();
			if (!userId) throw new Error("Not signed in");
			const payload = {
				...updates,
				...(updates.name !== undefined && { name: updates.name.trim() }),
				updated_at: new Date().toISOString(),
			};
			const { error } = await supabase
				.from("finance_categories")
				.update(payload)
				.eq("id", id)
				.eq("user_id", userId);
			if (error) throw new Error(error.message);
			set({
				rows: rows.map((r) =>
					r.id === id
						? {
								...r,
								...updates,
								name: updates.name !== undefined ? updates.name.trim() : r.name,
							}
						: r,
				),
			});
		},

		deleteCategory: async (id) => {
			const { userId, rows } = get();
			if (!userId) throw new Error("Not signed in");
			const { error } = await supabase
				.from("finance_categories")
				.delete()
				.eq("id", id)
				.eq("user_id", userId)
				.eq("is_builtin", false);
			if (error) throw new Error(error.message);
			set({ rows: rows.filter((r) => r.id !== id) });
		},

		setBuiltinHidden: async (type, key, hidden) => {
			const { userId, rows } = get();
			if (!userId) throw new Error("Not signed in");
			const existing = rows.find(
				(r) => r.isBuiltin && r.type === type && r.key === key,
			);
			if (existing) {
				const { error } = await supabase
					.from("finance_categories")
					.update({ hidden, updated_at: new Date().toISOString() })
					.eq("id", existing.id)
					.eq("user_id", userId);
				if (error) throw new Error(error.message);
				set({
					rows: rows.map((r) => (r.id === existing.id ? { ...r, hidden } : r)),
				});
				return;
			}
			// First time this built-in is touched: the row only exists to carry
			// the hidden flag, so name/icon/color are placeholders.
			const row = {
				id: generateId(),
				user_id: userId,
				type,
				key,
				name: key,
				icon: "pricetag",
				color: "#95A5A6",
				is_builtin: true,
				hidden,
			};
			const { error } = await supabase.from("finance_categories").insert(row);
			if (error) throw new Error(error.message);
			set({ rows: [...rows, fromDb(row)] });
		},
	}),
);
