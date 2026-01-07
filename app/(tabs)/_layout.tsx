import { Stack } from "expo-router";
import React from "react";

export default function TabLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "fade",
				animationDuration: 200,
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="two" />
			<Stack.Screen name="workout" />
			<Stack.Screen name="finance" />
			<Stack.Screen name="study" />
			<Stack.Screen name="profile" />
			<Stack.Screen name="statistics" />
		</Stack>
	);
}
