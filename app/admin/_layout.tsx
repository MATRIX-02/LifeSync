import { Stack } from "expo-router";

export default function AdminLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "slide_from_right",
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="users" />
			<Stack.Screen name="coupons" />
			<Stack.Screen name="plans" />
			<Stack.Screen name="payments" />
		</Stack>
	);
}
