// SplitWise - group expense splitting with real user support.
import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { NotificationService } from "@/src/services/notificationService";
import * as SplitWiseService from "@/src/services/splitwiseService";
import {
	advanceDate,
	calculateGroupBalances,
	computeFriendBalances,
	isFriendGroup,
	personKey,
	toISODate,
} from "@/src/services/splitwiseMath";
import {
	GroupInvitation,
	GroupMember,
	RecurringFrequency,
	SplitGroup,
} from "@/src/types/finance";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { ChartsModal } from "./ChartsModal";
import { COLORS, DetailTab, GROUP_TYPES, SplitWiseProps } from "./constants";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { AddFriendModal, FriendDetailModal } from "./FriendModals";
import { GroupDetailView } from "./GroupDetailView";
import { GroupListView, HomeTab } from "./GroupListView";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { AddMemberModal } from "./modals/AddMemberModal";
import { CreateGroupModal } from "./modals/CreateGroupModal";
import { InvitationsModal } from "./modals/InvitationsModal";
import { InviteUserModal } from "./modals/InviteUserModal";
import { SearchModal } from "./SearchModal";
import { SettleTarget, SettleUpModal } from "./SettleUpModal";
import { createStyles } from "./styles";
import { initials } from "./ui";

function SplitWise({ theme, currency }: SplitWiseProps) {
	const { user, profile } = useAuthStore();
	const { showInvitations: showInvitationsParam } = useLocalSearchParams<{
		showInvitations?: string;
	}>();
	const styles = createStyles(theme);

	const currentUserId = user?.id || "";
	const currentUserName = profile?.full_name || user?.email?.split("@")[0] || "You";
	const currentUserEmail = user?.email || "";

	useEffect(() => {
		SplitWiseService.setSplitActor(currentUserId || undefined, currentUserName);
	}, [currentUserId, currentUserName]);

	// ============== DATA ==============

	const [groups, setGroups] = useState<SplitGroup[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [detailTab, setDetailTab] = useState<DetailTab>("expenses");
	const [homeTab, setHomeTab] = useState<HomeTab>("groups");
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [pendingInvitations, setPendingInvitations] = useState<GroupInvitation[]>([]);
	// A state update can't block a second tap in the same tick, which created duplicate groups.
	const submittingRef = useRef(false);

	const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;
	const friendBalances = useMemo(
		() => computeFriendBalances(groups, currentUserId),
		[groups, currentUserId],
	);

	/** Puts a fresh copy of a group (from a save or realtime) into state. */
	const upsertGroup = useCallback(
		(group: SplitGroup) => {
			const withViewer = {
				...group,
				members: group.members.map((m) => ({ ...m, isCurrentUser: m.userId === currentUserId })),
			};
			setGroups((prev) =>
				prev.some((g) => g.id === group.id)
					? prev.map((g) => (g.id === group.id ? withViewer : g))
					: [withViewer, ...prev],
			);
		},
		[currentUserId],
	);

	const fetchGroups = useCallback(async () => {
		if (!currentUserId) return [] as SplitGroup[];
		const { data, error } = await SplitWiseService.fetchUserGroups(currentUserId);
		if (error) {
			console.error("Error fetching groups:", error);
			return [] as SplitGroup[];
		}
		setGroups(data);
		return data;
	}, [currentUserId]);

	const fetchInvitations = useCallback(async () => {
		if (!currentUserId) return;
		const { data, error } = await SplitWiseService.fetchPendingInvitations(currentUserId);
		if (!error) setPendingInvitations(data);
	}, [currentUserId]);

	/** Fetch, then create any repeating expenses that fell due, then refetch if so. */
	const refreshAll = useCallback(async () => {
		const [fetched] = await Promise.all([fetchGroups(), fetchInvitations()]);
		if (await SplitWiseService.processRecurring(fetched, currentUserId)) await fetchGroups();
	}, [fetchGroups, fetchInvitations, currentUserId]);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			await refreshAll();
			setIsLoading(false);
		})();
	}, [refreshAll]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await refreshAll();
		setRefreshing(false);
	}, [refreshAll]);

	useEffect(() => {
		if (showInvitationsParam === "true") setShowInvitations(true);
	}, [showInvitationsParam]);

	useEffect(() => {
		if (!currentUserId) return;
		return SplitWiseService.subscribeToInvitations(currentUserId, (inv) => {
			setPendingInvitations((prev) => [inv, ...prev]);
			Alert.alert("New Invitation!", `${inv.invitedByName} invited you to join "${inv.groupName}"`);
		});
	}, [currentUserId]);

	// Live updates for the open group.
	useEffect(() => {
		if (!selectedId) return;
		return SplitWiseService.subscribeToGroupUpdates(selectedId, upsertGroup);
	}, [selectedId, upsertGroup]);

	// Android back closes the group before leaving Split Wise.
	useEffect(() => {
		if (!selectedId) return;
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			setSelectedId(null);
			return true;
		});
		return () => sub.remove();
	}, [selectedId]);

	// ============== SHEETS ==============

	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [showEditGroup, setShowEditGroup] = useState(false);
	const [showAddMember, setShowAddMember] = useState(false);
	const [showInviteUser, setShowInviteUser] = useState(false);
	const [showInvitations, setShowInvitations] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [showAddFriend, setShowAddFriend] = useState(false);
	const [charts, setCharts] = useState<{ groupId: string | null } | null>(null);
	const [expenseForm, setExpenseForm] = useState<{ groupId: string; expenseId: string | null } | null>(null);
	const [expenseDetail, setExpenseDetail] = useState<{ groupId: string; expenseId: string } | null>(null);
	const [settle, setSettle] = useState<{ groupId: string; target: SettleTarget } | null>(null);
	const [friendOpen, setFriendOpen] = useState<{ key: string; member?: GroupMember } | null>(null);

	const groupById = (id?: string | null) => groups.find((g) => g.id === id) ?? null;

	// ============== GROUP HANDLERS ==============

	const [groupForm, setGroupForm] = useState({ name: "", description: "", color: COLORS[0], type: "group" });
	const [memberName, setMemberName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
	const [isSearching, setIsSearching] = useState(false);

	const handleCreateGroup = async () => {
		if (!groupForm.name.trim()) return Alert.alert("Error", "Please enter a group name");
		if (submittingRef.current) return;
		submittingRef.current = true;
		try {
			const icon = GROUP_TYPES.find((t) => t.value === groupForm.type)?.icon || "people";
			const { data, error } = await SplitWiseService.createSplitGroup(currentUserId, currentUserName, {
				name: groupForm.name.trim(),
				description: groupForm.description.trim(),
				color: groupForm.color,
				icon,
			});
			if (error) return Alert.alert("Error", error);
			if (data) {
				upsertGroup(data);
				setGroupForm({ name: "", description: "", type: "group", color: COLORS[0] });
				setShowCreateGroup(false);
				setSelectedId(data.id);
				setDetailTab("members");
			}
		} finally {
			submittingRef.current = false;
		}
	};

	const openEditGroup = () => {
		if (!selectedGroup) return;
		setGroupForm({
			name: selectedGroup.name,
			description: selectedGroup.description || "",
			color: selectedGroup.color || COLORS[0],
			type: GROUP_TYPES.find((t) => t.icon === selectedGroup.icon)?.value || "group",
		});
		setShowSettings(false);
		setShowEditGroup(true);
	};

	const handleSaveEditGroup = async () => {
		if (!selectedGroup || !groupForm.name.trim()) return Alert.alert("Error", "Please enter a group name");
		const icon = GROUP_TYPES.find((t) => t.value === groupForm.type)?.icon || selectedGroup.icon;
		const { data, error } = await SplitWiseService.updateGroupDetails(selectedGroup.id, {
			name: groupForm.name.trim(),
			description: groupForm.description.trim(),
			color: groupForm.color,
			icon,
		});
		if (error) return Alert.alert("Error", error);
		if (data) upsertGroup(data);
		setShowEditGroup(false);
	};

	const handleAddNonUserMember = async () => {
		if (!selectedGroup || !memberName.trim()) return Alert.alert("Error", "Please enter a name");
		const { error } = await SplitWiseService.addNonUserMember(selectedGroup.id, memberName.trim());
		if (error) return Alert.alert("Error", error);
		await fetchGroups();
		setMemberName("");
		setShowAddMember(false);
	};

	const handleSearchUsers = async (query: string) => {
		setSearchQuery(query);
		if (query.length < 3) return setSearchResults([]);
		setIsSearching(true);
		const { data, error } = await SplitWiseService.searchUsersByEmail(query, currentUserId);
		setIsSearching(false);
		if (error) return;
		const existing = new Set(
			(selectedGroup?.members ?? []).flatMap((m) => [m.userId, m.pendingUserId]).filter(Boolean),
		);
		setSearchResults(
			data
				.filter((u) => !existing.has(u.id))
				.map((u) => ({ id: u.id, email: u.email, full_name: u.fullName || u.email })),
		);
	};

	const handleSendInvitation = async (inviteeUserId: string, inviteeName: string) => {
		if (!selectedGroup) return;
		const { error } = await SplitWiseService.sendGroupInvitation(
			selectedGroup.id,
			selectedGroup.name,
			currentUserId,
			currentUserName,
			inviteeUserId,
		);
		if (error) return Alert.alert("Error", error);
		// They're added as an "Invited" member straight away so expenses can include them.
		const invitee = searchResults.find((r) => r.id === inviteeUserId);
		const { data } = await SplitWiseService.addPendingUserMember(selectedGroup.id, {
			id: inviteeUserId,
			name: inviteeName,
			email: invitee?.email,
		});
		if (data) upsertGroup(data);
		try {
			await NotificationService.sendPushNotificationToUser(
				inviteeUserId,
				"Group Invitation",
				`${currentUserName} invited you to join "${selectedGroup.name}" group`,
				{
					type: "group_invitation",
					groupId: selectedGroup.id,
					groupName: selectedGroup.name,
					invitedByName: currentUserName,
					invitedByUserId: currentUserId,
				},
			);
		} catch (e) {
			console.error("Error sending push notification:", e);
		}
		Alert.success("Invited", `${inviteeName} can be added to expenses now; they'll see them once they accept.`);
		setSearchQuery("");
		setSearchResults([]);
		setShowInviteUser(false);
	};

	const handleRespondToInvitation = async (invitation: GroupInvitation, accept: boolean) => {
		const { error } = await SplitWiseService.respondToInvitation(
			invitation.id,
			currentUserId,
			currentUserName,
			currentUserEmail,
			accept,
		);
		if (error) return Alert.alert("Error", error);
		setPendingInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
		if (accept) {
			await fetchGroups();
			Alert.success("Joined", `You've joined "${invitation.groupName}"`);
		}
	};

	const handleRemoveMember = (member: GroupMember) => {
		const group = selectedGroup;
		if (!group) return;
		const admins = group.members.filter((m) => m.role === "admin");
		if (member.isCurrentUser && member.role === "admin" && admins.length === 1 && group.members.length > 1) {
			return Alert.alert("Error", "You're the only admin. Make someone else admin, or delete the group.");
		}
		const balance = calculateGroupBalances(group).find((b) => b.memberId === member.id)?.balance ?? 0;
		const warning =
			Math.abs(balance) > 0.01
				? ` ${member.isCurrentUser ? "You" : member.name} still ${balance > 0 ? "get back" : "owe"} ${currency}${Math.abs(balance).toFixed(2)}; their expenses stay but balances may look off.`
				: "";
		Alert.alert(
			member.isCurrentUser ? "Leave group?" : `Remove ${member.name}?`,
			(member.isCurrentUser ? "You'll lose access to this group." : "They'll lose access to this group.") + warning,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: member.isCurrentUser ? "Leave" : "Remove",
					style: "destructive",
					onPress: async () => {
						const { error } = await SplitWiseService.removeMember(group.id, member.id);
						if (error) return Alert.alert("Error", error);
						if (member.isCurrentUser) {
							setGroups((prev) => prev.filter((g) => g.id !== group.id));
							setSelectedId(null);
						} else await fetchGroups();
					},
				},
			],
		);
	};

	// ============== EXPENSES ==============

	const submitExpense = async (
		input: SplitWiseService.ExpenseInput,
		repeat: RecurringFrequency | null,
	): Promise<string | null> => {
		if (!expenseForm) return "No group";
		const { groupId, expenseId } = expenseForm;
		if (expenseId) {
			const { data, error } = await SplitWiseService.updateExpense(groupId, expenseId, input);
			if (error) return error;
			if (data) upsertGroup(data);
		} else {
			const { data, error } = await SplitWiseService.addExpense(groupId, input);
			if (error) return error;
			if (data) upsertGroup(data);
			if (repeat && data) {
				const today = toISODate(new Date());
				const { data: withRule } = await SplitWiseService.updateGroupSettings(
					groupId,
					{
						recurring: [
							...(data.settings?.recurring ?? []),
							{
								id: SplitWiseService.generateId(),
								frequency: repeat,
								nextDate: advanceDate(today, repeat),
								anchorDay: new Date().getDate(),
								ownerUserId: currentUserId,
								template: {
									description: input.description,
									amount: input.amount,
									category: input.category,
									paidBy: input.paidBy,
									payers: input.payers,
									splitType: input.splitType,
									splits: input.splits,
									note: input.note,
								},
							},
						],
					},
					`set "${input.description}" to repeat ${repeat}`,
				);
				if (withRule) upsertGroup(withRule);
			}
		}
		setExpenseForm(null);
		return null;
	};

	/** Opens (creating if needed) the one-to-one group with a friend, then the expense form. */
	const addExpenseWithFriend = async (key: string, member?: GroupMember) => {
		let group = groups.find(
			(g) => isFriendGroup(g) && g.members.some((m) => m.userId !== currentUserId && personKey(m) === key),
		);
		if (!group) {
			const source =
				member ??
				friendBalances.find((f) => f.key === key)?.groups[0]?.member;
			if (!source) return;
			const { data, error } = await SplitWiseService.createFriendGroup(
				{ userId: currentUserId, name: currentUserName },
				{ name: source.name, userId: source.userId ?? source.pendingUserId, email: source.email },
			);
			if (error || !data) return Alert.error("Couldn't start", error ?? "Please try again.");
			upsertGroup(data);
			group = data;
		}
		setFriendOpen(null);
		setExpenseForm({ groupId: group.id, expenseId: null });
	};

	const addFriend = async (friend: { name: string; userId?: string; email?: string }) => {
		const key = friend.userId ? `u:${friend.userId}` : `n:${friend.name.trim().toLowerCase()}`;
		const existing = groups.find(
			(g) => isFriendGroup(g) && g.members.some((m) => personKey(m) === key),
		);
		if (existing) {
			setHomeTab("friends");
			return null;
		}
		const { data, error } = await SplitWiseService.createFriendGroup(
			{ userId: currentUserId, name: currentUserName },
			friend,
		);
		if (error) return error;
		if (data) upsertGroup(data);
		setHomeTab("friends");
		return null;
	};

	// ============== RENDER ==============

	const formGroup = groupById(expenseForm?.groupId);
	const detailGroup = groupById(expenseDetail?.groupId);
	const detailExpense = detailGroup?.expenses.find((e) => e.id === expenseDetail?.expenseId) ?? null;
	const settleGroup = groupById(settle?.groupId);
	const friend = friendOpen ? friendBalances.find((f) => f.key === friendOpen.key) ?? null : null;

	if (isLoading && !refreshing) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.primary} />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={{ flex: 1, backgroundColor: theme.background }}>
			{selectedGroup ? (
				<GroupDetailView
					group={selectedGroup}
					currency={currency}
					currentUserId={currentUserId}
					detailTab={detailTab}
					setDetailTab={setDetailTab}
					onBack={() => setSelectedId(null)}
					onAddExpense={() => setExpenseForm({ groupId: selectedGroup.id, expenseId: null })}
					onOpenExpense={(e) => setExpenseDetail({ groupId: selectedGroup.id, expenseId: e.id })}
					onSettle={(target) => setSettle({ groupId: selectedGroup.id, target })}
					onOpenSettings={() => setShowSettings(true)}
					onOpenCharts={() => setCharts({ groupId: selectedGroup.id })}
					onAddMember={() => setShowAddMember(true)}
					onInviteUser={() => setShowInviteUser(true)}
					onRemoveMember={handleRemoveMember}
					onChanged={upsertGroup}
				/>
			) : (
				<GroupListView
					groups={groups}
					friendBalances={friendBalances}
					pendingInvitations={pendingInvitations}
					currentUserId={currentUserId}
					currency={currency}
					refreshing={refreshing}
					tab={homeTab}
					setTab={setHomeTab}
					onRefresh={onRefresh}
					onSelectGroup={(g) => {
						setSelectedId(g.id);
						setDetailTab("expenses");
					}}
					onCreateGroup={() => setShowCreateGroup(true)}
					onAddFriend={() => setShowAddFriend(true)}
					onOpenFriend={(key, member) => setFriendOpen({ key, member })}
					onShowInvitations={() => setShowInvitations(true)}
					onOpenSearch={() => setShowSearch(true)}
					onOpenCharts={() => setCharts({ groupId: null })}
					onOpenExpense={(g, e) => setExpenseDetail({ groupId: g.id, expenseId: e.id })}
				/>
			)}

			<ExpenseFormModal
				visible={!!expenseForm}
				group={formGroup}
				expense={formGroup?.expenses.find((e) => e.id === expenseForm?.expenseId) ?? null}
				currency={currency}
				onClose={() => setExpenseForm(null)}
				onSubmit={submitExpense}
			/>

			{expenseDetail && (
				<ExpenseDetailModal
					group={detailGroup}
					expense={detailExpense}
					currency={currency}
					currentUserId={currentUserId}
					onClose={() => setExpenseDetail(null)}
					onEdit={(e) => {
						setExpenseDetail(null);
						setExpenseForm({ groupId: detailGroup!.id, expenseId: e.id });
					}}
					onChanged={upsertGroup}
				/>
			)}

			{settle && (
				<SettleUpModal
					group={settleGroup}
					target={settle.target}
					currency={currency}
					onClose={() => setSettle(null)}
					onChanged={upsertGroup}
				/>
			)}

			<GroupSettingsModal
				visible={showSettings}
				group={selectedGroup}
				isAdmin={selectedGroup?.members.find((m) => m.userId === currentUserId)?.role === "admin"}
				currency={currency}
				onClose={() => setShowSettings(false)}
				onChanged={upsertGroup}
				onEditDetails={openEditGroup}
				onOpenCharts={() => {
					setShowSettings(false);
					if (selectedGroup) setCharts({ groupId: selectedGroup.id });
				}}
				onDeleted={() => {
					setShowSettings(false);
					setGroups((prev) => prev.filter((g) => g.id !== selectedId));
					setSelectedId(null);
				}}
			/>

			<ChartsModal
				visible={!!charts}
				onClose={() => setCharts(null)}
				groups={charts?.groupId ? groups.filter((g) => g.id === charts.groupId) : groups}
				title={charts?.groupId ? groupById(charts.groupId)?.name ?? "Charts" : "Your spending"}
				currentUserId={currentUserId}
				currency={currency}
			/>

			<SearchModal
				visible={showSearch}
				onClose={() => setShowSearch(false)}
				groups={groups}
				currency={currency}
				onSelect={(g, e) => {
					setShowSearch(false);
					setExpenseDetail({ groupId: g.id, expenseId: e.id });
				}}
			/>

			<AddFriendModal
				visible={showAddFriend}
				onClose={() => setShowAddFriend(false)}
				currentUserId={currentUserId}
				onAdd={addFriend}
			/>

			{friendOpen && (
				<FriendDetailModal
					friend={friend}
					fallbackMember={friendOpen.member}
					groups={groups}
					currentUserId={currentUserId}
					currency={currency}
					onClose={() => setFriendOpen(null)}
					onOpenGroup={(g) => {
						setFriendOpen(null);
						setSelectedId(g.id);
						setDetailTab("expenses");
					}}
					onAddExpense={() => addExpenseWithFriend(friendOpen.key, friendOpen.member)}
					onChanged={fetchGroups}
				/>
			)}

			<CreateGroupModal
				visible={showCreateGroup}
				onClose={() => setShowCreateGroup(false)}
				groupForm={groupForm}
				setGroupForm={setGroupForm}
				onCreate={handleCreateGroup}
				theme={theme}
				styles={styles}
			/>
			<CreateGroupModal
				visible={showEditGroup}
				onClose={() => setShowEditGroup(false)}
				groupForm={groupForm}
				setGroupForm={setGroupForm}
				onCreate={handleCreateGroup}
				isEditing
				onSave={handleSaveEditGroup}
				theme={theme}
				styles={styles}
			/>
			<AddMemberModal
				visible={showAddMember}
				onClose={() => {
					setShowAddMember(false);
					setMemberName("");
				}}
				memberName={memberName}
				setMemberName={setMemberName}
				onAdd={handleAddNonUserMember}
				theme={theme}
				styles={styles}
			/>
			<InviteUserModal
				visible={showInviteUser}
				onClose={() => {
					setShowInviteUser(false);
					setSearchQuery("");
					setSearchResults([]);
				}}
				searchQuery={searchQuery}
				onSearch={handleSearchUsers}
				searchResults={searchResults}
				isSearching={isSearching}
				onInvite={handleSendInvitation}
				theme={theme}
				getInitials={initials}
				styles={styles}
			/>
			<InvitationsModal
				visible={showInvitations}
				onClose={() => setShowInvitations(false)}
				invitations={pendingInvitations}
				onRespond={handleRespondToInvitation}
				theme={theme}
				styles={styles}
			/>
		</View>
	);
}

export default SplitWise;
