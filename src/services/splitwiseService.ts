// SplitWise Service - Cloud-based group expense splitting with real user support

import { supabase } from "@/src/config/supabase";
import {
	GroupInvitation,
	GroupMember,
	Settlement,
	SplitExpense,
	SplitGroup,
} from "@/src/types/finance";
import { NotificationService } from "./notificationService";

// ============== HELPER FUNCTIONS ==============

// Generate RFC4122 v4 UUID string
const generateId = (): string => {
	// Lightweight UUIDv4 generator using Math.random().
	// This produces a UUID string acceptable to Postgres `uuid` columns.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

// Convert camelCase to snake_case
const toSnakeCase = (str: string) =>
	str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const objectToSnakeCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
	if (typeof obj !== "object") return obj;

	return Object.keys(obj).reduce((acc, key) => {
		const snakeKey = toSnakeCase(key);
		acc[snakeKey] = objectToSnakeCase(obj[key]);
		return acc;
	}, {} as any);
};

// Convert snake_case to camelCase
const toCamelCase = (str: string) =>
	str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const objectToCamelCase = (obj: any): any => {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(objectToCamelCase);
	if (typeof obj !== "object") return obj;

	return Object.keys(obj).reduce((acc, key) => {
		const camelKey = toCamelCase(key);
		acc[camelKey] = objectToCamelCase(obj[key]);
		return acc;
	}, {} as any);
};

// ============== GROUP OPERATIONS ==============

export const createSplitGroup = async (
	userId: string,
	userName: string,
	groupData: {
		name: string;
		description?: string;
		color: string;
		icon: string;
	}
): Promise<{ data: SplitGroup | null; error: string | null }> => {
	try {
		const now = new Date().toISOString();

		// Create the creator as the first member (client-generated uuid for member id)
		const creatorMember: GroupMember = {
			id: generateId(),
			name: userName,
			userId: userId,
			isCurrentUser: true,
			role: "admin",
			joinedAt: now,
		};

		// Save to Supabase and let the DB generate the group `id` (uses default gen_random_uuid())
		const { data: insertedGroup, error: insertError } = await (
			supabase.from("split_groups") as any
		)
			.insert({
				// omit `id` so Postgres uses the column default (gen_random_uuid())
				user_id: userId,
				name: groupData.name,
				description: groupData.description,
				color: groupData.color,
				icon: groupData.icon,
				members: JSON.stringify([creatorMember]),
				expenses: JSON.stringify([]),
				settlements: JSON.stringify([]),
				total_expenses: 0,
				created_at: now,
				updated_at: now,
				is_archived: false,
			})
			.select()
			.maybeSingle();

		if (insertError || !insertedGroup)
			throw insertError || new Error("Failed to insert group");

		const dbGroupId: string = insertedGroup.id;

		// Also add to group_members table for multi-user access; let DB generate its PK id
		const { error: memberInsertError } = await (
			supabase.from("split_group_members") as any
		).insert({
			id: generateId(),
			group_id: dbGroupId,
			user_id: userId,
			member_id: creatorMember.id,
			role: "admin",
			joined_at: now,
		});

		if (memberInsertError) throw memberInsertError;

		const newGroup: SplitGroup = {
			id: dbGroupId,
			name: groupData.name,
			description: groupData.description,
			color: groupData.color,
			icon: groupData.icon,
			members: [creatorMember],
			expenses: [],
			settlements: [],
			totalExpenses: 0,
			createdBy: userId,
			createdAt: now,
			updatedAt: now,
			isArchived: false,
		};

		return { data: newGroup, error: null };
	} catch (error: any) {
		console.error("Error creating split group:", error);
		return { data: null, error: error.message };
	}
};

