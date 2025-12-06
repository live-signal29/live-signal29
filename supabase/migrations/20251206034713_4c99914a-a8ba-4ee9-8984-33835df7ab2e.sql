-- 1. Add RLS policy for users to view their own login history
CREATE POLICY "Users can view own login history" 
ON public.user_login_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Add server-side validation for profile name (max 100 chars, no script tags)
CREATE OR REPLACE FUNCTION public.validate_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Check length limit
  IF length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Name must be less than 100 characters';
  END IF;
  
  -- Check for empty name
  IF trim(NEW.full_name) = '' THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;
  
  -- Sanitize: Remove potential script tags and dangerous characters
  NEW.full_name := regexp_replace(NEW.full_name, '<[^>]*>', '', 'g');
  NEW.full_name := trim(NEW.full_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile name validation
DROP TRIGGER IF EXISTS validate_profile_name_trigger ON public.profiles;
CREATE TRIGGER validate_profile_name_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_name();

-- 3. Create a security definer function to check premium access
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND (
      -- Premium subscription with valid end date
      (subscription_status = 'premium' AND subscription_end_date > now())
      OR
      -- Free trial with valid end date
      (subscription_status = 'free_trial' AND trial_end_date > now())
    )
  )
$$;

-- 4. Create a secure view for signals that hides premium details from non-subscribers
CREATE OR REPLACE VIEW public.signals_secure AS
SELECT 
  id,
  pair,
  type,
  category,
  main_category,
  sub_category,
  created_at,
  updated_at,
  status,
  signal_status,
  is_premium,
  published,
  risk_level,
  signal_type,
  chart_image_url,
  note,
  analysis_reason,
  pips_result,
  profit_note,
  -- Only show sensitive fields if user has premium access OR signal is not premium
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN entry 
    ELSE NULL 
  END as entry,
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN tp1 
    ELSE NULL 
  END as tp1,
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN tp2 
    ELSE NULL 
  END as tp2,
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN tp3 
    ELSE NULL 
  END as tp3,
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN tp4 
    ELSE NULL 
  END as tp4,
  CASE 
    WHEN is_premium = false OR is_premium IS NULL OR public.has_premium_access(auth.uid()) 
    THEN sl 
    ELSE NULL 
  END as sl,
  tp1_hit,
  tp2_hit,
  tp3_hit,
  tp4_hit,
  sl_hit,
  is_favorite
FROM public.signals
WHERE published = true;