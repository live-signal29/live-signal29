-- Make constraints permissive temporarily, normalize bad rows, then enforce final sets

-- A) Temporarily allow any status values to pass so we can normalize
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_status_check CHECK (true);

ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_signal_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_signal_status_check CHECK (true);

-- B) Normalize signal_status into pending/open/close
UPDATE public.signals
SET signal_status = CASE
  WHEN signal_status ILIKE 'close%' THEN 'close'
  WHEN signal_status ILIKE 'open%' THEN 'open'
  WHEN signal_status ILIKE 'live%' THEN 'open'
  WHEN signal_status ILIKE 'pending%' THEN 'pending'
  ELSE 'open'
END;

-- C) Normalize status column into pending/open/close
UPDATE public.signals
SET status = CASE
  WHEN status ILIKE 'close%' THEN 'close'
  WHEN status ILIKE 'open%' THEN 'open'
  WHEN status ILIKE 'pending%' THEN 'pending'
  WHEN status ILIKE 'active%' THEN 'open'
  ELSE 'open'
END;

-- D) Enforce pending for unactivated limit orders
UPDATE public.signals
SET signal_status = 'pending',
    status = 'pending'
WHERE entry_mode = 'limit'
  AND COALESCE(is_activated, false) = false
  AND signal_status = 'open';

-- E) Market orders: open unless closed
UPDATE public.signals
SET signal_status = 'open',
    status = 'open'
WHERE entry_mode = 'market'
  AND signal_status <> 'close';

-- F) Finally enforce strict constraints
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_status_check CHECK (status IN ('pending','open','close'));

ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_signal_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_signal_status_check CHECK (signal_status IN ('pending','open','close'));
