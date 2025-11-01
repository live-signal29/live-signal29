-- Enable realtime for signals table so admin updates appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Enable realtime for subscriptions table for payment status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Add index for better performance on subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Add index for better performance on profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);