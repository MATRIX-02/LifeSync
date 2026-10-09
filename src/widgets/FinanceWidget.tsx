// "Money" home screen widget (Android): this month's spending and income,
// today's spending, and a scrolling list of recent transactions. Same
// rendering rules as TodayHabitsWidget - widget primitives only.
import React from "react";
import { type ColorProp, FlexWidget, ListWidget, TextWidget } from "react-native-android-widget";
import { resolveColors, WidgetColors } from "./widgetTheme";

export const FINANCE_WIDGET = "Finance";

export interface WidgetTransaction {
	id: string;
	title: string;
	subtitle: string;
	amount: number;
	type: "income" | "expense" | "transfer";
}

export interface FinanceSnapshot {
	date: string; // YYYY-MM-DD, local
	month: string; // e.g. "October"
	signedIn: boolean;
	currency: string;
	monthSpent: number;
	monthIncome: number;
	todaySpent: number;
	recent: WidgetTransaction[];
}

const money = (currency: string, n: number) =>
	`${currency}${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function Stat({
	label,
	value,
	color,
	C,
}: {
	label: string;
	value: string;
	color: ColorProp;
	C: ReturnType<typeof resolveColors>;
}) {
	return (
		<FlexWidget style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: C.row }}>
			<TextWidget text={label} style={{ fontSize: 11, color: C.muted }} />
			<TextWidget text={value} maxLines={1} style={{ fontSize: 17, fontWeight: "700", color, marginTop: 2 }} />
		</FlexWidget>
	);
}

export function FinanceWidget({ data, colors }: { data: FinanceSnapshot; colors?: WidgetColors }) {
	const C = resolveColors(colors);
	const open = { clickAction: "OPEN_URI", clickActionData: { uri: "lifesync://finance" } } as const;

	return (
		<FlexWidget
			{...open}
			style={{
				height: "match_parent",
				width: "match_parent",
				backgroundColor: C.bg,
				borderRadius: 22,
				paddingTop: 16,
				paddingHorizontal: 16,
			}}
		>
			<FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent" }}>
				<TextWidget text="Money" style={{ fontSize: 16, fontWeight: "700", color: C.text }} />
				<TextWidget
					text={data.signedIn ? `Today ${money(data.currency, data.todaySpent)}` : ""}
					style={{ fontSize: 13, color: C.primary, fontWeight: "600" }}
				/>
			</FlexWidget>

			{!data.signedIn ? (
				<TextWidget text="Open LifeSync to sign in" style={{ fontSize: 13, color: C.muted, marginTop: 14 }} />
			) : (
				<FlexWidget style={{ height: "match_parent", width: "match_parent" }}>
					<FlexWidget style={{ flexDirection: "row", width: "match_parent", marginTop: 10, flexGap: 8 }}>
						<Stat label={`Spent in ${data.month}`} value={money(data.currency, data.monthSpent)} color={C.error} C={C} />
						<Stat label="Income" value={money(data.currency, data.monthIncome)} color={C.success} C={C} />
					</FlexWidget>
					<TextWidget text="Recent" style={{ fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 4 }} />
					{data.recent.length === 0 ? (
						<TextWidget text="No transactions yet" style={{ fontSize: 13, color: C.muted, marginTop: 4 }} />
					) : (
						// Scrolls when there are more transactions than fit.
						<ListWidget style={{ height: "match_parent", width: "match_parent" }}>
							{data.recent.map((t) => (
								<FlexWidget
									key={t.id}
									{...open}
									style={{
										flexDirection: "row",
										alignItems: "center",
										width: "match_parent",
										paddingVertical: 8,
										borderBottomWidth: 1,
										borderColor: C.track,
									}}
								>
									<FlexWidget style={{ flex: 1 }}>
										<TextWidget
											text={t.title}
											maxLines={1}
											truncate="END"
											style={{ fontSize: 14, color: C.text }}
										/>
										<TextWidget
											text={t.subtitle}
											maxLines={1}
											truncate="END"
											style={{ fontSize: 11, color: C.muted, marginTop: 1 }}
										/>
									</FlexWidget>
									<TextWidget
										text={`${t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}${money(data.currency, t.amount)}`}
										style={{
											fontSize: 14,
											fontWeight: "600",
											color: t.type === "income" ? C.success : t.type === "expense" ? C.text : C.muted,
											marginLeft: 8,
										}}
									/>
								</FlexWidget>
							))}
						</ListWidget>
					)}
				</FlexWidget>
			)}
		</FlexWidget>
	);
}
