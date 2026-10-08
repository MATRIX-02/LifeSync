import { Alert } from "@/src/components/CustomAlert";
import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { GroupMember } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";

// Add Expense Modal
interface AddExpenseModalProps {
	visible: boolean;
	onClose: () => void;
	onAdd: () => void;
	expenseForm: {
		description: string;
		amount: string;
		paidBy: string;
		category: string;
		splitType: "equal" | "exact" | "percentage" | "shares";
		customSplits: { [memberId: string]: string };
	};
	setExpenseForm: React.Dispatch<
		React.SetStateAction<{
			description: string;
			amount: string;
			paidBy: string;
			category: string;
			splitType: "equal" | "exact" | "percentage" | "shares";
			customSplits: { [memberId: string]: string };
		}>
	>;
	members: GroupMember[];
	theme: Theme;
	currency: string;
	styles: any;
	getInitials: (name: string) => string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
	visible,
	onClose,
	onAdd,
	expenseForm,
	setExpenseForm,
	members,
	theme,
	currency,
	styles,
	getInitials,
}) => {
	// Same category list as the rest of Money Hub (custom + hidden built-ins).
	const categories = useFinanceCategories();
	const amount = parseFloat(expenseForm.amount) || 0;
	const splitAmount = members.length > 0 ? amount / members.length : 0;

	// Helpers for parsing
	const parseNum = (v: string) => {
		const n = parseFloat(v);
		return isNaN(n) ? 0 : n;
	};

	const handleExactChange = (memberId: string, text: string) => {
		// clamp input to not exceed amount when possible and auto-fill for two members
		const updated = { ...expenseForm.customSplits, [memberId]: text };
		const vals = members.map((m) => ({
			id: m.id,
			v: parseNum(updated[m.id] || "0"),
		}));
		const totalEntered = vals.reduce((s, x) => s + x.v, 0);
		// If only two members, auto-fill the other
		if (members.length === 2) {
			const other = members.find((m) => m.id !== memberId)!;
			let edited = parseNum(text);
			if (edited > amount) edited = amount;
			const otherVal = Math.max(0, Math.round((amount - edited) * 100) / 100);
			setExpenseForm((prev) => ({
				...prev,
				customSplits: {
					...prev.customSplits,
					[memberId]: edited.toString(),
					[other.id]: otherVal.toFixed(2),
				},
			}));
			return;
		}

		// For >2 members, just clamp edited value so total doesn't exceed amount
		const editedVal = parseNum(text);
		const sumOthers = vals.reduce(
			(s, x) => s + (x.id === memberId ? 0 : x.v),
			0,
		);
		let newEdited = editedVal;
		if (sumOthers + newEdited > amount)
			newEdited = Math.max(0, amount - sumOthers);
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: newEdited.toFixed(2),
			},
		}));
	};

	const handlePercentageChange = (memberId: string, text: string) => {
		const updated = { ...expenseForm.customSplits, [memberId]: text };
		const vals = members.map((m) => ({
			id: m.id,
			v: parseNum(updated[m.id] || "0"),
		}));
		const totalEntered = vals.reduce((s, x) => s + x.v, 0);
		if (members.length === 2) {
			const other = members.find((m) => m.id !== memberId)!;
			let edited = parseNum(text);
			if (edited > 100) edited = 100;
			const otherVal = Math.max(0, Math.round((100 - edited) * 100) / 100);
			setExpenseForm((prev) => ({
				...prev,
				customSplits: {
					...prev.customSplits,
					[memberId]: edited.toString(),
					[other.id]: otherVal.toString(),
				},
			}));
			return;
		}

		// For >2, clamp to not exceed 100
		let editedVal = parseNum(text);
		const sumOthers = vals.reduce(
			(s, x) => s + (x.id === memberId ? 0 : x.v),
			0,
		);
		if (sumOthers + editedVal > 100) editedVal = Math.max(0, 100 - sumOthers);
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: editedVal.toString(),
			},
		}));
	};

	const handleSharesChange = (memberId: string, text: string) => {
		// shares must be non-negative integers or decimals; leave as entered but ensure >=0
		let edited = parseNum(text);
		if (edited < 0) edited = 0;
		setExpenseForm((prev) => ({
			...prev,
			customSplits: {
				...prev.customSplits,
				[memberId]: String(edited),
			},
		}));
	};

	const validateAndAdd = () => {
		// Perform final validation: amount>0 & paidBy set handled by parent, but ensure splits sum correctly
		if (expenseForm.splitType === "exact") {
			const total = members.reduce(
				(s, m) => s + parseNum(expenseForm.customSplits[m.id] || "0"),
				0,
			);
			if (Math.abs(total - amount) > 0.005) {
				Alert.alert("Error", "Exact splits must add up to the total amount");
				return;
			}
		} else if (expenseForm.splitType === "percentage") {
			const total = members.reduce(
				(s, m) => s + parseNum(expenseForm.customSplits[m.id] || "0"),
				0,
			);
			if (Math.abs(total - 100) > 0.01) {
				Alert.alert("Error", "Percentages must add up to 100%");
				return;
			}
		} else if (expenseForm.splitType === "shares") {
			const totalShares = members.reduce(
				(s, m) => s + (parseNum(expenseForm.customSplits[m.id] || "1") || 0),
				0,
			);
			if (totalShares <= 0) {
				Alert.alert("Error", "Total shares must be greater than zero");
				return;
			}
		}

		// All good — call parent add handler
		onAdd();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.sheetOverlay}>
				{/* Backdrop is a sibling of the sheet, so it cannot claim the
				    touch responder and swallow the sheet's own scrolls. */}
				<TouchableWithoutFeedback onPress={onClose}>
					<View style={StyleSheet.absoluteFill} />
				</TouchableWithoutFeedback>

				<View style={styles.sheetContainer}>
					<View style={styles.sheetHeader}>
						<TouchableOpacity onPress={onClose}>
							<Text style={styles.modalCancel}>Cancel</Text>
						</TouchableOpacity>
						<Text style={styles.modalTitle}>Add Expense</Text>
						<TouchableOpacity onPress={validateAndAdd}>
							<Text style={styles.modalSave}>Add</Text>
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false}>
						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Description</Text>
							<TextInput
								style={styles.formInput}
								placeholder="e.g., Dinner, Groceries, Uber"
								placeholderTextColor={theme.textMuted}
								value={expenseForm.description}
								onChangeText={(text) =>
									setExpenseForm((prev) => ({ ...prev, description: text }))
								}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Amount</Text>
							<View style={styles.amountInputContainer}>
								<Text style={styles.currencyPrefix}>{currency}</Text>
								<TextInput
									style={styles.amountInput}
									placeholder="0.00"
									placeholderTextColor={theme.textMuted}
									value={expenseForm.amount}
									onChangeText={(text) =>
										setExpenseForm((prev) => ({ ...prev, amount: text }))
									}
									keyboardType="decimal-pad"
								/>
							</View>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Paid By</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{members.map((member) => (
									<TouchableOpacity
										key={member.id}
										style={[
											styles.payerOption,
											expenseForm.paidBy === member.id &&
												styles.payerOptionSelected,
										]}
										onPress={() =>
											setExpenseForm((prev) => ({ ...prev, paidBy: member.id }))
										}
									>
										<View
											style={[
												styles.payerAvatar,
												expenseForm.paidBy === member.id &&
													styles.payerAvatarSelected,
											]}
										>
											<Text
												style={[
													styles.payerInitial,
													expenseForm.paidBy === member.id &&
														styles.payerInitialSelected,
												]}
											>
												{getInitials(member.name)}
											</Text>
										</View>
										<Text
											style={[
												styles.payerName,
												expenseForm.paidBy === member.id &&
													styles.payerNameSelected,
											]}
										>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Category</Text>
							<View style={styles.categoryGrid}>
								{categories.expenseOptions.map((cat) => (
									<TouchableOpacity
										key={cat.key}
										style={[
											styles.categoryOption,
											expenseForm.category === cat.key && {
												borderColor: theme.primary,
												backgroundColor: theme.primary + "10",
											},
										]}
										onPress={() =>
											setExpenseForm((prev) => ({
												...prev,
												category: cat.key,
											}))
										}
									>
										<Ionicons
											name={cat.icon as any}
											size={20}
											color={
												expenseForm.category === cat.key
													? theme.primary
													: theme.textSecondary
											}
										/>
										<Text
											style={[
												styles.categoryLabel,
												expenseForm.category === cat.key && {
													color: theme.primary,
												},
											]}
										>
											{cat.name}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.formLabel}>Split Type</Text>
							<View style={styles.splitTypeRow}>
								{(["equal", "exact", "percentage", "shares"] as const).map(
									(type) => (
										<TouchableOpacity
											key={type}
											style={[
												styles.splitTypeOption,
												expenseForm.splitType === type &&
													styles.splitTypeOptionSelected,
											]}
											onPress={() =>
												setExpenseForm((prev) => ({ ...prev, splitType: type }))
											}
										>
											<Text
												style={[
													styles.splitTypeText,
													expenseForm.splitType === type &&
														styles.splitTypeTextSelected,
												]}
											>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</Text>
										</TouchableOpacity>
									),
								)}
							</View>
						</View>

						{expenseForm.splitType === "equal" && amount > 0 && (
							<View style={styles.splitPreview}>
								<Text style={styles.splitPreviewTitle}>Split Preview</Text>
								{members.map((member) => (
									<View key={member.id} style={styles.splitPreviewRow}>
										<Text style={styles.splitPreviewName}>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
										<Text style={styles.splitPreviewAmount}>
											{currency}
											{splitAmount.toFixed(2)}
										</Text>
									</View>
								))}
							</View>
						)}

						{expenseForm.splitType === "exact" && (
							<View style={styles.customSplits}>
								<Text style={styles.customSplitsTitle}>Exact Amounts</Text>
								{members.map((member) => (
									<View key={member.id} style={styles.customSplitRow}>
										<Text style={styles.customSplitName}>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
										<View style={styles.customSplitInput}>
											<Text style={styles.customSplitCurrency}>{currency}</Text>
											<TextInput
												style={styles.customSplitField}
												placeholder="0.00"
												placeholderTextColor={theme.textMuted}
												value={expenseForm.customSplits[member.id] || ""}
												onChangeText={(text) =>
													handleExactChange(member.id, text)
												}
												keyboardType="decimal-pad"
											/>
										</View>
									</View>
								))}
							</View>
						)}

						{expenseForm.splitType === "percentage" && (
							<View style={styles.customSplits}>
								<Text style={styles.customSplitsTitle}>Percentages</Text>
								{members.map((member) => (
									<View key={member.id} style={styles.customSplitRow}>
										<Text style={styles.customSplitName}>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
										<View style={styles.customSplitInput}>
											<TextInput
												style={styles.customSplitField}
												placeholder="0"
												placeholderTextColor={theme.textMuted}
												value={expenseForm.customSplits[member.id] || ""}
												onChangeText={(text) =>
													handlePercentageChange(member.id, text)
												}
												keyboardType={
													Platform.OS === "ios" ? "decimal-pad" : "numeric"
												}
											/>
											<Text style={styles.customSplitCurrency}>%</Text>
										</View>
									</View>
								))}
							</View>
						)}

						{expenseForm.splitType === "shares" && (
							<View style={styles.customSplits}>
								<Text style={styles.customSplitsTitle}>
									Shares (e.g., 2 shares = 2x)
								</Text>
								{members.map((member) => (
									<View key={member.id} style={styles.customSplitRow}>
										<Text style={styles.customSplitName}>
											{member.isCurrentUser ? "You" : member.name}
										</Text>
										<View style={styles.customSplitInput}>
											<TextInput
												style={styles.customSplitField}
												placeholder="1"
												placeholderTextColor={theme.textMuted}
												value={expenseForm.customSplits[member.id] || "1"}
												onChangeText={(text) =>
													handleSharesChange(member.id, text)
												}
												keyboardType="number-pad"
											/>
											<Text style={styles.customSplitCurrency}>shares</Text>
										</View>
									</View>
								))}
							</View>
						)}

						<View style={{ height: 50 }} />
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};
