// "Today's habits" home screen widget (Android). Rendered by
// react-native-android-widget into native RemoteViews, so only its widget
// primitives work here - no react-native components, hooks or theme context.
import React from "react";
import { FlexWidget, ListWidget, TextWidget } from "react-native-android-widget";
import { isHex, resolveColors, WidgetColors } from "./widgetTheme";

export const TODAY_HABITS_WIDGET = "TodayHabits";
export const HABIT_DONE_ACTION = "HABIT_DONE";

export interface WidgetHabit {
	id: string;
	name: string;
	color: string;
	done: number;
	target: number;
}

export function TodayHabitsWidget({
	habits,
	signedIn,
	width,
	colors,
}: {
	habits: WidgetHabit[];
	signedIn: boolean;
	width: number;
	colors?: WidgetColors;
}) {
	const C = resolveColors(colors);
	const complete = habits.filter((h) => h.done >= h.target).length;
	const barWidth = Math.max(40, width - 32);
	const filled = habits.length ? Math.round((barWidth * complete) / habits.length) : 0;

	return (
		<FlexWidget
			clickAction="OPEN_APP"
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
				<TextWidget text="Today" style={{ fontSize: 16, fontWeight: "700", color: C.text }} />
				<TextWidget
					text={habits.length ? `${complete}/${habits.length} done` : ""}
					style={{ fontSize: 13, color: C.primary, fontWeight: "600" }}
				/>
			</FlexWidget>
			<FlexWidget style={{ marginTop: 8, height: 5, width: barWidth, borderRadius: 3, backgroundColor: C.track }}>
				<FlexWidget style={{ height: 5, width: filled, borderRadius: 3, backgroundColor: C.primary }} />
			</FlexWidget>

			{!signedIn ? (
				<TextWidget text="Open LifeSync to sign in" style={{ fontSize: 13, color: C.muted, marginTop: 14 }} />
			) : habits.length === 0 ? (
				<TextWidget text="No habits due today 🎉" style={{ fontSize: 13, color: C.muted, marginTop: 14 }} />
			) : (
				// Scrolls when there are more habits than fit.
				<ListWidget style={{ height: "match_parent", width: "match_parent", marginTop: 10 }}>
					{habits.map((h) => {
						const isDone = h.done >= h.target;
						const dot = isHex(h.color) ? h.color : C.primary;
						return (
							<FlexWidget
								key={h.id}
								clickAction="OPEN_APP"
								style={{ width: "match_parent", paddingBottom: 6 }}
							>
								<FlexWidget
									style={{
										flexDirection: "row",
										alignItems: "center",
										width: "match_parent",
										height: 40,
										paddingHorizontal: 10,
										borderRadius: 12,
										backgroundColor: C.row,
									}}
								>
									<FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
									<FlexWidget style={{ flex: 1, marginLeft: 10 }}>
										<TextWidget
											text={h.name}
											maxLines={1}
											truncate="END"
											style={{ fontSize: 14, color: isDone ? C.muted : C.text }}
										/>
									</FlexWidget>
									{h.target > 1 && (
										<TextWidget
											text={`${h.done}/${h.target}`}
											style={{ fontSize: 12, color: C.muted, marginRight: 8 }}
										/>
									)}
									<FlexWidget
										clickAction={isDone ? "OPEN_APP" : HABIT_DONE_ACTION}
										clickActionData={{ habitId: h.id }}
										style={{
											width: 28,
											height: 28,
											borderRadius: 14,
											alignItems: "center",
											justifyContent: "center",
											backgroundColor: isDone ? C.primary : C.bg,
											borderWidth: isDone ? 0 : 2,
											borderColor: dot,
										}}
									>
										<TextWidget
											text={isDone ? "✓" : ""}
											style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "700" }}
										/>
									</FlexWidget>
								</FlexWidget>
							</FlexWidget>
						);
					})}
				</ListWidget>
			)}
		</FlexWidget>
	);
}
