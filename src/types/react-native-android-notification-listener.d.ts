/**
 * Type declarations for react-native-android-notification-listener
 */

declare module "react-native-android-notification-listener" {
	export interface NotificationEvent {
		app: string;
		title: string;
		text: string;
		subText?: string;
		bigText?: string;
		time: number;
		package: string;
	}

	export type PermissionStatus = "authorized" | "denied" | "unknown";

	export interface NotificationListener {
		getPermissionStatus(): Promise<PermissionStatus>;
		requestPermission(): Promise<void>;
		onNotificationReceived(
			callback: (notification: NotificationEvent) => void
		): void;
	}

	const RNAndroidNotificationListener: NotificationListener;
	export default RNAndroidNotificationListener;
}
