/**
 * Habit frequency: two orthogonal axes.
 *
 * The old model used one enum (`daily | specific_days | times_per_day | …`) for
 * two independent questions, which made them mutually exclusive - so
 * "3 times a day on Mon/Wed/Fri" could not be expressed at all.
 *
 *   schedule -> WHICH DAYS the habit is active
 *   perDay   -> HOW MANY times on an active day, and at what times
 *
 * Every legacy shape maps onto this losslessly; `normalizeFrequency` accepts
 * either and always returns the new form, so stored data, cloud rows and the
 * UI can migrate independently.
 */

export type ScheduleKind =
	| "daily"
	| "weekdays"
	| "every_n_days"
	| "times_per_week"
	| "times_per_month"
	| "times_in_days";

export type Schedule =
	| { kind: "daily" }
	/** days: 0 = Sunday … 6 = Saturday */
	| { kind: "weekdays"; days: number[] }
	| { kind: "every_n_days"; n: number; anchorDate?: string }
	/** Flexible: N times a week, no fixed days. */
	| { kind: "times_per_week"; n: number }
	| { kind: "times_per_month"; n: number }
	| { kind: "times_in_days"; n: number; days: number };

export interface PerDay {
	/** Completions needed on an active day. */
	target: number;
	/** Explicit reminder times, "HH:mm". Takes precedence over `window`. */
	times?: string[];
	/** Even spread between two times of day. */
	window?: { start: string; end: string; intervalMinutes?: number };
}

export interface Frequency {
	schedule: Schedule;
	perDay: PerDay;
}

/** Ceiling on reminders per habit. Android caps pending alarms per app
 *  (a few hundred), and weekdays x times multiplies fast: 5 days x 8 a day is
 *  already 40 triggers for ONE habit. Better to cap and say so than to have
 *  the OS silently drop them. */
export const MAX_REMINDERS_PER_HABIT = 40;

const pad = (n: number) => String(n).padStart(2, "0");

export const isValidTime = (t: unknown): t is string =>
	typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

const minutesOf = (t: string): number => {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + m;
};

const timeOf = (mins: number): string =>
	`${pad(Math.floor((mins % 1440) / 60))}:${pad(mins % 60)}`;

/**
 * Reminder times for one active day, sorted and de-duplicated.
 *
 * Explicit `times` win. Otherwise a window is spread across `target`
 * occurrences - by `intervalMinutes` when given, else evenly end-to-end.
 */
export const expandDayTimes = (perDay: PerDay, fallback = "09:00"): string[] => {
	const target = Math.max(1, Math.floor(perDay.target || 1));

	if (perDay.times?.length) {
		const valid = perDay.times.filter(isValidTime);
		return Array.from(new Set(valid)).sort(
			(a, b) => minutesOf(a) - minutesOf(b)
		);
	}

	const win = perDay.window;
	if (!win || !isValidTime(win.start)) {
		return [isValidTime(fallback) ? fallback : "09:00"];
	}

	const start = minutesOf(win.start);
	const end = isValidTime(win.end) ? minutesOf(win.end) : start;

	if (target === 1 || end <= start) return [timeOf(start)];

	const step = win.intervalMinutes
		? Math.max(1, Math.floor(win.intervalMinutes))
		: Math.floor((end - start) / (target - 1));

	const out: string[] = [];
	for (let i = 0; i < target; i++) {
		const at = start + step * i;
		if (at > end) break;
		out.push(timeOf(at));
	}
	// A window narrower than the requested count still yields at least the start.
	return out.length ? Array.from(new Set(out)) : [timeOf(start)];
};

/** Which weekdays a schedule fires on, or null when it is not day-restricted. */
export const activeWeekdays = (schedule: Schedule): number[] | null =>
	schedule.kind === "weekdays" && schedule.days?.length
		? Array.from(new Set(schedule.days)).filter((d) => d >= 0 && d <= 6).sort()
		: null;

/**
 * Is the habit expected on this date?
 *
 * "Flexible" schedules (N per week/month, N in X days) have no fixed days, so
 * every day is a valid opportunity - they are judged over the period, not per
 * day. Returning true for those keeps them loggable on any date.
 */
