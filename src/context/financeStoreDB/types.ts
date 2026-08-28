/**
 * Finance Store Types
 *
 * Single source of truth: `src/types/finance.ts`, which is what every finance
 * UI component imports. This module previously kept its own divergent copy —
 * it was missing fields the UI writes (Budget.isActive, SavingsGoal.deadline,
 * BillReminder.isAutoDeduct, Transaction.note) and carried variants the UI
 * cannot produce (AccountType "savings"/"current", PaymentMethod "card").
 * Re-exporting keeps the store and the screens from silently dropping fields.
 */
export * from "@/src/types/finance";

// Kept for callers that referenced these store-local aliases.
export type AccountType = import("@/src/types/finance").Account["type"];
export type Frequency =
	import("@/src/types/finance").BillReminder["frequency"];
export type SavingsContribution =
	import("@/src/types/finance").GoalContribution;
