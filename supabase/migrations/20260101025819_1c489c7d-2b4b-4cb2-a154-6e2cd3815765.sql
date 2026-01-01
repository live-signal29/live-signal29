
-- Create function to get XAUUSD/Gold signal accuracy stats
CREATE OR REPLACE FUNCTION public.get_xauusd_accuracy_stats()
RETURNS TABLE (
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
SET search_path = public
AS $$
DECLARE
  day_data jsonb := '[]'::jsonb;
  day_record record;
BEGIN
  -- Calculate overall stats for XAUUSD signals (closed signals only)
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE tp1_hit = true OR tp2_hit = true OR tp3_hit = true OR tp4_hit = true) as wins,
    COUNT(*) FILTER (WHERE sl_hit = true) as losses,
    COALESCE(SUM(CASE WHEN pips_result IS NOT NULL THEN pips_result::numeric ELSE 0 END), 0) as pips
  INTO total_signals, total_wins, total_losses, total_pips
  FROM signals s
  WHERE (UPPER(s.pair) LIKE '%XAUUSD%' OR UPPER(s.pair) LIKE '%GOLD%')
    AND s.signal_status = 'CLOSE'
    AND (s.tp1_hit = true OR s.tp2_hit = true OR s.tp3_hit = true OR s.tp4_hit = true OR s.sl_hit = true);

  -- Calculate win rate
  IF total_signals > 0 THEN
    win_rate := ROUND((total_wins::numeric / total_signals::numeric) * 100, 1);
  ELSE
    win_rate := 0;
  END IF;

  -- Calculate average win pips
  SELECT COALESCE(AVG(CASE WHEN pips_result IS NOT NULL THEN pips_result::numeric ELSE 0 END), 0)
  INTO avg_win_pips
  FROM signals s
  WHERE (UPPER(s.pair) LIKE '%XAUUSD%' OR UPPER(s.pair) LIKE '%GOLD%')
    AND s.signal_status = 'CLOSE'
    AND (s.tp1_hit = true OR s.tp2_hit = true OR s.tp3_hit = true OR s.tp4_hit = true);

  -- Calculate average loss pips
  SELECT COALESCE(AVG(CASE WHEN pips_result IS NOT NULL THEN ABS(pips_result::numeric) ELSE 0 END), 0)
  INTO avg_loss_pips
  FROM signals s
  WHERE (UPPER(s.pair) LIKE '%XAUUSD%' OR UPPER(s.pair) LIKE '%GOLD%')
    AND s.signal_status = 'CLOSE'
    AND s.sl_hit = true;

  -- Round averages
  avg_win_pips := ROUND(avg_win_pips, 1);
  avg_loss_pips := ROUND(avg_loss_pips, 1);

  -- Get last 7 days data for chart
  FOR day_record IN 
    SELECT 
      d.day_date,
      COUNT(s.id) as day_total,
      COUNT(s.id) FILTER (WHERE s.tp1_hit = true OR s.tp2_hit = true OR s.tp3_hit = true OR s.tp4_hit = true) as day_wins,
      COUNT(s.id) FILTER (WHERE s.sl_hit = true) as day_losses,
      COALESCE(SUM(CASE WHEN s.pips_result IS NOT NULL THEN s.pips_result::numeric ELSE 0 END), 0) as day_pips
    FROM (
      SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date as day_date
    ) d
    LEFT JOIN signals s ON DATE(s.updated_at) = d.day_date 
      AND (UPPER(s.pair) LIKE '%XAUUSD%' OR UPPER(s.pair) LIKE '%GOLD%')
      AND s.signal_status = 'CLOSE'
      AND (s.tp1_hit = true OR s.tp2_hit = true OR s.tp3_hit = true OR s.tp4_hit = true OR s.sl_hit = true)
    GROUP BY d.day_date
    ORDER BY d.day_date ASC
  LOOP
    day_data := day_data || jsonb_build_object(
      'date', day_record.day_date,
      'total', day_record.day_total,
      'wins', day_record.day_wins,
      'losses', day_record.day_losses,
      'pips', day_record.day_pips
    );
  END LOOP;

  last_7_days := day_data;

  RETURN NEXT;
END;
$$;
