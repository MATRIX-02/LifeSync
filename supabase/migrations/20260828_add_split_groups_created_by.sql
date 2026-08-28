-- split_groups.created_by
--
-- `SplitGroup.createdBy` is a required field in src/types/finance.ts, so any
-- group carrying it produces a `created_by` key in the upsert payload. The
-- column does not exist, and PostgREST rejects the ENTIRE request with 42703
-- when it sees an unknown column — so one such group fails the whole finance
-- sync, not just the split-groups portion.
--
-- Run this in the Supabase dashboard SQL editor. Nothing in the repo applies
-- migrations automatically.

alter table public.split_groups
	add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.split_groups.created_by is
	'User who created the group (SplitGroup.createdBy).';
