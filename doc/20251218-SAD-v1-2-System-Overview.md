# SAD Section 2: System Overview (High-Level Design)

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## 2.1 Conceptual Diagram (The "Hybrid" Container Model)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Device (Android)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Capacitor Native Container (WebView)          │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │     Next.js App (Static Export)                  │  │ │
│  │  │                                                   │  │ │
│  │  │  ┌─────────────────┐    ┌───────────────────┐   │  │ │
│  │  │  │  UI Components  │    │  SQLite Context   │   │  │ │
│  │  │  │  (React/Konsta) │◄───┤  (Platform Detect)│   │  │ │
│  │  │  └─────────────────┘    └───────┬───────────┘   │  │ │
│  │  │                                  │               │  │ │
│  │  │  ┌─────────────────┐    ┌───────▼───────────┐   │  │ │
│  │  │  │  Review Widget  │    │  Data Access Layer│   │  │ │
│  │  │  │  (ChangeSet UI) │◄───┤  (Repository)     │   │  │ │
│  │  │  └─────────────────┘    └───────┬───────────┘   │  │ │
│  │  │                                  │               │  │ │
│  │  │  ┌─────────────────┐            │               │  │ │
│  │  │  │  AI Agent       │            │               │  │ │
│  │  │  │  (Vercel AI SDK)├────────────┘               │  │ │
│  │  │  └────────┬────────┘                            │  │ │
│  │  └───────────┼─────────────────────────────────────┘  │ │
│  │              │                                         │ │
│  └──────────────┼─────────────────────────────────────────┘ │
│                 │              ▲                            │
│                 │              │                            │
│     ┌───────────▼──────────┐  │                            │
│     │  Capacitor SQLite    │  │                            │
│     │  Plugin (Native)     │  │                            │
│     └───────────┬──────────┘  │                            │
│                 │              │                            │
│     ┌───────────▼──────────────┴────────┐                  │
│     │  SQLite Database File              │                 │
│     │  (Android Private Storage)         │                 │
│     │  /data/data/com.ourpot.app/        │                 │
│     └────────────────────────────────────┘                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

        Network (User-Initiated Only)
                    │
        ┌───────────▼──────────┐
        │  OpenAI API          │
        │  (AI Inference Only) │
        └──────────────────────┘
