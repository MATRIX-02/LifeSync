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
 *
 * DEBUG BUILDS USE THE SAME KEY. Android refuses to replace an installed app
 * with one signed by a different certificate, so with the default setup
 * `npm run android` (debug key) cannot install over a release APK (release key)
 * and fails with INSTALL_FAILED_UPDATE_INCOMPATIBLE - forcing an uninstall,
 * which wipes local data, every time you switch between the two. Sharing the
 * key makes them interchangeable. That is safe here because nothing in this
 * project is keyed to a certificate fingerprint: there is no native Google
 * Sign-In, Maps or Firebase, and OAuth uses the `lifesync://` scheme.
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

		// Each step is applied only if its anchor is still present. withAppBuildGradle
		// hands us the EXISTING android/app/build.gradle, not a fresh template, so on
		// a repeat prebuild most anchors are already rewritten - a single up-front
		// "already applied" guard would skip steps added later.
		const CONDITIONAL = `signingConfig project.hasProperty('LIFESYNC_UPLOAD_STORE_FILE')
                ? signingConfigs.release
                : signingConfigs.debug`;

		// 1. Add a `release` signing config next to the existing `debug` one.
		const debugSigningBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

		if (!gradle.includes("LIFESYNC_UPLOAD_STORE_FILE")) {
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
		}

		// 2. Release builds use it.
		const releaseUsesDebug = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

		if (gradle.includes(releaseUsesDebug)) {
			gradle = gradle.replace(
				releaseUsesDebug,
				`        release {
            ${CONDITIONAL}`
			);
		} else if (!gradle.includes(`release {
            ${CONDITIONAL}`)) {
			throw new Error(
				"withReleaseSigning: the release buildType no longer points at the " +
					"debug signingConfig and has not been patched. Update this plugin."
			);
		}

		// 3. Debug builds share the key, so a debug install can replace a release
		//    install and vice versa - see the note at the top of this file.
		const debugUsesDebug = `        debug {
            signingConfig signingConfigs.debug
        }`;

		if (gradle.includes(debugUsesDebug)) {
			gradle = gradle.replace(
				debugUsesDebug,
				`        debug {
            ${CONDITIONAL}
        }`
			);
		}

		config.modResults.contents = gradle;
		return config;
	});
};
