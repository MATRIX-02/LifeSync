/**
 * Transaction Prompt Component
 * Shows detected transactions and allows user to add them to finance tracker
 */

import { useFinanceStore } from "@/src/context/financeStoreDB";
import {
	ExpenseCategory,
	IncomeCategory,
} from "@/src/context/financeStoreDB/types";
import { Theme, useTheme } from "@/src/context/themeContext";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import { DetectedTransaction } from "@/src/services/transactionDetection";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/src/types/finance";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	Alert,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface TransactionPromptProps {
	visible: boolean;
	transaction: DetectedTransaction | null;
	onClose: () => void;
	onAdd: () => void;
	currency?: string;
}

export function TransactionPrompt({
	visible,
	transaction,
	onClose,
	onAdd,
	currency = "₹",
}: TransactionPromptProps) {
	const { theme } = useTheme();
	const styles = createStyles(theme);
	const { accounts, addTransaction } = useFinanceStore();
	const { markAsProcessed, dismissTransaction } =
		useTransactionDetectionStore();

	// Form state
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("");
	const [selectedAccountId, setSelectedAccountId] = useState<string>("");
	const [transactionType, setTransactionType] = useState<"income" | "expense">(
		"expense"
	);

	// Update form when transaction changes
	useEffect(() => {
		if (transaction) {
			setAmount(transaction.amount.toString());
			setDescription(transaction.merchant || "");
			setTransactionType(transaction.type === "income" ? "income" : "expense");
			setSelectedCategory(transaction.type === "income" ? "other" : "shopping");

			// Try to find matching account by last 4 digits
			if (transaction.accountNumber) {
				const matchingAccount = accounts.find((acc) =>
					acc.name.includes(transaction.accountNumber!)
				);
				if (matchingAccount) {
					setSelectedAccountId(matchingAccount.id);
				}
			}
		}
	}, [transaction, accounts]);

	if (!transaction) return null;

	const categories =
		transactionType === "expense"
			? Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => ({
					key,
					label: val.name,
					...val,
			  }))
			: Object.entries(INCOME_CATEGORIES).map(([key, val]) => ({
					key,
					label: val.name,
					...val,
			  }));

	const handleAdd = () => {
		const amountNum = parseFloat(amount);
		if (isNaN(amountNum) || amountNum <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}

		const today = new Date().toISOString().split("T")[0];

		addTransaction({
			type: transactionType,
			amount: amountNum,
			category: selectedCategory as ExpenseCategory | IncomeCategory,
			description: description.trim() || "",
			date: today,
			time: new Date().toTimeString().split(" ")[0],
			accountId: selectedAccountId || "",
			paymentMethod: "upi",
			isRecurring: false,
			notes: `Auto-detected from ${
				transaction.source === "notification"
					? transaction.sourceApp
					: "bank SMS"
			}`,
		});

		markAsProcessed(transaction.id);
		onAdd();
		Alert.alert("Success", "Transaction added to tracker!");
	};

	const handleDismiss = () => {
		dismissTransaction(transaction.id);
		onClose();
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDate = (date: Date) => {
		const today = new Date();
		const isToday = date.toDateString() === today.toDateString();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const isYesterday = date.toDateString() === yesterday.toDateString();

		if (isToday) return `Today, ${formatTime(date)}`;
		if (isYesterday) return `Yesterday, ${formatTime(date)}`;
		return date.toLocaleDateString("en-IN", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<Modal visible={visible} transparent animationType="slide">
			<View style={styles.overlay}>
				<View style={styles.container}>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<View
								style={[
									styles.sourceIcon,
									{
										backgroundColor:
											transaction.type === "income"
												? theme.success + "20"
												: theme.error + "20",
									},
								]}
							>
								<Ionicons
									name={
										transaction.source === "notification"
											? "notifications"
											: "mail"
									}
									size={20}
									color={
										transaction.type === "income" ? theme.success : theme.error
									}
								/>
							</View>
							<View>
								<Text style={styles.headerTitle}>
									{transaction.type === "income"
										? "Money Received"
										: "Payment Detected"}
								</Text>
								<Text style={styles.headerSubtitle}>
									{transaction.source === "notification"
										? `via ${transaction.sourceApp}`
										: `from ${transaction.bankName || "Bank"}`}
								</Text>
							</View>
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color={theme.textMuted} />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.content}
						showsVerticalScrollIndicator={false}
					>
						{/* Amount */}
						<View style={styles.amountSection}>
							<Text
								style={[
									styles.amountText,
									{
										color:
											transaction.type === "income"
												? theme.success
												: theme.error,
									},
								]}
							>
								{transaction.type === "income" ? "+" : "-"}
								{currency}
								{transaction.amount.toLocaleString("en-IN")}
							</Text>
							<Text style={styles.timeText}>
								{formatDate(new Date(transaction.timestamp))}
							</Text>
						</View>

						{/* Merchant Info */}
						{transaction.merchant && (
							<View style={styles.merchantSection}>
								<Ionicons
									name="storefront-outline"
									size={18}
									color={theme.textMuted}
								/>
								<Text style={styles.merchantText}>{transaction.merchant}</Text>
							</View>
						)}

						{/* Reference */}
						{transaction.referenceId && (
							<View style={styles.refSection}>
								<Text style={styles.refLabel}>Ref:</Text>
								<Text style={styles.refValue}>{transaction.referenceId}</Text>
							</View>
						)}

						{/* Editable Form */}
						<View style={styles.formSection}>
							<Text style={styles.sectionTitle}>Add to Tracker</Text>

							{/* Transaction Type Toggle */}
							<View style={styles.typeToggle}>
								<TouchableOpacity
									style={[
										styles.typeButton,
										transactionType === "expense" && {
											backgroundColor: theme.error + "20",
										},
									]}
									onPress={() => setTransactionType("expense")}
								>
									<Ionicons
										name="arrow-up-outline"
										size={16}
										color={
											transactionType === "expense"
												? theme.error
												: theme.textMuted
										}
									/>
									<Text
										style={[
											styles.typeButtonText,
											transactionType === "expense" && { color: theme.error },
										]}
									>
										Expense
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.typeButton,
										transactionType === "income" && {
											backgroundColor: theme.success + "20",
										},
									]}
									onPress={() => setTransactionType("income")}
								>
									<Ionicons
										name="arrow-down-outline"
										size={16}
										color={
											transactionType === "income"
												? theme.success
												: theme.textMuted
										}
									/>
									<Text
										style={[
											styles.typeButtonText,
											transactionType === "income" && { color: theme.success },
										]}
									>
										Income
									</Text>
								</TouchableOpacity>
							</View>

							{/* Amount Input */}
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Amount</Text>
								<TextInput
									style={styles.input}
									value={amount}
									onChangeText={setAmount}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor={theme.textMuted}
								/>
							</View>

							{/* Description Input */}
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Description</Text>
								<TextInput
									style={styles.input}
									value={description}
									onChangeText={setDescription}
									placeholder="Add description..."
									placeholderTextColor={theme.textMuted}
								/>
							</View>

							{/* Category Selection */}
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Category</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.categoryScroll}
								>
									{categories.map((cat) => (
										<TouchableOpacity
											key={cat.key}
											style={[
												styles.categoryChip,
												selectedCategory === cat.key && {
													backgroundColor: cat.color + "20",
													borderColor: cat.color,
												},
											]}
											onPress={() => setSelectedCategory(cat.key)}
										>
											<Ionicons
												name={cat.icon as any}
												size={16}
												color={
													selectedCategory === cat.key
														? cat.color
														: theme.textMuted
												}
											/>
											<Text
												style={[
													styles.categoryChipText,
													selectedCategory === cat.key && { color: cat.color },
												]}
											>
												{cat.label}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>

							{/* Account Selection */}
							{accounts.length > 0 && (
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Account</Text>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										style={styles.accountScroll}
									>
										<TouchableOpacity
											style={[
												styles.accountChip,
												!selectedAccountId && {
													backgroundColor: theme.primary + "20",
													borderColor: theme.primary,
												},
											]}
											onPress={() => setSelectedAccountId("")}
										>
											<Text
												style={[
													styles.accountChipText,
													!selectedAccountId && { color: theme.primary },
												]}
											>
												None
											</Text>
										</TouchableOpacity>
										{accounts.map((acc) => (
											<TouchableOpacity
												key={acc.id}
												style={[
													styles.accountChip,
													selectedAccountId === acc.id && {
														backgroundColor: theme.primary + "20",
														borderColor: theme.primary,
													},
												]}
												onPress={() => setSelectedAccountId(acc.id)}
											>
												<Ionicons
													name={acc.icon as any}
													size={14}
													color={
														selectedAccountId === acc.id
															? theme.primary
															: theme.textMuted
													}
												/>
												<Text
													style={[
														styles.accountChipText,
														selectedAccountId === acc.id && {
															color: theme.primary,
														},
													]}
												>
													{acc.name}
												</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							)}
						</View>
					</ScrollView>

					{/* Actions */}
					<View style={styles.actions}>
						<TouchableOpacity
							style={styles.dismissButton}
							onPress={handleDismiss}
						>
							<Ionicons
								name="close-outline"
								size={20}
								color={theme.textMuted}
							/>
							<Text style={styles.dismissButtonText}>Dismiss</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.addButton} onPress={handleAdd}>
							<Ionicons name="add" size={20} color="#fff" />
							<Text style={styles.addButtonText}>Add Transaction</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

/**
 * Floating notification badge for pending transactions
 */
interface PendingTransactionsBadgeProps {
	onPress: () => void;
}

export function PendingTransactionsBadge({
	onPress,
}: PendingTransactionsBadgeProps) {
	const { theme } = useTheme();
	const { pendingTransactions, settings } = useTransactionDetectionStore();

	if (Platform.OS !== "android" || pendingTransactions.length === 0) {
		return null;
	}

	const total = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

	return (
		<TouchableOpacity
			style={[styles.badge, { backgroundColor: theme.primary }]}
			onPress={onPress}
		>
			<Ionicons name="flash" size={18} color="#fff" />
			<View style={styles.badgeContent}>
				<Text style={styles.badgeCount}>
					{pendingTransactions.length} detected
				</Text>
				<Text style={styles.badgeAmount}>₹{total.toLocaleString("en-IN")}</Text>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	badge: {
		position: "absolute",
		bottom: 20,
		right: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	badgeContent: {
		gap: 2,
	},
	badgeCount: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	badgeAmount: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
	},
});

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
			justifyContent: "flex-end",
		},
		container: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "90%",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		sourceIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: "center",
			justifyContent: "center",
		},
		headerTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		headerSubtitle: {
			fontSize: 13,
			color: theme.textMuted,
		},
		closeButton: {
			padding: 8,
		},
		content: {
			padding: 16,
		},
		amountSection: {
			alignItems: "center",
			paddingVertical: 20,
		},
		amountText: {
			fontSize: 36,
			fontWeight: "700",
		},
		timeText: {
			fontSize: 13,
			color: theme.textMuted,
			marginTop: 4,
		},
		merchantSection: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.surface,
			padding: 12,
			borderRadius: 12,
			marginBottom: 8,
		},
		merchantText: {
			fontSize: 14,
			color: theme.text,
			flex: 1,
		},
		refSection: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 8,
			marginBottom: 16,
		},
		refLabel: {
			fontSize: 12,
			color: theme.textMuted,
		},
		refValue: {
			fontSize: 12,
			color: theme.textSecondary,
			fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
		},
		formSection: {
			gap: 16,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.textSecondary,
			marginBottom: 8,
		},
		typeToggle: {
			flexDirection: "row",
			gap: 8,
		},
		typeButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: theme.surface,
		},
		typeButtonText: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.textMuted,
		},
		inputGroup: {
			gap: 6,
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: "500",
			color: theme.textSecondary,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
		},
		categoryScroll: {
			marginHorizontal: -16,
			paddingHorizontal: 16,
		},
		categoryChip: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 20,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			marginRight: 8,
		},
		categoryChipText: {
			fontSize: 13,
			color: theme.textMuted,
		},
		accountScroll: {
			marginHorizontal: -16,
			paddingHorizontal: 16,
		},
		accountChip: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 20,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			marginRight: 8,
		},
		accountChipText: {
			fontSize: 13,
			color: theme.textMuted,
		},
		actions: {
			flexDirection: "row",
			gap: 12,
			padding: 16,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		dismissButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 14,
			borderRadius: 12,
			backgroundColor: theme.surface,
		},
		dismissButtonText: {
			fontSize: 15,
			fontWeight: "500",
			color: theme.textMuted,
		},
		addButton: {
			flex: 2,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 14,
			borderRadius: 12,
			backgroundColor: theme.primary,
		},
		addButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#fff",
		},
	});
