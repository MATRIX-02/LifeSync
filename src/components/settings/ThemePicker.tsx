import { Theme, THEMES, ThemeMode, useColors, useTheme } from "@/src/context/themeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** A tiny mock screen in the theme's own colours. */
function Swatch({ colors, s }: { colors: Theme; s: ReturnType<typeof createStyles> }) {
	return (
		<View style={[s.swatch, { backgroundColor: colors.background, borderColor: colors.border }]}>
			<View style={[s.swatchBar, { backgroundColor: colors.surface }]} />
			<View style={[s.swatchCard, { backgroundColor: colors.surface }]}>
				<View style={[s.swatchLine, { backgroundColor: colors.textMuted, width: "70%" }]} />
				<View style={[s.swatchLine, { backgroundColor: colors.textMuted, width: "45%" }]} />
			</View>
			<View style={s.swatchDots}>
				<View style={[s.swatchDot, { backgroundColor: colors.primary }]} />
				<View style={[s.swatchDot, { backgroundColor: colors.accent }]} />
			</View>
		</View>
	);
}

/** Settings > Appearance > Theme. Replaces the old Dark Mode switch. */
export function ThemePicker() {
	const theme = useColors();
	const { themeMode, setThemeMode } = useTheme();
	const s = useMemo(() => createStyles(theme), [theme]);

	const options: { mode: ThemeMode; name: string; colors: Theme }[] = [
		{ mode: "system", name: "Auto", colors: THEMES[0].colors },
		...THEMES.map((t) => ({ mode: t.id as ThemeMode, name: t.name, colors: t.colors })),
	];

	return (
		<View style={s.wrap}>
			<View style={s.header}>
				<View style={[s.iconBox, { backgroundColor: theme.primary + "20" }]}>
					<Ionicons name="color-palette" size={20} color={theme.primary} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={s.label}>Theme</Text>
					<Text style={s.description}>
						{themeMode === "system"
							? "Auto: Lotus, light or dark to match your phone"
							: "Choose the colours LifeSync uses"}
					</Text>
				</View>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
				{options.map((o) => {
					const selected = o.mode === themeMode;
					return (
						<TouchableOpacity
							key={o.mode}
							style={s.option}
							activeOpacity={0.7}
							onPress={() => setThemeMode(o.mode)}
						>
							<View style={[s.ring, selected && { borderColor: theme.primary }]}>
								{o.mode === "system" ? (
									<View style={s.split}>
										<View style={{ flex: 1, overflow: "hidden" }}>
											<Swatch colors={THEMES[1].colors} s={s} />
										</View>
										<View style={{ flex: 1, overflow: "hidden", alignItems: "flex-end" }}>
											<Swatch colors={THEMES[0].colors} s={s} />
										</View>
									</View>
								) : (
									<Swatch colors={o.colors} s={s} />
								)}
								{selected && (
									<View style={[s.check, { backgroundColor: theme.primary }]}>
										<Ionicons name="checkmark" size={12} color="#FFFFFF" />
									</View>
								)}
							</View>
							<Text style={[s.name, selected && { color: theme.primary, fontWeight: "700" }]}>
								{o.name}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</View>
	);
}

const SW = 64;
const SH = 96;

const createStyles = (theme: Theme) =>
	StyleSheet.create({
		wrap: { paddingVertical: 14 },
		header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
		iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
		label: { fontSize: 15, fontWeight: "600", color: theme.text },
		description: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
		row: { gap: 12, paddingHorizontal: 16, paddingTop: 14 },
		option: { alignItems: "center", gap: 6 },
		ring: { padding: 3, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
		split: { flexDirection: "row", width: SW, height: SH, borderRadius: 12, overflow: "hidden" },
		swatch: { width: SW, height: SH, borderRadius: 12, borderWidth: 1, padding: 6, gap: 6, overflow: "hidden" },
		swatchBar: { height: 10, borderRadius: 4 },
		swatchCard: { flex: 1, borderRadius: 6, padding: 5, gap: 4 },
		swatchLine: { height: 4, borderRadius: 2, opacity: 0.6 },
		swatchDots: { flexDirection: "row", gap: 4 },
		swatchDot: { width: 12, height: 12, borderRadius: 6 },
		check: {
			position: "absolute",
			top: -4,
			right: -4,
			width: 20,
			height: 20,
			borderRadius: 10,
			alignItems: "center",
			justifyContent: "center",
		},
		name: { fontSize: 12, color: theme.textSecondary },
	});
