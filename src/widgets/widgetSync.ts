// Keeps the home screen widgets in step with the app.
//
// Widgets render in a headless JS task that may run with LifeSync closed, when
// the stores are empty. So the app writes a small snapshot per widget to
// AsyncStorage whenever its data (or the theme) changes, and the widget task
// renders from those. Snapshots from an earlier day are adjusted on read (no
// habits done, nothing spent today) until the app next opens.
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useFinanceCategoryStore } from "../context/financeCategoryStore";
import { useFinanceStore } from "../context/financeStoreDB";
import { useHabitStore } from "../context/habitStoreDB";
import type { Theme } from "../context/themeContext";
import { FINANCE_WIDGET, FinanceSnapshot, FinanceWidget } from "./FinanceWidget";
import { TODAY_HABITS_WIDGET, TodayHabitsWidget, WidgetHabit } from "./TodayHabitsWidget";
import { readWidgetColors, WidgetColors, widgetColorsFromTheme, writeWidgetColors } from "./widgetTheme";

const HABITS_KEY = "widget:today-habits";
const FINANCE_KEY = "widget:finance";

export interface HabitSnapshot {
	date: string; // YYYY-MM-DD, local
	signedIn: boolean;
	habits: WidgetHabit[];
}

export const todayKey = (d = new Date()) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function readJson<T>(key: string): Promise<T | null> {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

// ============== HABITS ==============

export async function readHabitSnapshot(): Promise<HabitSnapshot> {
	const snap = await readJson<HabitSnapshot>(HABITS_KEY);
	if (!snap) return { date: todayKey(), signedIn: false, habits: [] };
	if (snap.date === todayKey()) return snap;
	return { ...snap, date: todayKey(), habits: snap.habits.map((h) => ({ ...h, done: 0 })) };
}

export const writeHabitSnapshot = (snap: HabitSnapshot) => AsyncStorage.setItem(HABITS_KEY, JSON.stringify(snap));

/** Today's due habits, from the loaded store. */
function buildHabitSnapshot(): HabitSnapshot {
	const store = useHabitStore.getState();
	const today = new Date();
	const habits = store
		.getActiveHabits()
		.filter((h) => store.isHabitActiveOnDate(h.id, today))
		.map((h) => {
			const { done, target } = store.getProgressForDate(h.id, today);
			return { id: h.id, name: h.name, color: h.color, done, target: Math.max(1, target) };
		});
	return { date: todayKey(), signedIn: !!store.userId, habits };
}

export const renderHabitWidget = (snap: HabitSnapshot, colors: WidgetColors, width: number) =>
	React.createElement(TodayHabitsWidget, { habits: snap.habits, signedIn: snap.signedIn, colors, width });

// ============== FINANCE ==============

const monthName = (d = new Date()) => d.toLocaleDateString("en-US", { month: "long" });

export async function readFinanceSnapshot(): Promise<FinanceSnapshot> {
	const snap = await readJson<FinanceSnapshot>(FINANCE_KEY);
	if (!snap) {
		return {
			date: todayKey(),
			month: monthName(),
			signedIn: false,
			currency: "₹",
			monthSpent: 0,
			monthIncome: 0,
			todaySpent: 0,
			recent: [],
		};
	}
	if (snap.date === todayKey()) return snap;
	const newMonth = snap.date.slice(0, 7) !== todayKey().slice(0, 7);
	return {
		...snap,
		date: todayKey(),
		todaySpent: 0,
		...(newMonth ? { month: monthName(), monthSpent: 0, monthIncome: 0 } : null),
	};
}

const humanize = (key: string) => key.replace(/^custom_/, "").replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function buildFinanceSnapshot(): FinanceSnapshot {
	const store = useFinanceStore.getState();
	const categories = useFinanceCategoryStore.getState().rows;
	const categoryName = (key: string) => categories.find((c) => c.key === key)?.name ?? humanize(key);
	const today = todayKey();
	const month = today.slice(0, 7);
	// Transaction dates are ISO strings or YYYY-MM-DD; compare by local day.
	const dayOf = (iso: string) => (iso.length <= 10 ? iso : todayKey(new Date(iso)));

	let monthSpent = 0;
	let monthIncome = 0;
	let todaySpent = 0;
	for (const t of store.transactions) {
		const day = dayOf(t.date);
		if (day.slice(0, 7) !== month) continue;
		if (t.type === "expense") {
			monthSpent += t.amount;
			if (day === today) todaySpent += t.amount;
		} else if (t.type === "income") {
			monthIncome += t.amount;
		}
	}

	const recent = [...store.transactions]
		.sort((a, b) => `${b.date} ${b.time ?? ""}`.localeCompare(`${a.date} ${a.time ?? ""}`))
		.slice(0, 20)
		.map((t) => {
			const d = new Date(dayOf(t.date) + "T12:00:00");
			const when = dayOf(t.date) === today ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
			const label = t.type === "transfer" ? "Transfer" : categoryName(t.category);
			return {
				id: t.id,
				title: t.description?.trim() || label,
				subtitle: t.description?.trim() ? `${label} · ${when}` : when,
				amount: t.amount,
				type: t.type,
			};
		});

	return {
		date: today,
		month: monthName(),
		signedIn: !!store.userId,
		currency: store.currency || "₹",
		monthSpent,
		monthIncome,
		todaySpent,
		recent,
	};
}

export const renderFinanceWidget = (snap: FinanceSnapshot, colors: WidgetColors) =>
	React.createElement(FinanceWidget, { data: snap, colors });

// ============== REDRAW ==============

async function redraw(widgetName: string, render: (info: { width: number }) => React.JSX.Element) {
	if (Platform.OS !== "android") return;
	try {
		const { requestWidgetUpdate } = require("react-native-android-widget");
		await requestWidgetUpdate({ widgetName, renderWidget: render, widgetNotFound: () => undefined });
	} catch {
		// Native module missing (older build) - nothing to update.
	}
}

export async function refreshHabitWidget(snap?: HabitSnapshot, colors?: WidgetColors) {
	const s = snap ?? (await readHabitSnapshot());
	const c = colors ?? (await readWidgetColors());
	await redraw(TODAY_HABITS_WIDGET, (info) => renderHabitWidget(s, c, info.width));
}

export async function refreshFinanceWidget(snap?: FinanceSnapshot, colors?: WidgetColors) {
	const s = snap ?? (await readFinanceSnapshot());
	const c = colors ?? (await readWidgetColors());
	await redraw(FINANCE_WIDGET, () => renderFinanceWidget(s, c));
}

/** Calls fn at most once per `ms`, after the last call. */
function debounce(fn: () => void, ms: number) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const run = () => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
	};
	run.cancel = () => clearTimeout(timer);
	return run;
}

