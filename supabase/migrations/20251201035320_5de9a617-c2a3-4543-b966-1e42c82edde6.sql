-- Add is_premium column to signals table for premium lock feature
ALTER TABLE public.signals 
ADD COLUMN is_premium boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.signals.is_premium IS 'When true, signal is locked and only visible to premium users';