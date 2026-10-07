// Finance category preferences: show/hide built-in categories and manage
// custom ones. Opened from Settings.

import { Alert } from "@/src/components/CustomAlert";
import {
	CategoryKind,
	useFinanceCategoryStore,
} from "@/src/context/financeCategoryStore";
import { Theme } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import {
	COLORS,
	EXPENSE_CATEGORIES,
	INCOME_CATEGORIES,
} from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface Props {
	visible: boolean;
	onClose: () => void;
	theme: Theme;
}

const ICONS = [
	"pricetag",
	"cafe",
	"fast-food",
	"beer",
	"bus",
	"bicycle",
	"fitness",
	"paw",
	"book",
	"musical-notes",
	"film",
	"shirt",
	"phone-portrait",
	"wifi",
	"build",
	"heart",
	"flower",
	"construct",
	"cut",
	"diamond",
	"school",
	"trophy",
	"business",
	"cash",
];

const EXTRA_COLORS = ["#FF9F43", "#00B894", "#6C5CE7", "#636E72"];

interface Draft {
	id: string | null;
	name: string;
	icon: string;
	color: string;
}

export default function FinanceCategorySettings({
	visible,
	onClose,
	theme,
}: Props) {
	const styles = createStyles(theme);
	const categories = useFinanceCategories();
	const { rows, setBuiltinHidden, addCategory, updateCategory, deleteCategory } =
		useFinanceCategoryStore();

	const [kind, setKind] = useState<CategoryKind>("expense");
	const [draft, setDraft] = useState<Draft | null>(null);
	const [saving, setSaving] = useState(false);

	const builtins = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
	const hidden = kind === "expense" ? categories.hiddenExpense : categories.hiddenIncome;
	const custom = rows.filter((r) => !r.isBuiltin && r.type === kind);

	const run = async (fn: () => Promise<void>) => {
		try {
			await fn();
		} catch (e: any) {
			Alert.error(
				"Couldn't save",
				e?.message?.includes("finance_categories")
					? "The categories table isn't set up yet. Run the 20261007_finance_categories.sql migration in Supabase."
					: e?.message || "Please try again.",
			);
		}
	};

	const saveDraft = async () => {
		if (!draft || !draft.name.trim()) {
			Alert.alert("Name required", "Give the category a name.");
			return;
		}
		setSaving(true);
		await run(async () => {
			if (draft.id) {
				await updateCategory(draft.id, {
					name: draft.name,
					icon: draft.icon,
					color: draft.color,
				});
			} else {
				await addCategory({
					type: kind,
					name: draft.name,
					icon: draft.icon,
					color: draft.color,
				});
			}
			setDraft(null);
		});
		setSaving(false);
	};

	const confirmDelete = (id: string, name: string) => {
		Alert.alert(
			"Delete category",
			`Delete "${name}"? Existing transactions keep their amounts but will show as "Other".`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => void run(() => deleteCategory(id)),
				},
			],
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			onRequestClose={draft ? () => setDraft(null) : onClose}
		>
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={draft ? () => setDraft(null) : onClose}>
						<Ionicons
							name={draft ? "chevron-back" : "close"}
							size={26}
							color={theme.text}
						/>
					</TouchableOpacity>
					<Text style={styles.title}>
						{draft
							? draft.id
								? "Edit Category"
								: "New Category"
							: "Finance Categories"}
					</Text>
					<View style={{ width: 26 }} />
				</View>

				{draft ? (
					<KeyboardAvoidingView
						style={{ flex: 1 }}
						behavior={Platform.OS === "ios" ? "padding" : undefined}
					>
						<ScrollView contentContainerStyle={styles.content}>
							<Text style={styles.label}>Name</Text>
							<TextInput
								style={styles.input}
								value={draft.name}
								onChangeText={(name) => setDraft({ ...draft, name })}
								placeholder="e.g. Pets"
								placeholderTextColor={theme.textMuted}
								maxLength={24}
							/>

							<Text style={styles.label}>Icon</Text>
							<View style={styles.grid}>
								{ICONS.map((icon) => (
									<TouchableOpacity
										key={icon}
										style={[
											styles.iconCell,
											draft.icon === icon && {
												borderColor: draft.color,
												backgroundColor: draft.color + "25",
											},
										]}
										onPress={() => setDraft({ ...draft, icon })}
									>
										<Ionicons
											name={icon as any}
											size={22}
											color={draft.icon === icon ? draft.color : theme.textMuted}
										/>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.label}>Color</Text>
							<View style={styles.grid}>
								{[...COLORS, ...EXTRA_COLORS].map((color) => (
									<TouchableOpacity
										key={color}
										style={[
											styles.colorCell,
											{ backgroundColor: color },
											draft.color === color && styles.colorCellActive,
										]}
										onPress={() => setDraft({ ...draft, color })}
									/>
								))}
							</View>

							<TouchableOpacity
								style={[styles.primaryButton, saving && { opacity: 0.6 }]}
								onPress={saveDraft}
								disabled={saving}
							>
								<Text style={styles.primaryButtonText}>
									{saving ? "Saving..." : "Save"}
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</KeyboardAvoidingView>
				) : (
					<ScrollView contentContainerStyle={styles.content}>
						<View style={styles.segment}>
							{(["expense", "income"] as const).map((k) => (
								<TouchableOpacity
									key={k}
									style={[styles.segmentItem, kind === k && styles.segmentActive]}
									onPress={() => setKind(k)}
								>
									<Text
										style={[
											styles.segmentText,
											kind === k && styles.segmentTextActive,
										]}
									>
										{k === "expense" ? "Expense" : "Income"}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={styles.sectionLabel}>YOUR CATEGORIES</Text>
						<View style={styles.card}>
							{custom.map((c) => (
								<View key={c.id} style={styles.row}>
									<View style={[styles.rowIcon, { backgroundColor: c.color + "25" }]}>
										<Ionicons name={c.icon as any} size={18} color={c.color} />
									</View>
									<Text style={styles.rowName} numberOfLines={1}>
										{c.name}
									</Text>
									<TouchableOpacity
										style={styles.rowAction}
										onPress={() =>
											setDraft({ id: c.id, name: c.name, icon: c.icon, color: c.color })
										}
									>
										<Ionicons name="create-outline" size={20} color={theme.textMuted} />
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.rowAction}
										onPress={() => confirmDelete(c.id, c.name)}
									>
										<Ionicons name="trash-outline" size={20} color={theme.error} />
									</TouchableOpacity>
								</View>
							))}
							<TouchableOpacity
								style={styles.row}
								onPress={() =>
									setDraft({
										id: null,
										name: "",
										icon: ICONS[0],
										color: COLORS[0],
									})
								}
							>
								<View style={[styles.rowIcon, { backgroundColor: theme.primary + "20" }]}>
									<Ionicons name="add" size={20} color={theme.primary} />
								</View>
								<Text style={[styles.rowName, { color: theme.primary }]}>
									Add custom category
								</Text>
							</TouchableOpacity>
						</View>

						<Text style={styles.sectionLabel}>BUILT-IN</Text>
						<View style={styles.card}>
							{Object.entries(builtins).map(([key, info]) => {
								const locked = key === "other";
								return (
									<View key={key} style={styles.row}>
										<View
											style={[styles.rowIcon, { backgroundColor: info.color + "25" }]}
										>
											<Ionicons name={info.icon as any} size={18} color={info.color} />
										</View>
										<Text style={styles.rowName} numberOfLines={1}>
											{info.name}
										</Text>
										<Switch
											value={!hidden.has(key)}
											disabled={locked}
											onValueChange={(show) =>
												void run(() => setBuiltinHidden(kind, key, !show))
											}
											trackColor={{ true: theme.primary }}
										/>
									</View>
								);
							})}
						</View>
						<Text style={styles.hint}>
							Hidden categories disappear from pickers but stay on existing
							transactions. "Other" is always available as a fallback.
						</Text>
					</ScrollView>
				)}
			</View>
		</Modal>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: theme.background },
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingTop: 48,
			paddingBottom: 12,
		},
		title: { fontSize: 18, fontWeight: "700", color: theme.text },
		content: { padding: 16, paddingBottom: 48 },
		segment: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			padding: 4,
			marginBottom: 20,
		},
		segmentItem: {
			flex: 1,
			paddingVertical: 10,
			borderRadius: 9,
			alignItems: "center",
		},
		segmentActive: { backgroundColor: theme.primary },
		segmentText: { fontSize: 14, fontWeight: "600", color: theme.textMuted },
		segmentTextActive: { color: "#FFF" },
		sectionLabel: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.textMuted,
			marginBottom: 8,
			marginLeft: 4,
		},
		card: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			marginBottom: 20,
			overflow: "hidden",
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			gap: 12,
		},
		rowIcon: {
			width: 34,
			height: 34,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		rowName: { flex: 1, fontSize: 15, fontWeight: "500", color: theme.text },
		rowAction: { padding: 4 },
		hint: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
		label: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textSecondary,
			marginTop: 16,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: theme.text,
		},
		grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
		iconCell: {
			width: 46,
			height: 46,
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		colorCell: { width: 36, height: 36, borderRadius: 18 },
		colorCellActive: { borderWidth: 3, borderColor: theme.text },
		primaryButton: {
			backgroundColor: theme.primary,
			borderRadius: 14,
			paddingVertical: 14,
			alignItems: "center",
			marginTop: 28,
		},
		primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
	});
