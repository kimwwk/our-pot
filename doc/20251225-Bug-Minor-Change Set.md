# Minor Bugs & Improvements: ChangeSet Implementation

**Date:** 2025-12-25
**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Status:** Validation Report

---

## Overview

This document identifies **MINOR** issues in the changeset implementation that affect user experience, code consistency, and optimization, but do not pose immediate risks to data integrity or security.

**Reference Documents:**
- SAD Section 4: `doc/20251218-SAD-v1-4-ChangeSet-Domain-Logic.md`
- Concept Documents: `doc/references/20251221-concept-changeset-*.md`

---

## MINOR-01: Missing AI Reasoning Field

**Severity:** 🟢 LOW - Feature Incomplete
**Location:** `lib/ai/tools/tool-executors.ts`, `components/features/agent/ChangeSetReviewWidget.tsx`

### Issue
The design specifies an `aiReasoning` field for transparency, but it's not captured in tool executors or displayed in the review widget.

### Design Requirement (SAD Section 4.2)
```typescript
interface ChangeRequest {
    // ...
    aiReasoning?: string  // AI explains why
}
```

### Actual Implementation
- Tool schemas have `reasoning` parameters (good)
- Tool executors don't capture or pass through reasoning
- ChangeRequest type doesn't include aiReasoning field
- Review widget doesn't display reasoning

### Impact
- Users don't see AI's explanation for each change
- Reduced transparency of AI decision-making
- Harder to understand complex proposals

### Recommended Fix
1. Add `aiReasoning` to ChangeRequest type in ChangeSetContext.tsx
2. Capture reasoning in tool executors:
   ```typescript
   changeSetActions.addChangeRequest(key, {
       // ...
       aiReasoning: params.reasoning, // ✅ Capture reasoning
   });
   ```
3. Display in review widget:
   ```typescript
   {change.aiReasoning && (
       <p className="text-xs text-muted-foreground italic mt-1">
           {change.aiReasoning}
       </p>
   )}
   ```

---

## MINOR-02: Widget Doesn't Show Before/After Comparison

**Severity:** 🟡 MEDIUM - UX Deficiency
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx:164-194`

### Issue
For update and delete operations, the widget only shows proposed data, not the current (before) state. Users cannot see what's changing.

### Design Requirement (SAD Section 2, Principle 2: Transparency)
> **Before/After Visibility:** Users must see complete context of what will happen before approving.
> - Show current state (before values) for updates/deletes
> - Show proposed state (after values) for creates/updates

### Actual Implementation
```typescript
// ChangeSetReviewWidget.tsx:164-194
{change.entity === "transaction" && (
    <>
        {/* ❌ Only shows proposed data */}
        <p className="text-sm font-medium">
            {change.proposedData?.description}
        </p>
        <p className="text-sm text-primary">
            {formatAmount(change.proposedData?.amount)}
        </p>
    </>
)}
```

### Impact
- User doesn't know what's being changed (update operations)
- User doesn't know what's being deleted (delete operations)
- Cannot make informed approval decision
- Reduced trust in AI proposals

### Recommended Fix
Show side-by-side comparison for updates:

```typescript
{change.entity === "transaction" && change.operation === "update" && (
    <div className="space-y-1">
        {/* Current state (strikethrough) */}
        {change.currentData && (
            <p className="text-sm text-muted-foreground line-through">
                {formatAmount(change.currentData.amount)} · {change.currentData.description}
            </p>
        )}
        {/* Proposed state */}
        <p className="text-sm text-primary font-medium">
            {formatAmount(change.proposedData.amount)} · {change.proposedData.description}
        </p>
    </div>
)}

{change.entity === "transaction" && change.operation === "delete" && (
    <div className="space-y-1">
        {/* Show what's being deleted */}
        <p className="text-sm text-destructive">
            {formatAmount(change.currentData?.amount)} · {change.currentData?.description}
        </p>
        <p className="text-xs text-muted-foreground">Will be marked as deleted</p>
    </div>
)}
```

---

## MINOR-03: No Timestamp Warning for Stale Proposals

**Severity:** 🟢 LOW - UX Enhancement
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx`

### Issue
The widget doesn't show when the changeset was proposed or warn if it's stale.

### Design Requirement (Concept: Changeset-Concurrency.md)
> **Short Approval Windows:** Show "proposed X minutes ago" in approval UI

### Impact
- User doesn't know if data might be stale
- Increases risk of approving outdated proposals
- No nudge to refresh before approving

