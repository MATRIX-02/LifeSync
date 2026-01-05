import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, AppStateStatus } from "react-native";
import "react-native-url-polyfill/auto";
import { Database } from "../types/database";

// Supabase configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL =
	process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY =
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient<Database>(
	SUPABASE_URL,
	SUPABASE_ANON_KEY,
	{
		auth: {
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	}
);

// Auto-refresh session when app comes back to foreground
// This ensures the token is always fresh
AppState.addEventListener("change", (state: AppStateStatus) => {
	if (state === "active") {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
	return (
		SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
		SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
	);
};
