import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import { scanReceipt } from "@/src/services/receiptScan";
import { ExpenseInput, generateId } from "@/src/services/splitwiseService";
import { computeSplits, FREQUENCY_LABELS, round2 } from "@/src/services/splitwiseMath";
import {
	ReceiptItem,
	RecurringFrequency,
	SplitExpense,
	SplitGroup,
	SplitType,
} from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Avatar, Chip, Label, money, Sheet } from "./ui";

const SPLIT_TYPES: { type: SplitType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
	{ type: "equal", label: "Equally", icon: "git-compare-outline" },
	{ type: "exact", label: "Amounts", icon: "cash-outline" },
	{ type: "percentage", label: "Percent", icon: "pie-chart-outline" },
	{ type: "shares", label: "Shares", icon: "layers-outline" },
	{ type: "itemized", label: "Items", icon: "list-outline" },
];

type Repeat = "never" | RecurringFrequency;

interface Props {
	visible: boolean;
	group: SplitGroup | null;
	/** Set to edit; null to add. */
	expense: SplitExpense | null;
	currency: string;
	onClose: () => void;
	/** Returns an error message, or null on success. */
	onSubmit: (input: ExpenseInput, repeat: RecurringFrequency | null) => Promise<string | null>;
}

export function ExpenseFormModal({ visible, group, expense, currency, onClose, onSubmit }: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const members = group?.members ?? [];
	const memberIds = members.map((m) => m.id);
	const me = members.find((m) => m.isCurrentUser);
	const nameOf = (id: string) => {
		const m = members.find((x) => x.id === id);
		return m?.isCurrentUser ? "You" : m?.name ?? "?";
	};

	const [description, setDescription] = useState("");
	const [amountText, setAmountText] = useState("");
	const [category, setCategory] = useState("other");
	const [note, setNote] = useState("");
	const [multiPay, setMultiPay] = useState(false);
	const [paidBy, setPaidBy] = useState("");
	const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});
	const [splitType, setSplitType] = useState<SplitType>("equal");
	const [values, setValues] = useState<Record<string, string>>({});
	const [included, setIncluded] = useState<string[]>([]);
	const [items, setItems] = useState<ReceiptItem[]>([]);
	const [extraText, setExtraText] = useState("");
	const [repeat, setRepeat] = useState<Repeat>("never");
	const [scanning, setScanning] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showCategories, setShowCategories] = useState(false);

	// Reset every time the sheet opens.
	useEffect(() => {
		if (!visible || !group) return;
		if (expense) {
			setDescription(expense.description);
			setAmountText(String(expense.amount));
			setCategory(expense.category);
			setNote(expense.note ?? "");
			const multi = (expense.payers?.length ?? 0) > 1;
			setMultiPay(multi);
			setPaidBy(expense.paidBy);
			setPayerAmounts(
				Object.fromEntries((expense.payers ?? []).map((p) => [p.memberId, String(p.amount)])),
			);
			setSplitType(expense.splitType);
			setIncluded(expense.splits.map((x) => x.memberId));
			setValues(
				Object.fromEntries(
					expense.splits.map((x) => [
						x.memberId,
						expense.splitType === "percentage"
							? String(x.percentage ?? round2((x.amount / expense.amount) * 100))
							: expense.splitType === "shares"
								? String(x.shares ?? 1)
								: String(x.amount),
					]),
				),
			);
			setItems(expense.items ?? []);
			setExtraText(expense.extraCharges ? String(expense.extraCharges) : "");
		} else {
			const def = group.settings?.defaultSplit;
			setDescription("");
			setAmountText("");
			setCategory("other");
			setNote("");
			setMultiPay(false);
			setPaidBy(me?.id ?? memberIds[0] ?? "");
			setPayerAmounts({});
			setSplitType(def?.type && def.type !== "itemized" ? def.type : "equal");
			setValues(def?.values ?? {});
			setIncluded(memberIds);
			setItems([]);
			setExtraText("");
		}
		setRepeat("never");
		setShowCategories(false);
	}, [visible, expense?.id, group?.id]);

	const itemsTotal = round2(
		items.reduce((sum, it) => sum + it.price, 0) + (parseFloat(extraText) || 0),
	);
	const amount = splitType === "itemized" ? itemsTotal : parseFloat(amountText) || 0;

	// Live preview of who owes what, and the validation message if any.
	const preview = useMemo(() => {
		if (amount <= 0) return null;
		return computeSplits(splitType, amount, memberIds, values, {
			included,
			items,
			extraCharges: parseFloat(extraText) || 0,
		});
	}, [amount, splitType, values, included, items, extraText, memberIds.join()]);

	const payerTotal = round2(
		memberIds.reduce((sum, id) => sum + (parseFloat(payerAmounts[id] ?? "") || 0), 0),
	);

	const handleScan = async (source: "camera" | "library") => {
		setScanning(true);
		const result = await scanReceipt(source);
		setScanning(false);
		if (!result.ok) {
			if (result.code !== "cancelled") Alert.error("Couldn't scan", result.message);
			return;
		}
		const { receipt } = result;
		setItems(
			receipt.items.map((it) => ({ id: generateId(), name: it.name, price: it.price, memberIds })),
		);
		setExtraText(receipt.extraCharges ? String(receipt.extraCharges) : "");
		if (!description.trim() && receipt.merchant) setDescription(receipt.merchant);
		setSplitType("itemized");
	};

	const submit = async () => {
		if (!group) return;
		if (!description.trim()) return Alert.warning("Add a description", "What was this expense for?");
		if (amount <= 0) return Alert.warning("Add an amount", "Enter how much was spent.");
		if (!preview || !preview.ok) {
			return Alert.warning("Check the split", preview && !preview.ok ? preview.error : "");
		}

		let payers: { memberId: string; amount: number }[] | undefined;
		if (multiPay) {
			payers = memberIds
				.map((id) => ({ memberId: id, amount: round2(parseFloat(payerAmounts[id] ?? "") || 0) }))
				.filter((p) => p.amount > 0);
			if (Math.abs(payerTotal - amount) > 0.005) {
				return Alert.warning(
					"Check who paid",
					`Payments add up to ${money(payerTotal, currency)}, but the total is ${money(amount, currency)}.`,
				);
			}
			if (payers.length === 1) payers = undefined;
		}
		if (!multiPay && !paidBy) return Alert.warning("Who paid?", "Choose who paid for this.");

		const input: ExpenseInput = {
			description: description.trim(),
			amount: round2(amount),
			category,
			paidBy: multiPay
				? payers?.[0]?.memberId ??
					memberIds.find((id) => (parseFloat(payerAmounts[id] ?? "") || 0) > 0)!
				: paidBy,
			payers,
			date: expense?.date ?? new Date().toISOString(),
			splitType,
			splits: preview.splits.map((x) => ({
				...x,
				isPaid: false,
				...(splitType === "percentage" ? { percentage: parseFloat(values[x.memberId]) || 0 } : {}),
				...(splitType === "shares" ? { shares: parseFloat(values[x.memberId] ?? "1") || 1 } : {}),
			})),
			note: note.trim() || undefined,
			items: splitType === "itemized" ? items : undefined,
			extraCharges: splitType === "itemized" ? parseFloat(extraText) || 0 : undefined,
			isSettled: false,
		};

		setSaving(true);
		const error = await onSubmit(input, repeat === "never" ? null : repeat);
		setSaving(false);
		if (error) Alert.error("Couldn't save", error);
	};

	if (!group) return null;
	const categoryInfo = categories.getInfo("expense", category);

	return (
		<Sheet
			visible={visible}
			onClose={onClose}
			title={expense ? "Edit expense" : "Add expense"}
			right={{ label: saving ? "Saving…" : "Save", onPress: submit, disabled: saving }}
			tall
		>
			{/* Description + amount, the two things every expense needs. */}
			<View style={s.topRow}>
				<TouchableOpacity
					style={[s.categoryButton, { backgroundColor: theme.primary + "1A" }]}
					onPress={() => setShowCategories((v) => !v)}
				>
					<Ionicons name={(categoryInfo?.icon || "pricetag") as any} size={22} color={theme.primary} />
				</TouchableOpacity>
				<TextInput
					style={s.descInput}
					placeholder="What was it for?"
					placeholderTextColor={theme.textMuted}
					value={description}
					onChangeText={setDescription}
				/>
			</View>
			{showCategories && (
				<View style={s.chips}>
					{categories.expenseOptions.map((cat) => (
						<Chip
							key={cat.key}
							label={cat.name}
							icon={cat.icon as any}
							active={category === cat.key}
							onPress={() => {
								setCategory(cat.key);
								setShowCategories(false);
							}}
						/>
					))}
				</View>
			)}

			<View style={s.amountRow}>
				<Text style={s.currency}>{currency}</Text>
				{splitType === "itemized" ? (
					<Text style={s.amountInput}>{itemsTotal.toLocaleString("en-IN")}</Text>
				) : (
					<TextInput
						style={s.amountInput}
						placeholder="0"
						placeholderTextColor={theme.textMuted}
						value={amountText}
						onChangeText={setAmountText}
						keyboardType="decimal-pad"
					/>
				)}
			</View>

			{!expense && (
				<View style={s.scanRow}>
					{scanning ? (
						<View style={s.scanBusy}>
							<ActivityIndicator color={theme.primary} />
							<Text style={s.scanText}>Reading the bill…</Text>
						</View>
					) : (
						<>
							<TouchableOpacity style={s.scanButton} onPress={() => handleScan("camera")}>
								<Ionicons name="scan-outline" size={18} color={theme.primary} />
								<Text style={s.scanText}>Scan bill</Text>
							</TouchableOpacity>
							<TouchableOpacity style={s.scanButton} onPress={() => handleScan("library")}>
								<Ionicons name="image-outline" size={18} color={theme.primary} />
								<Text style={s.scanText}>From photos</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			)}

			{/* Paid by */}
			<View style={s.labelRow}>
				<Label>PAID BY</Label>
				<TouchableOpacity onPress={() => setMultiPay((v) => !v)} hitSlop={8}>
					<Text style={s.link}>{multiPay ? "One person" : "Multiple people"}</Text>
				</TouchableOpacity>
			</View>
			{multiPay ? (
				<View style={s.card}>
					{members.map((m) => (
						<View key={m.id} style={s.memberRow}>
							<Avatar name={m.name} size={30} />
							<Text style={s.memberName}>{nameOf(m.id)}</Text>
							<View style={s.valueBox}>
								<Text style={s.valueAffix}>{currency}</Text>
								<TextInput
									style={s.valueInput}
									placeholder="0"
									placeholderTextColor={theme.textMuted}
									keyboardType="decimal-pad"
									value={payerAmounts[m.id] ?? ""}
									onChangeText={(t) => setPayerAmounts((p) => ({ ...p, [m.id]: t }))}
								/>
							</View>
						</View>
					))}
					<Text style={[s.hint, Math.abs(payerTotal - amount) > 0.005 && { color: theme.error }]}>
						{money(payerTotal, currency)} of {money(amount, currency)} paid
					</Text>
				</View>
			) : (
				<View style={s.chips}>
					{members.map((m) => (
						<Chip key={m.id} label={nameOf(m.id)} active={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
					))}
				</View>
			)}

			{/* Split */}
			<Label>SPLIT</Label>
			<View style={s.segment}>
				{SPLIT_TYPES.map((opt) => (
					<TouchableOpacity
						key={opt.type}
						style={[s.segmentItem, splitType === opt.type && s.segmentActive]}
						onPress={() => setSplitType(opt.type)}
					>
						<Ionicons
							name={opt.icon}
							size={16}
							color={splitType === opt.type ? "#FFFFFF" : theme.textSecondary}
						/>
						<Text style={[s.segmentText, splitType === opt.type && { color: "#FFFFFF" }]}>
							{opt.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{splitType === "itemized" ? (
				<ItemsEditor
					items={items}
					setItems={setItems}
					extraText={extraText}
					setExtraText={setExtraText}
					members={members}
					nameOf={nameOf}
					currency={currency}
					s={s}
					theme={theme}
				/>
			) : (
				<View style={s.card}>
					{members.map((m) => {
						const share = preview?.ok ? preview.splits.find((x) => x.memberId === m.id)?.amount ?? 0 : null;
						const isIn = included.includes(m.id);
						return (
							<View key={m.id} style={s.memberRow}>
								{splitType === "equal" ? (
									<TouchableOpacity
										style={s.check}
										onPress={() =>
											setIncluded((cur) => (isIn ? cur.filter((x) => x !== m.id) : [...cur, m.id]))
										}
									>
										<Ionicons
											name={isIn ? "checkbox" : "square-outline"}
											size={22}
											color={isIn ? theme.primary : theme.textMuted}
										/>
									</TouchableOpacity>
								) : (
									<Avatar name={m.name} size={30} />
								)}
								<Text style={[s.memberName, splitType === "equal" && !isIn && { color: theme.textMuted }]}>
									{nameOf(m.id)}
								</Text>
								{splitType === "equal" ? (
									<Text style={s.shareText}>{isIn && share !== null ? money(share, currency) : "–"}</Text>
								) : (
									<View style={s.valueBox}>
										{splitType === "exact" && <Text style={s.valueAffix}>{currency}</Text>}
										<TextInput
											style={s.valueInput}
											placeholder={splitType === "shares" ? "1" : "0"}
											placeholderTextColor={theme.textMuted}
											keyboardType="decimal-pad"
											value={values[m.id] ?? ""}
											onChangeText={(t) => setValues((v) => ({ ...v, [m.id]: t }))}
										/>
										{splitType === "percentage" && <Text style={s.valueAffix}>%</Text>}
										{splitType === "shares" && <Text style={s.valueAffix}>×</Text>}
									</View>
								)}
							</View>
						);
					})}
					{preview && !preview.ok && <Text style={[s.hint, { color: theme.error }]}>{preview.error}</Text>}
					{preview?.ok && splitType !== "equal" && splitType !== "exact" && (
						<Text style={s.hint}>
							{preview.splits.map((x) => `${nameOf(x.memberId)} ${money(x.amount, currency)}`).join(" · ")}
						</Text>
					)}
				</View>
			)}

			{!expense && (
				<>
					<Label>REPEAT</Label>
					<View style={s.chips}>
						{(["never", "weekly", "monthly", "yearly"] as Repeat[]).map((r) => (
							<Chip
								key={r}
								label={r === "never" ? "Just once" : FREQUENCY_LABELS[r]}
								active={repeat === r}
								onPress={() => setRepeat(r)}
							/>
						))}
					</View>
				</>
			)}

			<Label>NOTE</Label>
			<TextInput
				style={s.noteInput}
				placeholder="Optional"
				placeholderTextColor={theme.textMuted}
				value={note}
				onChangeText={setNote}
				multiline
			/>
		</Sheet>
	);
}

function ItemsEditor({
	items,
	setItems,
	extraText,
	setExtraText,
	members,
	nameOf,
	currency,
	s,
	theme,
}: {
	items: ReceiptItem[];
	setItems: React.Dispatch<React.SetStateAction<ReceiptItem[]>>;
	extraText: string;
	setExtraText: (t: string) => void;
	members: SplitGroup["members"];
	nameOf: (id: string) => string;
	currency: string;
	s: ReturnType<typeof createStyles>;
	theme: Theme;
}) {
	const update = (id: string, patch: Partial<ReceiptItem>) =>
		setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));

	return (
		<View>
			{items.length === 0 && (
				<Text style={s.hint}>Scan a bill above, or add items one by one.</Text>
			)}
			{items.map((item) => (
				<View key={item.id} style={[s.card, { marginBottom: 10 }]}>
					<View style={s.itemTop}>
						<TextInput
							style={s.itemName}
							value={item.name}
							onChangeText={(t) => update(item.id, { name: t })}
							placeholder="Item"
							placeholderTextColor={theme.textMuted}
						/>
						<View style={s.valueBox}>
							<Text style={s.valueAffix}>{currency}</Text>
							<TextInput
								style={s.valueInput}
								keyboardType="decimal-pad"
								value={item.price ? String(item.price) : ""}
								placeholder="0"
								placeholderTextColor={theme.textMuted}
								onChangeText={(t) => update(item.id, { price: parseFloat(t) || 0 })}
							/>
						</View>
						<TouchableOpacity
							onPress={() => setItems((cur) => cur.filter((it) => it.id !== item.id))}
							hitSlop={8}
						>
							<Ionicons name="close" size={18} color={theme.textMuted} />
						</TouchableOpacity>
					</View>
					<View style={[s.chips, { marginTop: 8 }]}>
						{members.map((m) => {
							const on = item.memberIds.includes(m.id);
							return (
								<Chip
									key={m.id}
									label={nameOf(m.id)}
									active={on}
									onPress={() =>
										update(item.id, {
											memberIds: on
												? item.memberIds.filter((x) => x !== m.id)
												: [...item.memberIds, m.id],
										})
									}
								/>
							);
						})}
					</View>
				</View>
			))}
			<TouchableOpacity
				style={s.addItem}
				onPress={() =>
					setItems((cur) => [
						...cur,
						{ id: generateId(), name: "", price: 0, memberIds: members.map((m) => m.id) },
					])
				}
			>
				<Ionicons name="add" size={18} color={theme.primary} />
				<Text style={s.link}>Add item</Text>
			</TouchableOpacity>
			<View style={[s.card, s.memberRow, { marginTop: 10 }]}>
				<Text style={s.memberName}>Tax & charges</Text>
				<View style={s.valueBox}>
					<Text style={s.valueAffix}>{currency}</Text>
					<TextInput
						style={s.valueInput}
						keyboardType="numbers-and-punctuation"
						value={extraText}
						placeholder="0"
						placeholderTextColor={theme.textMuted}
						onChangeText={setExtraText}
					/>
				</View>
			</View>
			<Text style={s.hint}>Tax and charges are shared in proportion to what each person had.</Text>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
		categoryButton: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
		descInput: {
			flex: 1,
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
			paddingVertical: 8,
		},
		amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18 },
		currency: { fontSize: 28, fontWeight: "700", color: theme.textMuted, marginRight: 4 },
		amountInput: { fontSize: 40, fontWeight: "800", color: theme.text, minWidth: 80, textAlign: "center" },
		scanRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 12 },
		scanButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 9,
			borderRadius: 18,
			backgroundColor: theme.primary + "14",
		},
		scanBusy: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 },
		scanText: { fontSize: 13, fontWeight: "600", color: theme.primary },
		labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
		link: { fontSize: 13, fontWeight: "600", color: theme.primary, marginBottom: 8 },
		chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		card: { backgroundColor: theme.surface, borderRadius: 16, padding: 12 },
		memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
		memberName: { flex: 1, fontSize: 15, fontWeight: "500", color: theme.text },
		check: { width: 30, alignItems: "center" },
		shareText: { fontSize: 14, fontWeight: "600", color: theme.textSecondary },
		valueBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
			borderRadius: 10,
			paddingHorizontal: 10,
			minWidth: 92,
		},
		valueAffix: { fontSize: 13, color: theme.textMuted },
		valueInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 7, paddingHorizontal: 4, textAlign: "right" },
		hint: { fontSize: 12, color: theme.textMuted, marginTop: 8 },
		segment: { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 14, padding: 3, marginBottom: 10 },
		segmentItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 11, gap: 2 },
		segmentActive: { backgroundColor: theme.primary },
		segmentText: { fontSize: 11, fontWeight: "600", color: theme.textSecondary },
		itemTop: { flexDirection: "row", alignItems: "center", gap: 10 },
		itemName: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.text, paddingVertical: 4 },
		addItem: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 8 },
		noteInput: {
			backgroundColor: theme.surface,
			borderRadius: 14,
			padding: 12,
			minHeight: 60,
			fontSize: 14,
			color: theme.text,
			textAlignVertical: "top",
		},
	});