export const updateSplitGroup = async (
	groupId: string,
	updates: Partial<SplitGroup>
): Promise<{ error: string | null }> => {
	try {
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};

		if (updates.name) updateData.name = updates.name;
		if (updates.description !== undefined)
			updateData.description = updates.description;
		if (updates.color) updateData.color = updates.color;
		if (updates.icon) updateData.icon = updates.icon;
		if (updates.members) updateData.members = JSON.stringify(updates.members);
		if (updates.expenses)
			updateData.expenses = JSON.stringify(updates.expenses);
		if (updates.settlements)
			updateData.settlements = JSON.stringify(updates.settlements);
		if (updates.totalExpenses !== undefined)
			updateData.total_expenses = updates.totalExpenses;
		if (updates.isArchived !== undefined)
			updateData.is_archived = updates.isArchived;

		const { error } = await (supabase.from("split_groups") as any)
			.update(updateData)
			.eq("id", groupId);

		if (error) throw error;
		return { error: null };
	} catch (error: any) {
		console.error("Error updating split group:", error);
		return { error: error.message };
	}
};

export const deleteSplitGroup = async (
	groupId: string
): Promise<{ error: string | null }> => {
	try {
		// Attempt to cancel any scheduled local notifications related to this group
		try {
			await NotificationService.cancelGroupNotifications(groupId);
		} catch (nErr) {
			console.warn("Failed to cancel group notifications:", nErr);
		}
		// Delete group members first
		await (supabase.from("split_group_members") as any)
			.delete()
			.eq("group_id", groupId);

		// Delete invitations
		await (supabase.from("split_group_invitations") as any)
			.delete()
			.eq("group_id", groupId);

		// Delete the group
		const { error } = await (supabase.from("split_groups") as any)
			.delete()
			.eq("id", groupId);

		if (error) throw error;
		return { error: null };
	} catch (error: any) {
		console.error("Error deleting split group:", error);
		return { error: error.message };
	}
};

export const fetchUserGroups = async (
	userId: string
): Promise<{ data: SplitGroup[]; error: string | null }> => {
	try {
		// Fetch groups where user is a member
		const { data: membershipData, error: membershipError } = await (
			supabase.from("split_group_members") as any
		)
			.select("group_id")
			.eq("user_id", userId);

		if (membershipError) throw membershipError;

		const groupIds = (membershipData || []).map((m: any) => m.group_id);

		// Ensure we only pass valid UUIDs to Postgres. Older records may have
		// non-UUID IDs (timestamp_based) from earlier versions of the app.
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		const validGroupIds = groupIds.filter((id: string) => uuidRegex.test(id));
		const invalidGroupIds = groupIds.filter(
			(id: string) => !uuidRegex.test(id)
		);

		if (invalidGroupIds.length > 0) {
			console.warn("Ignoring invalid group IDs (non-UUID):", invalidGroupIds);
		}

		if (validGroupIds.length === 0) {
			return { data: [], error: null };
		}

		// Fetch group details
		const { data: groupsData, error: groupsError } = await (
			supabase.from("split_groups") as any
		)
			.select("*")
			.in("id", validGroupIds)
			.eq("is_archived", false)
			.order("updated_at", { ascending: false });

		if (groupsError) throw groupsError;

		const groups: SplitGroup[] = (groupsData || []).map((g: any) => {
			const members: GroupMember[] =
				typeof g.members === "string" ? JSON.parse(g.members) : g.members || [];

			// Update isCurrentUser flag based on the current user viewing
			const updatedMembers = members.map((m: GroupMember) => ({
				...m,
				isCurrentUser: m.userId === userId,
			}));

			return {
				id: g.id,
				name: g.name,
				description: g.description,
				color: g.color,
				icon: g.icon,
				members: updatedMembers,
				expenses:
					typeof g.expenses === "string"
						? JSON.parse(g.expenses)
						: g.expenses || [],
				settlements:
					typeof g.settlements === "string"
						? JSON.parse(g.settlements)
						: g.settlements || [],
				totalExpenses: g.total_expenses || 0,
				createdBy: g.user_id,
				createdAt: g.created_at,
				updatedAt: g.updated_at,
				isArchived: g.is_archived,
			};
		});

		return { data: groups, error: null };
	} catch (error: any) {
		console.error("Error fetching user groups:", error);
		return { data: [], error: error.message };
	}
};

// ============== MEMBER OPERATIONS ==============

