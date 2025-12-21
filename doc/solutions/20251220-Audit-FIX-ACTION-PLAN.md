# Action Plan: Fix Critical Bugs in Features 1-5

**Date:** 2025-12-20
**Priority:** 🔴 CRITICAL - Must fix before Feature 6

---

## Quick Reference: Files to Modify

| # | File | Lines | Issue | Priority |
|---|------|-------|-------|----------|
| 1 | `lib/data/migrations/001_initial_schema.ts` | 102-145 | Balance triggers wrong | 🔴 Critical |
| 2 | `lib/data/migrations/001_initial_schema.ts` | 35, 70+ | Constraint + missing indexes | 🟡 High |
| 3 | `lib/data/repositories/AccountRepository.ts` | 56-68 | reconcileBalance wrong | 🔴 Critical |
| 4 | `app/transactions/new/page.tsx` | 30-34 | Signed amounts wrong | 🔴 Critical |
| 5 | `app/transactions/edit/page.tsx` | Similar | Same signed amount issue | 🔴 Critical |
| 6 | `lib/data/types.ts` | 42, 53, 66-67 | Type definitions wrong | 🟡 High |

---

## Fix #1: Balance Calculation Triggers

**File:** `lib/data/migrations/001_initial_schema.ts`

**Replace lines 102-145** with:

```sql
-- Triggers for Balance Management
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance + (
        CASE NEW.type
            WHEN 'DEPOSIT' THEN NEW.amount
            WHEN 'EXPENSE' THEN -NEW.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = NEW.account_id;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_update
AFTER UPDATE ON transactions
BEGIN
    -- Reverse old amount if transaction was active
    UPDATE accounts
    SET balance = balance - (
        CASE OLD.type
            WHEN 'DEPOSIT' THEN OLD.amount
            WHEN 'EXPENSE' THEN -OLD.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = OLD.account_id
      AND OLD.deleted_at IS NULL;

    -- Apply new amount if transaction is active
    UPDATE accounts
    SET balance = balance + (
        CASE NEW.type
            WHEN 'DEPOSIT' THEN NEW.amount
            WHEN 'EXPENSE' THEN -NEW.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = NEW.account_id
      AND NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_delete
AFTER DELETE ON transactions
WHEN OLD.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance - (
        CASE OLD.type
            WHEN 'DEPOSIT' THEN OLD.amount
            WHEN 'EXPENSE' THEN -OLD.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = OLD.account_id;
END;
```

---

## Fix #2: unique_kitty_per_account Constraint

**File:** `lib/data/migrations/001_initial_schema.ts`

**Line 35 - Remove:**
```sql
    CONSTRAINT unique_kitty_per_account UNIQUE (account_id, is_kitty)
```

**After line 48 (after Categories table), add:**
```sql
-- Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS unique_kitty_per_account
ON members(account_id)
WHERE is_kitty = 1 AND deleted_at IS NULL;
```

---

## Fix #3: Add Missing Indexes

**File:** `lib/data/migrations/001_initial_schema.ts`

**Replace lines 71-72** with:

```sql
-- Indexes for Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_deletedAt ON accounts(deleted_at);

-- Indexes for Members
CREATE INDEX IF NOT EXISTS idx_members_accountId ON members(account_id);
CREATE INDEX IF NOT EXISTS idx_members_isKitty ON members(account_id, is_kitty);
CREATE INDEX IF NOT EXISTS idx_members_deletedAt ON members(deleted_at);

-- Indexes for Categories
CREATE INDEX IF NOT EXISTS idx_categories_accountId ON categories(account_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(account_id, name);
CREATE INDEX IF NOT EXISTS idx_categories_deletedAt ON categories(deleted_at);

-- Indexes for Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_accountId ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_memberId ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_deletedAt ON transactions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);

-- Indexes for ChangeSets
CREATE INDEX IF NOT EXISTS idx_changesets_status ON changesets(status);
CREATE INDEX IF NOT EXISTS idx_changesets_proposedAt ON changesets(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_changesets_toolCallId ON changesets(tool_call_id);

-- Indexes for Change Requests
CREATE INDEX IF NOT EXISTS idx_change_requests_changesetId ON change_requests(changeset_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_executionOrder ON change_requests(changeset_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_change_requests_entityId ON change_requests(entity_id);
```

---

## Fix #4: reconcileBalance Method

**File:** `lib/data/repositories/AccountRepository.ts`

**Replace lines 56-68** with:

```typescript
// Force recalculate balance from transactions
async reconcileBalance(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.executeNonQuery(`
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(
                CASE type
                    WHEN 'DEPOSIT' THEN amount
                    WHEN 'EXPENSE' THEN -amount
                END
            ), 0)
            FROM transactions
            WHERE account_id = ?
            AND deleted_at IS NULL
        ),
        updated_at = ?
        WHERE id = ?
    `, [id, now, id]);
}
```

