import { Audio } from "expo-av";

export class AudioService {
	private static soundObject: Audio.Sound | null = null;

	static async playRingtone(soundFile?: string) {
		try {
			if (this.soundObject) {
				await this.soundObject.unloadAsync();
			}

			this.soundObject = new Audio.Sound();

			// Load default system sound or custom sound
			const source =
				soundFile || require("../../assets/sounds/default-ringtone.mp3");

			await this.soundObject.loadAsync(source);
			await this.soundObject.playAsync();
		} catch (error) {
			console.error("Error playing ringtone:", error);
		}
	}

	static async stopRingtone() {
		try {
			if (this.soundObject) {
				await this.soundObject.stopAsync();
				await this.soundObject.unloadAsync();
				this.soundObject = null;
			}
		} catch (error) {
			console.error("Error stopping ringtone:", error);
		}
	}

	static async setAudioMode() {
		try {
			await Audio.setAudioModeAsync({
				playsInSilentModeIOS: true,
				staysActiveInBackground: true,
				shouldDuckAndroid: true,
			});
		} catch (error) {
			console.error("Error setting audio mode:", error);
		}
	}
}
