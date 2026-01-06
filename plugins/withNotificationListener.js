/**
 * Expo Config Plugin for react-native-android-notification-listener
 *
 * This plugin resolves the AndroidManifest allowBackup conflict between
 * the library (which sets allowBackup=false) and Expo (which sets allowBackup=true).
 */

const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNotificationListener(config) {
	return withAndroidManifest(config, async (config) => {
		const manifest = config.modResults.manifest;
		const application = manifest.application?.[0];

		if (!application) {
			console.warn(
				"withNotificationListener: No application found in AndroidManifest.xml"
			);
			return config;
		}

		// Add tools namespace to manifest if not present
		if (!manifest.$["xmlns:tools"]) {
			manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
		}

		// Add tools:replace to application to resolve allowBackup conflict
		if (!application.$["tools:replace"]) {
			application.$["tools:replace"] = "android:allowBackup";
		} else if (
			!application.$["tools:replace"].includes("android:allowBackup")
		) {
			application.$["tools:replace"] += ",android:allowBackup";
		}

		return config;
	});
};
