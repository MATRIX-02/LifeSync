import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import * as SplitWiseService from "@/src/services/splitwiseService";
import { FriendBalance, isFriendGroup, myMember, round2 } from "@/src/services/splitwiseMath";
import { openUpiPayment } from "@/src/services/upi";
import { GroupMember, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Avatar, balanceColor, Card, Chip, Label, money, Sheet } from "./ui";

// ============== ADD FRIEND ==============

export function AddFriendModal({
	visible,
	onClose,
	currentUserId,
	onAdd,
}: {
	visible: boolean;
	onClose: () => void;
	currentUserId: string;
	/** Creates (or finds) the friend; returns an error message or null. */
	onAdd: (friend: { name: string; userId?: string; email?: string }) => Promise<string | null>;
}) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [mode, setMode] = useState<"email" | "name">("email");
	const [text, setText] = useState("");
	const [found, setFound] = useState<{ id: string; email: string; fullName: string | null } | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (visible) {
			setText("");
			setFound(null);
		}
	}, [visible]);

	const lookup = async () => {
		setBusy(true);
		const { data } = await SplitWiseService.searchUsersByEmail(text, currentUserId);
		setBusy(false);
		setFound(data[0] ?? null);
		if (!data[0]) Alert.info("Not on LifeSync", "No account uses that email. You can add them by name instead.");
	};

	const add = async (friend: { name: string; userId?: string; email?: string }) => {
		setBusy(true);
		const error = await onAdd(friend);
		setBusy(false);
		if (error) Alert.error("Couldn't add", error);
		else onClose();
	};

	return (
		<Sheet visible={visible} onClose={onClose} title="Add friend">
			<View style={s.chips}>
				<Chip label="LifeSync user" icon="mail-outline" active={mode === "email"} onPress={() => setMode("email")} />
				<Chip label="Anyone, by name" icon="person-outline" active={mode === "name"} onPress={() => setMode("name")} />
			</View>
			<TextInput
				style={s.input}
				placeholder={mode === "email" ? "Their exact email" : "Their name"}
				placeholderTextColor={theme.textMuted}
				value={text}
				onChangeText={(t) => {
					setText(t);
					setFound(null);
				}}
				autoCapitalize={mode === "email" ? "none" : "words"}
				keyboardType={mode === "email" ? "email-address" : "default"}
			/>
			<Text style={s.hint}>
				{mode === "email"
					? "They'll get an invite and see your shared expenses in their app."
					: "Only you see these expenses. You can still share reminders with them."}
			</Text>

			{found && (
				<Card style={s.found}>
					<Avatar name={found.fullName || found.email} />
					<View style={{ flex: 1 }}>
						<Text style={s.foundName}>{found.fullName || found.email}</Text>
						<Text style={s.hint}>{found.email}</Text>
					</View>
				</Card>
			)}

			<TouchableOpacity
				style={[s.primary, (!text.trim() || busy) && { opacity: 0.5 }]}
				disabled={!text.trim() || busy}
				onPress={() => {
					if (mode === "name") return add({ name: text.trim() });
					if (found) return add({ name: found.fullName || found.email, userId: found.id, email: found.email });
					return lookup();
				}}
			>
				{busy ? (
					<ActivityIndicator color="#FFFFFF" />
				) : (
					<Text style={s.primaryText}>{mode === "email" && !found ? "Find" : "Add friend"}</Text>
				)}
			</TouchableOpacity>
		</Sheet>
	);
}

// ============== FRIEND DETAIL ==============

interface DetailProps {
	friend: FriendBalance | null;
	/** Person record when there's no balance yet (Friends list includes settled people). */
	fallbackMember?: GroupMember;
	groups: SplitGroup[];
	currentUserId: string;
	currency: string;
	onClose: () => void;
	onOpenGroup: (group: SplitGroup) => void;
	onAddExpense: () => void;
	onChanged: () => void;
}

