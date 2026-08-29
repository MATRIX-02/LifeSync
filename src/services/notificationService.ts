import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";
import { FrequencyConfig } from "../types";

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
	static async requestPermissions(): Promise<boolean> {
		if (!Device.isDevice) {
			console.warn("Notifications only work on physical devices");
			return false;
		}

		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		// Set up notification channel for Android
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("habit-reminders", {
				name: "Habit Reminders",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#A78BFA",
				sound: "default",
				enableVibrate: true,
				showBadge: true,
			});

			// Study Hub channel
			await Notifications.setNotificationChannelAsync("study-reminders", {
				name: "Study Reminders",
				importance: Notifications.AndroidImportance.HIGH,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#3B82F6",
				sound: "default",
				enableVibrate: true,
				showBadge: true,
			});

			// Alarm channel. Android decides sound/vibration/DND behaviour from the
			// channel, and channel settings are FROZEN after first creation - to
			// change them you must use a new channel id, not edit this one.
			await Notifications.setNotificationChannelAsync("alarms", {
				name: "Alarms",
				importance: Notifications.AndroidImportance.MAX,
				sound: "default",
				enableVibrate: true,
				vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
				lightColor: "#F87171",
				bypassDnd: true,
				lockscreenVisibility:
					Notifications.AndroidNotificationVisibility.PUBLIC,
				showBadge: true,
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
		sound: string | boolean = "default"
	): Promise<string> {
		try {
			const notificationId = await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data: data || {},
					sound,
					badge: 1,
					// Android routes sound/vibration/DND through the channel
					...(Platform.OS === "android" && {
						channelId,
					}),
				},
				trigger,
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

	// Schedule every reminder a habit needs, honouring its frequency config.
	// Returns the ids of all notifications created.
	static async scheduleHabitReminders(habit: {
		id: string;
		name: string;
		notificationTime?: string;
		frequency?: FrequencyConfig;
		/** Route through the louder "alarms" channel (MAX importance, bypasses DND). */
		alarmEnabled?: boolean;
		/** false = deliver silently (vibration only). */
		ringtoneEnabled?: boolean;
	}): Promise<string[]> {
		// Always start from a clean slate so edits never leave orphans behind.
		await this.cancelHabitNotifications(habit.id);

		const frequency = habit.frequency;
		const baseTime = habit.notificationTime || "09:00";
		const ids: string[] = [];

		// Android takes importance, vibration and do-not-disturb behaviour from
		// the CHANNEL, so an alarm habit has to be delivered on a different one.
		const channelId = habit.alarmEnabled ? "alarms" : "habit-reminders";
		// `false` is how expo-notifications expresses "silent"; null is not a
		// valid value for this field.
		const sound: string | boolean =
			habit.ringtoneEnabled === false ? false : "default";
		const title = habit.alarmEnabled ? "⏰ Habit Alarm" : "🎯 Habit Reminder";

		const scheduleDaily = async (timeString: string, label?: string) => {
			const [hour, minute] = timeString.split(":").map(Number);
			const id = await this.scheduleNotification(
				title,
				label
					? `Time to complete: ${habit.name} ${label}`
					: `Time to complete: ${habit.name}`,
				{
					type: Notifications.SchedulableTriggerInputTypes.DAILY,
					hour,
					minute,
				},
				{ habitId: habit.id, type: "habit_reminder" },
				channelId,
				sound
			);
			ids.push(id);
		};

		if (frequency?.type === "times_per_day") {
			const slots = this.expandDailyWindow(
				frequency.startTime || baseTime,
				frequency.endTime || "21:00",
				frequency.intervalMinutes,
				frequency.value || 1
			);
			for (let i = 0; i < slots.length; i++) {
				await scheduleDaily(slots[i], `(${i + 1}/${slots.length})`);
			}
		} else if (frequency?.type === "specific_days" && frequency.days?.length) {
			const [hour, minute] = baseTime.split(":").map(Number);
			for (const day of frequency.days) {
				const id = await this.scheduleNotification(
					title,
					`Time to complete: ${habit.name}`,
					{
						type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
						// expo-notifications weekday is 1-7 with 1 = Sunday
						weekday: day + 1,
						hour,
						minute,
					},
					{ habitId: habit.id, type: "habit_reminder" },
					channelId,
					sound
				);
				ids.push(id);
			}
		} else {
			await scheduleDaily(baseTime);
		}

		return ids;
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

	// Cancel every habit reminder, leaving bills/water/study/timers untouched.
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
			"alarms"
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
			channel = await Notifications.getNotificationChannelAsync("alarms");
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

	// ============ STUDY HUB NOTIFICATIONS ============

	// Schedule daily study reminder at a specific time
	static async scheduleStudyReminder(
		timeString: string, // HH:mm format
		message?: string
	): Promise<string> {
		const [hours, minutes] = timeString.split(":").map(Number);

		const trigger: Notifications.DailyTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DAILY,
			hour: hours,
			minute: minutes,
		};

		return this.scheduleNotification(
			"📚 Time to Study!",
			message || "Start your study session and stay on track with your goals.",
			trigger,
			{ type: "study_reminder" }
		);
	}

	// Schedule flashcard review reminder
	static async scheduleFlashcardReviewReminder(
		deckId: string,
		deckName: string,
		dueCount: number,
		scheduledTime?: Date
	): Promise<string> {
		const trigger = scheduledTime
			? {
					type: Notifications.SchedulableTriggerInputTypes.DATE as const,
					date: scheduledTime,
			  }
			: null;

		return this.scheduleNotification(
			"🃏 Flashcards Due",
			`You have ${dueCount} cards due for review in "${deckName}"`,
			trigger,
			{ type: "flashcard_review", deckId, dueCount }
		);
	}

	// Schedule revision reminder
	static async scheduleRevisionReminder(
		scheduleId: string,
		title: string,
		scheduledDate: Date
	): Promise<string> {
		const trigger: Notifications.DateTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: scheduledDate,
		};

		return this.scheduleNotification(
			"📖 Revision Reminder",
			`Time to revise: ${title}`,
			trigger,
			{ type: "revision_reminder", scheduleId }
		);
	}

	// Schedule goal deadline reminder
	static async scheduleGoalDeadlineReminder(
		goalId: string,
		goalName: string,
		deadline: Date,
		daysLeft: number
	): Promise<string> {
		const reminderDate = new Date(deadline);
		reminderDate.setDate(reminderDate.getDate() - daysLeft);
		reminderDate.setHours(9, 0, 0, 0);

		if (reminderDate <= new Date()) {
			console.log(`⏭️ Goal deadline reminder already passed, skipping`);
			return "";
		}

		const trigger: Notifications.DateTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: reminderDate,
		};

		const urgency = daysLeft <= 1 ? "⚠️" : daysLeft <= 3 ? "🎯" : "📅";
		const message =
			daysLeft === 1
				? `Your goal "${goalName}" is due tomorrow!`
				: `Your goal "${goalName}" is due in ${daysLeft} days!`;

		return this.scheduleNotification(
			`${urgency} Goal Deadline`,
			message,
			trigger,
			{ type: "goal_deadline", goalId, daysLeft }
		);
	}

	// Cancel study-related notification by ID
	static async cancelStudyNotification(
		type: "revision_reminder" | "goal_deadline" | "flashcard_review",
		entityId: string
	): Promise<void> {
		const scheduled = await this.getAllScheduledNotifications();
		for (const notif of scheduled) {
			const data = notif.content.data;
			if (
				(type === "revision_reminder" && data?.scheduleId === entityId) ||
				(type === "goal_deadline" && data?.goalId === entityId) ||
				(type === "flashcard_review" && data?.deckId === entityId)
			) {
				await this.cancelNotification(notif.identifier);
				console.log(`🗑️ Cancelled ${type} notification for: ${entityId}`);
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

	// Schedule water reminder notifications throughout the day
	static async scheduleWaterReminders(
		waterGoalMl: number,
		wakeUpHour: number = 7,
		sleepHour: number = 22
	): Promise<string[]> {
		// Cancel existing water reminders first
		await this.cancelWaterReminders();

		const notificationIds: string[] = [];
		const activeHours = sleepHour - wakeUpHour;

		// Calculate reminder intervals based on goal
		// More water = more frequent reminders
		const glassesPerDay = Math.ceil(waterGoalMl / 250); // 250ml per glass
		const intervalsNeeded = Math.min(glassesPerDay, activeHours); // Max one per hour
		const intervalHours = activeHours / intervalsNeeded;

		// Create Android notification channel for hydration
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("hydration-reminders", {
				name: "Hydration Reminders",
				importance: Notifications.AndroidImportance.HIGH,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#4FC3F7",
				sound: "default",
				enableVibrate: true,
				showBadge: true,
			});
		}

		const waterMessages = [
			"💧 Time to hydrate! Drink a glass of water",
			"🥤 Stay refreshed! Have some water now",
			"💦 Water break time! Your body needs hydration",
			"🌊 Drink up! Keep your hydration on track",
			"💧 Reminder: A glass of water keeps you healthy",
			"🚰 Hydration alert! Time for your water break",
			"💧 Don't forget to drink water for better focus",
			"🥛 Water time! Stay energized throughout the day",
		];

		for (let i = 0; i < intervalsNeeded; i++) {
			const reminderHour = Math.round(wakeUpHour + i * intervalHours);
			const reminderMinute = Math.round((intervalHours % 1) * 60 * i) % 60;

			if (reminderHour >= sleepHour) continue;

			const trigger: Notifications.DailyTriggerInput = {
				type: Notifications.SchedulableTriggerInputTypes.DAILY,
				hour: reminderHour,
				minute: reminderMinute,
			};

			const message = waterMessages[i % waterMessages.length];
			const remainingGlasses = glassesPerDay - i;

			try {
				const notificationId = await Notifications.scheduleNotificationAsync({
					content: {
						title: "💧 Hydration Reminder",
						body: `${message}. ${remainingGlasses} glasses left for today!`,
						data: { type: "water_reminder", reminderNumber: i + 1 },
						sound: "default",
						badge: 1,
						...(Platform.OS === "android" && {
							channelId: "hydration-reminders",
						}),
					},
					trigger,
				});
				notificationIds.push(notificationId);
				console.log(
					`📅 Scheduled water reminder ${
						i + 1
					} at ${reminderHour}:${reminderMinute.toString().padStart(2, "0")}`
				);
			} catch (error) {
				console.error(`Error scheduling water reminder ${i + 1}:`, error);
			}
		}

		console.log(`✅ Scheduled ${notificationIds.length} water reminders`);
		return notificationIds;
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

	// Schedule a single water reminder after X minutes
	static async scheduleNextWaterReminder(
		minutesFromNow: number,
		customMessage?: string
	): Promise<string> {
		const trigger: Notifications.TimeIntervalTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			seconds: minutesFromNow * 60,
		};

		return this.scheduleNotification(
			"💧 Water Reminder",
			customMessage || "Time to drink some water! Stay hydrated!",
			trigger,
			{ type: "water_reminder_single" }
		);
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
								...(Platform.OS === "android" && {
									channelId: "fasting-timer",
								}),
							},
							trigger,
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
						...(Platform.OS === "android" && {
							channelId: "fasting-timer",
						}),
					},
					trigger: completionTrigger,
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
				...(Platform.OS === "android" && {
					channelId: "pomodoro-timer",
				}),
			},
			trigger,
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
				...(Platform.OS === "android" && {
					channelId: "pomodoro-timer",
				}),
			},
			trigger,
		});

		console.log(
			`☕ Scheduled break end notification for ${breakMinutes} minutes`
		);
		return notifId;
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
			handleNotification: async () => ({
				shouldShowAlert: true,
				shouldPlaySound: true,
				shouldSetBadge: true,
				shouldShowBanner: true,
				shouldShowList: true,
			}),
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
