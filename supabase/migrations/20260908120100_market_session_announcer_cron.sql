-- Checks the clock every 15 minutes and posts the Friday "happy
-- weekend" summary / Monday "welcome back" message to Telegram
-- exactly once each (idempotency handled inside the function via
-- public.market_session_log).

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'market-session-announcer-check';

SELECT cron.schedule(
  'market-session-announcer-check',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/market-session-announcer',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
