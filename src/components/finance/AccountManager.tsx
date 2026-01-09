// AccountManager - Edit and delete accounts modal
import { Account, COLORS } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
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

interface AccountManagerProps {
	accounts: Account[];
	currency: string;
	theme: any;
	onClose: () => void;
	onEdit?: (account: Account) => void;
	onDelete?: (id: string) => void;
}

export default function AccountManager({
	accounts,
	currency,
	theme,
	onClose,
	onEdit,
	onDelete,
}: AccountManagerProps) {
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [editForm, setEditForm] = useState<{
		name: string;
		type: Account["type"];
		balance: string;
		color: string;
	}>({
		name: "",
		type: "bank",
		balance: "",
		color: COLORS[0],
	});

	const startEdit = (account: Account) => {
		setEditingAccount(account);
		setEditForm({
			name: account.name,
			type: account.type,
			balance:
				account.type === "credit_card"
					? String(account.creditLimit || 0)
					: String(account.balance),
			color: account.color,
		});
	};

	const handleSave = () => {
		if (!editForm.name.trim() || !editingAccount) return;
		const updated: Account = {
			...editingAccount,
			name: editForm.name,
			type: editForm.type,
			color: editForm.color,
		};
		if (editForm.type === "credit_card") {
			updated.creditLimit = parseFloat(editForm.balance) || 0;
		} else {
			updated.balance = parseFloat(editForm.balance) || 0;
		}
		onEdit && onEdit(updated);
		setEditingAccount(null);
	};

	return (
		<Modal visible animationType="slide" transparent>
			<View style={styles(theme).overlay}>
				<View style={styles(theme).container}>
					<View style={styles(theme).header}>
						<Text style={styles(theme).title}>Manage Accounts</Text>
						<TouchableOpacity onPress={onClose}>
							<Ionicons name="close" size={24} color={theme.text} />
						</TouchableOpacity>
					</View>
					<ScrollView>
						{accounts.map((acc) => (
							<View key={acc.id} style={styles(theme).accountRow}>
								<View
									style={[
										styles(theme).icon,
										{
											backgroundColor:
												typeof acc.color === "string"
													? acc.color + "20"
													: acc.color,
										},
									]}
								>
									<Ionicons
										name={
											acc.type === "cash"
												? "cash-outline"
												: acc.type === "credit_card"
												? "card-outline"
												: acc.type === "investment"
												? "trending-up-outline"
												: "wallet-outline"
										}
										size={20}
										color={
											typeof acc.color === "string" ? acc.color : undefined
										}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles(theme).name}>{acc.name}</Text>
									<Text style={styles(theme).type}>
										{acc.type.replace("_", " ")}
									</Text>
									<Text style={styles(theme).balance}>
										{currency}
										{acc.type === "credit_card" ? acc.creditLimit : acc.balance}
									</Text>
								</View>
								<TouchableOpacity
									onPress={() => startEdit(acc)}
									style={styles(theme).editBtn}
								>
									<Ionicons name="pencil" size={18} color={theme.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => onDelete && onDelete(acc.id)}
									style={styles(theme).deleteBtn}
								>
									<Ionicons name="trash" size={18} color={theme.error} />
								</TouchableOpacity>
							</View>
						))}
					</ScrollView>
					{editingAccount && (
						<View style={styles(theme).editModal}>
							<Text style={styles(theme).editTitle}>Edit Account</Text>
							<TextInput
								style={styles(theme).input}
								value={editForm.name}
								onChangeText={(v) => setEditForm({ ...editForm, name: v })}
								placeholder="Account Name"
								placeholderTextColor={theme.textMuted}
							/>
							<TextInput
								style={styles(theme).input}
								value={editForm.balance}
								onChangeText={(v) => setEditForm({ ...editForm, balance: v })}
								placeholder={
									editForm.type === "credit_card" ? "Max Limit" : "Balance"
								}
								placeholderTextColor={theme.textMuted}
								keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
							/>
							<View style={styles(theme).colorRow}>
								{COLORS.map((color) => (
									<TouchableOpacity
										key={color}
										style={[
											styles(theme).colorDot,
											editForm.color === color && styles(theme).colorDotActive,
											{ backgroundColor: color },
										]}
										onPress={() => setEditForm({ ...editForm, color })}
									/>
								))}
							</View>
							<TouchableOpacity
								style={styles(theme).saveBtn}
								onPress={handleSave}
							>
								<Text style={styles(theme).saveText}>Save</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles(theme).cancelBtn}
								onPress={() => setEditingAccount(null)}
							>
								<Text style={styles(theme).cancelText}>Cancel</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}

const styles = (theme: any) =>
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
			padding: 20,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		title: { fontSize: 20, fontWeight: "700", color: theme.text },
		accountRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 18,
		},
		icon: {
			width: 44,
			height: 44,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		name: { fontSize: 15, fontWeight: "600", color: theme.text },
		type: { fontSize: 12, color: theme.textMuted, textTransform: "capitalize" },
		balance: { fontSize: 14, fontWeight: "700", color: theme.text },
		editBtn: { marginHorizontal: 6 },
		deleteBtn: { marginHorizontal: 6 },
		editModal: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			padding: 18,
			marginTop: 10,
		},
		editTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: theme.text,
			marginBottom: 10,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 10,
			padding: 12,
			fontSize: 15,
			color: theme.text,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 12,
		},
		colorRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
		colorDot: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
		colorDotActive: { borderWidth: 2, borderColor: theme.primary },
		saveBtn: {
			backgroundColor: theme.primary,
			padding: 12,
			borderRadius: 10,
			alignItems: "center",
			marginBottom: 8,
		},
		saveText: { color: "#fff", fontWeight: "600", fontSize: 15 },
		cancelBtn: {
			backgroundColor: theme.surface,
			padding: 10,
			borderRadius: 10,
			alignItems: "center",
		},
		cancelText: { color: theme.textMuted, fontWeight: "600", fontSize: 15 },
	});
