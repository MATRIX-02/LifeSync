import { useCallback } from "react";
import { useFinanceStore } from "../context/financeStore";
import { Account, Debt } from "../types/finance";

/**
 * Hook to manage credit card accounts and their associated debts
 * Provides utilities for:
 * - Getting credit card accounts with debt info
 * - Creating expenses that auto-create CC debt
 * - Paying off CC debt
 * - Filtering settled vs active CC accounts
 */
export const useCreditCardManager = () => {
	const store = useFinanceStore();

	/**
	 * Get all credit card accounts
	 */
	const getCreditCardAccounts = useCallback((): Account[] => {
		return store.accounts.filter((acc) => acc.type === "credit_card");
	}, [store.accounts]);

	/**
	 * Get active (non-settled) credit card accounts
	 */
	const getActiveCreditCards = useCallback((): Account[] => {
		return store.accounts.filter(
			(acc) => acc.type === "credit_card" && !acc.isSettled
		);
	}, [store.accounts]);

	/**
	 * Get settled credit card accounts (paid off)
	 */
	const getSettledCreditCards = useCallback((): Account[] => {
		return store.accounts.filter(
			(acc) => acc.type === "credit_card" && acc.isSettled
		);
	}, [store.accounts]);

	/**
	 * Get the debt associated with a credit card
	 */
	const getCreditCardDebt = useCallback(
		(cardId: string): Debt | undefined => {
			return store.debts.find(
				(d) => d.linkedCreditCardId === cardId && !d.isSettled
			);
		},
		[store.debts]
	);

	/**
	 * Get credit card utilization info
	 */
	const getCreditCardUtilization = useCallback(
		(cardId: string): { used: number; limit: number; percentage: number } => {
			const card = store.accounts.find((acc) => acc.id === cardId);
			if (!card || card.type !== "credit_card") {
				return { used: 0, limit: 0, percentage: 0 };
			}

			const used = card.creditUsed || 0;
			const limit = card.creditLimit || 0;
			const percentage = limit > 0 ? (used / limit) * 100 : 0;

			return { used, limit, percentage };
		},
		[store.accounts]
	);

	/**
	 * Get available credit remaining
	 */
	const getAvailableCredit = useCallback(
		(cardId: string): number => {
			const card = store.accounts.find((acc) => acc.id === cardId);
			if (!card || card.type !== "credit_card") return 0;

			const limit = card.creditLimit || 0;
			const used = card.creditUsed || 0;
			return Math.max(0, limit - used);
		},
		[store.accounts]
	);

	/**
	 * Pay off credit card debt (full or partial)
	 */
	const payCreditCardDebt = useCallback(
		(cardId: string, amount: number, fromAccountId: string, note?: string) => {
			const debt = getCreditCardDebt(cardId);
			if (!debt) {
				console.warn(`No active debt found for credit card ${cardId}`);
				return;
			}

			store.recordDebtPayment(debt.id, amount, note, fromAccountId);
		},
		[store, getCreditCardDebt]
	);

	/**
	 * Settle a credit card (mark as paid off)
	 */
	const settleCreditCard = useCallback(
		(cardId: string) => {
			const debt = getCreditCardDebt(cardId);
			if (!debt) {
				console.warn(`No active debt found for credit card ${cardId}`);
				return;
			}

			store.settleDebt(debt.id);
		},
		[store, getCreditCardDebt]
	);

	/**
	 * Reactivate a settled credit card (e.g., if user wants to use it again)
	 */
	const reactivateCreditCard = useCallback(
		(cardId: string) => {
			const card = store.accounts.find((acc) => acc.id === cardId);
			if (!card) return;

			store.updateAccount(cardId, {
				isSettled: false,
				creditUsed: 0,
			});
		},
		[store.accounts, store]
	);

	/**
	 * Get summary of all credit card activity
	 */
	const getCreditCardSummary = useCallback(() => {
		const cards = getCreditCardAccounts();
		const totalLimit = cards.reduce(
			(sum, card) => sum + (card.creditLimit || 0),
			0
		);
		const totalUsed = cards.reduce(
			(sum, card) => sum + (card.creditUsed || 0),
			0
		);

		const activeCards = cards.filter((c) => !c.isSettled);
		const settledCards = cards.filter((c) => c.isSettled);

		const pendingDebts = store.debts.filter(
			(d) => d.type === "credit_card" && !d.isSettled
		);
		const totalPendingDebt = pendingDebts.reduce(
			(sum, d) => sum + d.remainingAmount,
			0
		);

		return {
			totalCards: cards.length,
			activeCards: activeCards.length,
			settledCards: settledCards.length,
			totalLimit,
			totalUsed,
			availableCredit: totalLimit - totalUsed,
			utilizationPercentage:
				totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
			pendingDebts: pendingDebts.length,
			totalPendingDebt,
		};
	}, [getCreditCardAccounts, store.debts]);

	return {
		getCreditCardAccounts,
		getActiveCreditCards,
		getSettledCreditCards,
		getCreditCardDebt,
		getCreditCardUtilization,
		getAvailableCredit,
		payCreditCardDebt,
		settleCreditCard,
		reactivateCreditCard,
		getCreditCardSummary,
	};
};