### Recommended Fix
```typescript
// Add to widget header
const proposedAt = new Date(changeSetContext.metadata?.proposedAt || Date.now());
const minutesAgo = Math.floor((Date.now() - proposedAt.getTime()) / 60000);

{minutesAgo > 5 && (
    <div className="px-4 py-2 bg-warning/10 text-warning text-xs">
        ⚠️ Proposed {minutesAgo} minutes ago. Data might have changed since then.
    </div>
)}
```

---

## MINOR-04: Search Tool Returns Decimal Amounts (Inconsistent Format)

**Severity:** 🟢 LOW - Consistency Issue
**Location:** `lib/ai/tools/tool-executors.ts:85`

### Issue
`executeSearchTransactions` returns amounts as decimals (£42.50), which is inconsistent with the internal storage format (4250 pence).

### Actual Implementation
```typescript
// executeSearchTransactions (line 80-93)
return {
    success: true,
    transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount / 100, // ❌ Returns decimal to AI
        // ...
    })),
};
```

### Impact
- AI sees amounts in decimal format from search
- Could confuse AI about storage format
- Inconsistent with other tool behaviors

### Recommended Fix
Document clearly in tool schema and maintain consistency:

**Option A:** Always show AI decimals (recommended)
- Keep current behavior
- Update tool schema description: "Returns amounts in decimal format (e.g., 42.50 for £42.50)"

**Option B:** Show AI storage format
- Return amounts in pence
- Update tool schema: "Returns amounts in pence (e.g., 4250 for £42.50)"

---

## MINOR-05: Memory Leak - pendingConfirmationResolver Not Cleaned Up

**Severity:** 🟡 MEDIUM - Memory Leak
**Location:** `components/features/agent/AgentTab.tsx:49`

### Issue
`pendingConfirmationResolver` is stored in a ref but never cleaned up if the component unmounts while waiting for approval.

### Actual Implementation
```typescript
// AgentTab.tsx:49
const pendingConfirmationResolver = useRef<((result: any) => void) | null>(null);

// No cleanup on unmount
```

### Impact
- Memory leak if user navigates away during approval
- Callback could be called after component unmounted
- Could cause React warnings about state updates on unmounted components

### Recommended Fix
```typescript
useEffect(() => {
    // Cleanup on unmount
    return () => {
        if (pendingConfirmationResolver.current) {
            console.warn('Component unmounting with pending confirmation');
            pendingConfirmationResolver.current = null;
        }
    };
}, []);
```

---

## MINOR-06: Orphaned Pending Changesets Not Cleaned Up

**Severity:** 🟡 MEDIUM - Database Bloat
**Location:** No cleanup logic exists

### Issue
If user navigates away during pending approval, that changeset remains in the database with status `pending_approval` forever.

### Impact
- Database accumulates orphaned changesets
- No way to resume or cleanup old pending approvals
- Could confuse analytics/reporting

### Recommended Fix
Add cleanup mechanism:

**Option A:** Time-based cleanup (cron job)
```typescript
// Run daily
async function cleanupStaleChangesets() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await db.execute(`
        UPDATE changesets
        SET status = 'rejected', rejection_reason = 'Automatically expired after 24 hours'
        WHERE status = 'pending_approval'
        AND proposed_at < ?
    `, [oneDayAgo.toISOString()]);
}
```

**Option B:** On-load cleanup
```typescript
// When AgentTab mounts, check for pending changeset
useEffect(() => {
    async function checkPendingChangeset() {
        const pending = await changesetRepo.getByStatus('pending_approval');

        if (pending.length > 0) {
            // Show modal: "You have a pending changeset. Resume or discard?"
        }
    }

    checkPendingChangeset();
}, []);
```

---

## MINOR-07: Arbitrary setTimeout Delays in State Transitions

**Severity:** 🟡 MEDIUM - Race Condition Risk
**Location:** `lib/data/contexts/ChangeSetContext.tsx:186-199`

### Issue
State transitions use arbitrary 1-second delays with setTimeout, which could cause race conditions.

### Actual Implementation
```typescript
// ChangeSetContext.tsx:186-189
const transitionToApproved = useCallback(() => {
    setStatus("approved");
    setTimeout(() => {
        clearBuffer(); // ❌ Arbitrary 1 second delay
    }, 1000);
}, [clearBuffer]);

// ChangeSetContext.tsx:195-200
const transitionToRejected = useCallback((reason?: string) => {
    setStatus("rejected");
    setTimeout(() => {
        clearBuffer(); // ❌ Arbitrary 1 second delay
    }, 1000);
}, [clearBuffer]);
```

