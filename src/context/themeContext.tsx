import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useMemo,
	ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDisplayPrefsStore } from "./displayPrefsStore";

export interface Theme {
	mode: "light" | "dark";
	background: string;
	surface: string;
	surfaceLight: string;
	surfaceElevated: string;
	primary: string;
	primaryLight: string;
	primaryDark: string;
	accent: string;
	text: string;
	textSecondary: string;
	textMuted: string;
	border: string;
	borderLight: string;
	success: string;
	successLight: string;
	error: string;
	errorLight: string;
	warning: string;
	warningLight: string;
	info: string;
	infoLight: string;
	shadow: string;
	overlay: string;
	cardGradientStart: string;
	cardGradientEnd: string;
}

// Status colours shared by every dark / light theme.
const darkStatus = {
	success: "#34D399",
	successLight: "#064E3B",
	error: "#F87171",
	errorLight: "#7F1D1D",
	warning: "#FBBF24",
	warningLight: "#78350F",
	info: "#60A5FA",
	infoLight: "#1E3A5F",
	shadow: "rgba(0, 0, 0, 0.3)",
	overlay: "rgba(0, 0, 0, 0.7)",
};
const lightStatus = {
	success: "#10B981",
	successLight: "#D1FAE5",
	error: "#EF4444",
	errorLight: "#FEE2E2",
	warning: "#F59E0B",
	warningLight: "#FEF3C7",
	info: "#3B82F6",
	infoLight: "#DBEAFE",
	shadow: "rgba(0, 0, 0, 0.1)",
	overlay: "rgba(0, 0, 0, 0.5)",
};

/** Lotus: the default, from the app logo - deep navy with green-to-cyan. */
const lotusDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#060F2B",
	surface: "#0D1A3A",
	surfaceLight: "#152447",
	surfaceElevated: "#1A2B52",
	primary: "#22C38E",
	primaryLight: "#5EEAB8",
	primaryDark: "#16B97B",
	accent: "#1FB6FF",
	text: "#FFFFFF",
	textSecondary: "#A3B1CC",
	textMuted: "#6B7A99",
	border: "#1E2E55",
	borderLight: "#2A3B66",
	cardGradientStart: "#0F1E42",
	cardGradientEnd: "#0A1633",
};

const lotusLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F3F7FB",
	surface: "#FFFFFF",
	surfaceLight: "#E9F0F7",
	surfaceElevated: "#FFFFFF",
	primary: "#0FA971",
	primaryLight: "#34D399",
	primaryDark: "#0B8A5C",
	accent: "#0A84FF",
	text: "#0B1530",
	textSecondary: "#56627A",
	textMuted: "#8E99AE",
	border: "#DCE4EE",
	borderLight: "#EDF2F7",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F3F7FB",
};

/** Classic: LifeSync's original purple look. */
export const darkTheme: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#0F0F0F",
	surface: "#1A1A1A",
	surfaceLight: "#262626",
	surfaceElevated: "#2D2D2D",
	primary: "#A78BFA",
	primaryLight: "#C4B5FD",
	primaryDark: "#8B5CF6",
	accent: "#818CF8",
	text: "#FFFFFF",
	textSecondary: "#A1A1AA",
	textMuted: "#71717A",
	border: "#2D2D2D",
	borderLight: "#3F3F46",
	cardGradientStart: "#1F1F1F",
	cardGradientEnd: "#171717",
};

export const lightTheme: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F8FAFC",
	surface: "#FFFFFF",
	surfaceLight: "#F1F5F9",
	surfaceElevated: "#FFFFFF",
	primary: "#8B5CF6",
	primaryLight: "#A78BFA",
	primaryDark: "#7C3AED",
	accent: "#6366F1",
	text: "#1E293B",
	textSecondary: "#64748B",
	textMuted: "#94A3B8",
	border: "#E2E8F0",
	borderLight: "#F1F5F9",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F8FAFC",
};

/** AMOLED: true black, saves battery on OLED screens. */
const amoled: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#000000",
	surface: "#0E0E0E",
	surfaceLight: "#1A1A1A",
	surfaceElevated: "#1F1F1F",
	primary: "#22C38E",
	primaryLight: "#5EEAB8",
	primaryDark: "#16B97B",
	accent: "#1FB6FF",
	text: "#FFFFFF",
	textSecondary: "#A1A1AA",
	textMuted: "#6B6B73",
	border: "#222222",
	borderLight: "#2E2E2E",
	cardGradientStart: "#111111",
	cardGradientEnd: "#050505",
};

