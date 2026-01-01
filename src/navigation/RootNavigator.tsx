import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import HabitTrackerScreen from "../features/habit-tracker/screens/HabitTrackerScreen";
import SettingsScreen from "../features/settings/screens/SettingsScreen";

// Screens (we'll create these next)

const Tab = createBottomTabNavigator();

export const RootNavigator = () => {
	return (
		<NavigationContainer>
			<Tab.Navigator
				screenOptions={({ route }) => ({
					headerShown: true,
					headerStyle: {
						backgroundColor: "#6200EE",
					},
					headerTintColor: "#fff",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					tabBarIcon: ({ focused, color, size }) => {
						let iconName: any;

						if (route.name === "HabitTracker") {
							iconName = focused
								? "checkmark-circle"
								: "checkmark-circle-outline";
						} else if (route.name === "Settings") {
							iconName = focused ? "settings" : "settings-outline";
						}

						return <Ionicons name={iconName} size={size} color={color} />;
					},
					tabBarActiveTintColor: "#6200EE",
					tabBarInactiveTintColor: "#999",
				})}
			>
				<Tab.Screen
					name="HabitTracker"
					component={HabitTrackerScreen}
					options={{
						title: "My Habits",
					}}
				/>
				<Tab.Screen
					name="Settings"
					component={SettingsScreen}
					options={{
						title: "Settings",
					}}
				/>
			</Tab.Navigator>
		</NavigationContainer>
	);
};
