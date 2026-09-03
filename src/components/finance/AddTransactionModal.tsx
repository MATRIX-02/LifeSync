// Add Transaction - the one place a transaction gets created.
//
// This used to live inline in FinanceDashboard. It is shared rather than
// copied because it carries rules that must not drift between entry points:
// the credit-limit check, forcing paymentMethod to credit_card for credit-card
// accounts, transfer source/destination validation, and the plan limit on
// transactions per month. A second copy in TransactionList would have been a
// second place for those to go stale - the Create/Edit habit modals in this
// repo are exactly that lesson.

import { Alert } from "@/src/components/CustomAlert";
import { SubscriptionCheckResult } from "@/src/components/PremiumFeatureGate";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme } from "@/src/context/themeContext";
import {
	EXPENSE_CATEGORIES,
	ExpenseCategory,
	INCOME_CATEGORIES,
	IncomeCategory,
	PaymentMethod,
	TransactionType,
} from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const paymentMethods: PaymentMethod[] = [
	"cash",
	"credit_card",
	"debit_card",
	"upi",
	"net_banking",
	"wallet",
];

interface AddTransactionModalProps {
	visible: boolean;
	onClose: () => void;
	theme: Theme;
	currency: string;
	/** Which tab opens first. The dashboard's quick actions use this. */
	initialType?: TransactionType;
	/** Offered when the user has no accounts yet; omit to just show a hint. */
	onAddAccount?: () => void;
	subscriptionCheck?: SubscriptionCheckResult;
	/** Transactions already recorded this month, for the plan limit. */
	currentMonthTransactionCount?: number;
}

