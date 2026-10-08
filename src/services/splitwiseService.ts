// SplitWise Service - Cloud-based group expense splitting with real user support
//
// A group is one `split_groups` row whose members, expenses, settlements,
// settings and activity are jsonb columns. Every change goes through
// mutateGroup(), which re-reads the row and writes only if nobody else wrote
// in between (compare-and-swap on updated_at), retrying otherwise - so two
// people adding expenses at once can't overwrite each other.
//
// Pure calculations (balances, debts, splits, export) live in splitwiseMath.ts.

import { supabase } from "@/src/config/supabase";
import {
	ExpenseComment,
	GroupInvitation,
	GroupMember,
	Settlement,
	SplitActivity,
	SplitExpense,
	SplitGroup,
	SplitGroupSettings,
} from "@/src/types/finance";
import { NotificationService } from "./notificationService";
import { advanceDate, round2, toISODate } from "./splitwiseMath";

export {
	calculateDebts,
	calculateGroupBalances,
} from "./splitwiseMath";

// ============== HELPER FUNCTIONS ==============

// Generate RFC4122 v4 UUID string
export const generateId = (): string => {
	// Lightweight UUIDv4 generator using Math.random().
	// This produces a UUID string acceptable to Postgres `uuid` columns.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

const parseJson = <T>(value: unknown, fallback: T): T => {
	if (value === null || value === undefined) return fallback;
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallback;
		}
	}
	return value as T;
};

const ACTIVITY_CAP = 300;

/** Who is acting, for activity entries. Set once by the Split Wise screen. */
let actor: { userId?: string; name: string } = { name: "Someone" };
export const setSplitActor = (userId: string | undefined, name: string) => {
	actor = { userId, name };
};

export const rowToGroup = (g: any, viewerUserId?: string): SplitGroup => {
	const members = parseJson<GroupMember[]>(g.members, []);
	return {
		id: g.id,
		name: g.name,
		description: g.description,
		color: g.color,
		icon: g.icon,
		members: members.map((m) => ({
			...m,
			isCurrentUser: !!viewerUserId && m.userId === viewerUserId,
		})),
		expenses: parseJson<SplitExpense[]>(g.expenses, []),
		settlements: parseJson<Settlement[]>(g.settlements, []),
		totalExpenses: g.total_expenses || 0,
		createdBy: g.user_id,
		createdAt: g.created_at,
		updatedAt: g.updated_at,
		isArchived: !!g.is_archived,
		settings: parseJson<SplitGroupSettings>(g.settings, {}),
		activity: parseJson<SplitActivity[]>(g.activity, []),
	};
};

const missingColumnHint = (message: string) =>
	/settings|activity/.test(message) && /column|schema cache/i.test(message)
		? "Split Wise needs a database update. Run the SQL in docs/SPLIT_WISE_SETUP.md."
		: message;

type ActivityInput = Omit<SplitActivity, "id" | "at" | "actorUserId" | "actorName">;

/**
 * Applies `change` to a fresh copy of the group and saves it. `change` edits
 * the group in place and returns activity entries to log (or throws an Error
 * whose message is shown to the user). Retries when someone else saved first.
 */
export async function mutateGroup(
	groupId: string,
	change: (group: SplitGroup) => ActivityInput[] | void,
): Promise<{ data: SplitGroup | null; error: string | null }> {
	try {
		for (let attempt = 0; attempt < 4; attempt++) {
			const { data: row, error: fetchError } = await (supabase.from("split_groups") as any)
				.select("*")
				.eq("id", groupId)
				.single();
			if (fetchError) throw fetchError;

			const group = rowToGroup(row);
			const entries = change(group) || [];
			const now = new Date().toISOString();
			const activity = [
				...entries.map((e) => ({
					...e,
					id: generateId(),
					at: now,
					actorUserId: actor.userId,
					actorName: actor.name,
				})),
				...(group.activity ?? []),
			].slice(0, ACTIVITY_CAP);

			// isCurrentUser is per viewer; never persist it.
			const members = group.members.map(({ isCurrentUser, ...m }) => ({
				...m,
				isCurrentUser: false,
			}));

			const { data: saved, error: saveError } = await (supabase.from("split_groups") as any)
				.update({
					name: group.name,
					description: group.description,
					color: group.color,
					icon: group.icon,
					members,
					expenses: group.expenses,
					settlements: group.settlements,
					total_expenses: round2(group.expenses.reduce((s, e) => s + e.amount, 0)),
					is_archived: group.isArchived,
					settings: group.settings ?? {},
					activity,
					updated_at: now,
				})
				.eq("id", groupId)
				.eq("updated_at", row.updated_at)
				.select("*");
			if (saveError) throw saveError;
			if (saved && saved.length > 0) return { data: rowToGroup(saved[0]), error: null };
			// Someone else saved between our read and write: go again.
		}
		throw new Error("The group is being changed by someone else. Please try again.");
	} catch (error: any) {
		console.error("Split group update failed:", error);
		return { data: null, error: missingColumnHint(error?.message ?? String(error)) };
	}
}

