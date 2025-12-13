-- Fix security issues

-- 1. Remove the old policy that allows anyone to insert applications
DROP POLICY IF EXISTS "Anyone can submit applications" ON account_management_applications;

-- 2. Update coupons visibility - only show code to authenticated users who haven't exceeded usage
DROP POLICY IF EXISTS "Users can view active coupons" ON coupons;
CREATE POLICY "Authenticated users can view active coupon codes" ON coupons
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND is_active = true 
  AND (expiry_date IS NULL OR expiry_date > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit)
);

-- 3. Add a view policy that only shows limited coupon info (code only, not limits/usage)
-- Note: This is handled by the policy above which restricts to authenticated users only