export const addNonUserMember = async (
	groupId: string,
	memberName: string,
	email?: string,
	phone?: string
): Promise<{ data: GroupMember | null; error: string | null }> => {
	try {
		// First fetch current group data
		const { data: groupData, error: fetchError } = await (
			supabase.from("split_groups") as any
		)
			.select("members")
			.eq("id", groupId)
			.single();

		if (fetchError) throw fetchError;

		const members: GroupMember[] =
			typeof groupData.members === "string"
				? JSON.parse(groupData.members)
				: groupData.members || [];

		const newMember: GroupMember = {
			id: generateId(),
			name: memberName,
			email,
			phone,
			isCurrentUser: false,
			role: "member",
			joinedAt: new Date().toISOString(),
		};

		members.push(newMember);

		// Update group
		const { error: updateError } = await (supabase.from("split_groups") as any)
			.update({
				members: JSON.stringify(members),
				updated_at: new Date().toISOString(),
			})
			.eq("id", groupId);

		if (updateError) throw updateError;

		return { data: newMember, error: null };
	} catch (error: any) {
		console.error("Error adding member:", error);
		return { data: null, error: error.message };
	}
};

export const removeMember = async (
	groupId: string,
	memberId: string
): Promise<{ error: string | null }> => {
	try {
		// Fetch current group data
		const { data: groupData, error: fetchError } = await (
			supabase.from("split_groups") as any
		)
			.select("members")
			.eq("id", groupId)
			.single();

		if (fetchError) throw fetchError;

		let members: GroupMember[] =
			typeof groupData.members === "string"
				? JSON.parse(groupData.members)
				: groupData.members || [];

		// Remove member
		members = members.filter((m) => m.id !== memberId);

		// Update group
		const { error: updateError } = await (supabase.from("split_groups") as any)
			.update({
				members: JSON.stringify(members),
				updated_at: new Date().toISOString(),
			})
			.eq("id", groupId);

		if (updateError) throw updateError;

		// Also remove from split_group_members if they were a linked user
		await (supabase.from("split_group_members") as any)
			.delete()
			.eq("group_id", groupId)
			.eq("member_id", memberId);

		return { error: null };
	} catch (error: any) {
		console.error("Error removing member:", error);
		return { error: error.message };
	}
};

// ============== INVITATION OPERATIONS ==============

export const searchUsersByEmail = async (
	query: string,
	excludeUserId: string
): Promise<{
	data: Array<{
		id: string;
		email: string;
		fullName: string | null;
		avatarUrl: string | null;
	}>;
	error: string | null;
}> => {
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("id, email, full_name, avatar_url")
			.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
			.neq("id", excludeUserId)
			.limit(10);

		if (error) throw error;

		return {
			data: (data || []).map((u: any) => ({
				id: u.id,
				email: u.email,
				fullName: u.full_name,
				avatarUrl: u.avatar_url,
			})),
			error: null,
		};
	} catch (error: any) {
		console.error("Error searching users:", error);
		return { data: [], error: error.message };
	}
};

export const sendGroupInvitation = async (
	groupId: string,
	groupName: string,
	invitedByUserId: string,
	invitedByName: string,
	inviteeUserId?: string,
	inviteeEmail?: string,
	message?: string
): Promise<{ data: GroupInvitation | null; error: string | null }> => {
	try {
		const invitationId = generateId();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

		const invitation: GroupInvitation = {
			id: invitationId,
			groupId,
			groupName,
			invitedBy: invitedByUserId,
			invitedByName,
			inviteeEmail,
			inviteeUserId,
			status: "pending",
			message,
			createdAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};

		const { error } = await (
			supabase.from("split_group_invitations") as any
		).insert({
			id: invitationId,
			group_id: groupId,
			group_name: groupName,
			invited_by: invitedByUserId,
			invited_by_name: invitedByName,
			invitee_email: inviteeEmail,
			invitee_user_id: inviteeUserId,
			status: "pending",
			message,
			created_at: now.toISOString(),
			expires_at: expiresAt.toISOString(),
		});

		if (error) throw error;

		return { data: invitation, error: null };
	} catch (error: any) {
		console.error("Error sending invitation:", error);
		return { data: null, error: error.message };
	}
};