const nameOf = (group: SplitGroup, memberId: string) =>
	group.members.find((m) => m.id === memberId)?.name ?? "someone";

// ============== GROUP OPERATIONS ==============

export const createSplitGroup = async (
	userId: string,
	userName: string,
	groupData: {
		name: string;
		description?: string;
		color: string;
		icon: string;
		settings?: SplitGroupSettings;
		/** Extra members to add straight away (friend groups). */
		extraMembers?: GroupMember[];
	},
): Promise<{ data: SplitGroup | null; error: string | null }> => {
	try {
		const now = new Date().toISOString();

		// Create the creator as the first member (client-generated uuid for member id)
		const creatorMember: GroupMember = {
			id: generateId(),
			name: userName,
			userId: userId,
			isCurrentUser: false,
			role: "admin",
			joinedAt: now,
		};
		const members = [creatorMember, ...(groupData.extraMembers ?? [])];

		// Save to Supabase and let the DB generate the group `id` (uses default gen_random_uuid())
		const { data: insertedGroup, error: insertError } = await (
			supabase.from("split_groups") as any
		)
			.insert({
				user_id: userId,
				name: groupData.name,
				description: groupData.description,
				color: groupData.color,
				icon: groupData.icon,
				// jsonb columns: stringifying stores a JSON string inside the jsonb
				// instead of an array.
				members,
				expenses: [],
				settlements: [],
				settings: groupData.settings ?? {},
				activity: [],
				total_expenses: 0,
				created_at: now,
				updated_at: now,
				is_archived: false,
			})
			.select()
			.maybeSingle();

		if (insertError || !insertedGroup)
			throw insertError || new Error("Failed to insert group");

		// Also add to group_members table for multi-user access
		const { error: memberInsertError } = await (
			supabase.from("split_group_members") as any
		).insert({
			id: generateId(),
			group_id: insertedGroup.id,
			user_id: userId,
			member_id: creatorMember.id,
			role: "admin",
			joined_at: now,
		});

		if (memberInsertError) throw memberInsertError;

		return { data: rowToGroup(insertedGroup, userId), error: null };
	} catch (error: any) {
		console.error("Error creating split group:", error);
		return { data: null, error: missingColumnHint(error.message) };
	}
};

export const updateGroupDetails = (
	groupId: string,
	details: Partial<Pick<SplitGroup, "name" | "description" | "color" | "icon">>,
) =>
	mutateGroup(groupId, (g) => {
		Object.assign(g, details);
		return [{ kind: "group_updated", text: `updated the group details` }];
	});

export const updateGroupSettings = (
	groupId: string,
	patch: Partial<SplitGroupSettings>,
	description?: string,
) =>
	mutateGroup(groupId, (g) => {
		g.settings = { ...(g.settings ?? {}), ...patch };
		return description ? [{ kind: "group_updated", text: description }] : [];
	});

export const setGroupArchived = (groupId: string, archived: boolean) =>
	mutateGroup(groupId, (g) => {
		g.isArchived = archived;
		return [{ kind: "group_updated", text: archived ? "archived the group" : "restored the group" }];
	});

