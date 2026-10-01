// Structured AI deep-dive renderer shared by every module's insights screen.

import { Theme } from "@/src/context/themeContext";
import {
	ActionItem,
	BreakdownVerdict,
	DeepAnalysis,
	DeepFinding,
	HeadlineMetric,
	Severity,
} from "@/src/services/insights/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
	analysis: DeepAnalysis;
	theme: Theme;
	/** Renders the numeric values on findings, breakdowns and actions. */
	formatValue: (value: number) => string;
	scoreLabel?: string;
	breakdownTitle?: string;
	breakdownShareSuffix?: string;
}

function severityColor(severity: Severity, theme: Theme): string {
	switch (severity) {
		case "critical":
			return theme.error;
		case "warning":
			return theme.warning;
		case "good":
			return theme.success;
		default:
			return theme.primary;
	}
}

function severityIcon(severity: Severity): keyof typeof Ionicons.glyphMap {
	switch (severity) {
		case "critical":
			return "alert-circle";
		case "warning":
			return "warning";
		case "good":
			return "checkmark-circle";
		default:
			return "information-circle";
	}
}

const ProgressRing = ({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
}: {
	progress: number;
	size: number;
	strokeWidth: number;
	color: string;
	backgroundColor: string;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const strokeDashoffset =
		circumference - (Math.min(progress, 100) / 100) * circumference;

	return (
		<Svg width={size} height={size}>
			<Circle
				stroke={backgroundColor}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
			/>
			<Circle
				stroke={color}
				fill="none"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				strokeDasharray={`${circumference} ${circumference}`}
				strokeDashoffset={strokeDashoffset}
				strokeLinecap="round"
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</Svg>
	);
};

function scoreColor(score: number, theme: Theme): string {
	if (score >= 75) return theme.success;
	if (score >= 50) return theme.warning;
	return theme.error;
}

function Section({
	title,
	icon,
	children,
	theme,
}: {
	title: string;
	icon: keyof typeof Ionicons.glyphMap;
	children: React.ReactNode;
	theme: Theme;
}) {
	const styles = createStyles(theme);
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Ionicons name={icon} size={16} color={theme.textSecondary} />
				<Text style={styles.sectionTitle}>{title}</Text>
			</View>
			{children}
		</View>
	);
}