export const isActiveOn = (frequency: Frequency, date: Date): boolean => {
	const s = frequency.schedule;
	switch (s.kind) {
		case "weekdays": {
			const days = activeWeekdays(s);
			return !days || days.includes(date.getDay());
		}
		case "every_n_days": {
			const n = Math.max(1, Math.floor(s.n || 1));
			if (n === 1) return true;
			const anchor = s.anchorDate ? new Date(s.anchorDate) : null;
			if (!anchor || isNaN(anchor.getTime())) return true;
			const a = Date.UTC(
				anchor.getFullYear(),
				anchor.getMonth(),
				anchor.getDate()
			);
			const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
			const diff = Math.round((d - a) / 86400000);
			return diff >= 0 && diff % n === 0;
		}
		default:
			return true;
	}
};

/** Total reminders a habit will schedule: active days x times per day. */
export const reminderCount = (
	frequency: Frequency,
	fallbackTime?: string
): number => {
	const perDayCount = expandDayTimes(frequency.perDay, fallbackTime).length;
	const days = activeWeekdays(frequency.schedule);
	return perDayCount * (days ? days.length : 1);
};

// ---------------------------------------------------------------------------
// Legacy interop
// ---------------------------------------------------------------------------

/** The pre-existing flat shape, still on disk and in the cloud. */
export interface LegacyFrequency {
	type?: string;
	value?: number;
	secondValue?: number;
	days?: number[];
	startTime?: string;
	endTime?: string;
	intervalMinutes?: number;
}

const DEFAULT: Frequency = {
	schedule: { kind: "daily" },
	perDay: { target: 1 },
};

/**
 * Accepts the new shape, the legacy shape, or nothing, and always returns a
 * complete Frequency. This is the single point where old data becomes new -
 * every read path funnels through it.
 */
export const normalizeFrequency = (
	input: any,
	fallbackTime?: string
): Frequency => {
	if (!input || typeof input !== "object") return structuredCloneish(DEFAULT);

	// Already the new shape.
	if (input.schedule && input.perDay) {
		return {
			schedule: normalizeSchedule(input.schedule),
			perDay: normalizePerDay(input.perDay, fallbackTime),
		};
	}

	const legacy = input as LegacyFrequency;
	const value = Math.max(1, Math.floor(Number(legacy.value) || 1));

	switch (legacy.type) {
		case "specific_days":
			return {
				schedule: { kind: "weekdays", days: legacy.days || [] },
				perDay: { target: 1 },
			};
		case "times_per_day":
			return {
				schedule: { kind: "daily" },
				perDay: normalizePerDay(
					{
						target: value,
						window: {
							start: legacy.startTime || fallbackTime || "09:00",
							end: legacy.endTime || "21:00",
							intervalMinutes: legacy.intervalMinutes,
						},
					},
					fallbackTime
				),
			};
		case "every_n_days":
			return {
				schedule: { kind: "every_n_days", n: value },
				perDay: { target: 1 },
			};
		case "times_per_week":
			return {
				schedule: { kind: "times_per_week", n: value },
				perDay: { target: 1 },
			};
		case "times_per_month":
			return {
				schedule: { kind: "times_per_month", n: value },
				perDay: { target: 1 },
			};
		case "times_in_x_days":
			return {
				schedule: {
					kind: "times_in_days",
					n: value,
					days: Math.max(1, Math.floor(Number(legacy.secondValue) || 1)),
				},
				perDay: { target: 1 },
			};
		default:
			return { schedule: { kind: "daily" }, perDay: { target: 1 } };
	}
};

const normalizeSchedule = (s: any): Schedule => {
	switch (s?.kind) {
		case "weekdays":
			return { kind: "weekdays", days: Array.isArray(s.days) ? s.days : [] };
		case "every_n_days":
			return {
				kind: "every_n_days",
				n: Math.max(1, Math.floor(Number(s.n) || 1)),
				anchorDate: s.anchorDate,
			};
		case "times_per_week":
			return {
				kind: "times_per_week",
				n: Math.max(1, Math.floor(Number(s.n) || 1)),
			};
		case "times_per_month":
			return {
				kind: "times_per_month",
				n: Math.max(1, Math.floor(Number(s.n) || 1)),
			};
		case "times_in_days":
			return {
				kind: "times_in_days",
				n: Math.max(1, Math.floor(Number(s.n) || 1)),
				days: Math.max(1, Math.floor(Number(s.days) || 1)),
			};
		default:
			return { kind: "daily" };
	}
};

