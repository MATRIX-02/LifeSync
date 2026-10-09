// Every `Text` in the app renders through this: metro.config.js swaps it in
// for react-native's own Text (native platforms only).
//
// - Text size (Settings > Appearance): scales each explicit fontSize and
//   lineHeight. Text without a fontSize of its own is left alone so nested
//   Text keeps inheriting its parent's (already scaled) size.
// - Samsung (One UI) clips the last letter of bold text ("Profile" →
//   "Profil"): Android measures with the regular face of Samsung's system font
//   but draws the wider bold one. Pinning Roboto and the simple break strategy
//   keeps the measured and drawn widths equal. A style's own fontFamily wins.
import React from "react";
import type { Text as TextType } from "react-native";
import { Platform, StyleSheet } from "react-native";
// Full path on purpose: metro.config.js only redirects react-native's
// relative import, so this still resolves to the real Text.
import RNText from "react-native/Libraries/Text/Text";
import { textScaleFor, useDisplayPrefsStore } from "../context/displayPrefsStore";

const NativeText = RNText as unknown as typeof TextType;

const ANDROID_BASE = Platform.OS === "android" ? { fontFamily: "sans-serif" } : null;

const Text = (props: React.ComponentProps<typeof TextType>) => {
	const scale = useDisplayPrefsStore((s) => textScaleFor(s.textSize));
	let style = props.style;
	if (scale !== 1) {
		const flat = StyleSheet.flatten(style);
		if (flat?.fontSize || flat?.lineHeight) {
			style = [
				style,
				{
					...(flat.fontSize ? { fontSize: flat.fontSize * scale } : null),
					...(flat.lineHeight ? { lineHeight: flat.lineHeight * scale } : null),
				},
			];
		}
	}
	return Platform.OS === "android" ? (
		<NativeText textBreakStrategy="simple" {...props} style={[ANDROID_BASE, style]} />
	) : (
		<NativeText {...props} style={style} />
	);
};
Text.displayName = "Text";

export default Text;
