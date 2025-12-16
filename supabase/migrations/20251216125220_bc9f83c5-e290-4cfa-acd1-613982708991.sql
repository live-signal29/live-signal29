-- Create chart_reactions table for positive reactions on chart posts
CREATE TABLE public.chart_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_id UUID NOT NULL REFERENCES public.chart_analysis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbsup', 'heart', 'fire', 'rocket')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chart_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chart_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view chart reactions" ON public.chart_reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reactions" ON public.chart_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON public.chart_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" ON public.chart_reactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Make chart_analysis fields nullable
ALTER TABLE public.chart_analysis ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.chart_analysis ALTER COLUMN image_url DROP NOT NULL;