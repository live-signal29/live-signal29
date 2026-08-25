-- Fix: cron job "live-prices-every-minute" was created while the project
-- was still linked to the OLD Supabase project (ytlynoknnvgpdkqsrfnl).
-- It must be unscheduled and recreated pointing at the NEW project URL,
-- otherwise it silently keeps calling the old (now different) project.

SELECT cron.unschedule('live-prices-every-minute')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'live-prices-every-minute'
);

SELECT cron.schedule(
  'live-prices-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/fetch-live-prices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 1) Live prices — every minute (feeds live price ticker / signal engine)
SELECT cron.schedule(
  'live-prices-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/fetch-live-prices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2) Auto-generate signals — morning session (08:00 PKT = 03:00 UTC)
SELECT cron.schedule(
  'auto-generate-signals-morning',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-signals',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3) Auto-generate signals — evening session (15:00 PKT = 10:00 UTC)
SELECT cron.schedule(
  'auto-generate-signals-evening',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-signals',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 4) Auto-generate ideas — morning slot (09:00 PKT = 04:00 UTC)
SELECT cron.schedule(
  'auto-generate-ideas-morning',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-ideas',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 5) Auto-generate ideas — afternoon slot (14:00 PKT = 09:00 UTC)
SELECT cron.schedule(
  'auto-generate-ideas-afternoon',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-ideas',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 6) Auto-generate ideas — evening slot (19:00 PKT = 14:00 UTC)
SELECT cron.schedule(
  'auto-generate-ideas-evening',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-ideas',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 7) Calculate daily stats — once daily just before midnight (23:55 PKT = 18:55 UTC)
SELECT cron.schedule(
  'calculate-daily-stats-job',
  '55 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/calculate-daily-stats',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 8) Trial notifications — once daily (09:00 PKT = 04:00 UTC)
SELECT cron.schedule(
  'trial-notifications-job',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/trial-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 9) Fetch forex news — every 4 hours
SELECT cron.schedule(
  'fetch-forex-news-job',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/fetch-forex-news',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Check everything got scheduled correctly:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
