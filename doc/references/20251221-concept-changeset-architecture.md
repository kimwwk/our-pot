# ChangeSet Pattern: Architecture & Workflow

**Purpose**: Complete technical specification for implementing the ChangeSet pattern
**Scope**: Domain-agnostic - no application-specific entities or business rules
**Audience**: Engineers implementing the pattern in any domain

---

## 1. State Machine

### 1.1 States

| State | Description | AI Stream | User Visibility | Persistence |
|-------|-------------|-----------|-----------------|-------------|
| `building` | AI accumulating changes in keyed buffer | Active | Hidden | Optional (WIP) |
| `pending_approval` | Awaiting user decision | **Paused** | Review widget visible | Snapshot persisted |
| `executing` | Operations being applied atomically | Paused | Loading indicator | Ephemeral |
| `approved` | Successfully applied | Resumed | Confirmation | **Final** |
| `execution_failed` | Rolled back due to error | Resumed (with error) | Error message | Ephemeral |
| `rejected` | User rejected completely | Resumed | Rejection shown | **Final** (audit) |

### 1.2 State Diagram

```
                         ┌──────────────────────────────────────────┐
                         │              [*] START                   │
                         └────────────────────┬─────────────────────┘
                                              │ AI starts composing
                                              ▼
                    ┌─────────────────────────────────────────────────────┐
                    │                      BUILDING                        │
                    │  ───────────────────────────────────────────────────  │
                    │  • Keyed buffer accumulates changes (upsert)         │
                    │  • AI calls proposal tools                           │
                    │  • AI stream: ACTIVE                                 │
                    └─────────────┬──────────────────────┬────────────────┘
                                  │                      │
              confirmChangeSet()  │                      │ resetChangeSet()
                                  ▼                      ▼
                    ┌──────────────────────┐      ┌─────────────┐
                    │   PENDING_APPROVAL   │      │  [*] END    │
                    │  ──────────────────  │      │  (cleared)  │
                    │  • Review widget     │      └─────────────┘
                    │  • AI stream: PAUSED │
                    └──┬────────┬────────┬─┘
                       │        │        │
       User approves ──┘        │        └── User rejects completely
                                │
                    User rejects with feedback
                                │
                                │ (Iterative Correction)
                                ▼
                    ┌──────────────────────┐
                    │      BUILDING        │◄─────────────────────────┐
                    │   (with feedback)    │                          │
                    └──────────┬───────────┘                          │
                               │ confirmChangeSet()                   │
                               ▼                                      │
                    ┌──────────────────────┐                          │
                    │   PENDING_APPROVAL   │──────────────────────────┘
                    │      (revised)       │   (more corrections)
                    └──────────┬───────────┘
                               │ User approves
                               ▼
                    ┌──────────────────────┐
                    │      EXECUTING       │
                    │  ──────────────────  │
                    │  • DB transaction    │
                    │  • Sequential ops    │
                    └───────┬────────┬─────┘
                            │        │
        All succeed ────────┘        └──── Any fails
                │                              │
                ▼                              ▼
     ┌──────────────────┐         ┌────────────────────┐
     │     APPROVED     │         │  EXECUTION_FAILED  │
     │  ──────────────  │         │  ────────────────  │
     │  FINAL STATE     │         │  DB rolled back    │
     │  Persisted       │         │  AI auto-corrects  │
     └──────────────────┘         └─────────┬──────────┘
                                            │
                                            ▼
                                  ┌──────────────────┐
                                  │     BUILDING     │
                                  │  (error recovery)│
                                  └──────────────────┘


     ┌──────────────────┐
     │     REJECTED     │
     │  ──────────────  │
     │  FINAL STATE     │
     │  Audit only      │
     └──────────────────┘
```

### 1.3 State Transitions

#### building → pending_approval

**Trigger**: AI calls `confirmChangeSet()` tool

**Preconditions**:
- At least one change request in buffer
- All requests pass schema validation

**Actions**:
1. Snapshot keyed buffer
2. Persist snapshot to database
3. Display review widget
4. **Pause AI stream** (do not return tool result yet)

---

#### pending_approval → approved

**Trigger**: User clicks "Approve"

