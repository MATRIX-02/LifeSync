-- Finance category columns: accept any category key + savings goal category
--
-- Custom categories are stored as "custom_xxxxxxxx" keys, and income now has
-- keys (bonus, cashback, ...) that older schemas never listed. If any of the
-- category columns below were created with a CHECK constraint or a Postgres
-- enum limited to the original keys, saving those transactions/budgets/bills
-- fails. This migration:
--   1. converts any enum-typed `category` column to plain text
--   2. drops every CHECK constraint that mentions `category` on those tables
--   3. adds savings_goals.category (savings goals can now be tagged)
--
-- Safe to re-run. Run in the Supabase dashboard SQL editor; nothing in the
-- repo applies migrations automatically. Run 20261007_finance_categories.sql
-- too if you haven't yet.

do $$
declare
	t text;
	c record;
begin
	foreach t in array array[
		'finance_transactions',
		'recurring_transactions',
		'finance_budgets',
		'bill_reminders',
		'savings_goals'
	] loop
		if to_regclass('public.' || t) is null then
			continue;
		end if;

		-- 1. enum -> text
		if exists (
			select 1 from information_schema.columns
			where table_schema = 'public' and table_name = t
				and column_name = 'category' and data_type = 'USER-DEFINED'
		) then
			execute format(
				'alter table public.%I alter column category type text using category::text',
				t
			);
		end if;

		-- 2. drop CHECK constraints referencing category
		for c in
			select con.conname
			from pg_constraint con
			where con.conrelid = ('public.' || t)::regclass
				and con.contype = 'c'
				and pg_get_constraintdef(con.oid) ilike '%category%'
		loop
			execute format('alter table public.%I drop constraint %I', t, c.conname);
		end loop;
	end loop;
end $$;

alter table public.savings_goals add column if not exists category text;

-- Make PostgREST pick up the new column immediately.
notify pgrst, 'reload schema';
