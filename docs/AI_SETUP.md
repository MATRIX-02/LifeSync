# AI insights setup

AI calls take one of two routes:

- **User's own Gemini key** (Settings > AI Usage > Your Gemini Key). The key is stored in the device keystore and the app calls Gemini directly. The server never sees it, and nothing below applies.
- **Shared proxy** (`supabase/functions/ai-proxy`) for everyone else. It uses one Groq key and gives each user a daily allowance (default 20 requests, resets at midnight UTC).

## 1. Usage table (run once in the SQL editor)

```sql
create table if not exists public.ai_usage (
	user_id uuid not null references auth.users (id) on delete cascade,
	day date not null,
	count int not null default 0,
	primary key (user_id, day)
);

-- RLS on with no policies: only the Edge Function (service role) can touch it.
alter table public.ai_usage enable row level security;

-- Atomically spends one request. Returns the new count, or null when the
-- limit was already reached (in which case nothing is incremented).
create or replace function public.consume_ai_request(p_user uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
	used int;
	d date := (now() at time zone 'utc')::date;
begin
	insert into ai_usage (user_id, day, count) values (p_user, d, 0)
	on conflict do nothing;

	update ai_usage set count = count + 1
	where user_id = p_user and day = d and count < p_limit
	returning count into used;

	return used;
end;
$$;

revoke execute on function public.consume_ai_request(uuid, int) from public, anon, authenticated;
```

## 2. Redeploy the Edge Function

Dashboard > Edge Functions > `ai-proxy`: paste the current `supabase/functions/ai-proxy/index.ts` and deploy.

Secrets: `GROQ_API_KEY` (required), `AI_DAILY_LIMIT` (optional, default 20). `SUPABASE_SERVICE_ROLE_KEY` is provided automatically.

Deploy the SQL **before** the function. Without `consume_ai_request`, every shared request fails with `usage_unavailable`.