**Actions**:
1. Transition to `executing`
2. Begin database transaction
3. Execute operations sequentially (by `executionOrder`)
4. If all succeed: COMMIT → `approved`
5. If any fails: ROLLBACK → `execution_failed`
6. Call `addToolOutput()` with result
7. Resume AI stream

---

#### pending_approval → building (Iterative Correction)

**Trigger**: User rejects WITH specific feedback

**Example**: "The amount should be 80, not 60"

**Actions**:
1. Restore keyed buffer (not cleared)
2. Feed rejection feedback to AI via `addToolOutput()`
3. Resume AI stream
4. AI corrects via upsert, calls `confirmChangeSet()` again

**Key Benefit**: Conversational refinement without starting over

---

#### pending_approval → rejected (Complete Rejection)

**Trigger**: User rejects WITHOUT feedback (complete rejection)

**Actions**:
1. Set status to `rejected` (final)
2. Clear keyed buffer entirely
3. Persist for audit trail
4. Resume AI stream

**Use Case**: Fundamentally wrong approach, user wants different solution

---

#### execution_failed → building (Auto-Recovery)

**Trigger**: Execution failed, AI analyzes error

**Actions**:
1. AI receives error details (which op failed, why)
2. AI formulates fix
3. AI updates buffer via upsert
4. AI calls `confirmChangeSet()` again
5. **User must re-approve** (safety requirement)

---

## 2. Keyed Buffer Architecture

### 2.1 The Problem with Arrays

```typescript
// ❌ Array-based: creates duplicates, requires index management
changes.push({ entityId: 'x', value: 60 })
changes.push({ entityId: 'x', value: 80 })  // Now have 2 entries!
```

### 2.2 The Solution: Key-Value Map

```typescript
// ✅ Map-based: last-write-wins (upsert)
buffer.set('entity:x', { entityId: 'x', value: 60 })
buffer.set('entity:x', { entityId: 'x', value: 80 })  // Overwrites previous
```

### 2.3 Key Format

```typescript
function makeBufferKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`
}

// For creates (no ID yet), use temp client-side ID:
// "entity:temp-001"
```

### 2.4 DISCARD Operation

To remove an entry from buffer (not the database):

```typescript
if (request.action === 'DISCARD') {
  buffer.delete(makeBufferKey(request.entityType, request.entityId))
}
```

### 2.5 Buffer Lifecycle

| Event | Buffer State |
|-------|--------------|
| AI calls proposal tool | Entry added/updated (upsert) |
| AI calls with `DISCARD` | Entry removed |
| `confirmChangeSet()` | Snapshot taken, buffer preserved |
| User approves | Buffer cleared after execution |
| User rejects with feedback | Buffer preserved for correction |
| User rejects completely | Buffer cleared |
| `resetChangeSet()` | Buffer cleared |

---

## 3. Data Model

### 3.1 ChangeSet (Container)

```typescript
interface ChangeSet {
  id: string                      // ULID or UUID
  status: ChangeSetStatus
  source: 'ai' | 'manual'
  title: string                   // Short summary
  description: string             // Detailed explanation
  toolCallId?: string             // For stream synchronization
  createdAt: Date
  reviewedAt?: Date
  rejectionReason?: string
  changeRequests: ChangeRequest[]
}

type ChangeSetStatus =
  | 'building'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
```

### 3.2 ChangeRequest (Atomic Operation)

```typescript
interface ChangeRequest {
  id: string
  changesetId: string
  operationType: 'create' | 'update' | 'delete'
  entityType: string              // Domain-specific
  entityId?: string               // null for creates
  currentData?: Record<string, unknown>   // Before (for updates/deletes)
  proposedData?: Record<string, unknown>  // After (for creates/updates)
  executionOrder: number
  aiReasoning?: string
  createdAt: Date
}
```

### 3.3 Operation Semantics

| Operation | entityId | currentData | proposedData | DB Effect |
|-----------|----------|-------------|--------------|-----------|
| `create` | null/temp | null | Full object | INSERT |
| `update` | Required | Snapshot | Changed fields | UPDATE |
| `delete` | Required | Snapshot | null | DELETE/soft-delete |

---

## 4. Tool Architecture

### 4.1 Tool Categories

| Category | Purpose | Runs On | Returns Tool Result? |
|----------|---------|---------|---------------------|
| **Proposal Tools** | Build changeset | Client | Yes (immediate) |
| **Coordination Tools** | Control workflow | Client | Delayed (after user decision) |
| **Execution** | Apply changes | Server | N/A (internal) |

### 4.2 Proposal Tool Pattern

```typescript
// Separate tools per operation - follows {operation}{EntityType}ChangeRequest naming
{
  name: "create[EntityType]ChangeRequest",
  description: "Add a new [entity] to the changeset",
  parameters: {
    // ... entity-specific fields for creation
    reasoning: string         // AI explains why
  }
}

