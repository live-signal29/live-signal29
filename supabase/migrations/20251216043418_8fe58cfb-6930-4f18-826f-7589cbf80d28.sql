
-- Market Ideas table
CREATE TABLE public.market_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_ideas
CREATE POLICY "Anyone can view published market ideas"
  ON public.market_ideas FOR SELECT
  USING (published = true);

CREATE POLICY "Only admins can insert market ideas"
  ON public.market_ideas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update market ideas"
  ON public.market_ideas FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete market ideas"
  ON public.market_ideas FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Market Idea Reactions table
CREATE TABLE public.market_idea_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_idea_id UUID NOT NULL REFERENCES public.market_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'accurate', 'loved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(market_idea_id, user_id)
);

-- Enable RLS
ALTER TABLE public.market_idea_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reaction counts"
  ON public.market_idea_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reactions"
  ON public.market_idea_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON public.market_idea_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.market_idea_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate accuracy stats
CREATE OR REPLACE FUNCTION public.get_accuracy_stats()
RETURNS TABLE(
  free_total BIGINT,
  free_wins BIGINT,
  free_accuracy NUMERIC,
  premium_total BIGINT,
  premium_wins BIGINT,
  premium_accuracy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE (is_premium = false OR is_premium IS NULL) AND result IN ('win', 'loss'))::BIGINT as free_total,
    COUNT(*) FILTER (WHERE (is_premium = false OR is_premium IS NULL) AND result = 'win')::BIGINT as free_wins,
    CASE 
      WHEN COUNT(*) FILTER (WHERE (is_premium = false OR is_premium IS NULL) AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE (is_premium = false OR is_premium IS NULL) AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE (is_premium = false OR is_premium IS NULL) AND result IN ('win', 'loss'))) * 100, 1)
      ELSE 0 
    END as free_accuracy,
    COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss'))::BIGINT as premium_total,
    COUNT(*) FILTER (WHERE is_premium = true AND result = 'win')::BIGINT as premium_wins,
    CASE 
      WHEN COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE is_premium = true AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss'))) * 100, 1)
      ELSE 0 
    END as premium_accuracy
  FROM public.trade_history;
END;
$$;
