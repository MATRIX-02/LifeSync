import { Audio } from "expo-av";

export class AudioService {
	private static soundObject: Audio.Sound | null = null;

	static async playRingtone(soundFile?: string) {
		try {
			if (this.soundObject) {
				await this.soundObject.unloadAsync();
			}

			this.soundObject = new Audio.Sound();

			// There is no bundled ringtone asset in this repo, so a caller must
			// supply one. Previously this require()'d assets/sounds/default-ringtone.mp3,
			// which does not exist.
			if (!soundFile) {
				console.warn(
					"AudioService.playRingtone: no sound file supplied and no bundled default exists"
				);
				this.soundObject = null;
				return;
			}

			await this.soundObject.loadAsync(
				typeof soundFile === "string" ? { uri: soundFile } : soundFile
			);
			await this.soundObject.setIsLoopingAsync(true);
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
