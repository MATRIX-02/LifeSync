// Tones bundled with the app for habit reminders and alarms.
//
// The files live in assets/sounds/notifications and are registered with the
// expo-notifications plugin in app.json, which copies them into the native
// bundle (res/raw on Android) at build time. Adding a tone therefore needs:
// the file, an entry in app.json, an entry here - and a new native build.
//
// `id` is what a habit stores. It must stay stable: it is persisted in the
// database and baked into Android channel ids.

export type SoundKind = "reminder" | "alarm";

export interface NotificationSound {
	id: string;
	label: string;
	kind: SoundKind;
	/** File name as bundled - the name a notification references. */
	file: string;
	/** For in-app preview. */
	asset: number;
	/** Length of the file, so a preview isn't cut short. */
	durationMs: number;
}

/** Use the phone's own tone. Changed from Android's channel settings. */
export const SYSTEM_SOUND_ID = "system";

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
	{
		id: "chime",
		label: "Chime",
		kind: "reminder",
		file: "ls_chime.wav",
		asset: require("@/assets/sounds/notifications/ls_chime.wav"),
		durationMs: 1780,
	},
	{
		id: "bell",
		label: "Bell",
		kind: "reminder",
		file: "ls_bell.wav",
		asset: require("@/assets/sounds/notifications/ls_bell.wav"),
		durationMs: 2400,
	},
	{
		id: "marimba",
		label: "Marimba",
		kind: "reminder",
		file: "ls_marimba.wav",
		asset: require("@/assets/sounds/notifications/ls_marimba.wav"),
		durationMs: 1240,
	},
	{
		id: "harp",
		label: "Harp",
		kind: "reminder",
		file: "ls_harp.wav",
		asset: require("@/assets/sounds/notifications/ls_harp.wav"),
		durationMs: 1960,
	},
	{
		id: "pop",
		label: "Pop",
		kind: "reminder",
		file: "ls_pop.wav",
		asset: require("@/assets/sounds/notifications/ls_pop.wav"),
		durationMs: 460,
	},
	{
		id: "ding",
		label: "Ding",
		kind: "reminder",
		file: "ls_ding.wav",
		asset: require("@/assets/sounds/notifications/ls_ding.wav"),
		durationMs: 1400,
	},
	{
		id: "water_pour",
		label: "Water Pour",
		kind: "reminder",
		file: "ls_water_pour.wav",
		asset: require("@/assets/sounds/notifications/ls_water_pour.wav"),
		durationMs: 2520,
	},
	{
		id: "alarm_classic",
		label: "Classic Beep",
		kind: "alarm",
		file: "ls_alarm_classic.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_classic.wav"),
		durationMs: 13320,
	},
	{
		id: "alarm_digital",
		label: "Digital",
		kind: "alarm",
		file: "ls_alarm_digital.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_digital.wav"),
		durationMs: 13960,
	},
	{
		id: "alarm_rising",
		label: "Rising Bells",
		kind: "alarm",
		file: "ls_alarm_rising.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_rising.wav"),
		durationMs: 15150,
	},
	{
		id: "alarm_morning",
		label: "Morning Tune",
		kind: "alarm",
		file: "ls_alarm_morning.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_morning.wav"),
		durationMs: 14020,
	},
	{
		id: "alarm_siren",
		label: "Siren",
		kind: "alarm",
		file: "ls_alarm_siren.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_siren.wav"),
		durationMs: 14000,
	},
	{
		id: "alarm_pulse",
		label: "Pulse",
		kind: "alarm",
		file: "ls_alarm_pulse.wav",
		asset: require("@/assets/sounds/notifications/ls_alarm_pulse.wav"),
		durationMs: 14100,
	},
];

export const getSound = (id?: string | null): NotificationSound | undefined =>
	id ? NOTIFICATION_SOUNDS.find((s) => s.id === id) : undefined;

/**
 * Tones offered for a kind. Every tone works for either kind - an alarm can
 * use a short chime - so the kind only decides which are listed first.
 */
export const soundsFor = (kind: SoundKind): NotificationSound[] => [
	...NOTIFICATION_SOUNDS.filter((s) => s.kind === kind),
	...NOTIFICATION_SOUNDS.filter((s) => s.kind !== kind),
];

/** How long a preview should keep playing; the system tone's length is unknown. */
export const previewDurationMs = (id: string): number =>
	(getSound(id)?.durationMs ?? 4000) + 750;

export const soundLabel = (id?: string | null): string =>
	!id || id === SYSTEM_SOUND_ID ? "System default" : getSound(id)?.label ?? "System default";