export function FriendDetailModal({
	friend,
	fallbackMember,
	groups,
	currentUserId,
	currency,
	onClose,
	onOpenGroup,
	onAddExpense,
	onChanged,
}: DetailProps) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [settling, setSettling] = useState(false);
	const [amountText, setAmountText] = useState("");
	const [busy, setBusy] = useState(false);

	const name = friend?.name ?? fallbackMember?.name ?? "";
	const net = friend?.net ?? 0;
	const breakdown = friend?.groups ?? [];
	const upiId =
		breakdown.find((b) => b.member.upiId)?.member.upiId ?? fallbackMember?.upiId;

	useEffect(() => {
		setSettling(false);
		setAmountText(Math.abs(net) > 0 ? String(round2(Math.abs(net))) : "");
	}, [friend?.key, fallbackMember?.id]);

	if (!friend && !fallbackMember) return null;

	/**
	 * Records the payment group by group, largest debts first, in the
	 * direction of the overall balance, until the amount is used up.
	 */
	const settle = async (method: "cash" | "upi") => {
		const amount = round2(parseFloat(amountText) || 0);
		if (amount <= 0) return Alert.warning("Add an amount", "Enter how much was paid.");
		const direction = Math.sign(net);
		const parts = breakdown
			.filter((b) => Math.sign(b.amount) === direction)
			.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
		let left = amount;
		setBusy(true);
		for (const part of parts) {
			if (left <= 0.005) break;
			const me = myMember(part.group, currentUserId);
			if (!me) continue;
			const pay = round2(Math.min(left, Math.abs(part.amount)));
			const theyPay = part.amount > 0;
			const { error } = await SplitWiseService.addSettlement(part.group.id, {
				fromMemberId: theyPay ? part.member.id : me.id,
				toMemberId: theyPay ? me.id : part.member.id,
				amount: pay,
				date: new Date().toISOString(),
				method,
				note: parts.length > 1 ? "Settled across groups" : undefined,
			});
			if (error) {
				setBusy(false);
				return Alert.error("Couldn't record", error);
			}
			left = round2(left - pay);
		}
		setBusy(false);
		if (left > 0.005) Alert.info("Recorded", `${money(amount - left, currency)} recorded. The rest was more than what's owed.`);
		setSettling(false);
		onChanged();
	};

	const payUpi = async () => {
		const amount = round2(parseFloat(amountText) || 0);
		if (!upiId || amount <= 0) return;
		const opened = await openUpiPayment({ vpa: upiId, name, amount, note: "Split Wise" });
		if (!opened) return Alert.error("No UPI app", "Install GPay, PhonePe, Paytm or another UPI app.");
		Alert.alert("Did the payment go through?", `Record ${money(amount, currency)} paid to ${name}?`, [
			{ text: "Not yet", style: "cancel" },
			{ text: "Yes, record it", onPress: () => settle("upi") },
		]);
	};

	const remind = async () => {
		const owing = breakdown.filter((b) => b.amount > 0);
		const totalText = money(net, currency);
		let pushed = false;
		for (const b of owing) {
			pushed = (await SplitWiseService.sendPaymentReminder(b.group, b.member, money(b.amount, currency))) || pushed;
		}
		if (pushed) {
			Alert.success("Reminder sent", `${name} got a notification.`);
		} else {
			await Share.share({
				message: `Hi ${name}, just a reminder: you owe me ${totalText} on Split Wise (${owing
					.map((b) => b.group.name)
					.join(", ")}).`,
			});
		}
		onChanged();
	};

	const sharedGroups = groups.filter(
		(g) => !isFriendGroup(g) && myMember(g, currentUserId) && g.members.some((m) => (friend ? breakdown.some((b) => b.member.id === m.id) : m.id === fallbackMember?.id)),
	);

	return (
		<Sheet visible onClose={onClose} title={name} tall>
			<View style={s.hero}>
				<Avatar name={name} size={64} />
				<Text style={[s.net, { color: balanceColor(theme, net) }]}>
					{net > 0.01
						? `owes you ${money(net, currency)}`
						: net < -0.01
							? `you owe ${money(-net, currency)}`
							: "all settled up"}
				</Text>
				{upiId && <Text style={s.hint}>UPI: {upiId}</Text>}
			</View>

			<View style={s.actions}>
				<Action s={s} theme={theme} icon="add" label="Add expense" onPress={onAddExpense} />
				{Math.abs(net) > 0.01 && (
					<Action s={s} theme={theme} icon="checkmark-done" label="Settle up" onPress={() => setSettling(true)} />
				)}
				{net > 0.01 && <Action s={s} theme={theme} icon="notifications-outline" label="Remind" onPress={remind} />}
			</View>

			{settling && (
				<Card style={{ marginTop: 14 }}>
					<Text style={s.settleTitle}>{net > 0 ? `${name} paid you` : `You paid ${name}`}</Text>
					<View style={s.amountRow}>
						<Text style={s.currency}>{currency}</Text>
						<TextInput
							style={s.amountInput}
							value={amountText}
							onChangeText={setAmountText}
							keyboardType="decimal-pad"
						/>
					</View>
					{net < 0 && upiId && (
						<TouchableOpacity style={[s.primary, { backgroundColor: theme.success }]} onPress={payUpi} disabled={busy}>
							<Text style={s.primaryText}>Pay via UPI</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity style={s.primary} onPress={() => settle("cash")} disabled={busy}>
						{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>Record payment</Text>}
					</TouchableOpacity>
				</Card>
			)}

			{breakdown.length > 0 && (
				<>
					<Label>BY GROUP</Label>
					<Card style={{ paddingVertical: 4 }}>
						{breakdown.map((b) => (
							<TouchableOpacity key={b.group.id} style={s.groupRow} onPress={() => onOpenGroup(b.group)}>
								<View style={[s.groupIcon, { backgroundColor: b.group.color + "22" }]}>
									<Ionicons name={b.group.icon as any} size={16} color={b.group.color} />
								</View>
								<Text style={s.groupName}>{isFriendGroup(b.group) ? "Non-group expenses" : b.group.name}</Text>
								<Text style={[s.groupAmount, { color: balanceColor(theme, b.amount) }]}>
									{b.amount > 0 ? "owes " : "you owe "}
									{money(Math.abs(b.amount), currency)}
								</Text>
							</TouchableOpacity>
						))}
					</Card>
				</>
			)}

			{sharedGroups.length > 0 && breakdown.length === 0 && (
				<>
					<Label>SHARED GROUPS</Label>
					<Card style={{ paddingVertical: 4 }}>
						{sharedGroups.map((g) => (
							<TouchableOpacity key={g.id} style={s.groupRow} onPress={() => onOpenGroup(g)}>
								<View style={[s.groupIcon, { backgroundColor: g.color + "22" }]}>
									<Ionicons name={g.icon as any} size={16} color={g.color} />
								</View>
								<Text style={s.groupName}>{g.name}</Text>
								<Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
							</TouchableOpacity>
						))}
					</Card>
				</>
			)}
		</Sheet>
	);
}

function Action({
	s,
	theme,
	icon,
	label,
	onPress,
}: {
	s: ReturnType<typeof createStyles>;
	theme: Theme;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	label: string;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity style={s.action} onPress={onPress}>
			<View style={s.actionIcon}>
				<Ionicons name={icon} size={20} color={theme.primary} />
			</View>
			<Text style={s.actionLabel}>{label}</Text>
		</TouchableOpacity>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		chips: { flexDirection: "row", gap: 8, marginBottom: 12 },
		input: { backgroundColor: theme.surface, borderRadius: 14, padding: 14, fontSize: 15, color: theme.text },
		hint: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
		found: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
		foundName: { fontSize: 15, fontWeight: "600", color: theme.text },
		primary: {
			backgroundColor: theme.primary,
			borderRadius: 14,
			paddingVertical: 13,
			alignItems: "center",
			marginTop: 14,
		},
		primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
		hero: { alignItems: "center", paddingVertical: 6 },
		net: { fontSize: 20, fontWeight: "800", marginTop: 10 },
		actions: { flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 18 },
		action: { alignItems: "center", width: 80 },
		actionIcon: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: theme.primary + "1A",
			alignItems: "center",
			justifyContent: "center",
		},
		actionLabel: { fontSize: 12, fontWeight: "600", color: theme.text, marginTop: 6, textAlign: "center" },
		settleTitle: { fontSize: 14, fontWeight: "600", color: theme.textSecondary, textAlign: "center" },
		amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6 },
		currency: { fontSize: 24, fontWeight: "700", color: theme.textMuted, marginRight: 4 },
		amountInput: { fontSize: 34, fontWeight: "800", color: theme.text, minWidth: 80, textAlign: "center" },
		groupRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
		groupIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
		groupName: { flex: 1, fontSize: 14, fontWeight: "500", color: theme.text },
		groupAmount: { fontSize: 13, fontWeight: "700" },
	});
