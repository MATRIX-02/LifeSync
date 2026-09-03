/**
 * The "Times per day" axis of a habit's frequency.
 *
 * Frequency used to be one mutually-exclusive enum, so "3 times a day" and
 * "on Mon/Wed/Fri" could not both be chosen. This control owns the second axis
 * only - how many completions an active day needs, and at what times - and is
 * rendered next to the schedule picker in BOTH the Create and Edit modals.
 * It is shared rather than duplicated precisely because those two modals live
 * in different 3000-line files and have drifted apart before.
 *
 * Two ways to place the reminders:
 *   window - a start/end range, evenly spread (or a fixed gap)
 *   times  - an explicit list the user picks one by one
 *
 * `times` wins over `window` in expandDayTimes(), so the mode toggle simply
 * decides which of the two is written.
 */

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/src/context/themeContext";
import {
	MAX_REMINDERS_PER_HABIT,
	PerDay,
	expandDayTimes,
	isValidTime,
} from "@/src/utils/frequency";

const toDate = (time: string): Date => {
	const [h, m] = (isValidTime(time) ? time : "09:00").split(":").map(Number);
	const d = new Date();
	d.setHours(h, m, 0, 0);
	return d;
};

const fromDate = (d: Date): string =>
	`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
		2,
		"0"
	)}`;

const formatGap = (minutes: number) =>
	minutes >= 60
		? `${Math.floor(minutes / 60)}h${
				minutes % 60 ? ` ${minutes % 60}m` : ""
		  }`
		: `${minutes}m`;

interface Props {
	value: PerDay;
	onChange: (next: PerDay) => void;
	/** Habit colour, used as the accent throughout. */
	accent: string;
	/** How many days a week the schedule is active, for the total-reminder hint. */
	activeDayCount: number;
	/**
	 * The habit's single reminder time. A once-a-day habit keeps no times inside
	 * `value` - they live in `notificationTime` - so this is what the preview and
	 * a newly-opened window must start from. Without it everything here would
	 * read 09:00 no matter what the user picked.
	 */
	fallbackTime: string;
}

