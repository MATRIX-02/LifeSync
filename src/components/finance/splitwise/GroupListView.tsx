import { Theme } from "@/src/context/themeContext";
import { GroupInvitation, SplitGroup } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

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

export const GroupListView: React.FC<GroupListViewProps> = ({
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
