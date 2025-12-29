# Critical Bugs: ChangeSet Implementation

**Date:** 2025-12-25
**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Status:** Validation Report

---

## Overview

This document identifies **CRITICAL** bugs in the changeset implementation that violate core architectural requirements from the Software Architecture Document (SAD). These issues fundamentally break the changeset pattern's design principles and must be fixed for the system to work as intended.

**Reference Documents:**
- SAD Section 4: `doc/20251218-SAD-v1-4-ChangeSet-Domain-Logic.md`
- Concept Documents: `doc/references/20251221-concept-changeset-*.md`

---

## CRITICAL-01: currentData NOT FETCHED FOR UPDATES/DELETES

**Severity:** 🔴 CRITICAL - Missing Core Feature
**Location:** `lib/ai/tools/tool-executors.ts:216-272, 274-310`

### Issue
Update and delete tool executors set `currentData: null` instead of fetching the actual current state from the database. This violates a fundamental requirement of the changeset pattern.

### Design Requirement (SAD Section 4.2)
> **currentData:** JSON snapshot of current state (auto-populated)
> - For updates/deletes: Automatically populated from database before approval
> - Purpose: Transparency (before/after), optimistic concurrency, rollback capability

### Why This Breaks the Pattern
The changeset pattern is built on three pillars:
1. **Transparency:** Users see what's changing (before → after)
2. **Optimistic Concurrency:** Detect if data changed since proposal
3. **Audit Trail:** Know what was changed, not just what it became

Without `currentData`, all three pillars collapse. The system cannot:
- Show users what will be modified (only shows proposed values)
- Detect concurrent modifications (no baseline to compare against)
- Provide meaningful audit records (no before/after comparison)

### Actual Implementation
Both update and delete executors explicitly set `currentData: null`:

**Update Transaction Executor (line 259-264):**
```typescript
changeSetActions.addChangeRequest(key, {
    operationType: "update",
    entityType: "transaction",
    entityId: params.transactionId,
    currentData: null, // ❌ Missing
    proposedData: JSON.stringify(proposedData),
});
```

**Delete Transaction Executor (line 297-302):**
```typescript
changeSetActions.addChangeRequest(key, {
    operationType: "delete",
    entityType: "transaction",
    entityId: params.transactionId,
    currentData: null, // ❌ Missing
    proposedData: null,
});
```

### Impact on User Experience
**Update Scenario:**
- User: "Change my grocery transaction to £45"
- AI proposes update
- Widget shows: "£45.00" (proposed)
- Widget DOESN'T show: What the current amount is
- User cannot make informed decision

**Delete Scenario:**
- User: "Delete that transaction"
- AI proposes delete
- Widget shows: "Delete Transaction" (operation only)
- Widget DOESN'T show: What transaction will be deleted
- User deletes blind

### Consequence
- **No transparency:** Users approve changes without seeing what's being changed
- **No concurrency control:** Cannot implement optimistic locking (addressed in HIGH-01)
- **No rollback capability:** Cannot restore previous state if needed
- **Poor audit trail:** No record of what was changed from

### Solution Approach

**Step 1: Fetch Current State**
When AI proposes an update or delete, the tool executor must fetch the current database record before adding to the changeset. Use the existing repository pattern to query by entity ID.

**Step 2: Serialize and Store**
Convert the fetched record to JSON and store in the `currentData` field. This captures a snapshot of the state at proposal time.

**Step 3: Handle Missing Records**
If the record doesn't exist (already deleted), return an error to the AI immediately. Don't allow proposals for non-existent entities.

**Step 4: Update Review Widget**
Modify the ChangeSetReviewWidget to parse and display `currentData` alongside `proposedData`. Show strikethrough for old values and highlight for new values.

**Implementation Points:**
- Reuse existing repository fetch methods (TransactionRepository.getById)
- Handle serialization consistently (JSON.stringify with proper field mapping)
- Consider caching to avoid duplicate database queries
- Update widget to show before/after comparison visually

---

## CRITICAL-02: NO STATE MACHINE ENFORCEMENT

**Severity:** 🔴 CRITICAL - Architectural Violation
**Location:** `lib/data/contexts/ChangeSetContext.tsx:73-242`

### Issue
The ChangeSetContext allows any state transition at any time with no validation. This violates the state machine defined in the SAD and can lead to corrupted application state.

### Design Requirement (SAD Section 4.1)

**Legal Transitions:**
```
idle → building → pending_approval → approved/rejected
pending_approval → building (iterative refinement)
pending_approval → executing → approved/execution_failed
execution_failed → building (auto-recovery)
```

