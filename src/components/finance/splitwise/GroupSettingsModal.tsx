import { Alert } from "@/src/components/CustomAlert";
import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import * as SplitWiseService from "@/src/services/splitwiseService";
import { buildGroupCsv, FREQUENCY_LABELS, isSimplified } from "@/src/services/splitwiseMath";
import { SplitGroup, SplitType } from "@/src/types/finance";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card, Chip, Label, money, Sheet, shortDate } from "./ui";

const DEFAULT_TYPES: { type: SplitType | "none"; label: string }[] = [
	{ type: "none", label: "Equally" },
	{ type: "percentage", label: "Percent" },
	{ type: "shares", label: "Shares" },
];

interface Props {
	visible: boolean;
	group: SplitGroup | null;
	isAdmin: boolean;
	currency: string;
	onClose: () => void;
	onChanged: (group: SplitGroup) => void;
	onEditDetails: () => void;
	onOpenCharts: () => void;
	onDeleted: () => void;
}

export function GroupSettingsModal({
	visible,
	group,
	isAdmin,
	currency,
	onClose,
	onChanged,
	onEditDetails,
	onOpenCharts,
	onDeleted,
}: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const [defType, setDefType] = useState<SplitType | "none">("none");
	const [defValues, setDefValues] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!visible || !group) return;
		setDefType(group.settings?.defaultSplit?.type ?? "none");
		setDefValues(group.settings?.defaultSplit?.values ?? {});
	}, [visible, group?.id]);

	if (!group) return null;
	const friend = group.settings?.kind === "friend";
	const recurring = group.settings?.recurring ?? [];

	const apply = async (promise: ReturnType<typeof SplitWiseService.mutateGroup>) => {
		const { data, error } = await promise;
		if (error) Alert.error("Couldn't save", error);
		else if (data) onChanged(data);
		return !error;
	};

	const saveDefault = async () => {
		if (defType === "percentage") {
			const total = group.members.reduce((sum, m) => sum + (parseFloat(defValues[m.id] ?? "") || 0), 0);
			if (Math.abs(total - 100) > 0.01) {
				return Alert.warning("Check the percentages", `They add up to ${total}%, not 100%.`);
			}
		}
		const ok = await apply(
			SplitWiseService.updateGroupSettings(
				group.id,
				{ defaultSplit: defType === "none" ? undefined : { type: defType, values: defValues } },
				defType === "none" ? "reset the default split to equal" : `set a default split (${defType})`,
			),
		);
		if (ok) Alert.success("Saved", "New expenses will start with this split.");
	};

	const exportCsv = async () => {
		try {
			const csv = buildGroupCsv(group, (key) => categories.getInfo("expense", key)?.name ?? "Other");
			const safe = group.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "group";
			const uri = `${FileSystem.cacheDirectory}${safe}-${new Date().toISOString().slice(0, 10)}.csv`;
			await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
			if (!(await Sharing.isAvailableAsync())) return Alert.error("Can't share", "Sharing isn't available.");
			await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: `${group.name} expenses` });
		} catch (error: any) {
			Alert.error("Export failed", error?.message ?? "Please try again.");
		}
	};

	const toggleArchive = () =>
		Alert.alert(
			group.isArchived ? "Restore group?" : "Archive group?",
			group.isArchived
				? "It moves back to your active groups."
				: "It's hidden from your list but nothing is deleted. Balances still count.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: group.isArchived ? "Restore" : "Archive",
					onPress: async () => {
						if (await apply(SplitWiseService.setGroupArchived(group.id, !group.isArchived))) onClose();
					},
				},
			],
		);

	const remove = () =>
		Alert.alert("Delete group?", `"${group.name}" and all its expenses will be deleted for everyone.`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					const { error } = await SplitWiseService.deleteSplitGroup(group.id);
					if (error) return Alert.error("Couldn't delete", error);
					onDeleted();
				},
			},
		]);

	return (
		<Sheet visible={visible} onClose={onClose} title={friend ? "Friend settings" : "Group settings"} tall>
			<Label>BALANCES</Label>
			<Card style={s.switchRow}>
				<View style={{ flex: 1 }}>
					<Text style={s.rowTitle}>Simplify debts</Text>
					<Text style={s.rowSub}>
						{isSimplified(group)
							? "Shows the fewest payments needed. A may pay C directly instead of via B."
							: "Shows who owes whom for each expense, without combining."}
					</Text>
				</View>
				<Switch
					value={isSimplified(group)}
					onValueChange={(v) => {
						void apply(
							SplitWiseService.updateGroupSettings(
								group.id,
								{ simplifyDebts: v },
								v ? "turned on simplify debts" : "turned off simplify debts",
							),
						);
					}}
					trackColor={{ true: theme.primary, false: theme.border }}
					thumbColor="#FFFFFF"
				/>
			</Card>

			{!friend && (
				<>
					<Label>DEFAULT SPLIT</Label>
					<Card>
						<View style={s.chips}>
							{DEFAULT_TYPES.map((d) => (
								<Chip key={d.type} label={d.label} active={defType === d.type} onPress={() => setDefType(d.type)} />
							))}
						</View>
						{defType !== "none" &&
							group.members.map((m) => (
								<View key={m.id} style={s.valueRow}>
									<Text style={s.valueName}>{m.isCurrentUser ? "You" : m.name}</Text>
									<View style={s.valueBox}>
										<TextInput
											style={s.valueInput}
											keyboardType="decimal-pad"
											placeholder={defType === "shares" ? "1" : "0"}
											placeholderTextColor={theme.textMuted}
											value={defValues[m.id] ?? ""}
											onChangeText={(t) => setDefValues((v) => ({ ...v, [m.id]: t }))}
										/>
										<Text style={s.valueAffix}>{defType === "percentage" ? "%" : "×"}</Text>
									</View>
								</View>
							))}
						<TouchableOpacity style={s.saveButton} onPress={saveDefault}>
							<Text style={s.saveText}>Save default</Text>
						</TouchableOpacity>
					</Card>
				</>
			)}

			<Label>REPEATING EXPENSES</Label>
			<Card>
				{recurring.length === 0 ? (
					<Text style={s.rowSub}>None. Choose "Repeat" when adding an expense.</Text>
				) : (
					recurring.map((r) => (
						<View key={r.id} style={s.recurringRow}>
							<Ionicons name="repeat" size={18} color={theme.primary} />
							<View style={{ flex: 1 }}>
								<Text style={s.rowTitle}>{r.template.description}</Text>
								<Text style={s.rowSub}>
									{money(r.template.amount, currency)} · {FREQUENCY_LABELS[r.frequency]} · next {shortDate(r.nextDate)}
								</Text>
							</View>
							<TouchableOpacity
								onPress={() =>
									Alert.alert("Stop repeating?", "Expenses already added stay.", [
										{ text: "Cancel", style: "cancel" },
										{
											text: "Stop",
											style: "destructive",
											onPress: () => apply(SplitWiseService.removeRecurring(group.id, r.id)),
										},
									])
								}
								hitSlop={8}
							>
								<Text style={s.stop}>Stop</Text>
							</TouchableOpacity>
						</View>
					))
				)}
			</Card>

			<Label>MORE</Label>
			<Card style={{ paddingVertical: 4 }}>
				<Row s={s} theme={theme} icon="bar-chart-outline" label="Charts" onPress={onOpenCharts} />
				<Row s={s} theme={theme} icon="download-outline" label="Export as spreadsheet (CSV)" onPress={exportCsv} />
				{isAdmin && !friend && (
					<Row s={s} theme={theme} icon="create-outline" label="Edit name & colour" onPress={onEditDetails} />
				)}
				<Row
					s={s}
					theme={theme}
					icon={group.isArchived ? "arrow-undo-outline" : "archive-outline"}
					label={group.isArchived ? "Restore from archive" : "Archive"}
					onPress={toggleArchive}
				/>
				{isAdmin && (
					<Row s={s} theme={theme} icon="trash-outline" label={friend ? "Delete" : "Delete group"} onPress={remove} danger />
				)}
			</Card>
		</Sheet>
	);
}

