import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { GroupMember, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { DetailTab } from "./constants";

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

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
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
	// Group members can't see each other's custom categories, so unknown keys
	// fall back to "Other" via getInfo.
	const categories = useFinanceCategories();
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
											new Date(b.date).getTime() - new Date(a.date).getTime(),
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
										(m) => m.id === settlement.fromMemberId,
									);
									const to = members.find(
										(m) => m.id === settlement.toMemberId,
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
										new Date(b.date).getTime() - new Date(a.date).getTime(),
								)
								.map((expense) => {
									const payer = members.find((m) => m.id === expense.paidBy);
									const categoryInfo = categories.getInfo(
										"expense",
										expense.category,
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
														{expense.amount.toLocaleString("en-IN", {
															minimumFractionDigits: 0,
															maximumFractionDigits: 2,
														})}
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
															(m) => m.id === split.memberId,
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
															Math.abs(balanceAmount),
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