{
  name: "update[EntityType]ChangeRequest",
  description: "Update an existing [entity] in the changeset",
  parameters: {
    entityId: string,         // Required - which entity to update
    // ... fields to change
    reasoning: string
  }
}

{
  name: "delete[EntityType]ChangeRequest",
  description: "Remove an [entity] from the changeset",
  parameters: {
    entityId: string,         // Required - which entity to delete
    reasoning: string
  }
}
```

**Key Principle**: One tool = one entity type + one operation. No combined tools with `operationType` parameter.

### 4.3 Coordination Tools

```typescript
// Submit for approval
{
  name: "confirmChangeSet",
  parameters: {
    title: string,
    description: string
  }
}

// Clear and start over (rare)
{
  name: "resetChangeSet",
  parameters: {}
}
```

### 4.4 Tool Handler Pattern

```typescript
function handleToolCall(name: string, args: unknown): ToolResult | 'PAUSE' {
  // Check if it's a ChangeRequest tool
  if (name.endsWith('ChangeRequest')) {
    const { operation, entity } = parseChangeRequestToolName(name)
    const request = transform(entity, operation, args)
    buffer.upsert(request)
    return { success: true }  // Immediate response
  }

  // Coordination tools
  if (name === 'confirmChangeSet') {
    showApprovalWidget(buffer.snapshot())
    return 'PAUSE'  // Don't call addToolOutput yet!
  }

  if (name === 'resetChangeSet') {
    buffer.clear()
    return { success: true }
  }
}

// Parse tool name: createOrderChangeRequest → { operation: 'create', entity: 'Order' }
function parseChangeRequestToolName(name: string): { operation: string, entity: string } {
  const match = name.match(/^(create|update|delete)(\w+)ChangeRequest$/)
  if (!match) throw new Error(`Invalid tool name: ${name}`)
  return { operation: match[1], entity: match[2] }
}
```

---

## 5. Stream Synchronization (Pause-Resume)

### 5.1 The Challenge

AI must wait for human decision without blocking the system.

### 5.2 The Solution

Control when `addToolOutput()` is called:

```
1. AI calls confirmChangeSet()
       │
