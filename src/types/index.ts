// Habit Types
export type HabitType = "yesno" | "measurable";

import type { Frequency } from "../utils/frequency";
export type { Frequency, PerDay, Schedule, ScheduleKind } from "../utils/frequency";

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

	// "times_per_day" window configuration.
	// Reminders are spread from startTime to endTime, intervalMinutes apart.
	startTime?: string; // HH:mm — first reminder of the day
	endTime?: string; // HH:mm — no reminder is scheduled after this
	intervalMinutes?: number; // gap between occurrences
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

	// Frequency. Two orthogonal axes - which days, and how many times on an
	// active day - see src/utils/frequency.ts. Reads normalize the legacy flat
	// shape into this, so anything holding a Habit sees the new form.
	frequency: Frequency;

	// Reminders
	notificationTime?: string; // HH:mm format (legacy support)
	// ID of scheduled notification for cancellation. Only meaningful for habits
	// with a single reminder; reminders are cancelled by matching the
	// notification's `data.habitId` payload, so this is not required.
	notificationId?: string;
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

/**
 * One calendar day of a habit's history.
 *
 * `active` is what makes the rest meaningful: a Mon/Wed/Fri habit is simply not
 * scheduled on a Tuesday, so that day is neither a hit nor a miss and must be
 * excluded from rates and skipped over by streaks.
 */
export interface DayProgress {
	/** Local date, "YYYY-MM-DD". Not an ISO timestamp - no timezone shifting. */
	date: string;
	/** Is the habit due on this day at all? */
	active: boolean;
	/** Completions logged. */
	done: number;
	/** Completions needed. 0 on an inactive day. */
	target: number;
	/** done >= target on an active day; any log at all on an inactive one. */
	completed: boolean;
	/** First logged value, for measurable habits. */
	value?: number;
}

export interface HabitStats {
	habitId: string;
	/** Days fully completed. NOT the number of logs - see totalLogs. */
	totalCompleted: number;
	/** Days the habit was due. The denominator for totalCompleted. */
	totalScheduled: number;
	/** Raw completions. A 3x/day habit logs three of these a day. */
	totalLogs: number;
	currentStreak: number;
	longestStreak: number;
	/** Percentage of DUE days completed in the last 30. */
	completionRate: number;

	// For measurable habits
	totalValue?: number;
	averageValue?: number;
	bestValue?: number;

	// Weekly/Monthly stats, in completed days
	weeklyCompletions: number;
	monthlyCompletions: number;
	/** Due days in the same windows, so a rate can be shown as "5 / 8 days". */
	scheduledDays7: number;
	scheduledDays30: number;
	completedDays30: number;

	// History, oldest first
	last7Days: DayProgress[];
	last30Days: DayProgress[];
	/** Up to a year, from the habit's creation date. Oldest first. */
	days: DayProgress[];
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