**Illegal Transitions (Currently Allowed):**
```
idle → executing ❌
approved → building ❌
rejected → pending_approval ❌
executing → rejected ❌
```

### Why This Breaks the Pattern
The state machine is not decorative—it encodes the business logic of the approval workflow:

1. **idle → building:** Only happens when first change is added
2. **building → pending_approval:** Only via confirmChangeSet
3. **pending_approval → approved:** Only after execution succeeds
4. **pending_approval → building:** Only for iterative refinement

Allowing arbitrary transitions creates logical impossibilities:
- Approving without a pending proposal
- Returning to building after final approval
- Executing from idle state

### Actual Implementation
No validation on state transitions:

```typescript
const transitionToBuilding = useCallback(() => {
    setStatus("building"); // ❌ Can be called from ANY state
}, []);

const transitionToApproved = useCallback(() => {
    setStatus("approved"); // ❌ Can be called from ANY state
}, [clearBuffer]);
```

### Impact Scenarios

**Scenario 1: Approve from Idle**
```
State: idle
Action: handleApprove() called by mistake
Result: Status becomes "approved" with empty buffer
Impact: Widget shows nothing, AI confused, no data changed
```

**Scenario 2: Building from Approved**
```
State: approved (buffer cleared)
Action: transitionToBuilding() called
Result: Status becomes "building" but buffer is empty
Impact: User sees "building" state with no changes
```

**Scenario 3: Rejected to Pending**
```
State: rejected (buffer cleared)
Action: transitionToPendingApproval() called
Result: Tries to persist empty buffer to database
Impact: Database error or orphaned changeset
```

### Consequence
- **Invalid state sequences:** Application enters impossible states
- **Lost context:** Buffer and status become desynchronized
- **UI corruption:** Widget renders for wrong states
- **Cannot recover:** No way to detect or fix invalid states
- **AI confusion:** Stream receives callbacks from invalid states

### Solution Approach

**Step 1: Define State Machine**
Create a state machine configuration that explicitly lists allowed transitions:
```
IDLE → [BUILDING]
BUILDING → [PENDING_APPROVAL, IDLE]
PENDING_APPROVAL → [EXECUTING, BUILDING, REJECTED]
EXECUTING → [APPROVED, EXECUTION_FAILED]
EXECUTION_FAILED → [BUILDING]
APPROVED → [IDLE]
REJECTED → [IDLE]
```

**Step 2: Add Transition Guards**
Each transition function validates the current state before allowing the change. If the transition is invalid, log an error and prevent the state change.

**Step 3: Centralize Transitions**
Create a single transition dispatcher that validates all state changes through the state machine rules. This prevents bypassing validation.

**Step 4: Add State Invariants**
After each transition, validate that state and buffer are consistent:
- `building` → buffer has items
- `pending_approval` → buffer has items and changeset ID exists
- `approved/rejected` → buffer clearing scheduled
- `idle` → buffer is empty

**Implementation Points:**
- Use a state machine library (xstate) or implement simple guard logic
- Add console warnings/errors for invalid transitions (development mode)
- Consider throwing errors in production for invalid transitions
- Add unit tests for all valid and invalid transitions
- Document the state machine diagram in code comments

---

## CRITICAL-03: EXECUTION ATOMICITY NOT GUARANTEED

**Severity:** 🔴 CRITICAL - Data Integrity Risk
**Location:** `lib/data/repositories/ChangeSetRepository.ts:71-137`

### Issue
The execution error handling happens outside the transaction boundary. If updating the changeset status to `execution_failed` fails, the changeset remains stuck in `pending_approval` state even though operations were rolled back.

### Design Requirement (SAD Section 4.6)
> **Execution Philosophy: All-or-Nothing (ACID)**
> 1. Begin Transaction
> 2. Attempt to execute all ChangeRequests in order
> 3. **If All Succeed:** Commit transaction. Status → `approved`
> 4. **If Any Fail:** Rollback transaction completely. Status → `execution_failed`

### Why This Breaks the Pattern
Atomicity means the changeset record and the entity operations must succeed or fail together. The current implementation has a split-brain scenario:

**Current Flow:**
```
1. BEGIN TRANSACTION (implicit in executeSet)
   2. Execute operations
   3. Update changeset status to 'approved'
4. COMMIT TRANSACTION
5. Catch errors
6. Update status to 'execution_failed' (SEPARATE QUERY)
```

If step 6 fails, the changeset status doesn't reflect reality.

### Actual Implementation
Error status update is outside the transaction:

