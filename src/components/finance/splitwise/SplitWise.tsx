// SplitWise - group expense splitting with real user support.
import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { NotificationService } from "@/src/services/notificationService";
import * as SplitWiseService from "@/src/services/splitwiseService";
import { GroupInvitation, GroupMember, SplitGroup } from "@/src/types/finance";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GroupDetailView } from "./GroupDetailView";
import { GroupListView } from "./GroupListView";
import { COLORS, DetailTab, GROUP_TYPES, SplitWiseProps } from "./constants";
import { AddExpenseModal } from "./modals/AddExpenseModal";
import { AddMemberModal } from "./modals/AddMemberModal";
import { CreateGroupModal } from "./modals/CreateGroupModal";
import { InvitationsModal } from "./modals/InvitationsModal";
import { InviteUserModal } from "./modals/InviteUserModal";
import { SettlementModal } from "./modals/SettlementModal";
import { createStyles } from "./styles";

function SplitWise({ theme, currency, onOpenDrawer }: SplitWiseProps) {
	const { user, profile } = useAuthStore();
	const { showInvitations: showInvitationsParam } = useLocalSearchParams<{
		showInvitations?: string;
	}>();
	const styles = createStyles(theme);

	// State - Groups
	const [groups, setGroups] = useState<SplitGroup[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<SplitGroup | null>(null);
	const [detailTab, setDetailTab] = useState<DetailTab>("overview");
	const [isLoading, setIsLoading] = useState(true);
	// `isLoading` only drives the spinner; a state update can't block a second
	// tap in the same tick, which created duplicate groups.
	const submittingRef = useRef(false);
	const [refreshing, setRefreshing] = useState(false);

	// State - Invitations
	const [pendingInvitations, setPendingInvitations] = useState<
		GroupInvitation[]
	>([]);
	const [showInvitations, setShowInvitations] = useState(false);

	// State - Modals
	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [showEditGroup, setShowEditGroup] = useState(false);
	const [showAddMember, setShowAddMember] = useState(false);
	const [showInviteUser, setShowInviteUser] = useState(false);
	const [showAddExpense, setShowAddExpense] = useState(false);
	const [showSettlement, setShowSettlement] = useState(false);

	// State - Forms
	const [groupForm, setGroupForm] = useState({
		name: "",
		description: "",
		color: COLORS[0],
		type: "group",
	});

	const [memberName, setMemberName] = useState("");

	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Array<{
			id: string;
			email: string;
			full_name: string;
		}>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [inviteMessage, setInviteMessage] = useState("");

	const [expenseForm, setExpenseForm] = useState({
		description: "",
		amount: "",
		category: "other" as string,
		paidBy: "",
		splitType: "equal" as "equal" | "exact" | "percentage" | "shares",
		customSplits: {} as { [memberId: string]: string },
	});

	const [settlementForm, setSettlementForm] = useState({
		from: "",
		to: "",
		amount: "",
		note: "",
	});

	// Current user info
	const currentUserId = user?.id || "";
	const currentUserName =
		profile?.full_name || user?.email?.split("@")[0] || "You";
	const currentUserEmail = user?.email || "";

	// ============== DATA FETCHING ==============

	const fetchGroups = useCallback(async () => {
		if (!currentUserId) return [] as SplitGroup[];

		try {
			const { data, error } =
				await SplitWiseService.fetchUserGroups(currentUserId);
			if (error) {
				console.error("Error fetching groups:", error);
				return [] as SplitGroup[];
			}

			// Update isCurrentUser flag for each member
			const updatedGroups = data.map((group) => ({
				...group,
				members: group.members.map((m) => ({
					...m,
					isCurrentUser: m.userId === currentUserId,
				})),
			}));

			setGroups(updatedGroups);
			return updatedGroups;
		} catch (error) {
			console.error("Error fetching groups:", error);
			return [] as SplitGroup[];
		}
	}, [currentUserId]);

	const fetchInvitations = useCallback(async () => {
		if (!currentUserId) return;

		try {
			const { data, error } =
				await SplitWiseService.fetchPendingInvitations(currentUserId);
			if (error) {
				console.error("Error fetching invitations:", error);
				return;
			}
			setPendingInvitations(data);
		} catch (error) {
			console.error("Error fetching invitations:", error);
		}
	}, [currentUserId]);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		await Promise.all([fetchGroups(), fetchInvitations()]);
		setIsLoading(false);
	}, [fetchGroups, fetchInvitations]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.all([fetchGroups(), fetchInvitations()]);
		setRefreshing(false);
	}, [fetchGroups, fetchInvitations]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Auto-open invitations modal when navigated from notification
	useEffect(() => {
		if (showInvitationsParam === "true") {
			setShowInvitations(true);
		}
	}, [showInvitationsParam]);

	// Subscribe to real-time updates
	useEffect(() => {
		if (!currentUserId) return;

		const unsubscribeInvitations = SplitWiseService.subscribeToInvitations(
			currentUserId,
			(newInvitation) => {
				setPendingInvitations((prev) => [newInvitation, ...prev]);
				Alert.alert(
					"New Invitation!",
					`${newInvitation.invitedByName} invited you to join "${newInvitation.groupName}"`,
				);
			},
		);

		return () => {
			unsubscribeInvitations();
		};
	}, [currentUserId]);

	// Subscribe to selected group updates
	useEffect(() => {
		if (!selectedGroup) return;

		const unsubscribe = SplitWiseService.subscribeToGroupUpdates(
			selectedGroup.id,
			(updatedGroup) => {
				const groupWithCurrentUser = {
					...updatedGroup,
					members: updatedGroup.members.map((m) => ({
						...m,
						isCurrentUser: m.userId === currentUserId,
					})),
				};
				setSelectedGroup(groupWithCurrentUser);
				setGroups((prev) =>
					prev.map((g) =>
						g.id === updatedGroup.id ? groupWithCurrentUser : g,
					),
				);
			},
		);

		return () => {
			unsubscribe();
		};
	}, [selectedGroup?.id, currentUserId]);

	// ============== HELPER FUNCTIONS ==============

	const formatAmount = (value: number) => {
		return value.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n.charAt(0))
			.join("")
			.toUpperCase()
			.substring(0, 2);
	};

	const calculateBalances = useCallback(() => {
		if (!selectedGroup) return [];
		return SplitWiseService.calculateGroupBalances(selectedGroup);
	}, [selectedGroup]);

	const calculateDebts = useCallback(() => {
		if (!selectedGroup) return [];
		return SplitWiseService.calculateSimplifiedDebts(selectedGroup);
	}, [selectedGroup]);

	// ============== HANDLERS ==============

	const handleCreateGroup = async () => {
		if (!groupForm.name.trim()) {
			Alert.alert("Error", "Please enter a group name");
			return;
		}

		// Get the icon from GROUP_TYPES based on selected type
		const selectedType = GROUP_TYPES.find((t) => t.value === groupForm.type);
		const groupIcon = selectedType?.icon || "people";

		if (submittingRef.current) return;
		submittingRef.current = true;
		setIsLoading(true);
		try {
			const { data, error } = await SplitWiseService.createSplitGroup(
				currentUserId,
				currentUserName,
				{
					name: groupForm.name.trim(),
					description: groupForm.description.trim(),
					color: groupForm.color,
					icon: groupIcon,
				},
			);

			if (error) {
				Alert.alert("Error", error);
			} else if (data) {
				setGroups((prev) => [data, ...prev]);
				setGroupForm({
					name: "",
					description: "",
					type: "group",
					color: COLORS[0],
				});
				setShowCreateGroup(false);
			}
		} finally {
			submittingRef.current = false;
			setIsLoading(false);
		}
	};

	const handleOpenEditGroup = () => {
		if (!selectedGroup) return;
		setGroupForm({
			name: selectedGroup.name || "",
			description: selectedGroup.description || "",
			color: selectedGroup.color || COLORS[0],
			type: "group",
		});
		setShowEditGroup(true);
	};

	const handleSaveEditGroup = async () => {
		if (!selectedGroup) return;
		if (!groupForm.name.trim()) {
			Alert.alert("Error", "Please enter a group name");
			return;
		}

		if (submittingRef.current) return;
		submittingRef.current = true;
		setIsLoading(true);
		try {
			const { error } = await SplitWiseService.updateSplitGroup(
				selectedGroup.id,
				{
					name: groupForm.name.trim(),
					description: groupForm.description.trim(),
					color: groupForm.color,
				},
			);

			if (error) {
				Alert.alert("Error", error);
			} else {
				// Refresh groups and selected group
				const updatedGroups = await fetchGroups();
				const updated =
					updatedGroups.find((g) => g.id === selectedGroup.id) || null;
				setSelectedGroup(updated);
				setShowEditGroup(false);
			}
		} finally {
			submittingRef.current = false;
			setIsLoading(false);
		}
	};

	const handleDeleteGroup = async () => {
		if (!selectedGroup) return;

		Alert.alert(
			"Delete Group",
			`Are you sure you want to delete "${selectedGroup.name}"? This cannot be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						const { error } = await SplitWiseService.deleteSplitGroup(
							selectedGroup.id,
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							setGroups((prev) =>
								prev.filter((g) => g.id !== selectedGroup.id),
							);
							setSelectedGroup(null);
						}
					},
				},
			],
		);
	};

	const handleAddNonUserMember = async () => {
		if (!selectedGroup || !memberName.trim()) {
			Alert.alert("Error", "Please enter a name");
			return;
		}

		const { data, error } = await SplitWiseService.addNonUserMember(
			selectedGroup.id,
			memberName.trim(),
		);

		if (error) {
			Alert.alert("Error", error);
		} else if (data) {
			// Refresh group data and use returned groups so UI updates immediately
			const updatedGroups = await fetchGroups();
			if (selectedGroup) {
				const updated = updatedGroups?.find((g) => g.id === selectedGroup.id);
				if (updated) setSelectedGroup(updated);
			}
			setMemberName("");
			setShowAddMember(false);
		}
	};

	const handleSearchUsers = async (query: string) => {
		setSearchQuery(query);
		if (query.length < 3) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		const { data, error } = await SplitWiseService.searchUsersByEmail(
			query,
			currentUserId,
		);
		setIsSearching(false);

		if (!error) {
			// Filter out users who are already members
			const existingUserIds =
				selectedGroup?.members.filter((m) => m.userId).map((m) => m.userId) ||
				[];
			// Transform to expected format
			const transformed = data
				.filter((u) => !existingUserIds.includes(u.id))
				.map((u) => ({
					id: u.id,
					email: u.email,
					full_name: u.fullName || u.email,
				}));
			setSearchResults(transformed);
		}
	};

	const handleSendInvitation = async (
		inviteeUserId: string,
		inviteeName: string,
	) => {
		if (!selectedGroup) return;

		const { error } = await SplitWiseService.sendGroupInvitation(
			selectedGroup.id,
			selectedGroup.name,
			currentUserId,
			currentUserName,
			inviteeUserId,
			undefined,
			inviteMessage.trim() || undefined,
		);

		if (error) {
			Alert.alert("Error", error);
		} else {
			// Send push notification to the invited user (not to yourself)
			try {
				await NotificationService.sendPushNotificationToUser(
					inviteeUserId, // Send to the invited user, not current user
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
			} catch (notificationError) {
				console.error("Error sending push notification:", notificationError);
				// Don't fail the invitation if notification fails
			}

			Alert.alert("Success", `Invitation sent to ${inviteeName}`);
			setSearchQuery("");
			setSearchResults([]);
			setInviteMessage("");
			setShowInviteUser(false);
		}
	};

	const handleRespondToInvitation = async (
		invitation: GroupInvitation,
		accept: boolean,
	) => {
		const { error } = await SplitWiseService.respondToInvitation(
			invitation.id,
			currentUserId,
			currentUserName,
			currentUserEmail,
			accept,
		);

		if (error) {
			Alert.alert("Error", error);
		} else {
			setPendingInvitations((prev) =>
				prev.filter((i) => i.id !== invitation.id),
			);
			if (accept) {
				await fetchGroups();
				Alert.alert("Success", `You've joined "${invitation.groupName}"`);
			}
		}
	};

	const handleRemoveMember = async (member: GroupMember) => {
		if (!selectedGroup) return;

		// Can't remove yourself if you're the only admin AND you are an admin
		const admins = selectedGroup.members.filter((m) => m.role === "admin");
		const isUserAdmin = member.role === "admin";
		if (member.isCurrentUser && isUserAdmin && admins.length === 1) {
			Alert.alert(
				"Error",
				"You cannot leave as you're the only admin. Transfer admin rights first.",
			);
			return;
		}

		Alert.alert(
			member.isCurrentUser ? "Leave Group" : "Remove Member",
			member.isCurrentUser
				? "Are you sure you want to leave this group?"
				: `Remove ${member.name} from the group?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: member.isCurrentUser ? "Leave" : "Remove",
					style: "destructive",
					onPress: async () => {
						const { error } = await SplitWiseService.removeMember(
							selectedGroup.id,
							member.id,
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							if (member.isCurrentUser) {
								setGroups((prev) =>
									prev.filter((g) => g.id !== selectedGroup.id),
								);
								setSelectedGroup(null);
							} else {
								const updatedGroups = await fetchGroups();
								const updated = updatedGroups.find(
									(g) => g.id === selectedGroup.id,
								);
								if (updated) setSelectedGroup(updated);
							}
						}
					},
				},
			],
		);
	};

	const handleAddExpense = async () => {
		if (!selectedGroup) return;

		if (
			!expenseForm.description.trim() ||
			!expenseForm.amount ||
			!expenseForm.paidBy
		) {
			Alert.alert("Error", "Please fill in all required fields");
			return;
		}

		const amount = parseFloat(expenseForm.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}

		const members = selectedGroup.members;
		let splits: { memberId: string; amount: number }[] = [];

		if (expenseForm.splitType === "equal") {
			const perPerson = amount / members.length;
			splits = members.map((m) => ({ memberId: m.id, amount: perPerson }));
		} else if (expenseForm.splitType === "exact") {
			// Exact amounts must sum to total amount
			splits = members.map((m) => ({
				memberId: m.id,
				amount: parseFloat(expenseForm.customSplits[m.id] || "0"),
			}));

			const totalSplit = splits.reduce(
				(s, x) => s + (isNaN(x.amount) ? 0 : x.amount),
				0,
			);
			if (Math.abs(totalSplit - amount) > 0.005) {
				Alert.alert(
					"Error",
					"Exact splits must add up exactly to the total amount",
				);
				return;
			}
		} else if (expenseForm.splitType === "percentage") {
			// Percentages must add to 100. Convert to amounts and handle rounding
			const percents = members.map((m) => ({
				memberId: m.id,
				percent: parseFloat(expenseForm.customSplits[m.id] || "0") || 0,
			}));
			const totalPercent = percents.reduce((s, p) => s + p.percent, 0);
			if (Math.abs(totalPercent - 100) > 0.01) {
				Alert.alert("Error", "Percentages must add up to 100%");
				return;
			}

			// Calculate amounts with two-decimal rounding and distribute remainder
			let computed: { memberId: string; amount: number }[] = percents.map(
				(p) => ({
					memberId: p.memberId,
					amount: Math.floor((p.percent / 100) * amount * 100) / 100,
				}),
			);
			let sumComputed = computed.reduce((s, c) => s + c.amount, 0);
			let remainder = Math.round((amount - sumComputed) * 100) / 100;
			// Distribute remainder cents starting from first member
			for (let i = 0; remainder > 0.001 && i < computed.length; i++) {
				computed[i].amount =
					Math.round((computed[i].amount + 0.01) * 100) / 100;
				remainder =
					Math.round(
						(amount - computed.reduce((s, c) => s + c.amount, 0)) * 100,
					) / 100;
			}
			splits = computed;
		} else if (expenseForm.splitType === "shares") {
			const totalShares = members.reduce(
				(sum: number, m) =>
					sum + (parseFloat(expenseForm.customSplits[m.id] || "1") || 0),
				0,
			);
			if (totalShares <= 0) {
				Alert.alert("Error", "Total shares must be greater than zero");
				return;
			}

			// Calculate amounts, handle rounding remainder
			let computedShares = members.map((m) => ({
				memberId: m.id,
				amount:
					Math.floor(
						((parseFloat(expenseForm.customSplits[m.id] || "1") || 0) /
							totalShares) *
							amount *
							100,
					) / 100,
			}));
			let sumSharesAmount = computedShares.reduce((s, c) => s + c.amount, 0);
			let remainderShares = Math.round((amount - sumSharesAmount) * 100) / 100;
			for (
				let i = 0;
				remainderShares > 0.001 && i < computedShares.length;
				i++
			) {
				computedShares[i].amount =
					Math.round((computedShares[i].amount + 0.01) * 100) / 100;
				remainderShares =
					Math.round(
						(amount - computedShares.reduce((s, c) => s + c.amount, 0)) * 100,
					) / 100;
			}
			splits = computedShares;
		}

		const { error } = await SplitWiseService.addExpense(selectedGroup.id, {
			description: expenseForm.description.trim(),
			amount,
			category: expenseForm.category,
			paidBy: expenseForm.paidBy,
			date: new Date().toISOString(),
			splitType: expenseForm.splitType,
			splits: splits.map((s) => ({ ...s, isPaid: false })),
			isSettled: false,
		});

		if (error) {
			Alert.alert("Error", error);
		} else {
			const updatedGroups = await fetchGroups();
			const updated = updatedGroups.find((g) => g.id === selectedGroup.id);
			if (updated) setSelectedGroup(updated);

			setExpenseForm({
				description: "",
				amount: "",
				category: "other",
				paidBy: "",
				splitType: "equal",
				customSplits: {},
			});
			setShowAddExpense(false);
		}
	};

	const handleDeleteExpense = async (expenseId: string) => {
		if (!selectedGroup) return;

		Alert.alert(
			"Delete Expense",
			"Are you sure you want to delete this expense?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						const { error } = await SplitWiseService.deleteExpense(
							selectedGroup.id,
							expenseId,
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							const updatedGroups = await fetchGroups();
							const updated = updatedGroups.find(
								(g) => g.id === selectedGroup.id,
							);
							if (updated) setSelectedGroup(updated);
						}
					},
				},
			],
		);
	};

	const handleSettlement = async () => {
		if (
			!selectedGroup ||
			!settlementForm.from ||
			!settlementForm.to ||
			!settlementForm.amount
		) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}

		const amount = parseFloat(settlementForm.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}

		const { error } = await SplitWiseService.addSettlement(selectedGroup.id, {
			fromMemberId: settlementForm.from,
			toMemberId: settlementForm.to,
			amount,
			date: new Date().toISOString(),
			note: settlementForm.note.trim() || undefined,
		});

		if (error) {
			Alert.alert("Error", error);
		} else {
			const updatedGroups = await fetchGroups();
			const updated = updatedGroups.find((g) => g.id === selectedGroup.id);
			if (updated) setSelectedGroup(updated);

			setSettlementForm({ from: "", to: "", amount: "", note: "" });
			setShowSettlement(false);
		}
	};

	const selectGroup = (group: SplitGroup) => {
		const groupWithCurrentUser = {
			...group,
			members: group.members.map((m) => ({
				...m,
				isCurrentUser: m.userId === currentUserId,
			})),
		};
		setSelectedGroup(groupWithCurrentUser);
		setDetailTab("overview");
	};

	// Continue in Part 2...
	// Render functions will be in the next file section

	return (
		<View style={styles.container}>
			{isLoading && !refreshing ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.primary} />
					<Text style={styles.loadingText}>Loading...</Text>
				</View>
			) : selectedGroup ? (
				<GroupDetailView
					group={selectedGroup}
					theme={theme}
					currency={currency}
					detailTab={detailTab}
					setDetailTab={setDetailTab}
					currentUserId={currentUserId}
					onBack={() => setSelectedGroup(null)}
					onDelete={handleDeleteGroup}
					onAddMember={() => setShowAddMember(true)}
					onInviteUser={() => setShowInviteUser(true)}
					onRemoveMember={handleRemoveMember}
					onAddExpense={() => {
						if (selectedGroup.members.length === 0) {
							Alert.alert(
								"Add Members First",
								"Please add members before adding expenses",
							);
							return;
						}
						setShowAddExpense(true);
					}}
					onDeleteExpense={handleDeleteExpense}
					onSettle={(debt) => {
						setSettlementForm({
							from: debt.from.id,
							to: debt.to.id,
							amount: debt.amount.toFixed(2),
							note: "",
						});
						setShowSettlement(true);
					}}
					onEdit={handleOpenEditGroup}
					calculateBalances={calculateBalances}
					calculateDebts={calculateDebts}
					formatAmount={formatAmount}
					getInitials={getInitials}
					styles={styles}
				/>
			) : (
				<GroupListView
					groups={groups}
					pendingInvitations={pendingInvitations}
					theme={theme}
					currency={currency}
					refreshing={refreshing}
					onRefresh={onRefresh}
					onSelectGroup={selectGroup}
					onCreateGroup={() => setShowCreateGroup(true)}
					onShowInvitations={() => setShowInvitations(true)}
					formatAmount={formatAmount}
					styles={styles}
				/>
			)}

			{/* Modals - Continued in Part 2 */}
			<CreateGroupModal
				visible={showCreateGroup}
				onClose={() => setShowCreateGroup(false)}
				groupForm={groupForm}
				setGroupForm={setGroupForm}
				onCreate={handleCreateGroup}
				theme={theme}
				styles={styles}
			/>

			{/* Edit Group - reuse modal */}
			<CreateGroupModal
				visible={showEditGroup}
				onClose={() => setShowEditGroup(false)}
				groupForm={groupForm}
				setGroupForm={setGroupForm}
				onCreate={handleCreateGroup}
				isEditing={true}
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
					setInviteMessage("");
				}}
				searchQuery={searchQuery}
				onSearch={handleSearchUsers}
				searchResults={searchResults}
				isSearching={isSearching}
				onInvite={handleSendInvitation}
				theme={theme}
				getInitials={getInitials}
				styles={styles}
			/>

			<AddExpenseModal
				visible={showAddExpense}
				onClose={() => setShowAddExpense(false)}
				expenseForm={expenseForm}
				setExpenseForm={setExpenseForm}
				members={selectedGroup?.members || []}
				onAdd={handleAddExpense}
				currency={currency}
				theme={theme}
				getInitials={getInitials}
				styles={styles}
			/>

			<SettlementModal
				visible={showSettlement}
				onClose={() => setShowSettlement(false)}
				settlementForm={settlementForm}
				setSettlementForm={setSettlementForm}
				members={selectedGroup?.members || []}
				onSettle={handleSettlement}
				currency={currency}
				theme={theme}
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
