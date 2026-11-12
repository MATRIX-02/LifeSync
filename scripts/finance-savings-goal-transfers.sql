-- Savings goal <-> account moves as real transactions.
-- Run once in the Supabase SQL editor, AFTER finance-closing-balance-part2.sql.
-- Safe to re-run.
--
-- Convention: a goal move is a finance_transactions row with
--   type = 'transfer', category = 'savings_goal', to_account_id = null
--   amount > 0  -> money moved from the account INTO the goal
--   amount < 0  -> money withdrawn from the goal back INTO the account
-- _finance_effect('transfer', amount) is -amount, so the existing
-- add / update / delete RPCs already move the balance the right way.

-- 1. Allow negative amounts on goal withdrawals, if an amount check exists.
--    (Lists any check constraints on amount; drop one by hand if it rejects
--    negatives - the RPC below will error loudly if so.)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.finance_transactions'::regclass and contype = 'c';

-- 2. Atomic goal move: updates the goal, writes the transaction and shifts the
--    account balance in one database transaction. Replay-safe on p_id.
create or replace function public.finance_goal_move(
	p_id uuid,            -- used for both the contribution entry and the transaction
	p_goal_id uuid,
	p_amount numeric,     -- > 0 contribute, < 0 withdraw
	p_account_id uuid,    -- null = no account involved (cash / outside money)
	p_note text,
	p_date date,          -- the user's local date and time
	p_time text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_goal savings_goals;
	v_amount numeric := p_amount;
	v_entry jsonb;
begin
	if v_user_id is null then
		raise exception 'not authenticated' using errcode = '42501';
	end if;
	if p_amount is null or p_amount = 0 then
		raise exception 'amount must be non-zero' using errcode = '22023';
	end if;

	select * into v_goal from savings_goals
	where id = p_goal_id and user_id = v_user_id
	for update;
	if v_goal.id is null then
		raise exception 'goal not found' using errcode = 'P0002';
	end if;

	-- Replay of a queued call: already applied, change nothing.
	if exists (
		select 1 from jsonb_array_elements(coalesce(v_goal.contributions, '[]'::jsonb)) e
		where e ->> 'id' = p_id::text
	) then
		return jsonb_build_object('applied', false, 'goal', to_jsonb(v_goal));
	end if;

	-- Can't withdraw more than the goal holds.
	if v_amount < 0 then
		v_amount := -least(-v_amount, coalesce(v_goal.current_amount, 0));
		if v_amount = 0 then
			return jsonb_build_object('applied', false, 'goal', to_jsonb(v_goal));
		end if;
	end if;

	v_entry := jsonb_build_object(
		'id', p_id,
		'amount', v_amount,
		'date', now(),
		'note', p_note,
		'account_id', p_account_id,
		'type', case when v_amount > 0 then 'contribution' else 'withdrawal' end
	);

	update savings_goals
	set current_amount = coalesce(current_amount, 0) + v_amount,
		is_completed = coalesce(current_amount, 0) + v_amount >= target_amount,
		contributions = coalesce(contributions, '[]'::jsonb) || jsonb_build_array(v_entry),
		updated_at = now()
	where id = p_goal_id
	returning * into v_goal;

	if p_account_id is not null then
		insert into finance_transactions (
			id, user_id, type, amount, category, description, note,
			date, time, account_id, payment_method, is_recurring,
			created_at, updated_at
		) values (
			p_id, v_user_id, 'transfer', v_amount, 'savings_goal',
			case when v_amount > 0 then 'Saved to: ' else 'Withdrawn from: ' end || v_goal.name,
			p_note, p_date, p_time::time, p_account_id, 'net_banking', false,
			now(), now()
		);
		perform _finance_apply_delta(
			v_user_id, p_account_id, _finance_effect('transfer', v_amount)
		);
	end if;

	return jsonb_build_object('applied', true, 'goal', to_jsonb(v_goal), 'amount', v_amount);
end;
$$;

grant execute on function public.finance_goal_move(uuid, uuid, numeric, uuid, text, date, text) to authenticated;

-- 3. Closing balances: a goal move changes the TOTAL across accounts (money
--    left or came back), unlike an account-to-account transfer. Same function
--    as before except the `totals` CASE.
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
	if current_setting(v_key, true) = v_txid then
		return;
	end if;
	perform set_config(v_key, v_txid, true);

	with effects as (
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
		select t.id,
			(select coalesce(sum(balance), 0) from finance_accounts where user_id = p_user)
			- coalesce(sum(case
				when t.type = 'income' then t.amount
				when t.type = 'expense' then -t.amount
				-- transfer with no destination account = money to/from a savings goal
				when t.type = 'transfer' and t.to_account_id is null then -t.amount
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

revoke all on function public.finance_recompute_balances(uuid) from public, anon, authenticated;

-- 4. Backfill: past contributions/withdrawals that used an account moved the
--    balance but left no transaction. Record them now (the balance already
--    moved, so this does NOT touch account balances), which also fixes the
--    closing balances around them. Dates are taken in IST.
insert into finance_transactions (
	id, user_id, type, amount, category, description, note,
	date, time, account_id, payment_method, is_recurring, created_at, updated_at
)
select
	(e ->> 'id')::uuid,
	g.user_id,
	'transfer',
	(e ->> 'amount')::numeric,
	'savings_goal',
	case when (e ->> 'amount')::numeric > 0 then 'Saved to: ' else 'Withdrawn from: ' end || g.name,
	e ->> 'note',
	((e ->> 'date')::timestamptz at time zone 'Asia/Kolkata')::date,
	((e ->> 'date')::timestamptz at time zone 'Asia/Kolkata')::time,
	(e ->> 'account_id')::uuid,
	'net_banking',
	false,
	(e ->> 'date')::timestamptz,
	now()
from savings_goals g
cross join lateral jsonb_array_elements(coalesce(g.contributions, '[]'::jsonb)) e
join finance_accounts a on a.id = (e ->> 'account_id')::uuid and a.user_id = g.user_id
where coalesce(e ->> 'account_id', '') <> ''
	and (e ->> 'amount')::numeric <> 0
	and (e ->> 'id') ~ '^[0-9a-f-]{36}$'
on conflict (id) do nothing;

-- 5. Recompute everyone's closing balances with the new total rule.
do $$
declare u uuid;
begin
	for u in select distinct user_id from finance_transactions loop
		perform finance_recompute_balances(u);
	end loop;
end $$;
