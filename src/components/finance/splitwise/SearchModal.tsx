import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { expensePayers } from "@/src/services/splitwiseMath";
import { SplitExpense, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState, money, Sheet, shortDate } from "./ui";

interface Props {
	visible: boolean;
	onClose: () => void;
	groups: SplitGroup[];
	currency: string;
	onSelect: (group: SplitGroup, expense: SplitExpense) => void;
}

/** Matches description, note, category, payer, items, comments and amount. */
export function SearchModal({ visible, onClose, groups, currency, onSelect }: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const [query, setQuery] = useState("");

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (q.length < 2) return [];
		const hits: { group: SplitGroup; expense: SplitExpense }[] = [];
		for (const group of groups) {
			const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? "";
			for (const expense of group.expenses) {
				const haystack = [
					expense.description,
					expense.note ?? "",
					categories.getInfo("expense", expense.category)?.name ?? "",
					group.name,
					String(expense.amount),
					...expensePayers(expense).map((p) => nameOf(p.memberId)),
					...(expense.items ?? []).map((it) => it.name),
					...(expense.comments ?? []).map((c) => c.text),
				]
					.join(" ")
					.toLowerCase();
				if (haystack.includes(q)) hits.push({ group, expense });
			}
		}
		return hits.sort((a, b) => b.expense.date.localeCompare(a.expense.date)).slice(0, 100);
	}, [query, groups]);

	return (
		<Sheet visible={visible} onClose={onClose} title="Search expenses" tall>
			<View style={s.searchBox}>
				<Ionicons name="search" size={18} color={theme.textMuted} />
				<TextInput
					style={s.input}
					placeholder="Dinner, Rahul, 450, Goa…"
					placeholderTextColor={theme.textMuted}
					value={query}
					onChangeText={setQuery}
					autoFocus
				/>
				{query.length > 0 && (
					<TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
						<Ionicons name="close-circle" size={18} color={theme.textMuted} />
					</TouchableOpacity>
				)}
			</View>

			{query.trim().length >= 2 && results.length === 0 && (
				<EmptyState icon="search-outline" title="No matches" text="Try a name, amount or place." />
			)}
			{query.trim().length >= 2 && results.length > 0 && (
				<Text style={s.count}>
					{results.length} result{results.length === 1 ? "" : "s"}
				</Text>
			)}

			{results.map(({ group, expense }) => {
				const cat = categories.getInfo("expense", expense.category);
				return (
					<TouchableOpacity
						key={`${group.id}:${expense.id}`}
						style={s.row}
						onPress={() => onSelect(group, expense)}
					>
						<View style={[s.icon, { backgroundColor: group.color + "22" }]}>
							<Ionicons name={(cat?.icon || "receipt") as any} size={18} color={group.color} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={s.title} numberOfLines={1}>
								{expense.description}
							</Text>
							<Text style={s.meta} numberOfLines={1}>
								{group.name} · {shortDate(expense.date)}
							</Text>
						</View>
						<Text style={s.amount}>{money(expense.amount, currency)}</Text>
					</TouchableOpacity>
				);
			})}
		</Sheet>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		searchBox: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.surface,
			borderRadius: 14,
			paddingHorizontal: 12,
			marginBottom: 12,
		},
		input: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 12 },
		count: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
		row: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			paddingVertical: 10,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: theme.border,
		},
		icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
		title: { fontSize: 15, fontWeight: "600", color: theme.text },
		meta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
		amount: { fontSize: 15, fontWeight: "700", color: theme.text },
	});
