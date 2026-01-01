import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NotificationService } from "./src/services/notificationService";
import { AudioService } from "./src/services/audioService";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
	useEffect(() => {
		// Initialize notification service
		NotificationService.setNotificationHandler();

		// Request notification permissions
		(async () => {
			const permitted = await NotificationService.requestPermissions();
			if (permitted) {
				console.log("Notification permissions granted");
			}
		})();

		// Initialize audio service
		AudioService.setAudioMode();
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<RootNavigator />
		</GestureHandlerRootView>
	);
}
