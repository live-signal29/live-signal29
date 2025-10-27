-- Add profit_note column to signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS profit_note text;