-- Drop the old category check constraint
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_category_check;

-- Add updated category check constraint with all valid categories
ALTER TABLE public.signals ADD CONSTRAINT signals_category_check 
CHECK (category = ANY (ARRAY['XAUUSD'::text, 'FOREX'::text, 'INDICES'::text, 'CRYPTO'::text, 'COMMODITIES'::text, 'DERIV'::text]));