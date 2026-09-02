/**
 * Applies the system-bar insets once, for the whole app.
 *
 * Android 15 ignores `windowOptOutEdgeToEdgeEnforcement` and Android 16
 * (targetSdk 36) removes it entirely, so every app now draws edge to edge
 * whether it asks to or not. This project had `edgeToEdgeEnabled: false`, which
 * meant it never set up inset handling - so content rendered underneath the
 * status bar at the top and the navigation bar at the bottom.
 *
 * Rather than adding a SafeAreaView to each of the twelve screens that lacked
 * one, the padding is applied here, once, and the screens all use plain Views.
 *
 * Do NOT reintroduce `SafeAreaView` inside this frame. It is a NATIVE component
 * (RNCSafeAreaView) that reads insets from the platform directly and ignores
 * the JS SafeAreaInsetsContext, so it cannot be told that a parent already
 * consumed them - it simply pads a second time, leaving a large empty band at
 * the top. Use `useSafeAreaInsets()` if a screen ever needs the raw values.
 *
 * Left/right insets are published unchanged for anything that needs them:
 * those matter in landscape on devices with a display cutout, and nothing here
 * consumes them.
 */

import { useColors } from "@/src/context/themeContext";
import React from "react";
import { View } from "react-native";
import {
	SafeAreaInsetsContext,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

export const SafeAreaFrame: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const insets = useSafeAreaInsets();
	// The padded strips sit behind the status and navigation bars. Without an
	// explicit colour they show the raw window background, which reads as two
	// mismatched bands in dark mode.
	const theme = useColors();

	return (
		<View
			style={{
				flex: 1,
				paddingTop: insets.top,
				paddingBottom: insets.bottom,
				backgroundColor: theme.background,
			}}
		>
			<SafeAreaInsetsContext.Provider
				value={{ top: 0, bottom: 0, left: insets.left, right: insets.right }}
			>
				{children}
			</SafeAreaInsetsContext.Provider>
		</View>
	);
};

export default SafeAreaFrame;
