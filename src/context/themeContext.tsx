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

export type ThemeId =
	| "lotus"
	| "lotus-light"
	| "classic"
	| "classic-light"
	| "amoled"
	| "ocean"
	| "forest"
	| "sunset"
	| "rose";

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
	{ id: "ocean", name: "Ocean", colors: ocean, pair: "lotus-light" },
	{ id: "forest", name: "Forest", colors: forest, pair: "lotus-light" },
	{ id: "sunset", name: "Sunset", colors: sunset, pair: "rose" },
	{ id: "rose", name: "Rose", colors: rose, pair: "sunset" },
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