### Impact
- If user takes another action within 1 second, could see stale buffer
- No clear reason for 1-second delay
- Could cause race conditions with UI state

### Recommended Fix
Clear buffer immediately, use UI animation delay instead:

```typescript
const transitionToApproved = useCallback(() => {
    setStatus("approved");
    clearBuffer(); // ✅ Immediate cleanup

    // UI can handle animation delay separately
}, [clearBuffer]);

// In widget, add exit animation
<AnimatePresence mode="wait">
    {status === "pending_approval" && (
        <motion.div
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            {/* Widget content */}
        </motion.div>
    )}
</AnimatePresence>
```

---

## MINOR-08: Amount Conversion Inconsistency

**Severity:** 🟢 LOW - Code Inconsistency
**Location:** `lib/ai/tools/tool-executors.ts:114, 246-248`

### Issue
Create executor assumes validation already converted to cents, but update executor does conversion itself.

### Actual Implementation
```typescript
// executeCreateTransactionChangeRequest (line 174)
const converted = validation.converted!;
// ...
amount: converted.amount, // ✅ Already in cents from validateTransactionProposal

// executeUpdateTransactionChangeRequest (line 246-248)
if (params.amount !== undefined) {
    proposedData.amount = Math.round(params.amount * 100); // ❌ Does conversion itself
}
```

### Impact
- Code inconsistency
- Update path bypasses validation
- Risk of forgetting to convert in future updates

### Recommended Fix
Use consistent validation everywhere:

```typescript
// In executeUpdateTransactionChangeRequest
if (params.amount !== undefined) {
    proposedData.amount = validateAndConvertAmount(params.amount); // ✅ Consistent
}
```

---

## MINOR-09: No Loading Indicators During Execution

**Severity:** 🟢 LOW - UX Enhancement
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx`

### Issue
When user clicks "Approve", there's no indication of which operations are being executed. For large changesets, this could feel unresponsive.

### Impact
- User doesn't know what's happening
- For slow operations, might click "Approve" multiple times
- No progress feedback for multi-step execution

### Recommended Fix
Add execution progress:

```typescript
const [executingIndex, setExecutingIndex] = useState<number | null>(null);

// Pass progress callback to handleApprove
const handleApprove = async (onProgress?: (index: number) => void) => {
    for (let i = 0; i < requests.length; i++) {
        onProgress?.(i);
        await executeRequest(requests[i]);
    }
};

// In widget
{executingIndex !== null && (
    <div className="px-4 py-2 bg-muted text-sm">
        Executing operation {executingIndex + 1} of {changes.length}...
    </div>
)}
```

---

## MINOR-10: Inefficient Category Lookup in Widget

**Severity:** 🟢 LOW - Performance
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx:39-64`

### Issue
Widget fetches all categories from database every time it renders, even though categories are likely already cached elsewhere.

### Actual Implementation
```typescript
// ChangeSetReviewWidget.tsx:39-64
useEffect(() => {
    async function parseChanges() {
        const categoryRepo = new CategoryRepository(db);
        const categories = await categoryRepo.getAllByAccount(account.id); // ❌ DB query every render
        // ...
    }
    parseChanges();
}, [changes, db, account]);
```

### Impact
- Unnecessary database queries
- Slower rendering for large category lists
- Could use existing category context/cache

### Recommended Fix
**Option A:** Use category context if available
```typescript
const { categories } = useCategories(); // Assume context exists
```

**Option B:** Memoize query result
```typescript
const categories = useMemo(async () => {
    const repo = new CategoryRepository(db);
    return await repo.getAllByAccount(account.id);
}, [db, account.id]); // Only re-fetch if db or account changes
```

---

## MINOR-11: DISCARD Action Not Documented in Tool Schemas

**Severity:** 🟢 LOW - Documentation Gap
**Location:** `lib/ai/tools/tool-schemas.ts:59, 73, 82, 94`

### Issue
The `action` parameter for DISCARD is documented in tool schemas but the behavior and usage isn't fully explained.

### Actual Implementation
```typescript
// tool-schemas.ts:59
action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT")
    .describe('UPSERT (add/update) or DISCARD (remove from changeset)'),
```

### Impact
- AI might not understand when to use DISCARD
- Incomplete tool documentation
- Could lead to incorrect tool usage

### Recommended Fix
Improve documentation:

