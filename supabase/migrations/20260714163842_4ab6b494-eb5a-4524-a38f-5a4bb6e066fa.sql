
-- Signal comments (community)
CREATE TABLE IF NOT EXISTS public.signal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_comments TO authenticated;
GRANT ALL ON public.signal_comments TO service_role;
ALTER TABLE public.signal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.signal_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own comment" ON public.signal_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.signal_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Signal ratings
CREATE TABLE IF NOT EXISTS public.signal_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(signal_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_ratings TO authenticated;
GRANT ALL ON public.signal_ratings TO service_role;
ALTER TABLE public.signal_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ratings" ON public.signal_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "upsert own rating" ON public.signal_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own rating" ON public.signal_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Academy lessons
CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'beginner',
  content TEXT NOT NULL,
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_lessons TO anon, authenticated;
GRANT ALL ON public.academy_lessons TO service_role;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published lessons" ON public.academy_lessons FOR SELECT USING (published = true);
CREATE POLICY "admin manage lessons" ON public.academy_lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Daily market brief
CREATE TABLE IF NOT EXISTS public.market_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sentiment TEXT,
  brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_briefs TO anon, authenticated;
GRANT ALL ON public.market_briefs TO service_role;
ALTER TABLE public.market_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read briefs" ON public.market_briefs FOR SELECT USING (true);

-- Flash sales
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flash_sales TO anon, authenticated;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active flash" ON public.flash_sales FOR SELECT USING (active = true);
CREATE POLICY "admin flash" ON public.flash_sales FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Gift premium codes
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  created_by UUID,
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own gift" ON public.gift_codes FOR SELECT TO authenticated USING (created_by = auth.uid() OR redeemed_by = auth.uid() OR redeemed_by IS NULL);
CREATE POLICY "create gift" ON public.gift_codes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "redeem gift" ON public.gift_codes FOR UPDATE TO authenticated USING (redeemed_by IS NULL);

-- Portfolio accounts
CREATE TABLE IF NOT EXISTS public.portfolio_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  broker TEXT NOT NULL,
  account_number TEXT NOT NULL,
  nickname TEXT,
  balance NUMERIC DEFAULT 0,
  equity NUMERIC DEFAULT 0,
  profit_loss NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_accounts TO authenticated;
GRANT ALL ON public.portfolio_accounts TO service_role;
ALTER TABLE public.portfolio_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own portfolios" ON public.portfolio_accounts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2FA codes (email OTP)
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.two_factor_codes TO authenticated;
GRANT ALL ON public.two_factor_codes TO service_role;
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own 2fa" ON public.two_factor_codes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Leaderboard function (from trade_journal)
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id UUID, full_name TEXT, total_trades BIGINT, wins BIGINT, win_rate NUMERIC, total_pnl NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    tj.user_id,
    COALESCE(p.full_name, 'Trader') as full_name,
    COUNT(*)::BIGINT as total_trades,
    COUNT(*) FILTER (WHERE tj.profit_loss > 0)::BIGINT as wins,
    CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE tj.profit_loss > 0)::NUMERIC / COUNT(*)) * 100, 1)
      ELSE 0 END as win_rate,
    COALESCE(SUM(tj.profit_loss), 0) as total_pnl
  FROM public.trade_journal tj
  LEFT JOIN public.profiles p ON p.id = tj.user_id
  WHERE tj.profit_loss IS NOT NULL
  GROUP BY tj.user_id, p.full_name
  HAVING COUNT(*) >= 1
  ORDER BY total_pnl DESC
  LIMIT 50;
END;
$$;

-- Redeem gift code function
CREATE OR REPLACE FUNCTION public.redeem_gift_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gift RECORD;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','not authenticated'); END IF;
  SELECT * INTO v_gift FROM public.gift_codes WHERE code = UPPER(_code) AND redeemed_by IS NULL LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Invalid or already redeemed code'); END IF;
  UPDATE public.gift_codes SET redeemed_by = v_user, redeemed_at = now() WHERE id = v_gift.id;
  UPDATE public.profiles
  SET subscription_status = 'premium',
      subscription_end_date = GREATEST(COALESCE(subscription_end_date, now()), now()) + (v_gift.days || ' days')::INTERVAL
  WHERE id = v_user;
  RETURN jsonb_build_object('success', true, 'days', v_gift.days);
END;
$$;
