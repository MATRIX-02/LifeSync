// Shared building blocks for the Split Wise screens.

import { Theme, useColors } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewStyle,
} from "react-native";

export const money = (value: number, currency = "₹") =>
	`${value < 0 ? "-" : ""}${currency}${Math.abs(value).toLocaleString("en-IN", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}`;

export const initials = (name: string) =>
	name
		.split(" ")
		.filter(Boolean)
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.substring(0, 2) || "?";

export const shortDate = (iso: string) =>
	new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

export const relativeTime = (iso: string) => {
	const diff = Date.now() - new Date(iso).getTime();
	const min = Math.round(diff / 60000);
	if (min < 1) return "just now";
	if (min < 60) return `${min}m ago`;
	const h = Math.round(min / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.round(h / 24);
	if (d < 7) return `${d}d ago`;
	return shortDate(iso);
};

/** Tone for a balance: owed to you (good), you owe (error), settled (muted). */
export const balanceColor = (theme: Theme, value: number) =>
	value > 0.01 ? theme.success : value < -0.01 ? theme.error : theme.textMuted;

const AVATAR_COLORS = ["#A78BFA", "#F472B6", "#FB923C", "#34D399", "#22D3EE", "#60A5FA", "#FBBF24", "#F87171"];
const colorFor = (name: string) =>
	AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export function Avatar({
	name,
	size = 36,
	color,
	style,
}: {
	name: string;
	size?: number;
	color?: string;
	style?: ViewStyle;
}) {
	const tint = color ?? colorFor(name);
	return (
		<View
			style={[
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: tint + "26",
					alignItems: "center",
					justifyContent: "center",
				},
				style,
			]}
		>
			<Text style={{ color: tint, fontWeight: "700", fontSize: size * 0.38 }}>{initials(name)}</Text>
		</View>
	);
}

/** Bottom sheet with a title row; `right` is the primary action (e.g. Save). */
export function Sheet({
	visible,
	onClose,
	title,
	right,
	children,
	scroll = true,
	tall,
}: {
	visible: boolean;
	onClose: () => void;
	title: string;
	right?: { label: string; onPress: () => void; disabled?: boolean };
	children: React.ReactNode;
	scroll?: boolean;
	tall?: boolean;
}) {
	const theme = useColors();
	const s = useMemo(() => sheetStyles(theme), [theme]);
	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<KeyboardAvoidingView
				style={s.overlay}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={[s.sheet, tall && { height: "92%" }]}>
					<View style={s.handle} />
					<View style={s.header}>
						<TouchableOpacity onPress={onClose} hitSlop={12} style={s.headerSide}>
							<Ionicons name="close" size={22} color={theme.textSecondary} />
						</TouchableOpacity>
						<Text style={s.title} numberOfLines={1}>
							{title}
						</Text>
						<View style={[s.headerSide, { alignItems: "flex-end" }]}>
							{right && (
								<TouchableOpacity onPress={right.onPress} disabled={right.disabled} hitSlop={12}>
									<Text style={[s.action, right.disabled && { opacity: 0.4 }]}>{right.label}</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
					{scroll ? (
						<ScrollView
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={s.body}
						>
							{children}
						</ScrollView>
					) : (
						<View style={[s.body, { flex: 1 }]}>{children}</View>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const sheetStyles = (theme: Theme) =>
	StyleSheet.create({
		overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay },
		sheet: {
			backgroundColor: theme.background,
			borderTopLeftRadius: 26,
			borderTopRightRadius: 26,
			maxHeight: "92%",
		},
		handle: {
			alignSelf: "center",
			width: 40,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.border,
			marginTop: 10,
		},
		header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 },
		headerSide: { width: 64 },
		title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: theme.text },
		action: { fontSize: 16, fontWeight: "700", color: theme.primary },
		body: { paddingHorizontal: 18, paddingBottom: 36 },
	});

export function Chip({
	label,
	active,
	onPress,
	icon,
	color,
}: {
	label: string;
	active?: boolean;
	onPress: () => void;
	icon?: React.ComponentProps<typeof Ionicons>["name"];
	color?: string;
}) {
	const theme = useColors();
	const tint = color ?? theme.primary;
	return (
		<TouchableOpacity
			onPress={onPress}
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
				paddingHorizontal: 13,
				paddingVertical: 8,
				borderRadius: 18,
				backgroundColor: active ? tint : theme.surface,
				borderWidth: 1,
				borderColor: active ? tint : theme.border,
			}}
		>
			{icon && <Ionicons name={icon} size={14} color={active ? "#FFFFFF" : theme.textSecondary} />}
			<Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#FFFFFF" : theme.textSecondary }}>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

export function Label({ children }: { children: React.ReactNode }) {
	const theme = useColors();
	return (
		<Text
			style={{
				fontSize: 12,
				fontWeight: "700",
				letterSpacing: 0.5,
				color: theme.textMuted,
				marginTop: 18,
				marginBottom: 8,
			}}
		>
			{children}
		</Text>
	);
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
	const theme = useColors();
	return (
		<View style={[{ backgroundColor: theme.surface, borderRadius: 18, padding: 14 }, style]}>{children}</View>
	);
}

export function EmptyState({
	icon,
	title,
	text,
}: {
	icon: React.ComponentProps<typeof Ionicons>["name"];
	title: string;
	text?: string;
}) {
	const theme = useColors();
	return (
		<View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 }}>
			<Ionicons name={icon} size={40} color={theme.textMuted} />
			<Text style={{ fontSize: 16, fontWeight: "700", color: theme.text, marginTop: 10 }}>{title}</Text>
			{text && (
				<Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
					{text}
				</Text>
			)}
		</View>
	);
}
