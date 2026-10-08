// Default tones for habit reminders and alarms (Settings > Notifications).
//
// A habit with no tone of its own uses these. Stored per device: a tone is a
// property of this phone's notification setup, not of the user's data.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SYSTEM_SOUND_ID } from "../constants/notificationSounds";

interface SoundPrefsState {
	defaultReminderSound: string;
	defaultAlarmSound: string;
	setDefaultReminderSound: (id: string) => void;
	setDefaultAlarmSound: (id: string) => void;
}

export const useSoundPrefsStore = create<SoundPrefsState>()(
	persist(
		(set) => ({
			// "system" keeps the behaviour from before tones existed, including
			// any tone the user already picked in Android's channel settings.
			defaultReminderSound: SYSTEM_SOUND_ID,
			defaultAlarmSound: SYSTEM_SOUND_ID,
			setDefaultReminderSound: (id) => set({ defaultReminderSound: id }),
			setDefaultAlarmSound: (id) => set({ defaultAlarmSound: id }),
		}),
		{
			name: "sound-prefs",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
