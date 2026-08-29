import { useAuthStore } from "@/src/context/authStore";
import { ModuleType, useModuleStore } from "@/src/context/moduleContext";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
	Animated,
	Dimensions,
	Image,
	PanResponder,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

// Must match the drawer's own width, and the closed offset every screen seeds
// its Animated.Value with (-width * 0.8).
const DRAWER_WIDTH = width * 0.8;

// How wide the invisible grab strip along the left edge is. Taps inside it are
// swallowed, so keep it narrow enough to sit clear of interactive content.
const EDGE_WIDTH = 24;

// Fraction of the drawer you must drag past for the release to open it.
const OPEN_THRESHOLD = 0.33;
// A flick this fast opens regardless of distance.
const OPEN_VELOCITY = 0.5;

interface DrawerEdgeSwipeProps {
	drawerAnim: Animated.Value;
	drawerOpen: boolean;
	setDrawerOpen: (open: boolean) => void;
}

/**
 * Invisible left-edge strip that opens the drawer on a swipe-right, tracking
 * the finger as it moves and snapping open or closed on release.
 *
 * Render it as a sibling of SharedDrawer. It sits below the drawer and its
 * overlay in the stacking order, so it never intercepts their touches.
 */
export const DrawerEdgeSwipe: React.FC<DrawerEdgeSwipeProps> = ({
	drawerAnim,
	drawerOpen,
	setDrawerOpen,
}) => {
	// PanResponder closes over its callbacks, so keep the latest `drawerOpen`
	// in a ref rather than rebuilding the responder on every render.
	const isOpenRef = React.useRef(drawerOpen);
	isOpenRef.current = drawerOpen;

	const panResponder = React.useMemo(
		() =>
			PanResponder.create({
				// Claim the touch as soon as it lands in the strip, and capture it so
				// the screen's ScrollView underneath can't take it first.
				//
				// Deferring to onMoveShouldSetPanResponder does not work here: the
				// strip is an absolutely-positioned SIBLING of the content, not an
				// ancestor. Declining at touch-start hands the responder to the
				// ScrollView below, and RN only consults move-should-set on the
				// ancestors of the current responder - so this strip was never asked
				// again and the swipe never fired.
				//
				// The cost is that a vertical scroll begun inside these 24dp does not
				// scroll. That is the trade-off this strip was always meant to make.
				onStartShouldSetPanResponder: () => !isOpenRef.current,
				onStartShouldSetPanResponderCapture: () => !isOpenRef.current,
				onMoveShouldSetPanResponder: () => !isOpenRef.current,
				onMoveShouldSetPanResponderCapture: () => !isOpenRef.current,
				// Once we have the gesture, don't let a parent reclaim it mid-drag.
				onPanResponderTerminationRequest: () => false,

				onPanResponderMove: (_evt, gesture) => {
					// Ignore leftward drags; the drawer is already fully closed.
					const dx = Math.max(0, gesture.dx);
					const next = Math.min(0, Math.max(-DRAWER_WIDTH, -DRAWER_WIDTH + dx));
					drawerAnim.setValue(next);
				},

				onPanResponderRelease: (_evt, gesture) => {
					const shouldOpen =
						gesture.dx > DRAWER_WIDTH * OPEN_THRESHOLD ||
						gesture.vx > OPEN_VELOCITY;

					if (shouldOpen) {
						// Flipping the flag runs the screen's own animation effect,
						// which drives drawerAnim to 0 and renders the overlay.
						setDrawerOpen(true);
						return;
					}

					// Cancelled: drawerOpen never changed, so that effect won't fire.
					// Settle the value back ourselves.
					Animated.timing(drawerAnim, {
						toValue: -DRAWER_WIDTH,
						duration: 200,
						useNativeDriver: true,
					}).start();
				},

				onPanResponderTerminate: () => {
					Animated.timing(drawerAnim, {
						toValue: -DRAWER_WIDTH,
						duration: 200,
						useNativeDriver: true,
					}).start();
				},
			}),
		[drawerAnim, setDrawerOpen]
	);

	// Nothing to grab while the drawer is open — the overlay handles dismissal.
	if (drawerOpen) return null;

	return (
		<View
			{...panResponder.panHandlers}
			style={edgeStyles.edge}
			// Keeps the strip out of the accessibility tree; it's a gesture affordance.
			accessible={false}
		/>
	);
};