export default function DeepAnalysisView({
	analysis,
	theme,
	formatValue,
	scoreLabel = "Health Score",
	breakdownTitle = "Breakdown",
	breakdownShareSuffix = "of total",
}: Props) {
	const styles = createStyles(theme);
	const scoreTint = scoreColor(analysis.healthScore, theme);
	const formatAmount = formatValue;

	return (
		<View>
			{/* Health score */}
			<View style={styles.scoreCard}>
				<View style={styles.scoreRingWrap}>
					<ProgressRing
						progress={analysis.healthScore}
						size={96}
						strokeWidth={9}
						color={scoreTint}
						backgroundColor={theme.border}
					/>
					<View style={styles.scoreRingCenter}>
						<Text style={[styles.scoreValue, { color: scoreTint }]}>
							{analysis.healthScore}
						</Text>
						<Text style={styles.scoreOutOf}>/100</Text>
					</View>
				</View>
				<View style={styles.scoreTextWrap}>
					<Text style={styles.scoreLabel}>{scoreLabel}</Text>
					<Text style={styles.headline}>{analysis.headline}</Text>
				</View>
			</View>

			{/* Score breakdown */}
			{analysis.scoreBreakdown.length > 0 && (
				<Section
					title="Score Breakdown"
					icon="speedometer-outline"
					theme={theme}
				>
					{analysis.scoreBreakdown.map((item, i) => (
						<View key={i} style={styles.breakdownRow}>
							<View style={styles.breakdownTop}>
								<Text style={styles.breakdownLabel}>{item.label}</Text>
								<Text
									style={[
										styles.breakdownScore,
										{ color: scoreColor(item.score, theme) },
									]}
								>
									{item.score}
								</Text>
							</View>
							<View style={styles.barTrack}>
								<View
									style={[
										styles.barFill,
										{
											width: `${item.score}%`,
											backgroundColor: scoreColor(item.score, theme),
										},
									]}
								/>
							</View>
							<Text style={styles.breakdownVerdict}>{item.verdict}</Text>
						</View>
					))}
				</Section>
			)}

			{/* Headline metrics */}
			{analysis.headlineMetrics.length > 0 && (
				<Section title="Key Numbers" icon="stats-chart-outline" theme={theme}>
					<View style={styles.metricGrid}>
						{analysis.headlineMetrics.map((m: HeadlineMetric, i) => (
							<View
								key={i}
								style={[
									styles.metricCard,
									{ borderLeftColor: severityColor(m.severity, theme) },
								]}
							>
								<Text style={styles.metricLabel}>{m.label}</Text>
								<Text style={styles.metricValue}>{m.value}</Text>
								<Text style={styles.metricCaption}>{m.caption}</Text>
							</View>
						))}
					</View>
				</Section>
			)}

			{/* Findings */}
			{analysis.findings.length > 0 && (
				<Section title="What Stood Out" icon="search-outline" theme={theme}>
					{analysis.findings.map((f: DeepFinding, i) => {
						const tint = severityColor(f.severity, theme);
						return (
							<View
								key={i}
								style={[styles.findingCard, { borderColor: tint + "40" }]}
							>
								<View style={styles.findingHeader}>
									<Ionicons
										name={severityIcon(f.severity)}
										size={16}
										color={tint}
									/>
									<Text style={styles.findingTitle}>{f.title}</Text>
									{f.impactAmount !== undefined && f.impactAmount > 0 && (
										<Text style={[styles.findingImpact, { color: tint }]}>
											{formatAmount(f.impactAmount)}
										</Text>
									)}
								</View>
								<Text style={styles.findingDetail}>{f.detail}</Text>
								{f.evidence.length > 0 && (
									<View style={styles.chipRow}>
										{f.evidence.map((e, j) => (
											<View key={j} style={styles.chip}>
												<Text style={styles.chipText}>{e}</Text>
											</View>
										))}
									</View>
								)}
							</View>
						);
					})}
				</Section>
			)}

			{/* Category verdicts */}
			{analysis.breakdowns.length > 0 && (
				<Section title={breakdownTitle} icon="pie-chart-outline" theme={theme}>
					{analysis.breakdowns.map((c: BreakdownVerdict, i: number) => {
						const tint = severityColor(c.severity, theme);
						return (
							<View key={i} style={styles.categoryRow}>
								<View style={styles.categoryTop}>
									<Text style={styles.categoryName}>{c.label}</Text>
									<Text style={styles.categoryAmount}>
										{formatAmount(c.value)}
									</Text>
								</View>
								<View style={styles.barTrack}>
									<View
										style={[
											styles.barFill,
											{
												width: `${Math.min(c.share, 100)}%`,
												backgroundColor: tint,
											},
										]}
									/>
								</View>
								<Text style={styles.categoryShare}>
									{c.share.toFixed(1)}% {breakdownShareSuffix}
								</Text>
								<Text style={styles.categoryVerdict}>{c.verdict}</Text>
								{c.namedItems.length > 0 && (
									<View style={styles.chipRow}>
										{c.namedItems.map((item: string, j: number) => (
											<View key={j} style={styles.chip}>
												<Text style={styles.chipText}>{item}</Text>
											</View>
										))}
									</View>
								)}
							</View>
						);
					})}
				</Section>
			)}

			{analysis.noteGroups
				.filter((g) => g.notes.length > 0)
				.map((group, gi) => (
					<Section
						key={gi}
						title={group.title}
						icon="bookmark-outline"
						theme={theme}
					>
						{group.notes.map((note: string, i: number) => (
							<View key={i} style={styles.noteRow}>
								<Ionicons
									name="ellipse"
									size={8}
									color={theme.primary}
									style={styles.noteIcon}
								/>
								<Text style={styles.noteText}>{note}</Text>
							</View>
						))}
					</Section>
				))}

			{/* Actions */}
			{analysis.actions.length > 0 && (
				<Section title="What To Do Next" icon="rocket-outline" theme={theme}>
					{analysis.actions.map((a: ActionItem, i) => {
						const priorityTint =
							a.priority === "high"
								? theme.error
								: a.priority === "medium"
									? theme.warning
									: theme.textSecondary;
						return (
							<View key={i} style={styles.actionCard}>
								<View style={styles.actionHeader}>
									<View
										style={[
											styles.priorityDot,
											{ backgroundColor: priorityTint },
										]}
									/>
									<Text style={styles.actionTitle}>{a.action}</Text>
								</View>
								<Text style={styles.actionReason}>{a.reason}</Text>
								{a.estimatedSaving !== undefined && a.estimatedSaving > 0 && (
									<Text style={styles.actionSaving}>
										Worth about {formatAmount(a.estimatedSaving)}
									</Text>
								)}
							</View>
						);
					})}
				</Section>
			)}
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		scoreCard: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 16,
			marginBottom: 16,
		},
		scoreRingWrap: {
			width: 96,
			height: 96,
			alignItems: "center",
			justifyContent: "center",
		},
		scoreRingCenter: {
			position: "absolute",
			alignItems: "center",
			justifyContent: "center",
			flexDirection: "row",
		},
		scoreValue: {
			fontSize: 26,
			fontWeight: "800",
		},
		scoreOutOf: {
			fontSize: 12,
			color: theme.textMuted,
			marginTop: 7,
		},
		scoreTextWrap: {
			flex: 1,
			marginLeft: 14,
		},
		scoreLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.textSecondary,
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: 4,
		},
		headline: {
			fontSize: 14,
			color: theme.text,
			lineHeight: 20,
		},
		section: {
			marginBottom: 20,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginBottom: 10,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: "700",
			color: theme.textSecondary,
			textTransform: "uppercase",
			letterSpacing: 0.6,
		},
		breakdownRow: {
			marginBottom: 14,
		},
		breakdownTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 6,
		},
		breakdownLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
		},
		breakdownScore: {
			fontSize: 13,
			fontWeight: "700",
		},
		breakdownVerdict: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 5,
			lineHeight: 17,
		},
		barTrack: {
			height: 6,
			borderRadius: 3,
			backgroundColor: theme.border,
			overflow: "hidden",
		},
		barFill: {
			height: 6,
			borderRadius: 3,
		},
		metricGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 10,
		},
		metricCard: {
			flexGrow: 1,
			flexBasis: "45%",
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			borderLeftWidth: 3,
			padding: 12,
		},
		metricLabel: {
			fontSize: 11,
			color: theme.textSecondary,
			marginBottom: 3,
		},
		metricValue: {
			fontSize: 17,
			fontWeight: "700",
			color: theme.text,
		},
		metricCaption: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 3,
			lineHeight: 15,
		},
		findingCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			padding: 12,
			marginBottom: 10,
		},
		findingHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 7,
			marginBottom: 5,
		},
		findingTitle: {
			flex: 1,
			fontSize: 13,
			fontWeight: "700",
			color: theme.text,
		},
		findingImpact: {
			fontSize: 12,
			fontWeight: "700",
		},
		findingDetail: {
			fontSize: 13,
			color: theme.textSecondary,
			lineHeight: 19,
		},
		chipRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
			marginTop: 8,
		},
		chip: {
			backgroundColor: theme.primary + "15",
			borderRadius: 10,
			paddingHorizontal: 8,
			paddingVertical: 3,
		},
		chipText: {
			fontSize: 11,
			fontWeight: "600",
			color: theme.primary,
		},
		categoryRow: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 12,
			marginBottom: 10,
		},
		categoryTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 7,
		},
		categoryName: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.text,
			textTransform: "capitalize",
		},
		categoryAmount: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.text,
		},
		categoryShare: {
			fontSize: 11,
			color: theme.textMuted,
			marginTop: 5,
		},
		categoryVerdict: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
			lineHeight: 17,
		},
		noteRow: {
			flexDirection: "row",
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 12,
			marginBottom: 8,
		},
		noteIcon: {
			marginRight: 8,
			marginTop: 1,
		},
		noteText: {
			flex: 1,
			fontSize: 13,
			color: theme.text,
			lineHeight: 19,
		},
		actionCard: {
			backgroundColor: theme.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.border,
			padding: 12,
			marginBottom: 8,
		},
		actionHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		priorityDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		actionTitle: {
			flex: 1,
			fontSize: 13,
			fontWeight: "700",
			color: theme.text,
		},
		actionReason: {
			fontSize: 12,
			color: theme.textSecondary,
			marginTop: 4,
			lineHeight: 17,
			marginLeft: 16,
		},
		actionSaving: {
			fontSize: 12,
			fontWeight: "600",
			color: theme.success,
			marginTop: 5,
			marginLeft: 16,
		},
	});
