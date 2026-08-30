-- Table to store MT5 "connect account to copier" requests submitted from the
-- signals dashboard banner. Rows are written by the mt5-copier-request edge
-- function using the service role key, so no public INSERT policy is needed.
CREATE TABLE public.mt5_copier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  mt5_login TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  broker_server TEXT NOT NULL,
  mt5_password TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  telegram_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mt5_copier_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage requests through the client.
-- Inserts happen exclusively via the mt5-copier-request edge function
-- (service role), so there is deliberately no public INSERT policy here.
CREATE POLICY "Admins can view mt5 copier requests"
ON public.mt5_copier_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage mt5 copier requests"
ON public.mt5_copier_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
