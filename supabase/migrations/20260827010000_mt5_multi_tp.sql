-- Support opening 3 separate MT5 positions per signal (one targeting TP1,
-- one TP2, one TP3) so profit can be scaled out level by level, with the
-- remaining positions' SL moved to break-even once TP1 is hit.

ALTER TABLE public.mt5_demo_trades
  ADD COLUMN IF NOT EXISTS tp_level integer;

COMMENT ON COLUMN public.mt5_demo_trades.tp_level IS
  'Which take-profit leg this position represents for its signal: 1, 2, or 3. NULL for older single-trade rows.';

CREATE INDEX IF NOT EXISTS idx_mt5_demo_trades_signal_status
  ON public.mt5_demo_trades (signal_id, status);
