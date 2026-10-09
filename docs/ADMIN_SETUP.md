# Admin panel setup

The admin panel's notifications, account deletion and announcements need two things set up in Supabase by hand.

## 1. Edge Function `admin-actions`

Sends personalised push notifications and deletes accounts. It needs the service role, so it can't run in the app.

1. Supabase dashboard → **Edge Functions** → **Create function** → name it `admin-actions`.
2. Paste `supabase/functions/admin-actions/index.ts` and deploy.

You don't need any secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically. The function checks that the caller's `profiles.role` is `admin` or `super_admin`, and rejects everyone else.

- **Placeholders** in the title or message are filled in for each recipient: `{first_name}`, `{name}`, `{email}`, `{plan}`.
- **App update** mode sends the same "update available" push as `npm run notify-update`, but to one user or a chosen audience. Tapping it downloads and installs `LifeSync-vX.Y.Z.apk` from that GitHub Release. The function refuses to send if the APK isn't published yet.
- Notifications only reach users whose device has registered a push token (`profiles.expo_push_token`). The app does this at sign-in on a real device.
- **Deleting an account** removes the user's rows from every module table, their payments and subscriptions, their profile and their auth user. Split Wise groups the user *owns* are deleted too, including for the other members of those groups. An admin can't delete their own account, and only a super admin can delete another super admin.

## 2. `announcements` table

Run this in the SQL editor:

```sql
create table if not exists public.announcements (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	body text not null,
	audience text not null default 'all' check (audience in ('all', 'free', 'premium')),
	is_active boolean not null default true,
	created_by uuid references auth.users(id) on delete set null default auth.uid(),
	created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- Every signed-in user can read live announcements.
create policy "read active announcements" on public.announcements
	for select to authenticated
	using (
		is_active
		or exists (select 1 from public.profiles p
			where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
	);

-- Only admins can create, edit or delete them.
create policy "admins manage announcements" on public.announcements
	for all to authenticated
	using (exists (select 1 from public.profiles p
		where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
	with check (exists (select 1 from public.profiles p
		where p.id = auth.uid() and p.role in ('admin', 'super_admin')));
```

An active announcement appears as a popup the next time a matching user opens the app or brings it back to the foreground. It appears once per device. Turning the switch off hides it from anyone who hasn't seen it yet.
