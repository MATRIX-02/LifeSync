import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import * as SplitWiseService from "@/src/services/splitwiseService";
import {
	calculateDebts,
	calculateGroupBalances,
	Debt,
	expensePayers,
	isFriendGroup,
	isSimplified,
	myShare,
} from "@/src/services/splitwiseMath";
import { isValidUpiId } from "@/src/services/upi";
import { GroupMember, Settlement, SplitExpense, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ActivityList } from "./ActivityList";
import { DetailTab } from "./constants";
import { SettleTarget } from "./SettleUpModal";
import { Avatar, balanceColor, Card, EmptyState, money, Sheet } from "./ui";

interface Props {
	group: SplitGroup;
	currency: string;
	currentUserId: string;
	detailTab: DetailTab;
	setDetailTab: (tab: DetailTab) => void;
	onBack: () => void;
	onAddExpense: () => void;
	onOpenExpense: (expense: SplitExpense) => void;
	onSettle: (target: SettleTarget) => void;
	onOpenSettings: () => void;
	onOpenCharts: () => void;
	onAddMember: () => void;
	onInviteUser: () => void;
	onRemoveMember: (member: GroupMember) => void;
	onChanged: (group: SplitGroup) => void;
}

const TABS: { key: DetailTab; label: string }[] = [
	{ key: "expenses", label: "Expenses" },
	{ key: "balances", label: "Balances" },
	{ key: "activity", label: "Activity" },
	{ key: "members", label: "Members" },
];

type Entry =
	| { kind: "expense"; date: string; expense: SplitExpense }
	| { kind: "payment"; date: string; settlement: Settlement };

