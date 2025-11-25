-- Add new columns to signals table for enhanced features
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS signal_status text DEFAULT 'OPEN' CHECK (signal_status IN ('OPEN', 'CLOSE', 'LIVE')),
ADD COLUMN IF NOT EXISTS pips_result text,
ADD COLUMN IF NOT EXISTS risk_level text CHECK (risk_level IN ('Low', 'Medium', 'High')),
ADD COLUMN IF NOT EXISTS signal_type text CHECK (signal_type IN ('Scalping', 'Intraday', 'Swing', 'Long Term')),
ADD COLUMN IF NOT EXISTS analysis_reason text,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);