```typescript
try {
    // Build statements including success status update
    statements.push({
        statement: `UPDATE changesets SET status = 'approved' WHERE id = ?`,
        values: [id]
    });

    await this.db.executeSet(statements); // ✅ Atomic for success path

} catch (error) {
    // ❌ This runs OUTSIDE the transaction
    try {
        await this.executeNonQuery(
            `UPDATE changesets SET status = 'execution_failed' WHERE id = ?`,
            [id]
        );
    } catch (updateError) {
        // ❌ If this fails, status is wrong forever
        console.error(`Failed to update status:`, updateError);
    }
    throw error;
}
```

### Impact Scenarios

**Scenario 1: Status Update Fails**
```
Time 0: Changeset in pending_approval, user clicks Approve
Time 1: Operation #2 fails (FK violation)
Time 2: Transaction rolls back (operations unchanged ✅)
Time 3: Update status to execution_failed... fails (DB locked)
Result: Changeset stuck in pending_approval forever
```

**Scenario 2: Network Interruption**
```
Time 0: Operations execute successfully
Time 1: Network drops before status update
Time 2: User reconnects
Result: Changeset shows pending but data is already changed
```

**Scenario 3: Database Corruption**
```
Time 0: Operations fail and rollback
Time 1: Status update corrupts (disk error)
Result: Changeset status doesn't match actual state
```

### Consequence
- **Orphaned changesets:** Stuck in wrong status permanently
- **Cannot retry:** AI doesn't know execution failed
- **UI confusion:** Widget shows "pending" but execution already attempted
- **Manual cleanup required:** No automatic recovery
- **Audit trail broken:** Status doesn't reflect what happened

### Solution Approach

**Step 1: Understand Capacitor SQLite Limitations**
Research whether `executeSet()` treats the changeset status update atomically with entity operations. If changesets table is in the same database, it should be atomic.

**Step 2: Include Status in Success Transaction**
The current implementation already includes status update in the success path. This is correct—keep it.

**Step 3: Separate Failure Status Update**
For failure cases, the status update MUST be in a separate transaction (because the main transaction rolled back). This is acceptable, but needs proper error handling.

**Step 4: Implement Reconciliation**
Add a recovery mechanism:
- On application start, check for changesets stuck in `executing` or `pending_approval` older than N minutes
- Determine actual state by checking if entities were created/modified
- Update status to match reality
- Notify user of recovered/failed changesets

**Step 5: Add Status Audit Trail**
Store status transition history in a separate table that's never rolled back. This creates an immutable log of what happened, even if status updates fail.

**Implementation Points:**
- Add status_history table: (changeset_id, from_status, to_status, timestamp, error_message)
- Implement reconciliation job or startup check
- Add retry logic for status updates (with exponential backoff)
- Consider storing execution attempt count in changeset
- Log all status transitions for debugging

---

## CRITICAL-04: NO ERROR CLASSIFICATION

**Severity:** 🔴 CRITICAL - Pattern Incomplete
**Location:** `lib/data/repositories/ChangeSetRepository.ts:127-136`, `components/features/agent/AgentTab.tsx:312-326`

### Issue
All execution errors are treated identically. The SAD specifies an error taxonomy that enables intelligent recovery strategies, but it's not implemented.

### Design Requirement (SAD Section 4.6)

**Error Taxonomy:**
| Error Type | Examples | AI Strategy |
|------------|----------|-------------|
| TRANSIENT | DB_LOCKED, NETWORK_TIMEOUT | Auto-retry (wait, re-execute) |
| LOGIC_DATA | FOREIGN_KEY, UNIQUE_CONSTRAINT | Auto-correct (fix via upsert) |
| STALE_STATE | OPTIMISTIC_LOCK_FAIL | Refresh data, re-propose |
| CRITICAL | INTERNAL_SERVER_ERROR | Abort, notify user |

### Why This Breaks the Pattern
Error classification is not optional—it's how the AI knows what to do next:

**Without Classification:**
- Database locked → AI gives up
- Foreign key violation → AI says "something went wrong"
- Unique constraint → User has to figure it out

**With Classification:**
- Database locked → Auto-retry after 500ms (transparent to user)
- Foreign key violation → AI says "Category was deleted, let me fix that"
- Unique constraint → AI says "That name already exists, let me suggest alternatives"

The pattern relies on the AI's ability to recover from recoverable errors.

### Actual Implementation
Generic error handling with no classification:

```typescript
catch (error) {
    console.error(`Failed to apply changeset ${id}`, error);

    await this.executeNonQuery(
        `UPDATE changesets SET status = 'execution_failed' WHERE id = ?`,
        [id]
    );

    throw error; // ❌ Generic error thrown, no classification
}
```

### Impact on User Experience

