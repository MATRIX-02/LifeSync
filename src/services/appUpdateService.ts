/**
 * Self-update for APKs distributed outside the Play Store.
 *
 * `scripts/notify-update.mjs` sends every user an Expo push after a release:
 *
 *   data: { type: "app_update", version: "1.4.3", apkUrl: "https://github.com/..." }
 *
 * Tapping it (routed in app/_layout.tsx), or "Check for updates" in Settings,
 * downloads the APK into the cache - with progress shown by
 * UpdateProgressSheet and a silent notification - and hands it to Android's
 * package installer. Android always asks the user to
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

// ============== DOWNLOAD PROGRESS ==============

export type UpdateDownload =
	| { state: "idle" }
	| { state: "downloading"; version: string; written: number; total: number }
	| { state: "installing"; version: string }
	| { state: "failed"; version: string; message: string };

let download: UpdateDownload = { state: "idle" };
const listeners = new Set<(d: UpdateDownload) => void>();
let resumable: FileSystem.DownloadResumable | null = null;
let cancelled = false;

const PROGRESS_NOTIFICATION_ID = "app-update-progress";
const PROGRESS_CHANNEL = "app-update-progress";

function setDownload(next: UpdateDownload) {
	download = next;
	listeners.forEach((fn) => fn(next));
}

export const getUpdateDownload = () => download;

export function subscribeToUpdateDownload(fn: (d: UpdateDownload) => void): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function dismissUpdateDownload() {
	if (download.state === "failed" || download.state === "installing") setDownload({ state: "idle" });
}

/**
 * A silent, ongoing notification mirroring the progress, so it's visible from
 * the notification shade too. Updated in 10% steps; Android re-posts in place
 * because the identifier stays the same.
 */
async function showProgressNotification(version: string, percent: number | null) {
	if (Platform.OS !== "android") return;
	try {
		await Notifications.setNotificationChannelAsync(PROGRESS_CHANNEL, {
			name: "Update downloads",
			importance: Notifications.AndroidImportance.LOW,
			sound: null,
			vibrationPattern: null,
			enableVibrate: false,
		});
		if (percent === null) {
			await Notifications.dismissNotificationAsync(PROGRESS_NOTIFICATION_ID);
			return;
		}
		await Notifications.scheduleNotificationAsync({
			identifier: PROGRESS_NOTIFICATION_ID,
			content: {
				title: `Downloading LifeSync ${version}`,
				body: `${percent}% · open LifeSync to see progress`,
				sticky: true,
				autoDismiss: false,
				sound: false,
				data: { type: "app_update_progress" },
			} as Notifications.NotificationContentInput,
			// The channel must be on the trigger; content.channelId is ignored.
			trigger: Platform.OS === "android" ? { channelId: PROGRESS_CHANNEL } : null,
		});
	} catch {
		// Progress is still shown in the app.
	}
}

let lastRequest: { version: string; apkUrl: string } | null = null;

/** Retries the last download (after a failure, or to reopen the installer). */
export function retryUpdate(): void {
	if (lastRequest) void installUpdate(lastRequest.version, lastRequest.apkUrl);
}

export async function cancelUpdateDownload(): Promise<void> {
	cancelled = true;
	try {
		await resumable?.cancelAsync();
	} catch {
		// Already finished.
	}
}

// ============== CHECK FOR UPDATES ==============

export interface LatestRelease {
	version: string;
	apkUrl: string | null;
	/** APK size in bytes, 0 if unknown. */
	apkSize: number;
	notes: string;
	publishedAt: string;
	pageUrl: string;
}

/** The newest GitHub release, or an error message. */
export const fetchLatestRelease = () => fetchRelease("latest");

/** The release for one version ("2.0.2"), e.g. to show what's new in the installed app. */
export const fetchReleaseForVersion = (version: string) => fetchRelease(`tags/v${version}`);

async function fetchRelease(path: string): Promise<{ data: LatestRelease | null; error: string | null }> {
	try {
		const response = await fetch(`https://api.github.com/repos/MATRIX-02/LifeSync/releases/${path}`, {
			headers: { Accept: "application/vnd.github+json" },
		});
		if (!response.ok) return { data: null, error: `GitHub returned ${response.status}. Try again later.` };
		const json = await response.json();
		const version = String(json.tag_name ?? "").replace(/^v/, "");
		const apk = (json.assets ?? []).find((a: any) => String(a.name).endsWith(".apk"));
		const apkUrl = apk?.browser_download_url ?? null;
		return {
			data: {
				version,
				apkUrl: apkUrl && ALLOWED_APK_URL.test(apkUrl) ? apkUrl : null,
				apkSize: Number(apk?.size) || 0,
				notes: String(json.body ?? ""),
				publishedAt: json.published_at ?? "",
				pageUrl: json.html_url ?? "https://github.com/MATRIX-02/LifeSync/releases",
			},
			error: null,
		};
	} catch {
		return { data: null, error: "Couldn't reach GitHub. Check your connection." };
	}
}

// ============== INSTALL ==============

export async function installUpdate(version: string, apkUrl: string): Promise<void> {
	if (Platform.OS !== "android" || download.state === "downloading") return;
	if (!isNewerVersion(version, currentVersion())) {
		Alert.success("Up to date", `You already have LifeSync ${currentVersion()}.`);
		return;
	}
	if (!ALLOWED_APK_URL.test(apkUrl)) {
		console.warn("Ignoring update with an unexpected APK URL:", apkUrl);
		return;
	}

	cancelled = false;
	lastRequest = { version, apkUrl };
	setDownload({ state: "downloading", version, written: 0, total: 0 });
	let lastStep = -1;
	try {
		const target = `${FileSystem.cacheDirectory}LifeSync-v${version}.apk`;
		await FileSystem.deleteAsync(target, { idempotent: true });
		resumable = FileSystem.createDownloadResumable(apkUrl, target, {}, (p) => {
			setDownload({
				state: "downloading",
				version,
				written: p.totalBytesWritten,
				total: p.totalBytesExpectedToWrite,
			});
			if (p.totalBytesExpectedToWrite > 0) {
				const step = Math.floor((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 10);
				if (step !== lastStep) {
					lastStep = step;
					void showProgressNotification(version, step * 10);
				}
			}
		});
		void showProgressNotification(version, 0);
		const result = await resumable.downloadAsync();
		resumable = null;
		await showProgressNotification(version, null);
		if (cancelled || !result) {
			setDownload({ state: "idle" });
			return;
		}
		if (result.status !== 200) throw new Error(`Download failed (HTTP ${result.status})`);

		setDownload({ state: "installing", version });
		const contentUri = await FileSystem.getContentUriAsync(result.uri);
		await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
			data: contentUri,
			type: "application/vnd.android.package-archive",
			flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
		});
	} catch (error) {
		resumable = null;
		await showProgressNotification(version, null);
		if (cancelled) {
			setDownload({ state: "idle" });
			return;
		}
		console.warn("Update failed:", error);
		setDownload({
			state: "failed",
			version,
			message: "Couldn't download the update. Check your connection and try again.",
		});
	}
}
