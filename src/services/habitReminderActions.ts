/**
 * "Done ✓" / "Snooze 10 min" on a habit reminder. Called by the response
 * listener in app/_layout.tsx and by the background task in index.js (app
 * closed), so it can't rely on the habit store being loaded.
 */

import * as Notifications from "expo-notifications";
import { supabase } from "../config/supabase";
import { useHabitStore } from "../context/habitStoreDB";
import { NotificationService } from "./notificationService";

// One press can reach both the listener and the background task while the app
// is alive; both run in this JS runtime, so a Set de-duplicates.
const handledPresses = new Set<string>();

export async function handleHabitNotificationAction(payload: unknown): Promise<boolean> {
	const response = payload as {
		actionIdentifier?: string;
		notification?: {
			date?: number;
			request?: {
				identifier?: string;
				content?: { title?: string; body?: string; data?: any; dataString?: string };
			};
		};
	};
	const action = response?.actionIdentifier;
	if (action !== NotificationService.HABIT_ACTION_DONE && action !== NotificationService.HABIT_ACTION_SNOOZE) {
		return false;
	}

	const content = response.notification?.request?.content;
	let data = content?.data;
	try {
		if (!data && content?.dataString) data = JSON.parse(content.dataString);
	} catch {
		// Unreadable payload: nothing to act on.
	}
	if (!data?.habitId || !String(data.type ?? "").startsWith("habit_reminder")) return false;

	const identifier = response.notification?.request?.identifier ?? "";
	const pressKey = `${identifier}:${response.notification?.date ?? ""}:${action}`;
	if (handledPresses.has(pressKey)) return true;
	handledPresses.add(pressKey);

	try {
		if (identifier) await Notifications.dismissNotificationAsync(identifier);
	} catch {
		// Already dismissed.
	}

	try {
		if (action === NotificationService.HABIT_ACTION_SNOOZE) {
			await NotificationService.snoozeHabitReminder(
				data,
				content?.title || "🎯 Habit Reminder",
				content?.body || "Time for your habit",
			);
		} else if (!data.test) {
			await markDoneToday(data.habitId, Number(data.target) || 1);
		}
	} catch (error) {
		console.warn("Could not handle habit reminder action:", error);
	}
	return true;
}

/**
 * One completion for today, like tapping the habit in the list, but never
 * past the day's target - and never removing one, as a second tap would.
 */
export async function markDoneToday(habitId: string, target: number): Promise<void> {
	const today = new Date();
	const store = useHabitStore.getState();
	if (store.userId && store.getHabit(habitId)) {
		const { done, target: storeTarget } = store.getProgressForDate(habitId, today);
		if (done < Math.max(1, storeTarget)) await store.logHabitForDate(habitId, today);
		return;
	}

	// App closed: write the same row straight to Supabase (see logToDbLog).
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const userId = session?.user?.id;
	if (!userId) return;

	const start = new Date(today);
	start.setHours(0, 0, 0, 0);
	const end = new Date(today);
	end.setHours(23, 59, 59, 999);
	const { count, error: countError } = await (supabase as any)
		.from("habit_logs")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.eq("habit_id", habitId)
		.gte("completed_at", start.toISOString())
		.lte("completed_at", end.toISOString());
	if (countError) throw countError;
	if ((count ?? 0) >= target) return;

	// Same noon timestamp logHabitForDate uses, so it lands on the right day.
	const at = new Date(today);
	at.setHours(12, 0, 0, 0);
	const { error } = await (supabase as any).from("habit_logs").insert({
		id: generateUUID(),
		habit_id: habitId,
		user_id: userId,
		timestamp: at.toISOString(),
		completed_at: at.toISOString(),
	});
	if (error) throw error;

	// The store isn't loaded to reschedule, so just drop the rest of today's.
	if ((count ?? 0) + 1 >= target) {
		await NotificationService.cancelHabitRemindersOnDate(habitId, today);
	}
}

const generateUUID = () =>
	"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
	});
