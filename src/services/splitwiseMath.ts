// Split Wise calculations. Pure functions only - no I/O - so balances, debts
// and exports always agree with each other.

import {
	GroupMember,
	ReceiptItem,
	RecurringFrequency,
	SplitExpense,
	SplitGroup,
	SplitType,
} from "@/src/types/finance";

export const EPSILON = 0.01;
export const round2 = (n: number) => Math.round(n * 100) / 100;

// ============== SPLITS ==============

/**
 * Spreads `total` over `weights` in proportion, rounded to paise, with the
 * rounding remainder handed out a paisa at a time so the parts sum exactly.
 */
export function distribute(total: number, weights: number[]): number[] {
	const sum = weights.reduce((s, w) => s + w, 0);
	if (sum <= 0) return weights.map(() => 0);
	const totalPaise = Math.round(total * 100);
	const raw = weights.map((w) => (w / sum) * totalPaise);
	const parts = raw.map(Math.floor);
	let left = totalPaise - parts.reduce((s, p) => s + p, 0);
	// Largest fractional parts get the spare paise first.
	const order = raw
		.map((r, i) => ({ i, frac: r - Math.floor(r) }))
		.sort((a, b) => b.frac - a.frac);
	for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length, left--) {
		parts[order[k].i] += 1;
	}
	return parts.map((p) => p / 100);
}

export type SplitResult =
	| { ok: true; splits: { memberId: string; amount: number }[] }
	| { ok: false; error: string };

/**
 * Turns a split form into per-member amounts. `values` holds the raw text the
 * user typed per member (amounts, percentages or shares); members missing
 * from an "equal" split are excluded via `included`.
 */
export function computeSplits(
	type: SplitType,
	amount: number,
	memberIds: string[],
	values: Record<string, string>,
	opts: { included?: string[]; items?: ReceiptItem[]; extraCharges?: number } = {},
): SplitResult {
	const num = (v: string | undefined, fallback = 0) => {
		const n = parseFloat(v ?? "");
		return isNaN(n) ? fallback : n;
	};

	if (type === "equal") {
		if (opts.included && opts.included.length === 0) {
			return { ok: false, error: "Tick at least one person to split with." };
		}
		const ids = opts.included ?? memberIds;
		const parts = distribute(amount, ids.map(() => 1));
		return { ok: true, splits: ids.map((id, i) => ({ memberId: id, amount: parts[i] })) };
	}

	if (type === "exact") {
		const splits = memberIds
			.map((id) => ({ memberId: id, amount: round2(num(values[id])) }))
			.filter((s) => s.amount > 0);
		const total = splits.reduce((s, x) => s + x.amount, 0);
		if (Math.abs(total - amount) > 0.005) {
			const diff = round2(amount - total);
			return {
				ok: false,
				error: `Amounts add up to ${round2(total)}, ${diff > 0 ? `${diff} short of` : `${-diff} over`} the total.`,
			};
		}
		return { ok: true, splits };
	}

	if (type === "percentage") {
		const pct = memberIds.map((id) => num(values[id]));
		const total = pct.reduce((s, p) => s + p, 0);
		if (Math.abs(total - 100) > 0.01) {
			return { ok: false, error: `Percentages add up to ${round2(total)}%, not 100%.` };
		}
		const parts = distribute(amount, pct);
		return {
			ok: true,
			splits: memberIds
				.map((id, i) => ({ memberId: id, amount: parts[i] }))
				.filter((s) => s.amount > 0),
		};
	}

	if (type === "shares") {
		const shares = memberIds.map((id) => Math.max(0, num(values[id], 1)));
		if (shares.reduce((s, x) => s + x, 0) <= 0) {
			return { ok: false, error: "Give at least one person a share." };
		}
		const parts = distribute(amount, shares);
		return {
			ok: true,
			splits: memberIds
				.map((id, i) => ({ memberId: id, amount: parts[i] }))
				.filter((s) => s.amount > 0),
		};
	}

	// itemized: each item split equally among its people, then extra charges
	// (tax, service) spread in proportion to what each person ordered.
	const items = opts.items ?? [];
	if (items.length === 0) return { ok: false, error: "Add at least one item." };
	const unassigned = items.find((it) => it.memberIds.length === 0);
	if (unassigned) return { ok: false, error: `Choose who shared "${unassigned.name}".` };
	const owed: Record<string, number> = {};
	for (const item of items) {
		const parts = distribute(item.price, item.memberIds.map(() => 1));
		item.memberIds.forEach((id, i) => {
			owed[id] = (owed[id] ?? 0) + parts[i];
		});
	}
	const ids = Object.keys(owed);
	const subtotal = ids.reduce((s, id) => s + owed[id], 0);
	const final = distribute(subtotal + (opts.extraCharges ?? 0), ids.map((id) => owed[id]));
	return { ok: true, splits: ids.map((id, i) => ({ memberId: id, amount: final[i] })) };
}

