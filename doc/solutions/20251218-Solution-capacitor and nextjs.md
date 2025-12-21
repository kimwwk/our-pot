# Capacitor + Next.js Integration Fix

## Problem
```
npx cap sync
[error] The web assets directory (./public) must contain an index.html file.
```

## Root Cause
- Capacitor expects built web assets with `index.html` in the configured `webDir`
- Next.js `public/` folder only contains static assets (SVGs, images)
- Next.js requires configuration for static HTML export

## Solution

### 1. Configure Next.js for Static Export
**File:** `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

### 2. Update Capacitor Configuration
**File:** `capacitor.config.ts`

Change `webDir` from `'public'` to `'out'`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.ourpot.app',
  appName: 'our-pot',
  webDir: 'out', // Next.js static export output directory
  // ... rest of config
};
```

### 3. Build and Sync Workflow
```bash
npm run build   # Creates static export in 'out/' directory
npx cap sync    # Syncs web assets to native platforms
```

## Result
- Next.js builds static HTML to `out/` directory
- Capacitor finds `index.html` in `out/` directory
- `npx cap sync` succeeds
