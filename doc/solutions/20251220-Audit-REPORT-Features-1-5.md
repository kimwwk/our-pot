# Audit Report: Features 1-5 Implementation Review

**Date:** 2025-12-20
**Reviewer:** Claude Code
**Scope:** Critical examination of Features 1-5 implementation against SAD specifications
**Status:** 🔴 **CRITICAL ISSUES FOUND - Requires Immediate Fixes**

---

## Executive Summary

After comprehensive review of Features 1-5 against the Software Architecture Document (SAD), I have identified **7 critical bugs** and **multiple architectural deviations** that must be fixed before proceeding to Feature 6 (AI ChangeSet System).

**Severity Breakdown:**
- 🔴 **Critical (Production-Breaking):** 3 bugs
- 🟡 **High (Data Integrity):** 4 bugs
- 🟢 **Medium (Performance/Compliance):** Multiple missing indexes and type mismatches

---

## Critical Issues (Must Fix Immediately)

### 🔴 CRITICAL BUG #1: Balance Calculation Triggers Are Broken

**Location:** `lib/data/migrations/001_initial_schema.ts` (Lines 102-145)

**Problem:**
The database triggers ignore transaction `type` and just add ALL amounts to the balance, regardless of whether they're EXPENSE or DEPOSIT.

**Current (WRONG) Implementation:**
```sql
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance + NEW.amount,  -- ❌ WRONG! Adds ALL amounts
        updated_at = datetime('now')
    WHERE id = NEW.account_id;
END;
```

**Impact:**
- EXPENSES increase the balance instead of decreasing it
- The pot balance calculation is completely backwards
- Users will see incorrect balances

**Correct Implementation (from SAD 3.3):**
```sql
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance + (
        CASE NEW.type
            WHEN 'DEPOSIT' THEN NEW.amount    -- ✅ Add deposits
            WHEN 'EXPENSE' THEN -NEW.amount   -- ✅ Subtract expenses
        END
    ),
    updated_at = datetime('now')
    WHERE id = NEW.account_id;
END;
```

**Same issue affects ALL three triggers:**
- `update_balance_after_insert` (Lines 102-110)
- `update_balance_after_update` (Lines 112-135) - Multiple UPDATE statements, all wrong
- `update_balance_after_delete` (Lines 137-145)

---

### 🔴 CRITICAL BUG #2: Reconcile Balance Method is Broken

**Location:** `lib/data/repositories/AccountRepository.ts` (Lines 56-68)

**Problem:**
The `reconcileBalance()` method just sums ALL transaction amounts without considering the transaction type.

**Current (WRONG) Implementation:**
```typescript
async reconcileBalance(id: string): Promise<void> {
    await this.executeNonQuery(`
      UPDATE accounts
      SET balance = (
        SELECT COALESCE(SUM(amount), 0)  -- ❌ WRONG! Ignores type
        FROM transactions
        WHERE account_id = ?
        AND deleted_at IS NULL
      ),
      updated_at = ?
      WHERE id = ?
    `, [id, new Date().toISOString(), id]);
}
```

**Impact:**
- Balance reconciliation produces incorrect results
- Manual reconciliation in settings won't fix balance drift
- Backup restoration will have wrong balances

**Correct Implementation (from SAD 3.3):**
```typescript
async reconcileBalance(id: string): Promise<void> {
    await this.executeNonQuery(`
      UPDATE accounts
      SET balance = (
        SELECT COALESCE(SUM(
          CASE type
            WHEN 'DEPOSIT' THEN amount   -- ✅ Add deposits
            WHEN 'EXPENSE' THEN -amount  -- ✅ Subtract expenses
          END
        ), 0)
        FROM transactions
        WHERE account_id = ?
        AND deleted_at IS NULL
      ),
      updated_at = ?
      WHERE id = ?
    `, [id, new Date().toISOString(), id]);
}
```

---

### 🔴 CRITICAL BUG #3: Transaction Creation Stores Signed Amounts

