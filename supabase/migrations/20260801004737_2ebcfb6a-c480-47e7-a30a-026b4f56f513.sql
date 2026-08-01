-- Remove overly permissive gift_codes policies
DROP POLICY IF EXISTS "read own gift" ON public.gift_codes;
DROP POLICY IF EXISTS "redeem gift" ON public.gift_codes;

-- Only the creator, the redeemer, or an admin may read a gift code
CREATE POLICY "gift_codes_select_own"
ON public.gift_codes
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR redeemed_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- No direct client UPDATEs: redemption happens only via the
-- security-definer function public.redeem_gift_code(text).
