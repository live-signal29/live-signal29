
DROP FUNCTION IF EXISTS public.get_xauusd_accuracy_stats();

CREATE OR REPLACE FUNCTION public.get_xauusd_accuracy_stats()
 RETURNS TABLE(total_signals bigint, total_wins bigint, total_losses bigint, win_rate numeric, total_pips numeric, avg_win_pips numeric, avg_loss_pips numeric, last_7_days jsonb, today_total bigint, today_wins bigint, today_losses bigint, today_accuracy numeric, yesterday_total bigint, yesterday_wins bigint, yesterday_losses bigint, yesterday_accuracy numeric, week_total bigint, week_wins bigint, week_losses bigint, week_accuracy numeric, monthly_total bigint, monthly_wins bigint, monthly_losses bigint, monthly_accuracy numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  today_date date := CURRENT_DATE;
  yesterday_date date := CURRENT_DATE - INTERVAL '1 day';
  week_start date := date_trunc('week', CURRENT_DATE)::date;
  week_end date := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date;
  month_start date := date_trunc('month', CURRENT_DATE)::date;
  month_end date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date;
BEGIN
  RETURN QUERY
  WITH xauusd_closed AS (
    SELECT 
      s.id,
      s.tp1_hit,
      s.tp2_hit,
      s.tp3_hit,
      s.tp4_hit,
      s.sl_hit,
      s.pips_result,
      s.updated_at::date AS closed_date,
      s.updated_at,
      CASE 
        WHEN s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit THEN true 
        ELSE false 
      END AS is_win,
      CASE 
        WHEN s.sl_hit AND NOT (s.tp1_hit OR s.tp2_hit OR s.tp3_hit OR s.tp4_hit) THEN true 
        ELSE false 
      END AS is_loss
    FROM signals s
    WHERE (UPPER(s.category) = 'COMMODITIES' OR UPPER(s.category) = 'COMMODITY')
      AND (UPPER(s.pair) LIKE '%XAU%' OR UPPER(s.pair) LIKE '%GOLD%')
      AND LOWER(s.signal_status) = 'close'
  ),
  overall_stats AS (
    SELECT
      COUNT(*) AS total_signals,
      COUNT(*) FILTER (WHERE is_win) AS total_wins,
      COUNT(*) FILTER (WHERE is_loss) AS total_losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_win OR is_loss) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE is_win)::numeric / NULLIF(COUNT(*) FILTER (WHERE is_win OR is_loss), 0)) * 100, 1)
        ELSE 0 
      END AS win_rate,
      COALESCE(SUM(
        CASE 
          WHEN pips_result IS NOT NULL AND pips_result ~ '[+-]?\d+\.?\d*'
          THEN (regexp_match(pips_result, '([+-]?\d+\.?\d*)'))[1]::numeric
          ELSE 0 
        END
      ), 0) AS total_pips,
      COALESCE(AVG(
        CASE 
          WHEN is_win AND pips_result IS NOT NULL AND pips_result ~ '[+-]?\d+\.?\d*'
          THEN ABS((regexp_match(pips_result, '([+-]?\d+\.?\d*)'))[1]::numeric)
          ELSE NULL 
        END
      ), 0) AS avg_win_pips,
      COALESCE(AVG(
        CASE 
          WHEN is_loss AND pips_result IS NOT NULL AND pips_result ~ '[+-]?\d+\.?\d*'
          THEN ABS((regexp_match(pips_result, '([+-]?\d+\.?\d*)'))[1]::numeric)
          ELSE NULL 
        END
      ), 0) AS avg_loss_pips
    FROM xauusd_closed
  ),
  daily_stats AS (
    SELECT 
      closed_date,
      COUNT(*) AS day_total,
      COUNT(*) FILTER (WHERE is_win) AS day_wins,
      COUNT(*) FILTER (WHERE is_loss) AS day_losses,
      COALESCE(SUM(
        CASE 
          WHEN pips_result IS NOT NULL AND pips_result ~ '[+-]?\d+\.?\d*'
          THEN (regexp_match(pips_result, '([+-]?\d+\.?\d*)'))[1]::numeric
          ELSE 0 
        END
      ), 0) AS day_pips
    FROM xauusd_closed
    WHERE closed_date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY closed_date
    ORDER BY closed_date
  ),
  last_7_days_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date', closed_date,
          'total', day_total,
          'wins', day_wins,
          'losses', day_losses,
          'pips', day_pips
        ) ORDER BY closed_date
      ),
      '[]'::jsonb
    ) AS days_data
    FROM daily_stats
  ),
  today_stats AS (
    SELECT
      COUNT(*) AS t_total,
      COUNT(*) FILTER (WHERE is_win) AS t_wins,
      COUNT(*) FILTER (WHERE is_loss) AS t_losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_win OR is_loss) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE is_win)::numeric / NULLIF(COUNT(*) FILTER (WHERE is_win OR is_loss), 0)) * 100, 1)
        ELSE NULL 
      END AS t_accuracy
    FROM xauusd_closed
    WHERE closed_date = today_date
  ),
  yesterday_stats AS (
    SELECT
      COUNT(*) AS y_total,
      COUNT(*) FILTER (WHERE is_win) AS y_wins,
      COUNT(*) FILTER (WHERE is_loss) AS y_losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_win OR is_loss) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE is_win)::numeric / NULLIF(COUNT(*) FILTER (WHERE is_win OR is_loss), 0)) * 100, 1)
        ELSE NULL 
      END AS y_accuracy
    FROM xauusd_closed
    WHERE closed_date = yesterday_date
  ),
  week_stats AS (
    SELECT
      COUNT(*) AS w_total,
      COUNT(*) FILTER (WHERE is_win) AS w_wins,
      COUNT(*) FILTER (WHERE is_loss) AS w_losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_win OR is_loss) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE is_win)::numeric / NULLIF(COUNT(*) FILTER (WHERE is_win OR is_loss), 0)) * 100, 1)
        ELSE NULL 
      END AS w_accuracy
    FROM xauusd_closed
    WHERE closed_date >= week_start AND closed_date <= week_end
  ),
  monthly_stats AS (
    SELECT
      COUNT(*) AS m_total,
      COUNT(*) FILTER (WHERE is_win) AS m_wins,
      COUNT(*) FILTER (WHERE is_loss) AS m_losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_win OR is_loss) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE is_win)::numeric / NULLIF(COUNT(*) FILTER (WHERE is_win OR is_loss), 0)) * 100, 1)
        ELSE NULL 
      END AS m_accuracy
    FROM xauusd_closed
    WHERE closed_date >= month_start AND closed_date <= month_end
  )
  SELECT 
    o.total_signals,
    o.total_wins,
    o.total_losses,
    o.win_rate,
    ROUND(o.total_pips, 1),
    ROUND(o.avg_win_pips, 1),
    ROUND(o.avg_loss_pips, 1),
    l.days_data,
    t.t_total,
    t.t_wins,
    t.t_losses,
    t.t_accuracy,
    y.y_total,
    y.y_wins,
    y.y_losses,
    y.y_accuracy,
    w.w_total,
    w.w_wins,
    w.w_losses,
    w.w_accuracy,
    m.m_total,
    m.m_wins,
    m.m_losses,
    m.m_accuracy
  FROM overall_stats o
  CROSS JOIN last_7_days_json l
  CROSS JOIN today_stats t
  CROSS JOIN yesterday_stats y
  CROSS JOIN week_stats w
  CROSS JOIN monthly_stats m;
END;
$function$;