export const fetchPendingInvitations = async (
	userId: string
): Promise<{ data: GroupInvitation[]; error: string | null }> => {
	try {
		const { data, error } = await (
			supabase.from("split_group_invitations") as any
		)
			.select("*")
			.eq("invitee_user_id", userId)
			.eq("status", "pending")
			.gt("expires_at", new Date().toISOString())
			.order("created_at", { ascending: false });

		if (error) throw error;

		const invitations: GroupInvitation[] = (data || []).map((inv: any) => ({
			id: inv.id,
			groupId: inv.group_id,
			groupName: inv.group_name,
			invitedBy: inv.invited_by,
			invitedByName: inv.invited_by_name,
			inviteeEmail: inv.invitee_email,
			inviteeUserId: inv.invitee_user_id,
			status: inv.status,
			message: inv.message,
			createdAt: inv.created_at,
			expiresAt: inv.expires_at,
			respondedAt: inv.responded_at,
		}));

		return { data: invitations, error: null };
	} catch (error: any) {
		console.error("Error fetching invitations:", error);
		return { data: [], error: error.message };
	}
};

export const respondToInvitation = async (
	invitationId: string,
	userId: string,
	userName: string,
	userEmail: string,
	accept: boolean
): Promise<{ error: string | null }> => {
	try {
		const now = new Date().toISOString();

		// First, get the invitation to find the group_id
		// Use maybeSingle() instead of single() to handle no rows gracefully
		const { data: invitationData, error: fetchInvError } = await (
			supabase.from("split_group_invitations") as any
		)
			.select("*")
			.eq("id", invitationId)
			.maybeSingle();

		if (fetchInvError) {
			console.error("Error fetching invitation:", fetchInvError);
			throw fetchInvError;
		}
		if (!invitationData) {
			// Try fetching by invitee_user_id as fallback
			const { data: fallbackData, error: fallbackError } = await (
				supabase.from("split_group_invitations") as any
			)
				.select("*")
				.eq("invitee_user_id", userId)
				.eq("status", "pending")
				.order("created_at", { ascending: false })
				.limit(1);

			if (fallbackError || !fallbackData || fallbackData.length === 0) {
				throw new Error("Invitation not found or access denied");
			}

			// Use the first matching invitation
			const invitation = fallbackData[0];

			// Update invitation status
			await (supabase.from("split_group_invitations") as any)
				.update({
					status: accept ? "accepted" : "declined",
					responded_at: now,
				})
				.eq("id", invitation.id);

			if (accept) {
				await addUserToGroup(
					invitation.group_id,
					userId,
					userName,
					userEmail,
					now
				);
			}

			return { error: null };
		}

		// Update invitation status
		const { error: invError } = await (
			supabase.from("split_group_invitations") as any
		)
			.update({
				status: accept ? "accepted" : "declined",
				responded_at: now,
			})
			.eq("id", invitationId);

		if (invError) throw invError;

		if (accept) {
			await addUserToGroup(
				invitationData.group_id,
				userId,
				userName,
				userEmail,
				now
			);
		}

		return { error: null };
	} catch (error: any) {
		console.error("Error responding to invitation:", error);
		return { error: error.message };
	}
};

// Helper function to add user to group
const addUserToGroup = async (
	groupId: string,
	userId: string,
	userName: string,
	userEmail: string,
	now: string
): Promise<void> => {
	// Fetch current group data
	const { data: groupData, error: fetchError } = await (
		supabase.from("split_groups") as any
	)
		.select("members")
		.eq("id", groupId)
		.maybeSingle();

	if (fetchError) throw fetchError;
	if (!groupData) throw new Error("Group not found");

	const members: GroupMember[] =
		typeof groupData.members === "string"
			? JSON.parse(groupData.members)
			: groupData.members || [];

	// Create new member
	const newMember: GroupMember = {
		id: generateId(),
		name: userName,
		email: userEmail,
		userId: userId,
		isCurrentUser: false,
		role: "member",
		joinedAt: now,
	};

	members.push(newMember);

	// Update group members
	await (supabase.from("split_groups") as any)
		.update({
			members: JSON.stringify(members),
			updated_at: now,
		})
		.eq("id", groupId);

	// Add to split_group_members for access control
	await (supabase.from("split_group_members") as any).insert({
		id: generateId(),
		group_id: groupId,
		user_id: userId,
		member_id: newMember.id,
		role: "member",
		joined_at: now,
	});
};

// ============== EXPENSE OPERATIONS ==============

// ============== EXPENSE OPERATIONS ==============

