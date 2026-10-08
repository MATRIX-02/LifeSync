/**
 * Self-update for APKs distributed outside the Play Store.
 *
 * `scripts/notify-update.mjs` sends every user an Expo push after a release:
 *
 *   data: { type: "app_update", version: "1.4.3", apkUrl: "https://github.com/..." }
 *
 * Tapping it (routed in app/_layout.tsx) downloads the APK into the cache and
 * hands it to Android's package installer. Android always asks the user to
 * confirm the install - a sideloaded app can't update itself silently - and
 * the first time it also asks to allow "Install unknown apps" for LifeSync.
 * The APK must be signed with the release key or Android refuses to install
 * it over the existing app.
 */

import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Alert } from "@/src/components/CustomAlert";

export const APP_UPDATE_CHANNEL = "app-updates";

/** Must exist before a push naming it arrives, or Android uses the default channel. */
export async function ensureUpdateChannel(): Promise<void> {
	if (Platform.OS !== "android") return;
	try {
		await Notifications.setNotificationChannelAsync(APP_UPDATE_CHANNEL, {
			name: "App updates",
			description: "When a new version of LifeSync is available",
			importance: Notifications.AndroidImportance.HIGH,
		});
	} catch {
		// Not fatal - the push still shows on the default channel.
	}
}

/** "1.10.0" > "1.9.2". Missing parts count as 0. */
export function isNewerVersion(candidate: string, current: string): boolean {
	const a = candidate.split(".").map((n) => parseInt(n, 10) || 0);
	const b = current.split(".").map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
	}
	return false;
}

export const currentVersion = () => Constants.expoConfig?.version ?? "0.0.0";

// Only GitHub release assets of this repo - a push payload must never be able
// to make the app download and offer to install an arbitrary APK.
const ALLOWED_APK_URL =
	/^https:\/\/github\.com\/MATRIX-02\/LifeSync\/releases\/download\/v[\d.]+\/[\w.-]+\.apk$/;

let installing = false;

export async function installUpdate(version: string, apkUrl: string): Promise<void> {
	if (Platform.OS !== "android" || installing) return;
	if (!isNewerVersion(version, currentVersion())) {
		Alert.success("Up to date", `You already have LifeSync ${currentVersion()}.`);
		return;
	}
	if (!ALLOWED_APK_URL.test(apkUrl)) {
		console.warn("Ignoring update with an unexpected APK URL:", apkUrl);
		return;
	}

	installing = true;
	try {
		Alert.alert(
			`Downloading LifeSync ${version}`,
			"The installer opens when the download finishes. Keep LifeSync open.",
		);
		const target = `${FileSystem.cacheDirectory}LifeSync-v${version}.apk`;
		await FileSystem.deleteAsync(target, { idempotent: true });
		const { status, uri } = await FileSystem.downloadAsync(apkUrl, target);
		if (status !== 200) throw new Error(`Download failed (HTTP ${status})`);

		const contentUri = await FileSystem.getContentUriAsync(uri);
		await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
			data: contentUri,
			type: "application/vnd.android.package-archive",
			flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
		});
	} catch (error) {
		console.warn("Update failed:", error);
		Alert.error(
			"Update failed",
			"Couldn't download the update. Check your connection and try again from the notification.",
		);
	} finally {
		installing = false;
	}
}
