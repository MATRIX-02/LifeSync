# Split Wise setup

Split Wise keeps each group in one `split_groups` row. Members, expenses, settlements, and since the October 2026 update, group settings and the activity feed, are `jsonb` columns. Multiple payers, comments, itemized bills and UPI IDs live inside that JSON, so they need no schema change.

## Required SQL (run once in the SQL editor)

```sql
alter table public.split_groups
	add column if not exists settings jsonb not null default '{}'::jsonb,
	add column if not exists activity jsonb not null default '[]'::jsonb;
```

Until this runs, every Split Wise save fails with a message pointing here: the app sends both columns on every write, and PostgREST rejects unknown columns.

No RLS change is needed. The columns sit on the existing table and inherit its policies.

## What lives where

| Column | Holds |
|---|---|
| `settings` | `simplifyDebts`, `defaultSplit`, `recurring` (repeating expenses) and `kind` (`"friend"` for one-to-one, non-group splits) |
| `activity` | Newest-first feed, capped at 300 entries |

## Notes

- **Repeating expenses** are created by the app of the person who set them up, when they open Split Wise. Nothing runs on a server, so a copy that falls due appears the next time that person opens the app, with any missed ones caught up (at most 12).
- **Receipt scanning** uses the user's own Gemini key (Settings > AI Usage). The shared `ai-proxy` only serves a text model.
- **Saves** use compare-and-swap on `updated_at`, retrying when someone else saved first. Keep `updated_at` set on every write to this table, or concurrent edits can be lost.
