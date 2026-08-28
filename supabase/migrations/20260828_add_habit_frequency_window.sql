-- Adds the "times_per_day" reminder window to habits.
--
-- A times_per_day habit no longer stores a single reminder time. Instead it
-- stores a window (start -> end) and the gap between occurrences; the client
-- expands that into one daily notification per slot.
--
-- All three columns are nullable and unused by every other frequency type, so
-- existing rows need no backfill.

ALTER TABLE public.user_habits
	ADD COLUMN IF NOT EXISTS frequency_start_time text,
	ADD COLUMN IF NOT EXISTS frequency_end_time text,
	ADD COLUMN IF NOT EXISTS frequency_interval_minutes integer;

COMMENT ON COLUMN public.user_habits.frequency_start_time IS
	'HH:mm — first reminder of the day for times_per_day habits';
COMMENT ON COLUMN public.user_habits.frequency_end_time IS
	'HH:mm — no reminder is scheduled after this for times_per_day habits';
COMMENT ON COLUMN public.user_habits.frequency_interval_minutes IS
	'Minutes between reminders for times_per_day habits';
