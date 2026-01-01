CREATE OR REPLACE FUNCTION public.get_xauusd_accuracy_stats()
RETURNS TABLE(
  total_signals bigint,
  total_wins bigint,
  total_losses bigint,
  win_rate numeric,
  total_pips numeric,
  avg_win_pips numeric,
  avg_loss_pips numeric,
  last_7_days jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_7_days jsonb;
BEGIN
  -- Calculate last 7 days data for XAUUSD/Gold COMMODITIES signals only
  WITH daily_stats AS (
    SELECT 
      s.updated_at::date as stat_date,
      COUNT(*) as total,
      SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN s.sl_hit THEN 1 ELSE 0 END) as losses,
      SUM(COALESCE(NULLIF(s.pips_result, '')::numeric, 0)) as pips
    FROM signals s
    WHERE UPPER(s.category) = 'COMMODITIES'
      AND (UPPER(s.pair) LIKE '%XAU%' OR UPPER(s.pair) LIKE '%GOLD%')
      AND LOWER(s.signal_status) = 'close'
      AND s.updated_at::date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY s.updated_at::date
    ORDER BY s.updated_at::date DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', stat_date,
      'total', total,
      'wins', wins,
      'losses', losses,
      'pips', pips
    )
  ), '[]'::jsonb) INTO v_last_7_days FROM daily_stats;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_signals,
    SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 1 ELSE 0 END)::bigint as total_wins,
    SUM(CASE WHEN s.sl_hit THEN 1 ELSE 0 END)::bigint as total_losses,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 
    END as win_rate,
    COALESCE(SUM(NULLIF(s.pips_result, '')::numeric), 0) as total_pips,
    CASE 
      WHEN SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 1 ELSE 0 END) > 0 THEN
        ROUND(COALESCE(SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN NULLIF(s.pips_result, '')::numeric ELSE 0 END), 0) / 
              NULLIF(SUM(CASE WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN 1 ELSE 0 END), 1), 1)
      ELSE 0
    END as avg_win_pips,
    CASE 
      WHEN SUM(CASE WHEN s.sl_hit THEN 1 ELSE 0 END) > 0 THEN
        ROUND(ABS(COALESCE(SUM(CASE WHEN s.sl_hit THEN NULLIF(s.pips_result, '')::numeric ELSE 0 END), 0)) / 
              NULLIF(SUM(CASE WHEN s.sl_hit THEN 1 ELSE 0 END), 1), 1)
      ELSE 0
    END as avg_loss_pips,
    v_last_7_days as last_7_days
  FROM signals s
  WHERE UPPER(s.category) = 'COMMODITIES'
    AND (UPPER(s.pair) LIKE '%XAU%' OR UPPER(s.pair) LIKE '%GOLD%')
    AND LOWER(s.signal_status) = 'close';
END;
$$;