export const addExpense = async (
	groupId: string,
	expense: Omit<SplitExpense, "id" | "groupId" | "createdAt" | "updatedAt">
): Promise<{ data: SplitExpense | null; error: string | null }> => {
	try {
		const now = new Date().toISOString();

		// Fetch current group data
		const { data: groupData, error: fetchError } = await (
			supabase.from("split_groups") as any
		)
			.select("expenses, total_expenses")
			.eq("id", groupId)
			.single();

		if (fetchError) throw fetchError;

		const expenses: SplitExpense[] =
			typeof groupData.expenses === "string"
				? JSON.parse(groupData.expenses)
				: groupData.expenses || [];

		const newExpense: SplitExpense = {
			...expense,
			id: generateId(),
			groupId,
			createdAt: now,
			updatedAt: now,
		};

		expenses.push(newExpense);

		// Update group
		const { error: updateError } = await (supabase.from("split_groups") as any)
			.update({
				expenses: JSON.stringify(expenses),
				total_expenses: (groupData.total_expenses || 0) + expense.amount,
				updated_at: now,
			})
			.eq("id", groupId);

		if (updateError) throw updateError;

		return { data: newExpense, error: null };
	} catch (error: any) {
		console.error("Error adding expense:", error);
		return { data: null, error: error.message };
	}
};

export const deleteExpense = async (
	groupId: string,
	expenseId: string
): Promise<{ error: string | null }> => {
	try {
		// Fetch current group data
		const { data: groupData, error: fetchError } = await (
			supabase.from("split_groups") as any
		)
			.select("expenses, total_expenses")
			.eq("id", groupId)
			.single();

		if (fetchError) throw fetchError;

		let expenses: SplitExpense[] =
			typeof groupData.expenses === "string"
				? JSON.parse(groupData.expenses)
				: groupData.expenses || [];

		const expenseToDelete = expenses.find((e) => e.id === expenseId);
		if (!expenseToDelete) {
			return { error: "Expense not found" };
		}

		expenses = expenses.filter((e) => e.id !== expenseId);

		// Update group
		const { error: updateError } = await (supabase.from("split_groups") as any)
			.update({
				expenses: JSON.stringify(expenses),
				total_expenses: Math.max(
					0,
					(groupData.total_expenses || 0) - expenseToDelete.amount
				),
				updated_at: new Date().toISOString(),
			})
			.eq("id", groupId);

		if (updateError) throw updateError;

		return { error: null };
	} catch (error: any) {
		console.error("Error deleting expense:", error);
		return { error: error.message };
	}
};

// ============== SETTLEMENT OPERATIONS ==============

export const addSettlement = async (
	groupId: string,
	settlement: Omit<Settlement, "id" | "groupId" | "createdAt">
): Promise<{ data: Settlement | null; error: string | null }> => {
	try {
		const now = new Date().toISOString();

		// Fetch current group data
		const { data: groupData, error: fetchError } = await (
			supabase.from("split_groups") as any
		)
			.select("settlements")
			.eq("id", groupId)
			.single();

		if (fetchError) throw fetchError;

		const settlements: Settlement[] =
			typeof groupData.settlements === "string"
				? JSON.parse(groupData.settlements)
				: groupData.settlements || [];

		const newSettlement: Settlement = {
			...settlement,
			id: generateId(),
			groupId,
			createdAt: now,
		};

		settlements.push(newSettlement);

		// Update group
		const { error: updateError } = await (supabase.from("split_groups") as any)
			.update({
				settlements: JSON.stringify(settlements),
				updated_at: now,
			})
			.eq("id", groupId);

		if (updateError) throw updateError;

		return { data: newSettlement, error: null };
	} catch (error: any) {
		console.error("Error adding settlement:", error);
		return { data: null, error: error.message };
	}
};

// ============== BALANCE CALCULATIONS ==============