/** Who paid how much; a single-payer expense is one entry for the full amount. */
export function expensePayers(expense: SplitExpense): { memberId: string; amount: number }[] {
	if (expense.payers && expense.payers.length > 0) return expense.payers;
	return [{ memberId: expense.paidBy, amount: expense.amount }];
}

// ============== BALANCES ==============

export interface MemberBalance {
	memberId: string;
	memberName: string;
	/** Positive: owed money. Negative: owes money. */
	balance: number;
}

export function calculateGroupBalances(group: SplitGroup): MemberBalance[] {
	const bal: Record<string, number> = {};
	group.members.forEach((m) => (bal[m.id] = 0));

	for (const expense of group.expenses) {
		for (const p of expensePayers(expense)) {
			if (bal[p.memberId] !== undefined) bal[p.memberId] += p.amount;
		}
		for (const s of expense.splits) {
			if (bal[s.memberId] !== undefined) bal[s.memberId] -= s.amount;
		}
	}
	for (const s of group.settlements) {
		if (bal[s.fromMemberId] !== undefined) bal[s.fromMemberId] += s.amount;
		if (bal[s.toMemberId] !== undefined) bal[s.toMemberId] -= s.amount;
	}

	return group.members.map((m) => ({
		memberId: m.id,
		memberName: m.name,
		balance: round2(bal[m.id] ?? 0),
	}));
}

export interface Debt {
	from: GroupMember;
	to: GroupMember;
	amount: number;
}

/** Fewest payments that clear every balance (largest debtor pays largest creditor). */
function simplifiedDebts(group: SplitGroup): Debt[] {
	const balances = calculateGroupBalances(group);
	const creditors = balances
		.filter((b) => b.balance > EPSILON)
		.map((b) => ({ ...b }))
		.sort((a, b) => b.balance - a.balance);
	const debtors = balances
		.filter((b) => b.balance < -EPSILON)
		.map((b) => ({ ...b, balance: -b.balance }))
		.sort((a, b) => b.balance - a.balance);

	const debts: Debt[] = [];
	let i = 0;
	let j = 0;
	while (i < debtors.length && j < creditors.length) {
		const amount = round2(Math.min(debtors[i].balance, creditors[j].balance));
		const from = group.members.find((m) => m.id === debtors[i].memberId);
		const to = group.members.find((m) => m.id === creditors[j].memberId);
		if (from && to && amount > EPSILON) debts.push({ from, to, amount });
		debtors[i].balance -= amount;
		creditors[j].balance -= amount;
		if (debtors[i].balance <= EPSILON) i++;
		if (creditors[j].balance <= EPSILON) j++;
	}
	return debts;
}

