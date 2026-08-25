-- ============================================================
-- Switch auto-generate-signals from a fixed twice-daily schedule
-- to a frequent check (every 15 min). The function itself now
-- decides whether to actually create signals based on whether
-- gold price has moved enough since the last signal — so this
-- just gives it more chances to react to real movement instead
-- of only firing at two fixed clock times.
-- ============================================================

-- Remove the old fixed-time jobs
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = ANY(ARRAY[
  'auto-generate-signals-morning',
  'auto-generate-signals-evening',
  'auto-generate-signals-check'
]);

-- New job: check every 15 minutes; the function itself only inserts
-- new signals when gold has moved >= 0.12% since the last one.
SELECT cron.schedule(
  'auto-generate-signals-check',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-generate-signals',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
