// Shared AI insights screen: range picker, caching and result rendering.

import { Theme } from "@/src/context/themeContext";
import {
	DateWindow,
	DeepAnalysis,
	DeepAnalysisResult,
	InsightRange,
	RANGE_LABELS,
	resolveDateWindow,
	toISODate,
} from "@/src/services/insights/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import DeepAnalysisView from "./DeepAnalysisView";

const RANGES: InsightRange[] = ["last_30", "last_90", "this_year", "custom"];

interface CachedInsight {
	analysis: DeepAnalysis;
	generatedAt: string;
}

interface Props {
	theme: Theme;
	/** Distinguishes this module's cached results, e.g. "finance". */
	cacheNamespace: string;
	emptyPrompt: string;
	generateLabel: string;
	scoreLabel: string;
	breakdownTitle: string;
	breakdownShareSuffix: string;
	formatValue: (value: number) => string;
	run: (
		range: InsightRange,
		customWindow: DateWindow,
	) => Promise<DeepAnalysisResult>;
}

function formatTimestamp(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDay(isoDate: string): string {
	const d = new Date(isoDate);
	if (Number.isNaN(d.getTime())) return isoDate;
	return d.toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export default function InsightsScreen({
	theme,
	cacheNamespace,
	emptyPrompt,
	generateLabel,
	scoreLabel,
	breakdownTitle,
	breakdownShareSuffix,
	formatValue,
	run,
}: Props) {
	const styles = createStyles(theme);

	const [range, setRange] = useState<InsightRange>("last_30");
	const [customWindow, setCustomWindow] = useState<DateWindow>(() => {
		const today = new Date();
		const monthAgo = new Date();
		monthAgo.setDate(monthAgo.getDate() - 29);
		return { start: toISODate(monthAgo), end: toISODate(today) };
	});
	const [picker, setPicker] = useState<"start" | "end" | null>(null);

	const [insight, setInsight] = useState<CachedInsight | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRestoringCache, setIsRestoringCache] = useState(true);

	const isMounted = useRef(true);
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	const activeWindow = resolveDateWindow(range, customWindow);

	// Custom results are keyed by their dates so each window keeps its own result.
	const cacheKey =
		range === "custom"
			? `ai_insights_${cacheNamespace}_custom_${customWindow.start}_${customWindow.end}`
			: `ai_insights_${cacheNamespace}_${range}`;

	useEffect(() => {
		let cancelled = false;
		setIsRestoringCache(true);
		setError(null);

		(async () => {
			try {
				const raw = await AsyncStorage.getItem(cacheKey);
				if (!cancelled && isMounted.current) {
					setInsight(raw ? (JSON.parse(raw) as CachedInsight) : null);
				}
			} catch {
				if (!cancelled && isMounted.current) setInsight(null);
			} finally {
				if (!cancelled && isMounted.current) setIsRestoringCache(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [cacheKey]);

	const generate = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const result = await run(range, customWindow);
		if (!isMounted.current) return;

		if (result.ok) {
			const next = {
				analysis: result.analysis,
				generatedAt: result.generatedAt,
			};
			setInsight(next);
			AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => {});
		} else {
			setError(result.message);
		}

		setIsLoading(false);
	}, [cacheKey, range, customWindow, run]);

	const onPickDate = (selected?: Date) => {
		const which = picker;
		setPicker(null);
		if (!selected || !which) return;

		const iso = toISODate(selected);
		setCustomWindow((prev) => {
			if (which === "start") {
				return { start: iso, end: iso > prev.end ? iso : prev.end };
			}
			return { start: iso < prev.start ? iso : prev.start, end: iso };
		});
	};

	const isBusy = isRestoringCache || isLoading;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.headerCard}>
				<View style={styles.headerIcon}>
					<Ionicons name="sparkles" size={20} color={theme.primary} />
				</View>
				<View style={styles.headerTextGroup}>
					<Text style={styles.headerTitle}>AI Insights</Text>
					<Text style={styles.headerSubtitle}>
						{formatDay(activeWindow.start)} – {formatDay(activeWindow.end)}
					</Text>
				</View>
			</View>

			<View style={styles.rangeWrap}>
				{RANGES.map((r) => {
					const isActive = r === range;
					return (
						<TouchableOpacity
							key={r}
							style={[styles.rangeChip, isActive && styles.rangeChipActive]}
							onPress={() => setRange(r)}
							disabled={isLoading}
						>
							<Text
								style={[
									styles.rangeChipText,
									isActive && styles.rangeChipTextActive,
								]}
							>
								{RANGE_LABELS[r]}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{range === "custom" && (
				<View style={styles.customRow}>
					<TouchableOpacity
						style={styles.dateButton}
						onPress={() => setPicker("start")}
						disabled={isLoading}
					>
						<Ionicons
							name="calendar-outline"
							size={14}
							color={theme.textSecondary}
						/>
						<Text style={styles.dateButtonText}>
							{formatDay(customWindow.start)}
						</Text>
					</TouchableOpacity>
					<Text style={styles.dateSeparator}>to</Text>
					<TouchableOpacity
						style={styles.dateButton}
						onPress={() => setPicker("end")}
						disabled={isLoading}
					>
						<Ionicons
							name="calendar-outline"
							size={14}
							color={theme.textSecondary}
						/>
						<Text style={styles.dateButtonText}>
							{formatDay(customWindow.end)}
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{picker && (
				<DateTimePicker
					value={
						new Date(picker === "start" ? customWindow.start : customWindow.end)
					}
					mode="date"
					display={Platform.OS === "ios" ? "spinner" : "default"}
					maximumDate={new Date()}
					onChange={(event, selected) => {
						if (event.type === "dismissed") {
							setPicker(null);
							return;
						}
						onPickDate(selected);
					}}
				/>
			)}

			{isRestoringCache && (
				<View style={styles.stateCard}>
					<ActivityIndicator color={theme.primary} />
				</View>
			)}

			{!isRestoringCache && isLoading && (
				<View style={styles.stateCard}>
					<ActivityIndicator color={theme.primary} />
					<Text style={styles.stateText}>Analysing — this takes a moment…</Text>
				</View>
			)}

			{!isBusy && error && (
				<View style={styles.stateCard}>
					<Ionicons name="alert-circle" size={28} color={theme.error} />
					<Text style={styles.stateText}>{error}</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={generate}>
						<Ionicons name="refresh" size={16} color="#fff" />
						<Text style={styles.primaryButtonText}>Try Again</Text>
					</TouchableOpacity>
				</View>
			)}

			{!isBusy && !error && !insight && (
				<View style={styles.stateCard}>
					<Ionicons name="bulb-outline" size={32} color={theme.textSecondary} />
					<Text style={styles.stateText}>{emptyPrompt}</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={generate}>
						<Ionicons name="sparkles" size={16} color="#fff" />
						<Text style={styles.primaryButtonText}>{generateLabel}</Text>
					</TouchableOpacity>
				</View>
			)}

			{!isBusy && !error && insight && (
				<View>
					<DeepAnalysisView
						analysis={insight.analysis}
						theme={theme}
						formatValue={formatValue}
						scoreLabel={scoreLabel}
						breakdownTitle={breakdownTitle}
						breakdownShareSuffix={breakdownShareSuffix}
					/>
					<View style={styles.footerRow}>
						<Text style={styles.timestamp}>
							Updated {formatTimestamp(insight.generatedAt)}
						</Text>
						<TouchableOpacity style={styles.refreshButton} onPress={generate}>
							<Ionicons name="refresh" size={14} color={theme.primary} />
							<Text style={styles.refreshButtonText}>Refresh</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}

			<Text style={styles.disclaimer}>
				Generated by AI from your own data. Treat it as a prompt to review your
				progress, not as professional advice.
			</Text>
		</ScrollView>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		contentContainer: {
			padding: 16,
			paddingBottom: 32,
		},
		headerCard: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 14,
		},
		headerIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.primary + "20",
			marginRight: 12,
		},
		headerTextGroup: {
			flex: 1,
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: theme.text,
		},
		headerSubtitle: {
			fontSize: 13,
			color: theme.textSecondary,
			marginTop: 2,
		},
		rangeWrap: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginBottom: 12,
		},
		rangeChip: {
			paddingVertical: 7,
			paddingHorizontal: 12,
			borderRadius: 20,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		rangeChipActive: {
			backgroundColor: theme.primary,
			borderColor: theme.primary,
		},
		rangeChipText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textSecondary,
		},
		rangeChipTextActive: {
			color: "#fff",
		},
		customRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 14,
		},
		dateButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 9,
			borderRadius: 10,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		dateButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.text,
		},
		dateSeparator: {
			fontSize: 12,
			color: theme.textMuted,
		},
		stateCard: {
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 24,
			gap: 12,
		},
		stateText: {
			fontSize: 14,
			color: theme.textSecondary,
			textAlign: "center",
			lineHeight: 20,
		},
		primaryButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.primary,
			paddingHorizontal: 18,
			paddingVertical: 10,
			borderRadius: 24,
			marginTop: 4,
		},
		primaryButtonText: {
			color: "#fff",
			fontSize: 14,
			fontWeight: "600",
		},
		footerRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			borderTopWidth: 1,
			borderTopColor: theme.border,
			paddingTop: 12,
			marginTop: 4,
		},
		timestamp: {
			fontSize: 12,
			color: theme.textMuted,
		},
		refreshButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 6,
			paddingHorizontal: 10,
			borderRadius: 16,
			backgroundColor: theme.primary + "15",
		},
		refreshButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.primary,
		},
		disclaimer: {
			fontSize: 11,
			color: theme.textMuted,
			textAlign: "center",
			lineHeight: 16,
			marginTop: 16,
		},
	});
