# SAD Section 8: Packaging & Distribution

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## 8.1 Capacitor Configuration

### Core Configuration File

**capacitor.config.ts:**

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ourpot.app',
  appName: 'OurPot',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: false,
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

### Configuration Breakdown

**appId:** `com.ourpot.app`
- Unique Android package identifier
- Cannot be changed after Play Store submission
- Reverse domain notation convention

**appName:** `OurPot`
- Display name on device home screen
- Can be localized in future

**webDir:** `out`
- Points to Next.js static export output
- Capacitor copies this to native assets

**server.androidScheme:** `https`
- Uses HTTPS scheme for loading web assets
- Required for modern web APIs
- Better security than `http://localhost`

**server.cleartext:** `false`
- Disables cleartext HTTP traffic
- Security best practice

---

### SQLite Plugin Configuration

**CapacitorSQLite settings:**

```typescript
CapacitorSQLite: {
  androidIsEncryption: false,    // No database encryption in v1
  androidBiometric: {
    biometricAuth: false,        // No biometric auth in v1
  },
}
```

**Rationale:**
- v1: Unencrypted database (relies on OS device security)
- v2 (future): Enable encryption with SQLCipher
- v2 (future): Biometric authentication for app unlock

---

### Android-Specific Configuration

**AndroidManifest.xml modifications:**

**Permissions:**
```xml
<!-- Required for SQLite file system access -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                 android:maxSdkVersion="32" />
```

**Application settings:**
```xml
<application
  android:name=".MainActivity"
  android:allowBackup="true"
  android:icon="@mipmap/ic_launcher"
  android:label="@string/app_name"
  android:theme="@style/AppTheme"
  android:usesCleartextTraffic="false">

  <activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">
    <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
  </activity>
</application>
```

**Key settings:**
- `allowBackup="true"` - Allows Android backup service (database included)
- `usesCleartextTraffic="false"` - Security hardening
- `launchMode="singleTask"` - Single instance of app

---

### Database Storage Location

**Android native SQLite:**
```
/data/data/com.ourpot.app/databases/
  └── ourpot.db
```

**Characteristics:**
- Private app directory (other apps cannot access)
- Survives app updates
- Deleted only on app uninstall
- Included in Android backup (if enabled by user)

---

### Capacitor Plugins Used

**v1 Plugins:**

1. **@capacitor-community/sqlite**
   - Purpose: Native SQLite access
   - Platform: Android, iOS
   - Version: Latest stable

2. **@capacitor/core**
   - Purpose: Capacitor runtime, platform detection
   - Required for all Capacitor apps

**Future Plugins (v2):**
- `@capacitor/filesystem` - Export database file
- `@capacitor/share` - Share APK, backup files
- `@capacitor/splash-screen` - Custom splash screen

---

## 8.2 Asset Management

**Status:** ⏸️ **PENDING** - To be documented in future revision

**Topics to cover:**
- App icons (mipmap densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Splash screen configuration
- WASM file bundling (jeep-sqlite for web fallback)
- Static assets (images, fonts) optimization
- Asset generation tools (capacitor-assets)

---

## 8.3 Security & Permissions

**Status:** ⏸️ **PENDING** - To be documented in future revision

**Topics to cover:**
- Android permissions required (storage, network)
- Runtime permission handling
- Security best practices (HTTPS, no cleartext traffic)
- Content Security Policy (CSP) for WebView
- Certificate pinning (future consideration)
- ProGuard/R8 obfuscation rules

---

## Packaging Summary

**v1 Packaging Approach:**

1. **Simple configuration:** Minimal Capacitor config, no custom plugins
2. **No encryption:** Database unencrypted (v1), relies on OS security
3. **Direct APK distribution:** No Play Store submission in v1
4. **Private storage:** Database in app-private directory (secure by default)
5. **Manual updates:** Users download new APK to update (no auto-update)

**Trade-offs Accepted:**

- **No Play Store:** Simpler distribution but less discoverability
- **No encryption:** Acceptable for single-user v1, add in v2
- **Manual updates:** Users must check for new versions manually
- **Basic permissions:** Only file system access, no camera/contacts/location

**Benefits:**

- ✅ **Fast iteration:** No Play Store review process
- ✅ **No sign-up barrier:** Direct APK download
- ✅ **Smaller scope:** Focus on core functionality first
- ✅ **User control:** Users own APK file, can archive versions

---

**End of Section 8**
