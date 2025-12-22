# ChangeSet Pattern: Concurrency & Optimistic Locking

**Purpose**: Define strategies for handling concurrent modifications
**Scope**: Domain-agnostic - applicable to any ChangeSet implementation

---

## 1. The Concurrency Problem

### 1.1 Scenario

```
Time →
─────────────────────────────────────────────────────────────────

User A                              User B
  │                                   │
  ├─ Opens session (data v1)          │
  │                                   ├─ Opens same session (data v1)
  ├─ AI proposes changes              │
  │                                   ├─ Directly edits (saves v2)
  ├─ User approves changeset          │
  │                                   │
  └─ Executes against v2 ← CONFLICT!  │
```

### 1.2 Risks

| Risk | Impact |
|------|--------|
| **Lost Updates** | User B's changes silently overwritten |
| **Invalid State** | Change applied to wrong data version |
| **Inconsistent Data** | Partial conflicts leave data corrupted |

---

## 2. Optimistic Locking Strategy

### 2.1 Version Field Approach

Each entity has a `version` field (integer or timestamp).

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  -- ... other fields
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Version Check on Execute

```typescript
async function executeUpdate(
  request: ChangeRequest,
  tx: Transaction
): Promise<void> {
  // 1. Get current version
  const current = await tx
    .from(request.entityType)
    .select('version')
    .eq('id', request.entityId)
    .single()

  // 2. Compare with version when change was proposed
  if (current.version !== request.currentData.version) {
    throw new StaleDataError({
      entityType: request.entityType,
      entityId: request.entityId,
      expectedVersion: request.currentData.version,
      actualVersion: current.version,
    })
  }

  // 3. Update with version increment
  await tx
    .from(request.entityType)
    .update({
      ...request.proposedData,
      version: current.version + 1,
    })
    .eq('id', request.entityId)
    .eq('version', current.version)  // Double-check in WHERE clause
}
```

### 2.3 Timestamp Alternative

For simpler systems, use `updated_at` instead of integer version:

```typescript
if (current.updated_at !== request.currentData.updated_at) {
  throw new StaleDataError(...)
}
```

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| Integer version | Precise, no clock issues | Extra column |
| Timestamp | Already exists usually | Clock skew possible |

---

## 3. When Freshness Matters

### 3.1 Operations by Risk Level

| Operation | Risk | Check Required? |
|-----------|------|-----------------|
| `create` | None | No |
| `update` | High | Yes |
| `delete` | High | Yes |

### 3.2 Capture Version at Proposal Time

When AI calls read tools to get current state, include versions:

```typescript
// Read tool response example
{
  order: {
    id: "ord-123",
    status: "pending",
    version: 5,  // Include version
  },
  items: [{
    id: "item-001",
    productId: "prod-456",
    version: 3,  // Include version
    quantity: 2,
    details: [{
      id: "detail-001",
      version: 2,  // Include version
      price: 29.99,
    }]
  }]
}
```

### 3.3 Store Version in ChangeRequest

```typescript
interface ChangeRequest {
  // ... other fields
  currentData: {
    version: number,  // Captured at proposal time
    // ... other fields
  }
}
```

---

## 4. Handling Stale Data Errors

### 4.1 Error Response

```typescript
interface StaleDataError {
  type: 'STALE_STATE'
  entityType: string
  entityId: string
  expectedVersion: number
  actualVersion: number
  currentData: Record<string, unknown>  // Latest from DB
}
```

### 4.2 Recovery Flow

```
1. Execution fails with StaleDataError
       │
2. Entire changeset rolled back (atomic)
       │
3. Error returned to AI with fresh data:
   {
     status: 'execution_failed',
     error: {
       type: 'STALE_STATE',
       message: 'Entity was modified since proposal',
       currentData: { ... fresh data ... }
     }
   }
       │
4. AI analyzes fresh data vs proposed changes
       │
5. AI re-proposes with updated ChangeRequests
       │
6. User must re-approve (safety requirement)
```

### 4.3 AI Recovery Prompt

