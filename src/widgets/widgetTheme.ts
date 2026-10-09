// Colours for the home screen widgets, taken from the app's current theme
// (including the accent colour). The app saves them whenever the theme
// changes; widget tasks may run with the app closed, so they read them back
// from AsyncStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ColorProp } from "react-native-android-widget";
import type { Theme } from "../context/themeContext";

export interface WidgetColors {
	bg: string;
	row: string;
	text: string;
	muted: string;
	primary: string;
	track: string;
	success: string;
	error: string;
}

// Lotus, until the app has saved the theme.
const DEFAULT_COLORS: WidgetColors = {
	bg: "#060F2B",
	row: "#0D1A3A",
	text: "#FFFFFF",
	muted: "#A3B1CC",
	primary: "#22C38E",
	track: "#1E2E55",
	success: "#34D399",
	error: "#F87171",
};

const COLORS_KEY = "widget:colors";

export const widgetColorsFromTheme = (t: Theme): WidgetColors => ({
	bg: t.background,
	row: t.surface,
	text: t.text,
	muted: t.textSecondary,
	primary: t.primary,
	track: t.border,
	success: t.success,
	error: t.error,
});

export const isHex = (c: unknown): c is ColorProp => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

/** Every colour validated as #RRGGBB (the widget renderer accepts no other form). */
export function resolveColors(colors?: Partial<WidgetColors> | null): Record<keyof WidgetColors, ColorProp> {
	const out = {} as Record<keyof WidgetColors, ColorProp>;
	for (const key of Object.keys(DEFAULT_COLORS) as (keyof WidgetColors)[]) {
		const c = colors?.[key];
		out[key] = isHex(c) ? c : (DEFAULT_COLORS[key] as ColorProp);
	}
	return out;
}

export async function readWidgetColors(): Promise<WidgetColors> {
	try {
		const raw = await AsyncStorage.getItem(COLORS_KEY);
		if (raw) return { ...DEFAULT_COLORS, ...JSON.parse(raw) };
	} catch {
		// Use the defaults.
	}
	return DEFAULT_COLORS;
}

export async function writeWidgetColors(colors: WidgetColors): Promise<void> {
	await AsyncStorage.setItem(COLORS_KEY, JSON.stringify(colors));
}
