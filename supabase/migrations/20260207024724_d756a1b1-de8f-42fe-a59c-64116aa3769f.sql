-- Fix: include `tag` in get_signals_filtered RPC results.
-- Postgres requires dropping the function when changing OUT/RETURNS TABLE signature.

DROP FUNCTION IF EXISTS public.get_signals_filtered();
DROP FUNCTION IF EXISTS public.get_signals_filtered(text,text,text,text,uuid,integer,integer);

CREATE FUNCTION public.get_signals_filtered()
RETURNS TABLE(
  id uuid,
  pair text,
  tag text,
  type text,
  category text,
  main_category text,
  sub_category text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  status text,
  signal_status text,
  is_premium boolean,
  published boolean,
  risk_level text,
  signal_type text,
  chart_image_url text,
  note text,
  analysis_reason text,
  pips_result text,
  profit_note text,
  entry text,
  tp1 text,
  tp2 text,
  tp3 text,
  tp4 text,
  sl text,
  tp1_hit boolean,
  tp2_hit boolean,
  tp3_hit boolean,
  tp4_hit boolean,
  sl_hit boolean,
  is_favorite boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _has_access boolean;
BEGIN
  -- Check if user has premium access
  SELECT public.has_premium_access(auth.uid()) INTO _has_access;

  RETURN QUERY
  SELECT
    s.id,
    s.pair,
    s.tag,
    s.type,
    s.category,
    s.main_category,
    s.sub_category,
    s.created_at,
    s.updated_at,
    s.status,
    s.signal_status,
    s.is_premium,
    s.published,
    s.risk_level,
    s.signal_type,
    s.chart_image_url,
    s.note,
    s.analysis_reason,
    s.pips_result,
    s.profit_note,
    -- Show sensitive fields if: user has premium access OR signal is not premium OR signal is CLOSED
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.entry
      ELSE NULL
    END as entry,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp1
      ELSE NULL
    END as tp1,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp2
      ELSE NULL
    END as tp2,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp3
      ELSE NULL
    END as tp3,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp4
      ELSE NULL
    END as tp4,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.sl
      ELSE NULL
    END as sl,
    s.tp1_hit,
    s.tp2_hit,
    s.tp3_hit,
    s.tp4_hit,
    s.sl_hit,
    s.is_favorite
  FROM public.signals s
  WHERE s.published = true
  ORDER BY s.created_at DESC;
END;
$function$;


CREATE FUNCTION public.get_signals_filtered(
  p_main_category text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text,
  p_sub_category text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_signal_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  pair text,
  tag text,
  type text,
  category text,
  main_category text,
  sub_category text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  status text,
  signal_status text,
  is_premium boolean,
  published boolean,
  risk_level text,
  signal_type text,
  chart_image_url text,
  note text,
  analysis_reason text,
  pips_result text,
  profit_note text,
  entry text,
  tp1 text,
  tp2 text,
  tp3 text,
  tp4 text,
  sl text,
  tp1_hit boolean,
  tp2_hit boolean,
  tp3_hit boolean,
  tp4_hit boolean,
  sl_hit boolean,
  is_favorite boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _has_access boolean;
BEGIN
  -- Check if user has premium access
  SELECT public.has_premium_access(auth.uid()) INTO _has_access;

  RETURN QUERY
  SELECT
    s.id,
    s.pair,
    s.tag,
    s.type,
    s.category,
    s.main_category,
    s.sub_category,
    s.created_at,
    s.updated_at,
    s.status,
    s.signal_status,
    s.is_premium,
    s.published,
    s.risk_level,
    s.signal_type,
    s.chart_image_url,
    s.note,
    s.analysis_reason,
    s.pips_result,
    s.profit_note,
    -- Show sensitive fields if: user has premium access OR signal is not premium OR signal is CLOSED
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.entry
      ELSE NULL
    END as entry,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp1
      ELSE NULL
    END as tp1,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp2
      ELSE NULL
    END as tp2,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp3
      ELSE NULL
    END as tp3,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.tp4
      ELSE NULL
    END as tp4,
    CASE
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access OR s.signal_status = 'CLOSE'
      THEN s.sl
      ELSE NULL
    END as sl,
    s.tp1_hit,
    s.tp2_hit,
    s.tp3_hit,
    s.tp4_hit,
    s.sl_hit,
    s.is_favorite
  FROM public.signals s
  WHERE s.published = true
    AND (p_signal_id IS NULL OR s.id = p_signal_id)
    AND (p_main_category IS NULL OR s.main_category = p_main_category)
    AND (p_category IS NULL OR s.category = p_category)
    AND (p_sub_category IS NULL OR p_sub_category = 'all' OR s.sub_category = p_sub_category)
    AND (p_status IS NULL OR s.status = p_status)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Restore execute grants (these existed previously)
GRANT EXECUTE ON FUNCTION public.get_signals_filtered() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signals_filtered(text,text,text,text,uuid,integer,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signals_filtered() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_signals_filtered(text,text,text,text,uuid,integer,integer) TO anon, authenticated, service_role;