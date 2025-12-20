# SAD Section 9: Design Decisions for Future Evolution

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## Purpose of This Section

This section documents **v1 design decisions that enable future features** without requiring major refactoring. These are architectural choices made now to avoid technical debt later.

**What this is NOT:**
- Not a roadmap or feature prioritization
- Not implementation plans for v2
- Not commitments to specific timelines

**What this IS:**
- Rationale for current design choices
- Explanation of "over-engineering" that prepares for future
- Guidance for maintaining forward compatibility

---

## 9.1 Why ULIDs (Not Auto-Increment IDs)

### Decision: Use ULIDs for All Primary Keys

**Current v1 Implementation:**
```typescript
// All entities use ULID (Universally Unique Lexicographically Sortable Identifier)
interface Transaction {
  id: string;  // ULID, e.g., "01JBQR7X8..."
  accountId: string;  // ULID
  memberId: string;   // ULID
  categoryId: string; // ULID
  // ...
}
```

**Alternative (NOT used):**
```typescript
// Simple auto-increment (typical for single-device apps)
interface Transaction {
  id: number;  // 1, 2, 3, 4, ...
  // ...
}
```

---

### Why ULIDs?

**Reason 1: Future Multi-Device Sync**

When two devices create records offline, auto-increment IDs will collide:
```
Device A creates transaction id=100
Device B creates transaction id=100  ❌ CONFLICT
```

With ULIDs, no collision:
```
Device A: "01JBQR7X8ABC..."
Device B: "01JBQS2Y9DEF..."  ✅ Globally unique
```

**Reason 2: Sortable by Creation Time**

ULIDs encode timestamp in first 48 bits:
```typescript
const ulid1 = "01JBQR7X8..."; // Created 2025-12-18 10:30:00
const ulid2 = "01JBQS2Y9..."; // Created 2025-12-18 10:35:00

ulid1 < ulid2  // true - chronological order preserved
```

**Benefit:** Can reconstruct event order without separate timestamp field.

**Reason 3: No Central Authority Required**

Auto-increment requires central ID generator (database sequence). ULIDs can be generated client-side:
```typescript
import { ulid } from 'ulid';

const id = ulid();  // No database query needed
```

**Benefit:** Faster writes, works offline, no coordination overhead.

---

### Trade-offs Accepted

**Con 1: Longer IDs**
- ULID: 26 characters (`"01JBQR7X8ABC..."`)
- Auto-increment: 1-10 characters (`"12345"`)
- **Impact:** Slightly larger database size (~20 bytes per row)
- **Acceptable:** Storage is cheap, expected row count < 100K

**Con 2: Non-Human-Readable**
- Users won't see "Transaction #123"
- **Mitigation:** Never expose IDs in UI, show human-readable references instead

**Con 3: Indexing Performance**
- ULIDs are strings, slightly slower to index than integers
- **Acceptable:** Negligible for expected data volume (< 10K transactions)

---

### Migration Path (v1 → v2)

**No migration needed!** ULIDs work in both single-device and multi-device scenarios.

When adding sync in v2:
1. No schema changes required
2. ULIDs already globally unique
3. Just add sync conflict resolution logic (see Section 9.3)

---

## 9.2 Why ChangeSet-Based Writes (Not Direct CRUD)

### Decision: All Mutations Go Through ChangeSet Approval

**Current v1 Pattern:**
```
User Action
  ↓
AI Proposes ChangeSet
  ↓
User Approves
  ↓
Execute Operations
```

**Alternative (NOT used):**
```
User Action
  ↓
Direct Database Write
  (No approval, no changesets)
```

---

### Why ChangeSet Pattern?

**Reason 1: Future Multi-User Collaboration**

When multiple users edit the same data, need atomic batch operations:
```
Alice: "Update rent to £1200, add utilities £50"
Bob:   "Update rent to £1250, delete utilities"

Without changesets: Partial conflicts, inconsistent state
With changesets:    Both proposals shown, user picks one
```

**Reason 2: Operation Replication for Sync**

ChangeSet structure is ready for sync replication:
```typescript
interface ChangeRequest {
  operationType: "create" | "update" | "delete";
  entityType: "transaction" | "category";
  entityId: string;
  currentData: any;    // Before state (for conflict detection)
  proposedData: any;   // After state
  executionOrder: number;  // For deterministic replay
}
```

**Future sync:** Replicate changelists across devices, detect conflicts using `currentData`.

**Reason 3: Audit Trail Built-In**

Every change is logged with metadata:
```typescript
interface ChangeSet {
  id: string;
  source: "ai" | "manual" | "sync";  // Where did change come from?
  proposedAt: Date;
  reviewedAt: Date;
  changeRequests: ChangeRequest[];
}
```

**Benefit:** Complete history of who changed what and when.

---

### Trade-offs Accepted

**Con 1: More Complex Architecture**

Requires:
- Keyed buffer state management
- Review widget UI
- ChangeSet persistence layer
- Execution logic

**Acceptable:** Complexity is localized, pays off for multi-step AI reasoning and future sync.

**Con 2: Extra Database Tables**

Need `changesets` and `change_requests` tables (see Section 3.3).

**Acceptable:** Disk space cheap, audit trail is valuable.

---

### Migration Path (v1 → v2)

**When adding multi-device sync:**

1. **Conflict Detection:**
   ```typescript
   // Compare currentData with actual DB state before applying
   if (currentData !== actualData) {
     // Conflict! Show user both versions
   }
   ```

2. **ChangeSet Replication:**
   ```typescript
   // Sync device A → device B
   const remoteChangeSets = await fetchRemoteChangeSets();
   for (const cs of remoteChangeSets) {
     if (!hasConflict(cs)) {
       executeChangeSet(cs);  // Apply directly
     } else {
       promptUserToResolve(cs);  // User picks version
     }
   }
   ```

3. **No schema changes needed** - structure already supports sync!

## Design Decisions Summary

### Three Key Decisions for Future-Proofing

**1. ULIDs:**
- ✅ Globally unique (no collision in multi-device)
- ✅ Sortable (preserves chronological order)
- ✅ Client-generated (no central authority)
- ⏳ Ready for sync without migration

**2. ChangeSet-Based Writes:**
- ✅ Atomic batch operations
- ✅ Built-in audit trail
- ✅ Conflict detection structure
- ⏳ Ready for sync replication

**3. Soft Deletes (deletedAt):**
- ✅ Preserves history
- ✅ Enables "undo" functionality
- ✅ Simplifies sync (deletions are updates, not hard deletes)
- ⏳ Ready for conflict resolution

---

### v1 → v2 Evolution (No Breaking Changes)

**Phase 1: v1 (Current)**
- Single-device only
- Local SQLite
- No authentication
- No cloud sync

**Phase 2: v2 (Future)**
- Add backend sync service
- Add user authentication
- Same database schema (no migration!)
- Same changeset structure
- Just add sync agent + conflict resolution UI

**Phase 3: v3 (Later)**
- Multi-user accounts (invite family members)
- Real-time collaboration
- Shared account balances
- All built on same foundation

---

### The "Over-Engineering" is Intentional

**Why v1 uses complex patterns for simple use case:**

1. **ULIDs** - Could use auto-increment for single-device
   - But ULIDs prevent breaking change in v2

2. **ChangeSet approval** - Could do direct writes
   - But changesets enable AI reasoning + future sync

3. **Soft deletes** - Could hard delete
   - But soft deletes enable undo + sync conflict resolution

**Philosophy:** Accept v1 complexity to avoid v2 rewrite.

---

**End of Section 9**