export function GroupDetailView({
	group,
	currency,
	currentUserId,
	detailTab,
	setDetailTab,
	onBack,
	onAddExpense,
	onOpenExpense,
	onSettle,
	onOpenSettings,
	onOpenCharts,
	onAddMember,
	onInviteUser,
	onRemoveMember,
	onChanged,
}: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const [upiFor, setUpiFor] = useState<GroupMember | null>(null);

	const members = group.members;
	const me = members.find((m) => m.userId === currentUserId);
	const isAdmin = me?.role === "admin";
	const friend = isFriendGroup(group);
	const balances = useMemo(() => calculateGroupBalances(group), [group]);
	const debts = useMemo(() => calculateDebts(group), [group]);
	const myBalance = balances.find((b) => b.memberId === me?.id)?.balance ?? 0;
	const totalSpent = group.expenses.reduce((sum, e) => sum + e.amount, 0);
	const label = (m?: GroupMember) => (m ? (m.isCurrentUser ? "You" : m.name) : "Former member");
	const memberById = (id: string) => members.find((m) => m.id === id);

	// Expenses and payments in one timeline, grouped by month.
	const sections = useMemo(() => {
		const entries: Entry[] = [
			...group.expenses.map((expense) => ({ kind: "expense" as const, date: expense.date, expense })),
			...group.settlements.map((settlement) => ({ kind: "payment" as const, date: settlement.date, settlement })),
		].sort((a, b) => b.date.localeCompare(a.date));
		const out: { title: string; entries: Entry[] }[] = [];
		for (const entry of entries) {
			const title = new Date(entry.date).toLocaleDateString([], { month: "long", year: "numeric" });
			if (out[out.length - 1]?.title !== title) out.push({ title, entries: [] });
			out[out.length - 1].entries.push(entry);
		}
		return out;
	}, [group]);

	const remind = async (debt: Debt) => {
		const pushed = await SplitWiseService.sendPaymentReminder(group, debt.from, money(debt.amount, currency));
		if (pushed) Alert.success("Reminder sent", `${debt.from.name} got a notification.`);
		else
			await Share.share({
				message: `Hi ${debt.from.name}, a reminder: you owe ${money(debt.amount, currency)} in "${group.name}" on Split Wise.${
					me?.upiId ? ` You can pay me on UPI: ${me.upiId}` : ""
				}`,
			});
	};

	const firstMyDebt = debts.find((d) => d.from.id === me?.id || d.to.id === me?.id);

	return (
		<View style={s.container}>
			{/* Header */}
			<View style={s.header}>
				<TouchableOpacity onPress={onBack} hitSlop={10} style={s.headerButton}>
					<Ionicons name="arrow-back" size={22} color={theme.text} />
				</TouchableOpacity>
				<View style={[s.groupIcon, { backgroundColor: group.color + "22" }]}>
					<Ionicons name={group.icon as any} size={18} color={group.color} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={s.title} numberOfLines={1}>
						{group.name}
					</Text>
					<Text style={s.subtitle}>
						{group.isArchived ? "Archived · " : ""}
						{friend ? "Non-group expenses" : `${members.length} members`}
					</Text>
				</View>
				<TouchableOpacity onPress={onOpenSettings} hitSlop={10} style={s.headerButton}>
					<Ionicons name="settings-outline" size={21} color={theme.text} />
				</TouchableOpacity>
			</View>

			{/* Your position in this group */}
			<View style={[s.summary, { backgroundColor: group.color + "14" }]}>
				<View style={{ flex: 1 }}>
					<Text style={s.summaryLabel}>
						{myBalance > 0.01 ? "You are owed" : myBalance < -0.01 ? "You owe" : "You're all settled"}
					</Text>
					{Math.abs(myBalance) > 0.01 && (
						<Text style={[s.summaryValue, { color: balanceColor(theme, myBalance) }]}>
							{money(Math.abs(myBalance), currency)}
						</Text>
					)}
					<Text style={s.summaryMeta}>Total spent {money(totalSpent, currency)}</Text>
				</View>
				<View style={s.summaryActions}>
					{firstMyDebt && (
						<TouchableOpacity
							style={[s.pill, { backgroundColor: group.color }]}
							onPress={() =>
								onSettle({ fromId: firstMyDebt.from.id, toId: firstMyDebt.to.id, amount: firstMyDebt.amount })
							}
						>
							<Text style={s.pillText}>Settle up</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity style={s.pillGhost} onPress={onOpenCharts}>
						<Ionicons name="bar-chart-outline" size={14} color={theme.text} />
						<Text style={s.pillGhostText}>Charts</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Tabs */}
			<View style={s.tabs}>
				{TABS.map((t) => (
					<TouchableOpacity
						key={t.key}
						style={[s.tab, detailTab === t.key && { borderBottomColor: group.color }]}
						onPress={() => setDetailTab(t.key)}
					>
						<Text style={[s.tabText, detailTab === t.key && { color: theme.text }]}>{t.label}</Text>
					</TouchableOpacity>
				))}
			</View>

			<ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
				{detailTab === "expenses" &&
					(sections.length === 0 ? (
						<EmptyState icon="receipt-outline" title="No expenses yet" text="Tap Add expense to get started." />
					) : (
						sections.map((section) => (
							<View key={section.title}>
								<Text style={s.month}>{section.title}</Text>
								{section.entries.map((entry) =>
									entry.kind === "expense" ? (
										<ExpenseRow
											key={entry.expense.id}
											expense={entry.expense}
											group={group}
											meId={me?.id}
											currency={currency}
											icon={categories.getInfo("expense", entry.expense.category)?.icon}
											label={label}
											memberById={memberById}
											onPress={() => onOpenExpense(entry.expense)}
											s={s}
											theme={theme}
										/>
									) : (
										<TouchableOpacity
											key={entry.settlement.id}
											style={s.row}
											onPress={() =>
												onSettle({
													fromId: entry.settlement.fromMemberId,
													toId: entry.settlement.toMemberId,
													amount: entry.settlement.amount,
													settlement: entry.settlement,
												})
											}
										>
											<DateBlock iso={entry.settlement.date} s={s} />
											<View style={[s.rowIcon, { backgroundColor: theme.success + "1F" }]}>
												<Ionicons
													name={entry.settlement.method === "upi" ? "flash" : "cash-outline"}
													size={18}
													color={theme.success}
												/>
											</View>
											<View style={{ flex: 1 }}>
												<Text style={s.rowTitle} numberOfLines={1}>
													{label(memberById(entry.settlement.fromMemberId))} paid{" "}
													{label(memberById(entry.settlement.toMemberId))}
												</Text>
												<Text style={s.rowMeta}>
													{entry.settlement.method === "upi" ? "UPI" : "Payment"}
													{entry.settlement.note ? ` · ${entry.settlement.note}` : ""}
												</Text>
											</View>
											<Text style={[s.rowRight, { color: theme.success }]}>
												{money(entry.settlement.amount, currency)}
											</Text>
										</TouchableOpacity>
									),
								)}
							</View>
						))
					))}

				{detailTab === "balances" && (
					<>
						<Text style={s.note}>
							{isSimplified(group)
								? "Simplified to the fewest payments. Change in group settings."
								: "Showing who owes whom without simplifying."}
						</Text>
						{debts.length === 0 ? (
							<EmptyState icon="checkmark-circle-outline" title="All settled up" />
						) : (
							debts.map((debt, i) => {
								const toMe = debt.to.id === me?.id;
								return (
									<Card key={i} style={s.debtCard}>
										<Avatar name={debt.from.name} size={34} />
										<View style={{ flex: 1 }}>
											<Text style={s.debtText}>
												<Text style={s.bold}>{label(debt.from)}</Text>
												{debt.from.isCurrentUser ? " owe " : " owes "}
												<Text style={s.bold}>{label(debt.to)}</Text>
											</Text>
											<Text style={[s.debtAmount, { color: theme.error }]}>{money(debt.amount, currency)}</Text>
										</View>
										{toMe && (
											<TouchableOpacity style={s.smallGhost} onPress={() => remind(debt)}>
												<Ionicons name="notifications-outline" size={16} color={theme.text} />
											</TouchableOpacity>
										)}
										<TouchableOpacity
											style={[s.smallPill, { backgroundColor: group.color }]}
											onPress={() => onSettle({ fromId: debt.from.id, toId: debt.to.id, amount: debt.amount })}
										>
											<Text style={s.pillText}>{debt.from.isCurrentUser && debt.to.upiId ? "Pay" : "Settle"}</Text>
										</TouchableOpacity>
									</Card>
								);
							})
						)}

						<Text style={s.month}>Everyone</Text>
						<Card style={{ paddingVertical: 4 }}>
							{balances.map((b) => (
								<View key={b.memberId} style={s.balanceRow}>
									<Avatar name={b.memberName} size={30} />
									<Text style={s.rowTitle}>{label(memberById(b.memberId))}</Text>
									<Text style={[s.balanceText, { color: balanceColor(theme, b.balance) }]}>
										{b.balance > 0.01
											? `gets back ${money(b.balance, currency)}`
											: b.balance < -0.01
												? `owes ${money(-b.balance, currency)}`
												: "settled"}
									</Text>
								</View>
							))}
						</Card>
					</>
				)}

				{detailTab === "activity" && (
					<ActivityList
						groups={[group]}
						currentUserId={currentUserId}
						currency={currency}
						onOpenExpense={(_, id) => {
							const expense = group.expenses.find((e) => e.id === id);
							if (expense) onOpenExpense(expense);
						}}
					/>
				)}

				{detailTab === "members" && (
					<>
						<Card style={{ paddingVertical: 4 }}>
							{members.map((m) => {
								const bal = balances.find((b) => b.memberId === m.id)?.balance ?? 0;
								return (
									<View key={m.id} style={s.memberRow}>
										<Avatar name={m.name} size={38} />
										<View style={{ flex: 1 }}>
											<View style={s.memberTop}>
												<Text style={s.rowTitle}>{label(m)}</Text>
												{m.role === "admin" && <Text style={s.tag}>Admin</Text>}
												{m.pendingUserId && <Text style={[s.tag, { color: theme.warning }]}>Invited</Text>}
												{m.userId && !m.isCurrentUser && (
													<Ionicons name="checkmark-circle" size={14} color={theme.success} />
												)}
											</View>
											<TouchableOpacity onPress={() => setUpiFor(m)} hitSlop={6}>
												<Text style={[s.rowMeta, !m.upiId && { color: theme.primary }]}>
													{m.upiId ? `UPI: ${m.upiId}` : m.isCurrentUser ? "Add your UPI ID" : "Add UPI ID"}
												</Text>
											</TouchableOpacity>
										</View>
										<Text style={[s.balanceText, { color: balanceColor(theme, bal) }]}>
											{Math.abs(bal) > 0.01 ? money(bal, currency) : "settled"}
										</Text>
										{(m.isCurrentUser || (isAdmin && !m.isCurrentUser)) && (
											<TouchableOpacity onPress={() => onRemoveMember(m)} hitSlop={8} style={{ marginLeft: 8 }}>
												<Ionicons
													name={m.isCurrentUser ? "exit-outline" : "close-circle-outline"}
													size={20}
													color={theme.textMuted}
												/>
											</TouchableOpacity>
										)}
									</View>
								);
							})}
						</Card>
						{!friend && (
						<View style={s.memberButtons}>
							<TouchableOpacity style={s.memberButton} onPress={onInviteUser}>
								<Ionicons name="mail-outline" size={18} color={theme.primary} />
								<Text style={s.memberButtonText}>Invite LifeSync user</Text>
							</TouchableOpacity>
							<TouchableOpacity style={s.memberButton} onPress={onAddMember}>
								<Ionicons name="person-add-outline" size={18} color={theme.primary} />
								<Text style={s.memberButtonText}>Add by name</Text>
							</TouchableOpacity>
						</View>
						)}
					</>
				)}
				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={[s.fab, { backgroundColor: group.color }]} onPress={onAddExpense}>
				<Ionicons name="add" size={22} color="#FFFFFF" />
				<Text style={s.fabText}>Add expense</Text>
			</TouchableOpacity>

			<UpiSheet
				member={upiFor}
				group={group}
				onClose={() => setUpiFor(null)}
				onSaved={(g) => {
					onChanged(g);
					setUpiFor(null);
				}}
			/>
		</View>
	);
}

function DateBlock({ iso, s }: { iso: string; s: ReturnType<typeof createStyles> }) {
	const d = new Date(iso);
	return (
		<View style={s.dateBlock}>
			<Text style={s.dateMonth}>{d.toLocaleDateString([], { month: "short" })}</Text>
			<Text style={s.dateDay}>{d.getDate()}</Text>
		</View>
	);
}

function ExpenseRow({
	expense,
	group,
	meId,
	currency,
	icon,
	label,
	memberById,
	onPress,
	s,
	theme,
}: {
	expense: SplitExpense;
	group: SplitGroup;
	meId?: string;
	currency: string;
	icon?: string;
	label: (m?: GroupMember) => string;
	memberById: (id: string) => GroupMember | undefined;
	onPress: () => void;
	s: ReturnType<typeof createStyles>;
	theme: Theme;
}) {
	const payers = expensePayers(expense);
	const paidByText =
		payers.length > 1
			? `${payers.length} people paid ${money(expense.amount, currency)}`
			: `${label(memberById(payers[0].memberId))} paid ${money(expense.amount, currency)}`;
	const iPaid = meId ? payers.find((p) => p.memberId === meId)?.amount ?? 0 : 0;
	const myPart = meId ? myShare(expense, meId) : 0;
	const net = iPaid - myPart;
	return (
		<TouchableOpacity style={s.row} onPress={onPress}>
			<DateBlock iso={expense.date} s={s} />
			<View style={[s.rowIcon, { backgroundColor: group.color + "1F" }]}>
				<Ionicons name={(icon || "receipt") as any} size={18} color={group.color} />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={s.rowTitle} numberOfLines={1}>
					{expense.description}
					{expense.recurringId ? "  ↻" : ""}
				</Text>
				<Text style={s.rowMeta} numberOfLines={1}>
					{paidByText}
					{(expense.comments?.length ?? 0) > 0 ? `  ·  💬 ${expense.comments!.length}` : ""}
				</Text>
			</View>
			<View style={{ alignItems: "flex-end" }}>
				{Math.abs(net) > 0.01 ? (
					<>
						<Text style={[s.rowSmall, { color: balanceColor(theme, net) }]}>
							{net > 0 ? "you lent" : "you borrowed"}
						</Text>
						<Text style={[s.rowRight, { color: balanceColor(theme, net) }]}>{money(Math.abs(net), currency)}</Text>
					</>
				) : (
					<Text style={[s.rowSmall, { color: theme.textMuted }]}>{iPaid > 0 || myPart > 0 ? "settled" : "not involved"}</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

function UpiSheet({
	member,
	group,
	onClose,
	onSaved,
}: {
	member: GroupMember | null;
	group: SplitGroup;
	onClose: () => void;
	onSaved: (group: SplitGroup) => void;
}) {
	const theme = useColors();
	const [value, setValue] = useState("");
	React.useEffect(() => setValue(member?.upiId ?? ""), [member?.id]);
	if (!member) return null;

	const save = async () => {
		const v = value.trim();
		if (v && !isValidUpiId(v)) return Alert.warning("Check the UPI ID", "It looks like name@bank, e.g. rahul@okaxis.");
		const { data, error } = await SplitWiseService.setMemberUpi(group.id, member.id, v);
		if (error) return Alert.error("Couldn't save", error);
		if (data) onSaved(data);
	};

	return (
		<Sheet visible onClose={onClose} title={member.isCurrentUser ? "Your UPI ID" : `${member.name}'s UPI ID`} right={{ label: "Save", onPress: save }}>
			<TextInput
				style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 14, fontSize: 15, color: theme.text }}
				placeholder="name@okaxis"
				placeholderTextColor={theme.textMuted}
				autoCapitalize="none"
				autoCorrect={false}
				value={value}
				onChangeText={setValue}
				autoFocus
			/>
			<Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>
				Lets others in this group pay {member.isCurrentUser ? "you" : member.name} straight from a UPI app. Find it
				in GPay, PhonePe or Paytm under your profile.
			</Text>
		</Sheet>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: theme.background },
		header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
		headerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
		groupIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
		title: { fontSize: 19, fontWeight: "800", color: theme.text },
		subtitle: { fontSize: 12, color: theme.textSecondary },
		summary: { marginHorizontal: 16, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center" },
		summaryLabel: { fontSize: 13, color: theme.textSecondary, fontWeight: "600" },
		summaryValue: { fontSize: 28, fontWeight: "800", marginTop: 2 },
		summaryMeta: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
		summaryActions: { gap: 8, alignItems: "flex-end" },
		pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18 },
		pillText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
		pillGhost: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			paddingHorizontal: 12,
			paddingVertical: 7,
			borderRadius: 16,
			backgroundColor: theme.surface,
		},
		pillGhostText: { fontSize: 12, fontWeight: "600", color: theme.text },
		tabs: { flexDirection: "row", paddingHorizontal: 16, marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
		tab: { flex: 1, alignItems: "center", paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
		tabText: { fontSize: 14, fontWeight: "700", color: theme.textMuted },
		content: { paddingHorizontal: 16, paddingTop: 8 },
		month: { fontSize: 13, fontWeight: "700", color: theme.textMuted, marginTop: 14, marginBottom: 4 },
		row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
		dateBlock: { width: 30, alignItems: "center" },
		dateMonth: { fontSize: 10, color: theme.textMuted, textTransform: "uppercase" },
		dateDay: { fontSize: 16, fontWeight: "700", color: theme.textSecondary },
		rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
		rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.text },
		rowMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
		rowSmall: { fontSize: 11, fontWeight: "600" },
		rowRight: { fontSize: 15, fontWeight: "800" },
		note: { fontSize: 12, color: theme.textMuted, marginVertical: 8 },
		debtCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
		debtText: { fontSize: 14, color: theme.textSecondary },
		bold: { fontWeight: "700", color: theme.text },
		debtAmount: { fontSize: 17, fontWeight: "800", marginTop: 2 },
		smallPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
		smallGhost: {
			width: 34,
			height: 34,
			borderRadius: 17,
			backgroundColor: theme.surfaceLight,
			alignItems: "center",
			justifyContent: "center",
		},
		balanceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
		balanceText: { fontSize: 13, fontWeight: "700" },
		memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
		memberTop: { flexDirection: "row", alignItems: "center", gap: 6 },
		tag: { fontSize: 11, fontWeight: "700", color: theme.primary },
		memberButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
		memberButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 12,
			borderRadius: 14,
			backgroundColor: theme.primary + "14",
		},
		memberButtonText: { fontSize: 13, fontWeight: "700", color: theme.primary },
		fab: {
			position: "absolute",
			right: 18,
			bottom: 24,
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 20,
			paddingVertical: 14,
			borderRadius: 28,
			elevation: 6,
			shadowColor: "#000",
			shadowOpacity: 0.2,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
		},
		fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
	});
