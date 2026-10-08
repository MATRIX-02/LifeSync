/**
 * Transaction Prompt Component
 * Shows detected transactions and allows user to add them to finance tracker
 */

import { Alert } from "@/src/components/CustomAlert";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme, useTheme } from "@/src/context/themeContext";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { DetectedTransaction } from "@/src/services/transactionDetection";
import {
	getAccountLinks,
	learnCategory,
	linkDigits,
	resolveAccount,
	suggestCategory,
} from "@/src/services/transactionDetection/accountLinks";
import type { PaymentMethod } from "@/src/types/finance";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
	const insets = useSafeAreaInsets();
	const financeCategories = useFinanceCategories();
	const { accounts, addTransaction, updateAccount } = useFinanceStore();
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
	// Offer to remember "••1234 is this account" for next time.
	const [needsLink, setNeedsLink] = useState(false);
	const [rememberLink, setRememberLink] = useState(true);
	const [saving, setSaving] = useState(false);

	// Pre-fill from the detection: linked account, suggested category.
	// Re-runs only for a different detection, not on every store update.
	useEffect(() => {
		if (!transaction) return;
		let cancelled = false;
		const type = transaction.type === "income" ? "income" : "expense";
		setAmount(transaction.amount.toString());
		setDescription(transaction.merchant || "");
		setTransactionType(type);
		setRememberLink(true);
		setSaving(false);
		(async () => {
			const links = await getAccountLinks();
			const resolved = resolveAccount(transaction, accounts, links);
			const allowed = (
				type === "income"
					? financeCategories.incomeOptions
					: financeCategories.expenseOptions
			).map((c) => c.key);
			const category = await suggestCategory(transaction, allowed);
			if (cancelled) return;
			setSelectedAccountId(resolved.accountId);
			setNeedsLink(resolved.needsLink);
			setSelectedCategory(category);
		})();
		return () => {
			cancelled = true;
		};
	}, [transaction?.id, accounts.length]);

	if (!transaction) return null;

	const categories = (
		transactionType === "expense"
			? financeCategories.expenseOptions
			: financeCategories.incomeOptions
	).map((c) => ({ ...c, label: c.name }));

	const handleAdd = async () => {
		const amountNum = parseFloat(amount);
		if (isNaN(amountNum) || amountNum <= 0) {
			Alert.alert("Error", "Please enter a valid amount");
			return;
		}
		if (!selectedAccountId) {
			Alert.alert("Pick an account", "Choose which account this payment belongs to.");
			return;
		}

		// When the payment happened, in local time - not when it was reviewed.
		const at = new Date(transaction.timestamp);
		const pad = (n: number) => String(n).padStart(2, "0");
		const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
		const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;

		const fromUpiApp =
			transaction.source === "notification" &&
			!!transaction.sourceApp &&
			!["SMS", "Test"].includes(transaction.sourceApp) &&
			!transaction.bankName;
		const paymentMethod: PaymentMethod =
			transaction.cardType ??
			(fromUpiApp || /\bupi\b/i.test(transaction.rawText) ? "upi" : "net_banking");

		setSaving(true);
		try {
			await addTransaction({
				type: transactionType,
				amount: amountNum,
				category: selectedCategory,
				description: description.trim() || "",
				date,
				time,
				accountId: selectedAccountId,
				paymentMethod,
				isRecurring: false,
				note: `Auto-detected from ${
					fromUpiApp ? transaction.sourceApp : `${transaction.bankName ?? "bank"} alert`
				}`,
			});
			if (needsLink && rememberLink && transaction.accountNumber) {
				const digits = transaction.accountNumber;
				// Saved on the account itself (database, syncs across devices) and
				// moved off any other account that listed the same digits...
				for (const acc of accounts) {
					const has = acc.linkedDigits?.includes(digits) ?? false;
					if (acc.id === selectedAccountId && !has) {
						await updateAccount(acc.id, {
							linkedDigits: [...(acc.linkedDigits ?? []), digits],
						});
					} else if (acc.id !== selectedAccountId && has) {
						await updateAccount(acc.id, {
							linkedDigits: acc.linkedDigits!.filter((d) => d !== digits),
						});
					}
				}
				// ...and on this phone, which still works before the
				// linked_digits migration has been run.
				await linkDigits(digits, selectedAccountId);
			}
			await learnCategory({ ...transaction, type: transactionType }, selectedCategory);
			await markAsProcessed(transaction.id);
			onAdd();
		} catch (error: any) {
			Alert.error("Couldn't add", error?.message || "Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleDismiss = async () => {
		await dismissTransaction(transaction.id);
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
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
						keyboardShouldPersistTaps="handled"
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
								{transaction.amount.toLocaleString("en-IN", {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2,
								})}
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
									keyboardType={
										Platform.OS === "ios" ? "decimal-pad" : "numeric"
									}
									placeholder="0.00"
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
									contentContainerStyle={styles.chipRow}
									keyboardShouldPersistTaps="handled"
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
										contentContainerStyle={styles.chipRow}
										keyboardShouldPersistTaps="handled"
									>
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
									{needsLink && transaction.accountNumber && selectedAccountId ? (
										<TouchableOpacity
											style={styles.linkRow}
											onPress={() => setRememberLink((v) => !v)}
										>
											<Ionicons
												name={rememberLink ? "checkbox" : "square-outline"}
												size={20}
												color={rememberLink ? theme.primary : theme.textMuted}
											/>
											<Text style={styles.linkText}>
												Always use this account for ••{transaction.accountNumber}
											</Text>
										</TouchableOpacity>
									) : null}
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
							<Text style={styles.dismissButtonText}>Ignore</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.addButton, saving && { opacity: 0.6 }]}
							onPress={handleAdd}
							disabled={saving}
						>
							<Ionicons name="add" size={20} color="#fff" />
							<Text style={styles.addButtonText}>
								{saving ? "Adding..." : "Add Transaction"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
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
				<Text style={styles.badgeAmount}>
					₹
					{total.toLocaleString("en-IN", {
						minimumFractionDigits: 0,
						maximumFractionDigits: 2,
					})}
				</Text>
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
		// Without these the ScrollView takes its full content height and pushes
		// the actions past maxHeight instead of scrolling between header and
		// buttons.
		content: {
			flexGrow: 0,
			flexShrink: 1,
			padding: 16,
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
		// Full-bleed chip rows. The padding goes on the content, not the
		// ScrollView, or the last chip scrolls to a hard edge with no gutter.
		categoryScroll: {
			marginHorizontal: -16,
		},
		chipRow: {
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
		linkRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginTop: 10,
		},
		linkText: {
			fontSize: 13,
			color: theme.textSecondary,
			flex: 1,
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
