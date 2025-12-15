-- Add entry_mode column to signals table
-- Values: 'market' (default) or 'limit'
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS entry_mode text DEFAULT 'market';

-- Add limit_entry_price column for storing the limit price when entry_mode is 'limit'
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS limit_entry_price numeric DEFAULT NULL;

-- Add is_activated column to track if a limit order has been activated
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS is_activated boolean DEFAULT true;

-- Add activated_at column to track when limit order was activated
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.signals.entry_mode IS 'Order entry mode: market (immediate) or limit (pending until price hits)';
COMMENT ON COLUMN public.signals.limit_entry_price IS 'The limit price for pending orders';
COMMENT ON COLUMN public.signals.is_activated IS 'Whether the signal has been activated (always true for market orders, false initially for limit orders)';
COMMENT ON COLUMN public.signals.activated_at IS 'Timestamp when limit order was activated';