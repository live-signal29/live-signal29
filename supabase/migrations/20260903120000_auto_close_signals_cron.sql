-- ============================================================
-- FIX: Signals never closed automatically.
--
-- TP/SL-hit detection previously only existed in the browser
-- (src/hooks/useLivePrices.ts -> useAutoTPSLUpdate), and that
-- hook was never actually wired into any component — it was
-- dead code. The other client-side path (useSignalTimer) only
-- fires if expiry_time is set AND someone has the page open;
-- auto-generated signals never had expiry_time set either.
--
-- Net result: a pair's OPEN signal never closed, so every 15
-- minutes the generator's "one OPEN signal per pair" check kept
-- being defeated by a signal that could never age out — new gold
-- signals kept appearing without the old one ever closing.
--
-- This schedules the new `auto-close-signals` edge function
-- every minute (same cadence as live price polling) to check
-- every OPEN signal against the live price and close it the
-- moment SL or the final TP is hit, or once its expiry_time has
-- passed — fully server-side, no browser required.
-- ============================================================

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'auto-close-signals-every-minute';

SELECT cron.schedule(
  'auto-close-signals-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/auto-close-signals',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- One-off cleanup: any signal currently OPEN that is already
-- older than a generous 48h ceiling is almost certainly a stuck
-- leftover from the broken close logic above — close it now so
-- the pair is free for the next cron run instead of waiting for
-- its (possibly missing) expiry_time.
UPDATE public.signals
SET status = 'CLOSED', signal_status = 'CLOSE', auto_closed = true
WHERE UPPER(COALESCE(status, '')) <> 'CLOSED'
  AND UPPER(COALESCE(signal_status, '')) NOT IN ('CLOSE', 'CLOSED')
  AND created_at < now() - interval '48 hours';

-- Verify:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
