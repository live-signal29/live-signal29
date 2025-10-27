-- Force types regeneration with a schema change
-- Add a temporary column and then remove it to trigger regeneration

ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS temp_column_for_regeneration TEXT DEFAULT NULL;
ALTER TABLE public.signals DROP COLUMN IF EXISTS temp_column_for_regeneration;