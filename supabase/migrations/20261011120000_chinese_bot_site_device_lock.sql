-- Chinese Bot site (chinese-bot29.vercel.app): one key = one device.
ALTER TABLE public.license_orders
  ADD COLUMN IF NOT EXISTS bound_device_id   text,
  ADD COLUMN IF NOT EXISTS bound_at          timestamptz,
  ADD COLUMN IF NOT EXISTS last_verified_at  timestamptz;

-- Attempts log, used only for rate limiting (service role only, no policies).
CREATE TABLE IF NOT EXISTS public.license_verify_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         text NOT NULL,
  success    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_license_verify_attempts_ip
  ON public.license_verify_attempts (ip, created_at DESC);
ALTER TABLE public.license_verify_attempts ENABLE ROW LEVEL SECURITY;