const ocean: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#04121F",
	surface: "#0A2033",
	surfaceLight: "#112B42",
	surfaceElevated: "#163450",
	primary: "#1DA8E8",
	primaryLight: "#7DD3FC",
	primaryDark: "#0EA5E9",
	accent: "#22D3EE",
	text: "#F0F9FF",
	textSecondary: "#9DB4C8",
	textMuted: "#64809A",
	border: "#17334D",
	borderLight: "#22415E",
	cardGradientStart: "#0C2439",
	cardGradientEnd: "#071A2B",
};

const forest: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#0A1410",
	surface: "#12211B",
	surfaceLight: "#1A2D25",
	surfaceElevated: "#1F352C",
	primary: "#2FBF6A",
	primaryLight: "#86EFAC",
	primaryDark: "#22C55E",
	accent: "#A3E635",
	text: "#F0FDF4",
	textSecondary: "#A3B8AC",
	textMuted: "#6B8576",
	border: "#21382E",
	borderLight: "#2C463A",
	cardGradientStart: "#14261F",
	cardGradientEnd: "#0D1A15",
};

const sunset: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#1A0F14",
	surface: "#26161D",
	surfaceLight: "#321D26",
	surfaceElevated: "#3A222C",
	primary: "#F5822A",
	primaryLight: "#FDBA74",
	primaryDark: "#F97316",
	accent: "#F472B6",
	text: "#FFF7ED",
	textSecondary: "#C7AFB6",
	textMuted: "#8F7880",
	border: "#3A2530",
	borderLight: "#4A2F3C",
	cardGradientStart: "#2A1820",
	cardGradientEnd: "#1E1117",
};

const rose: Theme = {
	mode: "light",
	...lightStatus,
	background: "#FFF5F7",
	surface: "#FFFFFF",
	surfaceLight: "#FDECF0",
	surfaceElevated: "#FFFFFF",
	primary: "#E11D74",
	primaryLight: "#F472B6",
	primaryDark: "#BE185D",
	accent: "#F97316",
	text: "#2A1520",
	textSecondary: "#7A5C68",
	textMuted: "#A88E98",
	border: "#F5DCE4",
	borderLight: "#FBEAF0",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#FFF5F7",
};

/** Light / dark counterparts of the original single-mode themes. */
const oceanLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F0F8FD",
	surface: "#FFFFFF",
	surfaceLight: "#E1F1FA",
	surfaceElevated: "#FFFFFF",
	primary: "#0284C7",
	primaryLight: "#38BDF8",
	primaryDark: "#0369A1",
	accent: "#0891B2",
	text: "#0C2234",
	textSecondary: "#4F6B80",
	textMuted: "#8AA2B5",
	border: "#D3E6F2",
	borderLight: "#E8F3FA",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F0F8FD",
};

const forestLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F2F8F3",
	surface: "#FFFFFF",
	surfaceLight: "#E3F0E7",
	surfaceElevated: "#FFFFFF",
	primary: "#16A34A",
	primaryLight: "#4ADE80",
	primaryDark: "#15803D",
	accent: "#65A30D",
	text: "#0F2418",
	textSecondary: "#52695B",
	textMuted: "#8BA294",
	border: "#D5E6DA",
	borderLight: "#E9F3EC",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F2F8F3",
};

const sunsetLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#FFF7F0",
	surface: "#FFFFFF",
	surfaceLight: "#FDEBDC",
	surfaceElevated: "#FFFFFF",
	primary: "#EA580C",
	primaryLight: "#FB923C",
	primaryDark: "#C2410C",
	accent: "#DB2777",
	text: "#2B160C",
	textSecondary: "#7A5A48",
	textMuted: "#A88C7C",
	border: "#F5DFCF",
	borderLight: "#FBEFE5",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#FFF7F0",
};

const roseDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#1A0B13",
	surface: "#26121D",
	surfaceLight: "#321A27",
	surfaceElevated: "#3B1F2F",
	primary: "#F0458F",
	primaryLight: "#F9A8D4",
	primaryDark: "#E11D74",
	accent: "#FB923C",
	text: "#FFF1F6",
	textSecondary: "#C9A7B7",
	textMuted: "#8E6E7E",
	border: "#3D2232",
	borderLight: "#4C2B3E",
	cardGradientStart: "#2A1521",
	cardGradientEnd: "#1E0E17",
};

