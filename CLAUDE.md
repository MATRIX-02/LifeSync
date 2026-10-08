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

**There is no test runner and no linter.** Don't claim tests pass; `tsc --noEmit` is the whole verification story. It currently reports 6 pre-existing errors — capture a baseline before editing so you can tell yours apart from the noise.

**Expo Go will not run this app.** Two custom config plugins (`plugins/withSmsPermission.js`, `plugins/withNotificationListener.js`) plus native modules (`react-native-android-notification-listener`, `react-native-get-sms-android`, `react-native-sound-level`) require a dev build. `android/` and `ios/` are prebuild output and gitignored.

## Entry point and dead code

`package.json` sets `main: index.js` (which loads `expo-router/entry`), so **routing is file-based under `app/`**.

Two route-naming traps in `app/(tabs)/`:
- **`two.tsx` is the Settings screen** (`export default function SettingsScreen`), not a second tab.
- `(tabs)/_layout.tsx` renders a **`Stack`**, not tabs. Navigation is a custom drawer (`SharedDrawer`).

Screens are large and self-contained; feature UI is often inline rather than extracted.

- **Habit create and edit share one form:** `src/components/habits/HabitFormModal.tsx`, rendered by `app/(tabs)/index.tsx` (create) and `app/(tabs)/statistics.tsx` (edit). The modal only collects values; each screen does its own persistence and reminder scheduling.
- **Styles:** big files import `createStyles` from a sibling `*.styles.ts`. Screen styles live in `src/styles/`, because any file under `app/` becomes a route.
- **Split Wise** lives in `src/components/finance/splitwise/` (one file per view/modal).

## State: `*StoreDB` vs legacy stores

Zustand throughout, but in two generations:

| Store | Reality |
|---|---|
| `habitStoreDB.ts` | Genuinely database-first — every operation hits Supabase directly |
| `financeStoreDB/` | Genuinely database-first — every mutator is `async` and writes to Supabase. Its `types.ts` re-exports `src/types/finance.ts`; do not fork a local copy, the divergence silently dropped fields |
| `workoutStoreDB/` | Database-first workout store |

The legacy AsyncStorage stores (`habitStore.ts`, `workoutStore.ts`, `financeStore.ts`) have been deleted.

**Watch for shadowed modules.** `src/context/financeStoreDB.ts` (a shim) sat next to `src/context/financeStoreDB/` (a complete database-first store) for a long time. Metro resolves `"./financeStoreDB"` to the **file**, not the directory, so the real store was dead code and the whole Money Hub silently ran on the legacy AsyncStorage store. The shim has been deleted. If you add a `*StoreDB.ts` alongside a `*StoreDB/`, you will reintroduce this (it happened again with `studyStoreDB`).

`useSyncManager` (mounted in the root layout) calls `store.initialize(userId)` for habits/workouts/finance on auth, and `src/services/syncService.ts` provides explicit `syncXToCloud` / `fetchXFromCloud` plus auto-sync on a user-set interval.

## Supabase persistence — the sharp edge

