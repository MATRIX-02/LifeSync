/**
 * Expo Config Plugin for SMS Permissions
 * Adds required Android permissions for reading SMS
 */

const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withSmsPermission(config) {
	return withAndroidManifest(config, async (config) => {
		const manifest = config.modResults.manifest;

		// Ensure uses-permission array exists
		if (!manifest["uses-permission"]) {
			manifest["uses-permission"] = [];
		}

		// Permissions needed for SMS reading
		const permissions = [
			"android.permission.READ_SMS",
			"android.permission.RECEIVE_SMS",
		];

		// Add each permission if not already present
		permissions.forEach((permission) => {
			const hasPermission = manifest["uses-permission"].some(
				(p) => p.$?.["android:name"] === permission
			);

			if (!hasPermission) {
				manifest["uses-permission"].push({
					$: { "android:name": permission },
				});
			}
		});

		return config;
	});
};