/** Nord: cool arctic blue-grey. */
const nordDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#242933",
	surface: "#2E3440",
	surfaceLight: "#3B4252",
	surfaceElevated: "#434C5E",
	primary: "#88C0D0",
	primaryLight: "#A3D8E6",
	primaryDark: "#5E81AC",
	accent: "#81A1C1",
	text: "#ECEFF4",
	textSecondary: "#C0C8D6",
	textMuted: "#7C879B",
	border: "#3B4252",
	borderLight: "#4C566A",
	cardGradientStart: "#323946",
	cardGradientEnd: "#2A2F3A",
};

const nordLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#ECEFF4",
	surface: "#FFFFFF",
	surfaceLight: "#E5E9F0",
	surfaceElevated: "#FFFFFF",
	primary: "#5E81AC",
	primaryLight: "#81A1C1",
	primaryDark: "#4C6A92",
	accent: "#88C0D0",
	text: "#2E3440",
	textSecondary: "#4C566A",
	textMuted: "#7C879B",
	border: "#D8DEE9",
	borderLight: "#E5E9F0",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#ECEFF4",
};

/** Mocha: warm coffee browns. */
const mochaDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#17120F",
	surface: "#221A16",
	surfaceLight: "#2D231D",
	surfaceElevated: "#352A23",
	primary: "#D4A373",
	primaryLight: "#E9C9A4",
	primaryDark: "#B8875A",
	accent: "#E07A5F",
	text: "#FBF3EA",
	textSecondary: "#C2B1A2",
	textMuted: "#8A7868",
	border: "#3A2E26",
	borderLight: "#4A3B31",
	cardGradientStart: "#271E19",
	cardGradientEnd: "#1C1612",
};

const mochaLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#FAF5EF",
	surface: "#FFFFFF",
	surfaceLight: "#F1E8DD",
	surfaceElevated: "#FFFFFF",
	primary: "#9C6B3C",
	primaryLight: "#C8956A",
	primaryDark: "#7D532C",
	accent: "#C2583F",
	text: "#2A1D14",
	textSecondary: "#6E5A4A",
	textMuted: "#A08D7D",
	border: "#E8DCCD",
	borderLight: "#F3ECE3",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#FAF5EF",
};

/** Lavender: soft purples, gentler than Classic. */
const lavenderDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#141221",
	surface: "#1D1A2E",
	surfaceLight: "#26223B",
	surfaceElevated: "#2D2846",
	primary: "#B69CFF",
	primaryLight: "#D8CBFF",
	primaryDark: "#9277F0",
	accent: "#F0A6CA",
	text: "#F5F2FF",
	textSecondary: "#B4ACCB",
	textMuted: "#7A7292",
	border: "#2E2945",
	borderLight: "#3A3456",
	cardGradientStart: "#211D33",
	cardGradientEnd: "#181527",
};

const lavenderLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F7F5FF",
	surface: "#FFFFFF",
	surfaceLight: "#EEEAFD",
	surfaceElevated: "#FFFFFF",
	primary: "#7C5CE0",
	primaryLight: "#A58BF5",
	primaryDark: "#6343C4",
	accent: "#D9468F",
	text: "#1E1838",
	textSecondary: "#625A7D",
	textMuted: "#9890B0",
	border: "#E3DEF6",
	borderLight: "#F0EDFB",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F7F5FF",
};

/** Crimson: bold reds. */
const crimsonDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#140A0B",
	surface: "#1F1012",
	surfaceLight: "#2A1619",
	surfaceElevated: "#331B1F",
	primary: "#EF4444",
	primaryLight: "#FCA5A5",
	primaryDark: "#DC2626",
	accent: "#F59E0B",
	text: "#FFF1F1",
	textSecondary: "#C4A6A8",
	textMuted: "#8C6F72",
	border: "#3A1E22",
	borderLight: "#4A272C",
	cardGradientStart: "#251315",
	cardGradientEnd: "#1A0C0E",
};

const crimsonLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#FFF6F6",
	surface: "#FFFFFF",
	surfaceLight: "#FDE8E8",
	surfaceElevated: "#FFFFFF",
	primary: "#DC2626",
	primaryLight: "#F87171",
	primaryDark: "#B91C1C",
	accent: "#D97706",
	text: "#2A1214",
	textSecondary: "#7A5458",
	textMuted: "#AA8A8D",
	border: "#F5D9DA",
	borderLight: "#FBEBEC",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#FFF6F6",
};

