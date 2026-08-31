-- Performance fields the admin fills in manually, plus a flag controlling
-- whether a copier account appears on the public "Copier List" leaderboard.
ALTER TABLE public.mt5_copier_requests
ADD COLUMN profit_amount NUMERIC,
ADD COLUMN loss_amount NUMERIC,
ADD COLUMN risk_reward_ratio TEXT,
ADD COLUMN profit_percent NUMERIC,
ADD COLUMN loss_percent NUMERIC,
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Public-safe view: exposes ONLY the name + performance numbers, never the
-- MT5 login/password/broker/contact fields, and only for rows the admin has
-- explicitly marked is_public = true. Views in Postgres run with the
-- privileges of their owner by default, so this view can read the
-- admin-only base table while still being safely queryable by anon/
-- authenticated users — they only ever see the limited column set below.
CREATE VIEW public.mt5_copier_public_stats AS
SELECT
  id,
  name,
  profit_amount,
  loss_amount,
  risk_reward_ratio,
  profit_percent,
  loss_percent,
  status,
  created_at,
  updated_at
FROM public.mt5_copier_requests
WHERE is_public = true;

GRANT SELECT ON public.mt5_copier_public_stats TO anon, authenticated;
