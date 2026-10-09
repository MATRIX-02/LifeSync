import {
	ACCENT_COLORS,
	TEXT_SIZES,
	textScaleFor,
	useDisplayPrefsStore,
} from "@/src/context/displayPrefsStore";
import { Theme, THEMES, useColors, useTheme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function Header({
	icon,
	label,
	description,
	s,
	theme,
}: {
	icon: React.ComponentProps<typeof Ionicons>["name"];
	label: string;
	description: string;
	s: ReturnType<typeof createStyles>;
	theme: Theme;
}) {
	return (
		<View style={s.header}>
			<View style={[s.iconBox, { backgroundColor: theme.primary + "20" }]}>
				<Ionicons name={icon} size={20} color={theme.primary} />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={s.label}>{label}</Text>
				<Text style={s.description}>{description}</Text>
			</View>
		</View>
	);
}

/** Settings > Appearance > Accent colour: overrides the theme's highlight colour. */
export function AccentColorPicker() {
	const theme = useColors();
	const { themeMode } = useTheme();
	const s = useMemo(() => createStyles(theme), [theme]);
	const accent = useDisplayPrefsStore((st) => st.accentColor);
	const setAccent = useDisplayPrefsStore((st) => st.setAccentColor);
	// The "theme default" chip shows the theme's own colour, not the override.
	const themeOwn = (THEMES.find((t) => t.id === themeMode) ?? THEMES[0]).colors.primary;

	return (
		<View style={[s.wrap, s.divider]}>
			<Header
				icon="color-fill"
				label="Accent colour"
				description="Buttons, highlights and progress"
				s={s}
				theme={theme}
			/>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
				<TouchableOpacity onPress={() => setAccent(null)} activeOpacity={0.7} style={s.colorOption}>
					<View style={[s.ring, accent === null && { borderColor: theme.text }]}>
						<View style={[s.color, { backgroundColor: themeOwn }]}>
							<Ionicons name="color-palette-outline" size={16} color="#FFFFFF" />
						</View>
					</View>
					<Text style={s.colorLabel}>Theme</Text>
				</TouchableOpacity>
				{ACCENT_COLORS.map((c) => (
					<TouchableOpacity key={c} onPress={() => setAccent(c)} activeOpacity={0.7} style={s.colorOption}>
						<View style={[s.ring, accent === c && { borderColor: theme.text }]}>
							<View style={[s.color, { backgroundColor: c }]}>
								{accent === c && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
							</View>
						</View>
					</TouchableOpacity>
				))}
			</ScrollView>
		</View>
	);
}

/** Settings > Appearance > Text size: scales all text in the app. */
export function TextSizePicker() {
	const theme = useColors();
	const s = useMemo(() => createStyles(theme), [theme]);
	const size = useDisplayPrefsStore((st) => st.textSize);
	const setSize = useDisplayPrefsStore((st) => st.setTextSize);

	return (
		<View style={[s.wrap, s.divider]}>
			<Header icon="text" label="Text size" description="Applies across the whole app" s={s} theme={theme} />
			<View style={s.segments}>
				{TEXT_SIZES.map((t) => {
					const selected = t.id === size;
					return (
						<TouchableOpacity
							key={t.id}
							style={[s.segment, selected && { backgroundColor: theme.primary }]}
							onPress={() => setSize(t.id)}
							activeOpacity={0.7}
						>
							{/* Sized for the option itself; AppText then applies the current scale, so undo it. */}
							<Text
								style={[
									s.segmentA,
									{ fontSize: (15 * t.scale) / textScaleFor(size) },
									selected && { color: "#FFFFFF" },
								]}
							>
								A
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<Text style={s.sizeName}>{TEXT_SIZES.find((t) => t.id === size)?.label}</Text>
		</View>
	);
}

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		wrap: { paddingVertical: 14 },
		divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
		header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
		iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
		label: { fontSize: 15, fontWeight: "600", color: theme.text },
		description: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
		row: { gap: 10, paddingHorizontal: 16, paddingTop: 14, alignItems: "flex-start" },
		colorOption: { alignItems: "center", gap: 4 },
		ring: { padding: 3, borderRadius: 22, borderWidth: 2, borderColor: "transparent" },
		color: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
		colorLabel: { fontSize: 11, color: theme.textSecondary },
		segments: {
			flexDirection: "row",
			marginHorizontal: 16,
			marginTop: 14,
			padding: 4,
			gap: 4,
			borderRadius: 14,
			backgroundColor: theme.surfaceLight,
		},
		segment: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
		segmentA: { fontWeight: "700", color: theme.text },
		sizeName: { fontSize: 12, color: theme.textSecondary, textAlign: "center", marginTop: 8 },
	});