/** Slate: neutral greys with a teal accent, low distraction. */
const slateDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#0F1419",
	surface: "#181F26",
	surfaceLight: "#212A33",
	surfaceElevated: "#28323D",
	primary: "#2DD4BF",
	primaryLight: "#99F6E4",
	primaryDark: "#14B8A6",
	accent: "#94A3B8",
	text: "#F1F5F9",
	textSecondary: "#A7B3C2",
	textMuted: "#6B7889",
	border: "#26303B",
	borderLight: "#323E4B",
	cardGradientStart: "#1B232B",
	cardGradientEnd: "#131A20",
};

const slateLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F4F6F8",
	surface: "#FFFFFF",
	surfaceLight: "#E8ECF0",
	surfaceElevated: "#FFFFFF",
	primary: "#0D9488",
	primaryLight: "#2DD4BF",
	primaryDark: "#0F766E",
	accent: "#475569",
	text: "#0F172A",
	textSecondary: "#526072",
	textMuted: "#8B97A8",
	border: "#DDE3EA",
	borderLight: "#EDF1F4",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F4F6F8",
};

/** Mint: fresh green-cyan. */
const mintDark: Theme = {
	mode: "dark",
	...darkStatus,
	background: "#081614",
	surface: "#0F211E",
	surfaceLight: "#162C28",
	surfaceElevated: "#1B3430",
	primary: "#3EE0B5",
	primaryLight: "#A7F3DF",
	primaryDark: "#10C49A",
	accent: "#7DD3FC",
	text: "#ECFEF8",
	textSecondary: "#9FBFB6",
	textMuted: "#66867D",
	border: "#1C3833",
	borderLight: "#274640",
	cardGradientStart: "#122622",
	cardGradientEnd: "#0B1B18",
};

const mintLight: Theme = {
	mode: "light",
	...lightStatus,
	background: "#F0FBF7",
	surface: "#FFFFFF",
	surfaceLight: "#DFF5EC",
	surfaceElevated: "#FFFFFF",
	primary: "#0E9F7E",
	primaryLight: "#34D3A9",
	primaryDark: "#0A7F64",
	accent: "#0284C7",
	text: "#0B2420",
	textSecondary: "#4E6B64",
	textMuted: "#8AA39C",
	border: "#D0EAE1",
	borderLight: "#E6F5EF",
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F0FBF7",
};

export type ThemeId =
	| "lotus"
	| "lotus-light"
	| "classic"
	| "classic-light"
	| "amoled"
	| "ocean"
	| "ocean-light"
	| "forest"
	| "forest-light"
	| "sunset"
	| "sunset-light"
	| "rose"
	| "rose-dark"
	| "nord"
	| "nord-light"
	| "mocha"
	| "mocha-light"
	| "lavender"
	| "lavender-light"
	| "crimson"
	| "crimson-light"
	| "slate"
	| "slate-light"
	| "mint"
	| "mint-light";

/** "system" follows the phone: Lotus or Lotus Light. */
export type ThemeMode = ThemeId | "system";

export interface ThemeOption {
	id: ThemeId;
	name: string;
	colors: Theme;
	/** The light/dark counterpart, used by toggleTheme. */
	pair: ThemeId;
}

