# Stored closing balances

Each row in `finance_transactions` stores its closing balances:

| Column | Meaning |
|---|---|
| `account_balance_after` | Balance of `account_id` right after this transaction |
| `to_account_balance_after` | Balance of `to_account_id` right after it (transfers only) |
| `total_balance_after` | Sum of all the user's account balances right after it |

The balances are kept up to date by a trigger on the server, not by the app.
Inserting, editing or deleting a transaction, including a backdated one,
recomputes every later row. So does changing an account's balance by hand.

"Right after" uses the same order as the app's list: `date`, then `time`,
then `created_at`, then `id`, newest first. Each balance is worked out
backwards from the account's current `balance`. This matches how the app
calculated it on the device before.

The trigger is `DEFERRABLE INITIALLY DEFERRED`, so it runs at commit time. By
then the `finance_*_transaction` RPC has updated both the transaction and the
account balance. A bulk delete recomputes once per transaction, not once per
row.

## Setup (run once in the Supabase SQL editor)

```sql
-- 1. Columns
alter table public.finance_transactions
	add column if not exists account_balance_after numeric,
	add column if not exists to_account_balance_after numeric,
	add column if not exists total_balance_after numeric;

-- Supports the app's paged, newest-first query.
create index if not exists finance_transactions_user_order_idx
	on public.finance_transactions (user_id, date desc, time desc, created_at desc, id desc);

-- 2. Recompute every running balance for one user
create or replace function public.finance_recompute_balances(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_key text := 'lifesync.balances_done_' || replace(p_user::text, '-', '');
	v_txid text := txid_current()::text;
begin
	-- Once per user per database transaction.
	if current_setting(v_key, true) = v_txid then
		return;
	end if;
	perform set_config(v_key, v_txid, true);

	with effects as (
		-- What each transaction did to each account it touched.
		select t.id, t.account_id as acc, 'from'::text as side,
			case when t.type = 'income' then t.amount else -t.amount end as delta,
			t.date, coalesce(t.time::text, '') as tm, t.created_at
		from finance_transactions t
		where t.user_id = p_user
		union all
		select t.id, t.to_account_id, 'to',
			t.amount,
			t.date, coalesce(t.time::text, ''), t.created_at
		from finance_transactions t
		where t.user_id = p_user and t.to_account_id is not null
	),
	per_account as (
		select e.id, e.side,
			a.balance - coalesce(sum(e.delta) over (
				partition by e.acc
				order by e.date desc, e.tm desc, e.created_at desc, e.id desc, e.side desc
				rows between unbounded preceding and 1 preceding
			), 0) as bal
		from effects e
		join finance_accounts a on a.id = e.acc
	),
	totals as (
		-- Transfers move money between the user's own accounts, so they
		-- don't change the total.
		select t.id,
			(select coalesce(sum(balance), 0) from finance_accounts where user_id = p_user)
			- coalesce(sum(case t.type when 'income' then t.amount
			                           when 'expense' then -t.amount
			                           else 0 end) over (
				order by t.date desc, coalesce(t.time::text, '') desc, t.created_at desc, t.id desc
				rows between unbounded preceding and 1 preceding
			), 0) as total
		from finance_transactions t
		where t.user_id = p_user
	),
	computed as (
		select x.id,
			(select bal from per_account p where p.id = x.id and p.side = 'from') as acc_bal,
			(select bal from per_account p where p.id = x.id and p.side = 'to') as to_bal,
			x.total
		from totals x
	)
	update finance_transactions t
	set account_balance_after = c.acc_bal,
		to_account_balance_after = c.to_bal,
		total_balance_after = c.total
	from computed c
	where t.id = c.id
		and (t.account_balance_after is distinct from c.acc_bal
			or t.to_account_balance_after is distinct from c.to_bal
			or t.total_balance_after is distinct from c.total);
end;
$$;

-- Only the trigger (running as the owner) may call this; it takes any user id.
revoke all on function public.finance_recompute_balances(uuid) from public, anon, authenticated;

-- 3. Triggers
create or replace function public.finance_balances_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if tg_op in ('INSERT', 'UPDATE') then
		perform finance_recompute_balances(new.user_id);
	end if;
	if tg_op in ('DELETE', 'UPDATE') and (tg_op = 'DELETE' or old.user_id is distinct from new.user_id) then
		perform finance_recompute_balances(old.user_id);
	end if;
	return null;
end;
$$;

drop trigger if exists finance_transactions_balances on public.finance_transactions;
-- UPDATE OF lists only the columns that affect balances. The recompute itself
-- writes only the *_balance_after columns, so it can't re-trigger.
create constraint trigger finance_transactions_balances
	after insert or delete or update of amount, type, account_id, to_account_id, date, time, created_at, user_id
	on public.finance_transactions
	deferrable initially deferred
	for each row execute function public.finance_balances_trigger();

drop trigger if exists finance_accounts_balances on public.finance_accounts;
create constraint trigger finance_accounts_balances
	after insert or delete or update of balance, user_id
	on public.finance_accounts
	deferrable initially deferred
	for each row execute function public.finance_balances_trigger();

-- 4. Backfill existing rows
do $$
declare u uuid;
begin
	for u in select distinct user_id from finance_transactions loop
		perform finance_recompute_balances(u);
	end loop;
end $$;
```

## Checking it

```sql
select date, time, type, amount, account_balance_after, total_balance_after
from finance_transactions
where user_id = '<your user id>'
order by date desc, time desc, created_at desc
limit 20;
```

The newest row's `account_balance_after` should equal that account's current
`balance`.

Until this SQL has been run, the columns are missing and the app falls back
to calculating closing balances on the device.
