-- Create new table for favorite pairs instead of individual signals
CREATE TABLE IF NOT EXISTS public.user_favorite_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_favorite_pairs_unique UNIQUE (user_id, pair_name)
);

-- Enable RLS
ALTER TABLE public.user_favorite_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite pairs"
  ON public.user_favorite_pairs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite pairs"
  ON public.user_favorite_pairs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite pairs"
  ON public.user_favorite_pairs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for better query performance
CREATE INDEX idx_user_favorite_pairs_user_id ON public.user_favorite_pairs(user_id);
CREATE INDEX idx_user_favorite_pairs_pair_name ON public.user_favorite_pairs(pair_name);

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorite_pairs;