```

### Key Architectural Layers

**Layer 1: Native Container (Capacitor)**
- WebView wrapper providing native platform APIs
- Bridge between web code and native SQLite plugin
- Manages app lifecycle, permissions, and native features

**Layer 2: Web Application (Next.js Static Export)**
- Runs inside WebView as static HTML/CSS/JS
- No server-side rendering or API routes
- All business logic executes client-side

**Layer 3: Data Persistence (SQLite)**
- Native SQLite via `@capacitor-community/sqlite` plugin on Android
- WASM SQLite via `jeep-sqlite` in browser (dev environment only)
- Platform detection determines which implementation to use

**Layer 4: External Services (AI Only)**
- OpenAI API for AI agent inference
- User-initiated network requests only
- No financial data transmitted (prompts only)

---

## 2.2 Technology Stack Selection & Justification

**Note:** For detailed rationale, see [TDD-2: Hybrid Architecture](./20251218-TDD-2-Hybrid%20Mobile%20Architecture.md).

### Core Stack

| Technology | Version | Role | Selection Rationale |
|------------|---------|------|---------------------|
| **Next.js** | 15+ (App Router) | Frontend framework | Industry standard, static export support, optimal DX |
| **React** | 19+ | UI library | Component model, ecosystem, Next.js requirement |
| **Capacitor** | 8.x | Native bridge | Web-to-native wrapper, SQLite plugin ecosystem |
| **SQLite** | (via plugin) | Database | ACID guarantees, finance-grade durability, no eviction |
| **Vercel AI SDK** | Latest | AI integration | Streaming, structured output, OpenAI compatibility |
| **Tailwind CSS** | 4.x | Styling | Utility-first, rapid prototyping, mobile-first |

### Key Plugins

| Plugin | Purpose | Why Required |
|--------|---------|--------------|
| `@capacitor-community/sqlite` | Native SQLite access | Finance-grade persistence on Android |
| `jeep-sqlite` | WASM SQLite fallback | Browser development workflow (npm run dev) |
| `sql.js` | WASM dependency | Required by jeep-sqlite |

### UI Components (Future)

| Library | Status | Purpose |
|---------|--------|---------|
| **Konsta UI** | Planned (Phase 3) | Native-feeling iOS/Material components |

### Alternative Approaches Rejected

**Why not IndexedDB-only PWA?**
- Fails durability constraint (C3): subject to OS eviction
- See [TDD-1: PWA Strategy](./20251217-TDD-1-PWA%20strategy.md) for full analysis

**Why not Ionic?**
- Capacitor provides the same native bridge without Ionic's UI framework lock-in
- Tailwind + Konsta UI offers more flexibility

**Why not React Native?**
- Requires learning platform-specific components
- Web-first development workflow not possible
- Team has stronger Next.js/React expertise

---

## 2.3 The Environment Boundary (Web Dev vs. Native Capacitor Shell)

### Two Runtime Environments

The application runs in **two distinct environments** with different persistence backends:

```
┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT (Web)                          │
│                                                              │
│   Browser (Chrome/Firefox)                                  │
│   ├── Next.js Dev Server (npm run dev)                      │
│   ├── Hot Module Replacement (HMR)                          │
│   ├── jeep-sqlite (WASM)                                    │
│   └── IndexedDB (WASM persistence layer)                    │
│                                                              │
│   Purpose: Rapid UI iteration, component development        │
│   Durability: NOT guaranteed (browser storage)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION (Native)                         │
│                                                              │
│   Android Device                                            │
│   ├── Capacitor Native Container                            │
│   ├── Next.js Static Export (bundled assets)                │
│   ├── @capacitor-community/sqlite                           │
│   └── Native SQLite (.db file in private storage)           │
│                                                              │
│   Purpose: End-user deployment, finance-grade durability    │
│   Durability: GUARANTEED (native file system)               │
└─────────────────────────────────────────────────────────────┘
```

### Platform Detection Strategy

**Runtime Detection:**
```typescript
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform();
// Returns: 'web' | 'ios' | 'android'

if (platform === 'web') {
  // Initialize jeep-sqlite (WASM)
} else {
  // Initialize native SQLite plugin
}
```

**Build-Time Configuration:**
```typescript
// next.config.ts
const config = {
  output: 'export',  // Static export for Capacitor
  distDir: 'out',    // Build output directory
};
```

### Development Workflow

**Web-First Development:**
1. Run `npm run dev` in browser (localhost:3000)
2. Use jeep-sqlite WASM for database operations
3. HMR for rapid UI iteration
4. Chrome DevTools for debugging

**Native Testing:**
1. Run `npm run build` to generate static export
2. Run `npx cap sync` to copy assets to Android project
3. Deploy to device via Android Studio (USB debugging)
4. Use native SQLite inspector for database verification

### Key Differences Between Environments

| Aspect | Web (Dev) | Native (Production) |
|--------|-----------|---------------------|
| **Database** | jeep-sqlite (WASM) | @capacitor-community/sqlite |
| **Persistence** | IndexedDB | Native file system |
| **Durability** | Best-effort | Guaranteed |
| **HMR** | Yes | No (requires rebuild) |
| **Debugging** | Chrome DevTools | Android Logcat + Remote Debug |
| **Network** | CORS applies | No CORS restrictions |
| **File Access** | Browser sandboxed | Native file system API |

### Environment-Specific Code Handling

**Conditional Imports:**
```typescript
// SQLiteContext.tsx
if (platform === 'web') {
  await import('jeep-sqlite');  // Load WASM only in browser
}
```

**Feature Flags:**
- Service Worker: Disabled in Capacitor (per TDD-1 D5)
- Image Optimization: Client-side only (no `next/image` server optimization)
- API Routes: Not supported (static export only)

### Build Pipeline

```bash
# Development (web environment)
npm run dev              # Next.js dev server (localhost:3000)

# Production (native environment)
npm run build            # Static export → out/ directory
npx cap sync             # Copy out/ → android/app/src/main/assets/public/
npx cap open android     # Open Android Studio for deployment
```

**Build Output:**
- `out/` directory contains all static assets (HTML, CSS, JS, images)
- Capacitor copies `out/` to Android project's `assets/public/` folder
- WebView loads `index.html` from bundled assets (no network request)
