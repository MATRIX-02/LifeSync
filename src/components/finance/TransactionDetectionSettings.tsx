/**
 * Transaction Detection Settings Component
 * Allows users to configure auto-detection of transactions from notifications and SMS
 */

import { Theme, useTheme } from "@/src/context/themeContext";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	Alert,
	Linking,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface TransactionDetectionSettingsProps {
	onScanSms?: () => void;
}

export default function TransactionDetectionSettings({
	onScanSms,
}: TransactionDetectionSettingsProps) {
	const { theme } = useTheme();
	const styles = createStyles(theme);

	const {
		settings,
		isListening,
		isSmsWatching,
		pendingTransactions,
		checkPermissions,
		requestNotificationAccess,
		requestSmsAccess,
		startListening,
		stopListening,
		scanRecentSms,
		toggleNotificationListener,
		toggleSmsReader,
		toggleAutoShowPrompt,
		clearPending,
	} = useTransactionDetectionStore();

	const [isScanning, setIsScanning] = useState(false);

	// Check permissions on mount
	useEffect(() => {
		if (Platform.OS === "android") {
			checkPermissions();
		}
	}, []);

	const handleNotificationPermission = async () => {
		if (settings.notificationPermissionGranted) {
			// Already granted, open settings to revoke
			Alert.alert(
				"Notification Access",
				"Notification access is enabled. To disable, go to Settings > Apps > LifeSync > Notifications",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Open Settings",
						onPress: () => Linking.openSettings(),
					},
				]
			);
		} else {
			Alert.alert(
				"Enable Notification Access",
				"To automatically detect UPI payments, you need to grant Notification Access. This allows LifeSync to read payment notifications from PhonePe, Google Pay, Paytm, etc.\n\nYou'll be taken to Settings to enable this.",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Continue",
						onPress: async () => {
							await requestNotificationAccess();
							// Check again
							await checkPermissions();
						},
					},
				]
			);
		}
	};

	const handleSmsPermission = async () => {
		if (settings.smsPermissionGranted) {
			Alert.alert(
				"SMS Permission",
				"SMS reading is enabled. To disable, go to Settings > Apps > LifeSync > Permissions",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Open Settings",
						onPress: () => Linking.openSettings(),
					},
				]
			);
		} else {
			const granted = await requestSmsAccess();
			if (!granted) {
				Alert.alert(
					"Permission Denied",
					"SMS permission is required to read bank transaction messages. You can enable it from Settings.",
					[
						{ text: "Cancel", style: "cancel" },
						{
							text: "Open Settings",
							onPress: () => Linking.openSettings(),
						},
					]
				);
			}
		}
	};

	const handleScanSms = async () => {
		if (!settings.smsPermissionGranted) {
			Alert.alert(
				"Permission Required",
				"Please grant SMS permission first to scan messages."
			);
			return;
		}

		setIsScanning(true);
		try {
			const transactions = await scanRecentSms();
			Alert.alert(
				"Scan Complete",
				`Found ${transactions.length} transaction${
					transactions.length !== 1 ? "s" : ""
				} in the last 48 hours.`
			);
			if (onScanSms) {
				onScanSms();
			}
		} catch (error) {
			Alert.alert("Error", "Failed to scan SMS messages.");
		} finally {
			setIsScanning(false);
		}
	};

	const handleStartListening = async () => {
		if (
			!settings.notificationPermissionGranted &&
			!settings.smsPermissionGranted
		) {
			Alert.alert(
				"Permission Required",
				"Please grant at least one permission (Notification Access or SMS) to start detection."
			);
			return;
		}
		await startListening();
	};

	const handleClearPending = () => {
		Alert.alert(
			"Clear Pending",
			`Are you sure you want to dismiss all ${pendingTransactions.length} pending transactions?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear All",
					style: "destructive",
					onPress: clearPending,
				},
			]
		);
	};

	if (Platform.OS !== "android") {
		return (
			<View style={styles.container}>
				<View style={styles.notAvailable}>
					<Ionicons
						name="phone-portrait-outline"
						size={48}
						color={theme.textMuted}
					/>
					<Text style={styles.notAvailableTitle}>Android Only</Text>
					<Text style={styles.notAvailableText}>
						Auto-detection of transactions from notifications and SMS is only
						available on Android devices. iOS doesn't allow apps to read
						notifications or SMS from other apps.
					</Text>
				</View>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Header Info */}
			<View style={styles.infoCard}>
				<Ionicons name="flash" size={24} color={theme.primary} />
				<View style={styles.infoContent}>
					<Text style={styles.infoTitle}>Smart Transaction Detection</Text>
					<Text style={styles.infoText}>
						Automatically detect UPI payments from app notifications and bank
						SMS messages. Add them to your tracker with one tap!
					</Text>
				</View>
			</View>

			{/* Permissions Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Permissions</Text>

				{/* Notification Access */}
				<TouchableOpacity
					style={styles.permissionItem}
					onPress={handleNotificationPermission}
				>
					<View style={styles.permissionLeft}>
						<View
							style={[
								styles.permissionIcon,
								{
									backgroundColor: settings.notificationPermissionGranted
										? theme.success + "20"
										: theme.warning + "20",
								},
							]}
						>
							<Ionicons
								name="notifications"
								size={20}
								color={
									settings.notificationPermissionGranted
										? theme.success
										: theme.warning
								}
							/>
						</View>
						<View style={styles.permissionInfo}>
							<Text style={styles.permissionTitle}>Notification Access</Text>
							<Text style={styles.permissionDesc}>
								Read UPI app notifications (PhonePe, GPay, Paytm)
							</Text>
						</View>
					</View>
					<View style={styles.permissionStatus}>
						<Text
							style={[
								styles.permissionStatusText,
								{
									color: settings.notificationPermissionGranted
										? theme.success
										: theme.warning,
								},
							]}
						>
							{settings.notificationPermissionGranted ? "Enabled" : "Disabled"}
						</Text>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={theme.textMuted}
						/>
					</View>
				</TouchableOpacity>

				{/* SMS Permission */}
				<TouchableOpacity
					style={styles.permissionItem}
					onPress={handleSmsPermission}
				>
					<View style={styles.permissionLeft}>
						<View
							style={[
								styles.permissionIcon,
								{
									backgroundColor: settings.smsPermissionGranted
										? theme.success + "20"
										: theme.warning + "20",
								},
							]}
						>
							<Ionicons
								name="mail"
								size={20}
								color={
									settings.smsPermissionGranted ? theme.success : theme.warning
								}
							/>
						</View>
						<View style={styles.permissionInfo}>
							<Text style={styles.permissionTitle}>SMS Reading</Text>
							<Text style={styles.permissionDesc}>
								Read bank transaction SMS messages
							</Text>
						</View>
					</View>
					<View style={styles.permissionStatus}>
						<Text
							style={[
								styles.permissionStatusText,
								{
									color: settings.smsPermissionGranted
										? theme.success
										: theme.warning,
								},
							]}
						>
							{settings.smsPermissionGranted ? "Enabled" : "Disabled"}
						</Text>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={theme.textMuted}
						/>
					</View>
				</TouchableOpacity>
			</View>

			{/* Settings Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Settings</Text>

				{/* Notification Listener Toggle */}
				<View style={styles.settingItem}>
					<View style={styles.settingLeft}>
						<Ionicons
							name="notifications-outline"
							size={22}
							color={theme.primary}
						/>
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>UPI Notification Listener</Text>
							<Text style={styles.settingDesc}>
								Listen for payment notifications
							</Text>
						</View>
					</View>
					<Switch
						value={settings.notificationListenerEnabled}
						onValueChange={toggleNotificationListener}
						trackColor={{ false: theme.border, true: theme.primary + "50" }}
						thumbColor={
							settings.notificationListenerEnabled
								? theme.primary
								: theme.surface
						}
					/>
				</View>

				{/* SMS Reader Toggle */}
				<View style={styles.settingItem}>
					<View style={styles.settingLeft}>
						<Ionicons name="mail-outline" size={22} color={theme.primary} />
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Bank SMS Reader</Text>
							<Text style={styles.settingDesc}>
								Watch for bank transaction SMS
							</Text>
						</View>
					</View>
					<Switch
						value={settings.smsReaderEnabled}
						onValueChange={toggleSmsReader}
						trackColor={{ false: theme.border, true: theme.primary + "50" }}
						thumbColor={
							settings.smsReaderEnabled ? theme.primary : theme.surface
						}
					/>
				</View>

				{/* Auto Show Prompt */}
				<View style={styles.settingItem}>
					<View style={styles.settingLeft}>
						<Ionicons name="flash-outline" size={22} color={theme.primary} />
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Auto Show Prompt</Text>
							<Text style={styles.settingDesc}>
								Show add transaction prompt automatically
							</Text>
						</View>
					</View>
					<Switch
						value={settings.autoShowPrompt}
						onValueChange={toggleAutoShowPrompt}
						trackColor={{ false: theme.border, true: theme.primary + "50" }}
						thumbColor={settings.autoShowPrompt ? theme.primary : theme.surface}
					/>
				</View>
			</View>

			{/* Status Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Status</Text>

				<View style={styles.statusCard}>
					<View style={styles.statusRow}>
						<View style={styles.statusItem}>
							<View
								style={[
									styles.statusDot,
									{
										backgroundColor: isListening ? theme.success : theme.error,
									},
								]}
							/>
							<Text style={styles.statusText}>
								Notification: {isListening ? "Active" : "Inactive"}
							</Text>
						</View>
						<View style={styles.statusItem}>
							<View
								style={[
									styles.statusDot,
									{
										backgroundColor: isSmsWatching
											? theme.success
											: theme.error,
									},
								]}
							/>
							<Text style={styles.statusText}>
								SMS: {isSmsWatching ? "Active" : "Inactive"}
							</Text>
						</View>
					</View>
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>Pending Transactions:</Text>
						<Text style={styles.statusValue}>{pendingTransactions.length}</Text>
					</View>
				</View>

				{/* Action Buttons */}
				<View style={styles.actionButtons}>
					{!isListening && !isSmsWatching ? (
						<TouchableOpacity
							style={[styles.actionButton, { backgroundColor: theme.primary }]}
							onPress={handleStartListening}
						>
							<Ionicons name="play" size={18} color="#fff" />
							<Text style={styles.actionButtonText}>Start Detection</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.actionButton, { backgroundColor: theme.error }]}
							onPress={stopListening}
						>
							<Ionicons name="stop" size={18} color="#fff" />
							<Text style={styles.actionButtonText}>Stop Detection</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={[styles.actionButton, { backgroundColor: theme.surface }]}
						onPress={handleScanSms}
						disabled={isScanning}
					>
						<Ionicons
							name="scan"
							size={18}
							color={isScanning ? theme.textMuted : theme.primary}
						/>
						<Text
							style={[
								styles.actionButtonTextSecondary,
								isScanning && { color: theme.textMuted },
							]}
						>
							{isScanning ? "Scanning..." : "Scan Recent SMS"}
						</Text>
					</TouchableOpacity>
				</View>

				{pendingTransactions.length > 0 && (
					<TouchableOpacity
						style={styles.clearButton}
						onPress={handleClearPending}
					>
						<Ionicons name="trash-outline" size={16} color={theme.error} />
						<Text style={[styles.clearButtonText, { color: theme.error }]}>
							Clear All Pending
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Privacy Note */}
			<View style={styles.privacyNote}>
				<Ionicons name="shield-checkmark" size={16} color={theme.textMuted} />
				<Text style={styles.privacyNoteText}>
					Your data stays on your device. We never send notifications or SMS
					content to any server.
				</Text>
			</View>
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		notAvailable: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			padding: 40,
		},
		notAvailableTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.text,
			marginTop: 16,
		},
		notAvailableText: {
			fontSize: 14,
			color: theme.textMuted,
			textAlign: "center",
			marginTop: 8,
			lineHeight: 20,
		},
		infoCard: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 12,
			backgroundColor: theme.primary + "10",
			padding: 16,
			margin: 16,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.primary + "30",
		},
		infoContent: {
			flex: 1,
		},
		infoTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.text,
			marginBottom: 4,
		},
		infoText: {
			fontSize: 13,
			color: theme.textSecondary,
			lineHeight: 18,
		},
		section: {
			paddingHorizontal: 16,
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.textMuted,
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: 12,
		},
		permissionItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			marginBottom: 8,
		},
		permissionLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		permissionIcon: {
			width: 40,
			height: 40,
			borderRadius: 10,
			alignItems: "center",
			justifyContent: "center",
		},
		permissionInfo: {
			flex: 1,
		},
		permissionTitle: {
			fontSize: 15,
			fontWeight: "500",
			color: theme.text,
		},
		permissionDesc: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		permissionStatus: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		permissionStatusText: {
			fontSize: 13,
			fontWeight: "500",
		},
		settingItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			marginBottom: 8,
		},
		settingLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		settingInfo: {
			flex: 1,
		},
		settingTitle: {
			fontSize: 15,
			fontWeight: "500",
			color: theme.text,
		},
		settingDesc: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 2,
		},
		statusCard: {
			backgroundColor: theme.surface,
			padding: 14,
			borderRadius: 12,
			gap: 12,
		},
		statusRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		statusItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		statusDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		statusText: {
			fontSize: 13,
			color: theme.textSecondary,
		},
		statusLabel: {
			fontSize: 13,
			color: theme.textMuted,
		},
		statusValue: {
			fontSize: 14,
			fontWeight: "600",
			color: theme.text,
		},
		actionButtons: {
			flexDirection: "row",
			gap: 8,
			marginTop: 12,
		},
		actionButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 12,
			borderRadius: 10,
		},
		actionButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#fff",
		},
		actionButtonTextSecondary: {
			fontSize: 14,
			fontWeight: "500",
			color: theme.primary,
		},
		clearButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			marginTop: 12,
			paddingVertical: 8,
		},
		clearButtonText: {
			fontSize: 13,
			fontWeight: "500",
		},
		privacyNote: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 8,
			paddingHorizontal: 16,
			paddingBottom: 32,
		},
		privacyNoteText: {
			flex: 1,
			fontSize: 12,
			color: theme.textMuted,
			lineHeight: 16,
		},
	});
