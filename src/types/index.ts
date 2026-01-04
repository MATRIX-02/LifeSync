// Habit Types
export type HabitType = "yesno" | "measurable";

// Frequency Types
export type FrequencyType =
	| "daily" // Every day
	| "every_n_days" // Every n days
	| "times_per_week" // N times per week
	| "times_per_month" // N times per month
	| "times_in_x_days" // N times in X days
	| "times_per_day" // Multiple times per day
	| "specific_days"; // Specific days of week

export interface FrequencyConfig {
	type: FrequencyType;
	value: number; // N value
	secondValue?: number; // X value for "times_in_x_days"
	days?: number[]; // Specific days of week (0-6) for some frequency types
}

// Target Type for Measurable Habits
export type TargetType = "at_least" | "at_most" | "exactly";

export interface Habit {
	id: string;
	name: string;
	description?: string;
	color: string;
	icon?: string; // Ionicons name
	type: HabitType;

	// For YES/NO type
	question?: string; // Question shown in notification

	// For Measurable type
	unit?: string; // e.g., "miles", "pages", "glasses"
	target?: number; // e.g., 8 (glasses of water)
	targetType?: TargetType; // at_least, at_most, exactly

	// Frequency
	frequency: FrequencyConfig;

	// Reminders
	notificationTime?: string; // HH:mm format (legacy support)
	notificationId?: string; // ID of scheduled notification for cancellation
	reminderTime?: string; // HH:mm format
	reminderEnabled?: boolean;
	reminderDays?: number[]; // 0-6, Sunday to Saturday

	// Settings
	notificationEnabled: boolean;
	alarmEnabled?: boolean;
	ringtoneEnabled: boolean;

	// Archiving
	isArchived: boolean;
	archivedAt?: Date;

	// Notes
	notes?: string;

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
}

export interface HabitLog {
	id: string;
	habitId: string;
	completedAt: Date;

	// For measurable habits
	value?: number; // The actual measured value

	notes?: string;
}

export interface HabitStats {
	habitId: string;
	totalCompleted: number;
	currentStreak: number;
	longestStreak: number;
	completionRate: number; // percentage

	// For measurable habits
	totalValue?: number;
	averageValue?: number;
	bestValue?: number;

	// Weekly/Monthly stats
	weeklyCompletions: number;
	monthlyCompletions: number;

	// History
	last7Days: { date: string; completed: boolean; value?: number }[];
	last30Days: { date: string; completed: boolean; value?: number }[];
}

// User Profile
export interface UserProfile {
	id: string;
	name: string;
	email?: string;
	bio?: string;
	avatar?: string; // base64 or local URI
	timezone?: string;
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
	createdAt: Date;
	updatedAt: Date;
}

// App Settings
export interface AppSettings {
	theme: "light" | "dark" | "system";
	notifications: {
		enabled: boolean;
		sound: boolean;
		vibration: boolean;
		quietHoursEnabled: boolean;
		quietHoursStart?: string; // HH:mm
		quietHoursEnd?: string; // HH:mm
	};
	display: {
		showCompletedHabits: boolean;
		showArchivedHabits: boolean;
		defaultView: "list" | "grid";
	};
}

export interface NavigationStackParamList {
	HabitTrackerScreen: undefined;
	CreateHabitScreen: undefined;
	HabitDetailScreen: { habitId: string };
	SettingsScreen: undefined;
	StatisticsScreen: undefined;
	ProfileScreen: undefined;
}
