-- Create signals table for all trading signals
CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Buy', 'Sell')),
  category TEXT NOT NULL CHECK (category IN ('XAUUSD', 'Forex', 'Index')),
  entry TEXT NOT NULL,
  tp1 TEXT NOT NULL,
  tp2 TEXT,
  tp3 TEXT,
  tp4 TEXT,
  sl TEXT NOT NULL,
  note TEXT,
  tp1_hit BOOLEAN DEFAULT false,
  tp2_hit BOOLEAN DEFAULT false,
  tp3_hit BOOLEAN DEFAULT false,
  tp4_hit BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'All TP Hit', 'Closed')),
  published BOOLEAN DEFAULT true,
  chart_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chart analysis table
CREATE TABLE public.chart_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view published signals"
ON public.signals FOR SELECT
USING (published = true);

CREATE POLICY "Anyone can view published chart analysis"
ON public.chart_analysis FOR SELECT
USING (published = true);

-- Create policies for admin access (will use authenticated users)
CREATE POLICY "Authenticated users can insert signals"
ON public.signals FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update signals"
ON public.signals FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete signals"
ON public.signals FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all signals"
ON public.signals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert chart analysis"
ON public.chart_analysis FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update chart analysis"
ON public.chart_analysis FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete chart analysis"
ON public.chart_analysis FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all chart analysis"
ON public.chart_analysis FOR SELECT
TO authenticated
USING (true);

-- Create storage bucket for chart images
INSERT INTO storage.buckets (id, name, public) VALUES ('chart-images', 'chart-images', true);

-- Create storage policies
CREATE POLICY "Public can view chart images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chart-images');

CREATE POLICY "Authenticated users can upload chart images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chart-images');

CREATE POLICY "Authenticated users can update chart images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chart-images');

CREATE POLICY "Authenticated users can delete chart images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chart-images');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_signals_updated_at
BEFORE UPDATE ON public.signals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chart_analysis_updated_at
BEFORE UPDATE ON public.chart_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();