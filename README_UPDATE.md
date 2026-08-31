# What's in this update

## Files changed & where they go
Copy each file over the EXACT same path in your repo (create folders if
they don't already exist):

| File in this zip | Goes to (in your repo) | What changed |
|---|---|---|
| `supabase/functions/mt5-demo-trade/index.ts` | `supabase/functions/mt5-demo-trade/index.ts` | Gold/BTCUSD-only filter, retry logic for TP1/2/3, fallback login |
| `src/index.css` | `src/index.css` | New glow/animation utility classes |
| `src/pages/SignalsDashboard.tsx` | `src/pages/SignalsDashboard.tsx` | Glowing active tab, fade-slide animation on tab switch |
| `src/components/MT5CopierBanner.tsx` | `src/components/MT5CopierBanner.tsx` | Changed to cyan (secondary) color + glow, so it's not just another green banner |
| `src/components/CopierLeaderboard.tsx` | `src/components/CopierLeaderboard.tsx` | 3D glow hover on leaderboard cards |
| `src/components/SignalCardNew.tsx` | `src/components/SignalCardNew.tsx` | 3D glow hover on every signal card |

---

## 1. Copier List — why a new submission doesn't show up automatically
This is expected, by your own earlier instruction: when someone submits
the "Connect MT5" form, it does **not** auto-publish. You (admin) have to
go to **Admin → Copier**, fill in their Profit/Loss/Risk:Reward numbers,
and flip **"Show on public Copier List"** ON. Only then do they appear on
the public list. This was intentional so raw/unverified submissions never
show publicly by accident. If you'd rather have them appear immediately
(with $0 stats, editable later), let me know and I'll change the default.

## 2. Dashboard glow / animated / "3D" feel
- Active category tab now has a soft glowing ring + slight lift.
- Switching tabs (Gold → Forex → Crypto → etc.) now fades/slides the
  content in smoothly instead of snapping instantly.
- Every signal card and every Copier List card now lifts up with a
  glowing shadow on hover/tap ("card-3d-hover").
- This is a first pass focused on the main dashboard (highest-traffic
  screen). Say the word and I'll extend the same treatment to
  Account Management, Premium, Profile, etc. one at a time.

## 3. Color — MT5 banner no longer green
Your theme already had a cyan "secondary" color and a gold "accent"
color defined, just barely used — most buttons default to the green
"primary". I switched the MT5 Copier banner to the cyan secondary color
with its own matching glow, so it visually stands apart from the regular
green CTAs instead of blending in. If there are specific other
green-everywhere spots bugging you, point them out and I'll diversify
those too using the same existing cyan/gold palette (keeps everything
consistent instead of introducing random new colors).

## 4. MT5 auto-trade limited to Gold + BTCUSD
`mt5-demo-trade` now checks the signal's symbol before opening anything.
Anything that isn't Gold (XAU/USD) or BTCUSD is skipped quietly — no
error toast, it just doesn't open a trade. Existing pairs' signals still
post normally everywhere else (Telegram, dashboard); only the MT5
auto-trade step is restricted.

## 5. TP1/TP2/TP3 "sometimes one doesn't open" — retry fix
Each of the 3 legs (TP1, TP2, TP3) now gets **up to 3 attempts** with a
1.5s pause between tries before being marked failed. A momentary broker
rejection/requote will no longer silently leave you with only 2 of 3
trades open.

## 6. Second MT5 login (fallback)
If your primary MT5 account fails to provision/deploy for some reason,
the function now automatically retries the entire trade using a second
login — **if you set it up**. Add these 3 new secrets (Edge Function
Secrets, same place as `MT5_LOGIN`/`MT5_PASSWORD`/`MT5_SERVER`):
```
MT5_LOGIN2
MT5_PASSWORD2
MT5_SERVER2
```
If you don't set these, nothing changes — it just won't have a fallback
to use.

## 7. "SL to break-even when TP1 hits" — already live
Good news: this was already built and is already running automatically
— a scheduled job (`mt5-check-trades-every-minute`, added a few days ago)
calls the check endpoint every minute. When a TP1 trade closes as a win,
it moves the SL of the still-open TP2/TP3 trades to the entry price
automatically. No new file needed for this one; just confirming it's
active. If you've noticed it *not* happening in practice, send me a
screenshot of a case where that occurred and I'll dig into why.

## How to apply
1. Copy the 6 files above to the matching paths.
2. Add the 3 new secrets (`MT5_LOGIN2`, `MT5_PASSWORD2`, `MT5_SERVER2`) —
   optional, only needed if you want the fallback login.
3. Redeploy the `mt5-demo-trade` edge function and the frontend.
