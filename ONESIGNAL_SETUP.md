# OneSignal Push Notifications Setup

## ✅ What's Been Implemented

- OneSignal SDK integration with React
- Automatic permission popup on first visit
- Real-time push notifications for:
  - 🆕 New signals
  - 🎯 TP1, TP2, TP3 hits
  - 🛑 Stop Loss hits  
  - ✅ Signal closures
- WebView/APK compatibility

## 🔧 Configuration Required

### Step 1: Get Your OneSignal App ID

1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Create a new app or select existing
3. Go to **Settings** → **Keys & IDs**
4. Copy your **App ID**

### Step 2: Add App ID to Your Project

Add to your `.env` file (or create one if it doesn't exist):

```
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

Or directly replace in `src/hooks/useOneSignal.ts` line 12:
```typescript
const ONESIGNAL_APP_ID = 'your-app-id-here';
```

### Step 3: Configure OneSignal for Web Push

In your OneSignal dashboard:

1. Go to **Settings** → **Platforms**
2. Click **Configure** for Web Push
3. Add your site URL: `https://live-signal29.vercel.app`
4. Upload your site icons (use existing `/icon-192.png` and `/icon-512.png`)
5. Save configuration

### Step 4: Test Notifications

1. Visit your site
2. Allow notification permissions when prompted
3. Admin creates/updates a signal
4. You should receive a push notification!

## 📱 APK/WebView Compatibility

The implementation works in WebView APKs because:
- Uses native browser Notification API as fallback
- OneSignal SDK handles WebView detection automatically
- Service worker registered for offline capability

## 🔔 Notification Types

| Event | Title | Description |
|-------|-------|-------------|
| New Signal | 🆕 New Trading Signal! | Shows pair, type, and entry price |
| TP Hit | 🎯 TP1/TP2/TP3 Hit! | Shows which TP was reached |
| SL Hit | 🛑 Stop Loss Hit | Alerts when stop loss triggered |
| Signal Closed | ✅ Signal Closed | Notifies when signal is closed |

## 🧪 Testing

Test notifications locally:
1. Run your dev server
2. Open browser console
3. Check for "OneSignal initialized successfully"
4. Create a test signal in admin panel
5. Notification should appear!

## 📝 Notes

- Users must grant permission for notifications to work
- Notifications work even when browser is closed (via service worker)
- OneSignal App ID is public and safe to use in client-side code
- For production, notifications sent from backend via OneSignal REST API (future enhancement)
