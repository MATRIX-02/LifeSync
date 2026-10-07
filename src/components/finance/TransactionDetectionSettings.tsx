// Auto-detect transactions: permissions, on/off, linked account digits.
// Opened from Settings → Finance. How detection works: see
// src/services/transactionDetection/notificationListener.ts.

import { Alert } from "@/src/components/CustomAlert";
import { useFinanceStore } from "@/src/context/financeStoreDB";
import { Theme } from "@/src/context/themeContext";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import {
	getAccountLinks,
	unlinkDigits,
} from "@/src/services/transactionDetection/accountLinks";
import {
	clearSeen,
	DETECTION_TEST_TITLE,
	listSeen,
	SeenAlert,
	SeenOutcome,
	testReceivedSince,
} from "@/src/services/transactionDetection/detectionQueue";
import { NotificationService } from "@/src/services/notificationService";
import * as Notifications from "expo-notifications";

const TEST_TIMEOUT_MS = 10000;
const ACCESS_HELP =
	"• Turn Notification access off and on again for LifeSync.\n" +
	"• If the switch is greyed out or says \"Restricted setting\": long-press the LifeSync icon → App info → ⋮ → Allow restricted settings, then try again.\n" +
	"• App info → Battery → No restrictions (Unrestricted). On Xiaomi, Oppo, Vivo and Realme also turn on Autostart.";

const OUTCOME_LABEL: Record<SeenOutcome, string> = {
	queued: "Offered to you",
	duplicate: "Already seen (same payment)",
	not_payment: "Not a completed payment",
	hidden: "Hidden by Android - checking bank SMS instead",
	from_sms: "Found in bank SMS · offered to you",
	disabled: "Detection was off",
};

const ADB_UNHIDE = "adb shell appops set com.matrix122001.HabitTrackerApp RECEIVE_SENSITIVE_NOTIFICATIONS allow";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	AppState,
	Linking,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface Props {
	visible: boolean;
	onClose: () => void;
	theme: Theme;
}