/** Who owes whom per pair, from the expenses themselves (no simplification). */
function pairwiseDebts(group: SplitGroup): Debt[] {
	// net[a][b] > 0 means a owes b.
	const net: Record<string, Record<string, number>> = {};
	const add = (a: string, b: string, amt: number) => {
		if (a === b || amt === 0) return;
		net[a] = net[a] ?? {};
		net[b] = net[b] ?? {};
		net[a][b] = (net[a][b] ?? 0) + amt;
		net[b][a] = (net[b][a] ?? 0) - amt;
	};

	for (const expense of group.expenses) {
		const payers = expensePayers(expense);
		const paidTotal = payers.reduce((s, p) => s + p.amount, 0);
		if (paidTotal <= 0) continue;
		for (const split of expense.splits) {
			for (const payer of payers) {
				add(split.memberId, payer.memberId, split.amount * (payer.amount / paidTotal));
			}
		}
	}
	// A settlement from A to B reduces what A owes B.
	for (const s of group.settlements) add(s.fromMemberId, s.toMemberId, -s.amount);

	const debts: Debt[] = [];
	for (const a of Object.keys(net)) {
		for (const b of Object.keys(net[a])) {
			const amount = round2(net[a][b]);
			if (amount <= EPSILON) continue;
			const from = group.members.find((m) => m.id === a);
			const to = group.members.find((m) => m.id === b);
			if (from && to) debts.push({ from, to, amount });
		}
	}
	return debts.sort((x, y) => y.amount - x.amount);
}

export const isSimplified = (group: SplitGroup) => group.settings?.simplifyDebts !== false;

export function calculateDebts(group: SplitGroup): Debt[] {
	return isSimplified(group) ? simplifiedDebts(group) : pairwiseDebts(group);
}

// ============== ACROSS GROUPS ==============

export const isFriendGroup = (g: SplitGroup) => g.settings?.kind === "friend";

/**
 * Identifies a person across groups: by account when linked (or invited and
 * not yet accepted), else by name.
 */
export function personKey(m: Pick<GroupMember, "userId" | "pendingUserId" | "name">): string {
	const account = m.userId ?? m.pendingUserId;
	return account ? `u:${account}` : `n:${m.name.trim().toLowerCase()}`;
}

export interface FriendBalance {
	key: string;
	name: string;
	userId?: string;
	/** Positive: they owe you. Negative: you owe them. */
	net: number;
	/** Per-group breakdown, with that group's member record for the friend. */
	groups: { group: SplitGroup; member: GroupMember; amount: number }[];
}

export function myMember(group: SplitGroup, userId: string): GroupMember | undefined {
	return group.members.find((m) => m.userId === userId);
}

