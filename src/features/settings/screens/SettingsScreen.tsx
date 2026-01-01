import React from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { COLORS } from "../../../constants";

const SettingsScreen = () => {
	return (
		<ScrollView style={styles.container}>
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Notifications</Text>
				<SettingItem
					icon="notifications"
					label="Enable All Notifications"
					description="Get reminders for your habits"
					value={true}
				/>
				<SettingItem
					icon="volume-high"
					label="Enable Sound"
					description="Play sound for notifications"
					value={true}
				/>
				<SettingItem
					icon="vibrate"
					label="Enable Vibration"
					description="Vibrate on notifications"
					value={true}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>About</Text>
				<TouchableOpacity style={styles.settingItemContainer}>
					<View style={styles.settingItemContent}>
						<Ionicons
							name="information-circle"
							size={24}
							color={COLORS.primary}
						/>
						<View style={styles.settingItemText}>
							<Text style={styles.settingLabel}>App Version</Text>
							<Text style={styles.settingDescription}>1.0.0</Text>
						</View>
					</View>
				</TouchableOpacity>
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Habit Tracker App</Text>
				<Text style={styles.footerSubtext}>
					Build better habits, one day at a time
				</Text>
			</View>
		</ScrollView>
	);
};

interface SettingItemProps {
	icon: string;
	label: string;
	description: string;
	value?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
	icon,
	label,
	description,
	value,
}) => (
	<TouchableOpacity style={styles.settingItemContainer} activeOpacity={0.7}>
		<View style={styles.settingItemContent}>
			<Ionicons name={icon as any} size={24} color={COLORS.primary} />
			<View style={styles.settingItemText}>
				<Text style={styles.settingLabel}>{label}</Text>
				<Text style={styles.settingDescription}>{description}</Text>
			</View>
		</View>
		<View style={[styles.toggle, value && styles.toggleOn]}>
			<View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
		</View>
	</TouchableOpacity>
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	section: {
		marginTop: 20,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: COLORS.text,
		marginBottom: 12,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	settingItemContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.surface,
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 8,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 1,
	},
	settingItemContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	settingItemText: {
		marginLeft: 12,
		flex: 1,
	},
	settingLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.text,
	},
	settingDescription: {
		fontSize: 12,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	toggle: {
		width: 48,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.border,
		padding: 2,
		justifyContent: "center",
	},
	toggleOn: {
		backgroundColor: COLORS.primary,
	},
	toggleThumb: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: COLORS.surface,
		alignSelf: "flex-start",
	},
	toggleThumbOn: {
		alignSelf: "flex-end",
	},
	footer: {
		alignItems: "center",
		marginVertical: 40,
	},
	footerText: {
		fontSize: 16,
		fontWeight: "600",
		color: COLORS.text,
	},
	footerSubtext: {
		fontSize: 13,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
});

export default SettingsScreen;