export const deleteSplitGroup = async (
	groupId: string,
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

/** Every group the user belongs to, archived ones included (the UI separates them). */
export const fetchUserGroups = async (
	userId: string,
): Promise<{ data: SplitGroup[]; error: string | null }> => {
	try {
		const { data: membershipData, error: membershipError } = await (
			supabase.from("split_group_members") as any
		)
			.select("group_id")
			.eq("user_id", userId);

		if (membershipError) throw membershipError;

		// Older records may have non-UUID ids from earlier app versions; Postgres
		// rejects the whole `in` filter if one is passed.
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		const groupIds = (membershipData || [])
			.map((m: any) => m.group_id)
			.filter((id: string) => uuidRegex.test(id));

		if (groupIds.length === 0) return { data: [], error: null };

		const { data: groupsData, error: groupsError } = await (
			supabase.from("split_groups") as any
		)
			.select("*")
			.in("id", groupIds)
			.order("updated_at", { ascending: false });

		if (groupsError) throw groupsError;

		return {
			data: (groupsData || []).map((g: any) => rowToGroup(g, userId)),
			error: null,
		};
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
	phone?: string,
): Promise<{ data: GroupMember | null; error: string | null }> => {
	const newMember: GroupMember = {
		id: generateId(),
		name: memberName,
		email,
		phone,
		isCurrentUser: false,
		role: "member",
		joinedAt: new Date().toISOString(),
	};
	const { error } = await mutateGroup(groupId, (g) => {
		g.members.push(newMember);
		return [{ kind: "member_added", text: `added ${memberName}` }];
	});
	return { data: error ? null : newMember, error };
};

/**
 * Adds an invited LifeSync user as a placeholder member right away, so they
 * can be included in splits before accepting. Accepting links this member.
 */
export const addPendingUserMember = (
	groupId: string,
	user: { id: string; name: string; email?: string },
) =>
	mutateGroup(groupId, (g) => {
		if (g.members.some((m) => m.userId === user.id || m.pendingUserId === user.id)) return [];
		g.members.push({
			id: generateId(),
			name: user.name,
			email: user.email,
			pendingUserId: user.id,
			isCurrentUser: false,
			role: "member",
			joinedAt: new Date().toISOString(),
		});
		return [{ kind: "member_added", text: `invited ${user.name}` }];
	});

export const removeMember = async (
	groupId: string,
	memberId: string,
): Promise<{ error: string | null }> => {
	const { error } = await mutateGroup(groupId, (g) => {
		const name = nameOf(g, memberId);
		g.members = g.members.filter((m) => m.id !== memberId);
		return [{ kind: "member_removed", text: `removed ${name}` }];
	});
	if (error) return { error };

	// Also remove from split_group_members if they were a linked user
	await (supabase.from("split_group_members") as any)
		.delete()
		.eq("group_id", groupId)
		.eq("member_id", memberId);
	return { error: null };
};

/** Saves a UPI ID on one member record. */
export const setMemberUpi = (groupId: string, memberId: string, upiId: string) =>
	mutateGroup(groupId, (g) => {
		const m = g.members.find((x) => x.id === memberId);
		if (!m) throw new Error("Member not found");
		m.upiId = upiId.trim() || undefined;
		return [];
	});

/** Your own UPI ID, written onto your member record in every group. */
export async function setMyUpiEverywhere(
	groups: SplitGroup[],
	userId: string,
	upiId: string,
): Promise<string | null> {
	for (const g of groups) {
		const me = g.members.find((m) => m.userId === userId);
		if (!me || (me.upiId ?? "") === upiId.trim()) continue;
		const { error } = await setMemberUpi(g.id, me.id, upiId);
		if (error) return error;
	}
	return null;
}

// ============== INVITATION OPERATIONS ==============

export const searchUsersByEmail = async (
	query: string,
	excludeUserId: string,
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
		// Exact email match through a database function. profiles is readable
		// only by its owner, so a partial-match search here would either fail or
		// - if the table were open - let anyone list every user's email.
		const { data, error } = await (supabase.rpc as any)("find_user_by_email", {
			p_email: query.trim(),
		});

		if (error) throw error;

		return {
			data: ((data as any[]) || [])
				.filter((u: any) => u.id !== excludeUserId)
				.map((u: any) => ({
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
	message?: string,
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
	userId: string,
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
	accept: boolean,
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
					now,
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
				now,
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
	now: string,
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

	// Inviting adds a placeholder member straight away (so expenses can be
	// split with them before they accept). Link that one instead of adding a
	// duplicate, so everything already recorded for them stays theirs.
	let newMember = members.find((m) => !m.userId && m.pendingUserId === userId);
	if (newMember) {
		newMember.userId = userId;
		newMember.pendingUserId = undefined;
		newMember.email = newMember.email || userEmail;
	} else {
		newMember = {
			id: generateId(),
			name: userName,
			email: userEmail,
			userId: userId,
			isCurrentUser: false,
			role: "member",
			joinedAt: now,
		};
		members.push(newMember);
	}

	// Update group members
	await (supabase.from("split_groups") as any)
		.update({
			members,
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

export type ExpenseInput = Omit<SplitExpense, "id" | "groupId" | "createdAt" | "updatedAt">;

export const addExpense = (groupId: string, expense: ExpenseInput) => {
	const now = new Date().toISOString();
	const newExpense: SplitExpense = {
		...expense,
		id: generateId(),
		groupId,
		createdByUserId: actor.userId,
		createdAt: now,
		updatedAt: now,
	};
	return mutateGroup(groupId, (g) => {
		g.expenses.push(newExpense);
		return [
			{
				kind: "expense_added",
				text: `added "${newExpense.description}"`,
				expenseId: newExpense.id,
				amount: newExpense.amount,
			},
		];
	});
};

export const updateExpense = (groupId: string, expenseId: string, changes: Partial<ExpenseInput>) =>
	mutateGroup(groupId, (g) => {
		const index = g.expenses.findIndex((e) => e.id === expenseId);
		if (index < 0) throw new Error("This expense was deleted by someone else.");
		const before = g.expenses[index];
		g.expenses[index] = {
			...before,
			...changes,
			// Comments are edited separately; never lose ones added meanwhile.
			comments: before.comments,
			updatedAt: new Date().toISOString(),
		};
		const after = g.expenses[index];
		return [
			{
				kind: "expense_edited",
				text:
					before.amount !== after.amount
						? `edited "${after.description}" (${before.amount} → ${after.amount})`
						: `edited "${after.description}"`,
				expenseId,
				amount: after.amount,
			},
		];
	});

export const deleteExpense = async (
	groupId: string,
	expenseId: string,
): Promise<{ error: string | null }> => {
	const { error } = await mutateGroup(groupId, (g) => {
		const expense = g.expenses.find((e) => e.id === expenseId);
		if (!expense) return [];
		g.expenses = g.expenses.filter((e) => e.id !== expenseId);
		return [
			{
				kind: "expense_deleted",
				text: `deleted "${expense.description}"`,
				amount: expense.amount,
			},
		];
	});
	return { error };
};

export const addComment = (groupId: string, expenseId: string, text: string) =>
	mutateGroup(groupId, (g) => {
		const expense = g.expenses.find((e) => e.id === expenseId);
		if (!expense) throw new Error("This expense was deleted.");
		const comment: ExpenseComment = {
			id: generateId(),
			userId: actor.userId,
			authorName: actor.name,
			text: text.trim(),
			createdAt: new Date().toISOString(),
		};
		expense.comments = [...(expense.comments ?? []), comment];
		return [
			{
				kind: "comment_added",
				text: `commented on "${expense.description}": ${text.trim().slice(0, 80)}`,
				expenseId,
			},
		];
	});

export const deleteComment = (groupId: string, expenseId: string, commentId: string) =>
	mutateGroup(groupId, (g) => {
		const expense = g.expenses.find((e) => e.id === expenseId);
		if (expense) expense.comments = (expense.comments ?? []).filter((c) => c.id !== commentId);
		return [];
	});

// ============== SETTLEMENT OPERATIONS ==============

export type SettlementInput = Omit<Settlement, "id" | "groupId" | "createdAt" | "updatedAt">;

export const addSettlement = (groupId: string, settlement: SettlementInput) =>
	mutateGroup(groupId, (g) => {
		const now = new Date().toISOString();
		g.settlements.push({ ...settlement, id: generateId(), groupId, createdAt: now });
		return [
			{
				kind: "settlement_added",
				text: `recorded ${nameOf(g, settlement.fromMemberId)} paid ${nameOf(g, settlement.toMemberId)}${settlement.method === "upi" ? " via UPI" : ""}`,
				amount: settlement.amount,
			},
		];
	});

export const updateSettlement = (groupId: string, settlementId: string, changes: Partial<SettlementInput>) =>
	mutateGroup(groupId, (g) => {
		const s = g.settlements.find((x) => x.id === settlementId);
		if (!s) throw new Error("This payment was deleted by someone else.");
		Object.assign(s, changes, { updatedAt: new Date().toISOString() });
		return [
			{
				kind: "settlement_edited",
				text: `edited the payment from ${nameOf(g, s.fromMemberId)} to ${nameOf(g, s.toMemberId)}`,
				amount: s.amount,
			},
		];
	});

export const deleteSettlement = (groupId: string, settlementId: string) =>
	mutateGroup(groupId, (g) => {
		const s = g.settlements.find((x) => x.id === settlementId);
		if (!s) return [];
		g.settlements = g.settlements.filter((x) => x.id !== settlementId);
		return [
			{
				kind: "settlement_deleted",
				text: `deleted the payment from ${nameOf(g, s.fromMemberId)} to ${nameOf(g, s.toMemberId)}`,
				amount: s.amount,
			},
		];
	});

// ============== REMINDERS ==============

/**
 * Nudges a member who owes money: a push notification when they use
 * LifeSync, and an activity entry either way. Returns false when there's no
 * account to push to, so the caller can offer a share message instead.
 */
export async function sendPaymentReminder(
	group: SplitGroup,
	debtor: GroupMember,
	amountText: string,
): Promise<boolean> {
	await mutateGroup(group.id, () => [
		{ kind: "reminder_sent", text: `reminded ${debtor.name} about ${amountText}` },
	]);
	if (!debtor.userId) return false;
	try {
		await NotificationService.sendPushNotificationToUser(
			debtor.userId,
			"Payment reminder",
			`${actor.name} reminded you: you owe ${amountText} in "${group.name}".`,
			{ type: "split_reminder", groupId: group.id },
		);
		return true;
	} catch (error) {
		console.warn("Reminder push failed:", error);
		return false;
	}
}

// ============== RECURRING ==============

const MAX_CATCH_UP = 12;

/**
 * Creates any recurring copies that are due, for templates this user owns.
 * Returns true when anything was added (caller refetches).
 */
export async function processRecurring(groups: SplitGroup[], userId: string): Promise<boolean> {
	const today = toISODate(new Date());
	let added = false;
	for (const group of groups) {
		if (group.isArchived) continue;
		const due = (group.settings?.recurring ?? []).filter(
			(r) => r.ownerUserId === userId && r.nextDate <= today,
		);
		if (due.length === 0) continue;

		const { error } = await mutateGroup(group.id, (g) => {
			const entries: ActivityInput[] = [];
			for (const rule of g.settings?.recurring ?? []) {
				if (rule.ownerUserId !== userId) continue;
				for (let n = 0; rule.nextDate <= today && n < MAX_CATCH_UP; n++) {
					const now = new Date().toISOString();
					const [y, m, d] = rule.nextDate.split("-").map(Number);
					const expense: SplitExpense = {
						...rule.template,
						id: generateId(),
						groupId: g.id,
						date: new Date(y, m - 1, d, 12).toISOString(),
						recurringId: rule.id,
						createdByUserId: userId,
						isSettled: false,
						createdAt: now,
						updatedAt: now,
					};
					g.expenses.push(expense);
					entries.push({
						kind: "expense_added",
						text: `added "${expense.description}" (repeats)`,
						expenseId: expense.id,
						amount: expense.amount,
					});
					rule.nextDate = advanceDate(rule.nextDate, rule.frequency, rule.anchorDay);
				}
			}
			return entries;
		});
		if (!error) added = true;
	}
	return added;
}

export const removeRecurring = (groupId: string, recurringId: string) =>
	mutateGroup(groupId, (g) => {
		const rule = g.settings?.recurring?.find((r) => r.id === recurringId);
		g.settings = {
			...(g.settings ?? {}),
			recurring: (g.settings?.recurring ?? []).filter((r) => r.id !== recurringId),
		};
		return rule ? [{ kind: "group_updated", text: `stopped repeating "${rule.template.description}"` }] : [];
	});

// ============== FRIENDS ==============

/**
 * A one-to-one "friend" group for expenses outside any group. For a LifeSync
 * user this also sends an invitation, which links them when accepted.
 */
export async function createFriendGroup(
	me: { userId: string; name: string },
	friend: { name: string; userId?: string; email?: string },
): Promise<{ data: SplitGroup | null; error: string | null }> {
	const friendMember: GroupMember = {
		id: generateId(),
		name: friend.name,
		email: friend.email,
		pendingUserId: friend.userId,
		isCurrentUser: false,
		role: "member",
		joinedAt: new Date().toISOString(),
	};
	const result = await createSplitGroup(me.userId, me.name, {
		name: friend.name,
		color: "#60A5FA",
		icon: "person",
		settings: { kind: "friend", simplifyDebts: true },
		extraMembers: [friendMember],
	});
	if (result.data && friend.userId) {
		await sendGroupInvitation(
			result.data.id,
			`${me.name} (friend)`,
			me.userId,
			me.name,
			friend.userId,
			friend.email,
			"Added you as a friend to split expenses",
		);
		try {
			await NotificationService.sendPushNotificationToUser(
				friend.userId,
				"New friend on Split Wise",
				`${me.name} added you to split expenses`,
				{ type: "group_invitation", groupId: result.data.id },
			);
		} catch {
			// Invitation still shows in the app.
		}
	}
	return result;
}

// ============== REAL-TIME SUBSCRIPTIONS ==============

export const subscribeToGroupUpdates = (
	groupId: string,
	onUpdate: (group: SplitGroup) => void,
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
			(payload: any) => onUpdate(rowToGroup(payload.new)),
		)
		.subscribe();

	return () => {
		supabase.removeChannel(subscription);
	};
};

export const subscribeToInvitations = (
	userId: string,
	onNewInvitation: (invitation: GroupInvitation) => void,
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
			},
		)
		.subscribe();

	return () => {
		supabase.removeChannel(subscription);
	};
};
