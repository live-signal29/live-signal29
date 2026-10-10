-- Chinese Bot license purchases (Telegram bot + in-app) and key activation.
-- Plans: 6 months = $30, lifetime = $70.

CREATE TABLE IF NOT EXISTS public.license_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan              text NOT NULL CHECK (plan IN ('6m', 'lifetime')),
  plan_label        text NOT NULL,
  amount            numeric NOT NULL,
  source            text NOT NULL CHECK (source IN ('app', 'bot')),
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name     text,
  telegram_username text,
  telegram_chat_id  bigint,
  cryptocurrency    text,
  wallet_address    text,
  transaction_id    text,
  proof_file_id     text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('awaiting_txid', 'pending', 'approved', 'rejected')),
  license_key       text UNIQUE,
  approved_at       timestamptz,
  activated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at      timestamptz,
  expires_at        timestamptz,
  key_sent_via_bot  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_orders_status ON public.license_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_orders_chat ON public.license_orders (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_license_orders_user ON public.license_orders (user_id);

ALTER TABLE public.license_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_orders_select" ON public.license_orders;
CREATE POLICY "license_orders_select" ON public.license_orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR activated_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Users may only create their own PENDING in-app order; they can never set a key or approve.
DROP POLICY IF EXISTS "license_orders_insert_own" ON public.license_orders;
CREATE POLICY "license_orders_insert_own" ON public.license_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND source = 'app'
    AND status = 'pending'
    AND license_key IS NULL
    AND activated_by IS NULL
  );

DROP POLICY IF EXISTS "license_orders_admin_update" ON public.license_orders;
CREATE POLICY "license_orders_admin_update" ON public.license_orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "license_orders_admin_delete" ON public.license_orders;
CREATE POLICY "license_orders_admin_delete" ON public.license_orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Activate a key typed in the app. The key is bound to the first account that activates it.
CREATE OR REPLACE FUNCTION public.activate_license_key(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_key   text := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
  v_fmt   text;
  v_row   public.license_orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please log in first.');
  END IF;
  IF length(v_key) <> 16 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid license key.');
  END IF;

  v_fmt := substr(v_key, 1, 4) || '-' || substr(v_key, 5, 4) || '-' || substr(v_key, 9, 4) || '-' || substr(v_key, 13, 4);

  SELECT * INTO v_row
  FROM public.license_orders
  WHERE license_key = v_fmt AND status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid license key.');
  END IF;

  IF v_row.activated_by IS NOT NULL AND v_row.activated_by <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This key is already used on another account.');
  END IF;

  IF v_row.activated_by IS NULL THEN
    UPDATE public.license_orders
    SET activated_by = v_uid,
        activated_at = now(),
        expires_at = CASE WHEN plan = '6m' THEN now() + interval '6 months' ELSE NULL END,
        updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This license has expired.', 'expires_at', v_row.expires_at);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'plan', v_row.plan,
    'plan_label', v_row.plan_label,
    'expires_at', v_row.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_license_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_license_key(text) TO authenticated;

-- Payment methods shown for license purchases come from the admin's Payment Settings
-- (payment_settings.payment_addresses). That table is admin-only, so the app reads it through this
-- function, which returns only label + address (public pay-to details).
CREATE OR REPLACE FUNCTION public.get_license_payment_methods()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('id', e->>'id', 'label', e->>'label', 'address', e->>'address'))
      FROM public.payment_settings ps,
           jsonb_array_elements(ps.payment_addresses) e
      WHERE ps.id = 'default'
        AND COALESCE(e->>'label', '') <> ''
        AND COALESCE(e->>'address', '') <> ''
    ),
    '[]'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.get_license_payment_methods() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_license_payment_methods() TO authenticated;
