# SAD Section 7: Development & Build Workflow

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## 7.1 Web-First Development Strategy

### Philosophy: Develop in Browser, Deploy to Native

**Approach:** Build and test in web browser first, only test native features when needed.

**Rationale:**
- **Fast iteration:** Hot Module Replacement (HMR) in browser
- **Better DevTools:** Chrome DevTools for debugging
- **No rebuild delays:** Instant refresh on code changes
- **Lower friction:** No USB cable, no Android Studio wait times

### Two Development Environments

**Environment 1: Web Browser (Primary)**
```bash
npm run dev
# → Next.js dev server on localhost:3000
# → Uses jeep-sqlite (WASM) for database
# → IndexedDB for persistence (best-effort)
# → Full React DevTools, Network tab, etc.
```

**Purpose:** UI development, feature iteration, AI agent testing

**Limitations:**
- IndexedDB not durable (can be evicted)
- No native Capacitor plugins
- CORS restrictions apply

---

**Environment 2: Native Device (Secondary)**
```bash
npm run build
npx cap sync
npx cap open android
# → Build in Android Studio
# → Deploy to device via USB
```

**Purpose:** Test native SQLite, Capacitor plugins, final validation

**When to use:**
- Verify database durability
- Test native file system access
- Final build verification before release
- Performance profiling on actual device

---

### Platform Detection in Code

**Runtime check:**
```typescript
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

if (platform === 'web') {
  // Initialize jeep-sqlite (WASM)
  await initializeWASMSQLite();
} else {
  // Initialize native SQLite plugin
  await initializeNativeSQLite();
}
```

**SQLiteContext handles this automatically** - see Section 3.2 for initialization pattern.

---

## 7.2 Build Pipeline

### Build Process Overview

```
┌──────────────────┐
│  Source Code     │
│  (TypeScript)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  npm run build   │
│  (Next.js)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Static Export   │
│  out/ directory  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  npx cap sync    │
│  (Capacitor)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  android/app/    │
│  src/main/       │
│  assets/public/  │
└──────────────────┘
```

### Step-by-Step Build

**Step 1: Next.js Static Export**
```bash
npm run build
```

**What happens:**
- TypeScript compilation
- React component bundling
- Tailwind CSS processing
- Code minification
- Output to `out/` directory

**Output structure:**
```
out/
├── index.html
├── _next/
│   ├── static/
│   │   ├── chunks/  (JavaScript bundles)
│   │   └── css/     (Compiled Tailwind)
│   └── ...
└── icons/
```

---

**Step 2: Capacitor Sync**
```bash
npx cap sync
```

**What happens:**
- Copies `out/` → `android/app/src/main/assets/public/`
- Updates Capacitor plugin references
- Syncs `capacitor.config.ts` changes
- Updates native project configuration

**Result:** Android project ready to build in Android Studio

---

**Step 3: Native Build (Android Studio)**
```bash
npx cap open android
```

**What happens:**
- Opens Android Studio with project
- Gradle builds native APK
- Includes bundled web assets
- Signs APK (debug or release)

**Output:** `app-debug.apk` or `app-release.apk`

---

### Build Configuration

**next.config.ts:**
```typescript
const nextConfig = {
  output: 'export',           // Static export mode
  distDir: 'out',             // Output directory
  trailingSlash: true,        // Required for Capacitor
  images: {
    unoptimized: true,        // No server-side image optimization
  },
};

export default nextConfig;
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.ourpot.app',
  appName: 'OurPot',
  webDir: 'out',              // Points to Next.js output
  server: {
    androidScheme: 'https',   // Use HTTPS scheme for web assets
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
      },
    },
  },
};

export default config;
```

---

### Build Scripts (package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "cap:sync": "cap sync",
    "cap:android": "cap open android",
    "build:android": "npm run build && npm run cap:sync && npm run cap:android"
  }
}
```

**Usage:**
- `npm run dev` - Development server
- `npm run build` - Next.js build
- `npm run build:android` - Full Android build pipeline

---

## 7.3 Android Deployment

### Development Build (USB Debugging)

**Prerequisites:**
- Android device with USB debugging enabled
- USB cable
- Android Studio installed

**Steps:**

1. **Enable Developer Mode on Android device:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device via USB:**
   ```bash
   adb devices
   # Should show your device
   ```

3. **Build and deploy:**
   ```bash
   npm run build:android
   # Opens Android Studio
   # Click "Run" (green play button)
   # Select connected device
   ```

4. **App installs automatically on device**

---

### APK Distribution (Non-Play Store)

**For v1:** APK shared directly (no Google Play Store submission).

**Build Release APK:**

1. **Generate signing key** (one-time):
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -alias ourpot-release -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing in Android Studio:**
   - Build → Generate Signed Bundle/APK
   - Select APK
   - Provide keystore path and credentials
   - Build release APK

3. **Output:** `app-release.apk` (~5-10 MB)

**Distribution:**
- Share via direct download link (GitHub Releases, Dropbox, etc.)
- Users install APK manually (requires "Install from Unknown Sources")
- No automatic updates (v1)

---

### Build Variants

**Debug Build:**
- Faster build time
- Includes debug symbols
- Larger APK size (~10 MB)
- For development/testing only

**Release Build:**
- Optimized and minified
- ProGuard enabled (code obfuscation)
- Smaller APK size (~5 MB)
- For distribution

---

## 7.4 iOS Deployment Strategy

**Status:** ⏸️ **PENDING** - Deferred to future version

**Rationale:**
- v1 focuses on Android (no macOS requirement for development)
- iOS build requires macOS + Xcode
- iOS PWA has storage eviction issues (see TDD-1)
- Native iOS build via Capacitor is feasible but not prioritized

**Future Implementation Path:**
- Use GitHub Actions with macOS runner
- Xcode Cloud for CI/CD
- TestFlight for beta distribution
- App Store submission (requires Apple Developer account)

---

## Development Workflow Summary

**Daily Development Loop:**

```
1. npm run dev
   ↓
2. Code changes (TypeScript, React)
   ↓
3. Hot reload in browser (instant)
   ↓
4. Test in Chrome DevTools
   ↓
5. Repeat steps 2-4 (fast iteration)
   ↓
6. Periodically: Build → Deploy to Android device
   ↓
7. Verify native SQLite, file system, performance
```

**Key Principles:**

1. **Develop in browser first** - 95% of time
2. **Test native occasionally** - Verify durability, performance
3. **Build pipeline is simple** - Three commands (build, sync, open)
4. **No server required** - Everything client-side
5. **Debug APK for testing** - Release APK for distribution

---

**End of Section 7**