When stale data error occurs, include context for AI:

```typescript
addToolOutput({
  tool: "confirmChangeSet",
  toolCallId,
  output: {
    status: "execution_failed",
    error: {
      type: "STALE_STATE",
      message: "The session was modified by another user. Please review the current state and re-propose your changes.",
      staleEntities: [{
        entityType: "exercise",
        entityId: "ex-001",
        proposedData: { reps: 10 },
        currentData: { reps: 12 },  // Someone else changed it
      }]
    }
  }
})
```

---

## 5. Preventing Conflicts

### 5.1 Lock on Edit Start (Pessimistic)

Not recommended for this pattern. ChangeSet is designed for optimistic concurrency.

### 5.2 Refresh Before Confirm

Before transitioning to `pending_approval`, optionally refresh versions:

```typescript
async function confirmChangeSet(changeset: ChangeSet): Promise<ConfirmResult> {
  // Optional: pre-check for stale data
  for (const request of changeset.changeRequests) {
    if (request.operationType !== 'create') {
      const current = await getEntity(request.entityType, request.entityId)
      if (current.version !== request.currentData.version) {
        return {
          status: 'stale_detected',
          staleEntities: [...]
        }
      }
    }
  }

  // All fresh, proceed to pending_approval
  return { status: 'ready_for_approval' }
}
```

### 5.3 Short Approval Windows

Encourage quick approval cycles to minimize conflict window:

- Show "proposed X minutes ago" in approval UI
- Warn if changeset is old: "These changes were proposed 10 minutes ago"
- Auto-refresh on long-pending changesets

---

## 6. Transaction Semantics

### 6.1 All-or-Nothing Execution

```typescript
async function executeChangeSet(changeset: ChangeSet): Promise<ExecutionResult> {
  const tx = await db.transaction()

  try {
    for (const request of sortByExecutionOrder(changeset.changeRequests)) {
      // Check freshness
      await validateFreshness(request, tx)
      // Execute
      await executeOperation(request, tx)
    }

    await tx.commit()
    return { status: 'approved' }

  } catch (error) {
    await tx.rollback()
    return {
      status: 'execution_failed',
      error: classifyError(error)
    }
  }
}
```

### 6.2 No Partial Commits

If any operation fails:
- All previous operations rolled back
- Database returns to pre-execution state
- User sees clear error about what failed

---

## 7. Multi-Entity Changesets

### 7.1 Parent-Child Dependencies

When changeset includes related entities (e.g., order + items + details):

```typescript
// Execution order matters
const orderedRequests = [
  { entityType: 'order', executionOrder: 0 },
  { entityType: 'item', executionOrder: 1 },    // After order
  { entityType: 'detail', executionOrder: 2 },  // After item
]
```

### 7.2 Cascade Version Checks

Parent version should reflect child changes:

```sql
-- Trigger: Update parent version when child changes
CREATE TRIGGER update_parent_version_on_child
AFTER UPDATE ON child_entities
FOR EACH ROW
EXECUTE FUNCTION update_parent_version('parent_entities', 'parent_id');
```

---

## 8. Edge Cases

### 8.1 Entity Deleted Between Proposal and Execution

```typescript
async function executeUpdate(request: ChangeRequest, tx: Transaction) {
  const current = await tx
    .from(request.entityType)
    .select('*')
    .eq('id', request.entityId)
    .single()

  if (!current) {
    throw new EntityDeletedError({
      entityType: request.entityType,
      entityId: request.entityId,
    })
  }

  // ... proceed with version check
}
```

### 8.2 Concurrent Changesets on Same Entity

Only one changeset can successfully execute. First to commit wins, second gets StaleDataError.

### 8.3 Long-Running AI Conversations

For conversations that span hours:
- Warn user: "Data may have changed since you started"
- Offer "Refresh" button to reload current state
- AI can call read tools again before confirming to get fresh data

---

## References

- Architecture: `20251221-changeset-architecture.md`
- Principles: `20251221-changeset-principles.md`
