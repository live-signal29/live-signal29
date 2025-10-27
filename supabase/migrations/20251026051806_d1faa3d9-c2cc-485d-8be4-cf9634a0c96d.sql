-- Fix storage bucket policies to restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can upload chart images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chart images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update chart images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete chart images" ON storage.objects;

-- Create comprehensive admin-only policy for chart-images bucket
CREATE POLICY "Only admins can manage chart images" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'chart-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'chart-images' AND public.has_role(auth.uid(), 'admin'));

-- Also restrict signals table to admin-only modifications
DROP POLICY IF EXISTS "Authenticated users can insert signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated users can update signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated users can delete signals" ON public.signals;

CREATE POLICY "Only admins can insert signals" ON public.signals
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update signals" ON public.signals
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete signals" ON public.signals
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Restrict chart_analysis table to admin-only modifications
DROP POLICY IF EXISTS "Authenticated users can insert chart analysis" ON public.chart_analysis;
DROP POLICY IF EXISTS "Authenticated users can update chart analysis" ON public.chart_analysis;
DROP POLICY IF EXISTS "Authenticated users can delete chart analysis" ON public.chart_analysis;

CREATE POLICY "Only admins can insert chart analysis" ON public.chart_analysis
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update chart analysis" ON public.chart_analysis
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete chart analysis" ON public.chart_analysis
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));