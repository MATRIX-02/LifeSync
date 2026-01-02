import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export class NotificationService {
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