const edgeStyles = StyleSheet.create({
	edge: {
		position: "absolute",
		top: 0,
		left: 0,
		bottom: 0,
		width: EDGE_WIDTH,
		// Below the overlay (10) and the drawer (20), above ordinary content.
		zIndex: 5,
	},
});

interface SharedDrawerProps {
	theme: Theme;
	isDark: boolean;
	toggleTheme: () => void;
	drawerAnim: Animated.Value;
	currentModule: ModuleType;
	onCloseDrawer: () => void;
}

const moduleConfig: Record<
	ModuleType,
	{
		label: string;
		icon: string;
		color: string;
		route: string;
		description: string;
	}
> = {
	habits: {
		label: "Daily Rituals",
		icon: "checkmark-circle",
		color: "primary",
		route: "/(tabs)/",
		description: "Build better habits",
	},
	workout: {
		label: "FitZone",
		icon: "barbell",
		color: "success",
		route: "/(tabs)/workout",
		description: "Track your workouts",
	},
	finance: {
		label: "Money Hub",
		icon: "wallet",
		color: "warning",
		route: "/(tabs)/finance",
		description: "Manage your finances",
	},
	study: {
		label: "Study Hub",
		icon: "school",
		color: "accent",
		route: "/(tabs)/study",
		description: "Master any exam or skill",
	},
};

