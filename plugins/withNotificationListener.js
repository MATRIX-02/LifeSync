/**
 * Expo Config Plugin for Notification Listener Service
 * Adds required Android service and permissions for notification listening
 */

const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNotificationListener(config, options = {}) {
	const {
		notificationListenerName = "Transaction Listener",
		notificationListenerDescription = "Listens for payment notifications to help track expenses",
	} = options;

	return withAndroidManifest(config, async (config) => {
		const manifest = config.modResults.manifest;
		const application = manifest.application?.[0];

		if (!application) {
			console.warn(
				"withNotificationListener: No application found in AndroidManifest.xml"
			);
			return config;
		}

		// Ensure uses-permission array exists
		if (!manifest["uses-permission"]) {
			manifest["uses-permission"] = [];
		}

		// Add notification listener permission
		const notificationPermission =
			"android.permission.BIND_NOTIFICATION_LISTENER_SERVICE";
		const hasPermission = manifest["uses-permission"].some(
			(p) => p.$?.["android:name"] === notificationPermission
		);

		if (!hasPermission) {
			manifest["uses-permission"].push({
				$: { "android:name": notificationPermission },
			});
		}

		// Ensure service array exists in application
		if (!application.service) {
			application.service = [];
		}

		// Check if notification listener service already exists
		const serviceName = ".NotificationListenerService";
		const hasService = application.service.some(
			(s) => s.$?.["android:name"] === serviceName
		);

		if (!hasService) {
			// Add the notification listener service
			application.service.push({
				$: {
					"android:name": serviceName,
					"android:label": notificationListenerName,
					"android:permission":
						"android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
					"android:exported": "true",
				},
				"intent-filter": [
					{
						action: [
							{
								$: {
									"android:name":
										"android.service.notification.NotificationListenerService",
								},
							},
						],
					},
				],
				"meta-data": [
					{
						$: {
							"android:name":
								"android.service.notification.default_filter_types",
							"android:value": "alerting|ongoing|silent",
						},
					},
				],
			});
		}

		return config;
	});
};
