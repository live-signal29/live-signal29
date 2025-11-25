-- Create coupons table for discount code management
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  expiry_date timestamp with time zone,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  applicable_plans text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create coupon_usage table to track who used which coupons
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now(),
  subscription_id uuid,
  discount_applied numeric NOT NULL
);

-- Create special_offers table for countdown timer
CREATE TABLE IF NOT EXISTS public.special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;

-- Coupons policies
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- Coupon usage policies
CREATE POLICY "Admins can view all coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own usage"
  ON public.coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Special offers policies
CREATE POLICY "Anyone can view active special offers"
  ON public.special_offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage special offers"
  ON public.special_offers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for coupons updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_special_offers_updated_at
  BEFORE UPDATE ON public.special_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();