```typescript
action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT")
    .describe(`Action to perform:
        - UPSERT: Add or update this change in the changeset (default)
        - DISCARD: Remove this change from the changeset entirely (useful when user asks to remove a previously proposed change)

        Example usage:
        1. AI proposes: createTransaction({ entityId: "tx-1", amount: 42.50 })
        2. User: "Remove that transaction"
        3. AI calls: createTransaction({ entityId: "tx-1", action: "DISCARD" })
    `),
```

---

## MINOR-12: execution_order Assignment Could Cause Duplicates

**Severity:** 🟢 LOW - Edge Case Bug
**Location:** `lib/data/contexts/ChangeSetContext.tsx:88`

### Issue
execution_order is assigned based on buffer size, which could cause duplicate order numbers if items are removed.

### Actual Implementation
```typescript
// ChangeSetContext.tsx:82-99
const addChangeRequest = useCallback((key: string, request) => {
    setKeyedBuffer((prev) => {
        const newBuffer = new Map(prev);
        const existingRequest = newBuffer.get(key);

        // ❌ If items removed, buffer.size might be less than existing max order
        const executionOrder = existingRequest
            ? existingRequest.executionOrder
            : newBuffer.size;

        // ...
    });
}, [status]);
```

### Example Scenario
```
1. Add transaction A → executionOrder: 0
2. Add transaction B → executionOrder: 1
3. Add category C → executionOrder: 2
4. Remove transaction B (size = 2)
5. Add transaction D → executionOrder: 2 (duplicate!)
```

### Impact
- Duplicate execution orders possible
- Could affect deterministic execution order
- Edge case, unlikely in practice

### Recommended Fix
Track max order separately:

```typescript
const [nextExecutionOrder, setNextExecutionOrder] = useState(0);

const addChangeRequest = useCallback((key, request) => {
    setKeyedBuffer((prev) => {
        const newBuffer = new Map(prev);
        const existingRequest = newBuffer.get(key);

        const executionOrder = existingRequest
            ? existingRequest.executionOrder
            : nextExecutionOrder;

        // ...

        newBuffer.set(key, changeRequest);

        // ✅ Increment for next addition
        if (!existingRequest) {
            setNextExecutionOrder(prev => prev + 1);
        }

        return newBuffer;
    });
}, [nextExecutionOrder]);

// Reset when buffer cleared
const clearBuffer = useCallback(() => {
    setKeyedBuffer(new Map());
    setNextExecutionOrder(0);
    // ...
}, []);
```

---

## MINOR-13: getBufferAsArray Unused Result in confirmChangeSet

**Severity:** 🟢 LOW - Code Smell
**Location:** `lib/ai/tools/tool-executors.ts:417-424`

### Issue
`executeConfirmChangeSet` calls `getBufferAsArray()` to check if buffer is empty, but never uses the returned array.

### Actual Implementation
```typescript
// tool-executors.ts:417-424
export async function executeConfirmChangeSet(...) {
    const buffer = changeSetActions.getBufferAsArray(); // ✅ Gets array

    if (buffer.length === 0) { // ✅ Uses length
        return { success: false, error: "No changes to confirm..." };
    }

    // ❌ Never uses 'buffer' variable again
    // transitionToPendingApproval reads buffer internally
}
```

### Impact
- Minor code smell
- Slightly inefficient (converts Map to Array unnecessarily)
- Confusing for maintainers

### Recommended Fix
**Option A:** Add `hasChanges()` method to context
```typescript
// In ChangeSetContext
const hasChanges = useCallback(() => {
    return keyedBuffer.size > 0;
}, [keyedBuffer]);

// In executeConfirmChangeSet
if (!changeSetActions.hasChanges()) {
    return { success: false, error: "No changes to confirm..." };
}
```

**Option B:** Use the buffer variable
```typescript
const buffer = changeSetActions.getBufferAsArray();

if (buffer.length === 0) {
    return { success: false, error: "No changes to confirm..." };
}

return {
    success: true,
    changeCount: buffer.length, // ✅ Use buffer variable
    // ...
};
```

---

## MINOR-14: No Partial Approval UI

**Severity:** 🟢 LOW - Feature Request
**Location:** `components/features/agent/ChangeSetReviewWidget.tsx`

### Issue
Users must approve or reject the entire changeset. Cannot approve individual changes.

### Design Note (SAD)
> **Trade-offs Accepted:**
> - **All-or-Nothing:** No partial approval (future enhancement)

