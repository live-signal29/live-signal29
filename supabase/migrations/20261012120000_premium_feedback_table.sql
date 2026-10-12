-- One-tap "why not Premium?" answers from users whose trial expired.
CREATE TABLE IF NOT EXISTS public.premium_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     text NOT NULL CHECK (reason IN ('too_expensive','dont_trust','not_needed','need_features','just_looking','other')),
  note       text,
  source     text NOT NULL DEFAULT 'trial_expired_popup',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS premium_feedback_user_source_uniq ON public.premium_feedback (user_id, source);
CREATE INDEX IF NOT EXISTS premium_feedback_created_idx ON public.premium_feedback (created_at DESC);

ALTER TABLE public.premium_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own premium feedback"
  ON public.premium_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own premium feedback"
  ON public.premium_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all premium feedback"
  ON public.premium_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
