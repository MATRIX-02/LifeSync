# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start          # Expo dev server
npm run android        # expo run:android (builds + installs a dev build)
npm run ios            # expo run:ios (Mac only)
npx tsc --noEmit       # the only static check in the repo
eas build -p android --profile preview   # APK; profiles: development | preview | production
```

**There is no test runner and no linter.** `components/__tests__/StyledText-test.js` is orphaned — no jest config, no jest dependency, no test script. Don't claim tests pass; `tsc --noEmit` is the whole verification story. It currently reports 13 pre-existing errors — capture a baseline before editing so you can tell yours apart from the noise.

**Expo Go will not run this app.** Two custom config plugins (`plugins/withSmsPermission.js`, `plugins/withNotificationListener.js`) plus native modules (`react-native-android-notification-listener`, `react-native-get-sms-android`, `react-native-sound-level`) require a dev build. `android/` and `ios/` are prebuild output and gitignored.

## Entry point and dead code

`package.json` sets `main: expo-router/entry`, so **routing is file-based under `app/`**.

`AppEntry.tsx`, `src/navigation/RootNavigator.tsx`, `src/features/habit-tracker/`, and `src/features/settings/` are an older React Navigation entry path that **nothing imports**. Editing `src/features/habit-tracker/screens/HabitTrackerScreen.tsx` changes nothing users see — it is a stale duplicate of the real habits screen. Verify with a grep for importers before working in `src/features/` or `src/navigation/`.

Two route-naming traps in `app/(tabs)/`:
- **`two.tsx` is the Settings screen** (`export default function SettingsScreen`), not a second tab.
- `(tabs)/_layout.tsx` renders a **`Stack`**, not tabs. Navigation is a custom drawer (`SharedDrawer`).

Screens are large and self-contained; feature UI is usually inline rather than extracted:
- `app/(tabs)/index.tsx` (~4000 lines) — habits list **and** the Create Habit modal
- `app/(tabs)/statistics.tsx` (~3000 lines) — habit stats **and** the Edit Habit modal

A change to habit creation almost always needs the matching change in the edit modal, in the other file.

## State: `*StoreDB` vs legacy stores

Zustand throughout, but in two generations:

| Store | Reality |
|---|---|
| `habitStoreDB.ts` | Genuinely database-first — every operation hits Supabase directly |
| `financeStoreDB/` | Genuinely database-first — every mutator is `async` and writes to Supabase. Its `types.ts` re-exports `src/types/finance.ts`; do not fork a local copy, the divergence silently dropped fields |
| `workoutStoreDB.ts` | **Re-export shim** over the legacy store (`export { useWorkoutStore } from "./workoutStore"`) |
| `habitStore.ts`, `financeStore.ts` | Legacy AsyncStorage + `persist`. `habitStore` is still imported by `moduleContext.ts`; `financeStore` is now only referenced by the dead `SettingsScreen` |

So `habitStore.ts` and `habitStoreDB.ts` are **different stores with different data**. App code should use `habitStoreDB`; be aware `moduleContext.toggleModule` reads the legacy one when rescheduling notifications.

**Watch for shadowed modules.** `src/context/financeStoreDB.ts` (a shim) sat next to `src/context/financeStoreDB/` (a complete database-first store) for a long time. Metro resolves `"./financeStoreDB"` to the **file**, not the directory, so the real store was dead code and the whole Money Hub silently ran on the legacy AsyncStorage store. The shim has been deleted. If you add a `*StoreDB.ts` alongside a `*StoreDB/`, you will reintroduce this.

`useSyncManager` (mounted in the root layout) calls `store.initialize(userId)` for habits/workouts/finance on auth, and `src/services/syncService.ts` provides explicit `syncXToCloud` / `fetchXFromCloud` plus auto-sync on a user-set interval.

## Supabase persistence — the sharp edge

Schema lives **remotely only**. `.env.local` holds just `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the anon key goes through PostgREST, which exposes **no DDL**. `supabase/migrations/*.sql` files here are not applied by anything — they must be run by hand in the Supabase dashboard SQL editor.

Two consequences that will bite:

**1. An unknown column hard-fails the whole write.** Stores convert camelCase → snake_case and spread leftover fields straight into an insert/update. Adding any field to the `Habit` type therefore adds a column to the payload, and PostgREST rejects the entire request with a schema-cache error. Adding a field to a persisted type **requires a migration first**, or you break creation and editing.

**2. `Habit.frequency` is flattened, not stored as JSON.** It is destructured into `frequency_type` / `frequency_value` / `frequency_second_value` / `frequency_days` / `frequency_start_time` / `frequency_end_time` / `frequency_interval_minutes` and rebuilt on read, at **four separate sites**:

- `src/context/habitStoreDB.ts` — `dbHabitToHabit` (read) and `habitToDbHabit` (write)
- `src/services/syncService.ts` — the `user_habits` upsert (write) and `fetchHabitsFromCloud` (read)

Miss one and the field is silently dropped on save or lost on cloud restore. Anything not listed in these mappers does not persist, regardless of what the TypeScript type says.

**3. `jsonb` columns take arrays, not strings.** `savings_goals.contributions`, `finance_debts.payments` and `split_groups.members` / `expenses` / `settlements` are all `jsonb`. `JSON.stringify`-ing them double-encodes — a JSON *string* lands inside the jsonb column instead of an array. Pass the array through. The read paths tolerate both (`typeof x === "string" ? JSON.parse(x) : x`), which is what let this go unnoticed.

## Notifications

`src/services/notificationService.ts` is a single static class serving **every** module — habits, bills, water, study/revision/goals, pomodoro, fasting. Each notification carries a `data.type` discriminator (`habit_reminder`, `bill_reminder`, `water_reminder`, …).

Because all modules share one queue, **never call `cancelAllNotifications()`** outside an explicit user "clear everything" action. Cancel by filtering on the `data` payload instead — `cancelHabitNotifications(habitId)`, `cancelAllHabitNotifications()`, `cancelBillReminder(billId)`, and friends. Only habit reminders are rescheduled on launch, so a blanket cancel permanently destroys every other module's reminders.

`scheduleHabitReminders(habit)` is frequency-aware: `specific_days` produces one WEEKLY trigger per day, `times_per_day` expands a start/end/interval window into N DAILY triggers, everything else gets a single DAILY trigger. Notification ids are deliberately **not** persisted — cancellation matches on the payload.

Android channels (`habit-reminders`, `study-reminders`, `hydration-reminders`, `pomodoro-timer`, `fasting-timer`, `default`) are created in `requestPermissions()` and per-feature schedulers.

**`Habit.alarmEnabled` and `ringtoneEnabled` are inert.** Both modals toggle and persist them, and `AudioService.playRingtone()` exists, but nothing reads either flag — the alarm feature is unimplemented UI.

## Conventions

- **Use the custom Alert**: `import { Alert } from "@/src/components/CustomAlert"` — never React Native's `Alert`. Same `.alert(title, message, buttons)` shape plus `.success/.error/.warning`. Requires `AlertProvider`, mounted in the root layout. Several recent commits exist purely to migrate stragglers.
- **Theming**: `const theme = useColors()` returns the full palette; screens build styles via a module-level `const createStyles = (theme: Theme) => StyleSheet.create({...})`. Don't hardcode colors.
- **Path alias**: `@/*` maps to the repo root (`@/src/...`).
- **Formatting**: tabs, not spaces. There is no prettier config or dependency — running prettier with defaults will reformat entire files and bury your diff. If you must format, restrict it to `--use-tabs` on the exact files you touched.
- **Feature gating**: `useSubscriptionCheck()` (`src/components/PremiumFeatureGate.tsx`) supplies `canAddHabit(count)`, `canAddAccount`, etc. against plan limits from the DB, where `-1` means unlimited. `moduleContext.ts` separately lets users disable whole modules (`habits | workout | finance | study`).

## Setup docs

`docs/` covers the external integrations that can't be inferred from code — `SUPABASE_SETUP.md`, `RLS_SETUP_FIX.md`, `GOOGLE_OAUTH_*.md`, `RAZORPAY_PHONEPE_SETUP.md`, `TRANSACTION_DETECTION_SETUP.md`. `README.md` and `ARCHITECTURE.md` predate the multi-module rewrite and describe a habits-only app at an old path; treat them as historical.