function Row({
	s,
	theme,
	icon,
	label,
	onPress,
	danger,
}: {
	s: ReturnType<typeof createStyles>;
	theme: Theme;
	icon: React.ComponentProps<typeof Ionicons>["name"];
	label: string;
	onPress: () => void;
	danger?: boolean;
}) {
	const color = danger ? theme.error : theme.text;
	return (
		<TouchableOpacity style={s.linkRow} onPress={onPress}>
			<Ionicons name={icon} size={20} color={danger ? theme.error : theme.primary} />
			<Text style={[s.linkText, { color }]}>{label}</Text>
			<Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
		</TouchableOpacity>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
		rowTitle: { fontSize: 15, fontWeight: "600", color: theme.text },
		rowSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 17 },
		chips: { flexDirection: "row", gap: 8, marginBottom: 8 },
		valueRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
		valueName: { flex: 1, fontSize: 14, color: theme.text },
		valueBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surfaceLight,
			borderRadius: 10,
			paddingHorizontal: 10,
			width: 96,
		},
		valueInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 7, textAlign: "right" },
		valueAffix: { fontSize: 13, color: theme.textMuted, marginLeft: 4 },
		saveButton: {
			marginTop: 10,
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 10,
			alignItems: "center",
		},
		saveText: { color: "#FFFFFF", fontWeight: "700" },
		recurringRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
		stop: { fontSize: 13, fontWeight: "700", color: theme.error },
		linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
		linkText: { flex: 1, fontSize: 15, fontWeight: "500" },
	});
