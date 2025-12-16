
-- Add is_premium column to trade_history
ALTER TABLE public.trade_history 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Update existing records to sync is_premium from their original signals
UPDATE public.trade_history th
SET is_premium = s.is_premium
FROM public.signals s
WHERE th.signal_id = s.id AND th.is_premium IS NULL;

-- Update the move_signal_to_history trigger to include is_premium
CREATE OR REPLACE FUNCTION public.move_signal_to_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result TEXT;
  v_pips NUMERIC;
  v_tp_hit INTEGER;
BEGIN
  -- Only trigger when signal is closed and wasn't already auto-closed
  IF NEW.signal_status = 'CLOSE' AND (OLD.signal_status IS DISTINCT FROM 'CLOSE' OR OLD.auto_closed IS NOT TRUE) THEN
    -- Determine result and pips based on TP/SL hits
    IF NEW.sl_hit THEN
      v_result := 'loss';
      v_pips := -1 * COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp4_hit THEN
      v_result := 'win';
      v_tp_hit := 4;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp3_hit THEN
      v_result := 'win';
      v_tp_hit := 3;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp2_hit THEN
      v_result := 'win';
      v_tp_hit := 2;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSIF NEW.tp1_hit THEN
      v_result := 'win';
      v_tp_hit := 1;
      v_pips := COALESCE(NULLIF(NEW.pips_result, '')::numeric, 0);
    ELSE
      v_result := 'breakeven';
      v_pips := 0;
    END IF;

    -- Insert into trade history with is_premium
    INSERT INTO public.trade_history (
      signal_id, pair, type, category, entry, tp1, tp2, tp3, tp4, sl,
      result, pips_gained, tp_hit_level, sl_hit, risk_level, signal_type, notes, is_premium
    ) VALUES (
      NEW.id, NEW.pair, NEW.type, NEW.category, NEW.entry,
      NEW.tp1, NEW.tp2, NEW.tp3, NEW.tp4, NEW.sl,
      v_result, v_pips, v_tp_hit, NEW.sl_hit, NEW.risk_level, NEW.signal_type, NEW.note, NEW.is_premium
    );

    -- Mark as auto-closed
    NEW.auto_closed := true;
  END IF;

  RETURN NEW;
END;
$$;
