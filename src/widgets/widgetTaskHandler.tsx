// Headless task for the home screen widgets (registered in index.js). Android
// runs it when a widget is placed, resized, periodically refreshed, or tapped -
// often with LifeSync closed, so it works from the AsyncStorage snapshots.
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { markDoneToday } from "../services/habitReminderActions";
import { FINANCE_WIDGET } from "./FinanceWidget";
import { HABIT_DONE_ACTION, TODAY_HABITS_WIDGET } from "./TodayHabitsWidget";
import {
	readFinanceSnapshot,
	readHabitSnapshot,
	renderFinanceWidget,
	renderHabitWidget,
	writeHabitSnapshot,
} from "./widgetSync";
import { readWidgetColors } from "./widgetTheme";

export async function widgetTaskHandler({
	widgetInfo,
	widgetAction,
	clickAction,
	clickActionData,
	renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
	if (widgetAction === "WIDGET_DELETED") return;
	const colors = await readWidgetColors();

	if (widgetInfo.widgetName === FINANCE_WIDGET) {
		renderWidget(renderFinanceWidget(await readFinanceSnapshot(), colors));
		return;
	}
	if (widgetInfo.widgetName !== TODAY_HABITS_WIDGET) return;

	const snap = await readHabitSnapshot();
	const draw = () => renderWidget(renderHabitWidget(snap, colors, widgetInfo.width));

	if (widgetAction === "WIDGET_CLICK" && clickAction === HABIT_DONE_ACTION) {
		const habitId = String(clickActionData?.habitId ?? "");
		const habit = snap.habits.find((h) => h.id === habitId);
		if (habit && habit.done < habit.target) {
			// Show the tick straight away; the write below can take a moment.
			habit.done += 1;
			await writeHabitSnapshot(snap);
			draw();
			try {
				await markDoneToday(habitId, habit.target);
			} catch (error) {
				console.warn("Widget: couldn't log habit", error);
				habit.done -= 1;
				await writeHabitSnapshot(snap);
				draw();
			}
			return;
		}
	}

	draw();
}
