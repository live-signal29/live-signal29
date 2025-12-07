-- Add new admin roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'signal_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';

-- Trade History table for closed signals
CREATE TABLE IF NOT EXISTS public.trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  entry TEXT NOT NULL,
  close_price TEXT,
  tp1 TEXT,
  tp2 TEXT,
  tp3 TEXT,
  tp4 TEXT,
  sl TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'breakeven')),
  pips_gained NUMERIC DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tp_hit_level INTEGER DEFAULT 0,
  sl_hit BOOLEAN DEFAULT false,
  risk_level TEXT,
  signal_type TEXT,
  notes TEXT
);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all trade history"
  ON public.trade_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert trade history"
  ON public.trade_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update trade history"
  ON public.trade_history FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own trade history"
  ON public.trade_history FOR SELECT
  USING (auth.uid() = user_id);

-- Add expiry_time to signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS expiry_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS current_price TEXT;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN DEFAULT false;

-- Forex News Alerts table
CREATE TABLE IF NOT EXISTS public.forex_news_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  currency TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  is_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forex_news_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forex news alerts"
  ON public.forex_news_alerts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forex news alerts"
  ON public.forex_news_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Signal Statistics table for caching daily stats
CREATE TABLE IF NOT EXISTS public.signal_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL UNIQUE,
  total_signals INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_breakeven INTEGER DEFAULT 0,
  total_pips NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  top_symbols JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view signal stats"
  ON public.signal_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage signal stats"
  ON public.signal_stats FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Security Audit Logs table (enhanced)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  device_type TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs"
  ON public.security_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security logs"
  ON public.security_logs FOR INSERT
  WITH CHECK (true);

-- Function to calculate signal statistics for a date range
CREATE OR REPLACE FUNCTION public.calculate_signal_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_signals BIGINT,
  total_wins BIGINT,
  total_losses BIGINT,
  total_breakeven BIGINT,
  total_pips NUMERIC,
  win_rate NUMERIC,
  top_symbols JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_signals,
      COUNT(*) FILTER (WHERE result = 'win') as total_wins,
      COUNT(*) FILTER (WHERE result = 'loss') as total_losses,
      COUNT(*) FILTER (WHERE result = 'breakeven') as total_breakeven,
      COALESCE(SUM(pips_gained), 0) as total_pips
    FROM public.trade_history
    WHERE closed_at::date BETWEEN p_start_date AND p_end_date
  ),
  symbols AS (
    SELECT pair, COUNT(*) FILTER (WHERE result = 'win') as wins
    FROM public.trade_history
    WHERE closed_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY pair
    ORDER BY wins DESC
    LIMIT 5
  )
  SELECT
    s.total_signals,
    s.total_wins,
    s.total_losses,
    s.total_breakeven,
    s.total_pips,
    CASE 
      WHEN s.total_signals > 0 
      THEN ROUND((s.total_wins::numeric / s.total_signals) * 100, 2)
      ELSE 0 
    END as win_rate,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('pair', pair, 'wins', wins)) FROM symbols), '[]'::jsonb) as top_symbols
  FROM stats s;
END;
$$;

-- Function to move closed signal to trade history
CREATE OR REPLACE FUNCTION public.move_signal_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result TEXT;
  v_pips NUMERIC;
  v_tp_hit INTEGER;
BEGIN
  -- Only trigger when signal is closed and wasn't already auto-closed
  IF NEW.signal_status = 'CLOSE' AND (OLD.signal_status IS DISTINCT FROM 'CLOSE' OR OLD.auto_closed IS NOT TRUE) THEN
    -- Determine result and pips based on TP/SL hits
    IF NEW.sl_hit THEN
      v_result := 'loss';
      v_pips := -1 * COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp4_hit THEN
      v_result := 'win';
      v_tp_hit := 4;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp3_hit THEN
      v_result := 'win';
      v_tp_hit := 3;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp2_hit THEN
      v_result := 'win';
      v_tp_hit := 2;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp1_hit THEN
      v_result := 'win';
      v_tp_hit := 1;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSE
      v_result := 'breakeven';
      v_pips := 0;
    END IF;

    -- Insert into trade history
    INSERT INTO public.trade_history (
      signal_id, pair, type, category, entry, tp1, tp2, tp3, tp4, sl,
      result, pips_gained, tp_hit_level, sl_hit, risk_level, signal_type, notes
    ) VALUES (
      NEW.id, NEW.pair, NEW.type, NEW.category, NEW.entry,
      NEW.tp1, NEW.tp2, NEW.tp3, NEW.tp4, NEW.sl,
      v_result, v_pips, v_tp_hit, NEW.sl_hit, NEW.risk_level, NEW.signal_type, NEW.note
    );

    -- Mark as auto-closed
    NEW.auto_closed := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-moving closed signals
DROP TRIGGER IF EXISTS trigger_move_signal_to_history ON public.signals;
CREATE TRIGGER trigger_move_signal_to_history
  BEFORE UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.move_signal_to_history();

-- Function to send TP/SL hit notifications
CREATE OR REPLACE FUNCTION public.notify_tp_sl_hit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  user_record RECORD;
BEGIN
  -- Check if any TP was just hit
  IF (NEW.tp1_hit AND NOT COALESCE(OLD.tp1_hit, false)) OR
     (NEW.tp2_hit AND NOT COALESCE(OLD.tp2_hit, false)) OR
     (NEW.tp3_hit AND NOT COALESCE(OLD.tp3_hit, false)) OR
     (NEW.tp4_hit AND NOT COALESCE(OLD.tp4_hit, false)) THEN
    
    IF NEW.tp4_hit AND NOT COALESCE(OLD.tp4_hit, false) THEN
      v_title := '🎯 TP4 Hit!';
      v_message := NEW.pair || ' reached Take Profit 4!';
    ELSIF NEW.tp3_hit AND NOT COALESCE(OLD.tp3_hit, false) THEN
      v_title := '🎯 TP3 Hit!';
      v_message := NEW.pair || ' reached Take Profit 3!';
    ELSIF NEW.tp2_hit AND NOT COALESCE(OLD.tp2_hit, false) THEN
      v_title := '🎯 TP2 Hit!';
      v_message := NEW.pair || ' reached Take Profit 2!';
    ELSE
      v_title := '🎯 TP1 Hit!';
      v_message := NEW.pair || ' reached Take Profit 1!';
    END IF;
    v_type := 'tp_hit';
    
  -- Check if SL was just hit
  ELSIF NEW.sl_hit AND NOT COALESCE(OLD.sl_hit, false) THEN
    v_title := '🛑 Stop Loss Hit';
    v_message := NEW.pair || ' hit Stop Loss.';
    v_type := 'sl_hit';
  ELSE
    RETURN NEW;
  END IF;

  -- Send notification to all premium users
  FOR user_record IN 
    SELECT id FROM public.profiles 
    WHERE subscription_status IN ('premium', 'free_trial')
      AND (
        (subscription_status = 'premium' AND subscription_end_date > now()) OR
        (subscription_status = 'free_trial' AND trial_end_date > now())
      )
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      user_record.id,
      v_title,
      v_message,
      v_type,
      jsonb_build_object('signal_id', NEW.id, 'pair', NEW.pair)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for TP/SL notifications
DROP TRIGGER IF EXISTS trigger_notify_tp_sl_hit ON public.signals;
CREATE TRIGGER trigger_notify_tp_sl_hit
  AFTER UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tp_sl_hit();

-- Enable realtime for trade_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forex_news_alerts;