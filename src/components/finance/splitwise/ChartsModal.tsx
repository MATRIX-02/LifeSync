import { Theme, useColors } from "@/src/context/themeContext";
import { useFinanceCategories } from "@/src/hooks/useFinanceCategories";
import {
	ChartSlice,
	myMember,
	paidVsShare,
	spendByCategory,
	spendByMonth,
} from "@/src/services/splitwiseMath";
import { SplitGroup } from "@/src/types/finance";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Chip, EmptyState, Label, money, Sheet } from "./ui";

const PALETTE = ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#3B82F6", "#84CC16"];

interface Props {
	visible: boolean;
	onClose: () => void;
	/** One group, or every group for the overall view. */
	groups: SplitGroup[];
	title: string;
	currentUserId: string;
	currency: string;
}

export function ChartsModal({ visible, onClose, groups, title, currentUserId, currency }: Props) {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const categories = useFinanceCategories();
	const single = groups.length === 1 ? groups[0] : null;
	// Overall view defaults to "my share" - the total of other people's
	// groups isn't money you spent.
	const [scope, setScope] = useState<"mine" | "total">(single ? "total" : "mine");
	const [months, setMonths] = useState(6);

	const memberFor = scope === "mine" ? (g: SplitGroup) => myMember(g, currentUserId)?.id : undefined;
	const catName = (key: string) => categories.getInfo("expense", key)?.name ?? "Other";

	const byCategory = useMemo(
		() => spendByCategory(groups, catName, memberFor),
		[groups, scope, categories],
	);
	const byMonth = useMemo(() => spendByMonth(groups, months, memberFor), [groups, scope, months]);
	const total = byCategory.reduce((sum, c) => sum + c.value, 0);

	return (
		<Sheet visible={visible} onClose={onClose} title={title} tall>
			<View style={s.chips}>
				<Chip label="My share" active={scope === "mine"} onPress={() => setScope("mine")} />
				<Chip label={single ? "Group total" : "All spending"} active={scope === "total"} onPress={() => setScope("total")} />
			</View>

			{total === 0 ? (
				<EmptyState icon="bar-chart-outline" title="No spending yet" text="Charts appear once expenses are added." />
			) : (
				<>
					<Card style={s.totalCard}>
						<Text style={s.totalLabel}>{scope === "mine" ? "Your share" : "Total spent"}</Text>
						<Text style={s.totalValue}>{money(total, currency)}</Text>
					</Card>

					<Label>BY CATEGORY</Label>
					<Card>
						<View style={s.stack}>
							{byCategory.map((c, i) => (
								<View
									key={c.key}
									style={{ flex: c.value, backgroundColor: PALETTE[i % PALETTE.length] }}
								/>
							))}
						</View>
						{byCategory.map((c, i) => (
							<View key={c.key} style={s.legendRow}>
								<View style={[s.dot, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
								<Text style={s.legendName}>{c.label}</Text>
								<Text style={s.legendPct}>{Math.round((c.value / total) * 100)}%</Text>
								<Text style={s.legendValue}>{money(c.value, currency)}</Text>
							</View>
						))}
					</Card>

					<View style={s.labelRow}>
						<Label>BY MONTH</Label>
						<View style={s.smallChips}>
							{[6, 12].map((m) => (
								<Chip key={m} label={`${m}M`} active={months === m} onPress={() => setMonths(m)} />
							))}
						</View>
					</View>
					<Card>
						<MonthBars data={byMonth} currency={currency} s={s} theme={theme} />
					</Card>

					{single && (
						<>
							<Label>PAID VS SHARE</Label>
							<Card>
								{paidVsShare(single).map(({ member, paid, share }) => {
									const max = Math.max(1, ...paidVsShare(single).flatMap((x) => [x.paid, x.share]));
									return (
										<View key={member.id} style={s.pvsRow}>
											<Text style={s.pvsName}>{member.isCurrentUser ? "You" : member.name}</Text>
											<View style={s.pvsBars}>
												<View style={[s.pvsBar, { width: `${(paid / max) * 100}%`, backgroundColor: theme.success }]} />
												<View style={[s.pvsBar, { width: `${(share / max) * 100}%`, backgroundColor: theme.primary }]} />
											</View>
											<View style={s.pvsValues}>
												<Text style={[s.pvsValue, { color: theme.success }]}>{money(paid, currency)}</Text>
												<Text style={[s.pvsValue, { color: theme.primary }]}>{money(share, currency)}</Text>
											</View>
										</View>
									);
								})}
								<View style={s.pvsLegend}>
									<View style={[s.dot, { backgroundColor: theme.success }]} />
									<Text style={s.legendPct}>Paid</Text>
									<View style={[s.dot, { backgroundColor: theme.primary, marginLeft: 12 }]} />
									<Text style={s.legendPct}>Share</Text>
								</View>
							</Card>
						</>
					)}
				</>
			)}
		</Sheet>
	);
}

function MonthBars({
	data,
	currency,
	s,
	theme,
}: {
	data: ChartSlice[];
	currency: string;
	s: ReturnType<typeof createStyles>;
	theme: Theme;
}) {
	const max = Math.max(1, ...data.map((d) => d.value));
	const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
	return (
		<View>
			<Text style={s.peak}>
				Highest: {peak.label} · {money(peak.value, currency)}
			</Text>
			<View style={s.bars}>
				{data.map((d, i) => (
					<View key={d.key} style={s.barCol}>
						<View style={s.barTrack}>
							<View
								style={[
									s.bar,
									{
										height: `${(d.value / max) * 100}%`,
										backgroundColor: i === data.length - 1 ? theme.primary : theme.primary + "80",
									},
								]}
							/>
						</View>
						<Text style={s.barLabel}>{d.label}</Text>
					</View>
				))}
			</View>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		chips: { flexDirection: "row", gap: 8, marginBottom: 12 },
		smallChips: { flexDirection: "row", gap: 6, marginTop: 10 },
		labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
		totalCard: { alignItems: "center" },
		totalLabel: { fontSize: 13, color: theme.textSecondary },
		totalValue: { fontSize: 30, fontWeight: "800", color: theme.text, marginTop: 2 },
		stack: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 12, gap: 2 },
		legendRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
		dot: { width: 10, height: 10, borderRadius: 5 },
		legendName: { flex: 1, fontSize: 14, color: theme.text },
		legendPct: { fontSize: 12, color: theme.textMuted, width: 38, textAlign: "right" },
		legendValue: { fontSize: 14, fontWeight: "700", color: theme.text, minWidth: 80, textAlign: "right" },
		peak: { fontSize: 12, color: theme.textSecondary, marginBottom: 10 },
		bars: { flexDirection: "row", alignItems: "flex-end", height: 140, gap: 6 },
		barCol: { flex: 1, alignItems: "center", height: "100%" },
		barTrack: { flex: 1, width: "70%", justifyContent: "flex-end" },
		bar: { width: "100%", borderRadius: 6, minHeight: 2 },
		barLabel: { fontSize: 10, color: theme.textMuted, marginTop: 6 },
		pvsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
		pvsName: { width: 70, fontSize: 13, fontWeight: "600", color: theme.text },
		pvsBars: { flex: 1, gap: 3 },
		pvsBar: { height: 7, borderRadius: 4, minWidth: 2 },
		pvsValues: { alignItems: "flex-end", minWidth: 70 },
		pvsValue: { fontSize: 11, fontWeight: "700" },
		pvsLegend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
	});
