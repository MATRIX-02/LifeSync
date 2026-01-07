import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";

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
		data?: Record<string, any>
	): Promise<string> {
		try {
			const notificationId = await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data: data || {},
					sound: "default",
					badge: 1,
					// Android specific - use the habit-reminders channel
					...(Platform.OS === "android" && {
						channelId: "habit-reminders",
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