export const THEMES: ThemeOption[] = [
	{ id: "lotus", name: "Lotus", colors: lotusDark, pair: "lotus-light" },
	{ id: "lotus-light", name: "Lotus Light", colors: lotusLight, pair: "lotus" },
	{ id: "classic", name: "Classic", colors: darkTheme, pair: "classic-light" },
	{ id: "classic-light", name: "Classic Light", colors: lightTheme, pair: "classic" },
	{ id: "amoled", name: "AMOLED", colors: amoled, pair: "lotus-light" },
	{ id: "ocean", name: "Ocean", colors: ocean, pair: "ocean-light" },
	{ id: "ocean-light", name: "Ocean Light", colors: oceanLight, pair: "ocean" },
	{ id: "forest", name: "Forest", colors: forest, pair: "forest-light" },
	{ id: "forest-light", name: "Forest Light", colors: forestLight, pair: "forest" },
	{ id: "sunset", name: "Sunset", colors: sunset, pair: "sunset-light" },
	{ id: "sunset-light", name: "Sunset Light", colors: sunsetLight, pair: "sunset" },
	{ id: "rose-dark", name: "Rose Dark", colors: roseDark, pair: "rose" },
	{ id: "rose", name: "Rose", colors: rose, pair: "rose-dark" },
	{ id: "nord", name: "Nord", colors: nordDark, pair: "nord-light" },
	{ id: "nord-light", name: "Nord Light", colors: nordLight, pair: "nord" },
	{ id: "mocha", name: "Mocha", colors: mochaDark, pair: "mocha-light" },
	{ id: "mocha-light", name: "Mocha Light", colors: mochaLight, pair: "mocha" },
	{ id: "lavender", name: "Lavender", colors: lavenderDark, pair: "lavender-light" },
	{ id: "lavender-light", name: "Lavender Light", colors: lavenderLight, pair: "lavender" },
	{ id: "crimson", name: "Crimson", colors: crimsonDark, pair: "crimson-light" },
	{ id: "crimson-light", name: "Crimson Light", colors: crimsonLight, pair: "crimson" },
	{ id: "slate", name: "Slate", colors: slateDark, pair: "slate-light" },
	{ id: "slate-light", name: "Slate Light", colors: slateLight, pair: "slate" },
	{ id: "mint", name: "Mint", colors: mintDark, pair: "mint-light" },
	{ id: "mint-light", name: "Mint Light", colors: mintLight, pair: "mint" },
];

const DEFAULT_MODE: ThemeMode = "lotus";

/** Blends a #RRGGBB colour towards white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
	const n = parseInt(hex.slice(1), 16);
	const target = amount > 0 ? 255 : 0;
	const mix = (c: number) => Math.round(c + (target - c) * Math.abs(amount));
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/** The theme with the user's accent colour in place of its own. */
function withAccent(theme: Theme, accent: string | null): Theme {
	if (!accent || !/^#[0-9a-f]{6}$/i.test(accent)) return theme;
	return {
		...theme,
		primary: accent,
		primaryLight: shade(accent, 0.35),
		primaryDark: shade(accent, -0.2),
		accent: shade(accent, theme.mode === "dark" ? 0.2 : -0.1),
	};
}
const byId = (id: ThemeId) => THEMES.find((t) => t.id === id)!;
const isThemeMode = (v: string): v is ThemeMode => v === "system" || THEMES.some((t) => t.id === v);

// Before named themes the stored value was just "light" | "dark" | "system".
const LEGACY: Record<string, ThemeMode> = { dark: "lotus", light: "lotus-light" };

interface ThemeContextType {
	theme: Theme;
	themeMode: ThemeMode;
	isDark: boolean;
	setThemeMode: (mode: ThemeMode) => void;
	/** Switches to the current theme's light/dark counterpart. */
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@habit_tracker_theme";

interface ThemeProviderProps {
	children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const systemColorScheme = useColorScheme();
	const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_MODE);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load saved theme preference
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
				const mode = saved ? (LEGACY[saved] ?? saved) : null;
				if (mode && isThemeMode(mode)) setThemeModeState(mode);
			} catch (error) {
				console.error("Error loading theme:", error);
			} finally {
				setIsLoaded(true);
			}
		};
		loadTheme();
	}, []);

	// Save theme preference
	const setThemeMode = async (mode: ThemeMode) => {
		setThemeModeState(mode);
		try {
			await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
		} catch (error) {
			console.error("Error saving theme:", error);
		}
	};

	const activeId: ThemeId =
		themeMode === "system" ? (systemColorScheme === "light" ? "lotus-light" : "lotus") : themeMode;
	const active = byId(activeId);
	const accentColor = useDisplayPrefsStore((st) => st.accentColor);
	const theme = useMemo(() => withAccent(active.colors, accentColor), [active, accentColor]);
	const isDark = theme.mode === "dark";

	const toggleTheme = () => setThemeMode(active.pair);

	if (!isLoaded) {
		return null; // Or a loading component
	}

	return (
		<ThemeContext.Provider
			value={{
				theme,
				themeMode,
				isDark,
				setThemeMode,
				toggleTheme,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = (): ThemeContextType => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};

// Hook to get just the colors
export const useColors = (): Theme => {
	const { theme } = useTheme();
	return theme;
};
