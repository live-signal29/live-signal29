-- Fix critical security issues

-- 1. Add policy to prevent INSERT on subscriptions table by regular users
-- Only admins should be able to create subscriptions
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
CREATE POLICY "Admins can insert subscriptions" ON subscriptions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'finance_manager')
  )
);

-- 2. Prevent users from modifying login history
DROP POLICY IF EXISTS "Prevent login history modification" ON user_login_history;
CREATE POLICY "Prevent login history modification" ON user_login_history
FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent login history deletion" ON user_login_history;
CREATE POLICY "Prevent login history deletion" ON user_login_history
FOR DELETE USING (false);

-- 3. Prevent coupon usage manipulation
DROP POLICY IF EXISTS "Prevent coupon usage modification" ON coupon_usage;
CREATE POLICY "Prevent coupon usage modification" ON coupon_usage
FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent coupon usage deletion" ON coupon_usage;
CREATE POLICY "Prevent coupon usage deletion" ON coupon_usage
FOR DELETE USING (false);

-- 4. Prevent admin activity log deletion (audit trail protection)
DROP POLICY IF EXISTS "Prevent admin log deletion" ON admin_activity_log;
CREATE POLICY "Prevent admin log deletion" ON admin_activity_log
FOR DELETE USING (false);

-- 5. Restrict deposits update to admins only
DROP POLICY IF EXISTS "Only admins can update deposits" ON deposits;
CREATE POLICY "Only admins can update deposits" ON deposits
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'finance_manager')
  )
);

-- 6. Require authentication for account management applications INSERT
DROP POLICY IF EXISTS "Anyone can insert applications" ON account_management_applications;
DROP POLICY IF EXISTS "Authenticated users can insert applications" ON account_management_applications;
CREATE POLICY "Authenticated users can insert applications" ON account_management_applications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Restrict security logs INSERT to authenticated users only
DROP POLICY IF EXISTS "System can insert security logs" ON security_logs;
DROP POLICY IF EXISTS "Authenticated users can insert security logs" ON security_logs;
CREATE POLICY "Authenticated users can insert security logs" ON security_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Prevent users from deleting signal views
DROP POLICY IF EXISTS "Prevent signal view deletion" ON user_signal_views;
CREATE POLICY "Prevent signal view deletion" ON user_signal_views
FOR DELETE USING (false);

DROP POLICY IF EXISTS "Prevent signal view modification" ON user_signal_views;
CREATE POLICY "Prevent signal view modification" ON user_signal_views
FOR UPDATE USING (false);

-- 9. Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
FOR DELETE USING (auth.uid() = user_id);