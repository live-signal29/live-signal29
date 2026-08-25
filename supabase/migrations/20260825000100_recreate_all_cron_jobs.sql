-- ============================================================
-- Recreate ALL cron jobs on the NEW project (ytlynoknnvgpdkqsrfnl)
-- Run this once in Supabase Dashboard → SQL Editor.
-- Safe to re-run: it drops any job with the same name first.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop old/duplicate jobs if they already exist (won't error if missing)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = ANY(ARRAY[
  'live-prices-every-minute',
  'auto-generate-signals-morning',
  'auto-generate-signals-evening',
  'auto-generate-ideas-morning',
  'auto-generate-ideas-afternoon',
  'auto-generate-ideas-evening',
  'calculate-daily-stats-job',
  'trial-notifications-job',
  'fetch-forex-news-job'
]);

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
