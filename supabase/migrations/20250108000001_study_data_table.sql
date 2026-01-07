-- Create study_data table for SSB preparation data storage
CREATE TABLE IF NOT EXISTS public.study_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ssb_data jsonb NOT NULL DEFAULT '{
    "sd": [],
    "ppdt": [],
    "tat": [],
    "wat": [],
    "srt": [],
    "gd": [],
    "gpe": [],
    "piq": [],
    "currentAffairs": [],
    "subjectKnowledge": []
  }',
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_study_data_user_id ON public.study_data(user_id);

-- Enable RLS
ALTER TABLE public.study_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own study data"
  ON public.study_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own study data"
  ON public.study_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study data"
  ON public.study_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study data"
  ON public.study_data
  FOR DELETE
  USING (auth.uid() = user_id);
