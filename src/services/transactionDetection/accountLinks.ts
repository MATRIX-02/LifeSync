/**
 * Smart defaults for a detected transaction: which account, which category.
 *
 * Account: bank alerts carry the last 4 digits of the account/card
 * ("A/c XX1234"). The user links digits to a LifeSync account once (in the
 * review sheet); after that they map automatically. Stored on-device - no
 * schema change - as { "1234": accountId }.
 *
 * Category: learned per merchant when the user confirms, with keyword rules
 * as the starting point.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Account } from "@/src/types/finance";
import type { DetectedTransaction } from "./types";

const LINKS_KEY = "detected_txn_account_links";
const MERCHANT_KEY = "detected_txn_merchant_categories";

async function readMap(key: string): Promise<Record<string, string>> {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

// ---------- accounts ----------

export const getAccountLinks = () => readMap(LINKS_KEY);

export async function linkDigits(digits: string, accountId: string): Promise<void> {
	const links = await getAccountLinks();
	links[digits] = accountId;
	await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export async function unlinkDigits(digits: string): Promise<void> {
	const links = await getAccountLinks();
	delete links[digits];
	await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export interface ResolvedAccount {
	accountId: string;
	/** Digits were found but aren't linked yet - offer to link them. */
	needsLink: boolean;
}

/** "1234, 5678 9012" -> ["1234", "5678", "9012"]. Keeps the last 4 of longer runs. */
export function parseDigitsInput(input: string): string[] {
	const groups = input.match(/\d+/g) ?? [];
	return Array.from(
		new Set(groups.filter((g) => g.length >= 4).map((g) => g.slice(-4))),
	);
}

export const formatDigits = (digits?: string[]) => (digits ?? []).join(", ");

/** The account whose "Card / account ending in" field lists these digits. */
export function accountWithDigits(
	accounts: Account[],
	digits: string,
): Account | undefined {
	return accounts.find((a) => a.linkedDigits?.includes(digits));
}

/**
 * Picks the account for a detected payment, in this order:
 *   1. an account whose "Card / account ending in" field has the digits
 *      (stored in the database, syncs across devices)
 *   2. digits linked on this phone from an earlier review (older links,
 *      kept as a fallback)
 *   3. an account whose name contains the digits ("HDFC 1234")
 *   4. the default account (or the only one)
 */
export function resolveAccount(
	tx: DetectedTransaction,
	accounts: Account[],
	links: Record<string, string>,
): ResolvedAccount {
	const digits = tx.accountNumber;
	const exists = (id?: string) => !!id && accounts.some((a) => a.id === id);

	const fromField = digits ? accountWithDigits(accounts, digits) : undefined;
	if (fromField) return { accountId: fromField.id, needsLink: false };

	if (digits && exists(links[digits])) return { accountId: links[digits], needsLink: false };

	const byName = digits ? accounts.find((a) => a.name.includes(digits)) : undefined;
	if (byName) return { accountId: byName.id, needsLink: true };

	const fallback =
		accounts.find((a) => a.isDefault) ?? (accounts.length === 1 ? accounts[0] : undefined);
	return { accountId: fallback?.id ?? "", needsLink: !!digits };
}

// ---------- categories ----------

const normaliseMerchant = (m: string) =>
	m.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Keyword -> built-in expense category key. First match wins.
const EXPENSE_RULES: [RegExp, string][] = [
	[/swiggy|zomato|domino|pizza|kfc|mcdonald|burger|cafe|restaurant|starbucks|eatsure|biryani/, "food"],
	[/blinkit|zepto|bigbasket|instamart|dmart|grofers|jiomart|grocery|supermarket/, "groceries"],
	[/uber|ola|rapido|metro|irctc|redbus|fuel|petrol|indian oil|hpcl|bpcl|fastag|parking/, "transport"],
	[/makemytrip|goibibo|indigo|air india|vistara|cleartrip|oyo|airbnb|booking com/, "travel"],
	[/amazon|flipkart|myntra|ajio|meesho|nykaa|croma|reliance digital|decathlon/, "shopping"],
	[/netflix|spotify|hotstar|prime video|youtube|apple com|google play|jiocinema|sonyliv/, "subscriptions"],
	[/airtel|jio|vodafone|vi |bsnl|electricity|bescom|tata power|gas|water bill|broadband|act fibernet/, "utilities"],
	[/pharm|apollo|medplus|1mg|netmeds|hospital|clinic|diagnostic|lab/, "health"],
	[/bookmyshow|pvr|inox|steam|playstation/, "entertainment"],
	[/rent|nobroker|housing/, "rent"],
	[/lic|insurance|policybazaar|acko|hdfc ergo|icici lombard/, "insurance"],
	[/zerodha|groww|upstox|mutual fund|sip|kuvera|coin/, "investments"],
	[/udemy|coursera|unacademy|byju|school|college|tuition|fees/, "education"],
];

const INCOME_RULES: [RegExp, string][] = [
	[/salary|payroll/, "salary"],
	[/refund/, "refunds"],
	[/cashback|reward/, "cashback"],
	[/interest/, "interest"],
	[/dividend/, "dividends"],
];

/**
 * Category key for a detection. `allowed` are the keys the user can pick
 * (hidden categories excluded) - a suggestion outside it falls back to the
 * first allowed option.
 */
export async function suggestCategory(
	tx: DetectedTransaction,
	allowed: string[],
): Promise<string> {
	const pick = (key?: string) =>
		key && allowed.includes(key) ? key : allowed.includes("other") ? "other" : allowed[0];

	const merchant = tx.merchant ? normaliseMerchant(tx.merchant) : "";
	if (merchant) {
		const learned = (await readMap(MERCHANT_KEY))[`${tx.type}:${merchant}`];
		if (learned && allowed.includes(learned)) return learned;
	}

	const haystack = `${merchant} ${(tx.rawText || "").toLowerCase()}`;
	const rules = tx.type === "income" ? INCOME_RULES : EXPENSE_RULES;
	// Keywords must start a word: raw bank text says "Avl Bal available",
	// which would otherwise match "lab" (health).
	return pick(
		rules.find(([re]) => new RegExp(`\\b(?:${re.source})`).test(haystack))?.[1],
	);
}

/** Remember the user's choice for next time. */
export async function learnCategory(
	tx: DetectedTransaction,
	category: string,
): Promise<void> {
	if (!tx.merchant) return;
	const map = await readMap(MERCHANT_KEY);
	map[`${tx.type}:${normaliseMerchant(tx.merchant)}`] = category;
	await AsyncStorage.setItem(MERCHANT_KEY, JSON.stringify(map));
}
