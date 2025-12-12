-- Create table for account management applications
CREATE TABLE public.account_management_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_broker TEXT NOT NULL,
  account_size TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for live performance data (admin editable)
CREATE TABLE public.account_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL, -- e.g., 'daily', 'weekly', 'monthly'
  date DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  profit_percentage NUMERIC DEFAULT 0,
  notes TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_management_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies for applications
CREATE POLICY "Anyone can submit applications"
ON public.account_management_applications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
ON public.account_management_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage applications"
ON public.account_management_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for performance data
CREATE POLICY "Anyone can view published performance"
ON public.account_performance
FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage performance data"
ON public.account_performance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));