
CREATE OR REPLACE FUNCTION public.auto_close_tp2_signals_on_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a new signal is published, auto-close all open signals that have TP2 hit
  IF NEW.published = true THEN
    UPDATE public.signals
    SET signal_status = 'close',
        status = 'close',
        profit_note = 'TP 2 Secured! 💰 Signal Closed - New Signal Active',
        updated_at = now()
    WHERE LOWER(signal_status) = 'open'
      AND tp2_hit = true
      AND published = true
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_signal_close_tp2
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_tp2_signals_on_new();
