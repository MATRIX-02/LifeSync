import { Theme, useColors } from "@/src/context/themeContext";
import {
	calculateGroupBalances,
	FriendBalance,
	isFriendGroup,
	knownPeople,
	myMember,
} from "@/src/services/splitwiseMath";
import { GroupInvitation, GroupMember, SplitExpense, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActivityList } from "./ActivityList";
import { Avatar, balanceColor, EmptyState, money } from "./ui";

export type HomeTab = "groups" | "friends" | "activity";

interface Props {
	groups: SplitGroup[];
	friendBalances: FriendBalance[];
	pendingInvitations: GroupInvitation[];
	currentUserId: string;
	currency: string;
	refreshing: boolean;
	tab: HomeTab;
	setTab: (tab: HomeTab) => void;
	onRefresh: () => void;
	onSelectGroup: (group: SplitGroup) => void;
	onCreateGroup: () => void;
	onAddFriend: () => void;
	onOpenFriend: (key: string, member?: GroupMember) => void;
	onShowInvitations: () => void;
	onOpenSearch: () => void;
	onOpenCharts: () => void;
	onOpenExpense: (group: SplitGroup, expense: SplitExpense) => void;
}

export function GroupListView({
	groups,
	friendBalances,
	pendingInvitations,
	currentUserId,
	currency,
	refreshing,
	tab,
	setTab,
	onRefresh,
	onSelectGroup,
	onCreateGroup,
	onAddFriend,
	onOpenFriend,
	onShowInvitations,
	onOpenSearch,
	onOpenCharts,
	onOpenExpense,
}: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const [showArchived, setShowArchived] = useState(false);

	const owed = friendBalances.filter((f) => f.net > 0).reduce((sum, f) => sum + f.net, 0);
	const owe = friendBalances.filter((f) => f.net < 0).reduce((sum, f) => sum - f.net, 0);

	const realGroups = groups.filter((g) => !isFriendGroup(g));
	const active = realGroups.filter((g) => !g.isArchived);
	const archived = realGroups.filter((g) => g.isArchived);

	// Friends list: anyone with a balance first, then everyone else you share a group with.
	const settledPeople = useMemo(() => {
		const withBalance = new Set(friendBalances.map((f) => f.key));
		return [...knownPeople(groups, currentUserId).entries()].filter(([key]) => !withBalance.has(key));
	}, [groups, friendBalances, currentUserId]);

	const myGroupBalance = (g: SplitGroup) => {
		const me = myMember(g, currentUserId);
		return calculateGroupBalances(g).find((b) => b.memberId === me?.id)?.balance ?? 0;
	};

	const renderGroup = (group: SplitGroup) => {
		const bal = myGroupBalance(group);
		return (
			<TouchableOpacity key={group.id} style={s.groupRow} onPress={() => onSelectGroup(group)} activeOpacity={0.7}>
				<View style={[s.groupIcon, { backgroundColor: group.color + "22" }]}>
					<Ionicons name={group.icon as any} size={24} color={group.color} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={s.groupName} numberOfLines={1}>
						{group.name}
					</Text>
					<Text style={[s.groupBalance, { color: balanceColor(theme, bal) }]}>
						{bal > 0.01
							? `you are owed ${money(bal, currency)}`
							: bal < -0.01
								? `you owe ${money(-bal, currency)}`
								: group.expenses.length === 0
									? "no expenses yet"
									: "settled up"}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
			</TouchableOpacity>
		);
	};

	return (
		<ScrollView
			style={s.container}
			showsVerticalScrollIndicator={false}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
		>
			<View style={s.header}>
				<Text style={s.title}>Split Expenses</Text>
				<TouchableOpacity style={s.iconButton} onPress={onOpenSearch}>
					<Ionicons name="search" size={20} color={theme.text} />
				</TouchableOpacity>
				<TouchableOpacity style={s.iconButton} onPress={onOpenCharts}>
					<Ionicons name="bar-chart-outline" size={20} color={theme.text} />
				</TouchableOpacity>
				{pendingInvitations.length > 0 && (
					<TouchableOpacity style={s.iconButton} onPress={onShowInvitations}>
						<Ionicons name="mail-unread-outline" size={20} color={theme.text} />
						<View style={s.badge}>
							<Text style={s.badgeText}>{pendingInvitations.length}</Text>
						</View>
					</TouchableOpacity>
				)}
			</View>

			{/* Overall balance */}
			<View style={s.balanceCard}>
				<View style={s.balanceHalf}>
					<Text style={s.balanceLabel}>You are owed</Text>
					<Text style={[s.balanceValue, { color: theme.success }]}>{money(owed, currency)}</Text>
				</View>
				<View style={s.balanceDivider} />
				<View style={s.balanceHalf}>
					<Text style={s.balanceLabel}>You owe</Text>
					<Text style={[s.balanceValue, { color: theme.error }]}>{money(owe, currency)}</Text>
				</View>
			</View>
			<Text style={[s.netText, { color: balanceColor(theme, owed - owe) }]}>
				{Math.abs(owed - owe) < 0.01
					? "You're all settled up"
					: `Overall, ${owed > owe ? "you are owed" : "you owe"} ${money(Math.abs(owed - owe), currency)}`}
			</Text>

			{pendingInvitations.length > 0 && (
				<TouchableOpacity style={s.inviteBanner} onPress={onShowInvitations}>
					<Ionicons name="mail-unread" size={20} color={theme.primary} />
					<Text style={s.inviteText}>
						{pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? "s" : ""}
					</Text>
					<Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
				</TouchableOpacity>
			)}

			<View style={s.segment}>
				{(["groups", "friends", "activity"] as HomeTab[]).map((t) => (
					<TouchableOpacity key={t} style={[s.segmentItem, tab === t && s.segmentActive]} onPress={() => setTab(t)}>
						<Text style={[s.segmentText, tab === t && s.segmentTextActive]}>
							{t.charAt(0).toUpperCase() + t.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{tab === "groups" && (
				<View style={s.section}>
					{active.length === 0 ? (
						<EmptyState icon="people-outline" title="No groups yet" text="Create one for a trip, your flat, or anything you share." />
					) : (
						active.map(renderGroup)
					)}
					<TouchableOpacity style={s.addRow} onPress={onCreateGroup}>
						<Ionicons name="add-circle-outline" size={20} color={theme.primary} />
						<Text style={s.addText}>Create a group</Text>
					</TouchableOpacity>
					{archived.length > 0 && (
						<>
							<TouchableOpacity style={s.archivedToggle} onPress={() => setShowArchived((v) => !v)}>
								<Text style={s.archivedText}>Archived ({archived.length})</Text>
								<Ionicons name={showArchived ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
							</TouchableOpacity>
							{showArchived && <View style={{ opacity: 0.7 }}>{archived.map(renderGroup)}</View>}
						</>
					)}
				</View>
			)}

			{tab === "friends" && (
				<View style={s.section}>
					{friendBalances.map((f) => (
						<TouchableOpacity key={f.key} style={s.groupRow} onPress={() => onOpenFriend(f.key, f.groups[0]?.member)}>
							<Avatar name={f.name} size={44} />
							<View style={{ flex: 1 }}>
								<Text style={s.groupName}>{f.name}</Text>
								<Text style={[s.groupBalance, { color: balanceColor(theme, f.net) }]}>
									{f.net > 0 ? `owes you ${money(f.net, currency)}` : `you owe ${money(-f.net, currency)}`}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
						</TouchableOpacity>
					))}
					{settledPeople.map(([key, m]) => (
						<TouchableOpacity key={key} style={s.groupRow} onPress={() => onOpenFriend(key, m)}>
							<Avatar name={m.name} size={44} />
							<View style={{ flex: 1 }}>
								<Text style={s.groupName}>{m.name}</Text>
								<Text style={[s.groupBalance, { color: theme.textMuted }]}>settled up</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
						</TouchableOpacity>
					))}
					{friendBalances.length === 0 && settledPeople.length === 0 && (
						<EmptyState icon="person-outline" title="No friends yet" text="Add someone to split one-off costs without a group." />
					)}
					<TouchableOpacity style={s.addRow} onPress={onAddFriend}>
						<Ionicons name="person-add-outline" size={20} color={theme.primary} />
						<Text style={s.addText}>Add a friend</Text>
					</TouchableOpacity>
				</View>
			)}

			{tab === "activity" && (
				<View style={s.section}>
					<ActivityList
						groups={groups}
						currentUserId={currentUserId}
						currency={currency}
						showGroup
						onOpenExpense={(group, id) => {
							const expense = group.expenses.find((e) => e.id === id);
							if (expense) onOpenExpense(group, expense);
						}}
					/>
				</View>
			)}
			<View style={{ height: 40 }} />
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: theme.background },
		header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 8 },
		title: { flex: 1, fontSize: 24, fontWeight: "800", color: theme.text },
		iconButton: {
			width: 38,
			height: 38,
			borderRadius: 19,
			backgroundColor: theme.surface,
			alignItems: "center",
			justifyContent: "center",
		},
		badge: {
			position: "absolute",
			top: -2,
			right: -2,
			minWidth: 16,
			height: 16,
			borderRadius: 8,
			backgroundColor: theme.error,
			alignItems: "center",
			justifyContent: "center",
		},
		badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
		balanceCard: {
			flexDirection: "row",
			marginHorizontal: 16,
			marginTop: 16,
			backgroundColor: theme.surface,
			borderRadius: 20,
			paddingVertical: 16,
		},
		balanceHalf: { flex: 1, alignItems: "center" },
		balanceDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.border },
		balanceLabel: { fontSize: 13, color: theme.textSecondary },
		balanceValue: { fontSize: 24, fontWeight: "800", marginTop: 4 },
		netText: { textAlign: "center", fontSize: 13, fontWeight: "600", marginTop: 10 },
		inviteBanner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginHorizontal: 16,
			marginTop: 12,
			padding: 12,
			borderRadius: 14,
			backgroundColor: theme.primary + "14",
		},
		inviteText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.text },
		segment: {
			flexDirection: "row",
			marginHorizontal: 16,
			marginTop: 18,
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 3,
		},
		segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11 },
		segmentActive: { backgroundColor: theme.primary },
		segmentText: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
		segmentTextActive: { color: "#FFFFFF" },
		section: { paddingHorizontal: 16, paddingTop: 8 },
		groupRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
		groupIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
		groupName: { fontSize: 16, fontWeight: "700", color: theme.text },
		groupBalance: { fontSize: 13, fontWeight: "600", marginTop: 2 },
		addRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
		addText: { fontSize: 15, fontWeight: "700", color: theme.primary },
		archivedToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
		archivedText: { fontSize: 13, fontWeight: "700", color: theme.textMuted },
	});