export const SharedDrawer: React.FC<SharedDrawerProps> = ({
	theme,
	isDark,
	toggleTheme,
	drawerAnim,
	currentModule,
	onCloseDrawer,
}) => {
	const router = useRouter();
	const { profile: authProfile, user } = useAuthStore();
	const { enabledModules } = useModuleStore();
	// In landscape the drawer is only a few hundred dp tall, so the tall profile
	// header would push the module list off-screen.
	const { width: winWidth, height: winHeight } = useWindowDimensions();
	const isLandscape = winWidth > winHeight;

	const userName =
		authProfile?.full_name || user?.email?.split("@")[0] || "User";
	const styles = createStyles(theme);

	const navigateToModule = (route: string) => {
		onCloseDrawer();
		router.push(route as any);
	};

	const renderModuleItems = () => {
		// Safety check: if no modules enabled, return empty array
		if (!enabledModules || enabledModules.length === 0) {
			return null;
		}

		return enabledModules.map((module) => {
			const config = moduleConfig[module];
			const colorKey = config.color as keyof Theme;

			return (
				<TouchableOpacity
					key={module}
					style={[
						styles.drawerItem,
						currentModule === module && styles.drawerItemActive,
					]}
					onPress={() => navigateToModule(config.route)}
				>
					<View
						style={[
							styles.drawerItemIconNew,
							{ backgroundColor: (theme[colorKey] as string) + "20" },
						]}
					>
						<Ionicons
							name={config.icon as any}
							size={20}
							color={theme[colorKey] as string}
						/>
					</View>
					<View style={styles.drawerItemContent}>
						<Text
							style={[
								styles.drawerItemText,
								currentModule === module && styles.drawerItemTextActive,
							]}
						>
							{config.label}
						</Text>
						<Text style={styles.drawerItemSubtext}>{config.description}</Text>
					</View>
					{currentModule === module && (
						<View
							style={[
								styles.drawerItemBadge,
								{
									backgroundColor: (theme[colorKey] as string) + "20",
								},
							]}
						>
							<Ionicons
								name="checkmark"
								size={16}
								color={theme[colorKey] as string}
							/>
						</View>
					)}
				</TouchableOpacity>
			);
		});
	};

	return (
		<Animated.View
			style={[
				styles.drawer,
				isLandscape && styles.drawerLandscape,
				{ transform: [{ translateX: drawerAnim }] },
			]}
		>
			<TouchableOpacity
				style={[styles.drawerHeader, isLandscape && styles.drawerHeaderCompact]}
				onPress={() => {
					onCloseDrawer();
					router.push({
						pathname: "/(tabs)/profile",
						params: { from: currentModule },
					} as any);
				}}
				activeOpacity={0.7}
			>
				{authProfile?.avatar_url ? (
					<Image
						source={{ uri: authProfile.avatar_url }}
						style={[
							styles.drawerAvatarImage,
							isLandscape && styles.drawerAvatarCompact,
						]}
					/>
				) : (
					<View
						style={[
							styles.drawerAvatar,
							isLandscape && styles.drawerAvatarCompact,
						]}
					>
						<Ionicons
							name="person"
							size={isLandscape ? 22 : 32}
							color={theme.textSecondary}
						/>
					</View>
				)}
				<Text style={styles.drawerName}>{userName}</Text>
				<Text style={styles.drawerEmail}>
					{authProfile?.email || user?.email || "Tap to set up profile"}
				</Text>
			</TouchableOpacity>

			<ScrollView
				style={styles.drawerContent}
				contentContainerStyle={styles.drawerContentInner}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.drawerSectionTitle}>MODULES</Text>

				{renderModuleItems()}

				<View style={styles.drawerDivider} />

				<Text style={styles.drawerSectionTitle}>GENERAL</Text>

				<TouchableOpacity
					style={styles.drawerItem}
					onPress={() => {
						onCloseDrawer();
						router.push(`/two?from=${currentModule}`);
					}}
				>
					<View
						style={[
							styles.drawerItemIconNew,
							{ backgroundColor: theme.accent + "20" },
						]}
					>
						<Ionicons name="cog" size={20} color={theme.accent} />
					</View>
					<View style={styles.drawerItemContent}>
						<Text style={styles.drawerItemText}>Preferences</Text>
						<Text style={styles.drawerItemSubtext}>Customize your app</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
				</TouchableOpacity>
			</ScrollView>

			<View style={styles.drawerFooter}>
				<View style={styles.themeToggle}>
					<View style={styles.themeToggleLabel}>
						<Ionicons
							name={isDark ? "moon" : "sunny"}
							size={20}
							color={theme.text}
						/>
						<Text style={styles.themeToggleText}>
							{isDark ? "Dark Mode" : "Light Mode"}
						</Text>
					</View>
					<TouchableOpacity
						style={[styles.toggle, isDark && styles.toggleOn]}
						onPress={toggleTheme}
					>
						<View
							style={[styles.toggleThumb, isDark && styles.toggleThumbOn]}
						/>
					</TouchableOpacity>
				</View>
			</View>
		</Animated.View>
	);
};

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		drawer: {
			position: "absolute",
			top: 0,
			left: 0,
			bottom: 0,
			width: width * 0.8,
			backgroundColor: theme.background,
			zIndex: 20,
			paddingTop: 50,
			shadowColor: "#000",
			shadowOffset: { width: 2, height: 0 },
			shadowOpacity: 0.25,
			shadowRadius: 10,
			elevation: 10,
		},
		drawerLandscape: {
			paddingTop: 16,
		},
		drawerHeader: {
			alignItems: "center",
			paddingVertical: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		drawerHeaderCompact: {
			paddingVertical: 10,
		},
		drawerAvatarCompact: {
			width: 48,
			height: 48,
			borderRadius: 24,
			marginBottom: 6,
		},
		drawerAvatar: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.surface,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 12,
		},
		drawerAvatarImage: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 12,
		},
		drawerName: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		drawerEmail: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		drawerContent: {
			flex: 1,
		},
		drawerContentInner: {
			paddingTop: 16,
			paddingHorizontal: 16,
			paddingBottom: 16,
		},
		drawerSectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.textMuted,
			letterSpacing: 1,
			marginBottom: 12,
			marginLeft: 4,
		},
		drawerItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 14,
			paddingVertical: 14,
			gap: 14,
			borderRadius: 16,
			marginBottom: 8,
			backgroundColor: theme.surfaceLight,
		},
		drawerItemIconNew: {
			width: 42,
			height: 42,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemContent: {
			flex: 1,
		},
		drawerItemText: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.text,
		},
		drawerItemSubtext: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		drawerItemBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			justifyContent: "center",
			alignItems: "center",
		},
		drawerItemActive: {
			backgroundColor: theme.primary + "15",
			borderWidth: 1,
			borderColor: theme.primary + "30",
		},
		drawerItemTextActive: {
			color: theme.primary,
			fontWeight: "600",
		},
		drawerDivider: {
			height: 1,
			backgroundColor: theme.border,
			marginVertical: 16,
			marginHorizontal: 4,
		},
		drawerFooter: {
			padding: 20,
			borderTopWidth: 1,
			borderTopColor: theme.border,
		},
		themeToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		themeToggleLabel: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		themeToggleText: {
			fontSize: 14,
			color: theme.text,
		},
		toggle: {
			width: 50,
			height: 28,
			borderRadius: 14,
			backgroundColor: theme.surface,
			padding: 2,
			justifyContent: "center",
		},
		toggleOn: {
			backgroundColor: theme.primary,
		},
		toggleThumb: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.textMuted,
		},
		toggleThumbOn: {
			backgroundColor: "#fff",
			alignSelf: "flex-end",
		},
	});
