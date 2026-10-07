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
		handleIncomingNotification,
	} = require("./src/services/transactionDetection/headlessTask");
	AppRegistry.registerHeadlessTask(
		RNAndroidNotificationListenerHeadlessJsName,
		() => handleIncomingNotification,
	);
}
