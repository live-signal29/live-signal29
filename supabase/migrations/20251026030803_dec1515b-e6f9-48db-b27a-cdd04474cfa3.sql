-- Add new columns for main category and sub category to signals table
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS main_category TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Update existing records to have default main_category based on current category
UPDATE signals 
SET main_category = CASE 
  WHEN category = 'XAUUSD' THEN 'COMMODITIES'
  WHEN category = 'Forex' THEN 'FOREX'
  WHEN category = 'Index' THEN 'INDICES'
  ELSE 'FOREX'
END
WHERE main_category IS NULL;

-- Update sub_category to use the pair value
UPDATE signals 
SET sub_category = pair
WHERE sub_category IS NULL;