-- finance_categories
--
-- Per-user finance category preferences:
--   * custom categories (is_builtin = false) the user created themselves
--   * hidden built-in categories (is_builtin = true, hidden = true), so the
--     built-in lists in src/types/finance.ts can be trimmed per user.
--
-- Transactions keep storing only the category `key` string. Custom keys look
-- like "custom_ab12cd34"; built-in keys are unchanged. Hiding or deleting a
-- category therefore never touches existing transactions.
--
-- Run this in the Supabase dashboard SQL editor. Nothing in the repo applies
-- migrations automatically.

create table if not exists public.finance_categories (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	type text not null check (type in ('expense', 'income')),
	key text not null,
	name text not null,
	icon text not null default 'pricetag',
	color text not null default '#95A5A6',
	is_builtin boolean not null default false,
	hidden boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, type, key)
);

create index if not exists finance_categories_user_idx
	on public.finance_categories (user_id);

alter table public.finance_categories enable row level security;

drop policy if exists "finance_categories_select_own" on public.finance_categories;
create policy "finance_categories_select_own" on public.finance_categories
	for select using (auth.uid() = user_id);

drop policy if exists "finance_categories_insert_own" on public.finance_categories;
create policy "finance_categories_insert_own" on public.finance_categories
	for insert with check (auth.uid() = user_id);

drop policy if exists "finance_categories_update_own" on public.finance_categories;
create policy "finance_categories_update_own" on public.finance_categories
	for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finance_categories_delete_own" on public.finance_categories;
create policy "finance_categories_delete_own" on public.finance_categories
	for delete using (auth.uid() = user_id);
