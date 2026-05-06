
-- Price Alerts
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pair text NOT NULL,
  target_price numeric NOT NULL,
  condition text NOT NULL DEFAULT 'above', -- 'above' or 'below'
  is_active boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alerts" ON public.price_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all alerts" ON public.price_alerts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_price_alerts_user ON public.price_alerts(user_id, is_active);
CREATE INDEX idx_price_alerts_active ON public.price_alerts(pair, is_active) WHERE is_active = true;

-- Trade Journal
CREATE TABLE public.trade_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pair text NOT NULL,
  trade_type text NOT NULL, -- 'BUY' or 'SELL'
  entry_price numeric NOT NULL,
  exit_price numeric,
  lot_size numeric NOT NULL DEFAULT 0.01,
  stop_loss numeric,
  take_profit numeric,
  result text, -- 'win', 'loss', 'breakeven', 'open'
  pnl numeric,
  pips numeric,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.trade_journal FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all journal" ON public.trade_journal FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_trade_journal_user ON public.trade_journal(user_id, created_at DESC);
CREATE TRIGGER update_trade_journal_updated_at BEFORE UPDATE ON public.trade_journal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Login Streaks
CREATE TABLE public.login_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 1,
  longest_streak integer NOT NULL DEFAULT 1,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  total_rewards_granted integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own streak" ON public.login_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.login_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.login_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all streaks" ON public.login_streaks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to handle daily login streak
CREATE OR REPLACE FUNCTION public.record_daily_login()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_existing record;
  v_new_streak integer;
  v_reward_granted boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not authenticated');
  END IF;

  SELECT * INTO v_existing FROM public.login_streaks WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.login_streaks (user_id) VALUES (v_user_id);
    RETURN jsonb_build_object('current_streak', 1, 'reward_granted', false);
  END IF;

  IF v_existing.last_login_date = v_today THEN
    RETURN jsonb_build_object('current_streak', v_existing.current_streak, 'reward_granted', false);
  ELSIF v_existing.last_login_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_existing.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Reward every 7 days: +1 day premium/trial
  IF v_new_streak % 7 = 0 THEN
    UPDATE public.profiles
    SET subscription_end_date = COALESCE(subscription_end_date, now()) + INTERVAL '1 day',
        trial_end_date = COALESCE(trial_end_date, now()) + INTERVAL '1 day'
    WHERE id = v_user_id;
    v_reward_granted := true;
  END IF;

  UPDATE public.login_streaks
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_login_date = v_today,
      total_rewards_granted = total_rewards_granted + CASE WHEN v_reward_granted THEN 1 ELSE 0 END,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('current_streak', v_new_streak, 'reward_granted', v_reward_granted);
END;
$$;
