-- Security fix: remove overly-permissive insert policy on notifications.
-- This policy allowed ANY client to insert notifications.

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;