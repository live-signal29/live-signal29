-- After a Chinese Bot license is active, the user connects their account (email + password).
-- Admin receives it on Telegram + in the admin panel (Licenses tab) and marks it connected.

CREATE TABLE IF NOT EXISTS public.license_connections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_order_id uuid NOT NULL REFERENCES public.license_orders(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_email    text NOT NULL,
  account_password text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'failed')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_connections_order ON public.license_connections (license_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_connections_status ON public.license_connections (status, created_at DESC);

ALTER TABLE public.license_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_connections_select" ON public.license_connections;
CREATE POLICY "license_connections_select" ON public.license_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users can only submit for a license they activated themselves.
DROP POLICY IF EXISTS "license_connections_insert_own" ON public.license_connections;
CREATE POLICY "license_connections_insert_own" ON public.license_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.license_orders o
      WHERE o.id = license_order_id
        AND o.activated_by = auth.uid()
        AND o.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "license_connections_admin_update" ON public.license_connections;
CREATE POLICY "license_connections_admin_update" ON public.license_connections
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "license_connections_admin_delete" ON public.license_connections;
CREATE POLICY "license_connections_admin_delete" ON public.license_connections
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- activate_license_key now also returns the order id + key so the app can show the Connect page.
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

  -- One key = one account, forever.
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
    'order_id', v_row.id,
    'license_key', v_row.license_key,
    'plan', v_row.plan,
    'plan_label', v_row.plan_label,
    'expires_at', v_row.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_license_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_license_key(text) TO authenticated;
