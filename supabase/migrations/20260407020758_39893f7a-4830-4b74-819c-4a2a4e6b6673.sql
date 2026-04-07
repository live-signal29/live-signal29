
-- 1) FIX: Signals - Remove blanket authenticated SELECT, replace with subscription-aware policy
DROP POLICY IF EXISTS "Authenticated users can view all signals" ON public.signals;

CREATE POLICY "Authenticated users can view non-premium signals" 
ON public.signals 
FOR SELECT 
TO authenticated
USING (
  -- Non-premium published signals: all authenticated users
  (published = true AND (is_premium = false OR is_premium IS NULL))
  OR
  -- Premium signals: only active subscribers or trial users
  (
    is_premium = true AND published = true
    AND public.has_premium_access(auth.uid())
  )
  OR
  -- Admins always see everything
  public.has_role(auth.uid(), 'admin')
);

-- 2) FIX: Profiles - Trigger to block users from modifying protected columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to modify any field
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block non-admin users from changing sensitive fields
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

CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3) FIX: Security logs - Bind INSERT to authenticated user's own ID
DROP POLICY IF EXISTS "Authenticated users can insert security logs" ON public.security_logs;

CREATE POLICY "Users insert own security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4) FIX: Chart reactions - Restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view chart reactions" ON public.chart_reactions;

CREATE POLICY "Authenticated users can view chart reactions"
ON public.chart_reactions
FOR SELECT
TO authenticated
USING (true);
