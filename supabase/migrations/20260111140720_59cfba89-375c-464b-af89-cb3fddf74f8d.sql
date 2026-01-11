-- Update RLS policies to allow admins to delete user-related data

-- Drop and recreate coupon_usage delete policy
DROP POLICY IF EXISTS "Prevent coupon usage deletion" ON public.coupon_usage;
CREATE POLICY "Admins can delete coupon usage" ON public.coupon_usage
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate user_login_history delete policy
DROP POLICY IF EXISTS "Prevent login history deletion" ON public.user_login_history;
CREATE POLICY "Admins can delete login history" ON public.user_login_history
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policies to other user-related tables if missing

-- user_favorites - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete user favorites" ON public.user_favorites;
CREATE POLICY "Admins can delete user favorites" ON public.user_favorites
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- user_favorite_pairs - add admin delete policy  
DROP POLICY IF EXISTS "Admins can delete favorite pairs" ON public.user_favorite_pairs;
CREATE POLICY "Admins can delete favorite pairs" ON public.user_favorite_pairs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- user_signal_views - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete signal views" ON public.user_signal_views;
CREATE POLICY "Admins can delete signal views" ON public.user_signal_views
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- notifications - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- chart_reactions - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete chart reactions" ON public.chart_reactions;
CREATE POLICY "Admins can delete chart reactions" ON public.chart_reactions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- market_idea_reactions - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete market reactions" ON public.market_idea_reactions;
CREATE POLICY "Admins can delete market reactions" ON public.market_idea_reactions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- subscriptions - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- deposits - add admin delete policy  
DROP POLICY IF EXISTS "Admins can delete deposits" ON public.deposits;
CREATE POLICY "Admins can delete deposits" ON public.deposits
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- security_logs - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete security logs" ON public.security_logs;
CREATE POLICY "Admins can delete security logs" ON public.security_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles - add admin delete policy
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- trade_history - add admin delete policy for user trades
DROP POLICY IF EXISTS "Admins can delete trade history" ON public.trade_history;
CREATE POLICY "Admins can delete trade history" ON public.trade_history
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));