2. Client intercepts (don't return result yet)
       │
3. AI stream PAUSES (waiting for tool result)
       │
4. Review widget renders (user has unlimited time)
       │
5. User decides (approve/reject)
       │
6. Client calls addToolOutput() with decision
       │
7. AI stream RESUMES with decision context
```

### 5.3 Implementation

```typescript
case 'confirmChangeSet':
  showApprovalWidget({
    changeset: buffer.snapshot(),

    onApprove: async () => {
      const result = await executeChangeSet(snapshot)
      addToolOutput(toolCallId, result)  // NOW resume AI
    },

    onRejectWithFeedback: (feedback: string) => {
      addToolOutput(toolCallId, {
        status: 'rejected_with_feedback',
        feedback
      })
    },

    onRejectCompletely: () => {
      buffer.clear()
      addToolOutput(toolCallId, { status: 'rejected' })
    }
  })

  return 'PAUSE'  // Critical: don't return result here
```

---

## 6. Validation Layers

### 6.1 Layer Overview

```
AI Proposes → [Schema] → [Business] → [State] → User Reviews → [Freshness] → Execute
                ↓            ↓           ↓                          ↓
             Immediate   Pre-confirm  Pre-confirm              Pre-execute
```

### 6.2 Layer 1: Schema Validation (Immediate)

When change request added to buffer.

**Checks**:
- Required fields present
- Field types correct
- Enum values valid

**Failure**: Return error to AI immediately, AI can retry

### 6.3 Layer 2: Business Rules (Pre-Confirmation)

Before transitioning to `pending_approval`.

**Checks**: Domain-specific constraints (defined by implementation)

**Failure**: Return error to AI, AI can correct

### 6.4 Layer 3: State Consistency (Pre-Confirmation)

**Checks**:
- Referenced entities exist
- No duplicate operations on same entity
- Dependencies satisfied (parent before child)

**Failure**: Block confirmation, AI must fix

### 6.5 Layer 4: Freshness / Optimistic Concurrency (Pre-Execution)

Immediately before executing each operation.

**Checks**: For update/delete, verify `currentData` still matches database

**Failure**: Rollback entire changeset, return stale data error

---

## 7. Execution Layer

### 7.1 Atomic Execution

```typescript
async function executeChangeSet(changeset: ChangeSet): Promise<ExecutionResult> {
  const tx = await db.transaction()

  try {
    for (const request of sortByExecutionOrder(changeset.changeRequests)) {
      // Freshness check
      if (!await validateFreshness(request, tx)) {
        throw new StaleDataError(request)
      }

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

### 7.2 Operation Execution

```typescript
async function executeOperation(request: ChangeRequest, tx: Transaction) {
  switch (request.operationType) {
    case 'create':
      return tx.insert(request.entityType, request.proposedData)
    case 'update':
      return tx.update(request.entityType, request.entityId, request.proposedData)
    case 'delete':
      return tx.delete(request.entityType, request.entityId)  // or soft-delete
  }
}
```

---

## 8. Error Taxonomy

### 8.1 Error Classification

| Type | Examples | AI Strategy |
|------|----------|-------------|
| `TRANSIENT` | Network timeout, DB locked | Auto-retry (wait, re-execute) |
| `LOGIC_DATA` | FK violation, unique constraint | Auto-correct (fix via upsert) |
| `STALE_STATE` | Optimistic lock fail | Refresh data, re-propose |
| `CRITICAL` | Internal server error | Abort, notify user |

### 8.2 Error Response Structure

```typescript
interface ExecutionError {
  type: 'TRANSIENT' | 'LOGIC_DATA' | 'STALE_STATE' | 'CRITICAL'
  code: string
  message: string
  failedRequestIndex: number
  entityId?: string
}
```

### 8.3 Recovery Rules

1. After any correction, user MUST re-approve
2. Never auto-execute after error fix
3. AI receives full error context to formulate fix

---

## 9. Persistence Strategy

### 9.1 What to Persist

| State | Persist? | Reason |
|-------|----------|--------|
| `building` | Optional | WIP recovery |
| `pending_approval` | Yes | Survive page refresh |
| `approved` | Yes | Permanent audit trail |
| `rejected` | Yes | Audit trail |
| `executing` | No | Seconds-long |
| `execution_failed` | No | AI handles immediately |

### 9.2 Minimal Schema

```sql
CREATE TABLE changesets (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT
);

CREATE TABLE change_requests (
  id TEXT PRIMARY KEY,
  changeset_id TEXT REFERENCES changesets(id),
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  current_data JSONB,
  proposed_data JSONB,
  execution_order INTEGER NOT NULL,
  ai_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 10. Conversation-ChangeSet Relationship

### 10.1 Constraint

**One active changeset per conversation.**

- Agent cannot create second changeset while first is pending
- Agent cannot read previous changesets
- Reset = clear current changeset, start fresh

### 10.2 Lifecycle

```
Conversation Start
       │
       ▼
┌──────────────────┐
│ No active        │◄────────────────┐
│ changeset        │                 │
└────────┬─────────┘                 │
         │ AI proposes first change  │
         ▼                           │
┌──────────────────┐                 │
│ Active changeset │                 │
│ (building)       │─────────────────┤ Reset or
└────────┬─────────┘                 │ Approved or
         │ confirmChangeSet()        │ Rejected
         ▼                           │
┌──────────────────┐                 │
│ Pending approval │─────────────────┘
└──────────────────┘
```

### 10.3 Implications

- No changeset history within conversation
- Each conversation manages at most one changeset at a time
- Approved/rejected changesets are persisted for audit but not accessible to agent

---

## References

- Principles: `20251221-changeset-principles.md`
- Original sources: `20251217-product1-*.md`, `20251218-product2-*.md`
