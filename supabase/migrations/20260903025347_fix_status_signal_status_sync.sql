-- ============================================================
-- FIX: `status` and `signal_status` had drifted apart.
--
-- Signal cards on the frontend close a trade by writing the
-- `signal_status` column (e.g. "close" / "CLOSE"). They never
-- touched the `status` column, which is what
-- auto-generate-signals used to decide whether a pair
-- (e.g. XAUUSD) already had an open trade. Result: `status`
-- stayed stuck at "OPEN" forever on any signal that closed,
-- so auto-generate-signals thought the pair was still busy and
-- never created a new one.
--
-- 1) Backfill: any row whose signal_status says closed but
--    whose status still says OPEN gets status synced to CLOSED.
-- 2) Trigger: going forward, whenever signal_status is written
--    as closed, status is auto-synced to CLOSED in the same
--    write, so the two columns can no longer drift apart again
--    (belt-and-braces alongside the application-code fix).
-- ============================================================

-- 1) Backfill existing stuck rows
UPDATE public.signals
SET status = 'CLOSED'
WHERE UPPER(COALESCE(signal_status, '')) IN ('CLOSE', 'CLOSED')
  AND UPPER(COALESCE(status, '')) <> 'CLOSED';

-- 2) Keep them in sync going forward
CREATE OR REPLACE FUNCTION public.sync_signal_status_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF UPPER(COALESCE(NEW.signal_status, '')) IN ('CLOSE', 'CLOSED') THEN
    NEW.status := 'CLOSED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_signal_status_columns ON public.signals;

CREATE TRIGGER trg_sync_signal_status_columns
BEFORE INSERT OR UPDATE ON public.signals
FOR EACH ROW
EXECUTE FUNCTION public.sync_signal_status_columns();
