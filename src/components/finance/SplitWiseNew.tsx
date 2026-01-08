// SplitWise - Enhanced Group Expense Splitting with Real User Support
// Part 1: Imports, Types, Constants, and Component Setup

import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { Theme } from "@/src/context/themeContext";
import { NotificationService } from "@/src/services/notificationService";
import * as SplitWiseService from "@/src/services/splitwiseService";
import {
	ExpenseCategory,
	GroupInvitation,
	GroupMember,
	SplitGroup,
} from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Dimensions,
	Modal,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

type SplitMethod = "equal" | "exact" | "percentage" | "shares";
type DetailTab = "overview" | "expenses" | "members" | "activity";

interface SplitWiseProps {
	theme: Theme;
	currency: string;
	onOpenDrawer?: () => void;
}

const GROUP_ICONS = [
	"people",
	"home",
	"airplane",
	"restaurant",
	"car",
	"basket",
	"beer",
	"musical-notes",
	"game-controller",
	"heart",
	"cafe",
	"gift",
	"football",
	"briefcase",
];

const COLORS = [
	"#A78BFA",
	"#F472B6",
	"#FB923C",
	"#FBBF24",
	"#34D399",
	"#22D3EE",
	"#60A5FA",
	"#818CF8",
	"#F87171",
	"#10B981",
];

const EXPENSE_CATEGORIES: {
	value: ExpenseCategory;
	label: string;
	icon: string;
}[] = [
	{ value: "food", label: "Food & Dining", icon: "restaurant" },
	{ value: "transport", label: "Transport", icon: "car" },
	{ value: "shopping", label: "Shopping", icon: "bag-handle" },
	{ value: "entertainment", label: "Entertainment", icon: "game-controller" },
	{ value: "bills", label: "Bills & Utilities", icon: "receipt" },
	{ value: "travel", label: "Travel", icon: "airplane" },
	{ value: "groceries", label: "Groceries", icon: "cart" },
	{ value: "rent", label: "Rent & Housing", icon: "home" },
	{ value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

const GROUP_TYPES = [
	{ value: "trip", label: "Trip", icon: "airplane" },
	{ value: "home", label: "Home", icon: "home" },
	{ value: "couple", label: "Couple", icon: "heart" },
	{ value: "group", label: "Group", icon: "people" },
	{ value: "work", label: "Work", icon: "briefcase" },
	{ value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

const GROUP_COLORS = COLORS;

function SplitWiseNew({ theme, currency, onOpenDrawer }: SplitWiseProps) {
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
			const { data, error } = await SplitWiseService.fetchUserGroups(
				currentUserId
			);
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
			const { data, error } = await SplitWiseService.fetchPendingInvitations(
				currentUserId
			);
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
					`${newInvitation.invitedByName} invited you to join "${newInvitation.groupName}"`
				);
			}
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
					prev.map((g) => (g.id === updatedGroup.id ? groupWithCurrentUser : g))
				);
			}
		);

		return () => {
			unsubscribe();
		};
	}, [selectedGroup?.id, currentUserId]);

	// ============== HELPER FUNCTIONS ==============

	const formatAmount = (value: number) => {
		return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
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

		setIsLoading(true);
		const { data, error } = await SplitWiseService.createSplitGroup(
			currentUserId,
			currentUserName,
			{
				name: groupForm.name.trim(),
				description: groupForm.description.trim(),
				color: groupForm.color,
				icon: groupIcon,
			}
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
		setIsLoading(false);
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

		setIsLoading(true);
		const { error } = await SplitWiseService.updateSplitGroup(
			selectedGroup.id,
			{
				name: groupForm.name.trim(),
				description: groupForm.description.trim(),
				color: groupForm.color,
			}
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
		setIsLoading(false);
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
							selectedGroup.id
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							setGroups((prev) =>
								prev.filter((g) => g.id !== selectedGroup.id)
							);
							setSelectedGroup(null);
						}
					},
				},
			]
		);
	};

	const handleAddNonUserMember = async () => {
		if (!selectedGroup || !memberName.trim()) {
			Alert.alert("Error", "Please enter a name");
			return;
		}

		const { data, error } = await SplitWiseService.addNonUserMember(
			selectedGroup.id,
			memberName.trim()
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
			currentUserId
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
		inviteeName: string
	) => {
		if (!selectedGroup) return;

		const { error } = await SplitWiseService.sendGroupInvitation(
			selectedGroup.id,
			selectedGroup.name,
			currentUserId,
			currentUserName,
			inviteeUserId,
			undefined,
			inviteMessage.trim() || undefined
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
					}
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
		accept: boolean
	) => {
		const { error } = await SplitWiseService.respondToInvitation(
			invitation.id,
			currentUserId,
			currentUserName,
			currentUserEmail,
			accept
		);

		if (error) {
			Alert.alert("Error", error);
		} else {
			setPendingInvitations((prev) =>
				prev.filter((i) => i.id !== invitation.id)
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
				"You cannot leave as you're the only admin. Transfer admin rights first."
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
							member.id
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							if (member.isCurrentUser) {
								setGroups((prev) =>
									prev.filter((g) => g.id !== selectedGroup.id)
								);
								setSelectedGroup(null);
							} else {
								const updatedGroups = await fetchGroups();
								const updated = updatedGroups.find(
									(g) => g.id === selectedGroup.id
								);
								if (updated) setSelectedGroup(updated);
							}
						}
					},
				},
			]
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
				0
			);
			if (Math.abs(totalSplit - amount) > 0.005) {
				Alert.alert(
					"Error",
					"Exact splits must add up exactly to the total amount"
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
				})
			);
			let sumComputed = computed.reduce((s, c) => s + c.amount, 0);
			let remainder = Math.round((amount - sumComputed) * 100) / 100;
			// Distribute remainder cents starting from first member
			for (let i = 0; remainder > 0.001 && i < computed.length; i++) {
				computed[i].amount =
					Math.round((computed[i].amount + 0.01) * 100) / 100;
				remainder =
					Math.round(
						(amount - computed.reduce((s, c) => s + c.amount, 0)) * 100
					) / 100;
			}
			splits = computed;
		} else if (expenseForm.splitType === "shares") {
			const totalShares = members.reduce(
				(sum: number, m) =>
					sum + (parseFloat(expenseForm.customSplits[m.id] || "1") || 0),
				0
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
							100
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
						(amount - computedShares.reduce((s, c) => s + c.amount, 0)) * 100
					) / 100;
			}
			splits = computedShares;
		}

		const { error } = await SplitWiseService.addExpense(selectedGroup.id, {
			description: expenseForm.description.trim(),
			amount,
			category: expenseForm.category as ExpenseCategory,
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
							expenseId
						);
						if (error) {
							Alert.alert("Error", error);
						} else {
							const updatedGroups = await fetchGroups();
							const updated = updatedGroups.find(
								(g) => g.id === selectedGroup.id
							);
							if (updated) setSelectedGroup(updated);
						}
					},
				},
			]
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
								"Please add members before adding expenses"
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

// ============== SUB-COMPONENTS ==============
// These are defined below to keep the main component clean

// Group List View Component
interface GroupListViewProps {
	groups: SplitGroup[];
	pendingInvitations: GroupInvitation[];
	theme: Theme;
	currency: string;
	refreshing: boolean;
	onRefresh: () => void;
	onSelectGroup: (group: SplitGroup) => void;
	onCreateGroup: () => void;
	onShowInvitations: () => void;
	formatAmount: (value: number) => string;
	styles: any;
}

