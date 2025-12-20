# SAD Section 1: Introduction & Architectural Goals

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## 1.1 Purpose & Scope (v1 Local-Only)

**Note:** For product vision, user journey, and "Propose & Approve" workflow details, see **Product Vision (20251218-Product-Vision.md)**. This section focuses on architectural scope only.

### v1 Architectural Scope

**What v1 delivers:**
- Single-device Android application (native Capacitor build)
- On-device persistence using SQLite (no cloud storage)
- AI changeset proposals (OpenAI via Vercel AI SDK)
- Review-and-approve workflow with persistent rejected changesets

**What v1 explicitly excludes:**
- Multi-user/multi-device features (see Backlog docs)
- Cloud sync or automatic backup
- iOS native build (Android-first, iOS via CI/CD if needed)

---

## 1.2 Architectural Constraints (Mobile-First, Offline, No Cloud)

### C1: Local-First Data Sovereignty

**Constraint:** All financial data MUST remain on-device. No cloud storage or multi-device sync.

**Rationale:**
- User privacy and data ownership
- Simplifies v1 (no backend, no auth, no sync conflicts)
- Enables true offline operation

**Impact:** All business logic runs client-side; manual export only.

### C2: Mobile-First, Android Primary

**Constraint:** Target mobile devices first, Android as v1 platform.

**Rationale:**
- Primary use case is mobile expense tracking
- Avoids iOS PWA storage eviction issues (see TDD-1)
- No macOS requirement for development

**Impact:** Touch-first UI design; optional web build for development only.

### C3: Finance-Grade Durability

**Constraint:** Data MUST NOT be subject to OS-level eviction until user uninstalls.

**Rationale:**
- Finance data requires stronger guarantees than browser storage
- User trust depends on "never lose my data" promise

**Impact:** Native SQLite storage (Android private directory) required; IndexedDB insufficient.

### C4: Offline-First (except AI)

**Constraint:** App MUST function offline except when user invokes AI agent.

**Rationale:**
- Reduces attack surface (no user auth, no data breach)
- Simplifies compliance (no GDPR concerns for stored data)

**Impact:** Next.js static export; AI calls are only network requests.

---

## 1.3 Key Quality Attributes (Durability, Privacy, Responsiveness)

### QA1: Durability (CRITICAL)

**Definition:** All financial data survives app restart, device reboot, and low storage conditions.

**Success Criteria:**
- 100% transaction/changeset retention across restarts
- Database integrity across schema migrations
- Manual backup/export available (CSV minimum)

**Verification:**
- Automated: insert → restart → verify data present
- Stress test: low storage conditions, verify no eviction

### QA2: Privacy (HIGH)

**Definition:** Financial data never transmitted to third parties (except user prompts to OpenAI).

**Success Criteria:**
- Zero telemetry of financial data
- No transaction data sent to OpenAI (only prompts)
- Manual export unencrypted (user owns plaintext)

**Verification:**
- Network traffic audit
- Code review: no analytics SDK with PII

### QA3: Responsiveness (MEDIUM)

**Definition:** Native app feel with <100ms UI interactions.

**Success Criteria:**
- Transaction list renders <500ms for 1000 transactions
- Changeset approval feedback <100ms
- AI response within 2-5 seconds (network-dependent)

**Verification:**
- Performance profiling with synthetic datasets (1K, 5K, 10K transactions)
- User testing for "feels native" feedback
