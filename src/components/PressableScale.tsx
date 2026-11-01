import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Reanimated, {
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

// Press feedback that starts on touch-down (not release) and is interruptible:
// a critically-damped spring re-targets from the current scale on every press.
const SPRING = {
	damping: 40,
	stiffness: 600,
	mass: 1,
	reduceMotion: ReduceMotion.System,
};

type Props = Omit<PressableProps, "style"> & {
	style?: StyleProp<ViewStyle>;
	pressedScale?: number;
};

export function PressableScale({
	style,
	pressedScale = 0.92,
	onPressIn,
	onPressOut,
	children,
	...rest
}: Props) {
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	return (
		<Pressable
			{...rest}
			onPressIn={(e) => {
				scale.value = withSpring(pressedScale, SPRING);
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				scale.value = withSpring(1, SPRING);
				onPressOut?.(e);
			}}
		>
			<Reanimated.View style={[style, animatedStyle]}>
				{children as React.ReactNode}
			</Reanimated.View>
		</Pressable>
	);
}
