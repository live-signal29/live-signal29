-- Create table for tracking user login history
CREATE TABLE public.user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT
);

-- Create table for tracking signal views
CREATE TABLE public.user_signal_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_login_history_user_id ON public.user_login_history(user_id);
CREATE INDEX idx_login_history_login_at ON public.user_login_history(login_at DESC);
CREATE INDEX idx_signal_views_user_id ON public.user_signal_views(user_id);
CREATE INDEX idx_signal_views_signal_id ON public.user_signal_views(signal_id);
CREATE INDEX idx_signal_views_viewed_at ON public.user_signal_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signal_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for login history
CREATE POLICY "Admins can view all login history"
ON public.user_login_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own login history"
ON public.user_login_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS policies for signal views
CREATE POLICY "Admins can view all signal views"
ON public.user_signal_views
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own signal views"
ON public.user_signal_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own signal views"
ON public.user_signal_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);