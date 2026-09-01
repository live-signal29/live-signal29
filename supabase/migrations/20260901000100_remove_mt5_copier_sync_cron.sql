-- The mt5-copier-sync edge function was never actually deployed, so this
-- cron job has been calling a non-existent endpoint every 15 minutes and
-- failing. The Copier List now uses manual performance entry only (see
-- MT5CopierManagement admin UI), so this job is no longer needed.

SELECT cron.unschedule('mt5-copier-sync-every-15-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mt5-copier-sync-every-15-min'
);
