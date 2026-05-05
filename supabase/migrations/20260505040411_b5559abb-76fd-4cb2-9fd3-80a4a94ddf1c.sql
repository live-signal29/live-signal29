
-- ============================================
-- REFERRAL SYSTEM
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_days_granted INTEGER NOT NULL DEFAULT 3,
  reward_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "Admins can manage referrals" ON public.referrals;
CREATE POLICY "Admins can manage referrals"
  ON public.referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.generate_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(_user_id::text || now()::text || random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Backfill referral codes ONLY for profiles with valid names (skip blocked ones)
UPDATE public.profiles
SET referral_code = public.generate_referral_code(id)
WHERE referral_code IS NULL
  AND full_name IS NOT NULL
  AND trim(full_name) <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_full_name TEXT;
BEGIN
  v_referral_code := public.generate_referral_code(NEW.id);
  v_full_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'User');

  IF NEW.raw_user_meta_data ? 'referred_by_code' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(NEW.raw_user_meta_data->>'referred_by_code')
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, terms_accepted, referral_code, referred_by)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false),
    v_referral_code,
    v_referrer_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, reward_days_granted, reward_applied)
    VALUES (v_referrer_id, NEW.id, 3, true)
    ON CONFLICT (referred_user_id) DO NOTHING;

    UPDATE public.profiles
    SET
      trial_end_date = COALESCE(trial_end_date, now()) + INTERVAL '3 days',
      subscription_end_date = CASE
        WHEN subscription_status = 'premium' AND subscription_end_date IS NOT NULL
        THEN subscription_end_date + INTERVAL '3 days'
        ELSE subscription_end_date
      END
    WHERE id = v_referrer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- PER-PAIR PERFORMANCE STATS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_per_pair_stats()
RETURNS TABLE(
  pair TEXT,
  total_signals BIGINT,
  total_wins BIGINT,
  total_losses BIGINT,
  win_rate NUMERIC,
  total_pips NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    UPPER(s.pair) AS pair,
    COUNT(*)::BIGINT AS total_signals,
    COUNT(*) FILTER (
      WHERE COALESCE(s.tp1_hit,false) OR COALESCE(s.tp2_hit,false)
         OR COALESCE(s.tp3_hit,false) OR COALESCE(s.tp4_hit,false)
    )::BIGINT AS total_wins,
    COUNT(*) FILTER (
      WHERE COALESCE(s.sl_hit,false)
        AND NOT (COALESCE(s.tp1_hit,false) OR COALESCE(s.tp2_hit,false)
              OR COALESCE(s.tp3_hit,false) OR COALESCE(s.tp4_hit,false))
    )::BIGINT AS total_losses,
    CASE
      WHEN COUNT(*) FILTER (
        WHERE COALESCE(s.tp1_hit,false) OR COALESCE(s.tp2_hit,false)
           OR COALESCE(s.tp3_hit,false) OR COALESCE(s.tp4_hit,false)
           OR COALESCE(s.sl_hit,false)
      ) > 0
      THEN ROUND(
        (COUNT(*) FILTER (
          WHERE COALESCE(s.tp1_hit,false) OR COALESCE(s.tp2_hit,false)
             OR COALESCE(s.tp3_hit,false) OR COALESCE(s.tp4_hit,false)
        )::NUMERIC
        / COUNT(*) FILTER (
          WHERE COALESCE(s.tp1_hit,false) OR COALESCE(s.tp2_hit,false)
             OR COALESCE(s.tp3_hit,false) OR COALESCE(s.tp4_hit,false)
             OR COALESCE(s.sl_hit,false)
        )) * 100, 1
      )
      ELSE 0
    END AS win_rate,
    COALESCE(SUM(
      CASE
        WHEN s.pips_result IS NOT NULL AND s.pips_result ~ '[+-]?\d+\.?\d*'
        THEN (regexp_match(s.pips_result, '([+-]?\d+\.?\d*)'))[1]::numeric
        ELSE 0
      END
    ), 0) AS total_pips
  FROM public.signals s
  WHERE LOWER(s.signal_status) = 'close'
    AND s.published = true
  GROUP BY UPPER(s.pair)
  HAVING COUNT(*) >= 1
  ORDER BY total_signals DESC;
END;
$$;
