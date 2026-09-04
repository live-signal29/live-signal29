# Kya fix kiya (2 issues)

## Issue 2 pehle (asli root cause): Gold signal close nahi hota

Code check karne par pata chala ki signal ko close karne wala logic
**kabhi chalta hi nahi tha**:

- `useAutoTPSLUpdate` (TP/SL hit detect karke close karne wala hook)
  poore app me kahin bhi call hi nahi ho raha tha — dead code tha.
- Doosra system (`useSignalTimer`) sirf tab kaam karta jab kisi
  signal ka `expiry_time` set ho AUR koi user us waqt app khole
  baitha ho — auto-generated signals me `expiry_time` set hi nahi
  hota tha, aur ye purely browser-side tha, server pe kabhi nahi
  chalta.

Isliye Gold ka OPEN signal kabhi close nahi hota tha, aur har 15 min
me generator ko lagta rehta "pair free hai" nahi... asal me generator
ka apna check theek tha (`evaluatePair`), lekin jab tak koi cheez
signal ko close hi nahi karti, wo hamesha atka rehta.

**Fix:** naya server-side function `auto-close-signals` banaya hai jo
har 1 minute cron se chalega, live price ke against har OPEN signal
ka SL/TP check karega, aur SL ya final target hit hote hi (ya
`expiry_time` nikal jaane par) us signal ko khud CLOSE kar dega —
kisi browser ke open hone ki zaroorat nahi.

Naye migration file me ye cron job schedule ho gaya hai, aur ek
one-time cleanup bhi hai jo 48 ghante se purane atke hue OPEN
signals ko turant close kar dega taake generator turant free ho
jaaye.

## Issue 1: Telegram par post nahi ho raha

Do cheezein fix ki:

1. **Bug:** `telegram-signal-post` message banate waqt `signal.type`
   padhta tha, lekin auto-generator signal `action`/`direction`
   bhejta tha — `type` kabhi hota hi nahi tha. Ab fallback add kar
   diya (`type || action || direction`) taake Direction blank ya
   ulta emoji na dikhe.
2. **Silent failure fix:** pehle agar Telegram post fail hota tha
   (e.g. galat/missing bot token ya channel id), to error sirf log
   me chhup jaata tha, response me kuch pata hi nahi chalta tha. Ab
   `auto-generate-signals` ka response `telegram_posted` aur
   `telegram_error` field dikhayega — agar wo `false` aaye to seedha
   pata chal jayega ki asli wajah kya hai.

⚠️ **Zaroori check (main wajah ho sakti hai):** agar Telegram post
abhi bhi fail ho, to sabse pehle Supabase project ke Edge Function
secrets check karo:

- `TELEGRAM_BOT_TOKEN` — sahi bot token set hai?
- `TELEGRAM_CHANNEL_ID` — channel ki numeric ID (jaise `-1001234567890`)
  sahi hai? Username (`@channel`) kaam nahi karega agar bot ko
  channel me admin nahi banaya.
- Bot channel me **admin** banaya hua hai (sirf member kaafi nahi,
  post karne ke liye admin chahiye).

Ye secrets Supabase dashboard > Project Settings > Edge Functions >
Secrets me set hote hain — code me nahi.

---

## Files is folder me (waapas apne project me copy karo)

```
supabase/config.toml                                        (updated)
supabase/functions/auto-generate-signals/index.ts            (updated)
supabase/functions/telegram-signal-post/index.ts             (updated)
supabase/functions/auto-close-signals/index.ts               (NEW)
supabase/migrations/20260903120000_auto_close_signals_cron.sql (NEW)
```

## Deploy kaise karein

Agar Supabase CLI use karte ho:

```bash
supabase functions deploy auto-generate-signals
supabase functions deploy telegram-signal-post
supabase functions deploy auto-close-signals

supabase db push   # migration (naya cron job) apply karne ke liye
```

Agar Lovable/GitHub se deploy hota hai, to bas ye files apne repo me
same paths par replace/add karke commit-push kar do — auto-deploy ho
jayega. Migration SQL Supabase dashboard ke SQL Editor me bhi
directly paste-run kar sakte ho.

Deploy ke baad 15-20 min wait karke check karo:
- Gold ke multiple OPEN signals ab apne aap close ho rahe hain ya nahi.
- Telegram channel me naya signal post ho raha hai ya nahi (agar
  nahi, to `auto-generate-signals` response me `telegram_error`
  dekh lena — wahi asli wajah bata dega).