export default function AddTransactionModal({
	visible,
	onClose,
	theme,
	currency,
	initialType = "expense",
	onAddAccount,
	subscriptionCheck,
	currentMonthTransactionCount = 0,
}: AddTransactionModalProps) {
	const { accounts, addTransaction } = useFinanceStore();
	const styles = createStyles(theme);

	const [transactionType, setTransactionType] =
		useState<TransactionType>(initialType);
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		ExpenseCategory | IncomeCategory
	>("food");
	const [selectedAccount, setSelectedAccount] = useState<string>("");
	// Destination account, transfers only.
	const [selectedToAccount, setSelectedToAccount] = useState<string>("");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
	const [submitting, setSubmitting] = useState(false);

	// Reset on each open so a cancelled entry does not bleed into the next one,
	// and so `initialType` is honoured every time and not just on first mount.
	useEffect(() => {
		if (!visible) return;
		setTransactionType(initialType);
		setAmount("");
		setDescription("");
		setSelectedCategory(initialType === "income" ? "salary" : "food");
		setSelectedToAccount("");
		setPaymentMethod("upi");
		setSubmitting(false);
		// Preselect the only account there is; otherwise leave the choice explicit.
		setSelectedAccount(accounts.length === 1 ? accounts[0].id : "");
	}, [visible, initialType]);

	const formatAmount = (value: number) =>
		value.toLocaleString("en-IN", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});

	const handleAddTransaction = async () => {
		if (!amount || parseFloat(amount) <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}
		if (!description.trim()) {
			Alert.alert("Error", "Please enter a description");
			return;
		}
		if (!selectedAccount) {
			Alert.alert("Error", "Please select an account");
			return;
		}
		if (transactionType === "transfer") {
			if (!selectedToAccount) {
				Alert.alert("Error", "Please select the account to transfer to");
				return;
			}
			if (selectedToAccount === selectedAccount) {
				Alert.alert("Error", "Source and destination accounts must differ");
				return;
			}
		}

		// Plan limit. Both entry points pass the same count, so the ceiling is
		// the same wherever the transaction is added from.
		if (
			subscriptionCheck &&
			!subscriptionCheck.canAddTransaction(currentMonthTransactionCount)
		) {
			Alert.alert(
				"Monthly limit reached",
				"You have used all the transactions your plan allows this month. Upgrade for more."
			);
			return;
		}

		// For credit card expenses, payment method is always credit_card
		const selectedSourceAccount = accounts.find((a) => a.id === selectedAccount);
		const finalPaymentMethod =
			selectedSourceAccount?.type === "credit_card"
				? "credit_card"
				: paymentMethod;

		// Validate credit card limit
		if (selectedSourceAccount?.type === "credit_card") {
			const creditLimit = selectedSourceAccount.creditLimit || 0;
			const currentUsed = selectedSourceAccount.creditUsed || 0;
			const availableCredit = creditLimit - currentUsed;
			const transactionAmount = parseFloat(amount);

			if (transactionAmount > availableCredit) {
				Alert.alert(
					"Credit Limit Exceeded",
					`Available credit: ${currency}${formatAmount(
						availableCredit
					)}\nTrying to spend: ${currency}${formatAmount(transactionAmount)}`,
					[{ text: "OK" }]
				);
				return;
			}
		}

		// addTransaction writes to Supabase; awaiting it means a failure surfaces
		// here instead of closing the sheet on a write that never landed.
		setSubmitting(true);
		try {
			await addTransaction({
				type: transactionType,
				amount: parseFloat(amount),
				category: selectedCategory,
				description: description.trim(),
				date: new Date().toISOString().split("T")[0],
				time: new Date().toTimeString().split(" ")[0],
				accountId: selectedAccount,
				toAccountId:
					transactionType === "transfer" ? selectedToAccount : undefined,
				paymentMethod: finalPaymentMethod as any,
				isRecurring: false,
			});
		} catch (error: any) {
			setSubmitting(false);
			Alert.alert("Error", error?.message || "Could not add the transaction");
			return;
		}

		setSubmitting(false);
		onClose();
		Alert.alert("Success", "Transaction added successfully!");
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>
							Add{" "}
							{transactionType.charAt(0).toUpperCase() +
								transactionType.slice(1)}
						</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false}>
						{/* Transaction Type Tabs */}
						<View style={styles.transactionTypeTabs}>
							{(["expense", "income", "transfer"] as TransactionType[]).map(
								(type) => (
									<TouchableOpacity
										key={type}
										style={[
											styles.transactionTypeTab,
											transactionType === type &&
												styles.transactionTypeTabActive,
										]}
										onPress={() => {
											setTransactionType(type);
											if (type === "income") setSelectedCategory("salary");
											else if (type === "expense") setSelectedCategory("food");
											else {
												// The category picker is hidden for transfers, so
												// pin a neutral one instead of keeping whatever the
												// previous type had selected.
												setSelectedCategory("other");
												setSelectedToAccount("");
											}
										}}
									>
										<Text
											style={[
												styles.transactionTypeText,
												transactionType === type &&
													styles.transactionTypeTextActive,
											]}
										>
											{type.charAt(0).toUpperCase() + type.slice(1)}
										</Text>
									</TouchableOpacity>
								)
							)}
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Amount</Text>
							<View style={styles.amountInput}>
								<Text style={styles.currencySymbol}>{currency}</Text>
								<TextInput
									style={styles.amountField}
									value={amount}
									onChangeText={setAmount}
									placeholder="0.00"
									placeholderTextColor={theme.textMuted}
									keyboardType={
										Platform.OS === "ios" ? "decimal-pad" : "numeric"
									}
								/>
							</View>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Description</Text>
							<TextInput
								style={styles.formInput}
								value={description}
								onChangeText={setDescription}
								placeholder="What's this for?"
								placeholderTextColor={theme.textMuted}
							/>
						</View>

						{transactionType !== "transfer" && (
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>Category</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false}>
									<View style={styles.categorySelector}>
										{Object.entries(
											transactionType === "income"
												? INCOME_CATEGORIES
												: EXPENSE_CATEGORIES
										).map(([key, cat]) => (
											<TouchableOpacity
												key={`${transactionType}-${key}`}
												style={[
													styles.categoryOption,
													selectedCategory === key && {
														backgroundColor: cat.color + "30",
														borderColor: cat.color,
													},
												]}
												onPress={() => setSelectedCategory(key as any)}
											>
												<Ionicons
													name={cat.icon as any}
													size={20}
													color={
														selectedCategory === key
															? cat.color
															: theme.textMuted
													}
												/>
												<Text
													style={[
														styles.categoryText,
														selectedCategory === key && { color: cat.color },
													]}
													numberOfLines={1}
												>
													{cat.name}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</ScrollView>
							</View>
						)}

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>
								{transactionType === "transfer" ? "From Account" : "Account"}
							</Text>
							<View style={styles.accountSelector}>
								{accounts.map((acc) => (
									<TouchableOpacity
										key={acc.id}
										style={[
											styles.accountOption,
											selectedAccount === acc.id && {
												backgroundColor: acc.color + "20",
												borderColor: acc.color,
											},
										]}
										onPress={() => setSelectedAccount(acc.id)}
									>
										<Text
											style={[
												styles.accountOptionText,
												selectedAccount === acc.id && { color: acc.color },
											]}
										>
											{acc.name}
										</Text>
									</TouchableOpacity>
								))}
							</View>
							{accounts.length === 0 &&
								(onAddAccount ? (
									<TouchableOpacity
										style={styles.addAccountHint}
										onPress={() => {
											onClose();
											onAddAccount();
										}}
									>
										<Ionicons
											name="add-circle-outline"
											size={16}
											color={theme.primary}
										/>
										<Text style={styles.addAccountHintText}>
											Add an account first
										</Text>
									</TouchableOpacity>
								) : (
									<Text style={styles.addAccountHintText}>
										Add an account in the Home tab first.
									</Text>
								))}
						</View>

						{transactionType === "transfer" && (
							<View style={styles.formGroup}>
								<Text style={styles.formLabel}>To Account</Text>
								<View style={styles.accountSelector}>
									{accounts
										.filter((acc) => acc.id !== selectedAccount)
										.map((acc) => (
											<TouchableOpacity
												key={acc.id}
												style={[
													styles.accountOption,
													selectedToAccount === acc.id && {
														backgroundColor: acc.color + "20",
														borderColor: acc.color,
													},
												]}
												onPress={() => setSelectedToAccount(acc.id)}
											>
												<Text
													style={[
														styles.accountOptionText,
														selectedToAccount === acc.id && {
															color: acc.color,
														},
													]}
												>
													{acc.name}
												</Text>
											</TouchableOpacity>
										))}
								</View>
								{accounts.filter((acc) => acc.id !== selectedAccount).length ===
									0 && (
									<Text style={styles.addAccountHintText}>
										You need a second account to transfer to.
									</Text>
								)}
							</View>
						)}

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Payment Method</Text>
							{selectedAccount &&
							accounts.find((a) => a.id === selectedAccount)?.type ===
								"credit_card" ? (
								// For credit cards, show read-only credit_card payment method
								<View style={[styles.paymentSelector, { opacity: 0.7 }]}>
									<TouchableOpacity
										style={[styles.paymentOption, styles.paymentOptionActive]}
										disabled
									>
										<Text style={[styles.paymentText, styles.paymentTextActive]}>
											CREDIT CARD
										</Text>
									</TouchableOpacity>
									<Text
										style={{
											color: theme.textMuted,
											fontSize: 12,
											marginTop: 8,
										}}
									>
										Auto-selected for credit card accounts
									</Text>
								</View>
							) : (
								// For other accounts, show all payment methods
								<View style={styles.paymentSelector}>
									{paymentMethods.map((method) => (
										<TouchableOpacity
											key={method}
											style={[
												styles.paymentOption,
												paymentMethod === method && styles.paymentOptionActive,
											]}
											onPress={() => setPaymentMethod(method)}
										>
											<Text
												style={[
													styles.paymentText,
													paymentMethod === method && styles.paymentTextActive,
												]}
											>
												{method.replace("_", " ").toUpperCase()}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
						</View>

						<TouchableOpacity
							style={[styles.submitButton, submitting && { opacity: 0.6 }]}
							onPress={handleAddTransaction}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>
								{submitting ? "Adding…" : "Add Transaction"}
							</Text>
						</TouchableOpacity>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "90%",
			padding: 20,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		transactionTypeTabs: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		transactionTypeTab: {
			flex: 1,
			paddingVertical: 10,
			alignItems: "center",
			borderRadius: 10,
		},
		transactionTypeTabActive: {
			backgroundColor: theme.primary,
		},
		transactionTypeText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		transactionTypeTextActive: {
			color: "#FFF",
		},
		formGroup: {
			marginBottom: 20,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		amountInput: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 14,
			borderWidth: 1,
			borderColor: theme.border,
		},
		currencySymbol: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			marginRight: 8,
		},
		amountField: {
			flex: 1,
			fontSize: 24,
			fontWeight: "700",
			color: theme.text,
			paddingVertical: 14,
		},
		formInput: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 14,
			fontSize: 16,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		categorySelector: {
			flexDirection: "row",
			gap: 8,
		},
		categoryOption: {
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			minWidth: 80,
			gap: 6,
		},
		categoryText: {
			fontSize: 11,
			color: theme.textMuted,
			fontWeight: "500",
		},
		accountSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		accountOption: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: theme.surface,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: theme.border,
		},
		accountOptionText: {
			fontSize: 14,
			color: theme.text,
			fontWeight: "500",
		},
		addAccountHint: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginTop: 8,
		},
		addAccountHintText: {
			fontSize: 13,
			color: theme.primary,
		},
		paymentSelector: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		paymentOption: {
			paddingVertical: 8,
			paddingHorizontal: 12,
			backgroundColor: theme.surface,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: theme.border,
		},
		paymentOptionActive: {
			backgroundColor: theme.primary + "20",
			borderColor: theme.primary,
		},
		paymentText: {
			fontSize: 11,
			color: theme.textMuted,
			fontWeight: "500",
		},
		paymentTextActive: {
			color: theme.primary,
		},
		submitButton: {
			backgroundColor: theme.primary,
			padding: 16,
			borderRadius: 12,
			alignItems: "center",
			marginTop: 10,
			marginBottom: 20,
		},
		submitButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
		},
	});