const normalizePerDay = (p: any, fallbackTime?: string): PerDay => {
	const times: string[] | undefined = Array.isArray(p?.times)
		? Array.from(new Set<string>(p.times.filter(isValidTime))).sort(
				(a, b) => minutesOf(a) - minutesOf(b)
		  )
		: undefined;

	const target = times?.length
		? times.length
		: Math.max(1, Math.floor(Number(p?.target) || 1));

	if (times?.length) return { target, times };

	if (p?.window && isValidTime(p.window.start)) {
		return {
			target,
			window: {
				start: p.window.start,
				end: isValidTime(p.window.end) ? p.window.end : p.window.start,
				intervalMinutes: p.window.intervalMinutes
					? Math.max(1, Math.floor(Number(p.window.intervalMinutes)))
					: undefined,
			},
		};
	}

	return target > 1
		? {
				target,
				window: { start: fallbackTime || "09:00", end: "21:00" },
		  }
		: { target };
};

/** Small structured clone that works on every RN engine. */
const structuredCloneish = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Back-compat: write the legacy flat columns alongside the new object, so an
// older build reading these rows still behaves.
// ---------------------------------------------------------------------------

export const toLegacyFrequency = (f: Frequency): Required<LegacyFrequency> => {
	const times = expandDayTimes(f.perDay);
	const s = f.schedule;

	const base = {
		value: 1,
		secondValue: undefined as any,
		days: [] as number[],
		startTime: undefined as any,
		endTime: undefined as any,
		intervalMinutes: undefined as any,
	};

	// A multi-time day is best represented to old builds as times_per_day.
	if (f.perDay.target > 1 || times.length > 1) {
		return {
			...base,
			type: "times_per_day",
			value: times.length,
			startTime: times[0],
			endTime: times[times.length - 1],
			intervalMinutes: f.perDay.window?.intervalMinutes,
			days: s.kind === "weekdays" ? s.days : [],
		} as Required<LegacyFrequency>;
	}

	switch (s.kind) {
		case "weekdays":
			return { ...base, type: "specific_days", days: s.days } as Required<LegacyFrequency>;
		case "every_n_days":
			return { ...base, type: "every_n_days", value: s.n } as Required<LegacyFrequency>;
		case "times_per_week":
			return { ...base, type: "times_per_week", value: s.n } as Required<LegacyFrequency>;
		case "times_per_month":
			return { ...base, type: "times_per_month", value: s.n } as Required<LegacyFrequency>;
		case "times_in_days":
			return {
				...base,
				type: "times_in_x_days",
				value: s.n,
				secondValue: s.days,
			} as unknown as Required<LegacyFrequency>;
		default:
			return { ...base, type: "daily" } as Required<LegacyFrequency>;
	}
};

/**
 * One-line human summary, for list rows and the picker button.
 *
 * `fallbackTime` is the habit's single reminder time. A once-a-day habit stores
 * no times inside `perDay` at all - the time lives in `notificationTime` - so
 * without this the summary would always claim 09:00, whatever the user picked.
 */
export const describeFrequency = (
	f: Frequency,
	fallbackTime?: string
): string => {
	const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const times = expandDayTimes(f.perDay, fallbackTime);
	const perDayText =
		times.length > 1 ? `${times.length}× a day` : times[0] ? times[0] : "";

	let dayText: string;
	const s = f.schedule;
	switch (s.kind) {
		case "weekdays": {
			const days = activeWeekdays(s);
			if (!days || days.length === 0) dayText = "Every day";
			else if (days.length === 7) dayText = "Every day";
			else if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d)))
				dayText = "Weekdays";
			else if (days.length === 2 && days.includes(0) && days.includes(6))
				dayText = "Weekends";
			else dayText = days.map((d) => DAY_NAMES[d]).join(", ");
			break;
		}
		case "every_n_days":
			dayText = s.n === 1 ? "Every day" : `Every ${s.n} days`;
			break;
		case "times_per_week":
			dayText = `${s.n}× a week`;
			break;
		case "times_per_month":
			dayText = `${s.n}× a month`;
			break;
		case "times_in_days":
			dayText = `${s.n}× in ${s.days} days`;
			break;
		default:
			dayText = "Every day";
	}

	return perDayText ? `${dayText} · ${perDayText}` : dayText;
};
