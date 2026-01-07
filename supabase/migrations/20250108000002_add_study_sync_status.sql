-- Add study_synced_at column to user_sync_status table
ALTER TABLE public.user_sync_status 
ADD COLUMN IF NOT EXISTS study_synced_at timestamp with time zone;
