import { Theme, useColors } from "@/src/context/themeContext";
import { SplitActivity, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { EmptyState, money, relativeTime } from "./ui";

const ICONS: Record<SplitActivity["kind"], React.ComponentProps<typeof Ionicons>["name"]> = {
	expense_added: "add-circle",
	expense_edited: "create",
	expense_deleted: "trash",
	settlement_added: "checkmark-circle",
	settlement_edited: "create",
	settlement_deleted: "trash",
	comment_added: "chatbubble",
	member_added: "person-add",
	member_removed: "person-remove",
	group_updated: "settings",
	reminder_sent: "notifications",
};

interface Props {
	/** Groups whose activity to merge, newest first. */
	groups: SplitGroup[];
	currentUserId: string;
	currency: string;
	/** Show which group each entry is from (home feed). */
	showGroup?: boolean;
	limit?: number;
	onOpenExpense?: (group: SplitGroup, expenseId: string) => void;
}

export function ActivityList({ groups, currentUserId, currency, showGroup, limit = 150, onOpenExpense }: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);

	const entries = useMemo(
		() =>
			groups
				.flatMap((group) => (group.activity ?? []).map((entry) => ({ group, entry })))
				.sort((a, b) => b.entry.at.localeCompare(a.entry.at))
				.slice(0, limit),
		[groups, limit],
	);

	if (entries.length === 0) {
		return (
			<EmptyState
				icon="pulse-outline"
				title="No activity yet"
				text="Expenses, payments and comments will show up here."
			/>
		);
	}

	return (
		<View>
			{entries.map(({ group, entry }) => {
				const you = entry.actorUserId === currentUserId;
				const tone =
					entry.kind.endsWith("deleted") || entry.kind === "member_removed"
						? theme.error
						: entry.kind === "settlement_added"
							? theme.success
							: theme.primary;
				const canOpen =
					!!onOpenExpense &&
					!!entry.expenseId &&
					group.expenses.some((e) => e.id === entry.expenseId);
				return (
					<TouchableOpacity
						key={`${group.id}:${entry.id}`}
						style={s.row}
						disabled={!canOpen}
						onPress={() => canOpen && onOpenExpense!(group, entry.expenseId!)}
						activeOpacity={0.7}
					>
						<View style={[s.icon, { backgroundColor: tone + "1F" }]}>
							<Ionicons name={ICONS[entry.kind]} size={16} color={tone} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={s.text}>
								<Text style={s.actor}>{you ? "You" : entry.actorName}</Text> {entry.text}
								{showGroup && <Text style={s.group}> in {group.name}</Text>}
							</Text>
							<Text style={s.time}>
								{relativeTime(entry.at)}
								{entry.amount !== undefined ? ` · ${money(entry.amount, currency)}` : ""}
							</Text>
						</View>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		row: { flexDirection: "row", gap: 12, paddingVertical: 10 },
		icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
		text: { fontSize: 14, color: theme.textSecondary, lineHeight: 19 },
		actor: { fontWeight: "700", color: theme.text },
		group: { color: theme.textMuted },
		time: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
	});
