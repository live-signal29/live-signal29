-- Auto-sync every connected MT5 copier account's REAL performance
-- (profit/loss/%) from their own MT5 account every 15 minutes, so the
-- Copier List always reflects actual trading results instead of numbers
-- the admin has to type in manually.

SELECT cron.unschedule('mt5-copier-sync-every-15-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mt5-copier-sync-every-15-min'
);

SELECT cron.schedule(
  'mt5-copier-sync-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/mt5-copier-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Check everything got scheduled correctly:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
