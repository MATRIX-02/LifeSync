-- finance_accounts.linked_digits
--
-- The last 4 digits of the account number and/or cards that belong to an
-- account, e.g. {'1234','9012'} for a savings account and its debit card.
-- Bank SMS / UPI alerts quote these ("A/c XX1234", "Card XX9012"), and
-- auto-detected transactions are matched to the account that lists them.
--
-- Set from the account form ("Card / account ending in") or from the
-- detected-payment review sheet ("Always use this account for ••1234").
--
-- Run this in the Supabase dashboard SQL editor. Nothing in the repo applies
-- migrations automatically. Until it is run, the app keeps working and saves
-- accounts without the digits (it retries without the column).

alter table public.finance_accounts
	add column if not exists linked_digits text[] not null default '{}';

-- Make PostgREST pick up the new column immediately.
notify pgrst, 'reload schema';
