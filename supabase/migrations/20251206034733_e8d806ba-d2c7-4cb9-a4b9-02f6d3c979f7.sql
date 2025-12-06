-- Drop the security definer view (not recommended pattern)
DROP VIEW IF EXISTS public.signals_secure;

-- Instead, create an RPC function that returns filtered signals (more secure approach)
CREATE OR REPLACE FUNCTION public.get_signals_filtered()
RETURNS TABLE (
  id uuid,
  pair text,
  type text,
  category text,
  main_category text,
  sub_category text,
  created_at timestamptz,
  updated_at timestamptz,
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
SET search_path = public
AS $$
DECLARE
  _has_access boolean;
BEGIN
  -- Check if user has premium access
  SELECT public.has_premium_access(auth.uid()) INTO _has_access;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.pair,
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
    -- Only show sensitive fields if user has premium access OR signal is not premium
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
      THEN s.entry 
      ELSE NULL 
    END as entry,
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
      THEN s.tp1 
      ELSE NULL 
    END as tp1,
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
      THEN s.tp2 
      ELSE NULL 
    END as tp2,
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
      THEN s.tp3 
      ELSE NULL 
    END as tp3,
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
      THEN s.tp4 
      ELSE NULL 
    END as tp4,
    CASE 
      WHEN s.is_premium = false OR s.is_premium IS NULL OR _has_access 
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
$$;