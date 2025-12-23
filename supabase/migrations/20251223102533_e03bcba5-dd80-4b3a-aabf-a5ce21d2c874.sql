-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_detailed_accuracy_stats();

-- Then recreate with new signature that queries signals table directly
CREATE OR REPLACE FUNCTION public.get_detailed_accuracy_stats()
RETURNS TABLE(
  today_total bigint, 
  today_wins bigint, 
  today_losses bigint, 
  today_accuracy numeric,
  today_free_total bigint,
  today_free_wins bigint,
  today_free_accuracy numeric,
  today_premium_total bigint,
  today_premium_wins bigint,
  today_premium_accuracy numeric,
  yesterday_total bigint, 
  yesterday_wins bigint, 
  yesterday_losses bigint, 
  yesterday_accuracy numeric,
  yesterday_free_total bigint,
  yesterday_free_wins bigint,
  yesterday_free_accuracy numeric,
  yesterday_premium_total bigint,
  yesterday_premium_wins bigint,
  yesterday_premium_accuracy numeric,
  week_total bigint, 
  week_wins bigint, 
  week_losses bigint, 
  week_accuracy numeric,
  week_free_total bigint,
  week_free_wins bigint,
  week_free_accuracy numeric,
  week_premium_total bigint,
  week_premium_wins bigint,
  week_premium_accuracy numeric,
  weekend_total bigint, 
  weekend_wins bigint, 
  weekend_losses bigint, 
  weekend_accuracy numeric,
  weekend_free_total bigint,
  weekend_free_wins bigint,
  weekend_free_accuracy numeric,
  weekend_premium_total bigint,
  weekend_premium_wins bigint,
  weekend_premium_accuracy numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_week_end DATE := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
  v_weekend_sat DATE := (date_trunc('week', CURRENT_DATE) + INTERVAL '5 days')::DATE;
  v_weekend_sun DATE := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
BEGIN
  RETURN QUERY
  WITH closed_signals AS (
    SELECT 
      s.id,
      s.updated_at::date as closed_date,
      s.is_premium,
      CASE 
        WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 'win'
        WHEN s.sl_hit THEN 'loss'
        ELSE 'breakeven'
      END as result
    FROM public.signals s
    WHERE s.signal_status = 'CLOSE'
      AND s.published = true
      AND (s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit OR s.sl_hit)
  )
  SELECT
    COUNT(*) FILTER (WHERE closed_date = v_today)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_today AND result = 'win')::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_today AND result = 'loss')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_today) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_today AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_today)) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date = v_today AND (is_premium = false OR is_premium IS NULL))::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_today AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_today AND (is_premium = false OR is_premium IS NULL)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_today AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_today AND (is_premium = false OR is_premium IS NULL))) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date = v_today AND is_premium = true)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_today AND is_premium = true AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_today AND is_premium = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_today AND is_premium = true AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_today AND is_premium = true)) * 100, 1)
      ELSE NULL END,
    
    COUNT(*) FILTER (WHERE closed_date = v_yesterday)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND result = 'win')::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND result = 'loss')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_yesterday) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_yesterday AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_yesterday)) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND (is_premium = false OR is_premium IS NULL))::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_yesterday AND (is_premium = false OR is_premium IS NULL)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_yesterday AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_yesterday AND (is_premium = false OR is_premium IS NULL))) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND is_premium = true)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date = v_yesterday AND is_premium = true AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date = v_yesterday AND is_premium = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date = v_yesterday AND is_premium = true AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date = v_yesterday AND is_premium = true)) * 100, 1)
      ELSE NULL END,
    
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND result = 'win')::BIGINT,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND result = 'loss')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end)) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND (is_premium = false OR is_premium IS NULL))::BIGINT,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND (is_premium = false OR is_premium IS NULL)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND (is_premium = false OR is_premium IS NULL))) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND is_premium = true)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND is_premium = true AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND is_premium = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND is_premium = true AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date >= v_week_start AND closed_date <= v_week_end AND is_premium = true)) * 100, 1)
      ELSE NULL END,
    
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun))::BIGINT,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND result = 'win')::BIGINT,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND result = 'loss')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun))) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND (is_premium = false OR is_premium IS NULL))::BIGINT,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND (is_premium = false OR is_premium IS NULL)) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND (is_premium = false OR is_premium IS NULL) AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND (is_premium = false OR is_premium IS NULL))) * 100, 1)
      ELSE NULL END,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND is_premium = true)::BIGINT,
    COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND is_premium = true AND result = 'win')::BIGINT,
    CASE WHEN COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND is_premium = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND is_premium = true AND result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE closed_date IN (v_weekend_sat, v_weekend_sun) AND is_premium = true)) * 100, 1)
      ELSE NULL END
  FROM closed_signals;
END;
$function$;