**Scenario 1: Database Locked (Transient)**
```
Current: "Execution failed" → User must retry manually
Should be: Auto-retry 3x → Succeed transparently
```

**Scenario 2: Foreign Key Violation (Logic Error)**
```
Current: "Execution failed" → User confused, doesn't know why
Should be: AI detects missing category, proposes creating it first
```

**Scenario 3: Duplicate Transaction (Unique Constraint)**
```
Current: "Execution failed" → Generic error message
Should be: AI explains duplicate and asks if user wants to update instead
```

**Scenario 4: Disk Full (Critical)**
```
Current: "Execution failed" → Same as other errors
Should be: Alert admin, show clear error to user, don't retry
```

### Consequence
- **No intelligent recovery:** AI cannot fix transient or logic errors
- **Poor user experience:** All errors look the same to user
- **Manual intervention required:** User must understand technical errors
- **Wasted API calls:** AI doesn't know when to retry vs. give up
- **Pattern incomplete:** Core feature of changeset design missing

### Solution Approach

**Step 1: Define Error Classification System**
Create an error classifier that examines:
- Error message text (SQLite error messages)
- Error codes (if available from Capacitor SQLite)
- Context (which operation failed, what entities involved)

**Step 2: Implement Error Classifier**
Build a classification function that maps errors to types:
- Parse SQLite error messages for keywords ("locked", "constraint", "foreign key", "unique")
- Check error codes against SQLite documentation
- Default to CRITICAL for unknown errors

**Step 3: Store Classified Errors**
When execution fails, store the error classification in the changeset:
- Update rejection_reason field with structured JSON: `{ type, code, message, details }`
- This allows recovery logic to read the error type

**Step 4: Implement Recovery Strategies**
Based on error type, different handling:
- **TRANSIENT:** Retry automatically (up to 3 times with backoff)
- **LOGIC_DATA:** Return classified error to AI with context, let AI fix
- **STALE_STATE:** Return current data to AI, let AI re-propose
- **CRITICAL:** Show error to user, don't retry, log for admin

**Step 5: Update AI Context**
Modify `buildContextAfterDecision()` to include error type and recovery suggestions in the prompt sent to AI.

**Implementation Points:**
- Create error classification module with unit tests
- Document SQLite error codes and messages
- Add retry mechanism with exponential backoff for TRANSIENT
- Enhance AI prompts to handle each error type appropriately
- Add structured error logging for debugging
- Consider error metrics/monitoring

---

## CRITICAL-05: REJECT BUTTON SEMANTIC ERROR

**Severity:** 🔴 CRITICAL - UX Violation
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx:240-248`, `components/features/agent/AgentTab.tsx:329-346`

### Issue
The "Reject" button performs iterative refinement (returns to building state) instead of complete rejection. This violates user expectations and the design specification.

### Design Requirement (SAD Section 4.4)

**Two Rejection Modes:**

1. **Iterative Correction (Reject with Feedback):**
   - User provides specific feedback
   - State: `pending_approval` → `building`
   - Buffer: Preserved for corrections
   - AI receives: Feedback to fix specific issues

2. **Complete Rejection (Reject & Reset):**
   - User rejects entire approach
   - State: `pending_approval` → `rejected`
   - Buffer: Cleared completely
   - AI receives: Complete rejection, start fresh

### Why This Breaks the Pattern
The reject button is a critical UX element. Users have clear mental models:

- **"Reject"** means: "I don't want this, throw it away"
- **"Request Changes"** means: "Fix these issues and show me again"

Conflating these violates user expectations and creates confusion.

### Actual Implementation

**Widget Button (line 240-248):**
```typescript
<Button
    variant="outline"
    onClick={() => onReject()} // ❌ Calls onReject with no feedback
>
    <X className="h-4 w-4 mr-2" />
    Reject
