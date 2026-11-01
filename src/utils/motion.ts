import { Animated, Easing } from "react-native";

/**
 * Shared motion tokens. Springs are expressed as stiffness/damping with
 * mass 1, tuned to Apple's damping-ratio + response model:
 *   response ≈ 2π / √stiffness,  dampingRatio = damping / (2·√stiffness)
 */
export const springs = {
	/** Critically damped, ~0.3s — drawers, re-positioning. No overshoot. */
	smooth: { stiffness: 420, damping: 41, mass: 1 },
	/** Slightly under-damped (~0.85), ~0.3s — only after a flick carried momentum. */
	momentum: { stiffness: 440, damping: 36, mass: 1 },
	/** Fast, critically damped — dialogs, small surfaces. */
	snappy: { stiffness: 700, damping: 53, mass: 1 },
} as const;

/** Strong ease-out (Emil Kowalski) for enter/exit timing animations. */
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

/** Apple's momentum projection: where a flick at `velocity` (px/ms) would come to rest. */
export function project(velocityPxPerMs: number, decelerationRate = 0.998) {
	return (velocityPxPerMs * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, c = 0.55) {
	return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/** Spring the side drawer to open/closed, handing off any gesture velocity. */
const drawerTargets = new WeakMap<Animated.Value, boolean>();

export function springDrawer(
	value: Animated.Value,
	open: boolean,
	width: number,
	velocityPxPerMs = 0,
) {
	// A gesture already launched this drawer toward `open` with its release
	// velocity; the screen's state effect firing afterwards must not restart
	// the spring at zero velocity (that would leave a visible seam).
	if (velocityPxPerMs === 0 && drawerTargets.get(value) === open) return;
	drawerTargets.set(value, open);
	Animated.spring(value, {
		toValue: open ? 0 : -width,
		velocity: velocityPxPerMs,
		...springs.smooth,
		useNativeDriver: true,
	}).start();
}
