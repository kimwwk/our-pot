# Technical Decision Document (TDD): Local-First Persistence, Packaging, and PWA Strategy (v1)

## Status
Proposed (ready for acceptance)

## Decision summary
1. **v1 will target Android first** and prioritize strong local durability.
2. **Primary v1 distribution will be a Capacitor-wrapped app** using a durable local database (SQLite).
3. **A web/PWA distribution may exist in parallel**, but will be treated as secondary and may have reduced durability guarantees unless it also has robust backup.
4. **Manual backup/export is in scope** (v1 minimal): CSV export for transactions plus a path to full-fidelity backup (preferably encrypted) as soon as feasible.
5. **Service Worker (`@serwist/next`) will be enabled for web/PWA**, and **disabled or tightly constrained inside the Capacitor build** to avoid stale-cache/update issues.

---

## Goals (v1)
- Strong on-device data durability appropriate for a finance app.
- Local-first workflow with persisted AI ChangeSets (including rejected ones).
- Avoid architectural rework when later adding optional remote accounts/sync.

## Non-goals (v1)
- Cloud sync, user accounts, multi-device reconciliation.
- Automatic/scheduled backup.
- Full offline guarantees for browser-only PWA on all platforms.

---

## Key decisions

### D1: Local persistence technology
**Decision:** Use **SQLite** for local persistence in the native (Capacitor) build.

**Rationale:**
- IndexedDB in browser PWAs can be evicted (platform-dependent) and offers weaker durability guarantees; unacceptable risk profile for finance data.
- SQLite is mature, transactional, and predictable for durable storage.

**Implementation notes:**
- Use a Capacitor SQLite plugin (selection TBD) and implement a repository/data-access layer around it.
- Schema must include:
  - `transactions`, `categories`
  - `changesets` (persist proposals, including rejected)
  - optional: `operations/events` (see D3)

**Consequences:**
- Adds native build complexity (Android build toolchain, releases).
- Stronger data durability and clearer upgrade/migration path.

---

### D2: Distribution strategy (“why not both?”)
**Decision:** Support **Capacitor-wrapped Android app** as the primary v1 distribution; optionally also ship a **web/PWA build** from the same codebase.

**Rationale:**
- Android-first reduces iOS PWA eviction concerns, but finance-grade durability still favors SQLite in a native container.
- “Both” is possible, but durability and update behavior must be explicitly managed per channel.

**Consequences:**
- Requires environment-aware behavior (native vs web).
- QA matrix increases (at minimum: Android native WebView + Chrome web/PWA).

---

### D3: Data model strategy to avoid future rework (remote sync later)
**Decision:** Design the domain and persistence around **stable IDs** and an **operation-based or changeset-based write model**, even in local-only v1.

**Rationale:**
- AI proposals are naturally expressed as sets of operations (create/update/delete).
- Future remote sync is easier if you can replicate operations rather than diff mutable state.
- Preserves auditability and supports “rejected changesets remain available” without hacks.

**Minimum v1 requirements:**
- Stable identifiers: UUID/ULID for transactions/categories/changesets.
- Changesets are first-class records:
  - `status`: `proposed | approved | rejected | edited`
  - payload: list of proposed operations with metadata
- Soft-delete fields (recommended): `deletedAt` for future conflict handling.

**Consequences:**
- Slightly more up-front modeling work.
- Substantially reduces risk of a rewrite when adding accounts/sync.

---

### D4: Backup/export approach (manual only in v1)
**Decision:** Provide **manual export**. Start with **CSV export** for transactions; plan for **full-fidelity backup** (preferably encrypted) as a near-term follow-up.

**Rationale:**
- CSV is good for user portability and transparency, but insufficient as a canonical backup (it loses changesets, relationships, metadata).
- Finance-grade expectations strongly favor a restore-capable backup format.

**Consequences:**
- v1 can launch with CSV-only if necessary, but risk remains until full-fidelity backup exists.
- Full-fidelity backup should include transactions, categories, changesets, and app settings.

---

### D5: PWA Service Worker strategy with `@serwist/next` and Capacitor
**Decision:** Use `@serwist/next` for the **web/PWA** build. In the **Capacitor** build, **disable service worker registration or restrict it to minimal caching**.

**Rationale:**
- Service workers can cause stale-bundle/update issues inside a WebView, creating “app stuck on old code” problems.
- Capacitor already provides an app-shell-like environment; SW value is lower in native container.
- Running both layers (Capacitor + SW caching) increases debugging and upgrade complexity.

**Implementation notes:**
- Gate SW registration by runtime environment:
  - If native (Capacitor), do not register SW (default).
  - If web, register SW normally.
- If SW is ever enabled in native:
  - Avoid caching `/api/*` and any dynamic data endpoints.
  - Prefer cache-only for static assets; network-first for navigation.

**Consequences:**
- Two slightly different runtime behaviors; must be documented and tested.
- Reduced risk of update/caching bugs in the native app.

---

## Open technical considerations / follow-ups
1. **Next.js packaging into Capacitor**
   - Decide whether the native app loads:
     - static exported assets bundled into the app, or
     - a hosted URL (less aligned with “local-only”)
   - This influences routing mode, asset paths, and update strategy.

2. **SQLite plugin choice**
   - Evaluate options for:
     - reliability, migrations, performance
     - encryption support (if desired later)
     - TypeScript ergonomics

3. **Migration strategy**
   - Plan DB schema migrations from v1 onward (versioned migrations).

4. **Security posture (v1 minimal)**
   - Whether to add optional app lock (PIN/biometric) later.
   - Whether to encrypt backups at rest and/or database encryption (likely later).

---

## Acceptance criteria (v1 aligned)
- Transactions, categories, and all changesets (including rejected) persist across app restarts.
- Approving a changeset applies exactly those operations; rejecting does not delete it.
- Manual export exists (CSV at minimum).
- Web/PWA can exist, but native build remains the durability baseline.
- Service worker behavior is environment-aware to avoid stale-code issues in the native shell.

---

## Decision log
- Finance-grade durability requirement drove selection of SQLite via Capacitor over IndexedDB-only PWA.
- “Android first” allows faster iteration, but does not remove durability expectations.
- “Why not both?” accepted with explicit separation of concerns: SW for web, minimal/no SW for native.