const GroupListView: React.FC<GroupListViewProps> = ({
	groups,
	pendingInvitations,
	theme,
	currency,
	refreshing,
	onRefresh,
	onSelectGroup,
	onCreateGroup,
	onShowInvitations,
	formatAmount,
	styles,
}) => (
	<ScrollView
		style={styles.container}
		showsVerticalScrollIndicator={false}
		refreshControl={
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
				tintColor={theme.primary}
			/>
		}
	>
		<View style={styles.header}>
			<Text style={styles.title}>Split Expenses</Text>
			<View
				style={{
					...styles.headerActions,
				}}
			>
				{pendingInvitations.length > 0 && (
					<TouchableOpacity
						style={styles.invitationBadge}
						onPress={onShowInvitations}
					>
						<Ionicons name="mail" size={20} color="#FFF" />
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{pendingInvitations.length}</Text>
						</View>
					</TouchableOpacity>
				)}
				<TouchableOpacity style={styles.createButton} onPress={onCreateGroup}>
					<Ionicons name="add" size={22} color="#FFF" />
				</TouchableOpacity>
			</View>
		</View>

		{/* Pending Invitations Preview */}
		{pendingInvitations.length > 0 && (
			<TouchableOpacity
				style={styles.invitationsCard}
				onPress={onShowInvitations}
			>
				<View style={styles.invitationsIcon}>
					<Ionicons name="mail-unread" size={24} color={theme.primary} />
				</View>
				<View style={styles.invitationsContent}>
					<Text style={styles.invitationsTitle}>
						{pendingInvitations.length} Pending Invitation
						{pendingInvitations.length > 1 ? "s" : ""}
					</Text>
					<Text style={styles.invitationsSubtitle}>
						Tap to view and respond
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
			</TouchableOpacity>
		)}

		{groups.length === 0 ? (
			<View style={styles.emptyState}>
				<View style={styles.emptyIcon}>
					<Ionicons name="people-outline" size={48} color={theme.textMuted} />
				</View>
				<Text style={styles.emptyTitle}>No Groups Yet</Text>
				<Text style={styles.emptySubtitle}>
					Create a group to split expenses with friends and family
				</Text>
				<TouchableOpacity style={styles.emptyButton} onPress={onCreateGroup}>
					<Ionicons name="add" size={18} color="#FFF" />
					<Text style={styles.emptyButtonText}>Create Group</Text>
				</TouchableOpacity>
			</View>
		) : (
			<View style={styles.groupList}>
				{groups.map((group) => {
					const members = group.members || [];
					const expenses = group.expenses || [];
					const totalSpent =
						group.totalExpenses ||
						expenses.reduce((sum, e) => sum + e.amount, 0);

					return (
						<TouchableOpacity
							key={group.id}
							style={styles.groupCard}
							onPress={() => onSelectGroup(group)}
							activeOpacity={0.7}
						>
							<View
								style={[
									styles.groupIconContainer,
									{ backgroundColor: group.color + "20" },
								]}
							>
								<Ionicons
									name={group.icon as any}
									size={26}
									color={group.color}
								/>
							</View>
							<View style={styles.groupContent}>
								<Text style={styles.groupName}>{group.name}</Text>
								<Text style={styles.groupMeta}>
									{members.length} {members.length === 1 ? "member" : "members"}{" "}
									• {expenses.length}{" "}
									{expenses.length === 1 ? "expense" : "expenses"}
								</Text>
							</View>
							<View style={styles.groupAmount}>
								<Text style={styles.groupTotal}>
									{currency}
									{formatAmount(totalSpent)}
								</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									color={theme.textMuted}
								/>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		)}
		<View style={{ height: 40 }} />
	</ScrollView>
);

// Continued in next part due to length...

// Group Detail View Component
interface GroupDetailViewProps {
	group: SplitGroup;
	theme: Theme;
	currency: string;
	detailTab: DetailTab;
	setDetailTab: (tab: DetailTab) => void;
	currentUserId: string;
	onBack: () => void;
	onDelete: () => void;
	onAddMember: () => void;
	onInviteUser: () => void;
	onRemoveMember: (member: GroupMember) => void;
	onAddExpense: () => void;
	onDeleteExpense: (expenseId: string) => void;
	onSettle: (debt: {
		from: GroupMember;
		to: GroupMember;
		amount: number;
	}) => void;
	calculateBalances: () => Array<{
		memberId: string;
		memberName: string;
		balance: number;
	}>;
	calculateDebts: () => Array<{
		from: GroupMember;
		to: GroupMember;
		amount: number;
	}>;
	formatAmount: (value: number) => string;
	getInitials: (name: string) => string;
	styles: any;
	onEdit: () => void;
}

const GroupDetailView: React.FC<GroupDetailViewProps> = ({
	group,
	theme,
	currency,
	detailTab,
	setDetailTab,
	currentUserId,
	onBack,
	onDelete,
	onAddMember,
	onInviteUser,
	onRemoveMember,
	onAddExpense,
	onDeleteExpense,
	onSettle,
	calculateBalances,
	calculateDebts,
	formatAmount,
	getInitials,
	styles,
	onEdit,
}) => {
	const members = group.members || [];
	const expenses = group.expenses || [];
	const settlements = group.settlements || [];
	const balances = calculateBalances();
	const debts = calculateDebts();
	const totalSpent =
		group.totalExpenses || expenses.reduce((sum, e) => sum + e.amount, 0);
	const perPerson = members.length > 0 ? totalSpent / members.length : 0;

	const isAdmin =
		members.find((m) => m.userId === currentUserId)?.role === "admin";

	return (
		<View style={styles.detailContainer}>
			{/* Header */}
			<View style={styles.detailHeader}>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Ionicons name="arrow-back" size={24} color={theme.text} />
				</TouchableOpacity>
				<View style={styles.detailHeaderContent}>
					<Text style={styles.detailTitle}>{group.name}</Text>
					{group.description && (
						<Text style={styles.detailSubtitle} numberOfLines={1}>
							{group.description}
						</Text>
					)}
				</View>
				{isAdmin && (
					<>
						<TouchableOpacity onPress={onEdit} style={{ marginRight: 12 }}>
							<Ionicons name="pencil-outline" size={20} color={theme.primary} />
						</TouchableOpacity>
						<TouchableOpacity onPress={onDelete}>
							<Ionicons name="trash-outline" size={22} color={theme.error} />
						</TouchableOpacity>
					</>
				)}
			</View>

			{/* Summary Card */}
			<View
				style={[styles.summaryCard, { backgroundColor: group.color + "15" }]}
			>
				<View style={styles.summaryItem}>
					<Text style={[styles.summaryValue, { color: group.color }]}>
						{currency}
						{formatAmount(totalSpent)}
					</Text>
					<Text style={styles.summaryLabel}>Total Spent</Text>
				</View>
				<View style={styles.summaryDivider} />
				<View style={styles.summaryItem}>
					<Text style={[styles.summaryValue, { color: group.color }]}>
						{currency}
						{formatAmount(perPerson)}
					</Text>
					<Text style={styles.summaryLabel}>Per Person</Text>
				</View>
				<View style={styles.summaryDivider} />
				<View style={styles.summaryItem}>
					<Text style={[styles.summaryValue, { color: group.color }]}>
						{members.length}
					</Text>
					<Text style={styles.summaryLabel}>Members</Text>
				</View>
			</View>

			{/* Tabs */}
			<View style={styles.tabBar}>
				{(["overview", "expenses", "members"] as DetailTab[]).map((tab) => (
					<TouchableOpacity
						key={tab}
						style={[styles.tab, detailTab === tab && styles.tabActive]}
						onPress={() => setDetailTab(tab)}
					>
						<Text
							style={[
								styles.tabText,
								detailTab === tab && styles.tabTextActive,
							]}
						>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<ScrollView
				style={styles.detailContent}
				showsVerticalScrollIndicator={false}
			>
				{detailTab === "overview" && (
					<>
						{/* Who Owes Who */}
						{debts.length > 0 ? (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Settle Up</Text>
								{debts.map((debt, index) => (
									<View key={index} style={styles.debtCard}>
										<View style={styles.debtInfo}>
											<View style={styles.debtAvatar}>
												<Text style={styles.debtInitial}>
													{getInitials(debt.from.name)}
												</Text>
											</View>
											<View style={styles.debtFlow}>
												<Text style={styles.debtFromName}>
													{debt.from.name}
												</Text>
												<View style={styles.debtArrow}>
													<Text style={styles.debtOwes}>owes</Text>
													<Text style={styles.debtAmountText}>
														{currency}
														{formatAmount(debt.amount)}
													</Text>
												</View>
												<Text style={styles.debtToName}>{debt.to.name}</Text>
											</View>
											<View
												style={[
													styles.debtAvatar,
													{ backgroundColor: theme.success + "20" },
												]}
											>
												<Text
													style={[styles.debtInitial, { color: theme.success }]}
												>
													{getInitials(debt.to.name)}
												</Text>
											</View>
										</View>
										<TouchableOpacity
											style={styles.settleButton}
											onPress={() => onSettle(debt)}
										>
											<Text style={styles.settleButtonText}>Settle</Text>
										</TouchableOpacity>
									</View>
								))}
							</View>
						) : (
							<View style={styles.allSettledCard}>
								<Ionicons
									name="checkmark-circle"
									size={40}
									color={theme.success}
								/>
								<Text style={styles.allSettledTitle}>All Settled!</Text>
								<Text style={styles.allSettledText}>
									No outstanding balances
								</Text>
							</View>
						)}

						{/* Recent Expenses */}
						{expenses.length > 0 && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Recent Expenses</Text>
								{expenses
									.sort(
										(a, b) =>
											new Date(b.date).getTime() - new Date(a.date).getTime()
									)
									.slice(0, 3)
									.map((expense) => {
										const payer = members.find((m) => m.id === expense.paidBy);
										return (
											<View key={expense.id} style={styles.expenseItem}>
												<View style={styles.expenseIconContainer}>
													<Ionicons
														name="receipt"
														size={18}
														color={theme.primary}
													/>
												</View>
												<View style={styles.expenseContent}>
													<Text style={styles.expenseDesc}>
														{expense.description}
													</Text>
													<Text style={styles.expenseMeta}>
														{payer?.name} •{" "}
														{new Date(expense.date).toLocaleDateString()}
													</Text>
												</View>
												<Text style={styles.expenseAmountText}>
													{currency}
													{formatAmount(expense.amount)}
												</Text>
											</View>
										);
									})}
							</View>
						)}

						{/* Settlement History */}
						{settlements.length > 0 && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Settlement History</Text>
								{settlements.slice(0, 5).map((settlement) => {
									const from = members.find(
										(m) => m.id === settlement.fromMemberId
									);
									const to = members.find(
										(m) => m.id === settlement.toMemberId
									);
									return (
										<View key={settlement.id} style={styles.settlementItem}>
											<Ionicons
												name="checkmark-circle"
												size={18}
												color={theme.success}
											/>
											<Text style={styles.settlementText}>
												{from?.name} paid {to?.name} {currency}
												{formatAmount(settlement.amount)}
											</Text>
											<Text style={styles.settlementDate}>
												{new Date(settlement.date).toLocaleDateString()}
											</Text>
										</View>
									);
								})}
							</View>
						)}
					</>
				)}

				{detailTab === "expenses" && (
					<View style={styles.section}>
						{expenses.length === 0 ? (
							<View style={styles.emptySection}>
								<Ionicons
									name="receipt-outline"
									size={40}
									color={theme.textMuted}
								/>
								<Text style={styles.emptySectionText}>No expenses yet</Text>
								<Text style={styles.emptySectionSubtext}>
									Add an expense to start tracking
								</Text>
							</View>
						) : (
							expenses
								.sort(
									(a, b) =>
										new Date(b.date).getTime() - new Date(a.date).getTime()
								)
								.map((expense) => {
									const payer = members.find((m) => m.id === expense.paidBy);
									const categoryInfo = EXPENSE_CATEGORIES.find(
										(c) => c.value === expense.category
									);
									return (
										<View key={expense.id} style={styles.expenseCard}>
											<View style={styles.expenseCardHeader}>
												<View style={styles.expenseCardLeft}>
													<View
														style={[
															styles.expenseIconContainer,
															{ backgroundColor: group.color + "20" },
														]}
													>
														<Ionicons
															name={(categoryInfo?.icon || "receipt") as any}
															size={18}
															color={group.color}
														/>
													</View>
													<View style={{ marginLeft: 12, flex: 1 }}>
														<Text style={styles.expenseCardTitle}>
															{expense.description}
														</Text>
														<Text style={styles.expenseCardMeta}>
															Paid by {payer?.name || "Unknown"}
														</Text>
													</View>
												</View>
												<View style={styles.expenseCardRight}>
													<Text style={styles.expenseCardAmount}>
														{currency}
														{expense.amount.toLocaleString()}
													</Text>
													<Text style={styles.expenseCardDate}>
														{new Date(expense.date).toLocaleDateString()}
													</Text>
												</View>
											</View>
											<View style={styles.expenseCardSplits}>
												<Text style={styles.splitsTitle}>
													Split ({expense.splitType}):
												</Text>
												<View style={styles.splitsList}>
													{expense.splits.map((split) => {
														const member = members.find(
															(m) => m.id === split.memberId
														);
														return (
															<View
																key={split.memberId}
																style={styles.splitItem}
															>
																<Text style={styles.splitName}>
																	{member?.name}
																</Text>
																<Text style={styles.splitAmount}>
																	{currency}
																	{formatAmount(split.amount)}
																</Text>
															</View>
														);
													})}
												</View>
											</View>
											{isAdmin && (
												<TouchableOpacity
													style={styles.deleteExpenseBtn}
													onPress={() => onDeleteExpense(expense.id)}
												>
													<Ionicons
														name="trash-outline"
														size={16}
														color={theme.error}
													/>
												</TouchableOpacity>
											)}
										</View>
									);
								})
						)}
					</View>
				)}

				{detailTab === "members" && (
					<View style={styles.section}>
						{members.map((member) => {
							const balance = balances.find((b) => b.memberId === member.id);
							const balanceAmount = balance?.balance || 0;
							return (
								<View key={member.id} style={styles.memberCard}>
									<View
										style={[
											styles.memberAvatar,
											member.userId && {
												backgroundColor: theme.primary + "20",
											},
										]}
									>
										<Text
											style={[
												styles.memberInitial,
												member.userId && { color: theme.primary },
											]}
										>
											{getInitials(member.name)}
										</Text>
									</View>
									<View style={styles.memberInfo}>
										<View style={styles.memberNameRow}>
											<Text style={styles.memberName}>{member.name}</Text>
											{member.isCurrentUser && (
												<View style={styles.youBadge}>
													<Text style={styles.youBadgeText}>You</Text>
												</View>
											)}
											{member.userId && !member.isCurrentUser && (
												<Ionicons
													name="checkmark-circle"
													size={14}
													color={theme.success}
												/>
											)}
											{member.role === "admin" && (
												<View style={styles.adminBadge}>
													<Text style={styles.adminBadgeText}>Admin</Text>
												</View>
											)}
										</View>
										<Text
											style={[
												styles.memberBalance,
												{
													color:
														balanceAmount > 0.01
															? theme.success
															: balanceAmount < -0.01
															? theme.error
															: theme.textMuted,
												},
											]}
										>
											{balanceAmount > 0.01
												? `Gets back ${currency}${formatAmount(balanceAmount)}`
												: balanceAmount < -0.01
												? `Owes ${currency}${formatAmount(
														Math.abs(balanceAmount)
												  )}`
												: "All settled"}
										</Text>
									</View>
									{isAdmin && !member.isCurrentUser && (
										<TouchableOpacity onPress={() => onRemoveMember(member)}>
											<Ionicons
												name="close-circle"
												size={22}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									)}
									{member.isCurrentUser && (
										<TouchableOpacity onPress={() => onRemoveMember(member)}>
											<Ionicons
												name="exit-outline"
												size={22}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									)}
								</View>
							);
						})}

						{/* Add Member Buttons */}
						<View style={styles.addMemberButtons}>
							<TouchableOpacity
								style={styles.addMemberButton}
								onPress={onInviteUser}
							>
								<Ionicons name="person-add" size={18} color={theme.primary} />
								<Text style={styles.addMemberText}>Invite LifeSync User</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.addMemberButton,
									{ backgroundColor: theme.surface },
								]}
								onPress={onAddMember}
							>
								<Ionicons
									name="person-add-outline"
									size={18}
									color={theme.textSecondary}
								/>
								<Text
									style={[styles.addMemberText, { color: theme.textSecondary }]}
								>
									Add Non-User
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				<View style={{ height: 100 }} />
			</ScrollView>

			{/* Floating Action Button */}
			<View style={styles.fabContainer}>
				<TouchableOpacity
					style={[styles.fab, { backgroundColor: group.color }]}
					onPress={onAddExpense}
				>
					<Ionicons name="add" size={22} color="#FFF" />
					<Text style={styles.fabText}>Add Expense</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};
// ============== MODAL COMPONENTS ==============

// Create Group Modal
interface CreateGroupModalProps {
	visible: boolean;
	onClose: () => void;
	onCreate: () => void;
	groupForm: { name: string; description: string; color: string; type: string };
	setGroupForm: React.Dispatch<
		React.SetStateAction<{
			name: string;
			description: string;
			color: string;
			type: string;
		}>
	>;
	theme: Theme;
	styles: any;
	isEditing?: boolean;
	onSave?: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
	visible,
	onClose,
	onCreate,
	groupForm,
	setGroupForm,
	theme,
	styles,
	isEditing,
	onSave,
}) => (
	<SafeAreaView>
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Cancel</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>
						{isEditing ? "Edit Group" : "Create Group"}
					</Text>
					<TouchableOpacity onPress={isEditing ? onSave : onCreate}>
						<Text style={styles.modalSave}>
							{isEditing ? "Save" : "Create"}
						</Text>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.modalContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Name</Text>
						<TextInput
							style={styles.formInput}
							placeholder="e.g., Roommates, Trip to Paris"
							placeholderTextColor={theme.textMuted}
							value={groupForm.name}
							onChangeText={(text) =>
								setGroupForm((prev) => ({ ...prev, name: text }))
							}
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Description (Optional)</Text>
						<TextInput
							style={[styles.formInput, { height: 80 }]}
							placeholder="What's this group for?"
							placeholderTextColor={theme.textMuted}
							value={groupForm.description}
							onChangeText={(text) =>
								setGroupForm((prev) => ({ ...prev, description: text }))
							}
							multiline
							textAlignVertical="top"
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Type</Text>
						<View style={styles.typeGrid}>
							{GROUP_TYPES.map((type) => (
								<TouchableOpacity
									key={type.value}
									style={[
										styles.typeOption,
										groupForm.type === type.value && {
											borderColor: theme.primary,
											backgroundColor: theme.primary + "10",
										},
									]}
									onPress={() =>
										setGroupForm((prev) => ({ ...prev, type: type.value }))
									}
								>
									<Ionicons
										name={type.icon as any}
										size={24}
										color={
											groupForm.type === type.value
												? theme.primary
												: theme.textSecondary
										}
									/>
									<Text
										style={[
											styles.typeLabel,
											groupForm.type === type.value && { color: theme.primary },
										]}
									>
										{type.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Group Color</Text>
						<View style={styles.colorGrid}>
							{GROUP_COLORS.map((color) => (
								<TouchableOpacity
									key={color}
									style={[
										styles.colorOption,
										{ backgroundColor: color },
										groupForm.color === color && styles.colorOptionSelected,
									]}
									onPress={() => setGroupForm((prev) => ({ ...prev, color }))}
								>
									{groupForm.color === color && (
										<Ionicons name="checkmark" size={18} color="#FFF" />
									)}
								</TouchableOpacity>
							))}
						</View>
					</View>
				</ScrollView>
			</View>
		</Modal>
	</SafeAreaView>
);

// Add Non-User Member Modal
interface AddMemberModalProps {
	visible: boolean;
	onClose: () => void;
	onAdd: () => void;
	memberName: string;
	setMemberName: (name: string) => void;
	theme: Theme;
	styles: any;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
	visible,
	onClose,
	onAdd,
	memberName,
	setMemberName,
	theme,
	styles,
}) => (
	<Modal visible={visible} transparent animationType="fade">
		<View style={styles.alertOverlay}>
			<View style={styles.alertContainer}>
				<Text style={styles.alertTitle}>Add Member</Text>
				<Text style={styles.alertMessage}>
					Add a non-LifeSync user to this group. They won't receive
					notifications.
				</Text>
				<TextInput
					style={styles.alertInput}
					placeholder="Member name"
					placeholderTextColor={theme.textMuted}
					value={memberName}
					onChangeText={setMemberName}
					autoFocus
				/>
				<View style={styles.alertButtons}>
					<TouchableOpacity style={styles.alertButtonCancel} onPress={onClose}>
						<Text style={styles.alertButtonCancelText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.alertButtonConfirm} onPress={onAdd}>
						<Text style={styles.alertButtonConfirmText}>Add</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	</Modal>
);

// Invite User Modal
interface InviteUserModalProps {
	visible: boolean;
	onClose: () => void;
	searchQuery: string;
	searchResults:
		| Array<{ id: string; email: string; full_name: string }>
		| undefined;
	isSearching?: boolean;
	inviteMessage?: string;
	setInviteMessage?: (msg: string) => void;
	onSearch: (query: string) => void;
	onInvite: (userId: string, name: string) => void;
	theme: Theme;
	styles: any;
	getInitials: (name: string) => string;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
	visible,
	onClose,
	searchQuery,
	searchResults,
	isSearching,
	onSearch,
	onInvite,
	theme,
	styles,
	getInitials,
}) => {
	const [localQuery, setLocalQuery] = useState(searchQuery);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Cancel</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Invite User</Text>
					<View style={{ width: 60 }} />
				</View>

				<View style={styles.modalContent}>
					<View style={styles.searchContainer}>
						<Ionicons name="search" size={20} color={theme.textMuted} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search by name or email address"
							placeholderTextColor={theme.textMuted}
							value={localQuery}
							onChangeText={setLocalQuery}
							keyboardType="email-address"
							autoCapitalize="none"
							returnKeyType="search"
							onSubmitEditing={() => onSearch(localQuery)}
						/>
						<TouchableOpacity
							style={styles.searchButton}
							onPress={() => onSearch(localQuery)}
						>
							{isSearching ? (
								<ActivityIndicator size="small" color="#FFF" />
							) : (
								<Text style={styles.searchButtonText}>Search</Text>
							)}
						</TouchableOpacity>
					</View>

					{(searchResults?.length ?? 0) > 0 ? (
						<View style={styles.searchResults}>
							{searchResults?.map((user) => (
								<View key={user.id} style={styles.searchResultItem}>
									<View style={styles.searchResultAvatar}>
										<Text style={styles.searchResultInitial}>
											{getInitials(user.full_name || user.email)}
										</Text>
									</View>
									<View style={styles.searchResultInfo}>
										<Text style={styles.searchResultName}>
											{user.full_name || "LifeSync User"}
										</Text>
										<Text style={styles.searchResultEmail}>{user.email}</Text>
									</View>
									<TouchableOpacity
										style={styles.inviteButton}
										onPress={() =>
											onInvite(user.id, user.full_name || user.email)
										}
									>
										<Text style={styles.inviteButtonText}>Invite</Text>
									</TouchableOpacity>
								</View>
							))}
						</View>
					) : (
						<View style={styles.searchEmpty}>
							<Ionicons
								name="people-outline"
								size={48}
								color={theme.textMuted}
							/>
							<Text style={styles.searchEmptyText}>
								Search for users by name or email
							</Text>
							<Text style={styles.searchEmptySubtext}>
								Find LifeSync users to add to your group
							</Text>
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
};

// Add Expense Modal
interface AddExpenseModalProps {
	visible: boolean;
	onClose: () => void;
	onAdd: () => void;
	expenseForm: {
		description: string;
		amount: string;
		paidBy: string;
		category: string;
		splitType: "equal" | "exact" | "percentage" | "shares";
		customSplits: { [memberId: string]: string };
	};
	setExpenseForm: React.Dispatch<
		React.SetStateAction<{
			description: string;
			amount: string;
			paidBy: string;
			category: string;
			splitType: "equal" | "exact" | "percentage" | "shares";
			customSplits: { [memberId: string]: string };
		}>
	>;
	members: GroupMember[];
	theme: Theme;
	currency: string;
	styles: any;
	getInitials: (name: string) => string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
	visible,
	onClose,
	onAdd,
	expenseForm,
	setExpenseForm,
	members,
	theme,
	currency,
	styles,
	getInitials,
}) => {
	const amount = parseFloat(expenseForm.amount) || 0;
	const splitAmount = members.length > 0 ? amount / members.length : 0;

	// Helpers for parsing
	const parseNum = (v: string) => {
		const n = parseFloat(v);
		return isNaN(n) ? 0 : n;
	};

	const handleExactChange = (memberId: string, text: string) => {
		// clamp input to not exceed amount when possible and auto-fill for two members
		const updated = { ...expenseForm.customSplits, [memberId]: text };
		const vals = members.map((m) => ({
			id: m.id,
			v: parseNum(updated[m.id] || "0"),
		}));
		const totalEntered = vals.reduce((s, x) => s + x.v, 0);
		// If only two members, auto-fill the other
		if (members.length === 2) {
			const other = members.find((m) => m.id !== memberId)!;
			let edited = parseNum(text);
			if (edited > amount) edited = amount;
			const otherVal = Math.max(0, Math.round((amount - edited) * 100) / 100);
			setExpenseForm((prev) => ({
				...prev,
				customSplits: {
					...prev.customSplits,
					[memberId]: edited.toString(),
					[other.id]: otherVal.toFixed(2),
				},
			}));
			return;
		}

		// For >2 members, just clamp edited value so total doesn't exceed amount
		const editedVal = parseNum(text);
		const sumOthers = vals.reduce(
			(s, x) => s + (x.id === memberId ? 0 : x.v),
			0
		);
		let newEdited = editedVal;
		if (sumOthers + newEdited > amount)
			newEdited = Math.max(0, amount - sumOthers);
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: newEdited.toFixed(2),
			},
		}));
	};

	const handlePercentageChange = (memberId: string, text: string) => {
		const updated = { ...expenseForm.customSplits, [memberId]: text };
		const vals = members.map((m) => ({
			id: m.id,
			v: parseNum(updated[m.id] || "0"),
		}));
		const totalEntered = vals.reduce((s, x) => s + x.v, 0);
		if (members.length === 2) {
			const other = members.find((m) => m.id !== memberId)!;
			let edited = parseNum(text);
			if (edited > 100) edited = 100;
			const otherVal = Math.max(0, Math.round((100 - edited) * 100) / 100);
			setExpenseForm((prev) => ({
				...prev,
				customSplits: {
					...prev.customSplits,
					[memberId]: edited.toString(),
					[other.id]: otherVal.toString(),
				},
			}));
			return;
		}

		// For >2, clamp to not exceed 100
		let editedVal = parseNum(text);
		const sumOthers = vals.reduce(
			(s, x) => s + (x.id === memberId ? 0 : x.v),
			0
		);
		if (sumOthers + editedVal > 100) editedVal = Math.max(0, 100 - sumOthers);
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: editedVal.toString(),
			},
		}));
	};

	const handleSharesChange = (memberId: string, text: string) => {
		// shares must be non-negative integers or decimals; leave as entered but ensure >=0
		let edited = parseNum(text);
		if (edited < 0) edited = 0;
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: String(edited),
			},
		}));
	};

	const validateAndAdd = () => {
		// Perform final validation: amount>0 & paidBy set handled by parent, but ensure splits sum correctly
		if (expenseForm.splitType === "exact") {
			const total = members.reduce(
				(s, m) => s + parseNum(expenseForm.customSplits[m.id] || "0"),
				0
			);
			if (Math.abs(total - amount) > 0.005) {
				Alert.alert("Error", "Exact splits must add up to the total amount");
				return;
			}
		} else if (expenseForm.splitType === "percentage") {
			const total = members.reduce(
				(s, m) => s + parseNum(expenseForm.customSplits[m.id] || "0"),
				0
			);
			if (Math.abs(total - 100) > 0.01) {
				Alert.alert("Error", "Percentages must add up to 100%");
				return;
			}
		} else if (expenseForm.splitType === "shares") {
			const totalShares = members.reduce(
				(s, m) => s + (parseNum(expenseForm.customSplits[m.id] || "1") || 0),
				0
			);
			if (totalShares <= 0) {
				Alert.alert("Error", "Total shares must be greater than zero");
				return;
			}
		}

		// All good — call parent add handler
		onAdd();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Cancel</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Add Expense</Text>
					<TouchableOpacity onPress={validateAndAdd}>
						<Text style={styles.modalSave}>Add</Text>
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.modalContent}>
					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Description</Text>
						<TextInput
							style={styles.formInput}
							placeholder="e.g., Dinner, Groceries, Uber"
							placeholderTextColor={theme.textMuted}
							value={expenseForm.description}
							onChangeText={(text) =>
								setExpenseForm((prev) => ({ ...prev, description: text }))
							}
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Amount</Text>
						<View style={styles.amountInputContainer}>
							<Text style={styles.currencyPrefix}>{currency}</Text>
							<TextInput
								style={styles.amountInput}
								placeholder="0.00"
								placeholderTextColor={theme.textMuted}
								value={expenseForm.amount}
								onChangeText={(text) =>
									setExpenseForm((prev) => ({ ...prev, amount: text }))
								}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Paid By</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							{members.map((member) => (
								<TouchableOpacity
									key={member.id}
									style={[
										styles.payerOption,
										expenseForm.paidBy === member.id &&
											styles.payerOptionSelected,
									]}
									onPress={() =>
										setExpenseForm((prev) => ({ ...prev, paidBy: member.id }))
									}
								>
									<View
										style={[
											styles.payerAvatar,
											expenseForm.paidBy === member.id &&
												styles.payerAvatarSelected,
										]}
									>
										<Text
											style={[
												styles.payerInitial,
												expenseForm.paidBy === member.id &&
													styles.payerInitialSelected,
											]}
										>
											{getInitials(member.name)}
										</Text>
									</View>
									<Text
										style={[
											styles.payerName,
											expenseForm.paidBy === member.id &&
												styles.payerNameSelected,
										]}
									>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Category</Text>
						<View style={styles.categoryGrid}>
							{EXPENSE_CATEGORIES.map((cat) => (
								<TouchableOpacity
									key={cat.value}
									style={[
										styles.categoryOption,
										expenseForm.category === cat.value && {
											borderColor: theme.primary,
											backgroundColor: theme.primary + "10",
										},
									]}
									onPress={() =>
										setExpenseForm((prev) => ({ ...prev, category: cat.value }))
									}
								>
									<Ionicons
										name={cat.icon as any}
										size={20}
										color={
											expenseForm.category === cat.value
												? theme.primary
												: theme.textSecondary
										}
									/>
									<Text
										style={[
											styles.categoryLabel,
											expenseForm.category === cat.value && {
												color: theme.primary,
											},
										]}
									>
										{cat.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.formLabel}>Split Type</Text>
						<View style={styles.splitTypeRow}>
							{(["equal", "exact", "percentage", "shares"] as const).map(
								(type) => (
									<TouchableOpacity
										key={type}
										style={[
											styles.splitTypeOption,
											expenseForm.splitType === type &&
												styles.splitTypeOptionSelected,
										]}
										onPress={() =>
											setExpenseForm((prev) => ({ ...prev, splitType: type }))
										}
									>
										<Text
											style={[
												styles.splitTypeText,
												expenseForm.splitType === type &&
													styles.splitTypeTextSelected,
											]}
										>
											{type.charAt(0).toUpperCase() + type.slice(1)}
										</Text>
									</TouchableOpacity>
								)
							)}
						</View>
					</View>

					{expenseForm.splitType === "equal" && amount > 0 && (
						<View style={styles.splitPreview}>
							<Text style={styles.splitPreviewTitle}>Split Preview</Text>
							{members.map((member) => (
								<View key={member.id} style={styles.splitPreviewRow}>
									<Text style={styles.splitPreviewName}>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
									<Text style={styles.splitPreviewAmount}>
										{currency}
										{splitAmount.toFixed(2)}
									</Text>
								</View>
							))}
						</View>
					)}

					{expenseForm.splitType === "exact" && (
						<View style={styles.customSplits}>
							<Text style={styles.customSplitsTitle}>Exact Amounts</Text>
							{members.map((member) => (
								<View key={member.id} style={styles.customSplitRow}>
									<Text style={styles.customSplitName}>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
									<View style={styles.customSplitInput}>
										<Text style={styles.customSplitCurrency}>{currency}</Text>
										<TextInput
											style={styles.customSplitField}
											placeholder="0.00"
											placeholderTextColor={theme.textMuted}
											value={expenseForm.customSplits[member.id] || ""}
											onChangeText={(text) =>
												handleExactChange(member.id, text)
											}
											keyboardType="decimal-pad"
										/>
									</View>
								</View>
							))}
						</View>
					)}

					{expenseForm.splitType === "percentage" && (
						<View style={styles.customSplits}>
							<Text style={styles.customSplitsTitle}>Percentages</Text>
							{members.map((member) => (
								<View key={member.id} style={styles.customSplitRow}>
									<Text style={styles.customSplitName}>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
									<View style={styles.customSplitInput}>
										<TextInput
											style={styles.customSplitField}
											placeholder="0"
											placeholderTextColor={theme.textMuted}
											value={expenseForm.customSplits[member.id] || ""}
											onChangeText={(text) =>
												handlePercentageChange(member.id, text)
											}
											keyboardType="number-pad"
										/>
										<Text style={styles.customSplitCurrency}>%</Text>
									</View>
								</View>
							))}
						</View>
					)}

					{expenseForm.splitType === "shares" && (
						<View style={styles.customSplits}>
							<Text style={styles.customSplitsTitle}>
								Shares (e.g., 2 shares = 2x)
							</Text>
							{members.map((member) => (
								<View key={member.id} style={styles.customSplitRow}>
									<Text style={styles.customSplitName}>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
									<View style={styles.customSplitInput}>
										<TextInput
											style={styles.customSplitField}
											placeholder="1"
											placeholderTextColor={theme.textMuted}
											value={expenseForm.customSplits[member.id] || "1"}
											onChangeText={(text) =>
												handleSharesChange(member.id, text)
											}
											keyboardType="number-pad"
										/>
										<Text style={styles.customSplitCurrency}>shares</Text>
									</View>
								</View>
							))}
						</View>
					)}

					<View style={{ height: 50 }} />
				</ScrollView>
			</View>
		</Modal>
	);
};

// Settlement Modal
interface SettlementModalProps {
	visible: boolean;
	onClose: () => void;
	onSettle: () => void;
	settlementForm: {
		from: string;
		to: string;
		amount: string;
		note: string;
	};
	setSettlementForm: React.Dispatch<
		React.SetStateAction<{
			from: string;
			to: string;
			amount: string;
			note: string;
		}>
	>;
	members: GroupMember[];
	theme: Theme;
	currency: string;
	styles: any;
}

const SettlementModal: React.FC<SettlementModalProps> = ({
	visible,
	onClose,
	onSettle,
	settlementForm,
	setSettlementForm,
	members,
	theme,
	currency,
	styles,
}) => (
	<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
		<View style={styles.modalContainer}>
			<View style={styles.modalHeader}>
				<TouchableOpacity onPress={onClose}>
					<Text style={styles.modalCancel}>Cancel</Text>
				</TouchableOpacity>
				<Text style={styles.modalTitle}>Record Settlement</Text>
				<TouchableOpacity onPress={onSettle}>
					<Text style={styles.modalSave}>Save</Text>
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.modalContent}>
				<View style={styles.formGroup}>
					<Text style={styles.formLabel}>Who is paying?</Text>
					<View style={styles.memberSelectList}>
						{members.map((member) => (
							<TouchableOpacity
								key={member.id}
								style={[
									styles.memberSelectOption,
									settlementForm.from === member.id &&
										styles.memberSelectOptionSelected,
								]}
								onPress={() =>
									setSettlementForm((prev) => ({ ...prev, from: member.id }))
								}
							>
								<Text
									style={[
										styles.memberSelectText,
										settlementForm.from === member.id &&
											styles.memberSelectTextSelected,
									]}
								>
									{member.isCurrentUser ? "You" : member.name}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.formLabel}>Who are they paying?</Text>
					<View style={styles.memberSelectList}>
						{members
							.filter((m) => m.id !== settlementForm.from)
							.map((member) => (
								<TouchableOpacity
									key={member.id}
									style={[
										styles.memberSelectOption,
										settlementForm.to === member.id &&
											styles.memberSelectOptionSelected,
									]}
									onPress={() =>
										setSettlementForm((prev) => ({ ...prev, to: member.id }))
									}
								>
									<Text
										style={[
											styles.memberSelectText,
											settlementForm.to === member.id &&
												styles.memberSelectTextSelected,
										]}
									>
										{member.isCurrentUser ? "You" : member.name}
									</Text>
								</TouchableOpacity>
							))}
					</View>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.formLabel}>Amount</Text>
					<View style={styles.amountInputContainer}>
						<Text style={styles.currencyPrefix}>{currency}</Text>
						<TextInput
							style={styles.amountInput}
							placeholder="0.00"
							placeholderTextColor={theme.textMuted}
							value={settlementForm.amount}
							onChangeText={(text) =>
								setSettlementForm((prev) => ({ ...prev, amount: text }))
							}
							keyboardType="decimal-pad"
						/>
					</View>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.formLabel}>Note (Optional)</Text>
					<TextInput
						style={styles.formInput}
						placeholder="e.g., Venmo payment"
						placeholderTextColor={theme.textMuted}
						value={settlementForm.note}
						onChangeText={(text) =>
							setSettlementForm((prev) => ({ ...prev, note: text }))
						}
					/>
				</View>
			</ScrollView>
		</View>
	</Modal>
);

// Invitations Modal
interface InvitationsModalProps {
	visible: boolean;
	onClose: () => void;
	invitations: GroupInvitation[];
	onRespond: (invitation: GroupInvitation, accept: boolean) => void;
	theme: Theme;
	styles: any;
}

const InvitationsModal: React.FC<InvitationsModalProps> = ({
	visible,
	onClose,
	invitations,
	onRespond,
	theme,
	styles,
}) => (
	<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
		<View style={styles.modalContainer}>
			<View style={styles.modalHeader}>
				<TouchableOpacity onPress={onClose}>
					<Text style={styles.modalCancel}>Close</Text>
				</TouchableOpacity>
				<Text style={styles.modalTitle}>Group Invitations</Text>
				<View style={{ width: 60 }} />
			</View>

			<ScrollView style={styles.modalContent}>
				{invitations.length === 0 ? (
					<View style={styles.emptyInvitations}>
						<Ionicons name="mail-outline" size={48} color={theme.textMuted} />
						<Text style={styles.emptyInvitationsText}>
							No pending invitations
						</Text>
					</View>
				) : (
					invitations.map((invitation) => (
						<View key={invitation.id} style={styles.invitationCard}>
							<View style={styles.invitationInfo}>
								<Text style={styles.invitationGroupName}>
									{invitation.groupName}
								</Text>
								<Text style={styles.invitationInvitedBy}>
									Invited by {invitation.invitedByName}
								</Text>
								<Text style={styles.invitationExpiry}>
									Expires {new Date(invitation.expiresAt).toLocaleDateString()}
								</Text>
							</View>
							<View style={styles.invitationActions}>
								<TouchableOpacity
									style={styles.declineButton}
									onPress={() => onRespond(invitation, false)}
								>
									<Text style={styles.declineButtonText}>Decline</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.acceptButton}
									onPress={() => onRespond(invitation, true)}
								>
									<Text style={styles.acceptButtonText}>Accept</Text>
								</TouchableOpacity>
							</View>
						</View>
					))
				)}
			</ScrollView>
		</View>
	</Modal>
);

// ============== STYLES ==============

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.background,
		},
		loadingText: {
			marginTop: 16,
			fontSize: 16,
			color: theme.textSecondary,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 16,
			paddingBottom: 12,
		},
		title: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.text,
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		invitationBadge: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
			position: "relative",
		},
		badge: {
			position: "absolute",
			top: -2,
			right: -2,
			backgroundColor: theme.error,
			borderRadius: 10,
			minWidth: 18,
			height: 18,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 2,
			borderColor: theme.background,
		},
		badgeText: {
			color: "#FFF",
			fontSize: 10,
			fontWeight: "700",
		},
		invitationsButton: {
			position: "relative",
			padding: 8,
		},
		invitationsBadge: {
			position: "absolute",
			top: 4,
			right: 4,
			backgroundColor: theme.error,
			borderRadius: 10,
			minWidth: 18,
			height: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		invitationsBadgeText: {
			color: "#FFF",
			fontSize: 11,
			fontWeight: "600",
		},
		// Invitations Card
		invitationsCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.primary + "15",
			marginHorizontal: 16,
			marginBottom: 16,
			padding: 14,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.primary + "30",
		},
		invitationsIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		invitationsContent: {
			flex: 1,
			marginLeft: 12,
		},
		invitationsTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		invitationsSubtitle: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		// Group Cards
		groupCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 16,
		},
		groupCardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		groupInfo: {
			flex: 1,
		},
		groupName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		groupMeta: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 2,
		},
		groupIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		groupCardContent: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		groupStat: {
			alignItems: "center",
		},
		groupStatValue: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		groupStatLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		memberAvatars: {
			flexDirection: "row",
		},
		memberAvatarSmall: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginLeft: -8,
			borderWidth: 2,
			borderColor: theme.surface,
		},
		memberAvatarSmallFirst: {
			marginLeft: 0,
		},
		memberAvatarText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		moreMembers: {
			backgroundColor: theme.textMuted,
		},
		moreMembersText: {
			color: "#FFF",
		},
		// Group List
		groupList: {
			gap: 12,
			paddingHorizontal: 16,
		},
		groupIconContainer: {
			width: 50,
			height: 50,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		groupContent: {
			flex: 1,
			marginLeft: 14,
		},
		groupAmount: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		groupTotal: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		// Empty State
		emptyState: {
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyIcon: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		emptyContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 40,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 4,
			marginBottom: 20,
		},
		emptyText: {
			fontSize: 14,
			color: theme.textSecondary,
			textAlign: "center",
			marginBottom: 24,
		},
		emptyButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: theme.primary,
			paddingVertical: 12,
			paddingHorizontal: 20,
			borderRadius: 12,
		},
		emptyButtonText: {
			color: "#FFF",
			fontWeight: "600",
			fontSize: 15,
		},
		// FAB
		createGroupButton: {
			position: "absolute",
			bottom: 24,
			right: 20,
			backgroundColor: theme.primary,
			width: 56,
			height: 56,
			borderRadius: 28,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: theme.primary,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 6,
		},
		// Detail View
		detailContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		detailHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingTop: 8,
			paddingBottom: 12,
			gap: 12,
		},
		backButton: {
			padding: 4,
		},
		detailHeaderContent: {
			flex: 1,
		},
		detailTitle: {
			fontSize: 22,
			fontWeight: "700",
			color: theme.text,
		},
		detailSubtitle: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		summaryCard: {
			flexDirection: "row",
			marginHorizontal: 16,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
		},
		summaryItem: {
			flex: 1,
			alignItems: "center",
		},
		summaryValue: {
			fontSize: 20,
			fontWeight: "700",
		},
		summaryLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
		},
		summaryDivider: {
			width: 1,
			backgroundColor: theme.border,
			marginHorizontal: 8,
		},
		// Tabs
		tabBar: {
			flexDirection: "row",
			paddingHorizontal: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		tab: {
			flex: 1,
			paddingVertical: 12,
			alignItems: "center",
		},
		tabActive: {
			borderBottomWidth: 2,
			borderBottomColor: theme.primary,
		},
		tabText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		tabTextActive: {
			color: theme.primary,
		},
		detailContent: {
			flex: 1,
			paddingTop: 16,
		},
		section: {
			paddingHorizontal: 16,
			marginBottom: 20,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		// Debts
		debtCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 10,
		},
		debtInfo: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		debtAvatar: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: theme.error + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		debtInitial: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.error,
		},
		debtFlow: {
			flex: 1,
			alignItems: "center",
			paddingHorizontal: 12,
		},
		debtFromName: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.text,
		},
		debtArrow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginVertical: 4,
		},
		debtOwes: {
			fontSize: 11,
			color: theme.textMuted,
		},
		debtAmountText: {
			fontSize: 14,
			fontWeight: "700",
			color: theme.primary,
		},
		debtToName: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.text,
		},
		settleButton: {
			backgroundColor: theme.primary,
			paddingVertical: 8,
			borderRadius: 8,
			alignItems: "center",
		},
		settleButtonText: {
			color: "#FFF",
			fontWeight: "600",
			fontSize: 14,
		},
		allSettledCard: {
			backgroundColor: theme.success + "10",
			borderRadius: 12,
			padding: 24,
			alignItems: "center",
			marginHorizontal: 16,
		},
		allSettledTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.success,
			marginTop: 8,
		},
		allSettledText: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 4,
		},
		// Expenses
		expenseItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		expenseIconContainer: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: theme.primary + "15",
			justifyContent: "center",
			alignItems: "center",
		},
		expenseContent: {
			flex: 1,
			marginLeft: 12,
		},
		expenseDesc: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		expenseMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		expenseAmountText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		expenseCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			marginBottom: 10,
		},
		expenseCardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		expenseCardLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		expenseCardTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		expenseCardMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		expenseCardRight: {
			alignItems: "flex-end",
			// ensure there's room for the delete button positioned absolutely
			paddingRight: 44,
		},
		expenseCardAmount: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		expenseCardDate: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 2,
		},
		expenseCardSplits: {
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		splitsTitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 8,
		},
		splitsList: {
			gap: 6,
		},
		splitItem: {
			flexDirection: "row",
			justifyContent: "space-between",
		},
		splitName: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		splitAmount: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.text,
		},
		deleteExpenseBtn: {
			position: "absolute",
			top: 10,
			right: 10,
			padding: 4,
		},
		emptySection: {
			alignItems: "center",
			padding: 30,
		},
		emptySectionText: {
			fontSize: 16,
			fontWeight: "500",
			color: theme.textSecondary,
			marginTop: 12,
		},
		emptySectionSubtext: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
		},
		// Settlements
		settlementItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		settlementText: {
			flex: 1,
			fontSize: 13,
			color: theme.textSecondary,
		},
		settlementDate: {
			fontSize: 11,
			color: theme.textMuted,
		},
		// Members
		memberCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			marginBottom: 8,
		},
		memberAvatar: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
		},
		memberInitial: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		memberInfo: {
			flex: 1,
			marginLeft: 12,
		},
		memberNameRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		memberName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		youBadge: {
			backgroundColor: theme.primary + "20",
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 4,
		},
		youBadgeText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.primary,
		},
		adminBadge: {
			backgroundColor: theme.warning + "20",
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 4,
		},
		adminBadgeText: {
			fontSize: 10,
			fontWeight: "600",
			color: theme.warning,
		},
		memberBalance: {
			fontSize: 13,
			marginTop: 2,
		},
		addMemberButtons: {
			flexDirection: "row",
			gap: 10,
			marginTop: 12,
		},
		addMemberButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.primary + "15",
			paddingVertical: 12,
			borderRadius: 10,
		},
		addMemberText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
		},
		// FAB Container
		fabContainer: {
			position: "absolute",
			bottom: 20,
			left: 16,
			right: 16,
		},
		fab: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingVertical: 14,
			borderRadius: 14,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.2,
			shadowRadius: 8,
			elevation: 5,
		},
		fabText: {
			color: "#FFF",
			fontSize: 16,
			fontWeight: "600",
		},
		// Modal Styles
		modalContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		modalCancel: {
			fontSize: 16,
			color: theme.textSecondary,
		},
		modalTitle: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.text,
		},
		modalSave: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primary,
		},
		modalContent: {
			flex: 1,
			padding: 16,
		},
		// Form Styles
		formGroup: {
			marginBottom: 20,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		// Type Grid
		typeGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		typeOption: {
			width: "30%",
			alignItems: "center",
			paddingVertical: 14,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
			backgroundColor: theme.surface,
		},
		typeLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 6,
		},
		// Color Grid
		colorGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
		},
		colorOption: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
		},
		colorOptionSelected: {
			borderWidth: 3,
			borderColor: "#FFF",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			elevation: 4,
		},
		// Alert Modal
		alertOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "center",
			alignItems: "center",
			padding: 20,
		},
		alertContainer: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 24,
			width: "100%",
			maxWidth: 340,
		},
		alertTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 8,
		},
		alertMessage: {
			fontSize: 14,
			color: theme.textSecondary,
			marginBottom: 16,
		},
		alertInput: {
			backgroundColor: theme.background,
			borderRadius: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 16,
		},
		alertButtons: {
			flexDirection: "row",
			gap: 10,
		},
		alertButtonCancel: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 10,
			backgroundColor: theme.surfaceLight,
			alignItems: "center",
		},
		alertButtonCancelText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		alertButtonConfirm: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 10,
			backgroundColor: theme.primary,
			alignItems: "center",
		},
		alertButtonConfirmText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#FFF",
		},
		// Search
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 10,
			paddingHorizontal: 12,
			marginBottom: 20,
			borderWidth: 1,
			borderColor: theme.border,
		},
		searchInput: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 10,
			fontSize: 15,
			color: theme.text,
		},
		searchButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
		},
		searchButtonText: {
			color: "#FFF",
			fontSize: 14,
			fontWeight: "600",
		},
		searchResults: {
			gap: 10,
		},
		searchResultItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 12,
		},
		searchResultAvatar: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		searchResultInitial: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primary,
		},
		searchResultInfo: {
			flex: 1,
			marginLeft: 12,
		},
		searchResultName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		searchResultEmail: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		inviteButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
		},
		inviteButtonText: {
			color: "#FFF",
			fontSize: 14,
			fontWeight: "600",
		},
		searchEmpty: {
			alignItems: "center",
			paddingVertical: 50,
		},
		searchEmptyText: {
			fontSize: 16,
			fontWeight: "500",
			color: theme.textSecondary,
			marginTop: 16,
		},
		searchEmptySubtext: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
		},
		// Amount Input
		amountInputContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		currencyPrefix: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.textSecondary,
			paddingLeft: 14,
		},
		amountInput: {
			flex: 1,
			paddingHorizontal: 8,
			paddingVertical: 14,
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
		},
		// Payer Selection
		payerOption: {
			alignItems: "center",
			marginRight: 14,
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 12,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		payerOptionSelected: {
			backgroundColor: theme.primary + "15",
			borderColor: theme.primary,
		},
		payerAvatar: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.surfaceLight,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 6,
		},
		payerAvatarSelected: {
			backgroundColor: theme.primary + "30",
		},
		payerInitial: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		payerInitialSelected: {
			color: theme.primary,
		},
		payerName: {
			fontSize: 12,
			color: theme.textSecondary,
		},
		payerNameSelected: {
			color: theme.primary,
			fontWeight: "600",
		},
		// Category Grid
		categoryGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		categoryOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 12,
			paddingVertical: 10,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
			backgroundColor: theme.surface,
			gap: 6,
		},
		categoryLabel: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		// Split Type
		splitTypeRow: {
			flexDirection: "row",
			gap: 10,
		},
		splitTypeOption: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 10,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			alignItems: "center",
		},
		splitTypeOptionSelected: {
			backgroundColor: theme.primary + "15",
			borderColor: theme.primary,
		},
		splitTypeText: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		splitTypeTextSelected: {
			color: theme.primary,
			fontWeight: "600",
		},
		// Split Preview
		splitPreview: {
			backgroundColor: theme.surface,
			borderRadius: 10,
			padding: 14,
			marginTop: 12,
		},
		splitPreviewTitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 10,
		},
		splitPreviewRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingVertical: 6,
		},
		splitPreviewName: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		splitPreviewAmount: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		// Custom Splits
		customSplits: {
			marginTop: 12,
		},
		customSplitsTitle: {
			fontSize: 12,
			color: theme.textMuted,
			marginBottom: 10,
		},
		customSplitRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 10,
		},
		customSplitName: {
			flex: 1,
			fontSize: 14,
			color: theme.text,
		},
		customSplitInput: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: theme.border,
			paddingHorizontal: 10,
			width: 120,
		},
		customSplitCurrency: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		customSplitField: {
			flex: 1,
			paddingVertical: 10,
			paddingHorizontal: 6,
			fontSize: 14,
			color: theme.text,
			textAlign: "right",
		},
		// Member Select
		memberSelectList: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		memberSelectOption: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		memberSelectOptionSelected: {
			backgroundColor: theme.primary + "15",
			borderColor: theme.primary,
		},
		memberSelectText: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		memberSelectTextSelected: {
			color: theme.primary,
			fontWeight: "600",
		},
		// Invitations
		emptyInvitations: {
			alignItems: "center",
			paddingVertical: 50,
		},
		emptyInvitationsText: {
			fontSize: 16,
			color: theme.textSecondary,
			marginTop: 12,
		},
		invitationCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
		},
		invitationInfo: {
			marginBottom: 12,
		},
		invitationGroupName: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		invitationInvitedBy: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 4,
		},
		invitationExpiry: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		invitationActions: {
			flexDirection: "row",
			gap: 10,
		},
		declineButton: {
			flex: 1,
			paddingVertical: 10,
			borderRadius: 8,
			backgroundColor: theme.surfaceLight,
			alignItems: "center",
		},
		declineButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		acceptButton: {
			flex: 1,
			paddingVertical: 10,
			borderRadius: 8,
			backgroundColor: theme.primary,
			alignItems: "center",
		},
		acceptButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFF",
		},
	});

export default SplitWiseNew;
