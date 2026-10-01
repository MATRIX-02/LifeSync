// AI insights for the Habits module.

import HabitAIInsights from "@/src/components/habits/HabitAIInsights";
import { PremiumFeatureGate } from "@/src/components/PremiumFeatureGate";
import { Theme, useColors, useTheme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

export default function HabitInsightsScreen() {
	const router = useRouter();
	const theme = useColors();
	const { isDark } = useTheme();
	const styles = createStyles(theme);

	return (
		<View style={styles.container}>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={theme.background}
			/>

			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={22} color={theme.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Habit Insights</Text>
			</View>

			<View style={styles.content}>
				<PremiumFeatureGate feature="AI Insights" requiredPlan="pro">
					<HabitAIInsights theme={theme} />
				</PremiumFeatureGate>
			</View>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		backButton: {
			padding: 2,
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.text,
		},
		content: {
			flex: 1,
		},
	});