/** Mounted once in the root layout: mirrors data and theme changes to the widgets. */
export function useWidgetSync(theme: Theme): void {
	const colors = widgetColorsFromTheme(theme);
	const colorKey = Object.values(colors).join();

	useEffect(() => {
		if (Platform.OS !== "android") return;
		void writeWidgetColors(colors);

		const syncHabits = debounce(async () => {
			const store = useHabitStore.getState();
			// Before the first load an empty list means "not loaded", not "no habits".
			if (store.userId && !store.hasLoaded) return;
			const snap = buildHabitSnapshot();
			await writeHabitSnapshot(snap);
			await refreshHabitWidget(snap, colors);
		}, 500);

		const syncFinance = debounce(async () => {
			const store = useFinanceStore.getState();
			if (store.userId && store.isLoading) return;
			const snap = buildFinanceSnapshot();
			await AsyncStorage.setItem(FINANCE_KEY, JSON.stringify(snap));
			await refreshFinanceWidget(snap, colors);
		}, 500);

		syncHabits();
		syncFinance();
		const unsubHabits = useHabitStore.subscribe((s, p) => {
			if (s.habits !== p.habits || s.logs !== p.logs || s.userId !== p.userId || s.hasLoaded !== p.hasLoaded) {
				syncHabits();
			}
		});
		const unsubFinance = useFinanceStore.subscribe((s, p) => {
			if (
				s.transactions !== p.transactions ||
				s.currency !== p.currency ||
				s.userId !== p.userId ||
				s.isLoading !== p.isLoading
			) {
				syncFinance();
			}
		});
		const unsubCategories = useFinanceCategoryStore.subscribe((s, p) => {
			if (s.rows !== p.rows) syncFinance();
		});
		return () => {
			syncHabits.cancel();
			syncFinance.cancel();
			unsubHabits();
			unsubFinance();
			unsubCategories();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [colorKey]);
}
