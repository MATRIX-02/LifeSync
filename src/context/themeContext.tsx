import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Theme color definitions
export const lightTheme = {
	mode: "light" as const,
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
	cardGradientStart: "#FFFFFF",
	cardGradientEnd: "#F8FAFC",
};

export const darkTheme = {
	mode: "dark" as const,
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
	cardGradientStart: "#1F1F1F",
	cardGradientEnd: "#171717",
};

export type Theme = typeof lightTheme;
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
	theme: Theme;
	themeMode: ThemeMode;
	isDark: boolean;
	setThemeMode: (mode: ThemeMode) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@habit_tracker_theme";

interface ThemeProviderProps {
	children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const systemColorScheme = useColorScheme();
	const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
	const [isLoaded, setIsLoaded] = useState(false);

	// Load saved theme preference
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
				if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
					setThemeModeState(savedTheme as ThemeMode);
				}
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
		try {
			await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
			setThemeModeState(mode);
		} catch (error) {
			console.error("Error saving theme:", error);
		}
	};

	// Toggle between light and dark
	const toggleTheme = () => {
		const newMode = themeMode === "dark" ? "light" : "dark";
		setThemeMode(newMode);
	};

	// Determine actual theme based on mode
	const isDark =
		themeMode === "system"
			? systemColorScheme === "dark"
			: themeMode === "dark";

	const theme = isDark ? darkTheme : lightTheme;

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