### Impact
- If one change in changeset is wrong, must reject entire proposal
- Less flexible for users
- AI must re-propose entire changeset after correction

### Recommended Fix (Future Enhancement)
Add checkboxes for individual changes:

```typescript
{parsedChanges.map((change) => (
    <div className="flex items-start gap-3">
        <input
            type="checkbox"
            checked={selectedChanges.has(change.id)}
            onChange={() => toggleChange(change.id)}
        />
        <div>{/* Change details */}</div>
    </div>
))}

<Button onClick={() => handleApproveSelected(selectedChanges)}>
    Approve Selected ({selectedChanges.size})
</Button>
```

---

## MINOR-15: Tool Naming Case Inconsistency (Clarification)

**Severity:** 🟢 LOW - Documentation
**Location:** `lib/ai/tools/tool-schemas.ts`

### Issue
Tool naming follows `{operation}{EntityType}ChangeRequest` pattern correctly, but entity capitalization could be more explicitly documented.

### Current Implementation
- `createTransactionChangeRequest` ✅ Correct (Transaction capitalized)
- `updateTransactionChangeRequest` ✅ Correct
- `createCategoryChangeRequest` ✅ Correct

### Impact
- No functional issue
- Could be unclear for future entity types

### Recommended Fix
Add naming convention to tool documentation:

```typescript
/**
 * Tool Naming Convention:
 * {operation}{EntityType}ChangeRequest
 *
 * Where:
 * - operation: lowercase (create, update, delete)
 * - EntityType: PascalCase (Transaction, Category, Member)
 * - Suffix: "ChangeRequest" (fixed)
 *
 * Examples:
 * - createTransactionChangeRequest
 * - updateCategoryChangeRequest
 * - deleteMemberChangeRequest
 */
```

---

## Summary Table

| ID | Issue | Severity | Impact | Effort |
|----|-------|----------|--------|--------|
| MINOR-01 | Missing AI reasoning field | 🟢 LOW | Reduced transparency | Small |
| MINOR-02 | No before/after comparison | 🟡 MEDIUM | Poor UX | Medium |
| MINOR-03 | No timestamp warnings | 🟢 LOW | Increased stale approval risk | Small |
| MINOR-04 | Search returns decimal amounts | 🟢 LOW | Inconsistent format | Trivial |
| MINOR-05 | Memory leak - resolver cleanup | 🟡 MEDIUM | Memory leak | Small |
| MINOR-06 | Orphaned pending changesets | 🟡 MEDIUM | Database bloat | Medium |
| MINOR-07 | Arbitrary setTimeout delays | 🟡 MEDIUM | Race condition risk | Small |
| MINOR-08 | Amount conversion inconsistency | 🟢 LOW | Code inconsistency | Trivial |
| MINOR-09 | No loading indicators | 🟢 LOW | UX enhancement | Medium |
| MINOR-10 | Inefficient category lookup | 🟢 LOW | Performance | Small |
| MINOR-11 | DISCARD not fully documented | 🟢 LOW | Documentation gap | Trivial |
| MINOR-12 | execution_order duplicates | 🟢 LOW | Edge case bug | Small |
| MINOR-13 | Unused getBufferAsArray result | 🟢 LOW | Code smell | Trivial |
| MINOR-14 | No partial approval UI | 🟢 LOW | Feature request | Large |
| MINOR-15 | Tool naming clarification | 🟢 LOW | Documentation | Trivial |

---

## Recommendations

### Should Fix Soon (Medium Priority)
- MINOR-02: Add before/after comparison in widget (improves transparency)
- MINOR-05: Clean up resolver on unmount (prevent memory leaks)
- MINOR-06: Implement changeset cleanup mechanism (prevent bloat)
- MINOR-07: Remove setTimeout delays (improve reliability)

### Nice to Have (Low Priority)
- MINOR-01: Add AI reasoning display
- MINOR-03: Add timestamp warnings
- MINOR-08: Standardize amount conversion
- MINOR-09: Add execution progress indicators
- MINOR-10: Optimize category lookups

### Quick Wins (Trivial)
- MINOR-04: Document search amount format
- MINOR-11: Improve DISCARD documentation
- MINOR-13: Clean up unused variable
- MINOR-15: Document naming convention

### Future Enhancements
- MINOR-14: Partial approval UI (requires significant design work)

---

**Next Steps:**
1. Address medium-priority fixes in next sprint
2. Create backlog tickets for low-priority items
3. Schedule quick wins for next maintenance window
4. Consider partial approval UI for v2.0
