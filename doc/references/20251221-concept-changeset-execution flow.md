# ChangeSet Pattern: Execution Flow

**Purpose**: Detailed specification of what happens when user clicks "Approve"
**Scope**: Domain-agnostic - the critical path from approval to database commit
**Audience**: Engineers implementing the execution layer

---

## Overview

This document consolidates the execution flow - the moment changes actually hit the database. This is the **critical path** that must be implemented correctly for data integrity.

```
User clicks "Approve"
       │
       ▼
┌─────────────────────────────────┐
│ 1. State: pending_approval →    │
│           executing             │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 2. Execute in transaction       │
│    - Sort by executionOrder     │
│    - Freshness check each       │
│    - Apply operation            │
└─────────────────────────────────┘
       │
       ├──── All succeed ─────────┐
       │                          ▼
       │              ┌─────────────────────┐
       │              │ 3a. COMMIT          │
       │              │ 4a. State: approved │
       │              │ 5a. Clear buffer    │
       │              │ 6a. Show success    │
       │              └─────────────────────┘
       │
       └──── Any fails ───────────┐
                                  ▼
                      ┌─────────────────────────┐
                      │ 3b. ROLLBACK            │
                      │ 4b. State: exec_failed  │
                      │ 5b. Buffer preserved    │
                      │ 6b. Show error          │
                      └─────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 7. Resume AI stream with result │
│    via addToolOutput()          │
└─────────────────────────────────┘
```

---

## Step-by-Step Flow

### Step 1: User Clicks Approve

**Trigger**: User clicks "Approve" button in ApprovalBanner

**UI State**:
- Button shows loading spinner
- Disable all action buttons (prevent double-submit)

```typescript
// In ApprovalBanner component
const handleApprove = async () => {
  setIsExecuting(true)
  try {
    await onApprove()
  } finally {
    setIsExecuting(false)
  }
}
```

---

### Step 2: Prepare Execution

**Actions**:
1. Transition state to `executing`
2. Snapshot the keyed buffer → ordered array
3. Sort by `executionOrder`

```typescript
function prepareExecution(buffer: Map<string, ChangeRequest>): ChangeRequest[] {
  const requests = Array.from(buffer.values())
  return requests.sort((a, b) => a.executionOrder - b.executionOrder)
}
```

---

### Step 3: Execute in Transaction

**Critical**: All operations in a single database transaction.

```typescript
async function executeChangeSet(
  changeset: ChangeSet,
  context: ExecutionContext
): Promise<ExecutionResult> {

  const requests = prepareExecution(changeset.buffer)

  // Begin transaction
  const tx = await db.transaction()

  try {
    for (const request of requests) {
      // Step 3a: Freshness check (optimistic concurrency)
      await validateFreshness(request, tx)

      // Step 3b: Execute the operation
      await executeOperation(request, tx, context)
    }

    // All succeeded
    await tx.commit()

    return {
      status: 'approved',
      appliedCount: requests.length
    }

  } catch (error) {
    // Any failure → rollback everything
    await tx.rollback()

    return {
      status: 'execution_failed',
      error: classifyError(error),
      failedRequestId: error.requestId
    }
  }
}
```

---

### Step 4: Freshness Check (Optimistic Concurrency)

**Purpose**: Ensure data hasn't changed since AI read it.

