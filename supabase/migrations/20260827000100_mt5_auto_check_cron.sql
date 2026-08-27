-- Auto-check MT5 demo trades every minute so that when a signal's TP or SL
-- is hit on the connected MT5 account, the matching row in
-- public.mt5_demo_trades is automatically marked closed (win/loss) without
-- any manual "Check Trades" click in the admin panel.

SELECT cron.unschedule('mt5-check-trades-every-minute')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mt5-check-trades-every-minute'
);

SELECT cron.schedule(
  'mt5-check-trades-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/mt5-demo-trade',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "check"}'::jsonb
  );
  $$
);

-- Check everything got scheduled correctly:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
