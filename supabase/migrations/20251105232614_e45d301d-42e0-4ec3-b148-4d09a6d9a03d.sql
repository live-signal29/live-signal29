-- Add sl_hit boolean field to signals table
ALTER TABLE public.signals 
ADD COLUMN sl_hit boolean DEFAULT false;