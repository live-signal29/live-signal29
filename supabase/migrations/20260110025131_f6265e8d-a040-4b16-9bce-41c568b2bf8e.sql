-- Add tag column to signals table for event tags like NFP Trade, CPI News
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tag TEXT;

-- Add signal_raw_text column for storing raw pasted signal text
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS signal_raw_text TEXT;