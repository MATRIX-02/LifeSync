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

	return (
		<FlexWidget
			clickAction="OPEN_APP"
			style={{
				height: "match_parent",
				width: "match_parent",
				backgroundColor: C.bg,
				borderRadius: 22,
				paddingVertical: 16,
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
			{/* Flex weights rather than dp widths: the width the launcher reports
			    is often stale or wrong after a resize, which overflowed the bar. */}
			<FlexWidget
				style={{ flexDirection: "row", marginTop: 8, height: 5, width: "match_parent", borderRadius: 3, backgroundColor: C.track }}
			>
				{complete > 0 && (
					<FlexWidget style={{ flex: complete, height: 5, borderRadius: 3, backgroundColor: C.primary }} />
				)}
				{habits.length - complete > 0 && <FlexWidget style={{ flex: habits.length - complete, height: 5 }} />}
			</FlexWidget>

			{!signedIn ? (
				<TextWidget text="Open LifeSync to sign in" style={{ fontSize: 13, color: C.muted, marginTop: 14 }} />
			) : habits.length === 0 ? (
				<TextWidget text="No habits due today 🎉" style={{ fontSize: 13, color: C.muted, marginTop: 14 }} />
			) : (
				// Scrolls when there are more habits than fit. flex: 1 wrapper, not
				// match_parent: match_parent alone made the list as tall as the whole
				// widget, pushing its last rows off the bottom.
				<FlexWidget style={{ flex: 1, width: "match_parent", marginTop: 10 }}>
				<ListWidget style={{ height: "match_parent", width: "match_parent" }}>
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
				</FlexWidget>
			)}
		</FlexWidget>
	);
}
