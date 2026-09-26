-- Profit-share payment request feature.
--
-- STANDALONE tables: client_payment_shares only references a client via
-- (source_type, source_id) pointing at either mt5_copier_requests
-- ("copier") or account_management_applications ("account_management").
-- Nothing here alters those two tables or their existing admin screens.

-- ---------------------------------------------------------------------
-- 1) Global settings: payment address + admin contact link, editable
--    from the admin panel, used by the bot messages below.
-- ---------------------------------------------------------------------
CREATE TABLE public.payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payment_address TEXT,
  admin_contact_link TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.payment_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment settings"
ON public.payment_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2) Per-client payment share requests.
--
-- status values:
--   draft               -> admin hasn't generated the link yet
--   linked              -> client opened the bot via /start link
--   payment_requested   -> the 4-option message was sent
--   reminder_pending     -> client picked "I'll check later"; gets a
--                          nudge every 15 min until they act
--   awaiting_proof       -> client picked "Send Profit Share" and
--                          confirmed payment; bot is waiting for their
--                          proof/transaction id as a text reply
--   client_marked_paid   -> proof received, waiting for admin to verify
--   verified              -> admin verified, receipt sent
--   continue_weekly       -> client picked "Grow my account" (informational)
--   support_requested     -> client picked "Contact admin support"
-- ---------------------------------------------------------------------
CREATE TABLE public.client_payment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_type TEXT NOT NULL CHECK (source_type IN ('copier', 'account_management')),
  source_id UUID NOT NULL,

  client_name TEXT,
  client_contact TEXT,
  telegram_username TEXT,

  telegram_chat_id BIGINT,
  link_token UUID NOT NULL DEFAULT gen_random_uuid(),

  profit_amount NUMERIC,
  share_percentage NUMERIC,
  share_amount NUMERIC GENERATED ALWAYS AS (
    ROUND(COALESCE(profit_amount, 0) * COALESCE(share_percentage, 0) / 100.0, 2)
  ) STORED,

  status TEXT NOT NULL DEFAULT 'draft',
  payment_proof TEXT,

  request_message_id BIGINT,
  last_message_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  paid_marked_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE (source_type, source_id)
);

ALTER TABLE public.client_payment_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment shares"
ON public.client_payment_shares
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment shares"
ON public.client_payment_shares
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_client_payment_shares_updated_at
BEFORE UPDATE ON public.client_payment_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_payment_shares REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_payment_shares;

CREATE INDEX idx_client_payment_shares_link_token ON public.client_payment_shares (link_token);
CREATE INDEX idx_client_payment_shares_telegram_chat_id ON public.client_payment_shares (telegram_chat_id);
CREATE INDEX idx_client_payment_shares_status ON public.client_payment_shares (status);

-- ---------------------------------------------------------------------
-- 3) Every-5-minutes cron job that invokes the payment-share-reminders
--    edge function, which sends a nudge to any client stuck on
--    "I'll check later" for 15+ minutes.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'payment-share-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ytlynoknnvgpdkqsrfnl.supabase.co/functions/v1/payment-share-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_wbNrOd0BkGF1hbrHmHbfxw_wtoNUlM4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