export const calculateGroupBalances = (
	group: SplitGroup
): Array<{ memberId: string; memberName: string; balance: number }> => {
	const balanceMap: Record<string, number> = {};

	// Initialize all members with 0 balance
	group.members.forEach((m) => {
		balanceMap[m.id] = 0;
	});

	// Process expenses
	group.expenses.forEach((expense) => {
		// Add amount to payer's balance (they are owed this money)
		if (balanceMap[expense.paidBy] !== undefined) {
			balanceMap[expense.paidBy] += expense.amount;
		}

		// Subtract split amounts from each member's balance
		expense.splits.forEach((split) => {
			if (balanceMap[split.memberId] !== undefined) {
				balanceMap[split.memberId] -= split.amount;
			}
		});
	});

	// Process settlements
	group.settlements.forEach((settlement) => {
		// Payer's balance increases (they paid money)
		if (balanceMap[settlement.fromMemberId] !== undefined) {
			balanceMap[settlement.fromMemberId] += settlement.amount;
		}
		// Receiver's balance decreases (they received money)
		if (balanceMap[settlement.toMemberId] !== undefined) {
			balanceMap[settlement.toMemberId] -= settlement.amount;
		}
	});

	return group.members.map((m) => ({
		memberId: m.id,
		memberName: m.name,
		balance: balanceMap[m.id] || 0,
	}));
};

export const calculateSimplifiedDebts = (
	group: SplitGroup
): Array<{ from: GroupMember; to: GroupMember; amount: number }> => {
	const balances = calculateGroupBalances(group);

	const positiveBalances = balances
		.filter((b) => b.balance > 0.01)
		.map((b) => ({ ...b }));
	const negativeBalances = balances
		.filter((b) => b.balance < -0.01)
		.map((b) => ({ ...b, balance: Math.abs(b.balance) }));

	const debts: Array<{ from: GroupMember; to: GroupMember; amount: number }> =
		[];

	for (const debtor of negativeBalances) {
		for (const creditor of positiveBalances) {
			if (debtor.balance <= 0.01 || creditor.balance <= 0.01) continue;

			const amount = Math.min(debtor.balance, creditor.balance);
			const fromMember = group.members.find((m) => m.id === debtor.memberId);
			const toMember = group.members.find((m) => m.id === creditor.memberId);

			if (fromMember && toMember) {
				debts.push({ from: fromMember, to: toMember, amount });
			}

			debtor.balance -= amount;
			creditor.balance -= amount;
		}
	}

	return debts;
};

// ============== REAL-TIME SUBSCRIPTIONS ==============

export const subscribeToGroupUpdates = (
	groupId: string,
	onUpdate: (group: SplitGroup) => void
) => {
	const subscription = supabase
		.channel(`split_group_${groupId}`)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "split_groups",
				filter: `id=eq.${groupId}`,
			},
			(payload: any) => {
				const data = payload.new as any;
				const group: SplitGroup = {
					id: data.id,
					name: data.name,
					description: data.description,
					color: data.color,
					icon: data.icon,
					members:
						typeof data.members === "string"
							? JSON.parse(data.members)
							: data.members || [],
					expenses:
						typeof data.expenses === "string"
							? JSON.parse(data.expenses)
							: data.expenses || [],
					settlements:
						typeof data.settlements === "string"
							? JSON.parse(data.settlements)
							: data.settlements || [],
					totalExpenses: data.total_expenses || 0,
					createdBy: data.user_id,
					createdAt: data.created_at,
					updatedAt: data.updated_at,
					isArchived: data.is_archived,
				};
				onUpdate(group);
			}
		)
		.subscribe();

	return () => {
		supabase.removeChannel(subscription);
	};
};

export const subscribeToInvitations = (
	userId: string,
	onNewInvitation: (invitation: GroupInvitation) => void
) => {
	const subscription = supabase
		.channel(`invitations_${userId}`)
		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "split_group_invitations",
				filter: `invitee_user_id=eq.${userId}`,
			},
			(payload: any) => {
				const data = payload.new as any;
				const invitation: GroupInvitation = {
					id: data.id,
					groupId: data.group_id,
					groupName: data.group_name,
					invitedBy: data.invited_by,
					invitedByName: data.invited_by_name,
					inviteeEmail: data.invitee_email,
					inviteeUserId: data.invitee_user_id,
					status: data.status,
					message: data.message,
					createdAt: data.created_at,
					expiresAt: data.expires_at,
				};
				onNewInvitation(invitation);
			}
		)
		.subscribe();

	return () => {
		supabase.removeChannel(subscription);
	};
};
