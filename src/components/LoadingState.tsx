/**
 * Full-screen "still loading" placeholder for a module.
 *
 * The stores all track `isLoading`, but no screen read it - so while the first
 * database fetch was in flight every module rendered as though it were empty.
 * A populated account looked like a brand-new one until the data landed, which
 * is indistinguishable from data loss.
 *
 * Only for the FIRST load. Once a screen has something to show, a refresh
 * should leave it on screen rather than replacing it with a spinner - that is
 * what the pull-to-refresh indicator is for.
 */

import { useColors } from "@/src/context/themeContext";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export const LoadingState: React.FC<{ label?: string }> = ({
	label = "Loading…",
}) => {
	const theme = useColors();

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<ActivityIndicator size="large" color={theme.primary} />
			<Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 14,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
	},
});

export default LoadingState;
