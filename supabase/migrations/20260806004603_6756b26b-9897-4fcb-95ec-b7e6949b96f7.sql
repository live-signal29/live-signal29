DROP POLICY IF EXISTS "create gift" ON public.gift_codes;
CREATE POLICY "Only admins can create gift codes"
ON public.gift_codes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

SELECT cron.schedule(
  'live-prices-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://scqgxekharzvanhhfoir.supabase.co/functions/v1/fetch-live-prices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);