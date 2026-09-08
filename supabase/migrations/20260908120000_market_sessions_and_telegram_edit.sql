-- ============================================================
-- FEATURE: Weekday/Weekend market sessions + editable Telegram
-- signal posts.
--
-- 1) signals.telegram_message_id / telegram_chat_id
--    Store the Telegram message that was posted for a signal so
--    later TP/SL updates can EDIT that same message (highlight
--    TP1 -> TP2 -> TP3 -> SL moved to entry, etc.) instead of
--    spamming a brand new message into the channel every time.
--
-- 2) market_session_log
--    Idempotency guard for the Friday "happy weekend" summary
--    and the Monday "welcome back" post, so a 15-minute cron
--    checking the clock doesn't post the same announcement
--    multiple times inside its multi-hour window.
-- ============================================================

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS telegram_message_id bigint,
  ADD COLUMN IF NOT EXISTS telegram_chat_id text;

CREATE TABLE IF NOT EXISTS public.market_session_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  session_type text NOT NULL, -- 'friday_close' | 'monday_reopen'
  message_preview text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_date, session_type)
);

ALTER TABLE public.market_session_log ENABLE ROW LEVEL SECURITY;

-- Backend (service role) only — this is purely an internal cron
-- idempotency guard, never read or written from the client app.
DROP POLICY IF EXISTS "service role manages market_session_log"
  ON public.market_session_log;

CREATE POLICY "service role manages market_session_log"
  ON public.market_session_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