**Location:** `app/transactions/new/page.tsx` (Lines 30-34)

**Problem:**
The transaction creation logic stores **negative values** for expenses, which violates the SAD specification that amounts should **always be positive integers**.

**Current (WRONG) Implementation:**
```typescript
// Calculate signed amount in cents
// Expense = -ve, Deposit = +ve
const cents = Math.round(data.amount * 100);
const signedAmount = data.type === "EXPENSE" ? -cents : cents;  // ❌ WRONG!

await repo.create({
    // ...
    amount: signedAmount,  // ❌ Storing negative values!
    // ...
});
```

**Impact:**
- Violates SAD specification
- Inconsistent data model (amount field has semantic meaning instead of type field)
- Future AI integration expects positive amounts always
- CSV export will show negative amounts incorrectly

**SAD Specification (Section 3.3):**
> **Why INTEGER for amount? (Cents/Pence Storage)**
> - **Design Decision:** Store amounts as INTEGER in smallest currency unit (cents/pence)
>   - 42.50 GBP → stored as `4250` (pence)
>   - **Storage:** `amount INTEGER NOT NULL`
>   - **Always positive:** Use `type` field to determine impact on balance

**Correct Implementation:**
```typescript
// Convert amount to cents (always positive)
const amountInCents = Math.round(data.amount * 100);

await repo.create({
    // ...
    type: data.type,           // ✅ Type determines semantic meaning
    amount: amountInCents,     // ✅ Always positive cents value
    // ...
});
```

**Note:** Bugs #1, #2, and #3 are interconnected. Fixing all three together is essential. Currently, they "accidentally work" because the bugs partially cancel each other out, but this is fragile and wrong architecturally.

---

## High Priority Issues

### 🟡 HIGH BUG #4: unique_kitty_per_account Constraint is Wrong

**Location:** `lib/data/migrations/001_initial_schema.ts` (Line 35)

**Problem:**
The constraint creates a unique index on `(account_id, is_kitty)` which is incorrect.

**Current (WRONG) Implementation:**
```sql
CONSTRAINT unique_kitty_per_account UNIQUE (account_id, is_kitty)
```

**Impact:**
- This constraint allows only ONE member with `is_kitty=true` AND ONE member with `is_kitty=false` per account
- You cannot have multiple human members in an account
- Violates the requirement that each account can have multiple human members but only one kitty

**Correct Implementation (from SAD 3.3):**
```sql
-- Option 1: SQLite 3.15+ partial index
CREATE UNIQUE INDEX unique_kitty_per_account
ON members(account_id)
WHERE is_kitty = 1 AND deleted_at IS NULL;

-- Option 2: Check constraint (if partial indexes not supported)
-- Remove the UNIQUE constraint and add a trigger to enforce it
```

---

### 🟡 HIGH BUG #5: Missing Database Indexes

**Location:** `lib/data/migrations/001_initial_schema.ts` (Lines 71-72)

**Problem:**
Only 2 indexes are created, but SAD 3.3 specifies many more for query performance.

