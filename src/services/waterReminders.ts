/**
 * Hydration reminder settings (NutriPlan). Device-local, like the old on/off
 * flag it replaces: reminders are scheduled on this device only.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { supabase } from "../config/supabase";
import { useNutritionStore } from "../context/nutritionStoreDB";
import { NotificationService } from "./notificationService";

const STORAGE_KEY = "waterReminderConfig";
// Pre-config versions only stored this flag; read once to migrate.
const LEGACY_FLAG_KEY = "waterRemindersEnabled";

export interface WaterReminderConfig {
	enabled: boolean;
	/** HH:mm, first reminder of the day. */
	startTime: string;
	/** HH:mm, last reminder no later than this. */
	endTime: string;
	/** Minutes between reminders; null = spread one per 250ml glass of the goal. */
	intervalMinutes: number | null;
	/** Weekdays 0-6 (0 = Sunday); null = every day. */
	days: number[] | null;
	/** Tone id. Water has its own default (Water Pour), not the Settings one. */
	sound: string;
	/** Goal the current schedule was built for, so a goal change can rebuild it. */
	scheduledForGoalMl?: number;
}

export const DEFAULT_WATER_SOUND = "water_pour";

export const DEFAULT_WATER_CONFIG: WaterReminderConfig = {
	enabled: false,
	startTime: "07:00",
	endTime: "22:00",
	intervalMinutes: null,
	days: null,
	sound: DEFAULT_WATER_SOUND,
};

export const GLASS_ML = 250;

export async function loadWaterConfig(): Promise<WaterReminderConfig> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (raw) {
			const config: WaterReminderConfig = { ...DEFAULT_WATER_CONFIG, ...JSON.parse(raw) };
			// "" used to mean "follow the Settings default". Move those to Water
			// Pour; clearing the goal stamp makes NutriPlan rebuild the schedule.
			if (!config.sound) {
				config.sound = DEFAULT_WATER_SOUND;
				config.scheduledForGoalMl = undefined;
			}
			return config;
		}
		const legacy = await AsyncStorage.getItem(LEGACY_FLAG_KEY);
		return { ...DEFAULT_WATER_CONFIG, enabled: legacy === "true" };
	} catch {
		return DEFAULT_WATER_CONFIG;
	}
}

export async function saveWaterConfig(config: WaterReminderConfig): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** The HH:mm slots a config fires at each active day. */
export function waterReminderTimes(
	config: WaterReminderConfig,
	goalMl: number,
): string[] {
	const glasses = Math.max(1, Math.ceil(goalMl / GLASS_ML));
	return NotificationService.expandDailyWindow(
		config.startTime,
		config.endTime,
		config.intervalMinutes ?? undefined,
		glasses,
	);
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "11:30 AM", "tomorrow 7:00 AM" or "Mon 7:00 AM"; null when none is due. */
export function nextWaterReminder(
	config: WaterReminderConfig,
	goalMl: number,
	now: Date = new Date(),
): string | null {
	if (!config.enabled) return null;
	const times = waterReminderTimes(config, goalMl);
	if (times.length === 0) return null;
	const toMin = (t: string) => {
		const [h, m] = t.split(":").map(Number);
		return h * 60 + m;
	};
	const label = (t: string) => {
		const d = new Date(now);
		d.setHours(0, toMin(t), 0, 0);
		return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	};
	const nowMin = now.getHours() * 60 + now.getMinutes();
	for (let offset = 0; offset < 8; offset++) {
		const day = (now.getDay() + offset) % 7;
		if (config.days && !config.days.includes(day)) continue;
		const slot = offset === 0 ? times.find((t) => toMin(t) > nowMin) : times[0];
		if (!slot) continue;
		if (offset === 0) return label(slot);
		if (offset === 1) return `tomorrow ${label(slot)}`;
		return `${SHORT_DAYS[day]} ${label(slot)}`;
	}
	return null;
}

/** Cancels and rebuilds the schedule to match `config`, then persists it. */
export async function applyWaterConfig(
	config: WaterReminderConfig,
	goalMl: number,
): Promise<WaterReminderConfig> {
	const next = { ...config, scheduledForGoalMl: goalMl };
	if (config.enabled) {
		await NotificationService.scheduleWaterReminders(
			waterReminderTimes(config, goalMl),
			config.days,
			goalMl,
			config.sound,
		);
	} else {
		await NotificationService.cancelWaterReminders();
	}
	await saveWaterConfig(next);
	return next;
}

// ===================== NOTIFICATION ACTIONS =====================

const SNOOZE_MINUTES = 15;

// One press can reach both the foreground listener and the background task
// while the app is alive; both run in this JS runtime, so a Set de-duplicates.
const handledPresses = new Set<string>();

/**
 * "+250 ml" / "+500 ml" / "Snooze" pressed on a water reminder. Called by the
 * response listener in app/_layout.tsx and by the background task in index.js.
 * Returns false when the response isn't a water action, so callers can move on.
 */
export async function handleWaterNotificationAction(payload: unknown): Promise<boolean> {
	const response = payload as {
		actionIdentifier?: string;
		notification?: {
			date?: number;
			request?: { identifier?: string; content?: { data?: any; dataString?: string } };
		};
	};
	const action = response?.actionIdentifier;
	const amount =
		action === NotificationService.WATER_ACTION_250
			? 250
			: action === NotificationService.WATER_ACTION_500
				? 500
				: null;
	if (amount === null && action !== NotificationService.WATER_ACTION_SNOOZE) return false;

	const content = response.notification?.request?.content;
	let data = content?.data;
	try {
		if (!data && content?.dataString) data = JSON.parse(content.dataString);
	} catch {
		// Unreadable payload - the action id alone still identifies it.
	}
	if (data?.type && !String(data.type).startsWith("water_reminder")) return false;

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
		if (amount === null) {
			await NotificationService.scheduleNextWaterReminder(
				SNOOZE_MINUTES,
				"Snoozed reminder - time for that glass of water 💧",
				(await loadWaterConfig()).sound,
			);
		} else {
			await logWaterInBackground(amount);
		}
	} catch (error) {
		console.warn("Could not handle water reminder action:", error);
	}
	return true;
}

/**
 * Logs through the nutrition store when it's loaded, so open screens update;
 * otherwise (app closed) writes the same row straight to Supabase.
 */
async function logWaterInBackground(amount: number): Promise<void> {
	const store = useNutritionStore.getState();
	if (store.userId) {
		await store.logWater(amount);
		return;
	}

	const {
		data: { session },
	} = await supabase.auth.getSession();
	const userId = session?.user?.id;
	if (!userId) return;

	const now = new Date();
	// Same shape as nutritionStoreDB.logWater (which also casts: the generated
	// types don't include hydration_logs).
	const { error } = await (supabase as any).from("hydration_logs").insert({
		user_id: userId,
		date: now.toISOString().split("T")[0],
		amount_ml: amount,
		unit: "ml",
		timestamp: now.toISOString(),
	});
	if (error) throw error;
}
