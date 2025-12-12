-- Create trigger function to notify users on new signal creation
CREATE OR REPLACE FUNCTION public.notify_users_new_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only notify for published signals
  IF NEW.published = true THEN
    -- Insert notification for all premium/trial users
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    SELECT 
      id,
      '🆕 New Signal: ' || NEW.pair,
      NEW.type || ' ' || NEW.pair || ' - Entry: ' || COALESCE(NEW.entry, 'N/A'),
      'new_signal',
      jsonb_build_object(
        'signal_id', NEW.id,
        'pair', NEW.pair,
        'type', NEW.type,
        'category', NEW.category
      )
    FROM public.profiles
    WHERE subscription_status IN ('premium', 'free_trial')
      AND (
        (subscription_status = 'premium' AND subscription_end_date > now()) OR
        (subscription_status = 'free_trial' AND trial_end_date > now())
      );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new signal notifications
DROP TRIGGER IF EXISTS trigger_notify_new_signal ON public.signals;
CREATE TRIGGER trigger_notify_new_signal
AFTER INSERT ON public.signals
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_new_signal();

-- Create trigger function to notify users on new chart analysis
CREATE OR REPLACE FUNCTION public.notify_users_new_chart()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only notify for published charts
  IF NEW.published = true THEN
    -- Insert notification for all users
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    SELECT 
      id,
      '📊 New Chart Analysis',
      NEW.title,
      'new_chart',
      jsonb_build_object(
        'chart_id', NEW.id,
        'title', NEW.title
      )
    FROM public.profiles;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new chart analysis notifications
DROP TRIGGER IF EXISTS trigger_notify_new_chart ON public.chart_analysis;
CREATE TRIGGER trigger_notify_new_chart
AFTER INSERT ON public.chart_analysis
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_new_chart();

-- Add RLS policy for notifications insert via triggers (system insert)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);