# Live Signal29 — Full Project README

Professional trading-signal platform (Forex, Commodities/Gold, Crypto,
Deriv synthetic indices) with a Telegram-connected admin panel: signal
generation, client management (MT5 copier + account management),
premium/payments, and a Telegram bot for distribution and profit-share
collection.

---

## 1. Tech Stack

- **Frontend:** React 18 + TypeScript + Vite, shadcn/ui (Radix
  primitives) + Tailwind CSS
- **Data/state:** `@tanstack/react-query`
- **Backend:** Supabase (Postgres + Row Level Security, Edge Functions,
  `pg_cron` / `pg_net` for scheduled jobs, Realtime for live UI updates)
- **i18n:** `i18next` / `react-i18next` — English, Urdu, Hindi
  (`src/i18n/index.ts`)
- **Distribution:** Telegram Bot API (signals channel + private
  per-client bot messages)
- **Payments:** NOWPayments (crypto) + Google Play Billing
- **Notifications:** OneSignal (push)

Project id (Supabase): `ytlynoknnvgpdkqsrfnl` (region `ap-northeast-2`).

---

## 2. Environment Variables

`.env` at project root:

```
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ONESIGNAL_APP_ID=...
VITE_TELEGRAM_BOT_USERNAME=...     # public bot @username, used to build t.me/<bot>?start=<token> links
```

Edge Function **secrets** (set in Supabase Dashboard → Project Settings
→ Edge Functions → Secrets, never in code):

- `TELEGRAM_BOT_TOKEN` — bot token for posting to the channel and
  messaging clients
- `TELEGRAM_CHANNEL_ID` — numeric channel id (bot must be **admin** in
  the channel, not just a member)
- NOWPayments API key/secret (crypto checkout)
- Any MT5/MetaApi and Deriv WebSocket credentials used by
  `fetch-live-prices` / `mt5-*` functions
- Play Billing service-account credentials (`verify-play-purchase`)

---

## 3. Local Development

```bash
npm install
npm run dev        # Vite dev server
npm run build       # production build
npm run lint
```

Supabase CLI (optional, for local DB + functions):

```bash
supabase start
supabase db push              # apply migrations
supabase functions deploy <name>
```

If deploying via Lovable/GitHub auto-deploy, just commit — no manual
build step needed on your side.

---

## 4. Frontend Structure

```
src/
  pages/            One file per route (Forex/Commodities/Crypto/Deriv
                     signal pages, Academy, Backtesting, Calculator,
                     Portfolio, Premium, Referrals, Leaderboard,
                     Admin login + dashboard, auth pages, legal pages...)
  components/        Shared UI: signal cards, banners, header/footer,
                     price alerts, trade journal, streaks, MT5 copier
                     widgets, notification system, SEO/structured data...
  components/admin/  Admin-only panels (see §6 below)
  components/ui/     shadcn/ui primitives (button, card, dialog, popover,
                     command palette, collapsible, etc.)
  hooks/             Reusable React hooks
  integrations/supabase/  Auto-generated Supabase client + DB types
  i18n/               en / ur / hi translation resources
  config/ads.ts       Ad slot configuration
  lib/                Utilities
```

Routing/pages cover: signal dashboards per market, Academy, Chart
Analysis, Economic Calendar, Market Brief, AI Chat assistant, Trade
Journal, Price Alerts, Portfolio, Compound Calculator, Backtesting,
Leaderboard, Referrals, Gift Premium, Crypto Deposit / Payment Success,
Onboarding, Auth (Login/Signup/Forgot/Reset password), Profile,
Settings, Notifications, legal pages (Privacy/Terms/About/Contact).

---

## 5. Backend (Supabase)

### Core domain tables (via 85 migrations under `supabase/migrations/`)
- `signals` — generated trading signals (entry/SL/TP, status, Telegram
  message linkage for editable posts)
- `mt5_copier_requests` — clients using the MT5 copier service
  (Telegram link, contact, performance, public leaderboard visibility)
- `account_management_applications` — "managed account" applicants
  (Telegram link, WhatsApp, performance)
- `client_payment_shares` + `payment_settings` — profit-share billing
  flow (see §6.5)
- `market_session_log` — idempotency guard for Friday/Monday market
  session announcements
- Plus: users/roles (`has_role`, `app_role`), coupons, headlines,
  special offers, chart analysis posts, activity log, market ideas —
  each with its own migration.

### Signal engine
Multi-confluence indicator system (EMA50/200, RSI14, MACD,
break-of-structure — needs 3-of-4 agreement) with ATR-based SL/TP,
applied to Forex/Commodities. Deriv synthetic indices (VOL, Boom/Crash)
use legacy logic pending a proper candle data source, and pull live
prices from Deriv's public WebSocket (batched connections) since MT5
brokers don't carry them reliably.

### Key Edge Functions (`supabase/functions/`)
- `auto-generate-signals` — deterministic 30-min cron signal generation
  per pair category, posts to Telegram with chart images
- `auto-close-signals` — 1-min cron; checks live price against every
  OPEN signal's SL/TP/expiry and closes it server-side (fixes the
  "signal never closes without the browser open" issue)
