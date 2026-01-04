import { useHabitStore } from "@/src/context/habitStore";
import { ModuleType, useModuleStore } from "@/src/context/moduleContext";
import { Theme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
	Animated,
	Dimensions,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const { width } = Dimensions.get("window");

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
		icon: "sparkles",
		color: "primary",
		route: "/(tabs)/",
		description: "Build better habits",
	},
	workout: {
		label: "FitZone",
		icon: "flame",
		color: "success",
		route: "/(tabs)/workout",
		description: "Track your workouts",
	},
	finance: {
		label: "Money Hub",
		icon: "trending-up",
		color: "warning",
		route: "/(tabs)/finance",
		description: "Manage your finances",
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
	const { profile } = useHabitStore();
	const { enabledModules } = useModuleStore();

	const userName = profile?.name || "User";
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
			style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
		>
			<TouchableOpacity
				style={styles.drawerHeader}
				onPress={() => {
					onCloseDrawer();
					router.push({
						pathname: "/(tabs)/profile",
						params: { from: currentModule },
					} as any);
				}}
				activeOpacity={0.7}
			>
				{profile?.avatar ? (
					<Image
						source={{ uri: profile.avatar }}
						style={styles.drawerAvatarImage}
					/>
				) : (
					<View style={styles.drawerAvatar}>
						<Ionicons name="person" size={32} color={theme.textSecondary} />
					</View>
				)}
				<Text style={styles.drawerName}>{userName}</Text>
				<Text style={styles.drawerEmail}>
					{profile?.email || "Tap to set up profile"}
				</Text>
			</TouchableOpacity>

			<View style={styles.drawerContent}>
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
			</View>

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
		drawerHeader: {
			alignItems: "center",
			paddingVertical: 24,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
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
			paddingTop: 16,
			paddingHorizontal: 16,
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
