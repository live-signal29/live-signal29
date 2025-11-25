-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to notify all users when a coupon is created
CREATE OR REPLACE FUNCTION public.notify_users_new_coupon()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all users
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT 
    id,
    '🎉 New Discount Available!',
    'Use code ' || NEW.code || ' for ' || 
    CASE 
      WHEN NEW.discount_type = 'percentage' THEN NEW.discount_value || '% OFF'
      ELSE '$' || NEW.discount_value || ' OFF'
    END,
    'coupon',
    jsonb_build_object(
      'coupon_id', NEW.id,
      'coupon_code', NEW.code,
      'discount_type', NEW.discount_type,
      'discount_value', NEW.discount_value,
      'expiry_date', NEW.expiry_date
    )
  FROM public.profiles
  WHERE id != auth.uid(); -- Don't notify the admin who created it
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to notify users when coupon is created
CREATE TRIGGER on_coupon_created
AFTER INSERT ON public.coupons
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.notify_users_new_coupon();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;