- `telegram-signal-post` — posts/edits the channel message for a signal
- `auto-generate-ideas` — auto market ideas with chart images
- `fetch-live-prices` — MT5/MetaApi + Deriv WebSocket price feed
- `calculate-daily-stats`, `market-session-announcer` (Fri close / Mon
  reopen posts), `trial-notifications`
- `mt5-copier-request`, `mt5-demo-trade`, `mt5-settings`
- `account-management-notify`
- `fetch-forex-news`, `generate-market-brief`, `ai-chat`
- `nowpayments-create-payment` / `-check-payment` / `-currencies`,
  `verify-play-purchase` — payments
- `send-2fa-code`, `admin-delete-user`, `send-onesignal-notification`

> Note: the profit-share Telegram bot functions (`payment-share-send-request`,
> `payment-share-verify`, `payment-share-reminders`, and the older
> `profit-share`) referenced by the admin UI are deployed on the live
> Supabase project but are **not included in this exported repo zip** —
> they exist only on the Supabase side. Any change to that bot logic
> needs to be made directly against the deployed project.

### Cron jobs (`pg_cron` + `pg_net`)
- Signal generation every 30 min
- Auto-close every 1 min
- Payment-share reminders every 5 min
- Market session announcer (Fri/Mon windows)

---

## 6. Admin Panel (`src/components/admin/`, entry: `AdminDashboard.tsx`)

1. **SignalForm / SignalsList** — manual signal creation + management,
   editable TP/SL that syncs to the live Telegram post
2. **MT5CopierManagement** — copier client requests: Telegram/WhatsApp
   linking status, performance details, public leaderboard toggle
3. **AccountApplications** — managed-account applicants, same
   Telegram/WhatsApp linking pattern
4. **PaymentShareManagement** *(current/active)* — profit-share billing:
   - Select any Copier or Account-Management client
   - Auto-detects if they're already linked to the bot elsewhere (no
     duplicate "start the bot" step needed)
   - Enter profit + share % → auto-computed share amount → Save
   - Send Payment Request via Telegram, then Verify & Send Receipt
   - Multiple saved payment addresses (Add/Edit/Delete)
   - Searchable, clickable request list (click a row to reload/edit it,
     including finishing a Draft)
   - All three sections collapsible
   - *(`ProfitShareManagement.tsx` is an earlier/parallel version of
     this same feature — not the one wired into the current admin
     screens.)*
5. **PerformanceManagement** — per-client/per-pair performance entries
6. **UserManagement / ActivityLog / UserActivityDashboard** — accounts,
   roles, audit trail
7. **CouponManagement / SpecialOfferManagement** — promo codes, flash
   offers/banners
8. **HeadlinesManagement / MarketIdeasManagement** — ticker headlines,
   posted market ideas
9. **ChartAnalysisForm / ChartAnalysisList** — published chart analysis
   posts
10. **TelegramPairApprovals** — approve which pairs post automatically
11. **MT5ConnectionSettings** — MT5/MetaApi connection config
12. **AdminGlobalSearch** — cross-panel search

Auth: `AdminLogin.tsx`, role-gated via Postgres `has_role()` + RLS
policies (`admin` role) on every admin-facing table.

---

## 7. Telegram Integration Summary

- **Public channel:** auto-generated + manual signals post here
  (`telegram-signal-post`), editable in place as TP/SL updates instead
  of spamming new messages.
- **Per-client bot (private chat):**
  - Copier / Account-Management clients link once via their own
    `telegram_chat_id` on their respective table.
  - Profit-share flow reuses that same link — see §6.4 — and message
    clients directly for payment requests, reminders (every 15 min
    while "I'll check later"), and payment receipts.
- Bot must be added as **admin** to the public channel, or channel
  posts silently fail (check `telegram_posted` / `telegram_error` in
  `auto-generate-signals`'s response if posts stop appearing).

---

## 8. Recent Fix History (high level)

- Deriv (VOL/Boom-Crash) frozen prices → fixed via Deriv public
  WebSocket with batched connections
- Client-side SL/TP evaluation in `SignalCardNew.tsx` was overwriting
  admin edits with stale prices → fixed with a priming ref + breach-streak
  confirmation
- VOL 75 signal respawn loop → cooldown added to `auto-generate-signals`
- Gold signals never auto-closing (dead client-side-only close logic) →
  new server-side `auto-close-signals` cron
- Telegram channel posts silently failing / wrong direction emoji →
  fallback field reading + surfaced `telegram_error` in the generator's
  response
- Payment Share panel: linked-client detection, clickable draft rows,
  multiple payment addresses, collapsible sections (this session — see
  the migration dated `20260926120000`)

---

## 9. Deploying Changes

- **Frontend-only changes** (most admin panel work): replace the file(s)
  in your repo at the same path and push — Lovable/GitHub auto-deploy
  handles the rest.
- **New Edge Function or function change:** `supabase functions deploy <name>`
  (or push via your CI if it deploys functions automatically).
- **New migration:** `supabase db push`, or paste the SQL directly into
  Supabase Dashboard → SQL Editor. (Migrations already applied directly
  to the live project during a session don't need to be re-run — check
  `supabase/migrations/` filenames against what's already live if unsure.)
