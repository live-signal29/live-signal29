-- Add telegram_username to account_management_applications so the
-- "Secure Your Allocation" form can require Telegram alongside WhatsApp.
-- Nullable at the DB level (existing rows have none); the frontend zod
-- schema is what actually enforces it as required going forward.
ALTER TABLE public.account_management_applications
ADD COLUMN IF NOT EXISTS telegram_username text;
