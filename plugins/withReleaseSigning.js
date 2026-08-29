/**
 * Expo Config Plugin for release signing.
 *
 * Expo's prebuild template points the `release` build type at the DEBUG
 * keystore - a key that ships with the Android SDK, is identical on every
 * machine, and has the public password "android". Play rejects it, and an APK
 * signed with it can never be upgraded by a properly signed one.
 *
 * `android/` is generated output, so editing app/build.gradle by hand would be
 * wiped by the next `expo prebuild --clean`. This plugin re-applies the signing
 * config on every prebuild instead.
 *
 * The keystore and its passwords live OUTSIDE the repo, in:
 *   ~/.android-keystores/lifesync-release.jks
 *   ~/.gradle/gradle.properties   (LIFESYNC_UPLOAD_* properties)
 *
 * If those properties are absent - a fresh clone, CI, another machine - the
 * build falls back to debug signing rather than failing, so `assembleDebug`
 * and development builds keep working untouched.
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

const SIGNING_CONFIG = `
        release {
            if (project.hasProperty('LIFESYNC_UPLOAD_STORE_FILE')) {
                storeFile file(LIFESYNC_UPLOAD_STORE_FILE)
                storePassword LIFESYNC_UPLOAD_STORE_PASSWORD
                keyAlias LIFESYNC_UPLOAD_KEY_ALIAS
                keyPassword LIFESYNC_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
	return withAppBuildGradle(config, (config) => {
		let gradle = config.modResults.contents;

		if (gradle.includes("LIFESYNC_UPLOAD_STORE_FILE")) {
			return config; // already applied
		}

		// 1. Add a `release` signing config next to the existing `debug` one.
		const debugSigningBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

		if (!gradle.includes(debugSigningBlock)) {
			throw new Error(
				"withReleaseSigning: could not find the debug signingConfig block. " +
					"The prebuild template changed - update this plugin."
			);
		}
		gradle = gradle.replace(
			debugSigningBlock,
			debugSigningBlock + "\n" + SIGNING_CONFIG
		);

		// 2. Point the release build type at it, falling back to debug when the
		//    keystore properties are not present on this machine.
		const releaseUsesDebug = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

		if (!gradle.includes(releaseUsesDebug)) {
			throw new Error(
				"withReleaseSigning: could not find the release buildType's debug " +
					"signingConfig line. The prebuild template changed - update this plugin."
			);
		}
		gradle = gradle.replace(
			releaseUsesDebug,
			`        release {
            signingConfig project.hasProperty('LIFESYNC_UPLOAD_STORE_FILE')
                ? signingConfigs.release
                : signingConfigs.debug`
		);

		config.modResults.contents = gradle;
		return config;
	});
};
