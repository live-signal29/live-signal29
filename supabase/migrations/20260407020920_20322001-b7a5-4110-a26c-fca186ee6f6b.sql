
-- 1) FIX: Signals - Restrict public/anon SELECT to non-premium only
DROP POLICY IF EXISTS "Anyone can view published signals" ON public.signals;

CREATE POLICY "Anyone can view published free signals"
ON public.signals
FOR SELECT
TO public
USING (
  published = true 
  AND (is_premium = false OR is_premium IS NULL)
);

-- 2) FIX: Market idea reactions - restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view reaction counts" ON public.market_idea_reactions;

CREATE POLICY "Authenticated users can view reaction counts"
ON public.market_idea_reactions
FOR SELECT
TO authenticated
USING (true);
