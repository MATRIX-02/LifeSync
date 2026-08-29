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
	QueueState,
	subscribe,
} from "@/src/services/writeQueue";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const SyncStatusBanner: React.FC = () => {
	const theme = useColors();
	const [queue, setQueue] = useState<QueueState>(getQueueState());

	useEffect(() => subscribe(setQueue), []);

	const hasPending = queue.pending > 0;
	const hasFailed = queue.failed > 0;

	if (!hasPending && !hasFailed) return null;

	const styles = createStyles(theme);

	// Rejected writes are the more serious message, so they win the banner.
	if (hasFailed && !hasPending) {
		return (
			<TouchableOpacity
				style={[styles.banner, styles.bannerError]}
				onPress={clearFailedCount}
				activeOpacity={0.8}
			>
				<Ionicons name="alert-circle" size={16} color="#FFF" />
				<Text style={styles.text}>
					{queue.failed} change{queue.failed > 1 ? "s" : ""} couldn&apos;t be
					saved. Tap to dismiss.
				</Text>
			</TouchableOpacity>
		);
	}

	return (
		<View style={[styles.banner, styles.bannerPending]}>
			{queue.flushing ? (
				<ActivityIndicator size="small" color="#FFF" />
			) : (
				<Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
			)}
			<Text style={styles.text}>
				{queue.flushing
					? `Syncing ${queue.pending} change${queue.pending > 1 ? "s" : ""}…`
					: `${queue.pending} change${
							queue.pending > 1 ? "s" : ""
					  } saved on this device, waiting for a connection`}
			</Text>
		</View>
	);
};

const createStyles = (theme: any) =>
	StyleSheet.create({
		banner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 14,
			paddingVertical: 8,
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
	});

export default SyncStatusBanner;
