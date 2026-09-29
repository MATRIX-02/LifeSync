-- Atomic transaction + account-balance mutation.
--
-- The client used to write finance_transactions and finance_accounts as two
-- separate requests, with the new balance sent as an ABSOLUTE value computed
-- from local state. Two failure modes followed:
--
--   1. The insert commits and the balance update does not (or gets queued
--      offline). The next initialize() overwrites local state with the stale
--      server balance, so the transaction exists but the balance never moved.
--   2. Two transactions logged offline against one account each carry an
--      absolute balance computed from local state, so replay order decides the
--      result and any intervening change is silently overwritten.
--
-- These functions do both writes in one statement-level transaction and derive
-- the balance change from the row itself, so they are idempotent: replaying a
-- committed write is a no-op rather than a double-apply.
--
-- Run this by hand in the Supabase dashboard SQL editor. Nothing in the repo
-- applies migrations.

-- Mirrors applyAccountDelta() in src/context/financeStoreDB/index.ts: spending
-- lowers `balance` and raises `credit_used` by the same amount; `credit_used`
-- is clamped at zero so an overpayment shows as a positive balance instead.
create or replace function public._finance_apply_delta(
	p_user_id uuid,
	p_account_id uuid,
	p_delta numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if p_account_id is null or p_delta is null or p_delta = 0 then
		return;
	end if;

	update finance_accounts
	set
		balance = balance + p_delta,
		credit_used = case
			when type = 'credit_card'
				then greatest(0, coalesce(credit_used, 0) - p_delta)
			else credit_used
		end,
		updated_at = now()
	where id = p_account_id
		and user_id = p_user_id;
end;
$$;

-- The signed effect a transaction has on its source account. Income adds;
-- expense and transfer subtract. A transfer separately credits to_account_id.
create or replace function public._finance_effect(
	p_type text,
	p_amount numeric
) returns numeric
language sql
immutable
as $$
	select case when p_type = 'income' then p_amount else -p_amount end;
$$;

create or replace function public.finance_add_transaction(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_id uuid := (p_row ->> 'id')::uuid;
	v_inserted finance_transactions;
begin
	if v_user_id is null then
		raise exception 'not authenticated' using errcode = '42501';
	end if;
	if v_id is null then
		raise exception 'id is required' using errcode = '22004';
	end if;

	-- ON CONFLICT DO NOTHING is what makes a replayed insert safe: the balance
	-- below is only touched when a row was actually created.
	insert into finance_transactions
	select * from jsonb_populate_record(
		null::finance_transactions,
		p_row || jsonb_build_object('user_id', v_user_id)
	)
	on conflict (id) do nothing
	returning * into v_inserted;

	if v_inserted.id is null then
		return jsonb_build_object('applied', false, 'id', v_id);
	end if;

	perform _finance_apply_delta(
		v_user_id,
		v_inserted.account_id,
		_finance_effect(v_inserted.type, v_inserted.amount)
	);

	if v_inserted.to_account_id is not null then
		perform _finance_apply_delta(
			v_user_id, v_inserted.to_account_id, v_inserted.amount
		);
	end if;

	return jsonb_build_object('applied', true, 'id', v_id);
end;
$$;

create or replace function public.finance_update_transaction(
	p_id uuid,
	p_updates jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_old finance_transactions;
	v_new finance_transactions;
begin
	if v_user_id is null then
		raise exception 'not authenticated' using errcode = '42501';
	end if;

	-- Locked so a concurrent write can't interleave between the read of the old
	-- effect and the application of the new one.
	select * into v_old
	from finance_transactions
	where id = p_id and user_id = v_user_id
	for update;

	if v_old.id is null then
		return jsonb_build_object('applied', false, 'id', p_id);
	end if;

	-- The delta is derived from old-vs-new rather than passed in, which is what
	-- makes a replay idempotent: the second run sees old = new and shifts zero.
	v_new := jsonb_populate_record(
		v_old,
		p_updates - 'id' - 'user_id' || jsonb_build_object('updated_at', now())
	);

	update finance_transactions
	set
		type = v_new.type,
		amount = v_new.amount,
		category = v_new.category,
		description = v_new.description,
		note = v_new.note,
		date = v_new.date,
		time = v_new.time,
		account_id = v_new.account_id,
		to_account_id = v_new.to_account_id,
		payment_method = v_new.payment_method,
		is_recurring = v_new.is_recurring,
		recurring_id = v_new.recurring_id,
		tags = v_new.tags,
		updated_at = now()
	where id = p_id and user_id = v_user_id;

	-- Reverse the old effect, then apply the new one.
	perform _finance_apply_delta(
		v_user_id, v_old.account_id, -_finance_effect(v_old.type, v_old.amount)
	);
	if v_old.to_account_id is not null then
		perform _finance_apply_delta(v_user_id, v_old.to_account_id, -v_old.amount);
	end if;

	perform _finance_apply_delta(
		v_user_id, v_new.account_id, _finance_effect(v_new.type, v_new.amount)
	);
	if v_new.to_account_id is not null then
		perform _finance_apply_delta(v_user_id, v_new.to_account_id, v_new.amount);
	end if;

	return jsonb_build_object('applied', true, 'id', p_id);
end;
$$;

create or replace function public.finance_delete_transactions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row finance_transactions;
	v_count int := 0;
begin
	if v_user_id is null then
		raise exception 'not authenticated' using errcode = '42501';
	end if;

	-- Only rows this call actually removed are reversed, so a replayed delete
	-- (rows already gone) shifts no balances.
	for v_row in
		delete from finance_transactions
		where id = any(p_ids) and user_id = v_user_id
		returning *
	loop
		perform _finance_apply_delta(
			v_user_id, v_row.account_id, -_finance_effect(v_row.type, v_row.amount)
		);
		if v_row.to_account_id is not null then
			perform _finance_apply_delta(
				v_user_id, v_row.to_account_id, -v_row.amount
			);
		end if;
		v_count := v_count + 1;
	end loop;

	return jsonb_build_object('applied', v_count > 0, 'deleted', v_count);
end;
$$;

revoke all on function public._finance_apply_delta(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public._finance_effect(text, numeric) from public, anon;

grant execute on function public.finance_add_transaction(jsonb) to authenticated;
grant execute on function public.finance_update_transaction(uuid, jsonb) to authenticated;
grant execute on function public.finance_delete_transactions(uuid[]) to authenticated;