---

## Fix #5: Transaction Creation (Positive Amounts)

**File:** `app/transactions/new/page.tsx`

**Replace lines 30-34** with:

```typescript
// Convert amount to cents (always positive)
const amountInCents = Math.round(data.amount * 100);

await repo.create({
    id: generateId(),
    account_id: account.id,
    member_id: data.member_id,
    category_id: data.category_id === 'uncategorized' ? undefined : data.category_id,
    type: data.type,                  // Type determines impact on balance
    amount: amountInCents,            // Always positive value in cents
    merchant: data.merchant,
    description: data.description,
    date: data.date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
});
```

**File:** `app/transactions/edit/page.tsx`

Find similar code and apply the same fix (remove negative sign for expenses).

---

## Fix #6: Type Definitions

**File:** `lib/data/types.ts`

**Line 42 - Update comment:**
```typescript
amount: number; // Always positive integer in cents (e.g., 4250 = £42.50)
```

**Line 53 - Update status enum:**
```typescript
status: 'building' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'execution_failed';
```

**Lines 66-67 - Update operation/entity types:**
```typescript
operation_type: 'create' | 'update' | 'delete';  // Lowercase
entity_type: 'transaction' | 'category' | 'member' | 'account';  // Lowercase + add 'account'
```

---

## Execution Steps

### Step 1: Database Reset (Development Only)

Since you're still in development with no production data:

```bash
# Navigate to project
cd /home/user1/house-kitty/our-pot

# Stop any running development server
# Delete the database to start fresh
rm -rf android/app/src/main/assets/public/databases/

# Or in browser (web), clear IndexedDB:
# Browser DevTools → Application → Storage → Clear Site Data
```

### Step 2: Apply Fixes

Apply all 6 fixes listed above to the respective files.

### Step 3: Restart Application

```bash
npm run dev
```

The database will be recreated with the corrected schema.

### Step 4: Verify Fixes

Run the manual testing sequence from the audit report:

1. **Balance Test:**
   - Create DEPOSIT £100 → Check balance = £100
   - Create EXPENSE £42 → Check balance = £58
   - Soft delete expense → Check balance = £100
   - Run reconcile → Check balance remains correct

2. **Multiple Members Test:**
   - Add 3 human members → All should succeed
   - Try to add second kitty → Should fail

3. **Amount Storage Test:**
   - Check database: amounts should all be positive integers
   - EXPENSE of £42.50 stored as 4250
   - DEPOSIT of £100 stored as 10000

### Step 5: Commit Changes

```bash
git add .
git commit -m "fix: Correct balance calculation triggers, reconciliation, and amount storage

- Fix database triggers to properly handle EXPENSE/DEPOSIT types
- Fix reconcileBalance to use CASE statement for type handling
- Fix transaction creation to store positive amounts only
- Add missing database indexes per SAD specification
- Fix unique_kitty_per_account constraint to allow multiple members
- Update type definitions to match SAD (status enum, operation types)

Resolves critical bugs found in Features 1-5 audit"
```

---

## Rollback Plan

If something goes wrong:

```bash
# Restore original schema
git checkout HEAD -- lib/data/migrations/001_initial_schema.ts

# Restore original repository
git checkout HEAD -- lib/data/repositories/AccountRepository.ts

# Restore original transaction creation
git checkout HEAD -- app/transactions/new/page.tsx

# Delete database and restart
rm -rf android/app/src/main/assets/public/databases/
npm run dev
```

---

## Post-Fix Checklist

- [ ] All 6 file modifications applied
- [ ] Database deleted and recreated
- [ ] Application starts without errors
- [ ] Balance calculation test passes (DEPOSIT +, EXPENSE -)
- [ ] Multiple human members can be added
- [ ] Amounts stored as positive integers in database
- [ ] Reconcile balance produces correct results
- [ ] No TypeScript compilation errors
- [ ] Committed changes to git

---

## Notes for Feature 6 Implementation

After these fixes are complete, you can safely proceed to Feature 6 (AI ChangeSet System) with confidence that:

1. ✅ Balance calculations are correct
2. ✅ Amount conversion (decimal ↔ cents) follows SAD spec
3. ✅ Type definitions match SAD exactly
4. ✅ Database schema is correct and indexed
5. ✅ Transaction creation follows proper patterns

The AI Agent will expect:
- Amounts in **pence/cents** (convert £42.50 → 4250)
- Amounts **always positive** (type field determines impact)
- Status enum: `executing` and `execution_failed` (not `executed`/`failed`)

---

**Action Plan Created:** 2025-12-20
**Next Step:** Apply fixes and verify
