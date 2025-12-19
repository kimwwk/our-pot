# Technical Design Document: Local-First Hybrid Mobile Architecture

**Project Scope:** Cross-platform Mobile Application (iOS/Android/PWA)

**Primary Framework:** Next.js 15 + Capacitor

**Storage Strategy:** Native SQLite with WebAssembly Fallback

---

## 1. Executive Summary

The objective is to build a mobile-first product that offers a seamless transition between a Progressive Web App (PWA) and a native mobile application. The core requirement is **permanent data persistence**: data must never be subject to OS-level "storage eviction" (common in browsers) unless the user manually uninstalls the application.

### Key Factors for Success

To ensure high-quality delivery, this design addresses:

* **Data Integrity:** Moving beyond "best-effort" browser storage (IndexedDB) to "guaranteed" native storage (SQLite).
* **Developer Velocity:** Enabling a browser-based development workflow (`npm run dev`) that mirrors native behavior.
* **Environment Constraints:** Providing a path for iOS deployment without 100% reliance on a local macOS environment.
* **Next.js Optimization:** Configuring Next.js for "Static Site Generation" (SSG) to comply with native mobile WebView requirements.

---

## 2. Technical Stack

| Layer | Technology | Reason |
| --- | --- | --- |
| **Frontend Framework** | **Next.js 15 (App Router)** | Industry-standard React framework for performance and scalability. |
| **Native Bridge** | **Capacitor** | Wraps web code into native iOS/Android binaries while allowing access to native APIs. |
| **Primary Database** | **SQLite** | A robust, ACID-compliant relational database engine. |
| **Storage Plugin** | **@capacitor-community/sqlite** | Provides native SQLite access on mobile and WASM-based SQLite on Web. |
| **UI Components** | **Konsta UI / Tailwind CSS** | Provides native-feeling (iOS/Material Design) components using Tailwind. |

---

## 3. System Architecture

The application follows a **Hybrid-Native Architecture**. The UI is built using React components, but the data layer sits behind an abstraction that detects the platform.

### 3.1. Data Persistence Strategy

Unlike a standard PWA where the OS can delete data if the phone runs low on space, this architecture uses the native file system via Capacitor.

* **Mobile (iOS/Android):** Data is stored in the application's private document directory in a `.sqlite` file.
* **Web (npm run dev / PWA):** The app uses `jeep-sqlite` to run SQLite in the browser via WebAssembly (WASM), persisting data to IndexedDB.

### 3.2. Static Export Configuration

Capacitor cannot run a Node.js server. Therefore, Next.js must be configured for **Static Export**.

* **Constraint:** Features like `next/image` (server-side optimization) and Server Actions are replaced by client-side equivalents.
* **Config:** `output: 'export'` must be set in `next.config.ts`.

---

## 4. Development & Build Workflow

The design enables development without constant use of mobile emulators or a Mac.

### 4.1. The "Web-First" Workflow

1. **Iterative Dev:** Developers run `npm run dev` in Chrome.
2. **SQLite Simulation:** The `jeep-sqlite` library mocks the native database, allowing SQL queries to work in the browser console.
3. **HMR:** Hot Module Replacement remains functional for rapid UI styling.

### 4.2. Native Deployment

* **Android:** Build the web project (`npm run build`), sync to Capacitor (`npx cap sync`), and deploy to a physical device via USB through Android Studio.
* **iOS (No-Mac Strategy):** Use **Cloud CI/CD (GitHub Actions)** to compile the native Xcode project into an `.ipa` file for distribution via Apple TestFlight.

---

## 5. Implementation Roadmap

### Phase 1: Core Integration

* Initialize Next.js 15 with App Router.
* Configure `next.config.ts` for static export.
* Install `@capacitor/core` and initialize the native platforms.

### Phase 2: The Data Layer

* Implement a **Context Provider** in React to initialize the SQLite connection.
* Include a platform check to mount `jeep-sqlite` only when `platform === 'web'`.
* Define database schemas and migrations.

### Phase 3: Mobile UX

* Implement `Konsta UI` for platform-specific interactions (e.g., Pull-to-refresh, native-style modals).
* Test offline capabilities by verifying data persistence with SQLite in "Airplane Mode".

---

## 6. Evidence & Validation

* **Storage Persistence:** Capacitor Native SQLite is stored in the `Library/Application Support` (iOS) and `databases/` (Android) folders, which are excluded from OS auto-cleanup policies.
* **Performance:** SQLite provides significantly faster complex query performance than IndexedDB for large datasets.
* **Compatibility:** This stack follows the **"Capacitor-First"** recommendation for developers who wish to avoid writing Swift or Java code.
