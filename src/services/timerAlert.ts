// Feedback for workout timers: a buzz + beep when a timed set or a rest
// period finishes, and a light tick for the last 3 seconds.
//
// The beep (assets/sounds/timer-done.wav) is generated, not downloaded, so
// there's no licensing to track. Everything here fails silently: a missing
// sound or vibration must never break the workout screen.

import { Audio } from "expo-av";
import { Vibration } from "react-native";

let sound: Audio.Sound | null = null;
let loading: Promise<void> | null = null;

async function ensureLoaded() {
	if (sound) return;
	if (!loading)
		loading = (async () => {
			// Play even with the iPhone ring switch on silent, and duck (not
			// stop) the user's music instead of interrupting it.
			await Audio.setAudioModeAsync({
				playsInSilentModeIOS: true,
				shouldDuckAndroid: true,
				staysActiveInBackground: false,
			});
			const { sound: s } = await Audio.Sound.createAsync(
				require("@/assets/sounds/timer-done.wav"),
			);
			sound = s;
		})().catch((e) => {
			loading = null;
			console.warn("Timer sound unavailable:", e);
		});
	await loading;
}

/** Call when a timer starts so the beep plays without a load delay. */
export function preloadTimerSound() {
	void ensureLoaded();
}

/** Timer reached zero: strong vibration pattern + beep. */
export async function timerFinished() {
	Vibration.vibrate([0, 400, 150, 400, 150, 600]);
	try {
		await ensureLoaded();
		await sound?.replayAsync();
	} catch (e) {
		console.warn("Could not play timer sound:", e);
	}
}

/** Short tick for the 3-2-1 countdown. */
export function timerTick() {
	Vibration.vibrate(60);
}
