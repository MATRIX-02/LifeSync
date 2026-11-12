-- Monthly budget & bill reports (see docs/FINANCE_MONTHLY_REPORTS.md).
-- Run once in the Supabase SQL editor.

create table if not exists public.finance_monthly_reports (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	month text not null check (month ~ '^\d{4}-\d{2}$'),  -- "YYYY-MM"
	budgets jsonb not null default '[]'::jsonb,  -- [{budgetId, category, limit, spent}]
	bills jsonb not null default '[]'::jsonb,    -- [{billId, name, amount, category, dueDate, isPaid, paidDate}]
	total_budget numeric not null default 0,
	total_spent numeric not null default 0,
	bills_total numeric not null default 0,
	bills_paid numeric not null default 0,
	estimated boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, month)
);

alter table public.finance_monthly_reports enable row level security;

drop policy if exists "Users can manage their own monthly reports" on public.finance_monthly_reports;
create policy "Users can manage their own monthly reports"
	on public.finance_monthly_reports for all to authenticated
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);
