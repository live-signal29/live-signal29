-- Create table for MT5 demo trades tracking
CREATE TABLE public.mt5_demo_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
  mt5_ticket TEXT,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- 'buy' or 'sell'
  entry_price NUMERIC,
  sl_price NUMERIC,
  tp_price NUMERIC,
  lot_size NUMERIC DEFAULT 0.01,
  status TEXT DEFAULT 'pending', -- pending, open, closed, error
  open_time TIMESTAMP WITH TIME ZONE,
  close_time TIMESTAMP WITH TIME ZONE,
  close_price NUMERIC,
  profit_loss NUMERIC,
  result TEXT, -- 'win', 'loss', 'breakeven'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_mt5_demo_trades_signal_id ON public.mt5_demo_trades(signal_id);
CREATE INDEX idx_mt5_demo_trades_status ON public.mt5_demo_trades(status);
CREATE INDEX idx_mt5_demo_trades_created_at ON public.mt5_demo_trades(created_at DESC);

-- Enable RLS
ALTER TABLE public.mt5_demo_trades ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view all MT5 demo trades"
ON public.mt5_demo_trades FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage MT5 demo trades"
ON public.mt5_demo_trades FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_mt5_demo_trades_updated_at
BEFORE UPDATE ON public.mt5_demo_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create stats view function
CREATE OR REPLACE FUNCTION public.get_mt5_demo_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_trades BIGINT,
  total_wins BIGINT,
  total_losses BIGINT,
  total_breakeven BIGINT,
  total_profit NUMERIC,
  win_rate NUMERIC,
  accuracy_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_trades,
    COUNT(*) FILTER (WHERE result = 'win')::BIGINT as total_wins,
    COUNT(*) FILTER (WHERE result = 'loss')::BIGINT as total_losses,
    COUNT(*) FILTER (WHERE result = 'breakeven')::BIGINT as total_breakeven,
    COALESCE(SUM(profit_loss), 0) as total_profit,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'closed') > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE result = 'win')::NUMERIC / COUNT(*) FILTER (WHERE status = 'closed')) * 100, 2)
      ELSE 0 
    END as win_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'closed') > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE result IN ('win', 'breakeven'))::NUMERIC / COUNT(*) FILTER (WHERE status = 'closed')) * 100, 2)
      ELSE 0 
    END as accuracy_percent
  FROM public.mt5_demo_trades
  WHERE created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    AND status = 'closed';
END;
$$;