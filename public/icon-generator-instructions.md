# PWA Icon Structure Guide

## Required Icons for APK Build

Your PWA needs the following icon files in the `/public` folder:

### 1. Standard Icons
- `icon-192.png` - 192x192px PNG (standard resolution)
- `icon-512.png` - 512x512px PNG (high resolution)

### 2. Maskable Icons (Adaptive Icons for Android)
- `icon-maskable-192.png` - 192x192px PNG with safe zone
- `icon-maskable-512.png` - 512x512px PNG with safe zone

## How to Create Icons

### Option 1: Use PWA Asset Generator (Recommended)
```bash
npx @vite-pwa/assets-generator --preset minimal public/favicon.svg
```

### Option 2: Manual Creation
1. Take your logo from `src/assets/trend-friend-logo.png`
2. Use an online tool like:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - https://favicon.io/favicon-converter/

### Option 3: Use Canva or Photoshop
- Create 512x512px canvas
- Center your logo
- Export as PNG
- Resize to 192x192px for smaller version

## Maskable Icon Guidelines
For maskable icons (adaptive icons on Android):
- Keep important content within the **safe zone** (80% of canvas)
- Use a solid background color (#0EA5E9 - your brand color)
- Logo should be centered with padding

Example structure:
```
512x512px canvas
├─ Background: #0EA5E9 (full)
└─ Logo: Centered, max 410x410px (80% safe zone)
```

## Testing Your PWA
After adding icons, test your PWA:
1. Visit: https://live-signal29.vercel.app
2. Open Chrome DevTools > Application > Manifest
3. Check all icons load correctly
4. Test "Add to Home Screen" on mobile

## Build APK from PWA
Use these tools to convert PWA to APK:
1. **PWABuilder** (Recommended): https://www.pwabuilder.com/
   - Upload your URL: https://live-signal29.vercel.app
   - Download Android APK
   
2. **Bubblewrap CLI**:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest https://live-signal29.vercel.app/manifest.json
   bubblewrap build
   ```

3. **Android Studio TWA** (Trusted Web Activity)

## Current Status
✅ manifest.json - Created
✅ service-worker.js - Created  
✅ SW registration - Added to index.html
❌ Icon files - Need to be created (see options above)

Once you create the 4 icon files, your PWA will be ready for APK conversion!
