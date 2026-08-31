-- Columns needed to automatically sync each copier account's REAL
-- performance from their own MT5 account (via MetaApi), instead of the
-- admin manually typing numbers in.
ALTER TABLE public.mt5_copier_requests
ADD COLUMN meta_account_id TEXT,
ADD COLUMN initial_balance NUMERIC,
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN sync_error TEXT;
