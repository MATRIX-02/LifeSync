import Constants from "expo-constants";
import {
	activeWeekdays,
	expandDayTimes,
	MAX_REMINDERS_PER_HABIT,
	normalizeFrequency,
} from "../utils/frequency";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AppState, Linking, Platform } from "react-native";
import { supabase } from "../config/supabase";
import { FrequencyConfig, Frequency } from "../types";
import {
	getSound,
	NOTIFICATION_SOUNDS,
	NotificationSound,
	SYSTEM_SOUND_ID,
	previewDurationMs,
} from "../constants/notificationSounds";
import { useSoundPrefsStore } from "../context/soundPrefsStore";

/**
 * Bump this suffix whenever the alarm channel's settings must change: Android
 * freezes a channel after first creation, so the only way to change one is to
 * publish a new id and delete the old.
 */
const ALARM_CHANNEL_ID = "alarms-v2";
const REMINDER_CHANNEL_ID = "habit-reminders";
const WATER_CHANNEL_ID = "hydration-reminders";
const TONE_PREVIEW_ID = "tone-preview";
const HABIT_CATEGORY = "habit_reminder";

/**
 * Android reads the channel - and so the sound - from the TRIGGER, not the
 * content (expo-notifications ignores content.channelId). A notification
 * without one lands on the fallback channel and plays the default sound,
 * which is why custom tones never played.
 */
export function withChannel(
	trigger: Notifications.NotificationTriggerInput,
	channelId: string
): Notifications.NotificationTriggerInput {
	if (Platform.OS !== "android") return trigger;
	return trigger ? ({ ...trigger, channelId } as Notifications.NotificationTriggerInput) : { channelId };
}
const WATER_CATEGORY = "water_reminder";

// Settings shared by the base channel and every per-tone copy of it.
const reminderChannelBase = (): Notifications.NotificationChannelInput => ({
	name: "Habit Reminders",
	importance: Notifications.AndroidImportance.MAX,
	vibrationPattern: [0, 250, 250, 250],
	lightColor: "#A78BFA",
	enableVibrate: true,
	showBadge: true,
});

const alarmChannelBase = (): Notifications.NotificationChannelInput => ({
	name: "Alarms",
	importance: Notifications.AndroidImportance.MAX,
	audioAttributes: {
		usage: Notifications.AndroidAudioUsage.ALARM,
		contentType: Notifications.AndroidAudioContentType.SONIFICATION,
		flags: {
			enforceAudibility: true,
			requestHardwareAudioVideoSynchronization: false,
		},
	},
	enableVibrate: true,
	vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
	lightColor: "#F87171",
	bypassDnd: true,
	lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
	showBadge: true,
});

// Channels already created this session, so scheduling 20 reminders does not
// make 20 identical native calls.
const ensuredChannels = new Set<string>();

const waitForSoundPrefs = async () => {
	if (useSoundPrefsStore.persist.hasHydrated()) return;
	await new Promise<void>((resolve) => {
		const unsub = useSoundPrefsStore.persist.onFinishHydration(() => {
			unsub();
			resolve();
		});
	});
};

export class NotificationService {
	// Get and register the Expo Push Token for the current user
	static async registerPushToken(userId: string): Promise<string | null> {
		if (!Device.isDevice) {
			console.warn("Push notifications only work on physical devices");
			return null;
		}

		try {
			// Get permission first
			const { status: existingStatus } =
				await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;

			if (existingStatus !== "granted") {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}

			if (finalStatus !== "granted") {
				console.warn("Push notification permission not granted");
				return null;
			}

			// Get the Expo Push Token
			const projectId = Constants.expoConfig?.extra?.eas?.projectId;
			const tokenData = await Notifications.getExpoPushTokenAsync({
				projectId: projectId,
			});
			const pushToken = tokenData.data;

			console.log("📱 Expo Push Token:", pushToken);

			// Save to user's profile in Supabase
			const { error } = await (supabase.from("profiles") as any)
				.update({ expo_push_token: pushToken })
				.eq("id", userId);

			if (error) {
				console.error("Error saving push token:", error);
			} else {
				console.log("✅ Push token saved to profile");
			}

			return pushToken;
		} catch (error) {
			console.error("Error registering push token:", error);
			return null;
		}
	}

	// Send push notification to a specific user by their user ID
	static async sendPushNotificationToUser(
		targetUserId: string,
		title: string,
		body: string,
		data?: Record<string, any>
	): Promise<boolean> {
		try {
			// Get the target user's push token from Supabase
			const { data: profile, error } = await supabase
				.from("profiles")
				.select("expo_push_token")
				.eq("id", targetUserId)
				.single();

			if (error || !profile?.expo_push_token) {
				console.warn(
					`No push token found for user ${targetUserId}:`,
					error?.message
				);
				return false;
			}

			const pushToken = profile.expo_push_token;

			// Send via Expo Push API
			const message = {
				to: pushToken,
				sound: "default",
				title,
				body,
				data: data || {},
			};

			const response = await fetch("https://exp.host/--/api/v2/push/send", {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Accept-encoding": "gzip, deflate",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(message),
			});

			const result = await response.json();

			if (result.data?.status === "ok") {
				console.log(`✅ Push notification sent to user ${targetUserId}`);
				return true;
			} else {
				console.error("Push notification error:", result);
				return false;
			}
		} catch (error) {
			console.error("Error sending push notification:", error);
			return false;
		}
	}