Schema lives **remotely only**. `.env.local` holds just `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the anon key goes through PostgREST, which exposes **no DDL**. There are no migration files in the repo: schema changes are written and run by hand in the Supabase dashboard SQL editor. `scripts/schema-audit.sql` / `scripts/check-schema.mjs` report what the live schema actually has.

Two consequences that will bite:

**1. An unknown column hard-fails the whole write.** Stores convert camelCase → snake_case and spread leftover fields straight into an insert/update. Adding any field to the `Habit` type therefore adds a column to the payload, and PostgREST rejects the entire request with a schema-cache error. Adding a field to a persisted type **requires adding the column in Supabase first**, or you break creation and editing.

**2. `Habit.frequency` is flattened, not stored as JSON.** It is destructured into `frequency_type` / `frequency_value` / `frequency_second_value` / `frequency_days` / `frequency_start_time` / `frequency_end_time` / `frequency_interval_minutes` and rebuilt on read, at **four separate sites**:

- `src/context/habitStoreDB.ts` — `dbHabitToHabit` (read) and `habitToDbHabit` (write)
- `src/services/syncService.ts` — the `user_habits` upsert (write) and `fetchHabitsFromCloud` (read)

Miss one and the field is silently dropped on save or lost on cloud restore. Anything not listed in these mappers does not persist, regardless of what the TypeScript type says.

**3. `jsonb` columns take arrays, not strings.** `savings_goals.contributions`, `finance_debts.payments` and `split_groups.members` / `expenses` / `settlements` are all `jsonb`. `JSON.stringify`-ing them double-encodes — a JSON *string* lands inside the jsonb column instead of an array. Pass the array through. The read paths tolerate both (`typeof x === "string" ? JSON.parse(x) : x`), which is what let this go unnoticed.

## Notifications

`src/services/notificationService.ts` is a single static class serving **every** module — habits, bills, water, pomodoro, fasting. Each notification carries a `data.type` discriminator (`habit_reminder`, `bill_reminder`, `water_reminder`, …).

Because all modules share one queue, **never call `cancelAllNotifications()`** outside an explicit user "clear everything" action. Cancel by filtering on the `data` payload instead — `cancelHabitNotifications(habitId)`, `cancelAllHabitNotifications()`, `cancelBillReminder(billId)`, and friends. Only habit reminders are rescheduled on launch, so a blanket cancel permanently destroys every other module's reminders.

`scheduleHabitReminders(habit)` is frequency-aware: `specific_days` produces one WEEKLY trigger per day, `times_per_day` expands a start/end/interval window into N DAILY triggers, everything else gets a single DAILY trigger. Notification ids are deliberately **not** persisted — cancellation matches on the payload.

Android channels (`habit-reminders`, `hydration-reminders`, `pomodoro-timer`, `fasting-timer`, `default`) are created in `requestPermissions()` and per-feature schedulers.

**`Habit.alarmEnabled` and `ringtoneEnabled` are inert.** Both modals toggle and persist them, and `AudioService.playRingtone()` exists, but nothing reads either flag — the alarm feature is unimplemented UI.

## Conventions

- **Use the custom Alert**: `import { Alert } from "@/src/components/CustomAlert"` — never React Native's `Alert`. Same `.alert(title, message, buttons)` shape plus `.success/.error/.warning`. Requires `AlertProvider`, mounted in the root layout. Several recent commits exist purely to migrate stragglers.
- **Theming**: `const theme = useColors()` returns the full palette; screens build styles via a module-level `const createStyles = (theme: Theme) => StyleSheet.create({...})`. Don't hardcode colors.
- **Path alias**: `@/*` maps to the repo root (`@/src/...`).
- **Formatting**: tabs, not spaces. There is no prettier config or dependency — running prettier with defaults will reformat entire files and bury your diff. If you must format, restrict it to `--use-tabs` on the exact files you touched.
- **Feature gating**: `useSubscriptionCheck()` (`src/components/PremiumFeatureGate.tsx`) supplies `canAddHabit(count)`, `canAddAccount`, etc. against plan limits from the DB, where `-1` means unlimited. `moduleContext.ts` separately lets users disable whole modules (`habits | workout | finance`).

## Removed: Study Hub

The Study module was removed; its code is preserved on the `archive/study-hub` branch. Its Supabase tables (`study_*`, `flashcard*`, `revision_schedule`, `mock_tests`, `daily_plans`) still exist and still hold users' rows; "delete all cloud data" clears them. On launch the app cancels leftover study notifications and deletes the `study-reminders` channel.

## Releasing

Tag-driven: pushing to `main` releases nothing. `npm run release -- patch|minor|major` (on `main`, clean tree) bumps `expo.version` **and** `expo.android.versionCode` in `app.json`, creates `docs/releases/vX.Y.Z.md` for user-facing notes, commits and tags - without pushing. Pushing the `vX.Y.Z` tag runs `.github/workflows/release-apk.yml`, which builds a signed APK and publishes the GitHub Release. Full process, secrets and the no-Actions fallback: `docs/RELEASING.md`.

- Never build a release with the debug key - it can't install over existing installs. The workflow refuses to.
- Release notes are for users: plain language, grouped by module, no file paths.
- `EXPO_PUBLIC_*` values ship inside the APK. Never put a server secret in one.

## Setup docs

`docs/` covers the external integrations that can't be inferred from code — `SUPABASE_SETUP.md`, `RLS_SETUP_FIX.md`, `GOOGLE_OAUTH_*.md`, `RAZORPAY_PHONEPE_SETUP.md`, `TRANSACTION_DETECTION_SETUP.md`. `README.md` predates the multi-module rewrite and describes a habits-only app; treat it as historical.
