// App entry. Same as `expo-router/entry`, plus the headless task for the
// Android notification listener: Android starts it for every notification
// posted on the phone - even when LifeSync is closed - so payment alerts from
// UPI apps, bank apps and SMS can be detected (see
// src/services/transactionDetection/notificationListener.ts).
//
// Headless tasks must be registered at the entry point, before the app UI
// loads, which is why this file exists instead of `main: expo-router/entry`.

import "expo-router/entry";
import { AppRegistry, Platform } from "react-native";

if (Platform.OS === "android") {
	const {
		RNAndroidNotificationListenerHeadlessJsName,
	} = require("react-native-android-notification-listener");
	const {
		handleDetectedNotificationAction,
		handleIncomingNotification,
	} = require("./src/services/transactionDetection/headlessTask");
	AppRegistry.registerHeadlessTask(
		RNAndroidNotificationListenerHeadlessJsName,
		() => handleIncomingNotification,
	);

	// Action buttons that don't open the app ("Ignore" on a detected payment,
	// "+250 ml" / "Snooze" on a water reminder, "Done" / "Snooze" on a habit
	// reminder) are delivered to this task when
	// LifeSync isn't in the foreground.
	const TaskManager = require("expo-task-manager");
	const Notifications = require("expo-notifications");
	const NOTIFICATION_ACTION_TASK = "lifesync-notification-action";
	const {
		handleWaterNotificationAction,
	} = require("./src/services/waterReminders");
	const {
		handleHabitNotificationAction,
	} = require("./src/services/habitReminderActions");
	TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data }) => {
		if (await handleHabitNotificationAction(data)) return;
		if (await handleWaterNotificationAction(data)) return;
		await handleDetectedNotificationAction(data);
	});
	Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK).catch(() => undefined);

	// Home screen widgets ("Today's habits", "Money"): placed, refreshed or tapped,
	// including while LifeSync is closed.
	const { registerWidgetTaskHandler } = require("react-native-android-widget");
	const { widgetTaskHandler } = require("./src/widgets/widgetTaskHandler");
	registerWidgetTaskHandler(widgetTaskHandler);
}
