-- ============================================================
-- 1) profile guard: let trusted server code through
--
--    protect_profile_sensitive_fields() only let ADMIN USERS write
--    subscription_* columns. The verify-play-purchase edge function
--    writes with the service role key (no user JWT, so auth.uid() is
--    NULL and has_role() is false) -> every Play purchase was verified
--    with Google and then failed with
--    "Not authorized to modify subscription_status".
--
--    NOTE: the function is SECURITY DEFINER, so current_user is always
--    the owner — never test current_user here. auth.role() reads the
--    caller's JWT role claim, which cannot be forged.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server code (edge functions using the service role key)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins can modify any field
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    RAISE EXCEPTION 'Not authorized to modify subscription_plan';
  END IF;
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'Not authorized to modify subscription_status';
  END IF;
  IF NEW.subscription_start_date IS DISTINCT FROM OLD.subscription_start_date THEN
    RAISE EXCEPTION 'Not authorized to modify subscription_start_date';
  END IF;
  IF NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date THEN
    RAISE EXCEPTION 'Not authorized to modify subscription_end_date';
  END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Not authorized to modify balance';
  END IF;
  IF NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date THEN
    RAISE EXCEPTION 'Not authorized to modify trial_end_date';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2) payment_submissions
--
--    The website's crypto checkout (Premium page -> "Submit payment")
--    inserts into this table, but it was never created — so every
--    submission failed with a "relation does not exist" error.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name      text NOT NULL,
  category       text,
  duration       text,
  amount         numeric NOT NULL,
  cryptocurrency text NOT NULL,
  wallet_address text,
  transaction_id text NOT NULL,
  coupon_code    text,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_user
  ON public.payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status
  ON public.payment_submissions(status, created_at DESC);

ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own payment submissions" ON public.payment_submissions;
CREATE POLICY "Users insert own payment submissions"
  ON public.payment_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users view own payment submissions" ON public.payment_submissions;
CREATE POLICY "Users view own payment submissions"
  ON public.payment_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage payment submissions" ON public.payment_submissions;
CREATE POLICY "Admins manage payment submissions"
  ON public.payment_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.payment_submissions TO authenticated;
GRANT ALL ON public.payment_submissions TO service_role;
