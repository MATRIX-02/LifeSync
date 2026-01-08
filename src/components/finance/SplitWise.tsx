// SplitWise - Group expense splitting
// Redesigned with cleaner, more intuitive UI

import { Alert } from "@/src/components/CustomAlert";
import { useAuthStore } from "@/src/context/authStore";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme } from "@/src/context/themeContext";
import { GroupMember, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

type SplitMethod = "equal" | "exact" | "percentage" | "shares";

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

type DetailTab = "overview" | "expenses" | "members";

export default function SplitWise({
	theme,
	currency,
	onOpenDrawer,
}: SplitWiseProps) {
	const { profile } = useAuthStore();
	const {
		splitGroups,
		addSplitGroup,
		deleteSplitGroup,
		addGroupMember,
		removeGroupMember,
		addSplitExpense,
		deleteSplitExpense,
		addSettlement,
		getGroupBalances,
	} = useFinanceStore();

	const styles = createStyles(theme);

	// State
	const [selectedGroup, setSelectedGroup] = useState<SplitGroup | null>(null);
	const [detailTab, setDetailTab] = useState<DetailTab>("overview");

	// Modals
	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [showAddMember, setShowAddMember] = useState(false);
	const [showAddExpense, setShowAddExpense] = useState(false);
	const [showSettlement, setShowSettlement] = useState(false);

	// Forms
	const [groupForm, setGroupForm] = useState({
		name: "",
		icon: "people",
		color: COLORS[0],
	});
	const [memberName, setMemberName] = useState("");
	const [expenseForm, setExpenseForm] = useState({
		description: "",
		amount: "",
		paidBy: "",
		splitMethod: "equal" as SplitMethod,
		splitAmong: [] as string[],
		customSplits: {} as Record<string, string>,
	});
	const [settlementForm, setSettlementForm] = useState({
		from: "",
		to: "",
		amount: "",
	});

	const formatAmount = (value: number) => {
		return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
	};

	// Handlers
	const handleCreateGroup = () => {
		if (!groupForm.name.trim()) {
			Alert.alert("Error", "Please enter a group name");
			return;
		}
		addSplitGroup({
			name: groupForm.name.trim(),
			icon: groupForm.icon,
			color: groupForm.color,
			members: [],
			createdBy: profile?.id || "",
			description: "",
		});
		setGroupForm({ name: "", icon: "people", color: COLORS[0] });
		setShowCreateGroup(false);
	};

	const handleAddMember = () => {
		if (!memberName.trim() || !selectedGroup) return;
		addGroupMember(selectedGroup.id, memberName.trim());
		setMemberName("");
		setShowAddMember(false);
		refreshSelectedGroup();
	};

	const handleAddExpense = () => {
		if (
			!selectedGroup ||
			!expenseForm.description ||
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

		const splitAmong =
			expenseForm.splitAmong.length > 0
				? expenseForm.splitAmong
				: (selectedGroup.members || []).map((m) => m.id);

		let splits: { memberId: string; amount: number }[] = [];

		if (expenseForm.splitMethod === "equal") {
			const perPerson = amount / splitAmong.length;
			splits = splitAmong.map((id) => ({ memberId: id, amount: perPerson }));
		} else if (expenseForm.splitMethod === "exact") {
			splits = splitAmong.map((id) => ({
				memberId: id,
				amount: parseFloat(expenseForm.customSplits[id] || "0"),
			}));
		} else if (expenseForm.splitMethod === "percentage") {
			splits = splitAmong.map((id) => ({
				memberId: id,
				amount:
					(parseFloat(expenseForm.customSplits[id] || "0") / 100) * amount,
			}));
		} else if (expenseForm.splitMethod === "shares") {
			const totalShares = splitAmong.reduce(
				(sum, id) => sum + parseFloat(expenseForm.customSplits[id] || "1"),
				0
			);
			splits = splitAmong.map((id) => ({
				memberId: id,
				amount:
					(parseFloat(expenseForm.customSplits[id] || "1") / totalShares) *
					amount,
			}));
		}

		addSplitExpense(selectedGroup.id, {
			description: expenseForm.description,
			amount,
			paidBy: expenseForm.paidBy,
			splitMethod: expenseForm.splitMethod,
			splits,
		});

		setExpenseForm({
			description: "",
			amount: "",
			paidBy: "",
			splitMethod: "equal",
			splitAmong: [],
			customSplits: {},
		});
		setShowAddExpense(false);
		refreshSelectedGroup();
	};

	const handleSettlement = () => {
		if (
			!selectedGroup ||
			!settlementForm.from ||
			!settlementForm.to ||
			!settlementForm.amount
		) {
			Alert.alert("Error", "Please fill all fields");
			return;
		}
		addSettlement(selectedGroup.id, {
			fromMember: settlementForm.from,
			toMember: settlementForm.to,
			amount: parseFloat(settlementForm.amount),
		});
		setSettlementForm({ from: "", to: "", amount: "" });
		setShowSettlement(false);
		refreshSelectedGroup();
	};

	const refreshSelectedGroup = () => {
		if (!selectedGroup) return;
		const updated = splitGroups.find((g) => g.id === selectedGroup.id);
		if (updated) {
			setSelectedGroup({
				...updated,
				expenses: updated.expenses || [],
				members: updated.members || [],
				settlements: updated.settlements || [],
			});
		}
	};

	const selectGroup = (group: SplitGroup) => {
		setSelectedGroup({
			...group,
			expenses: group.expenses || [],
			members: group.members || [],
			settlements: group.settlements || [],
		});
		setDetailTab("overview");
	};

	// Calculate balances and debts
	const calculateDebts = () => {
		if (!selectedGroup) return [];
		const balances = getGroupBalances(selectedGroup.id);
		const members = selectedGroup.members || [];
		const positiveBalances = balances.filter((b) => b.balance > 0.01);
		const negativeBalances = balances.filter((b) => b.balance < -0.01);

		const debts: { from: GroupMember; to: GroupMember; amount: number }[] = [];
		const positiveCopy = positiveBalances.map((b) => ({ ...b }));
		const negativeCopy = negativeBalances.map((b) => ({
			...b,
			balance: Math.abs(b.balance),
		}));

		for (const debtor of negativeCopy) {
			for (const creditor of positiveCopy) {
				if (debtor.balance <= 0.01 || creditor.balance <= 0.01) continue;
				const amount = Math.min(debtor.balance, creditor.balance);
				const fromMember = members.find((m) => m.id === debtor.memberId);
				const toMember = members.find((m) => m.id === creditor.memberId);
				if (fromMember && toMember) {
					debts.push({ from: fromMember, to: toMember, amount });
				}
				debtor.balance -= amount;
				creditor.balance -= amount;
			}
		}

		return debts;
	};

	// Render Group List
	const renderGroupList = () => (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<View style={styles.header}>
				<Text style={styles.title}>Split Expenses</Text>
				<TouchableOpacity
					style={styles.createButton}
					onPress={() => setShowCreateGroup(true)}
				>
					<Ionicons name="add" size={20} color="#FFF" />
				</TouchableOpacity>
			</View>

			{splitGroups.length === 0 ? (
				<View style={styles.emptyState}>
					<View style={styles.emptyIcon}>
						<Ionicons name="people-outline" size={48} color={theme.textMuted} />
					</View>
					<Text style={styles.emptyTitle}>No Groups Yet</Text>
					<Text style={styles.emptySubtitle}>
						Create a group to split expenses with friends
					</Text>
					<TouchableOpacity
						style={styles.emptyButton}
						onPress={() => setShowCreateGroup(true)}
					>
						<Ionicons name="add" size={18} color="#FFF" />
						<Text style={styles.emptyButtonText}>Create Group</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.groupList}>
					{splitGroups.map((group) => {
						const expenses = group.expenses || [];
						const members = group.members || [];
						const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

						return (
							<TouchableOpacity
								key={group.id}
								style={styles.groupCard}
								onPress={() => selectGroup(group)}
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
										size={24}
										color={group.color}
									/>
								</View>
								<View style={styles.groupContent}>
									<Text style={styles.groupName}>{group.name}</Text>
									<Text style={styles.groupMeta}>
										{members.length}{" "}
										{members.length === 1 ? "member" : "members"} •{" "}
										{expenses.length}{" "}
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
		</ScrollView>
	);

	// Render Group Detail
	const renderGroupDetail = () => {
		if (!selectedGroup) return null;

		const members = selectedGroup.members || [];
		const expenses = selectedGroup.expenses || [];
		const settlements = selectedGroup.settlements || [];
		const balances = getGroupBalances(selectedGroup.id);
		const debts = calculateDebts();
		const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
		const perPerson = members.length > 0 ? totalSpent / members.length : 0;

		return (
			<View style={styles.detailContainer}>
				{/* Header */}
				<View style={styles.detailHeader}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => setSelectedGroup(null)}
					>
						<Ionicons name="arrow-back" size={24} color={theme.text} />
					</TouchableOpacity>
					<View style={styles.detailHeaderContent}>
						<Text style={styles.detailTitle}>{selectedGroup.name}</Text>
					</View>
					<TouchableOpacity
						onPress={() => {
							Alert.alert(
								"Delete Group",
								"Are you sure you want to delete this group?",
								[
									{ text: "Cancel", style: "cancel" },
									{
										text: "Delete",
										style: "destructive",
										onPress: () => {
											deleteSplitGroup(selectedGroup.id);
											setSelectedGroup(null);
										},
									},
								]
							);
						}}
					>
						<Ionicons name="trash-outline" size={22} color={theme.error} />
					</TouchableOpacity>
				</View>

				{/* Summary Card */}
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: selectedGroup.color + "15" },
					]}
				>
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: selectedGroup.color }]}>
							{currency}
							{formatAmount(totalSpent)}
						</Text>
						<Text style={styles.summaryLabel}>Total Spent</Text>
					</View>
					<View style={styles.summaryDivider} />
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: selectedGroup.color }]}>
							{currency}
							{formatAmount(perPerson)}
						</Text>
						<Text style={styles.summaryLabel}>Per Person</Text>
					</View>
					<View style={styles.summaryDivider} />
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: selectedGroup.color }]}>
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
														{debt.from.name.charAt(0).toUpperCase()}
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
														style={[
															styles.debtInitial,
															{ color: theme.success },
														]}
													>
														{debt.to.name.charAt(0).toUpperCase()}
													</Text>
												</View>
											</View>
											<TouchableOpacity
												style={styles.settleButton}
												onPress={() => {
													setSettlementForm({
														from: debt.from.id,
														to: debt.to.id,
														amount: debt.amount.toFixed(2),
													});
													setShowSettlement(true);
												}}
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

							{/* Recent Activity */}
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
											const payer = members.find(
												(m) => m.id === expense.paidBy
											);
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
								</View>
							) : (
								expenses
									.sort(
										(a, b) =>
											new Date(b.date).getTime() - new Date(a.date).getTime()
									)
									.map((expense) => {
										const payer = members.find((m) => m.id === expense.paidBy);
										return (
											<View key={expense.id} style={styles.expenseCard}>
												<View style={styles.expenseCardHeader}>
													<View style={styles.expenseCardLeft}>
														<View style={styles.expenseIconContainer}>
															<Ionicons
																name="receipt"
																size={18}
																color={theme.primary}
															/>
														</View>
														<View>
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
												<TouchableOpacity
													style={styles.deleteExpenseBtn}
													onPress={() => {
														Alert.alert("Delete", "Delete this expense?", [
															{ text: "Cancel", style: "cancel" },
															{
																text: "Delete",
																style: "destructive",
																onPress: () => {
																	deleteSplitExpense(
																		selectedGroup.id,
																		expense.id
																	);
																	refreshSelectedGroup();
																},
															},
														]);
													}}
												>
													<Ionicons
														name="trash-outline"
														size={16}
														color={theme.error}
													/>
												</TouchableOpacity>
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
										<View style={styles.memberAvatar}>
											<Text style={styles.memberInitial}>
												{member.name.charAt(0).toUpperCase()}
											</Text>
										</View>
										<View style={styles.memberInfo}>
											<Text style={styles.memberName}>{member.name}</Text>
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
													? `Gets back ${currency}${formatAmount(
															balanceAmount
													  )}`
													: balanceAmount < -0.01
													? `Owes ${currency}${formatAmount(
															Math.abs(balanceAmount)
													  )}`
													: "All settled"}
											</Text>
										</View>
										<TouchableOpacity
											onPress={() => {
												Alert.alert("Remove Member", `Remove ${member.name}?`, [
													{ text: "Cancel", style: "cancel" },
													{
														text: "Remove",
														style: "destructive",
														onPress: () => {
															removeGroupMember(selectedGroup.id, member.id);
															refreshSelectedGroup();
														},
													},
												]);
											}}
										>
											<Ionicons
												name="close-circle"
												size={22}
												color={theme.textMuted}
											/>
										</TouchableOpacity>
									</View>
								);
							})}

							<TouchableOpacity
								style={styles.addMemberButton}
								onPress={() => setShowAddMember(true)}
							>
								<Ionicons name="person-add" size={18} color={theme.primary} />
								<Text style={styles.addMemberText}>Add Member</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Settlements History */}
					{settlements.length > 0 && detailTab === "overview" && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Settlement History</Text>
							{settlements.map((settlement) => {
								const from = members.find(
									(m) => m.id === settlement.fromMemberId
								);
								const to = members.find((m) => m.id === settlement.toMemberId);
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

					<View style={{ height: 100 }} />
				</ScrollView>

				{/* Floating Action Buttons */}
				<View style={styles.fabContainer}>
					<TouchableOpacity
						style={[styles.fab, { backgroundColor: theme.primary }]}
						onPress={() => {
							if (members.length === 0) {
								Alert.alert(
									"Add Members First",
									"Please add members before adding expenses"
								);
								return;
							}
							setExpenseForm({
								...expenseForm,
								splitAmong: members.map((m) => m.id),
							});
							setShowAddExpense(true);
						}}
					>
						<Ionicons name="add" size={22} color="#FFF" />
						<Text style={styles.fabText}>Add Expense</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<View style={styles.mainContainer}>
			{selectedGroup ? renderGroupDetail() : renderGroupList()}

			{/* Create Group Modal */}
			<Modal visible={showCreateGroup} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Create Group</Text>
							<TouchableOpacity onPress={() => setShowCreateGroup(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Group Name</Text>
							<TextInput
								style={styles.input}
								value={groupForm.name}
								onChangeText={(t) => setGroupForm({ ...groupForm, name: t })}
								placeholder="e.g. Trip to Goa, Roommates"
								placeholderTextColor={theme.textMuted}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Icon</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<View style={styles.optionRow}>
									{GROUP_ICONS.map((icon) => (
										<TouchableOpacity
											key={icon}
											style={[
												styles.iconOption,
												groupForm.icon === icon && {
													backgroundColor: groupForm.color + "20",
													borderColor: groupForm.color,
												},
											]}
											onPress={() => setGroupForm({ ...groupForm, icon })}
										>
											<Ionicons
												name={icon as any}
												size={22}
												color={
													groupForm.icon === icon
														? groupForm.color
														: theme.textMuted
												}
											/>
										</TouchableOpacity>
									))}
								</View>
							</ScrollView>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Color</Text>
							<View style={styles.colorRow}>
								{COLORS.map((color) => (
									<TouchableOpacity
										key={color}
										style={[
											styles.colorOption,
											{ backgroundColor: color },
											groupForm.color === color && styles.colorSelected,
										]}
										onPress={() => setGroupForm({ ...groupForm, color })}
									>
										{groupForm.color === color && (
											<Ionicons name="checkmark" size={16} color="#FFF" />
										)}
									</TouchableOpacity>
								))}
							</View>
						</View>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleCreateGroup}
						>
							<Text style={styles.submitButtonText}>Create Group</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Member Modal */}
			<Modal visible={showAddMember} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Member</Text>
							<TouchableOpacity onPress={() => setShowAddMember(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Name</Text>
							<TextInput
								style={styles.input}
								value={memberName}
								onChangeText={setMemberName}
								placeholder="Enter member name"
								placeholderTextColor={theme.textMuted}
								autoFocus
							/>
						</View>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddMember}
						>
							<Text style={styles.submitButtonText}>Add Member</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Expense Modal */}
			<Modal visible={showAddExpense} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<ScrollView
						style={styles.modalScrollContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Expense</Text>
							<TouchableOpacity onPress={() => setShowAddExpense(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Description</Text>
							<TextInput
								style={styles.input}
								value={expenseForm.description}
								onChangeText={(t) =>
									setExpenseForm({ ...expenseForm, description: t })
								}
								placeholder="What was it for?"
								placeholderTextColor={theme.textMuted}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Amount</Text>
							<TextInput
								style={styles.input}
								value={expenseForm.amount}
								onChangeText={(t) =>
									setExpenseForm({ ...expenseForm, amount: t })
								}
								placeholder="0"
								placeholderTextColor={theme.textMuted}
								keyboardType="numeric"
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Paid By</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<View style={styles.optionRow}>
									{(selectedGroup?.members || []).map((member) => (
										<TouchableOpacity
											key={member.id}
											style={[
												styles.memberChip,
												expenseForm.paidBy === member.id &&
													styles.memberChipSelected,
											]}
											onPress={() =>
												setExpenseForm({ ...expenseForm, paidBy: member.id })
											}
										>
											<Text
												style={[
													styles.memberChipText,
													expenseForm.paidBy === member.id &&
														styles.memberChipTextSelected,
												]}
											>
												{member.name}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</ScrollView>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Split Method</Text>
							<View style={styles.splitMethodRow}>
								{(
									["equal", "exact", "percentage", "shares"] as SplitMethod[]
								).map((method) => (
									<TouchableOpacity
										key={method}
										style={[
											styles.splitMethodChip,
											expenseForm.splitMethod === method &&
												styles.splitMethodChipSelected,
										]}
										onPress={() =>
											setExpenseForm({ ...expenseForm, splitMethod: method })
										}
									>
										<Text
											style={[
												styles.splitMethodChipText,
												expenseForm.splitMethod === method &&
													styles.splitMethodChipTextSelected,
											]}
										>
											{method.charAt(0).toUpperCase() + method.slice(1)}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Split Among</Text>
							{(selectedGroup?.members || []).map((member) => {
								const isSelected = expenseForm.splitAmong.includes(member.id);
								return (
									<View key={member.id} style={styles.splitAmongRow}>
										<TouchableOpacity
											style={[
												styles.checkbox,
												isSelected && styles.checkboxSelected,
											]}
											onPress={() => {
												const updated = isSelected
													? expenseForm.splitAmong.filter(
															(id) => id !== member.id
													  )
													: [...expenseForm.splitAmong, member.id];
												setExpenseForm({ ...expenseForm, splitAmong: updated });
											}}
										>
											{isSelected && (
												<Ionicons name="checkmark" size={14} color="#FFF" />
											)}
										</TouchableOpacity>
										<Text style={styles.splitAmongName}>{member.name}</Text>
										{expenseForm.splitMethod !== "equal" && isSelected && (
											<TextInput
												style={styles.splitInput}
												value={expenseForm.customSplits[member.id] || ""}
												onChangeText={(t) =>
													setExpenseForm({
														...expenseForm,
														customSplits: {
															...expenseForm.customSplits,
															[member.id]: t,
														},
													})
												}
												placeholder={
													expenseForm.splitMethod === "percentage"
														? "%"
														: expenseForm.splitMethod === "shares"
														? "shares"
														: currency
												}
												placeholderTextColor={theme.textMuted}
												keyboardType="numeric"
											/>
										)}
									</View>
								);
							})}
						</View>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddExpense}
						>
							<Text style={styles.submitButtonText}>Add Expense</Text>
						</TouchableOpacity>

						<View style={{ height: 40 }} />
					</ScrollView>
				</View>
			</Modal>

			{/* Settlement Modal */}
			<Modal visible={showSettlement} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Record Settlement</Text>
							<TouchableOpacity onPress={() => setShowSettlement(false)}>
								<Ionicons name="close" size={24} color={theme.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>From</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<View style={styles.optionRow}>
									{(selectedGroup?.members || []).map((member) => (
										<TouchableOpacity
											key={member.id}
											style={[
												styles.memberChip,
												settlementForm.from === member.id &&
													styles.memberChipSelected,
											]}
											onPress={() =>
												setSettlementForm({
													...settlementForm,
													from: member.id,
												})
											}
										>
											<Text
												style={[
													styles.memberChipText,
													settlementForm.from === member.id &&
														styles.memberChipTextSelected,
												]}
											>
												{member.name}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</ScrollView>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>To</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								<View style={styles.optionRow}>
									{(selectedGroup?.members || [])
										.filter((m) => m.id !== settlementForm.from)
										.map((member) => (
											<TouchableOpacity
												key={member.id}
												style={[
													styles.memberChip,
													settlementForm.to === member.id &&
														styles.memberChipSelected,
												]}
												onPress={() =>
													setSettlementForm({
														...settlementForm,
														to: member.id,
													})
												}
											>
												<Text
													style={[
														styles.memberChipText,
														settlementForm.to === member.id &&
															styles.memberChipTextSelected,
													]}
												>
													{member.name}
												</Text>
											</TouchableOpacity>
										))}
								</View>
							</ScrollView>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Amount</Text>
							<TextInput
								style={styles.input}
								value={settlementForm.amount}
								onChangeText={(t) =>
									setSettlementForm({ ...settlementForm, amount: t })
								}
								placeholder="0"
								placeholderTextColor={theme.textMuted}
								keyboardType="numeric"
							/>
						</View>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleSettlement}
						>
							<Text style={styles.submitButtonText}>Record Settlement</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		mainContainer: {
			flex: 1,
			backgroundColor: theme.background,
		},
		container: {
			flex: 1,
			padding: 16,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		title: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
		},
		createButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.primary,
			justifyContent: "center",
			alignItems: "center",
		},
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
			fontSize: 15,
			fontWeight: "600",
			color: "#FFF",
		},
		groupList: {
			gap: 12,
		},
		groupCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 16,
			borderRadius: 16,
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
		detailContainer: {
			flex: 1,
		},
		detailHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		backButton: {
			padding: 4,
		},
		detailHeaderContent: {
			flex: 1,
			marginLeft: 12,
		},
		detailTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		summaryCard: {
			flexDirection: "row",
			margin: 16,
			borderRadius: 16,
			padding: 16,
		},
		summaryItem: {
			flex: 1,
			alignItems: "center",
		},
		summaryDivider: {
			width: 1,
			backgroundColor: theme.border,
		},
		summaryValue: {
			fontSize: 20,
			fontWeight: "700",
		},
		summaryLabel: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 4,
		},
		tabBar: {
			flexDirection: "row",
			marginHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
		},
		tab: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 8,
		},
		tabActive: {
			backgroundColor: theme.primary,
		},
		tabText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		tabTextActive: {
			color: "#FFF",
		},
		detailContent: {
			flex: 1,
		},
		section: {
			paddingHorizontal: 16,
			paddingTop: 20,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 12,
		},
		debtCard: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 10,
		},
		debtInfo: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		debtAvatar: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.error + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		debtInitial: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.error,
		},
		debtFlow: {
			flex: 1,
			alignItems: "center",
			paddingHorizontal: 8,
		},
		debtFromName: {
			fontSize: 14,
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
			fontSize: 12,
			color: theme.textMuted,
		},
		debtAmountText: {
			fontSize: 15,
			fontWeight: "700",
			color: theme.primary,
		},
		debtToName: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		settleButton: {
			backgroundColor: theme.success,
			paddingVertical: 10,
			borderRadius: 8,
			alignItems: "center",
			marginTop: 12,
		},
		settleButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#FFF",
		},
		allSettledCard: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 32,
			alignItems: "center",
			marginHorizontal: 16,
			marginTop: 16,
		},
		allSettledTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.success,
			marginTop: 12,
		},
		allSettledText: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 4,
		},
		expenseItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			marginBottom: 8,
		},
		expenseIconContainer: {
			width: 38,
			height: 38,
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
			fontSize: 15,
			fontWeight: "500",
			color: theme.text,
		},
		expenseMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		expenseAmountText: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
		},
		expenseCard: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 16,
			marginBottom: 12,
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
			marginLeft: 12,
		},
		expenseCardMeta: {
			fontSize: 12,
			color: theme.textMuted,
			marginLeft: 12,
			marginTop: 2,
		},
		expenseCardRight: {
			alignItems: "flex-end",
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
			marginTop: 14,
			paddingTop: 14,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		splitsTitle: {
			fontSize: 12,
			fontWeight: "600",
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
			fontSize: 14,
			color: theme.text,
		},
		splitAmount: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		deleteExpenseBtn: {
			position: "absolute",
			top: 16,
			right: 16,
		},
		emptySection: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptySectionText: {
			fontSize: 14,
			color: theme.textMuted,
			marginTop: 8,
		},
		memberCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			marginBottom: 10,
		},
		memberAvatar: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.primary + "20",
			justifyContent: "center",
			alignItems: "center",
		},
		memberInitial: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.primary,
		},
		memberInfo: {
			flex: 1,
			marginLeft: 12,
		},
		memberName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
		},
		memberBalance: {
			fontSize: 13,
			marginTop: 2,
		},
		addMemberButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: theme.primary + "15",
			paddingVertical: 14,
			borderRadius: 12,
			marginTop: 8,
		},
		addMemberText: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.primary,
		},
		settlementItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			backgroundColor: theme.surface,
			padding: 12,
			borderRadius: 10,
			marginBottom: 8,
		},
		settlementText: {
			flex: 1,
			fontSize: 14,
			color: theme.text,
		},
		settlementDate: {
			fontSize: 12,
			color: theme.textMuted,
		},
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
			paddingVertical: 16,
			borderRadius: 14,
		},
		fabText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
		},
		modalScrollContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			maxHeight: "85%",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		formGroup: {
			marginBottom: 16,
		},
		label: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 15,
			color: theme.text,
		},
		optionRow: {
			flexDirection: "row",
			gap: 8,
		},
		iconOption: {
			width: 48,
			height: 48,
			borderRadius: 12,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 1,
			borderColor: theme.border,
		},
		colorRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		colorOption: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
		},
		colorSelected: {
			borderWidth: 3,
			borderColor: "#FFF",
		},
		memberChip: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		memberChipSelected: {
			backgroundColor: theme.primary + "20",
			borderColor: theme.primary,
		},
		memberChipText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.text,
		},
		memberChipTextSelected: {
			color: theme.primary,
		},
		splitMethodRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		splitMethodChip: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		splitMethodChipSelected: {
			backgroundColor: theme.primary + "20",
			borderColor: theme.primary,
		},
		splitMethodChipText: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textMuted,
		},
		splitMethodChipTextSelected: {
			color: theme.primary,
		},
		splitAmongRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			marginBottom: 12,
		},
		checkbox: {
			width: 24,
			height: 24,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: theme.border,
			justifyContent: "center",
			alignItems: "center",
		},
		checkboxSelected: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		splitAmongName: {
			flex: 1,
			fontSize: 15,
			color: theme.text,
		},
		splitInput: {
			width: 80,
			backgroundColor: theme.surface,
			borderRadius: 8,
			padding: 10,
			fontSize: 14,
			color: theme.text,
			textAlign: "right",
		},
		submitButton: {
			backgroundColor: theme.primary,
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 8,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
	});
