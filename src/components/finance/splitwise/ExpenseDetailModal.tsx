import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import * as SplitWiseService from "@/src/services/splitwiseService";
import { expensePayers, FREQUENCY_LABELS } from "@/src/services/splitwiseMath";
import { SplitExpense, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Avatar, Label, money, relativeTime, Sheet } from "./ui";

interface Props {
	group: SplitGroup | null;
	expense: SplitExpense | null;
	currency: string;
	currentUserId: string;
	onClose: () => void;
	onEdit: (expense: SplitExpense) => void;
	/** Called after a change so the parent refreshes its copy of the group. */
	onChanged: (group: SplitGroup) => void;
}

export function ExpenseDetailModal({
	group,
	expense,
	currency,
	currentUserId,
	onClose,
	onEdit,
	onChanged,
}: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const [comment, setComment] = useState("");
	const [sending, setSending] = useState(false);

	if (!group || !expense) return null;
	const members = group.members;
	const nameOf = (id: string) => {
		const m = members.find((x) => x.id === id);
		return m?.isCurrentUser ? "You" : m?.name ?? "Former member";
	};
	const payers = expensePayers(expense);
	const category = categories.getInfo("expense", expense.category);
	const recurring = expense.recurringId
		? group.settings?.recurring?.find((r) => r.id === expense.recurringId)
		: undefined;

	const send = async () => {
		if (!comment.trim()) return;
		setSending(true);
		const { data, error } = await SplitWiseService.addComment(group.id, expense.id, comment);
		setSending(false);
		if (error) return Alert.error("Couldn't post", error);
		setComment("");
		if (data) onChanged(data);
	};

	const remove = () =>
		Alert.alert("Delete expense?", `"${expense.description}" will be removed for everyone.`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					const { error } = await SplitWiseService.deleteExpense(group.id, expense.id);
					if (error) return Alert.error("Couldn't delete", error);
					onClose();
				},
			},
		]);

	const removeComment = (commentId: string) =>
		Alert.alert("Delete comment?", "", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					const { data } = await SplitWiseService.deleteComment(group.id, expense.id, commentId);
					if (data) onChanged(data);
				},
			},
		]);

	return (
		<Sheet visible onClose={onClose} title="Expense" right={{ label: "Edit", onPress: () => onEdit(expense) }} tall>
			<View style={s.hero}>
				<View style={[s.icon, { backgroundColor: group.color + "22" }]}>
					<Ionicons name={(category?.icon || "receipt") as any} size={26} color={group.color} />
				</View>
				<Text style={s.title}>{expense.description}</Text>
				<Text style={s.amount}>{money(expense.amount, currency)}</Text>
				<Text style={s.meta}>
					{category?.name ?? "Other"} ·{" "}
					{new Date(expense.date).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}
				</Text>
				{recurring && (
					<View style={s.badge}>
						<Ionicons name="repeat" size={12} color={theme.primary} />
						<Text style={s.badgeText}>{FREQUENCY_LABELS[recurring.frequency]}</Text>
					</View>
				)}
			</View>

			<Label>PAID BY</Label>
			<View style={s.card}>
				{payers.map((p) => (
					<View key={p.memberId} style={s.row}>
						<Avatar name={nameOf(p.memberId)} size={28} />
						<Text style={s.rowName}>{nameOf(p.memberId)}</Text>
						<Text style={s.rowValue}>{money(p.amount, currency)}</Text>
					</View>
				))}
			</View>

			<Label>SPLIT · {expense.splitType === "itemized" ? "BY ITEM" : expense.splitType.toUpperCase()}</Label>
			<View style={s.card}>
				{expense.splits.map((x) => (
					<View key={x.memberId} style={s.row}>
						<Avatar name={nameOf(x.memberId)} size={28} />
						<Text style={s.rowName}>{nameOf(x.memberId)}</Text>
						<Text style={s.rowValue}>{money(x.amount, currency)}</Text>
					</View>
				))}
			</View>

			{expense.items && expense.items.length > 0 && (
				<>
					<Label>ITEMS</Label>
					<View style={s.card}>
						{expense.items.map((it) => (
							<View key={it.id} style={s.itemRow}>
								<View style={{ flex: 1 }}>
									<Text style={s.rowName}>{it.name}</Text>
									<Text style={s.itemPeople}>{it.memberIds.map(nameOf).join(", ")}</Text>
								</View>
								<Text style={s.rowValue}>{money(it.price, currency)}</Text>
							</View>
						))}
						{!!expense.extraCharges && (
							<View style={s.itemRow}>
								<Text style={[s.rowName, { flex: 1 }]}>Tax & charges</Text>
								<Text style={s.rowValue}>{money(expense.extraCharges, currency)}</Text>
							</View>
						)}
					</View>
				</>
			)}

			{expense.note && (
				<>
					<Label>NOTE</Label>
					<View style={s.card}>
						<Text style={s.note}>{expense.note}</Text>
					</View>
				</>
			)}

			<Label>COMMENTS</Label>
			{(expense.comments ?? []).map((c) => {
				const mine = !!c.userId && c.userId === currentUserId;
				return (
					<TouchableOpacity
						key={c.id}
						style={[s.comment, mine && s.commentMine]}
						onLongPress={mine ? () => removeComment(c.id) : undefined}
						activeOpacity={0.8}
					>
						<Text style={s.commentAuthor}>
							{mine ? "You" : c.authorName} · {relativeTime(c.createdAt)}
						</Text>
						<Text style={s.commentText}>{c.text}</Text>
					</TouchableOpacity>
				);
			})}
			<View style={s.composer}>
				<TextInput
					style={s.composerInput}
					placeholder="Add a comment"
					placeholderTextColor={theme.textMuted}
					value={comment}
					onChangeText={setComment}
					multiline
				/>
				<TouchableOpacity onPress={send} disabled={!comment.trim() || sending} hitSlop={8}>
					<Ionicons
						name="send"
						size={20}
						color={comment.trim() && !sending ? theme.primary : theme.textMuted}
					/>
				</TouchableOpacity>
			</View>

			<TouchableOpacity style={s.delete} onPress={remove}>
				<Ionicons name="trash-outline" size={18} color={theme.error} />
				<Text style={s.deleteText}>Delete expense</Text>
			</TouchableOpacity>
		</Sheet>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		hero: { alignItems: "center", paddingVertical: 8 },
		icon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
		title: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 10, textAlign: "center" },
		amount: { fontSize: 32, fontWeight: "800", color: theme.text, marginTop: 4 },
		meta: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
		badge: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			marginTop: 8,
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 10,
			backgroundColor: theme.primary + "1A",
		},
		badgeText: { fontSize: 12, fontWeight: "600", color: theme.primary },
		card: { backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
		row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
		rowName: { flex: 1, fontSize: 14, fontWeight: "500", color: theme.text },
		rowValue: { fontSize: 14, fontWeight: "700", color: theme.text },
		itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
		itemPeople: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
		note: { fontSize: 14, color: theme.text, paddingVertical: 8, lineHeight: 20 },
		comment: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 10,
			marginBottom: 8,
			maxWidth: "88%",
			alignSelf: "flex-start",
		},
		commentMine: { alignSelf: "flex-end", backgroundColor: theme.primary + "1A" },
		commentAuthor: { fontSize: 11, color: theme.textMuted, marginBottom: 2 },
		commentText: { fontSize: 14, color: theme.text },
		composer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			backgroundColor: theme.surface,
			borderRadius: 18,
			paddingHorizontal: 14,
			paddingVertical: 6,
		},
		composerInput: { flex: 1, fontSize: 14, color: theme.text, maxHeight: 100, paddingVertical: 6 },
		delete: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 },
		deleteText: { fontSize: 15, fontWeight: "600", color: theme.error },
	});
