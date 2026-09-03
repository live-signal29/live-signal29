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
-- NOTE: an earlier version of this migration failed with
--   ERROR 23514: violates check constraint "signals_status_check"
-- because the existing constraint only allowed a specific set of
-- values and rejected "CLOSED". Different parts of the codebase
-- have historically written different casings for this column
-- ("OPEN" at insert time, "close"/"CLOSE" when a card closes), so
-- step 1 below widens both check constraints to accept any casing
-- of open/pending/close first — that's what was actually missing.
--
-- 1) Widen constraints to accept OPEN/CLOSE/PENDING in any casing.
-- 2) Backfill: any row whose signal_status says closed but whose
--    status still says OPEN gets status synced to CLOSED.
-- 3) Trigger: going forward, whenever signal_status is written as
--    closed, status is auto-synced to CLOSED in the same write, so
--    the two columns can no longer drift apart again (belt-and-
--    braces alongside the application-code fix).
-- ============================================================

-- 1) Widen the check constraints
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_status_check
  CHECK (status IS NULL OR UPPER(status) IN ('OPEN', 'PENDING', 'CLOSE', 'CLOSED'));

ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_signal_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_signal_status_check
  CHECK (signal_status IS NULL OR UPPER(signal_status) IN ('OPEN', 'PENDING', 'CLOSE', 'CLOSED'));

-- 2) Backfill existing stuck rows
UPDATE public.signals
SET status = 'CLOSED'
WHERE UPPER(COALESCE(signal_status, '')) IN ('CLOSE', 'CLOSED')
  AND UPPER(COALESCE(status, '')) <> 'CLOSED';

-- 3) Keep them in sync going forward
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
