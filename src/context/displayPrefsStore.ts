// Appearance preferences beyond the theme itself (Settings > Appearance):
// a custom accent colour on top of any theme, and an app-wide text size.
// Stored per device, like the theme.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const TEXT_SIZES = [
	{ id: "small", label: "Small", scale: 0.9 },
	{ id: "default", label: "Default", scale: 1 },
	{ id: "large", label: "Large", scale: 1.12 },
	{ id: "xlarge", label: "Extra large", scale: 1.25 },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

/** Accent presets; null = the theme's own colour. */
export const ACCENT_COLORS = [
	"#22C38E", // lotus green
	"#1FB6FF", // cyan
	"#3B82F6", // blue
	"#8B5CF6", // purple
	"#EC4899", // pink
	"#EF4444", // red
	"#F97316", // orange
	"#EAB308", // gold
	"#14B8A6", // teal
] as const;

interface DisplayPrefsState {
	accentColor: string | null;
	textSize: TextSizeId;
	setAccentColor: (color: string | null) => void;
	setTextSize: (size: TextSizeId) => void;
}

export const useDisplayPrefsStore = create<DisplayPrefsState>()(
	persist(
		(set) => ({
			accentColor: null,
			textSize: "default",
			setAccentColor: (accentColor) => set({ accentColor }),
			setTextSize: (textSize) => set({ textSize }),
		}),
		{
			name: "display-prefs",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);

export const textScaleFor = (id: TextSizeId) => TEXT_SIZES.find((t) => t.id === id)?.scale ?? 1;
