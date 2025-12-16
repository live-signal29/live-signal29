-- Create headlines table for ticker system
CREATE TABLE public.headlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL CHECK (char_length(text) <= 120),
  headline_type TEXT NOT NULL DEFAULT 'normal' CHECK (headline_type IN ('normal', 'high_alert')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.headlines ENABLE ROW LEVEL SECURITY;

-- RLS policies for headlines
CREATE POLICY "Anyone can view active headlines" ON public.headlines
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage headlines" ON public.headlines
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_headlines_updated_at
  BEFORE UPDATE ON public.headlines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for headlines
ALTER PUBLICATION supabase_realtime ADD TABLE public.headlines;