</Button>
```

**Handler (line 329-346):**
```typescript
const handleReject = (feedback?: string) => {
    // ❌ Always does iterative refinement, even with no feedback
    changeSetContext.transitionToBuilding();

    if (pendingConfirmationResolver.current) {
        const decision = buildContextAfterDecision({
            status: "rejected_with_feedback", // ❌ Wrong status
            feedback: feedback || "User requested changes", // ❌ Fabricated feedback
        });
    }
};
```

### Impact on User Experience

**What User Expects:**
1. Clicks "Reject"
2. Changeset disappears
3. Slate is clean
4. Can start fresh conversation with AI

**What Actually Happens:**
1. Clicks "Reject"
2. Changeset goes back to building (invisible to user)
3. AI receives "User requested changes" (but user didn't request anything)
4. AI tries to fix non-existent problems
5. AI re-proposes the same changeset
6. User confused: "I rejected it, why is it back?"

**Actual Scenario:**
```
User: "Add transaction for £100 groceries"
AI: Proposes transaction with £100
User: *Clicks Reject* (changed mind, doesn't want it)
AI: Receives "User requested changes"
AI: "I've corrected the transaction, please review"
User: "I don't want this transaction at all!"
```

### Current Workaround
Users must click the tiny trash icon labeled "Discard" to achieve complete rejection. This is:
- Not discoverable (icon, not labeled button)
- Unclear semantics (discard vs. reject)
- Buried as tertiary action

### Consequence
- **Broken UX:** Users cannot reject changeset as expected
- **Misleading AI:** AI receives false feedback
- **Infinite loops:** AI keeps re-proposing rejected changesets
- **User frustration:** Cannot escape unwanted proposals
- **Violates design:** Pattern requires two rejection modes

### Solution Approach

**Step 1: Clarify Button Semantics**
Redesign the approval widget action buttons with clear mental models:
- **Approve:** Accept and apply all changes (green, primary)
- **Request Changes:** Provide feedback to fix issues (neutral, secondary)
- **Reject:** Discard completely (red, destructive)

**Step 2: Separate Handler Functions**
Create distinct handlers:
- `handleApprove()` → approve and execute
- `handleRequestChanges(feedback)` → iterative refinement (requires feedback)
- `handleReject()` → complete rejection (no feedback needed)

**Step 3: Make Request Changes Require Input**
The "Request Changes" flow should:
- Show textarea for feedback (already exists)
- Require non-empty feedback
- Only then call handleRequestChanges

**Step 4: Update AI Context**
Send different context to AI:
- Iterative refinement: `rejected_with_feedback` status + specific feedback
- Complete rejection: `rejected_completely` status + clear signal to start fresh

**Step 5: Visual Hierarchy**
Button layout priority:
- Primary: Approve (large, green)
- Secondary: Request Changes (medium, neutral)
- Tertiary: Reject (small or outline, destructive color)

**Implementation Points:**
- Rename `onDiscard` to `onReject` for clarity
- Remove the trash icon button
- Make "Reject" a clear labeled button
- Ensure "Request Changes" shows input before sending
- Update AI prompt templates to distinguish rejection types
- Add confirmation dialog for reject if changeset is large

---

## Summary Table

| ID | Issue | Severity | Why Critical | Complexity |
|----|-------|----------|--------------|------------|
| CRITICAL-01 | currentData not fetched | 🔴 CRITICAL | Breaks transparency pillar | Medium |
| CRITICAL-02 | No state machine enforcement | 🔴 CRITICAL | Allows impossible states | Medium |
| CRITICAL-03 | Execution atomicity unclear | 🔴 CRITICAL | Status can become wrong | High |
| CRITICAL-04 | No error classification | 🔴 CRITICAL | AI cannot recover intelligently | Medium |
| CRITICAL-05 | Reject button semantics wrong | 🔴 CRITICAL | Violates user expectations | Low |

---

## Architectural Impact

These five issues represent **fundamental violations of the changeset pattern**:

1. **Transparency** (CRITICAL-01): Users can't see what's changing
2. **State Management** (CRITICAL-02): Application state can become invalid
3. **Atomicity** (CRITICAL-03): Status and data can become inconsistent
4. **Recovery** (CRITICAL-04): System can't recover from errors intelligently
5. **User Control** (CRITICAL-05): Users can't reject proposals properly

Unlike the HIGH priority bugs (which are about adding missing safeguards), these CRITICAL bugs break core functionality that exists in the codebase but doesn't work correctly.

---

## Recommendations

### Must Fix Immediately
1. **CRITICAL-05** (Reject button) - Simplest to fix, breaking UX daily
2. **CRITICAL-01** (currentData) - Required for transparency, breaks user trust
3. **CRITICAL-02** (State machine) - Prevents state corruption

### Requires Design Work
4. **CRITICAL-03** (Atomicity) - Needs reconciliation strategy
5. **CRITICAL-04** (Error classification) - Needs error taxonomy implementation

---

## Next Steps

1. **Review with Tech Lead:** Validate architectural approach for solutions
2. **Prioritize by Impact:** CRITICAL-05 and CRITICAL-01 have immediate UX impact
3. **Design Sessions:** CRITICAL-03 and CRITICAL-04 need architectural design
4. **Test Coverage:** Add integration tests for state machine transitions
5. **User Testing:** Validate reject button UX after fix

---

**Related Documents:**
- High Priority Bugs: `doc/20251225-High Bug-Change Set.md`
- Minor Bugs: `doc/20251225-Minor Bug-Change Set.md`