export default function TransactionDetectionSettings({ visible, onClose, theme }: Props) {
	const styles = createStyles(theme);
	const { accounts } = useFinanceStore();
	const {
		settings,
		notificationAccess,
		smsAccess,
		pendingTransactions,
		refresh,
		setEnabled,
		setNotify,
		requestNotificationAccess,
		requestSmsAccess,
		scanRecentSms,
		clearPending,
	} = useTransactionDetectionStore();

	const [links, setLinks] = useState<Record<string, string>>({});
	const [seen, setSeen] = useState<SeenAlert[]>([]);
	const [scanning, setScanning] = useState(false);
	const [testing, setTesting] = useState(false);

	/**
	 * Posts a probe notification and waits for the background listener to
	 * report it - the only way to know the whole chain works on this phone
	 * (access granted, service bound, not killed by the battery manager).
	 */
	const runDetectionTest = async () => {
		if (!notificationAccess) {
			Alert.alert(
				"Notification access is off",
				`Tap "Allow" next to Notification access and switch LifeSync on.\n\n${ACCESS_HELP}`,
			);
			return;
		}
		const perm = await Notifications.getPermissionsAsync();
		if (!perm.granted && !(await Notifications.requestPermissionsAsync()).granted) {
			Alert.alert(
				"Allow notifications",
				"LifeSync needs permission to show notifications to run the test (and to ask you about detected payments).",
			);
			return;
		}

		setTesting(true);
		const started = Date.now();
		let received = false;
		try {
			await NotificationService.postDetectionTest(DETECTION_TEST_TITLE);
			while (Date.now() - started < TEST_TIMEOUT_MS) {
				await new Promise((r) => setTimeout(r, 500));
				if (await testReceivedSince(started)) {
					received = true;
					break;
				}
			}
		} finally {
			await NotificationService.dismissDetectionTest();
			setTesting(false);
		}

		if (received) {
			Alert.success(
				"Detection is working",
				settings.enabled
					? "LifeSync received the test notification. Payment alerts from your bank SMS and UPI apps will be picked up, even when the app is closed."
					: "LifeSync can see notifications. Switch on \"Detect payments\" above to start getting payments offered.",
			);
		} else {
			Alert.alert(
				"LifeSync didn't receive it",
				`Android isn't passing notifications to LifeSync right now. Try:\n\n${ACCESS_HELP}\n\nThen run the test again.`,
			);
		}
	};

	const reload = useCallback(async () => {
		await refresh();
		setLinks(await getAccountLinks());
		setSeen(await listSeen());
	}, [refresh]);

	// Re-check when opened and when returning from Android's settings page.
	useEffect(() => {
		if (!visible) return;
		void reload();
		const sub = AppState.addEventListener("change", (s) => {
			if (s === "active") void reload();
		});
		return () => sub.remove();
	}, [visible, reload]);

	if (Platform.OS !== "android") {
		return (
			<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
				<View style={[styles.container, styles.center]}>
					<Text style={styles.body}>
						Automatic payment detection is only available on Android.
					</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={onClose}>
						<Text style={styles.primaryButtonText}>Close</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		);
	}

	const toggleEnabled = async (on: boolean) => {
		if (on && !notificationAccess && !smsAccess) {
			Alert.alert(
				"Allow access first",
				"LifeSync needs Notification access (recommended) or SMS access to see payment alerts.",
			);
			return;
		}
		await setEnabled(on);
	};

	const scanNow = async () => {
		setScanning(true);
		const added = await scanRecentSms(true);
		setScanning(false);
		Alert.alert(
			added ? "Found payments" : "Nothing new",
			added
				? `${added} payment${added > 1 ? "s" : ""} from the last 48 hours ${added > 1 ? "are" : "is"} waiting for review in Money Hub.`
				: "No new bank payments in your SMS from the last 48 hours.",
		);
	};

	const accountName = (id: string) =>
		accounts.find((a) => a.id === id)?.name ?? "Deleted account";

	// Digits on accounts (database) win; on-phone links show only for digits
	// no account lists - the same order the matcher uses.
	const linkedRows: { digits: string; accountId: string; onAccount: boolean }[] = [
		...accounts.flatMap((a) =>
			(a.linkedDigits ?? []).map((digits) => ({
				digits,
				accountId: a.id,
				onAccount: true,
			})),
		),
	];
	for (const [digits, accountId] of Object.entries(links)) {
		if (!linkedRows.some((r) => r.digits === digits)) {
			linkedRows.push({ digits, accountId, onAccount: false });
		}
	}

	const AccessRow = ({
		icon,
		title,
		description,
		granted,
		onGrant,
	}: {
		icon: string;
		title: string;
		description: string;
		granted: boolean;
		onGrant: () => void;
	}) => (
		<View style={styles.row}>
			<View style={[styles.rowIcon, { backgroundColor: theme.primary + "20" }]}>
				<Ionicons name={icon as any} size={18} color={theme.primary} />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={styles.rowName}>{title}</Text>
				<Text style={styles.rowDesc}>{description}</Text>
			</View>
			{granted ? (
				<View style={styles.grantedPill}>
					<Ionicons name="checkmark" size={14} color={theme.success} />
					<Text style={[styles.pillText, { color: theme.success }]}>Allowed</Text>
				</View>
			) : (
				<TouchableOpacity style={styles.grantButton} onPress={onGrant}>
					<Text style={[styles.grantText, { color: "#FFF" }]}>Allow</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={26} color={theme.text} />
					</TouchableOpacity>
					<Text style={styles.title}>Auto-detect Payments</Text>
					<View style={{ width: 26 }} />
				</View>

				<ScrollView contentContainerStyle={styles.content}>
					<Text style={styles.intro}>
						When you pay or get paid, LifeSync reads the alert from your bank
						SMS or UPI app and asks if you want to add it - even when the app
						is closed. Nothing is saved until you confirm.
					</Text>

					<View style={styles.card}>
						<View style={styles.row}>
							<View style={[styles.rowIcon, { backgroundColor: theme.success + "20" }]}>
								<Ionicons name="flash" size={18} color={theme.success} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.rowName}>Detect payments</Text>
								<Text style={styles.rowDesc}>
									{settings.enabled ? "On" : "Off"}
									{settings.enabled && pendingTransactions.length > 0
										? ` · ${pendingTransactions.length} waiting for review`
										: ""}
								</Text>
							</View>
							<Switch
								value={settings.enabled}
								onValueChange={(v) => void toggleEnabled(v)}
								trackColor={{ true: theme.primary }}
							/>
						</View>
					</View>

					<Text style={styles.sectionLabel}>ACCESS</Text>
					<View style={styles.card}>
						<AccessRow
							icon="notifications"
							title="Notification access"
							description="Live detection from bank SMS, UPI apps and bank apps, even with LifeSync closed"
							granted={notificationAccess}
							onGrant={() => void requestNotificationAccess()}
						/>
						<View style={styles.divider} />
						<AccessRow
							icon="chatbubbles"
							title="SMS access"
							description="Catches up on bank SMS you missed (phone off, alert swiped away)"
							granted={smsAccess}
							onGrant={() => void requestSmsAccess()}
						/>
					</View>
					{!notificationAccess && (
						<Text style={styles.hint}>
							Tap Allow, find LifeSync in the list and switch it on. Android may
							warn that the app can read notifications - LifeSync only looks
							for payment alerts and keeps them on your phone.
						</Text>
					)}

					<Text style={styles.sectionLabel}>OPTIONS</Text>
					<View style={styles.card}>
						<View style={styles.row}>
							<View style={[styles.rowIcon, { backgroundColor: theme.accent + "20" }]}>
								<Ionicons name="chatbox" size={18} color={theme.accent} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.rowName}>Ask with a notification</Text>
								<Text style={styles.rowDesc}>
									"₹250 spent at Swiggy · Tap to add". Off: payments only wait
									in Money Hub.
								</Text>
							</View>
							<Switch
								value={settings.notify}
								onValueChange={(v) => void setNotify(v)}
								trackColor={{ true: theme.primary }}
							/>
						</View>
						<View style={styles.divider} />
						<TouchableOpacity
							style={styles.row}
							onPress={scanNow}
							disabled={scanning || !smsAccess || !settings.enabled}
						>
							<View style={[styles.rowIcon, { backgroundColor: theme.primary + "20" }]}>
								{scanning ? (
									<ActivityIndicator size="small" color={theme.primary} />
								) : (
									<Ionicons name="refresh" size={18} color={theme.primary} />
								)}
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={[
										styles.rowName,
										(!smsAccess || !settings.enabled) && { color: theme.textMuted },
									]}
								>
									Scan SMS now
								</Text>
								<Text style={styles.rowDesc}>Check the last 48 hours of bank SMS</Text>
							</View>
						</TouchableOpacity>
						<View style={styles.divider} />
						<TouchableOpacity style={styles.row} onPress={runDetectionTest} disabled={testing}>
							<View style={[styles.rowIcon, { backgroundColor: theme.success + "20" }]}>
								{testing ? (
									<ActivityIndicator size="small" color={theme.success} />
								) : (
									<Ionicons name="pulse" size={18} color={theme.success} />
								)}
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.rowName}>
									{testing ? "Testing…" : "Test detection"}
								</Text>
								<Text style={styles.rowDesc}>
									Checks that LifeSync can see notifications on this phone
								</Text>
							</View>
						</TouchableOpacity>
						{pendingTransactions.length > 0 && (
							<>
								<View style={styles.divider} />
								<TouchableOpacity
									style={styles.row}
									onPress={() =>
										Alert.alert(
											"Ignore all?",
											`Ignore all ${pendingTransactions.length} detected payments? They won't be added or shown again.`,
											[
												{ text: "Cancel", style: "cancel" },
												{
													text: "Ignore all",
													style: "destructive",
													onPress: () => void clearPending(),
												},
											],
										)
									}
								>
									<View style={[styles.rowIcon, { backgroundColor: theme.error + "20" }]}>
										<Ionicons name="trash" size={18} color={theme.error} />
									</View>
									<Text style={[styles.rowName, { color: theme.error }]}>
										Ignore all waiting ({pendingTransactions.length})
									</Text>
								</TouchableOpacity>
							</>
						)}
					</View>

					<Text style={styles.sectionLabel}>LINKED CARDS & ACCOUNTS</Text>
					<View style={styles.card}>
						{linkedRows.length === 0 ? (
							<Text style={[styles.rowDesc, { padding: 14 }]}>
								None yet. Add the last 4 digits of your account or card in
								Money Hub → edit account ("Card / account ending in"), or tick
								"Always use this account" when adding a detected payment.
							</Text>
						) : (
							linkedRows.map((row, i) => (
								<View key={row.digits}>
									{i > 0 && <View style={styles.divider} />}
									<View style={styles.row}>
										<View style={[styles.rowIcon, { backgroundColor: theme.primary + "20" }]}>
											<Ionicons name="card" size={18} color={theme.primary} />
										</View>
										<View style={{ flex: 1 }}>
											<Text style={styles.rowName}>
												••{row.digits} → {accountName(row.accountId)}
											</Text>
											<Text style={styles.rowDesc}>
												{row.onAccount
													? "Saved on the account · syncs"
													: "Saved on this phone only"}
											</Text>
										</View>
										{!row.onAccount && (
											<TouchableOpacity
												onPress={async () => {
													await unlinkDigits(row.digits);
													setLinks(await getAccountLinks());
												}}
											>
												<Text style={[styles.grantText, { color: theme.error }]}>
													Unlink
												</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>
							))
						)}
					</View>
					{linkedRows.some((r) => r.onAccount) && (
						<Text style={styles.hint}>
							To change digits saved on an account, edit the account in Money Hub.
						</Text>
					)}

					{seen.some((s) => s.outcome === "hidden") && (
						<View style={[styles.card, styles.warnCard]}>
							<View style={[styles.row, { alignItems: "flex-start" }]}>
								<Ionicons name="eye-off" size={20} color={theme.warning} />
								<View style={{ flex: 1 }}>
									<Text style={styles.rowName}>Android is hiding payment alerts</Text>
									<Text style={styles.rowDesc}>
										Your phone shows the full text, but Android 15+ hides
										"sensitive" notifications (like some Paytm alerts) from other
										apps. LifeSync falls back to the bank SMS for these, which works
										if your bank texts you for the payment.{"\n\n"}To let LifeSync
										read them directly, do one of these:{"\n"}• Settings →
										Notifications → turn off "Enhanced notifications" (if your
										phone has it).{"\n"}• Or, from a computer with the phone
										connected (USB debugging on), run once:
									</Text>
									<Text selectable style={styles.code}>
										{ADB_UNHIDE}
									</Text>
									<TouchableOpacity
										onPress={() =>
											Linking.sendIntent("android.settings.NOTIFICATION_SETTINGS").catch(
												() => Linking.openSettings(),
											)
										}
									>
										<Text style={[styles.grantText, { marginTop: 8 }]}>
											Open notification settings
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}

					<View style={styles.sectionHeader}>
						<Text style={styles.sectionLabel}>RECENT ALERTS SEEN</Text>
						<View style={{ flexDirection: "row", gap: 16 }}>
							<TouchableOpacity onPress={() => void reload()}>
								<Text style={styles.grantText}>Refresh</Text>
							</TouchableOpacity>
							{seen.length > 0 && (
								<TouchableOpacity
									onPress={async () => {
										await clearSeen();
										setSeen([]);
									}}
								>
									<Text style={[styles.grantText, { color: theme.textMuted }]}>
										Clear
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
					<View style={styles.card}>
						{seen.length === 0 ? (
							<Text style={[styles.rowDesc, { padding: 14 }]}>
								Nothing yet. Payment alerts from UPI apps, bank apps and SMS
								appear here as LifeSync receives them. If you've just made a UPI
								payment and nothing shows up, LifeSync isn't receiving
								notifications - check that Notification access is Allowed above
								and see the battery tip below.
							</Text>
						) : (
							seen.map((s, i) => (
								<View key={`${s.time}-${i}`}>
									{i > 0 && <View style={styles.divider} />}
									<View style={[styles.row, { alignItems: "flex-start" }]}>
										<View
											style={[
												styles.outcomeDot,
												{
													backgroundColor:
														s.outcome === "queued" || s.outcome === "from_sms"
															? theme.success
															: s.outcome === "duplicate"
																? theme.primary
																: theme.warning,
												},
											]}
										/>
										<View style={{ flex: 1 }}>
											<Text style={styles.rowName} numberOfLines={1}>
												{s.app} ·{" "}
												{new Date(s.time).toLocaleString(undefined, {
													day: "numeric",
													month: "short",
													hour: "numeric",
													minute: "2-digit",
												})}
											</Text>
											<Text style={styles.rowDesc} numberOfLines={3}>
												{[s.title, s.text].filter(Boolean).join(" - ") ||
													"(no readable text - this app may use a custom notification layout)"}
											</Text>
											<Text style={[styles.rowDesc, { fontWeight: "700" }]}>
												{OUTCOME_LABEL[s.outcome]}
												{s.summary ? ` · ${s.summary}` : ""}
											</Text>
										</View>
									</View>
								</View>
							))
						)}
					</View>

					<Text style={styles.hint}>
						Some phones stop background apps to save battery. If alerts stop
						arriving, set LifeSync's battery usage to "Unrestricted" (on Xiaomi,
						Oppo, Vivo and Realme also turn on "Autostart").
					</Text>
					<TouchableOpacity onPress={() => Linking.openSettings()}>
						<Text style={[styles.grantText, { marginTop: 8 }]}>Open app settings</Text>
					</TouchableOpacity>
				</ScrollView>
			</View>
		</Modal>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: theme.background },
		center: { justifyContent: "center", alignItems: "center", padding: 24 },
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingTop: 48,
			paddingBottom: 12,
		},
		title: { fontSize: 18, fontWeight: "700", color: theme.text },
		content: { padding: 16, paddingBottom: 48 },
		intro: {
			fontSize: 14,
			lineHeight: 20,
			color: theme.textSecondary,
			marginBottom: 16,
		},
		body: { fontSize: 15, color: theme.text, textAlign: "center" },
		sectionLabel: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.textMuted,
			marginBottom: 8,
			marginLeft: 4,
		},
		card: {
			backgroundColor: theme.surface,
			borderRadius: 16,
			marginBottom: 20,
			overflow: "hidden",
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			gap: 12,
		},
		rowIcon: {
			width: 34,
			height: 34,
			borderRadius: 10,
			justifyContent: "center",
			alignItems: "center",
		},
		rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.text },
		rowDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 17 },
		divider: { height: 1, backgroundColor: theme.border, marginLeft: 60 },
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginRight: 4,
		},
		warnCard: { borderWidth: 1, borderColor: theme.warning + "60" },
		code: {
			marginTop: 8,
			padding: 10,
			borderRadius: 8,
			fontSize: 11,
			lineHeight: 16,
			color: theme.text,
			backgroundColor: theme.background,
			fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
		},
		outcomeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginHorizontal: 12 },
		grantedPill: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
			backgroundColor: theme.success + "15",
		},
		pillText: { fontSize: 12, fontWeight: "700" },
		grantButton: {
			paddingHorizontal: 14,
			paddingVertical: 6,
			borderRadius: 12,
			backgroundColor: theme.primary,
		},
		grantText: { fontSize: 13, fontWeight: "700", color: theme.primary },
		hint: { fontSize: 12, color: theme.textMuted, lineHeight: 18, marginTop: -8, marginBottom: 16 },
		primaryButton: {
			backgroundColor: theme.primary,
			borderRadius: 14,
			paddingVertical: 14,
			paddingHorizontal: 32,
			alignItems: "center",
			marginTop: 24,
		},
		primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
	});
