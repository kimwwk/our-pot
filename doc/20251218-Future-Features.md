# Future Features & Deferred Enhancements

**Status:** Out of scope for v1
**Purpose:** Track features intentionally deferred to v2 or beyond

This document maintains a list of features and enhancements that are explicitly out of scope for v1. These items represent future product evolution and are documented here to:
- Keep v1 scope focused and achievable
- Track future product direction
- Prevent scope creep during v1 implementation

---

## Scoring Conventions

- **Priority**: P2 (could have in v2), P3 (nice to have later), P4 (maybe someday)
- **Impact/Value**: 1–5 (5 = highest user/business value)
- **Effort/Size**: story points (1, 2, 3, 5, 8, 13)
- **Score**: `Impact ÷ Effort` (value/effort ratio for prioritization)

---

## Deferred Features

### FF-001
- **ID**: FF-001
- **Title**: Persistent storage request for web/PWA distribution
- **Description / Problem statement**: When/if web/PWA distribution is added, request persistent storage (`navigator.storage.persist()`) to reduce risk of browser eviction, and surface a lightweight "storage status" indicator for users/debugging. Not applicable to native Android build which uses native file system.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 3
- **Score**: 1.33

---

### FF-002
- **ID**: FF-002
- **Title**: Edit AI suggestions before approval (inline edits)
- **Description / Problem statement**: Allow user to modify proposed transaction fields (amount/date/category/note) inside the review widget prior to approval, so AI output becomes a draft not a final write. v1 supports iterative rejection/refinement via conversation, but not in-place edits.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 8
- **Score**: 0.63

---

### FF-003
- **ID**: FF-003
- **Title**: ChangeSet conflict detection on apply
- **Description / Problem statement**: When underlying entities change after proposal (e.g., user manually edits transaction while reviewing AI changeset), applying the ChangeSet can produce wrong results or partial intent. Add precondition checks (optimistic locking) and block apply with clear reasons. No auto-rebase in early versions.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 5
- **Score**: 1.00

---

### FF-004
- **ID**: FF-004
- **Title**: AI rationale + "what data was used" audit fields
- **Description / Problem statement**: Store a short rationale + extracted facts/context window metadata for each ChangeSet so users can trust AI decisions and developers can debug model mistakes. v1 includes basic audit trail (toolCallId, source) but not detailed reasoning.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 3
- **Score**: 1.33

---

### FF-005
- **ID**: FF-005
- **Title**: Undo foundation: lightweight revision/event log
- **Description / Problem statement**: Add minimal event log (or revision snapshots per changeset apply) to enable undo functionality later. Even if undo UI is deferred, the data structure should exist. v1 has soft deletes but no full revision history.
- **Type**: Tech Debt
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 8
- **Score**: 0.50

---

### FF-006
- **ID**: FF-006
- **Title**: Import/restore from backup
- **Description / Problem statement**: Allow importing exported CSV or SQLite .db file to restore data on same/new device. Define merge/overwrite behavior (likely "replace" in early versions). v1 includes export but not import functionality.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-007
- **ID**: FF-007
- **Title**: Analytics integration (Google Analytics or alternative)
- **Description / Problem statement**: Add product analytics to track activation, retention, and feature usage. Define event taxonomy and privacy boundaries (ensure no sensitive expense content captured). Deferred to focus on core functionality first.
- **Type**: Research
- **Priority**: P3
- **Impact / Value**: 3
- **Effort / Size**: 5
- **Score**: 0.60

---

### FF-008
- **ID**: FF-008
- **Title**: Transfers + category semantics
- **Description / Problem statement**: Define transaction types beyond EXPENSE/DEPOSIT (add TRANSFER for moving money between accounts or to/from kitty). Define category constraints and reporting behavior so "kitty" money flows are properly tracked and don't break analytics. v1 uses simple EXPENSE/DEPOSIT only.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-009
- **ID**: FF-009
- **Title**: App lock / local encryption-at-rest
- **Description / Problem statement**: Add optional PIN/biometric lock and/or encryption for local storage (SQLCipher). Explicitly deferred as very low priority - relies on device-level security in v1.
- **Type**: Research
- **Priority**: P4
- **Impact / Value**: 2
- **Effort / Size**: 13
- **Score**: 0.15

---

### FF-010
- **ID**: FF-010
- **Title**: Future multi-user/sharing readiness fields (placeholders only)
- **Description / Problem statement**: Add nullable fields like `createdByUserId?`, `householdId?`, and `deviceId?` to ease later transition to accounts/groups, without implementing sharing now. Requires schema migration planning.
- **Type**: Tech Debt
- **Priority**: P2
- **Impact / Value**: 3
- **Effort / Size**: 3
- **Score**: 1.00

---

### FF-011
- **ID**: FF-011
- **Title**: Evaluate Konsta UI for native-feeling components
- **Description / Problem statement**: Research and test Konsta UI for iOS/Material Design components (pull-to-refresh, modals, native gestures). Optional UX polish planned for Phase 3 but should be evaluated early for architectural fit. v1 uses shadcn/ui + Tailwind.
- **Type**: Research
- **Priority**: P3
- **Impact / Value**: 3
- **Effort / Size**: 3
- **Score**: 1.00

---

### FF-012
- **ID**: FF-012
- **Title**: PWA/Serwist integration (deferred, web-only)
- **Description / Problem statement**: If/when web/PWA distribution is added, integrate Serwist service worker with gated registration (disabled in Capacitor). Per TDD-1, explicitly deferred for v1 Android-first approach. Native build doesn't need service workers.
- **Type**: Feature
- **Priority**: P4
- **Impact / Value**: 2
- **Effort / Size**: 5
- **Score**: 0.40

---

## Explicitly Out of Scope (v2 or Beyond)

The following major features are explicitly deferred to v2 or later versions:

- **Multi-user accounts and household sharing** - v1 is single-device, single-user only
- **Cloud sync or multi-device reconciliation** - v1 is local-first with no cloud backend
- **Automatic scheduled backups** - v1 has manual export only
- **Database encryption at rest** - v1 relies on device-level security (SQLCipher integration deferred)
- **iOS platform build** - v1 is Android-first; iOS build via CI/CD when needed
- **PWA as primary distribution** - PWA is secondary/experimental in v1 (native Android is primary)
- **Offline AI** - All AI inference requires network connection to OpenAI API

---

## Related Documents

- **[V1 Features](./20251219-Feature-v1.md)** - Active v1 implementation scope
- **[Software Architecture Document](./20251218-SAD-v1-0-Table%20of%20content.md)** - Architectural decisions and patterns
- **[Product Vision](./20251218-Product-Vision.md)** - Long-term product strategy
