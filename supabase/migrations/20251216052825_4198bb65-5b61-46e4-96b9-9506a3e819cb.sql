
-- Drop and recreate the get_accuracy_stats function with 7-day filter
CREATE OR REPLACE FUNCTION public.get_accuracy_stats()
RETURNS TABLE(
  free_total bigint,
  free_wins bigint,
  free_accuracy numeric,
  premium_total bigint,
  premium_wins bigint,
  premium_accuracy numeric
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
      ELSE NULL 
    END as free_accuracy,
    COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss'))::BIGINT as premium_total,
    COUNT(*) FILTER (WHERE is_premium = true AND result = 'win')::BIGINT as premium_wins,
    CASE 
      WHEN COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE is_premium = true AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE is_premium = true AND result IN ('win', 'loss'))) * 100, 1)
      ELSE NULL 
    END as premium_accuracy
  FROM public.trade_history
  WHERE closed_at >= NOW() - INTERVAL '7 days';
END;
$$;