	// Clear push token on logout
	static async clearPushToken(userId: string): Promise<void> {
		try {
			await (supabase.from("profiles") as any)
				.update({ expo_push_token: null })
				.eq("id", userId);
			console.log("🗑️ Push token cleared from profile");
		} catch (error) {
			console.error("Error clearing push token:", error);
		}
	}
	// Local notifications work on emulators too; only push tokens need a real
	// device, and registerPushToken() checks that itself. (A device check here
	// made every local reminder, preview and channel silently no-op on emulators.)
	static async requestPermissions(): Promise<boolean> {
		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		// Set up notification channel for Android
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
				...reminderChannelBase(),
				sound: "default",
			});

			// Study Hub was removed; drop its channel from system settings.
			await Notifications.deleteNotificationChannelAsync("study-reminders");

			// Tone channels from before the "-t2" ids were frozen on the default
			// sound; drop them so Android settings doesn't list each tone twice.
			for (const tone of NOTIFICATION_SOUNDS) {
				for (const base of [REMINDER_CHANNEL_ID, ALARM_CHANNEL_ID]) {
					await Notifications.deleteNotificationChannelAsync(`${base}-${tone.id}`).catch(() => {});
				}
			}

			// Alarm channel.
			//
			// The important part is audioAttributes.usage = ALARM: it plays on the
			// ALARM audio stream, so it follows alarm volume and is NOT silenced by
			// ring/vibrate mode. enforceAudibility pushes that further. Without
			// these an "alarm" is just a notification with a longer buzz, which is
			// exactly how the previous version behaved.
			//
			// NOTE THE ID. Android FREEZES a channel's settings after first
			// creation - editing them is silently ignored forever. The original
			// "alarms" channel is therefore unfixable and has to be replaced by a
			// new id, and deleted so it stops showing in system settings.
			await Notifications.deleteNotificationChannelAsync("alarms").catch(
				() => undefined
			);

			await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
				...alarmChannelBase(),
				sound: "default",
			});

			// Also set up a default channel
			await Notifications.setNotificationChannelAsync("default", {
				name: "Default",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				sound: "default",
			});
		}

		return finalStatus === "granted";
	}

	static async scheduleNotification(
		title: string,
		body: string,
		trigger: Notifications.NotificationTriggerInput,
		data?: Record<string, any>,
		channelId: string = "habit-reminders",
		sound: string | boolean = "default",
		categoryIdentifier?: string
	): Promise<string> {
		try {
			const notificationId = await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data: data || {},
					sound,
					badge: 1,
					...(categoryIdentifier ? { categoryIdentifier } : {}),
				},
				// Android routes sound/vibration/DND through the channel
				trigger: withChannel(trigger, channelId),
			});
			console.log(
				`📅 Scheduled notification: ${notificationId} for "${title}"`
			);
			return notificationId;
		} catch (error) {
			console.error("Error scheduling notification:", error);
			throw error;
		}
	}

	static async scheduleHabitReminder(
		habitId: string,
		habitName: string,
		timeString: string // HH:mm format
	): Promise<string> {
		const [hours, minutes] = timeString.split(":").map(Number);

		// Use DailyTriggerInput format (correct for expo-notifications)
		const trigger: Notifications.DailyTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DAILY,
			hour: hours,
			minute: minutes,
		};

		return this.scheduleNotification(
			"🎯 Habit Reminder",
			`Time to complete: ${habitName}`,
			trigger,
			{ habitId, type: "habit_reminder" }
		);
	}

	// Expand a "times_per_day" window into the concrete HH:mm slots it fires at.
	// Falls back to evenly spreading `count` reminders across the window when no
	// interval is configured.
	static expandDailyWindow(
		startTime: string,
		endTime: string,
		intervalMinutes: number | undefined,
		count: number
	): string[] {
		const toMinutes = (t: string) => {
			const [h, m] = t.split(":").map(Number);
			return h * 60 + m;
		};
		const toHHmm = (mins: number) => {
			const h = Math.floor(mins / 60) % 24;
			const m = mins % 60;
			return `${h.toString().padStart(2, "0")}:${m
				.toString()
				.padStart(2, "0")}`;
		};

		const start = toMinutes(startTime);
		const end = toMinutes(endTime);
		if (end <= start) return [startTime];

		const step =
			intervalMinutes && intervalMinutes > 0
				? intervalMinutes
				: Math.max(1, Math.floor((end - start) / Math.max(1, count - 1)));

		const slots: string[] = [];
		for (let t = start; t <= end && slots.length < 24; t += step) {
			slots.push(toHHmm(t));
			if (step <= 0) break;
		}
		return slots.length > 0 ? slots : [startTime];
	}

	/**
	 * Where a habit's reminders go and what they play.
	 *
	 * Android plays the CHANNEL's sound and freezes it when the channel is
	 * created, so a tone cannot be set per notification. Each bundled tone
	 * therefore gets its own channel (one for reminders, one for alarms),
	 * created on first use. "System" keeps the base channel, whose tone the
	 * user can change in Android's settings. iOS reads `sound` directly.
	 */
	static async resolveHabitSound(habit: {
		alarmEnabled?: boolean;
		reminderSound?: string | null;
		alarmSound?: string | null;
	}): Promise<{ channelId: string; sound: string }> {
		await waitForSoundPrefs();
		const prefs = useSoundPrefsStore.getState();
		const isAlarm = !!habit.alarmEnabled;
		const chosen = isAlarm
			? habit.alarmSound || prefs.defaultAlarmSound
			: habit.reminderSound || prefs.defaultReminderSound;
		const tone = chosen === SYSTEM_SOUND_ID ? undefined : getSound(chosen);
		const baseId = isAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID;

		if (!tone) return { channelId: baseId, sound: "default" };
		return {
			channelId: await this.ensureToneChannel(isAlarm, tone),
			sound: tone.file,
		};
	}

	/**
	 * Plays a tone the way a real reminder would: as a notification on that
	 * tone's channel, so it uses the notification volume. (In-app playback uses
	 * the media volume, which is often muted while notifications are not.)
	 * Dismissed once the tone has finished.
	 */
	static async previewTone(toneId: string, kind: "reminder" | "alarm"): Promise<boolean> {
		// Creates the base channels too, which "System default" relies on.
		if (!(await this.requestPermissions())) return false;
		const { channelId, sound } = await this.resolveHabitSound(
			kind === "alarm" ? { alarmEnabled: true, alarmSound: toneId } : { reminderSound: toneId }
		);
		const label = toneId === SYSTEM_SOUND_ID ? "System default" : getSound(toneId)?.label ?? "Tone";
		try {
			await Notifications.dismissNotificationAsync(TONE_PREVIEW_ID);
			await Notifications.scheduleNotificationAsync({
				identifier: TONE_PREVIEW_ID,
				content: {
					title: "🔔 Tone preview",
					body: `${label} - this is how your reminder will sound`,
					sound,
					data: { type: "tone_preview" },
				},
				trigger: withChannel(null, channelId),
			});
			// Dismissing stops the sound, so wait for the whole tone.
			setTimeout(() => {
				void Notifications.dismissNotificationAsync(TONE_PREVIEW_ID).catch(() => {});
			}, previewDurationMs(toneId));
			return true;
		} catch (error) {
			console.warn("Tone preview failed:", error);
			return false;
		}
	}

	private static async ensureToneChannel(
		isAlarm: boolean,
		tone: NotificationSound
	): Promise<string> {
		// "-t2": tone channels made before their sound file was bundled (e.g. by
		// an older build) were frozen with the default sound, and Android
		// restores a deleted channel's settings when the same id is recreated -
		// so a new id is the only repair. Bump again if that ever recurs.
		const channelId = `${isAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID}-${tone.id}-t2`;
		if (Platform.OS !== "android" || ensuredChannels.has(channelId)) {
			return channelId;
		}
		const base = isAlarm ? alarmChannelBase() : reminderChannelBase();
		await Notifications.setNotificationChannelAsync(channelId, {
			...base,
			name: `${base.name} - ${tone.label}`,
			sound: tone.file,
		});
		ensuredChannels.add(channelId);
		return channelId;
	}

	// Schedule every reminder a habit needs, honouring its frequency config.
	// Returns the ids of all notifications created.
	static async scheduleHabitReminders(habit: {
		id: string;
		name: string;
		notificationTime?: string;
		// Accepts either shape; normalizeFrequency() converts.
		frequency?: Frequency | FrequencyConfig;
		/** Shown as the reminder body when set, e.g. "Did you read today?". */
		question?: string;
		/** Route through the louder "alarms" channel (MAX importance, bypasses DND). */
		alarmEnabled?: boolean;
		/** Tone ids from constants/notificationSounds; unset = the user's default. */
		reminderSound?: string | null;
		alarmSound?: string | null;
	}): Promise<string[]> {
		// Always start from a clean slate so edits never leave orphans behind.
		await this.cancelHabitNotifications(habit.id);

		const frequency = habit.frequency;
		const baseTime = habit.notificationTime || "09:00";
		const ids: string[] = [];

		// Android takes importance, vibration, do-not-disturb behaviour AND the
		// tone from the CHANNEL, so an alarm habit, and every tone, has to be
		// delivered on its own. Always audible: a reminder you asked for should
		// make a sound.
		const { channelId, sound } = await this.resolveHabitSound(habit);
		const title = habit.alarmEnabled ? "⏰ Habit Alarm" : "🎯 Habit Reminder";

		// A habit's own question is the whole point of the field - asking "Did you
		// read today?" lands better than a generic "Time to complete: Reading".
		// Fall back to the generic body only when no question is set.
		const question = habit.question?.trim();
		const body = question || `Time to complete: ${habit.name}`;

		// Days x times. The two axes are independent now, so a habit can be
		// "3 times a day on Mon/Wed/Fri" - which the old single-enum model could
		// not express at all.
		const normalized = normalizeFrequency(frequency, baseTime);
		const times = expandDayTimes(normalized.perDay, baseTime);
		const weekdays = activeWeekdays(normalized.schedule);

		const total = times.length * (weekdays ? weekdays.length : 1);
		if (total > MAX_REMINDERS_PER_HABIT) {
			// Android caps pending alarms per app. Refusing loudly beats letting
			// the OS silently drop whichever ones it feels like.
			console.warn(
				`Habit "${habit.name}" would schedule ${total} reminders; capping at ${MAX_REMINDERS_PER_HABIT}.`
			);
		}

		const label = (i: number) =>
			times.length > 1 ? `(${i + 1}/${times.length})` : undefined;

		// Everything the Done/Snooze buttons need, so they work with the app
		// closed (habitReminderActions.ts) without loading the habit.
		await this.ensureHabitCategory();
		const reminderData = {
			habitId: habit.id,
			type: "habit_reminder",
			target: Math.max(1, times.length),
			channelId,
			sound,
		};

		outer: for (let i = 0; i < times.length; i++) {
			const [hour, minute] = times[i].split(":").map(Number);
			const suffix = label(i);
			const text = suffix ? `${body} ${suffix}` : body;

			if (weekdays) {
				// Day-restricted: one WEEKLY trigger per (day, time) pair.
				for (const day of weekdays) {
					if (ids.length >= MAX_REMINDERS_PER_HABIT) break outer;
					const id = await this.scheduleNotification(
						title,
						text,
						{
							type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
							// expo-notifications weekday is 1-7 with 1 = Sunday
							weekday: day + 1,
							hour,
							minute,
						},
						reminderData,
						channelId,
						sound,
						HABIT_CATEGORY
					);
					ids.push(id);
				}
			} else {
				// Every day (or a flexible schedule, which has no fixed days).
				if (ids.length >= MAX_REMINDERS_PER_HABIT) break outer;
				const id = await this.scheduleNotification(
					title,
					text,
					{
						type: Notifications.SchedulableTriggerInputTypes.DAILY,
						hour,
						minute,
					},
					reminderData,
					channelId,
					sound,
					HABIT_CATEGORY
				);
				ids.push(id);
			}
		}

		return ids;
	}

	static readonly HABIT_ACTION_DONE = "habit_done";
	static readonly HABIT_ACTION_SNOOZE = "habit_snooze";

	// Buttons on habit reminders. Neither opens the app: handled by the
	// listener in app/_layout.tsx, or the background task in index.js.
	static async ensureHabitCategory(): Promise<void> {
		await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY, [
			{
				identifier: NotificationService.HABIT_ACTION_DONE,
				buttonTitle: "Done ✓",
				options: { opensAppToForeground: false },
			},
			{
				identifier: NotificationService.HABIT_ACTION_SNOOZE,
				buttonTitle: "Snooze 10 min",
				options: { opensAppToForeground: false },
			},
		]);
	}

	/**
	 * A habit-style reminder in a few seconds, with the default reminder tone
	 * and the Done/Snooze buttons - what Settings > Test Notification sends.
	 * `test: true` makes Done a no-op instead of logging a habit.
	 */
	static async sendTestReminder(seconds = 3): Promise<string> {
		await this.ensureHabitCategory();
		const { channelId, sound } = await this.resolveHabitSound({});
		return this.scheduleNotification(
			"🎯 Habit Reminder",
			"This is how your reminders will look and sound. Try the buttons.",
			{ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
			{ type: "habit_reminder_test", habitId: "test", test: true, channelId, sound },
			channelId,
			sound,
			HABIT_CATEGORY
		);
	}

	/** Re-sends a habit reminder after `minutes`, on the same channel and tone. */
	static async snoozeHabitReminder(
		data: { habitId: string; target?: number; channelId?: string; sound?: string },
		title: string,
		body: string,
		minutes = 10
	): Promise<string> {
		await this.ensureHabitCategory();
		return this.scheduleNotification(
			title,
			body,
			{
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
				seconds: minutes * 60,
			},
			{ ...data, type: "habit_reminder_snooze" },
			data.channelId ?? REMINDER_CHANNEL_ID,
			data.sound ?? "default",
			HABIT_CATEGORY
		);
	}

	// Cancel every reminder belonging to a habit, found by its data payload.
	static async cancelHabitNotifications(habitId: string): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const data = notif.content.data;
			if (data?.type === "habit_reminder" && data?.habitId === habitId) {
				await this.cancelNotification(notif.identifier);
			}
		}
	}

	// Cancel every habit reminder, leaving bills/water/timers untouched.
	static async cancelAllHabitNotifications(): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			if (notif.content.data?.type === "habit_reminder") {
				await this.cancelNotification(notif.identifier);
			}
		}
	}

	static async scheduleInstantNotification(
		title: string,
		body: string,
		data?: Record<string, any>
	): Promise<string> {
		return this.scheduleNotification(title, body, null, data);
	}

	static async cancelNotification(notificationId: string): Promise<void> {
		try {
			await Notifications.cancelScheduledNotificationAsync(notificationId);
		} catch (error) {
			console.error("Error canceling notification:", error);
		}
	}

	static async cancelAllNotifications(): Promise<void> {
		try {
			await Notifications.cancelAllScheduledNotificationsAsync();
		} catch (error) {
			console.error("Error canceling all notifications:", error);
		}
	}

	static async getAllScheduledNotifications(): Promise<
		Notifications.NotificationRequest[]
	> {
		return await Notifications.getAllScheduledNotificationsAsync();
	}

	// Debug helper to log all scheduled notifications
	static async debugListScheduledNotifications(): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		console.log(`\n📋 Scheduled Notifications (${scheduled.length} total):`);
		scheduled.forEach((notif, index) => {
			console.log(`  ${index + 1}. ID: ${notif.identifier}`);
			console.log(`     Title: ${notif.content.title}`);
			console.log(`     Body: ${notif.content.body}`);
			console.log(`     Trigger:`, JSON.stringify(notif.trigger, null, 2));
		});
		if (scheduled.length === 0) {
			console.log("  No notifications scheduled.");
		}
		console.log("");
	}

	// Test notification - sends immediately to verify setup works
	static async sendTestNotification(): Promise<string> {
		return this.scheduleInstantNotification(
			"🧪 Test Notification",
			"Notifications are working correctly!",
			{ type: "test" }
		);
	}

	/**
	 * Open Android's own per-channel notification settings.
	 *
	 * This is how a user picks ANY sound on their device - system ringtones and
	 * alarm tones, or their own audio files. The app cannot do it directly:
	 * expo-notifications only accepts a sound bundled into res/raw at build time,
	 * and Android freezes a channel's settings after creation so the app cannot
	 * change one later anyway.
	 *
	 * The user CAN change it, though - user edits to a channel take precedence
	 * and persist - so sending them to the right screen is the supported route,
	 * not a workaround.
	 */
	static async openChannelSettings(
		channel: "alarm" | "reminder"
	): Promise<boolean> {
		if (Platform.OS !== "android") return false;

		const channelId =
			channel === "alarm" ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID;
		const packageName =
			Constants.expoConfig?.android?.package ||
			(Constants as any).expoConfig?.slug;

		if (!packageName) {
			console.warn("openChannelSettings: package name unavailable");
			return false;
		}

		try {
			// Make sure the channel exists, or the screen opens empty.
			await this.requestPermissions();
			await Linking.sendIntent(
				"android.settings.CHANNEL_NOTIFICATION_SETTINGS",
				[
					{ key: "android.provider.extra.APP_PACKAGE", value: packageName },
					{ key: "android.provider.extra.CHANNEL_ID", value: channelId },
				]
			);
			return true;
		} catch (error) {
			console.error("Failed to open channel settings:", error);
			// Fall back to the app's notification settings page.
			try {
				await Linking.openSettings();
				return true;
			} catch {
				return false;
			}
		}
	}

	// ============ ALARMS ============

	/**
	 * Fires an alarm-channel notification after `seconds`.
	 *
	 * On Android the loud/bypass-DND behaviour comes from the "alarms" channel,
	 * which requestPermissions() creates. This is a high-priority notification,
	 * not a true full-screen alarm: waking the screen with an alarm UI needs
	 * USE_FULL_SCREEN_INTENT and a native activity, which this app does not have.
	 */
	static async scheduleTestAlarm(seconds: number = 10): Promise<string> {
		return this.scheduleNotification(
			"⏰ Test Alarm",
			"If you can hear this, alarm delivery is working.",
			{
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
				seconds,
				repeats: false,
			},
			{ type: "alarm_test" },
			ALARM_CHANNEL_ID
		);
	}

	/**
	 * What we can actually detect about alarm readiness from JS.
	 * Exact-alarm ("Alarms & reminders") and battery-optimisation state are NOT
	 * queryable through expo-notifications - they need a native module - so this
	 * reports notification permission and channel config only.
	 */
	static async getAlarmDiagnostics(): Promise<{
		permission: string;
		canAskAgain: boolean;
		channelExists: boolean;
		channelImportance: number | null;
		channelSound: string | null;
		isDevice: boolean;
	}> {
		const perms = await Notifications.getPermissionsAsync();
		let channel = null;
		if (Platform.OS === "android") {
			channel = await Notifications.getNotificationChannelAsync(
				ALARM_CHANNEL_ID
			);
		}
		return {
			permission: perms.status,
			canAskAgain: perms.canAskAgain,
			channelExists: Platform.OS !== "android" || !!channel,
			channelImportance: channel?.importance ?? null,
			channelSound: (channel?.sound as string) ?? null,
			isDevice: Device.isDevice,
		};
	}

	// Study Hub was removed. Its reminders were scheduled on-device, so they
	// keep firing until cancelled - clear them by payload type.
	static async cancelRetiredStudyNotifications(): Promise<void> {
		const retired = new Set([
			"study_reminder",
			"flashcard_review",
			"revision_reminder",
			"goal_deadline",
		]);
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const type = notif.content.data?.type;
			if (typeof type === "string" && retired.has(type)) {
				await this.cancelNotification(notif.identifier);
			}
		}
	}

	// Schedule bill reminder notification
	static async scheduleBillReminder(
		billId: string,
		billName: string,
		amount: number,
		dueDate: string, // YYYY-MM-DD format
		reminderDays: number = 3,
		currency: string = "₹"
	): Promise<string | null> {
		const dueDateObj = new Date(dueDate);
		const reminderDate = new Date(dueDateObj);
		reminderDate.setDate(reminderDate.getDate() - reminderDays);

		// Set reminder for 9 AM
		reminderDate.setHours(9, 0, 0, 0);

		const now = new Date();

		// If reminder date is in the past, schedule for due date itself at 9 AM
		if (reminderDate <= now) {
			reminderDate.setTime(dueDateObj.getTime());
			reminderDate.setHours(9, 0, 0, 0);

			// If due date is also in the past, don't schedule
			if (reminderDate <= now) {
				console.log(
					`⏭️ Bill "${billName}" due date already passed, skipping notification`
				);
				return null;
			}
		}

		const trigger: Notifications.DateTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: reminderDate,
		};

		const daysUntilDue = Math.ceil(
			(dueDateObj.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		const body =
			daysUntilDue > 0
				? `${billName} (${currency}${amount}) is due in ${daysUntilDue} days`
				: `${billName} (${currency}${amount}) is due today!`;

		return this.scheduleNotification("💸 Bill Reminder", body, trigger, {
			billId,
			type: "bill_reminder",
		});
	}

	// Cancel bill reminder by bill ID
	static async cancelBillReminder(billId: string): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			if (notif.content.data?.billId === billId) {
				await this.cancelNotification(notif.identifier);
				console.log(`🗑️ Cancelled notification for bill: ${billId}`);
			}
		}
	}

	// Cancel scheduled notifications related to a split/group by group ID
	static async cancelGroupNotifications(groupId: string): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const data = notif.content.data || {};
			// check common keys used for group-related notifications
			if (
				data?.groupId === groupId ||
				data?.group_id === groupId ||
				data?.splitGroupId === groupId
			) {
				await this.cancelNotification(notif.identifier);
				console.log(
					`🗑️ Cancelled group notification: ${notif.identifier} for group ${groupId}`
				);
			}
		}
	}

	// ============ HYDRATION NOTIFICATIONS ============

	/**
	 * Rebuilds the daily water reminders: one trigger per time slot, WEEKLY per
	 * active day when `days` is set, DAILY otherwise. Each slot states how much
	 * of the goal should be drunk by then, which stays true whatever was logged.
	 * `sound` is a tone id; "" follows the Settings default reminder tone.
	 */
	static async scheduleWaterReminders(
		times: string[],
		days: number[] | null,
		goalMl: number,
		sound: string
	): Promise<string[]> {
		await this.cancelWaterReminders();

		// Same tone channels as habits; the "system" tone keeps its own channel
		// so hydration stays separately configurable in Android settings.
		const resolved = await this.resolveWaterSound(sound);
		const channelId = resolved.channelId;

		await this.ensureWaterCategory();
		const weekdays = days && days.length > 0 && days.length < 7 ? days : null;
		const ids: string[] = [];

		outer: for (let i = 0; i < times.length; i++) {
			const [hour, minute] = times[i].split(":").map(Number);
			const byNow = Math.round((goalMl * (i + 1)) / times.length / 50) * 50;
			const body =
				i === times.length - 1
					? `Last one today - finish your ${goalMl}ml goal.`
					: `Have a glass of water. Aim for ${byNow}ml of ${goalMl}ml by now.`;
			const data = { type: "water_reminder", reminderNumber: i + 1 };

			for (const day of weekdays ?? [null]) {
				if (ids.length >= MAX_REMINDERS_PER_HABIT) break outer;
				const trigger: Notifications.NotificationTriggerInput =
					day === null
						? {
								type: Notifications.SchedulableTriggerInputTypes.DAILY,
								hour,
								minute,
							}
						: {
								type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
								// expo-notifications weekday is 1-7 with 1 = Sunday
								weekday: day + 1,
								hour,
								minute,
							};
				try {
					ids.push(
						await this.scheduleNotification(
							"💧 Hydration Reminder",
							body,
							trigger,
							data,
							channelId,
							resolved.sound,
							WATER_CATEGORY
						)
					);
				} catch (error) {
					console.error(`Error scheduling water reminder at ${times[i]}:`, error);
				}
			}
		}

		return ids;
	}

	// Cancel all water reminder notifications
	static async cancelWaterReminders(): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			if (notif.content.data?.type === "water_reminder") {
				await this.cancelNotification(notif.identifier);
			}
		}
		console.log("🗑️ Cancelled all water reminders");
	}

	static readonly WATER_ACTION_250 = "water_250";
	static readonly WATER_ACTION_500 = "water_500";
	static readonly WATER_ACTION_SNOOZE = "water_snooze";

	// Buttons on every water reminder. None open the app: they're handled by
	// the listener in app/_layout.tsx when it's running, otherwise by the
	// background task in index.js (see services/waterReminders.ts).
	static async ensureWaterCategory(): Promise<void> {
		await Notifications.setNotificationCategoryAsync(WATER_CATEGORY, [
			{
				identifier: NotificationService.WATER_ACTION_250,
				buttonTitle: "+250 ml",
				options: { opensAppToForeground: false },
			},
			{
				identifier: NotificationService.WATER_ACTION_500,
				buttonTitle: "+500 ml",
				options: { opensAppToForeground: false },
			},
			{
				identifier: NotificationService.WATER_ACTION_SNOOZE,
				buttonTitle: "Snooze 15m",
				options: { opensAppToForeground: false },
			},
		]);
	}

	// A one-off water reminder after X minutes (also used by Snooze), with the
	// same buttons and tone as the daily ones.
	static async scheduleNextWaterReminder(
		minutesFromNow: number,
		customMessage?: string,
		/** The water reminder tone; "" or omitted plays the plain hydration channel. */
		toneId?: string
	): Promise<string> {
		await this.ensureWaterCategory();
		const { channelId, sound } = await this.resolveWaterSound(toneId ?? "");
		const trigger: Notifications.TimeIntervalTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			seconds: Math.max(1, Math.round(minutesFromNow * 60)),
		};

		return this.scheduleNotification(
			"💧 Water Reminder",
			customMessage || "Time to drink some water! Stay hydrated!",
			trigger,
			{ type: "water_reminder_single" },
			channelId,
			sound,
			WATER_CATEGORY
		);
	}

	/** Tone channels are shared with habits; "system" keeps the hydration channel. */
	private static async resolveWaterSound(toneId: string): Promise<{ channelId: string; sound: string }> {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync(WATER_CHANNEL_ID, {
				name: "Hydration Reminders",
				importance: Notifications.AndroidImportance.HIGH,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#4FC3F7",
				sound: "default",
				enableVibrate: true,
				showBadge: true,
			});
		}
		if (!toneId) return { channelId: WATER_CHANNEL_ID, sound: "default" };
		const resolved = await this.resolveHabitSound({ reminderSound: toneId });
		return {
			channelId: resolved.channelId === REMINDER_CHANNEL_ID ? WATER_CHANNEL_ID : resolved.channelId,
			sound: resolved.sound,
		};
	}

	// ============ FASTING TIMER NOTIFICATIONS ============

	// Start a persistent fasting timer notification (Android only supports ongoing)
	static async startFastingTimerNotification(
		fastType: string,
		targetHours: number,
		startTime: Date
	): Promise<string | null> {
		if (Platform.OS === "android") {
			// Create fasting channel
			await Notifications.setNotificationChannelAsync("fasting-timer", {
				name: "Fasting Timer",
				importance: Notifications.AndroidImportance.LOW,
				vibrationPattern: [0],
				sound: null,
				enableVibrate: false,
				showBadge: false,
			});
		}

		try {
			// Schedule milestone notifications
			const milestoneHours = [4, 8, 12, 16, 20];
			const notificationIds: string[] = [];

			for (const milestone of milestoneHours) {
				if (milestone < targetHours) {
					const milestoneTime = new Date(
						startTime.getTime() + milestone * 60 * 60 * 1000
					);
					if (milestoneTime > new Date()) {
						const trigger: Notifications.DateTriggerInput = {
							type: Notifications.SchedulableTriggerInputTypes.DATE,
							date: milestoneTime,
						};

						const notifId = await Notifications.scheduleNotificationAsync({
							content: {
								title: `⏰ Fasting Milestone: ${milestone} hours!`,
								body: `Great progress! ${
									targetHours - milestone
								} hours remaining.`,
								data: { type: "fasting_milestone", milestone },
								sound: "default",
							},
							trigger: withChannel(trigger, "fasting-timer"),
						});
						notificationIds.push(notifId);
					}
				}
			}

			// Schedule completion notification
			const endTime = new Date(
				startTime.getTime() + targetHours * 60 * 60 * 1000
			);
			if (endTime > new Date()) {
				const completionTrigger: Notifications.DateTriggerInput = {
					type: Notifications.SchedulableTriggerInputTypes.DATE,
					date: endTime,
				};

				const completionId = await Notifications.scheduleNotificationAsync({
					content: {
						title: "🎉 Fast Complete!",
						body: `Congratulations! You completed your ${targetHours}-hour ${fastType} fast!`,
						data: { type: "fasting_complete" },
						sound: "default",
					},
					trigger: withChannel(completionTrigger, "fasting-timer"),
				});
				notificationIds.push(completionId);
			}

			console.log(
				`✅ Scheduled ${notificationIds.length} fasting notifications`
			);
			return notificationIds[0] || null;
		} catch (error) {
			console.error("Error scheduling fasting notifications:", error);
			return null;
		}
	}

	// Cancel fasting timer notifications
	static async cancelFastingNotifications(): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const type = notif.content.data?.type;
			if (
				type === "fasting_milestone" ||
				type === "fasting_complete" ||
				type === "fasting_timer"
			) {
				await this.cancelNotification(notif.identifier);
			}
		}
		console.log("🗑️ Cancelled all fasting notifications");
	}

	// ============ POMODORO TIMER NOTIFICATIONS ============

	// Schedule pomodoro session end notification
	static async schedulePomodoroEndNotification(
		durationMinutes: number,
		sessionNumber: number
	): Promise<string> {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("pomodoro-timer", {
				name: "Pomodoro Timer",
				importance: Notifications.AndroidImportance.HIGH,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#FF6B6B",
				sound: "default",
				enableVibrate: true,
				showBadge: true,
			});
		}

		const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

		const trigger: Notifications.DateTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: endTime,
		};

		const notifId = await Notifications.scheduleNotificationAsync({
			content: {
				title: "🍅 Pomodoro Complete!",
				body: `Session ${sessionNumber} finished! Time for a break.`,
				data: { type: "pomodoro_end", sessionNumber },
				sound: "default",
			},
			trigger: withChannel(trigger, "pomodoro-timer"),
		});

		console.log(
			`⏱️ Scheduled pomodoro end notification for ${durationMinutes} minutes`
		);
		return notifId;
	}

	// Schedule break end notification
	static async scheduleBreakEndNotification(
		breakMinutes: number,
		isLongBreak: boolean
	): Promise<string> {
		const endTime = new Date(Date.now() + breakMinutes * 60 * 1000);

		const trigger: Notifications.DateTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: endTime,
		};

		const notifId = await Notifications.scheduleNotificationAsync({
			content: {
				title: "⏰ Break Over!",
				body: isLongBreak
					? "Long break finished! Ready for another round?"
					: "Short break done! Time to focus again.",
				data: { type: "break_end", isLongBreak },
				sound: "default",
			},
			trigger: withChannel(trigger, "pomodoro-timer"),
		});

		console.log(
			`☕ Scheduled break end notification for ${breakMinutes} minutes`
		);
		return notifId;
	}

	// ---- Detected transactions ("Ask first") ----
	//
	// Posted by the headless notification-listener task when a payment is
	// detected. Tapping it opens Money Hub on a pre-filled review sheet
	// (routed in app/_layout.tsx by data.type). Cancelled by payload id.

	/** Action buttons on a detected-payment notification. */
	static readonly DETECTED_ACTION_REVIEW = "detected_review";
	static readonly DETECTED_ACTION_IGNORE = "detected_ignore";

	private static async ensureDetectedCategory(): Promise<void> {
		await Notifications.setNotificationCategoryAsync("detected_transaction", [
			{
				identifier: NotificationService.DETECTED_ACTION_REVIEW,
				buttonTitle: "Add",
				options: { opensAppToForeground: true },
			},
			{
				// Handled without opening the app: by the listener in app/_layout.tsx
				// when it's running, otherwise by the background task in index.js.
				identifier: NotificationService.DETECTED_ACTION_IGNORE,
				buttonTitle: "Ignore",
				options: { opensAppToForeground: false },
			},
		]);
	}

	static async showDetectedTransaction(tx: {
		id: string;
		type: "income" | "expense" | "transfer";
		amount: number;
		merchant?: string;
		bankName?: string;
		accountNumber?: string;
		sourceApp?: string;
	}, currency = "₹"): Promise<void> {
		try {
			if (Platform.OS === "android") {
				await Notifications.setNotificationChannelAsync("transaction-detection", {
					name: "Detected Payments",
					description: "Payments detected from bank SMS and UPI apps",
					importance: Notifications.AndroidImportance.DEFAULT,
				});
			}
			const amount = `${currency}${tx.amount.toLocaleString("en-IN", {
				maximumFractionDigits: 2,
			})}`;
			await NotificationService.ensureDetectedCategory();
			const who = tx.merchant ? ` ${tx.type === "income" ? "from" : "at"} ${tx.merchant}` : "";
			const title =
				tx.type === "income" ? `${amount} received${who}` : `${amount} spent${who}`;
			const via = [
				tx.bankName ?? tx.sourceApp,
				tx.accountNumber ? `••${tx.accountNumber}` : null,
			]
				.filter(Boolean)
				.join(" ");
			await Notifications.scheduleNotificationAsync({
				identifier: `detected_${tx.id}`,
				content: {
					title,
					body: `${via ? `${via} · ` : ""}Tap to add to Money Hub`,
					data: { type: "detected_transaction", id: tx.id },
					categoryIdentifier: "detected_transaction",
				},
				// The Android channel goes on the trigger in this expo-notifications
				// version; on `content` it is ignored and the fallback channel is used.
				trigger:
					Platform.OS === "android" ? { channelId: "transaction-detection" } : null,
			});
		} catch (error) {
			console.warn("Could not show detected transaction:", error);
		}
	}

	/** Posts the "Test detection" probe (see detectionQueue DETECTION_TEST_TITLE). */
	static async postDetectionTest(title: string): Promise<void> {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("transaction-detection", {
				name: "Detected Payments",
				description: "Payments detected from bank SMS and UPI apps",
				importance: Notifications.AndroidImportance.DEFAULT,
			});
		}
		await Notifications.scheduleNotificationAsync({
			identifier: "detection_test",
			content: {
				title,
				body: "Checking that LifeSync can see notifications. You can ignore this.",
				data: { type: "detection_test" },
			},
			trigger: Platform.OS === "android" ? { channelId: "transaction-detection" } : null,
		});
	}

	static async dismissDetectionTest(): Promise<void> {
		try {
			await Notifications.dismissNotificationAsync("detection_test");
		} catch {
			// Already gone.
		}
	}

	static async cancelDetectedTransaction(id: string): Promise<void> {
		try {
			await Notifications.dismissNotificationAsync(`detected_${id}`);
		} catch {
			// Already gone - nothing to do.
		}
	}

	// ---- Workout timers (timed sets and rest) ----
	//
	// Backup alerts for when the phone is locked or the user is in another app.
	// `kind` keeps the set timer and the rest timer independent, so cancelling
	// one never touches the other (or any other module's notifications).

	static async scheduleWorkoutTimer(
		kind: "set" | "rest",
		seconds: number,
		title: string,
		body: string,
	): Promise<string | null> {
		try {
			await this.cancelWorkoutTimer(kind);
			if (seconds <= 0) return null;
			if (Platform.OS === "android") {
				await Notifications.setNotificationChannelAsync("workout-timer", {
					name: "Workout Timer",
					importance: Notifications.AndroidImportance.HIGH,
					vibrationPattern: [0, 400, 150, 400, 150, 600],
					sound: "default",
					enableVibrate: true,
				});
			}
			return await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data: { type: "workout_timer", kind },
					sound: "default",
				},
				trigger: {
					type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
					seconds: Math.max(1, Math.round(seconds)),
					// Channel belongs on the trigger (ignored on content).
					...(Platform.OS === "android" && { channelId: "workout-timer" }),
				},
			});
		} catch (error) {
			console.warn("Could not schedule workout timer:", error);
			return null;
		}
	}

	static async cancelWorkoutTimer(kind?: "set" | "rest"): Promise<void> {
		try {
			const scheduled = await this.getAllScheduledNotifications();
			for (const notif of scheduled) {
				const data = notif.content.data as any;
				if (data?.type === "workout_timer" && (!kind || data.kind === kind))
					await this.cancelNotification(notif.identifier);
			}
		} catch (error) {
			console.warn("Could not cancel workout timer:", error);
		}
	}

	// Cancel all pomodoro notifications
	static async cancelPomodoroNotifications(): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const type = notif.content.data?.type;
			if (
				type === "pomodoro_end" ||
				type === "break_end" ||
				type === "pomodoro_complete"
			) {
				await this.cancelNotification(notif.identifier);
			}
		}
		console.log("🗑️ Cancelled all pomodoro notifications");
	}

	// Schedule a countdown notification (for timer display)
	static async scheduleTimerProgressNotification(
		title: string,
		body: string,
		intervalSeconds: number,
		totalDuration: number
	): Promise<string[]> {
		const notificationIds: string[] = [];
		const intervals = Math.floor(totalDuration / intervalSeconds);

		for (let i = 1; i <= intervals; i++) {
			const secondsFromNow = i * intervalSeconds;
			const remainingSeconds = totalDuration - secondsFromNow;

			if (remainingSeconds <= 0) continue;

			const trigger: Notifications.TimeIntervalTriggerInput = {
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
				seconds: secondsFromNow,
			};

			const minutes = Math.floor(remainingSeconds / 60);
			const seconds = remainingSeconds % 60;
			const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

			try {
				const notifId = await Notifications.scheduleNotificationAsync({
					content: {
						title,
						body: `${body} - ${timeString} remaining`,
						data: { type: "timer_progress", remaining: remainingSeconds },
						sound: false, // Silent progress updates
					},
					trigger,
				});
				notificationIds.push(notifId);
			} catch (error) {
				console.error(`Error scheduling timer progress notification:`, error);
			}
		}

		return notificationIds;
	}

	static setNotificationHandler(): void {
		Notifications.setNotificationHandler({
			handleNotification: async (notification) => {
				// Workout timers beep and vibrate in-app while the screen is
				// open; the notification is only the backup for a locked phone
				// or another app, so don't double up in the foreground.
				const quiet =
					notification.request.content.data?.type === "workout_timer" &&
					AppState.currentState === "active";
				return {
					shouldShowAlert: !quiet,
					shouldPlaySound: !quiet,
					shouldSetBadge: !quiet,
					shouldShowBanner: !quiet,
					shouldShowList: !quiet,
				};
			},
		});
	}

	static addNotificationReceivedListener(
		callback: (notification: Notifications.Notification) => void
	): Notifications.EventSubscription {
		return Notifications.addNotificationReceivedListener(callback);
	}

	static addNotificationResponseReceivedListener(
		callback: (response: Notifications.NotificationResponse) => void
	): Notifications.EventSubscription {
		return Notifications.addNotificationResponseReceivedListener(callback);
	}
}