export function computeFriendBalances(groups: SplitGroup[], userId: string): FriendBalance[] {
	const map = new Map<string, FriendBalance>();
	for (const group of groups) {
		const me = myMember(group, userId);
		if (!me) continue;
		for (const debt of calculateDebts(group)) {
			let other: GroupMember;
			let signed: number;
			if (debt.to.id === me.id) {
				other = debt.from;
				signed = debt.amount;
			} else if (debt.from.id === me.id) {
				other = debt.to;
				signed = -debt.amount;
			} else continue;
			const key = personKey(other);
			const entry =
				map.get(key) ??
				({ key, name: other.name, userId: other.userId ?? other.pendingUserId, net: 0, groups: [] } as FriendBalance);
			entry.net = round2(entry.net + signed);
			entry.groups.push({ group, member: other, amount: signed });
			map.set(key, entry);
		}
	}
	return [...map.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/** Everyone you share any group with, so Friends lists people even when settled. */
export function knownPeople(groups: SplitGroup[], userId: string): Map<string, GroupMember> {
	const people = new Map<string, GroupMember>();
	for (const g of groups) {
		if (!myMember(g, userId)) continue;
		for (const m of g.members) {
			if (m.userId === userId) continue;
			const key = personKey(m);
			if (!people.has(key) || (m.upiId && !people.get(key)!.upiId)) people.set(key, m);
		}
	}
	return people;
}

/** Your own share of an expense (what it cost you), for charts. */
export function myShare(expense: SplitExpense, memberId: string): number {
	return expense.splits.find((s) => s.memberId === memberId)?.amount ?? 0;
}

// ============== RECURRING ==============

export function toISODate(d: Date): string {
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return local.toISOString().slice(0, 10);
}

/**
 * Next occurrence. Monthly keeps `anchorDay` (the day it was set up on),
 * clamped to short months: 31 Jan -> 28 Feb -> 31 Mar, not 28 Mar.
 */
export function advanceDate(iso: string, frequency: RecurringFrequency, anchorDay?: number): string {
	const [y, m, d] = iso.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	if (frequency === "weekly") date.setDate(date.getDate() + 7);
	else if (frequency === "monthly") {
		const target = new Date(y, m, 1);
		const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
		target.setDate(Math.min(anchorDay ?? d, lastDay));
		return toISODate(target);
	} else date.setFullYear(date.getFullYear() + 1);
	return toISODate(date);
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
	weekly: "Every week",
	monthly: "Every month",
	yearly: "Every year",
};

// ============== EXPORT ==============

const csvCell = (v: string | number) => {
	const s = String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per expense and settlement, one column per member's share. */
export function buildGroupCsv(group: SplitGroup, categoryName: (key: string) => string): string {
	const members = group.members;
	const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Former member";
	const header = ["Date", "Type", "Description", "Category", "Amount", "Paid by", ...members.map((m) => m.name)];
	const rows: (string | number)[][] = [];

	const expenses = [...group.expenses].sort((a, b) => a.date.localeCompare(b.date));
	for (const e of expenses) {
		const paidBy = expensePayers(e)
			.map((p) => (e.payers ? `${nameOf(p.memberId)} (${p.amount})` : nameOf(p.memberId)))
			.join("; ");
		rows.push([
			e.date.slice(0, 10),
			"Expense",
			e.description,
			categoryName(e.category),
			e.amount,
			paidBy,
			...members.map((m) => myShare(e, m.id) || ""),
		]);
	}
	for (const s of [...group.settlements].sort((a, b) => a.date.localeCompare(b.date))) {
		rows.push([
			s.date.slice(0, 10),
			"Payment",
			`${nameOf(s.fromMemberId)} paid ${nameOf(s.toMemberId)}${s.note ? ` - ${s.note}` : ""}`,
			"",
			s.amount,
			nameOf(s.fromMemberId),
			...members.map(() => ""),
		]);
	}
	const balances = calculateGroupBalances(group);
	rows.push([]);
	rows.push(["", "Balance", "", "", "", "", ...members.map((m) => balances.find((b) => b.memberId === m.id)?.balance ?? 0)]);

	return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

// ============== CHARTS ==============

export interface ChartSlice {
	key: string;
	label: string;
	value: number;
}

/** Totals by category; `memberId` restricts to that person's share. */
export function spendByCategory(
	groups: SplitGroup[],
	categoryName: (key: string) => string,
	memberIdFor?: (g: SplitGroup) => string | undefined,
): ChartSlice[] {
	const totals: Record<string, number> = {};
	for (const g of groups) {
		const mid = memberIdFor?.(g);
		if (memberIdFor && !mid) continue;
		for (const e of g.expenses) {
			const v = mid ? myShare(e, mid) : e.amount;
			if (v > 0) totals[e.category] = (totals[e.category] ?? 0) + v;
		}
	}
	return Object.entries(totals)
		.map(([key, value]) => ({ key, label: categoryName(key), value: round2(value) }))
		.sort((a, b) => b.value - a.value);
}

/** Last `months` calendar months, oldest first. */
export function spendByMonth(
	groups: SplitGroup[],
	months: number,
	memberIdFor?: (g: SplitGroup) => string | undefined,
): ChartSlice[] {
	const now = new Date();
	const buckets: ChartSlice[] = [];
	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		buckets.push({
			key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
			label: d.toLocaleDateString([], { month: "short" }),
			value: 0,
		});
	}
	for (const g of groups) {
		const mid = memberIdFor?.(g);
		if (memberIdFor && !mid) continue;
		for (const e of g.expenses) {
			const bucket = buckets.find((b) => e.date.startsWith(b.key));
			if (!bucket) continue;
			bucket.value = round2(bucket.value + (mid ? myShare(e, mid) : e.amount));
		}
	}
	return buckets;
}

/** Per member in one group: what they paid vs what their share was. */
export function paidVsShare(group: SplitGroup): { member: GroupMember; paid: number; share: number }[] {
	return group.members.map((member) => {
		let paid = 0;
		let share = 0;
		for (const e of group.expenses) {
			paid += expensePayers(e).find((p) => p.memberId === member.id)?.amount ?? 0;
			share += myShare(e, member.id);
		}
		return { member, paid: round2(paid), share: round2(share) };
	});
}
