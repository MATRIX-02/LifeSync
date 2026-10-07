// Money Hub strip for auto-detected payments:
//   - "N payments to review" banner -> review sheet, one after another
//   - opens straight onto a payment when launched from its notification
//   - one-time nudge to turn detection on
// Detection pipeline: src/services/transactionDetection/.

import TransactionDetectionSettings from "@/src/components/finance/TransactionDetectionSettings";
import { TransactionPrompt } from "@/src/components/finance/TransactionPrompt";
import { Theme } from "@/src/context/themeContext";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NUDGE_DISMISSED_KEY = "detected_txn_nudge_dismissed";

interface Props {
	theme: Theme;
	currency: string;
	hasAccounts: boolean;
}

export default function DetectedTransactions({ theme, currency, hasAccounts }: Props) {
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { pendingTransactions, settings, focusId, setFocusId, refresh } =
		useTransactionDetectionStore();

	const [reviewingId, setReviewingId] = useState<string | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [nudgeDismissed, setNudgeDismissed] = useState(true);

	useEffect(() => {
		if (Platform.OS !== "android") return;
		void refresh();
		AsyncStorage.getItem(NUDGE_DISMISSED_KEY)
			.then((v) => setNudgeDismissed(v === "true"))
			.catch(() => setNudgeDismissed(false));
	}, [refresh]);

	// Launched from a "Tap to add" notification. focusId stays set until the
	// user closes, adds or ignores - on a cold start this screen can mount,
	// then remount when navigation is restored, and the sheet must reopen.
	useEffect(() => {
		if (focusId && pendingTransactions.some((t) => t.id === focusId)) {
			setReviewingId(focusId);
		}
	}, [focusId, pendingTransactions]);

	if (Platform.OS !== "android") return null;

	const reviewing = pendingTransactions.find((t) => t.id === reviewingId) ?? null;
	// After adding/ignoring one, move on to the next waiting payment.
	const next = (doneId: string) => {
		const rest = pendingTransactions.filter((t) => t.id !== doneId);
		setFocusId(null);
		setReviewingId(rest[0]?.id ?? null);
	};
	const close = () => {
		setFocusId(null);
		setReviewingId(null);
	};

	const total = pendingTransactions.reduce(
		(sum, t) => sum + (t.type === "income" ? 0 : t.amount),
		0,
	);
	const showNudge = !settings.enabled && hasAccounts && !nudgeDismissed;

	return (
		<>
			{pendingTransactions.length > 0 && (
				<TouchableOpacity
					style={styles.banner}
					activeOpacity={0.8}
					onPress={() => setReviewingId(pendingTransactions[0].id)}
				>
					<View style={styles.bannerIcon}>
						<Ionicons name="flash" size={18} color="#FFF" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.bannerTitle}>
							{pendingTransactions.length} detected payment
							{pendingTransactions.length > 1 ? "s" : ""} to review
						</Text>
						{total > 0 && (
							<Text style={styles.bannerSub}>
								{currency}
								{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent ·
								tap to add
							</Text>
						)}
					</View>
					<Ionicons name="chevron-forward" size={20} color={theme.primary} />
				</TouchableOpacity>
			)}

			{showNudge && (
				<View style={styles.nudge}>
					<Ionicons name="sparkles" size={20} color={theme.primary} />
					<View style={{ flex: 1 }}>
						<Text style={styles.bannerTitle}>Track payments automatically</Text>
						<Text style={styles.bannerSub}>
							LifeSync can spot payments from your bank SMS and UPI apps and
							ask to add them.
						</Text>
						<View style={styles.nudgeActions}>
							<TouchableOpacity onPress={() => setShowSettings(true)}>
								<Text style={styles.nudgePrimary}>Set up</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									setNudgeDismissed(true);
									void AsyncStorage.setItem(NUDGE_DISMISSED_KEY, "true");
								}}
							>
								<Text style={styles.nudgeSecondary}>Not now</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}

			<TransactionPrompt
				visible={!!reviewing}
				transaction={reviewing}
				currency={currency}
				onClose={close}
				onAdd={() => reviewing && next(reviewing.id)}
			/>

			<TransactionDetectionSettings
				visible={showSettings}
				onClose={() => setShowSettings(false)}
				theme={theme}
			/>
		</>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		banner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			marginHorizontal: 16,
			marginBottom: 8,
			padding: 12,
			borderRadius: 14,
			backgroundColor: theme.primary + "15",
			borderWidth: 1,
			borderColor: theme.primary + "40",
		},
		bannerIcon: {
			width: 34,
			height: 34,
			borderRadius: 17,
			backgroundColor: theme.primary,
			alignItems: "center",
			justifyContent: "center",
		},
		bannerTitle: { fontSize: 14, fontWeight: "700", color: theme.text },
		bannerSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
		nudge: {
			flexDirection: "row",
			gap: 12,
			marginHorizontal: 16,
			marginBottom: 8,
			padding: 14,
			borderRadius: 14,
			backgroundColor: theme.surface,
		},
		nudgeActions: { flexDirection: "row", gap: 20, marginTop: 10 },
		nudgePrimary: { fontSize: 14, fontWeight: "700", color: theme.primary },
		nudgeSecondary: { fontSize: 14, fontWeight: "600", color: theme.textMuted },
	});
