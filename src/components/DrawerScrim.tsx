import React from "react";
import {
	Animated,
	StyleProp,
	TouchableWithoutFeedback,
	View,
	ViewStyle,
} from "react-native";

type Props = {
	drawerAnim: Animated.Value;
	drawerWidth: number;
	open: boolean;
	onClose: () => void;
	style: StyleProp<ViewStyle>;
};

/**
 * Dimming layer behind the side drawer. Its opacity is derived from the
 * drawer's position, so it tracks the drawer 1:1 — including during a drag —
 * instead of popping in or out.
 */
export function DrawerScrim({
	drawerAnim,
	drawerWidth,
	open,
	onClose,
	style,
}: Props) {
	return (
		<Animated.View
			pointerEvents={open ? "auto" : "none"}
			style={[
				style,
				{
					zIndex: 15,
					opacity: drawerAnim.interpolate({
						inputRange: [-drawerWidth, 0],
						outputRange: [0, 1],
						extrapolate: "clamp",
					}),
				},
			]}
		>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={{ flex: 1 }} />
			</TouchableWithoutFeedback>
		</Animated.View>
	);
}
