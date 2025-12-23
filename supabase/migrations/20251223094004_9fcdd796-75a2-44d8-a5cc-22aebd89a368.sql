-- Create a comprehensive accuracy stats function for dashboard
CREATE OR REPLACE FUNCTION public.get_detailed_accuracy_stats()
RETURNS TABLE(
  today_total BIGINT,
  today_wins BIGINT,
  today_losses BIGINT,
  today_accuracy NUMERIC,
  yesterday_total BIGINT,
  yesterday_wins BIGINT,
  yesterday_losses BIGINT,
  yesterday_accuracy NUMERIC,
  week_total BIGINT,
  week_wins BIGINT,
  week_losses BIGINT,
  week_accuracy NUMERIC,
  weekend_total BIGINT,
  weekend_wins BIGINT,
  weekend_losses BIGINT,
  weekend_accuracy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE; -- Monday of current week
  v_week_end DATE := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE; -- Sunday of current week
BEGIN
  RETURN QUERY
  SELECT
    -- Today stats
    COUNT(*) FILTER (WHERE closed_at::date = v_today AND result IN ('win', 'loss'))::BIGINT as today_total,
    COUNT(*) FILTER (WHERE closed_at::date = v_today AND result = 'win')::BIGINT as today_wins,
    COUNT(*) FILTER (WHERE closed_at::date = v_today AND result = 'loss')::BIGINT as today_losses,
    CASE 
      WHEN COUNT(*) FILTER (WHERE closed_at::date = v_today AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_at::date = v_today AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE closed_at::date = v_today AND result IN ('win', 'loss'))) * 100, 1)
      ELSE NULL 
    END as today_accuracy,
    
    -- Yesterday stats
    COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result IN ('win', 'loss'))::BIGINT as yesterday_total,
    COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result = 'win')::BIGINT as yesterday_wins,
    COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result = 'loss')::BIGINT as yesterday_losses,
    CASE 
      WHEN COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE closed_at::date = v_yesterday AND result IN ('win', 'loss'))) * 100, 1)
      ELSE NULL 
    END as yesterday_accuracy,
    
    -- This Week stats (Mon-Sun)
    COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result IN ('win', 'loss'))::BIGINT as week_total,
    COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result = 'win')::BIGINT as week_wins,
    COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result = 'loss')::BIGINT as week_losses,
    CASE 
      WHEN COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE closed_at::date >= v_week_start AND closed_at::date <= v_week_end AND result IN ('win', 'loss'))) * 100, 1)
      ELSE NULL 
    END as week_accuracy,
    
    -- Weekend stats (Sat-Sun of current week)
    COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                     AND closed_at::date <= v_week_end 
                     AND result IN ('win', 'loss'))::BIGINT as weekend_total,
    COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                     AND closed_at::date <= v_week_end 
                     AND result = 'win')::BIGINT as weekend_wins,
    COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                     AND closed_at::date <= v_week_end 
                     AND result = 'loss')::BIGINT as weekend_losses,
    CASE 
      WHEN COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                            AND closed_at::date <= v_week_end 
                            AND result IN ('win', 'loss')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                                   AND closed_at::date <= v_week_end 
                                   AND result = 'win')::NUMERIC / 
                  COUNT(*) FILTER (WHERE closed_at::date >= (v_week_start + INTERVAL '5 days')::DATE 
                                   AND closed_at::date <= v_week_end 
                                   AND result IN ('win', 'loss'))) * 100, 1)
      ELSE NULL 
    END as weekend_accuracy
  FROM public.trade_history;
END;
$$;