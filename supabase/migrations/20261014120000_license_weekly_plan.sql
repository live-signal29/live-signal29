-- Chinese Bot license: add the Weekly plan ($7, 7 days).

-- 1) Allow plan = 'weekly'.
ALTER TABLE public.license_orders DROP CONSTRAINT IF EXISTS license_orders_plan_check;

ALTER TABLE public.license_orders
  ADD CONSTRAINT license_orders_plan_check CHECK (plan IN ('weekly', '6m', 'lifetime'));

-- 2) Key activation: weekly keys expire 7 days after activation.
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
        expires_at = CASE
                       WHEN plan = 'weekly' THEN now() + interval '7 days'
                       WHEN plan = '6m'     THEN now() + interval '6 months'
                       ELSE NULL
                     END,
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