**Current Implementation:**
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_model_search ON transactions(account_id, merchant, description);
```

**Missing Indexes (from SAD 3.3):**

**Accounts:**
- `idx_accounts_deletedAt` on (deleted_at)

**Members:**
- `idx_members_accountId` on (account_id)
- `idx_members_isKitty` on (account_id, is_kitty)
- `idx_members_deletedAt` on (deleted_at)

**Transactions:**
- `idx_transactions_accountId` on (account_id)
- `idx_transactions_memberId` on (member_id)
- `idx_transactions_categoryId` on (category_id)
- `idx_transactions_type` on (type)
- `idx_transactions_merchant` on (merchant)
- `idx_transactions_deletedAt` on (deleted_at)

**Categories:**
- `idx_categories_accountId` on (account_id)
- `idx_categories_name` on (account_id, name)
- `idx_categories_deletedAt` on (deleted_at)

**ChangeSets:**
- `idx_changesets_status` on (status)
- `idx_changesets_proposedAt` on (proposed_at DESC)
- `idx_changesets_toolCallId` on (tool_call_id)

**Change_Requests:**
- `idx_change_requests_changesetId` on (changeset_id)
- `idx_change_requests_executionOrder` on (changeset_id, execution_order)
- `idx_change_requests_entityId` on (entity_id)

**Impact:**
- Slow queries on filtered data
- Poor performance with large datasets
- Future AI agent queries will be slow

---

### 🟡 HIGH BUG #6: ChangeSet Status Enum Values Don't Match SAD

**Location:** `lib/data/types.ts` (Line 53)

**Problem:**
Status enum has wrong values: `'executed'` and `'failed'` instead of `'executing'` and `'execution_failed'`.

**Current (WRONG) Implementation:**
```typescript
status: 'building' | 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed';
```

**Correct Implementation (from SAD 4.1):**
```typescript
status: 'building' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'execution_failed';
```

**Impact:**
- Feature 6 (AI ChangeSet System) cannot be implemented without fixing this
- State machine transitions won't match SAD specifications
- TypeScript type safety will be incorrect

---

### 🟡 HIGH BUG #7: Transaction Type Comment is Misleading

**Location:** `lib/data/types.ts` (Line 42)

**Problem:**
Comment says "Signed integer" but amount should always be positive.

**Current (WRONG) Implementation:**
```typescript
amount: number; // Signed integer (relative to pot)
```

**Correct Implementation:**
```typescript
amount: number; // Always positive integer in cents (e.g., 4250 = £42.50)
```

**Impact:**
- Misleading for developers
- Encourages wrong implementation patterns
- Already caused Bug #3

---

## Medium Priority Issues

### Type Mismatch: OperationType and EntityType Casing

**Location:** `lib/data/types.ts` (Lines 66-67)

**Current:**
```typescript
operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
entity_type: 'TRANSACTION' | 'CATEGORY' | 'MEMBER';
```

**SAD Specification (Section 4.2):**
```
operationType: 'create' | 'update' | 'delete';
entityType: 'transaction' | 'category' | 'account' | 'member';
```

**Fix:** Use lowercase enum values and add 'account' to entityType.

---

## Architectural Observations (Non-Blocking)

### ✅ What's Working Well

1. **Platform Detection:** Capacitor platform detection works correctly
2. **WASM Fallback:** Web development with jeep-sqlite is properly implemented
3. **Repository Pattern:** Well-structured repository layer
4. **React Hooks:** Data hooks (useTransactions, useCategories, useMembers) work well
5. **UI Components:** shadcn/ui integration is clean
6. **Form Validation:** Zod validation with react-hook-form is solid
7. **Migrations System:** Migration framework is in place
8. **Seed Data:** Default account, kitty, and categories seeding works

### ⚠️ Architectural Deviations (Acceptable for now, but document)

1. **Navigation:** Using Next.js App Router pages instead of single-page tab navigation
   - **SAD Spec (Section 6.6):** Single-page with tab-based navigation
   - **Current:** Multiple pages with Next.js routing
   - **Impact:** Not a blocker, but different UX than designed
   - **Recommendation:** Document this deviation or refactor to single-page

2. **Category Picker Allows "uncategorized":**
   - Allows selecting "uncategorized" as a value (Line 177 in TransactionForm.tsx)
   - Should probably be `null` or `undefined` for category_id instead of string "uncategorized"

3. **Missing ChangeSetContext:**
   - Feature 6 requires ChangeSetContext for keyed buffer management
   - Not implemented yet (expected, as Feature 6 not started)

---

## Testing Recommendations

After fixes are applied, run the following tests:

### Manual Testing Sequence

1. **Balance Calculation Test:**
   ```
   - Create account with £0 balance
   - Add DEPOSIT of £100 → Balance should be £100
   - Add EXPENSE of £42 → Balance should be £58
   - Add another EXPENSE of £20 → Balance should be £38
   - Soft delete the £20 expense → Balance should be £58
   - Run reconcileBalance() → Balance should remain £58
   ```

2. **Multiple Members Test:**
   ```
   - Create account
   - Add human member "Alice"
   - Add human member "Bob"
   - Add human member "Charlie"
   - Verify all 3 can coexist (tests kitty constraint fix)
   - Verify only 1 kitty member exists per account
   ```

3. **Positive Amount Storage Test:**
   ```
   - Create EXPENSE of £42.50
   - Query database directly: SELECT amount FROM transactions
   - Verify amount is stored as 4250 (positive)
   - Verify type is 'EXPENSE'
   ```

4. **Query Performance Test (after adding indexes):**
   ```
   - Create 1000 transactions
   - Filter by date range → measure query time
   - Filter by category → measure query time
   - Filter by member → measure query time
   - Search by merchant → measure query time
   - All should be <100ms
   ```

### Automated Testing

Consider adding unit tests for:
- `formatCurrency()` and `parseCurrency()` conversion
- `reconcileBalance()` calculation correctness
- Balance trigger logic (requires test database)
- Repository CRUD operations

---

## Fix Implementation Priority

**Phase 1: Critical Fixes (Do First)**
1. Fix balance calculation triggers (Bug #1)
2. Fix reconcileBalance method (Bug #2)
3. Fix transaction creation to store positive amounts (Bug #3)
4. Update type definitions (Bug #6, #7)

**Phase 2: Data Integrity Fixes**
5. Fix unique_kitty_per_account constraint (Bug #4)
6. Add all missing database indexes (Bug #5)

**Phase 3: Consistency Fixes**
7. Fix enum casing for operation_type and entity_type
8. Update comments and documentation

**Phase 4: Testing & Validation**
9. Run manual testing sequence
10. Verify balance calculations are correct
11. Test with multiple human members
12. Performance test with indexes

---

## Migration Strategy

### Option A: New Migration File (Recommended)

Create `002_fix_balance_triggers.ts` with:
```sql
-- Drop old triggers
DROP TRIGGER IF EXISTS update_balance_after_insert;
DROP TRIGGER IF EXISTS update_balance_after_update;
DROP TRIGGER IF EXISTS update_balance_after_delete;