export const PerDaySection: React.FC<Props> = ({
	value,
	onChange,
	accent,
	activeDayCount,
	fallbackTime,
}) => {
	const theme = useColors();
	const [picker, setPicker] = useState<
		{ kind: "start" | "end" } | { kind: "add" } | { kind: "edit"; index: number } | null
	>(null);

	const mode: "window" | "times" = value.times?.length ? "times" : "window";
	const target = Math.max(1, Math.floor(value.target || 1));
	const slots = expandDayTimes(value, fallbackTime);
	const defaultWindow = { start: fallbackTime, end: "21:00" };
	const total = slots.length * Math.max(1, activeDayCount);

	const setTarget = (next: number) => {
		const clamped = Math.max(1, Math.min(24, next));
		if (mode === "times") {
			// The list length IS the target here, so the stepper trims or extends it.
			const times = [...(value.times || [])];
			while (times.length > clamped) times.pop();
			onChange({ target: Math.max(1, times.length), times });
			return;
		}
		onChange({
			...value,
			target: clamped,
			window: value.window || defaultWindow,
		});
	};

	const useWindow = () =>
		onChange({
			target,
			window: value.window || defaultWindow,
		});

	const useTimes = () =>
		onChange({ target, times: slots.slice(0, Math.max(1, target)) });

	const patchWindow = (patch: Partial<NonNullable<PerDay["window"]>>) =>
		onChange({
			target,
			window: { ...defaultWindow, ...(value.window || {}), ...patch },
		});

	const setTimeAt = (index: number, time: string) => {
		const times = [...(value.times || [])];
		times[index] = time;
		onChange({ target: times.length, times });
	};

	const addTime = (time: string) => {
		const times = [...(value.times || []), time];
		onChange({ target: times.length, times });
	};

	const removeTime = (index: number) => {
		const times = (value.times || []).filter((_, i) => i !== index);
		if (times.length === 0) {
			// Never leave the list empty - that would silently fall back to a window.
			onChange({ target: 1, window: defaultWindow });
			return;
		}
		onChange({ target: times.length, times });
	};

	const card = {
		backgroundColor: theme.background,
		borderRadius: 10,
		padding: 12,
		gap: 12,
	} as const;

	const stepper = (
		label: string,
		onMinus: () => void,
		text: string,
		onPlus: () => void
	) => (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
				{label}
			</Text>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
				<TouchableOpacity
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: accent + "20",
						justifyContent: "center",
						alignItems: "center",
					}}
					onPress={onMinus}
				>
					<Ionicons name="remove" size={20} color={accent} />
				</TouchableOpacity>
				<Text
					style={{
						fontSize: 16,
						fontWeight: "bold",
						color: accent,
						minWidth: 76,
						textAlign: "center",
					}}
				>
					{text}
				</Text>
				<TouchableOpacity
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: accent + "20",
						justifyContent: "center",
						alignItems: "center",
					}}
					onPress={onPlus}
				>
					<Ionicons name="add" size={20} color={accent} />
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={{ gap: 12 }}>
			<View style={card}>
				{stepper(
					"Times per day",
					() => setTarget(target - 1),
					String(target),
					() => setTarget(target + 1)
				)}

				{target > 1 && (
					<View style={{ flexDirection: "row", gap: 8 }}>
						{(
							[
								["window", "Evenly spaced"],
								["times", "Custom times"],
							] as const
						).map(([key, label]) => (
							<TouchableOpacity
								key={key}
								style={{
									flex: 1,
									paddingVertical: 10,
									borderRadius: 10,
									alignItems: "center",
									borderWidth: 1,
									borderColor: mode === key ? accent : theme.border,
									backgroundColor: mode === key ? accent + "15" : "transparent",
								}}
								onPress={key === "window" ? useWindow : useTimes}
							>
								<Text
									style={{
										fontSize: 13,
										fontWeight: "600",
										color: mode === key ? accent : theme.textSecondary,
									}}
								>
									{label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>

			{target > 1 && mode === "window" && (
				<View style={card}>
					<View style={{ flexDirection: "row", gap: 12 }}>
						{(
							[
								["start", "From", value.window?.start || fallbackTime],
								["end", "To", value.window?.end || "21:00"],
							] as const
						).map(([key, label, shown]) => (
							<TouchableOpacity
								key={key}
								style={{
									flex: 1,
									padding: 12,
									borderRadius: 10,
									backgroundColor: theme.surfaceLight,
									borderWidth: 1,
									borderColor: theme.border,
								}}
								onPress={() =>
									setPicker(
										picker && "kind" in picker && picker.kind === key
											? null
											: { kind: key }
									)
								}
							>
								<Text
									style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}
								>
									{label}
								</Text>
								<Text style={{ fontSize: 18, fontWeight: "700", color: accent }}>
									{shown}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{stepper(
						"Every",
						() =>
							patchWindow({
								intervalMinutes: Math.max(
									15,
									(value.window?.intervalMinutes || 120) - 15
								),
							}),
						value.window?.intervalMinutes
							? formatGap(value.window.intervalMinutes)
							: "Auto",
						() =>
							patchWindow({
								intervalMinutes: Math.min(
									12 * 60,
									(value.window?.intervalMinutes || 0) + 15
								),
							})
					)}
					{value.window?.intervalMinutes ? (
						<TouchableOpacity onPress={() => patchWindow({ intervalMinutes: undefined })}>
							<Text style={{ fontSize: 12, color: theme.textMuted }}>
								Tap to spread evenly across the window instead
							</Text>
						</TouchableOpacity>
					) : null}
				</View>
			)}

			{target > 1 && mode === "times" && (
				<View style={card}>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						{(value.times || []).map((t, i) => (
							<View
								key={`${t}-${i}`}
								style={{
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
									paddingHorizontal: 10,
									paddingVertical: 6,
									borderRadius: 10,
									backgroundColor: accent + "20",
								}}
							>
								<TouchableOpacity onPress={() => setPicker({ kind: "edit", index: i })}>
									<Text style={{ fontSize: 14, fontWeight: "700", color: accent }}>
										{t}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity onPress={() => removeTime(i)}>
									<Ionicons name="close-circle" size={16} color={accent} />
								</TouchableOpacity>
							</View>
						))}
						<TouchableOpacity
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 4,
								paddingHorizontal: 10,
								paddingVertical: 6,
								borderRadius: 10,
								borderWidth: 1,
								borderStyle: "dashed",
								borderColor: theme.border,
							}}
							onPress={() => setPicker({ kind: "add" })}
						>
							<Ionicons name="add" size={16} color={theme.textSecondary} />
							<Text style={{ fontSize: 13, color: theme.textSecondary }}>
								Add time
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}

			{picker && (
				<DateTimePicker
					value={toDate(
						picker.kind === "start"
							? value.window?.start || fallbackTime
							: picker.kind === "end"
							? value.window?.end || "21:00"
							: picker.kind === "edit"
							? (value.times || [])[picker.index]
							: "12:00"
					)}
					mode="time"
					is24Hour
					display={Platform.OS === "ios" ? "spinner" : "default"}
					onChange={(_event, date) => {
						const current = picker;
						if (Platform.OS === "android") setPicker(null);
						if (!date || !current) return;
						const next = fromDate(date);
						if (current.kind === "start") patchWindow({ start: next });
						else if (current.kind === "end") patchWindow({ end: next });
						else if (current.kind === "edit") setTimeAt(current.index, next);
						else addTime(next);
					}}
				/>
			)}

			{/* What this actually schedules. The multiplication by active days is
			    the part that is easy to get wrong by hand. Skipped for a single
			    daily reminder, where the Reminder Time field says it already. */}
			{target > 1 && (
			<View style={{ gap: 8 }}>
				<Text style={{ fontSize: 12, color: theme.textMuted }}>
					{slots.length} reminder{slots.length === 1 ? "" : "s"} a day
					{activeDayCount < 7 ? ` × ${activeDayCount} days` : ""} ={" "}
					{total} scheduled
					{total > MAX_REMINDERS_PER_HABIT
						? ` — only the first ${MAX_REMINDERS_PER_HABIT} will be set`
						: ""}
				</Text>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
					{slots.map((slot) => (
						<View
							key={slot}
							style={{
								paddingHorizontal: 10,
								paddingVertical: 5,
								borderRadius: 8,
								backgroundColor: accent + "20",
							}}
						>
							<Text style={{ fontSize: 12, fontWeight: "600", color: accent }}>
								{slot}
							</Text>
						</View>
					))}
				</View>
			</View>
			)}
		</View>
	);
};

export default PerDaySection;
