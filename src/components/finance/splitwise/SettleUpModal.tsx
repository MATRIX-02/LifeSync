import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import * as SplitWiseService from "@/src/services/splitwiseService";
import { openUpiPayment } from "@/src/services/upi";
import { Settlement, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Avatar, Chip, Label, money, Sheet } from "./ui";

export interface SettleTarget {
	fromId: string;
	toId: string;
	amount: number;
	/** Set to edit an existing payment. */
	settlement?: Settlement;
}

interface Props {
	group: SplitGroup | null;
	target: SettleTarget | null;
	currency: string;
	onClose: () => void;
	onChanged: (group: SplitGroup) => void;
}

export function SettleUpModal({ group, target, currency, onClose, onChanged }: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [fromId, setFromId] = useState("");
	const [toId, setToId] = useState("");
	const [amountText, setAmountText] = useState("");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!target) return;
		setFromId(target.fromId);
		setToId(target.toId);
		setAmountText(String(target.settlement?.amount ?? target.amount));
		setNote(target.settlement?.note ?? "");
	}, [target]);

	if (!group || !target) return null;
	const members = group.members;
	const from = members.find((m) => m.id === fromId);
	const to = members.find((m) => m.id === toId);
	const label = (id: string) => {
		const m = members.find((x) => x.id === id);
		return m?.isCurrentUser ? "You" : m?.name ?? "?";
	};
	const amount = parseFloat(amountText) || 0;
	const editing = !!target.settlement;
	const canUpi = !editing && !!from?.isCurrentUser && !!to?.upiId && amount > 0;

	const save = async (method: "cash" | "upi" = "cash") => {
		if (!fromId || !toId || fromId === toId) return Alert.warning("Check names", "Pick who paid and who received.");
		if (amount <= 0) return Alert.warning("Add an amount", "Enter how much was paid.");
		setSaving(true);
		const input = {
			fromMemberId: fromId,
			toMemberId: toId,
			amount: Math.round(amount * 100) / 100,
			note: note.trim() || undefined,
			date: target.settlement?.date ?? new Date().toISOString(),
			method: target.settlement?.method ?? method,
		};
		const { data, error } = editing
			? await SplitWiseService.updateSettlement(group.id, target.settlement!.id, input)
			: await SplitWiseService.addSettlement(group.id, input);
		setSaving(false);
		if (error) return Alert.error("Couldn't save", error);
		if (data) onChanged(data);
		onClose();
	};

	const payUpi = async () => {
		if (!to?.upiId) return;
		const opened = await openUpiPayment({
			vpa: to.upiId,
			name: to.name,
			amount,
			note: `${group.name} - Split Wise`,
		});
		if (!opened) return Alert.error("No UPI app", "Install GPay, PhonePe, Paytm or another UPI app.");
		// UPI apps don't report back, so ask before recording.
		Alert.alert("Did the payment go through?", `Record ${money(amount, currency)} paid to ${to.name}?`, [
			{ text: "Not yet", style: "cancel" },
			{ text: "Yes, record it", onPress: () => save("upi") },
		]);
	};

	const remove = () =>
		Alert.alert("Delete payment?", "Balances go back to how they were before it.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					const { data, error } = await SplitWiseService.deleteSettlement(group.id, target.settlement!.id);
					if (error) return Alert.error("Couldn't delete", error);
					if (data) onChanged(data);
					onClose();
				},
			},
		]);

	return (
		<Sheet
			visible
			onClose={onClose}
			title={editing ? "Edit payment" : "Settle up"}
			right={{ label: saving ? "Saving…" : "Save", onPress: () => save(), disabled: saving }}
		>
			<View style={s.flow}>
				<View style={s.person}>
					<Avatar name={from?.name ?? "?"} size={52} />
					<Text style={s.personName}>{label(fromId)}</Text>
				</View>
				<View style={s.arrow}>
					<Text style={s.paid}>paid</Text>
					<Ionicons name="arrow-forward" size={22} color={theme.success} />
				</View>
				<View style={s.person}>
					<Avatar name={to?.name ?? "?"} size={52} />
					<Text style={s.personName}>{label(toId)}</Text>
				</View>
			</View>

			<View style={s.amountRow}>
				<Text style={s.currency}>{currency}</Text>
				<TextInput
					style={s.amountInput}
					value={amountText}
					onChangeText={setAmountText}
					keyboardType="decimal-pad"
					placeholder="0"
					placeholderTextColor={theme.textMuted}
				/>
			</View>

			{canUpi && (
				<TouchableOpacity style={s.upi} onPress={payUpi}>
					<Ionicons name="flash" size={18} color="#FFFFFF" />
					<Text style={s.upiText}>Pay {money(amount, currency)} via UPI</Text>
				</TouchableOpacity>
			)}
			{!editing && from?.isCurrentUser && !to?.upiId && (
				<Text style={s.hint}>Add {to?.name}'s UPI ID in the group's Members tab to pay from here.</Text>
			)}

			<Label>WHO PAID</Label>
			<View style={s.chips}>
				{members.map((m) => (
					<Chip key={m.id} label={label(m.id)} active={fromId === m.id} onPress={() => setFromId(m.id)} />
				))}
			</View>
			<Label>WHO RECEIVED</Label>
			<View style={s.chips}>
				{members
					.filter((m) => m.id !== fromId)
					.map((m) => (
						<Chip key={m.id} label={label(m.id)} active={toId === m.id} onPress={() => setToId(m.id)} />
					))}
			</View>

			<Label>NOTE</Label>
			<TextInput
				style={s.note}
				placeholder="Optional, e.g. cash"
				placeholderTextColor={theme.textMuted}
				value={note}
				onChangeText={setNote}
			/>

			{editing && (
				<TouchableOpacity style={s.delete} onPress={remove}>
					<Ionicons name="trash-outline" size={18} color={theme.error} />
					<Text style={s.deleteText}>Delete payment</Text>
				</TouchableOpacity>
			)}
		</Sheet>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		flow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 6 },
		person: { alignItems: "center", width: 96 },
		personName: { fontSize: 14, fontWeight: "600", color: theme.text, marginTop: 6, textAlign: "center" },
		arrow: { alignItems: "center" },
		paid: { fontSize: 12, color: theme.textMuted },
		amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
		currency: { fontSize: 26, fontWeight: "700", color: theme.textMuted, marginRight: 4 },
		amountInput: { fontSize: 38, fontWeight: "800", color: theme.text, minWidth: 80, textAlign: "center" },
		upi: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.success,
			borderRadius: 16,
			paddingVertical: 14,
			marginTop: 16,
		},
		upiText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
		hint: { fontSize: 12, color: theme.textMuted, textAlign: "center", marginTop: 10 },
		chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		note: { backgroundColor: theme.surface, borderRadius: 14, padding: 12, fontSize: 14, color: theme.text },
		delete: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 },
		deleteText: { fontSize: 15, fontWeight: "600", color: theme.error },
	});