**For updates/deletes only** (creates don't need this).

```typescript
async function validateFreshness(
  request: ChangeRequest,
  tx: Transaction
): Promise<void> {

  // Only check for update/delete operations
  if (request.operationType === 'create') {
    return
  }

  // Fetch current record
  const current = await tx
    .from(request.entityType)
    .select('updated_at')
    .eq('id', request.entityId)
    .single()

  if (!current) {
    throw new EntityNotFoundError(request)
  }

  // Compare timestamps
  const expectedTimestamp = request.currentData?.updated_at

  if (current.updated_at !== expectedTimestamp) {
    throw new StaleDataError({
      entityType: request.entityType,
      entityId: request.entityId,
      expected: expectedTimestamp,
      actual: current.updated_at
    })
  }
}
```

---

### Step 5: Execute Operation

**Map operation type to database action**:

```typescript
async function executeOperation(
  request: ChangeRequest,
  tx: Transaction,
  context: ExecutionContext
): Promise<void> {

  const { entityType, entityId, operationType, proposedData } = request

  switch (operationType) {
    case 'create':
      await tx
        .from(entityType)
        .insert({
          ...proposedData,
          // Add audit fields
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      break

    case 'update':
      await tx
        .from(entityType)
        .update({
          ...proposedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
      break

    case 'delete':
      // Soft delete (recommended) or hard delete
      await tx
        .from(entityType)
        .update({
          deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
      break
  }
}
```

---

### Step 6: Handle Result

#### Success Path

```typescript
if (result.status === 'approved') {
  // 1. Clear the buffer
  buffer.clear()

  // 2. Update UI state
  setChangeSetStatus('approved')

  // 3. Show success message
  toast.success(`${result.appliedCount} changes applied`)

  // 4. Resume AI stream
  addToolOutput(toolCallId, {
    status: 'approved',
    message: `Successfully applied ${result.appliedCount} changes`
  })
}
```

#### Failure Path

```typescript
if (result.status === 'execution_failed') {
  // 1. Buffer is preserved (for retry/correction)

  // 2. Update UI state
  setChangeSetStatus('execution_failed')

  // 3. Show error message
  toast.error(result.error.message)

  // 4. Resume AI stream with error context
  addToolOutput(toolCallId, {
    status: 'execution_failed',
    error: {
      type: result.error.type,
      message: result.error.message,
      failedRequestId: result.failedRequestId
    }
  })
}
```

---

### Step 7: Resume AI Stream

**Critical**: The `addToolOutput()` call is what resumes the AI.

```typescript
// The toolCallId was stored when confirmChangeSet was called
addToolOutput(toolCallId, {
  status: result.status,
  message: result.status === 'approved'
    ? 'Changes applied successfully'
    : `Execution failed: ${result.error.message}`,
  appliedCount: result.appliedCount,
  error: result.error
})
```

**What AI receives**:
- Success: AI can acknowledge completion
- Failure: AI analyzes error, proposes fix, calls `confirmChangeSet()` again

---

## Error Types and Recovery

### Error Classification

| Type | Example | Recovery Strategy |
|------|---------|-------------------|
| `STALE_DATA` | Record modified by another user | AI re-fetches data, re-proposes |
| `NOT_FOUND` | Record deleted by another user | AI acknowledges, adjusts plan |
| `CONSTRAINT` | FK violation, unique constraint | AI fixes data, re-proposes |
| `VALIDATION` | Business rule violation | AI corrects, re-proposes |
| `TRANSIENT` | Network timeout, DB lock | Auto-retry (up to 3x) |
| `CRITICAL` | Internal server error | Abort, notify user |

### Error Response Structure

```typescript
interface ExecutionError {
  type: 'STALE_DATA' | 'NOT_FOUND' | 'CONSTRAINT' | 'VALIDATION' | 'TRANSIENT' | 'CRITICAL'
  code: string           // e.g., "23505" for unique violation
  message: string        // Human-readable
  failedRequestId: string
  details?: {
    entityType: string
    entityId: string
    field?: string
    constraint?: string
  }
}
```

### Auto-Recovery Flow

```
execution_failed
       │
       ▼
┌─────────────────────────────────┐
│ AI receives error via           │
│ addToolOutput()                 │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ AI analyzes error:              │
│ - Which request failed?         │
│ - Why did it fail?              │
│ - How to fix?                   │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ AI proposes fix via upsert      │
│ (buffer still has old requests) │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ AI calls confirmChangeSet()     │
│ again                           │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ User sees updated proposal      │
│ User must re-approve            │
│ (safety requirement)            │
└─────────────────────────────────┘
```

---

## Implementation Pattern

### Server Action (Supabase)

```typescript
// actions/changeset/execute-changeset-action.ts

'use server'

import { auth } from '@clerk/nextjs/server'
import supabase from '@/lib/supabase-server'
import { getDbUserId } from '@/lib/user-cache'
import type { ActionState } from '@/types'
import type { ChangeSet, ExecutionResult } from '@/lib/changeset/types'

export async function executeChangeSetAction(
  changeset: ChangeSet
): Promise<ActionState<ExecutionResult>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: 'Not authenticated' }
    }

    const dbUserId = await getDbUserId(userId)

    // Prepare requests
    const requests = Array.from(changeset.buffer.values())
      .sort((a, b) => a.executionOrder - b.executionOrder)

    // Execute each request
    // Note: Supabase doesn't have native transactions in JS client
    // Use RPC or sequential operations with rollback logic

    for (const request of requests) {
      const result = await executeRequest(request, dbUserId)
      if (!result.success) {
        // Rollback previous operations if needed
        return {
          isSuccess: false,
          message: result.error.message,
          // Include error details for AI recovery
        }
      }
    }

    return {
      isSuccess: true,
      message: 'Changes applied successfully',
      data: {
        status: 'approved',
        appliedCount: requests.length
      }
    }

  } catch (error) {
    console.error('[executeChangeSetAction]', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Execution failed'
    }
  }
}
```

### Client-Side Handler

```typescript
// In page.tsx or ChangeSetProvider

const handleApprove = async () => {
  setIsExecuting(true)

  try {
    const result = await executeChangeSetAction(changeset)

    if (result.isSuccess) {
      // Success path
      clearBuffer()
      setStatus('approved')
      toast.success(result.message)

      // Resume AI stream
      addToolOutput(pendingToolCallId, {
        status: 'approved',
        message: result.message
      })
    } else {
      // Failure path
      setStatus('execution_failed')
      toast.error(result.message)

      // Resume AI stream with error
      addToolOutput(pendingToolCallId, {
        status: 'execution_failed',
        error: result.message
      })
    }
  } finally {
    setIsExecuting(false)
  }
}
```

---

## Execution Order Rules

### Parent-Before-Child

When creating related entities, parents must execute first:

```
Session → Exercise → Set

Order:
0: createSession(...)
1: createExercise(..., sessionId: temp-session)
2: createSet(..., exerciseId: temp-exercise-1)
3: createSet(..., exerciseId: temp-exercise-1)
```

### ID Resolution

For creates, the execution layer must resolve temporary IDs:

```typescript
const idMap = new Map<string, string>()  // temp-id → real-id

async function executeCreate(request: ChangeRequest): Promise<string> {
  // Replace temp IDs with real IDs in foreign keys
  const data = resolveForeignKeys(request.proposedData, idMap)

  const { data: created } = await supabase
    .from(request.entityType)
    .insert(data)
    .select('id')
    .single()

  // Store mapping for child entities
  if (request.entityId?.startsWith('temp-')) {
    idMap.set(request.entityId, created.id)
  }

  return created.id
}
```

---

## V1 Simplifications

For V1, we accept these simplifications:

| Aspect | V1 Approach | Future Enhancement |
|--------|-------------|-------------------|
| **Transactions** | Sequential operations, manual rollback | Supabase RPC for true transactions |
| **Rollback** | Best-effort (delete created records) | Database-level ROLLBACK |
| **Retry** | No auto-retry | Transient error auto-retry |
| **Audit** | Console logging | Persist to audit table |

---

## References

- Architecture: `20251221-changeset-architecture.md` (sections 1.3, 5.3, 7)
- Concurrency: `20251221-changeset-concurrency.md`
- Principles: `20251221-changeset-principles.md`
