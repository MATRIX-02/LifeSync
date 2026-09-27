/**
 * Tells the user when their changes haven't reached the server yet.
 *
 * The whole point of the offline queue is that a write is never lost silently.
 * That guarantee is only worth anything if the user can see the difference
 * between "saved" and "saved on this device, waiting to go up".
 *
 * Mounted once in the root layout; renders nothing when there's nothing to say.
 */

import { useColors } from "@/src/context/themeContext";
import {
	clearFailedCount,
	getQueueState,
	QueueChange,
	QueueState,
	subscribe,
} from "@/src/services/writeQueue";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

export const SyncStatusBanner: React.FC = () => {
	const theme = useColors();
	const [queue, setQueue] = useState<QueueState>(getQueueState());

	useEffect(() => subscribe(setQueue), []);

	const hasPending = queue.pending > 0;
	const hasFailed = queue.failed > 0;

	if (!hasPending && !hasFailed) return null;

	const styles = createStyles(theme);
	const changes: { change: QueueChange; status: "failed" | "pending" }[] = [
		...queue.failedDetails.map((change) => ({
			change,
			status: "failed" as const,
		})),
		...queue.pendingDetails.map((change) => ({
			change,
			status: "pending" as const,
		})),
	];

	return (
		<View
			style={[
				styles.banner,
				hasFailed ? styles.bannerError : styles.bannerPending,
			]}
		>
			<View style={styles.bannerHeader}>
				{queue.flushing && !hasFailed ? (
					<ActivityIndicator size="small" color="#FFF" />
				) : (
					<Ionicons
						name={hasFailed ? "alert-circle" : "cloud-offline-outline"}
						size={16}
						color="#FFF"
					/>
				)}
				<Text style={styles.text}>
					{hasFailed
						? `${queue.failed} change${queue.failed > 1 ? "s" : ""} need${queue.failed === 1 ? "s" : ""} attention${hasPending ? `; ${queue.pending} still syncing` : ""}`
						: queue.flushing
							? `Syncing ${queue.pending} change${queue.pending > 1 ? "s" : ""}…`
							: `${queue.pending} change${queue.pending > 1 ? "s" : ""} saved on this device, waiting for a connection`}
				</Text>
				{hasFailed && (
					<TouchableOpacity
						style={styles.dismissButton}
						onPress={clearFailedCount}
						accessibilityRole="button"
						accessibilityLabel="Dismiss save warning"
					>
						<Ionicons name="close" size={18} color="#FFF" />
					</TouchableOpacity>
				)}
			</View>
			{changes.length > 0 && (
				<View style={styles.changeList}>
					{changes.slice(0, 3).map(({ change, status }) => (
						<View key={change.id} style={styles.changeItem}>
							<View style={styles.changeHeading}>
								<Text style={styles.changeSummary} numberOfLines={1}>
									{change.summary}
								</Text>
								<Text style={styles.changeStatus}>
									{status === "failed" ? "Failed" : "Waiting"}
								</Text>
							</View>
							{change.fields.length > 0 && (
								<Text style={styles.changeFields} numberOfLines={1}>
									Fields: {change.fields.join(", ")}
								</Text>
							)}
							{change.error && (
								<Text style={styles.changeError} numberOfLines={2}>
									{change.error}
								</Text>
							)}
						</View>
					))}
					{changes.length > 3 && (
						<Text style={styles.moreChanges}>
							+{changes.length - 3} more changes
						</Text>
					)}
				</View>
			)}
		</View>
	);
};

const createStyles = (theme: any) =>
	StyleSheet.create({
		banner: {
			paddingHorizontal: 14,
			paddingVertical: 10,
		},
		bannerHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		bannerPending: {
			backgroundColor: theme.warning,
		},
		bannerError: {
			backgroundColor: theme.error,
		},
		text: {
			flex: 1,
			color: "#FFF",
			fontSize: 12.5,
			fontWeight: "600",
		},
		dismissButton: {
			width: 28,
			height: 28,
			alignItems: "center",
			justifyContent: "center",
		},
		changeList: {
			marginTop: 6,
			marginLeft: 24,
			gap: 5,
		},
		changeItem: {
			paddingTop: 5,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: "rgba(255,255,255,0.3)",
		},
		changeHeading: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		changeSummary: {
			flex: 1,
			color: "#FFF",
			fontSize: 12,
			fontWeight: "700",
		},
		changeStatus: {
			color: "rgba(255,255,255,0.85)",
			fontSize: 10,
			fontWeight: "700",
			textTransform: "uppercase",
		},
		changeFields: {
			color: "rgba(255,255,255,0.9)",
			fontSize: 11,
			marginTop: 2,
		},
		changeError: {
			color: "#FFF",
			fontSize: 11,
			marginTop: 2,
		},
		moreChanges: {
			color: "#FFF",
			fontSize: 11,
			fontWeight: "600",
		},
	});

export default SyncStatusBanner;