-- Create corrected triggers
CREATE TRIGGER update_balance_after_insert ...
-- [corrected implementations]

-- Drop old constraint
-- Note: SQLite doesn't support DROP CONSTRAINT, may need to recreate table

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_accounts_deletedAt ON accounts(deleted_at);
-- [all missing indexes]
```

**Pros:**
- Preserves existing data
- Follows migration best practices
- Can be rolled forward safely

**Cons:**
- More complex (especially unique constraint fix)
- Requires data migration for signed amounts

### Option B: Wipe and Recreate (Acceptable for Development)

If no production data exists:
1. Delete the database file
2. Fix `001_initial_schema.ts` with all corrections
3. Restart app (will recreate database)

**Pros:**
- Clean slate
- Simpler implementation

**Cons:**
- Loses any test data
- Not viable if users have data

**Recommendation:** Use Option B for now (still in development), but prepare Option A migration for future.

---

## Conclusion

The implementation of Features 1-5 has solid foundations (platform detection, repositories, UI components) but contains **7 critical bugs** that will cause incorrect balance calculations and data integrity issues.

**Next Steps:**
1. ✅ Review this audit report
2. 🔴 Fix all Critical bugs (#1, #2, #3)
3. 🟡 Fix all High Priority bugs (#4, #5, #6, #7)
4. ✅ Run testing sequence
5. ✅ Document any intentional architectural deviations
6. ✅ Proceed to Feature 6 (AI ChangeSet System)

**Estimated Fix Time:** 2-4 hours for all fixes + testing

---

**Audit Completed By:** Claude Code
**Audit Date:** 2025-12-20
**Next Review:** After fixes applied
