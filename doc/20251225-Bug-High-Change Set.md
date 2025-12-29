# High Priority Bugs: ChangeSet Implementation

**Date:** 2025-12-25
**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Status:** Validation Report

---

## Overview

This document identifies **HIGH PRIORITY** bugs that should be addressed but don't require immediate architectural changes. These issues affect data safety, validation, and completeness but have workarounds or are lower risk than critical issues.

---

## HIGH-01: No Optimistic Concurrency Control

**Severity:** 🟠 HIGH
**Location:** `lib/data/repositories/ChangeSetRepository.ts:71-137`

### Issue
The execution layer doesn't verify that data hasn't changed between proposal and execution. If two users modify the same transaction, the last write wins without any detection or warning.

### Impact
- Lost updates when multiple users work simultaneously
- Changes applied to wrong data version
- No detection of concurrent modifications

### Solution Approach
Implement version checking before executing updates/deletes. Compare the `updated_at` timestamp captured at proposal time with the current database value before applying changes. If they don't match, reject the execution and require the AI to refresh the data and re-propose.

---

## HIGH-02: No Business Rule Re-Validation at Execution

**Severity:** 🟠 HIGH
**Location:** `lib/data/repositories/ChangeSetRepository.ts:71-137`

### Issue
Business rules are validated only when AI proposes changes, but not re-validated before execution. Between proposal and approval, database state could change in ways that violate business rules (e.g., referenced category gets deleted).

### Impact
- Foreign key violations if referenced entities deleted
- Business rule violations (e.g., EXPENSE without category)
- Orphaned data references

### Solution Approach
Before executing each operation, re-validate that referenced entities still exist and business rules still hold. For transactions, verify the category exists if provided, member exists, and category is required for EXPENSE types. This creates a final validation gate before database writes.

---

## HIGH-03: Amount Validation Incomplete in Update Executor

**Severity:** 🟠 HIGH
**Location:** `lib/ai/tools/tool-executors.ts:246-248`

### Issue
Update executor directly converts amount to cents using `Math.round(amount * 100)` without validation. This allows negative numbers, NaN, or infinity to be stored.

### Impact
- Invalid negative amounts could be stored
- NaN or Infinity values could corrupt data
- Bypasses validation that create operations use

### Solution Approach
Reuse the existing `validateAndConvertAmount()` function that already handles validation for create operations. This ensures consistent validation across all operations and prevents invalid amounts from reaching the database.

---

## HIGH-04: Missing Authorization Checks

**Severity:** 🟠 HIGH
**Location:** Multiple files - no authorization layer exists

### Issue
No verification that the authenticated user has permission to modify the entities in the changeset. Users could potentially modify transactions/categories belonging to other accounts if they obtain the IDs.

### Impact
- Unauthorized data modification across accounts
- Cross-account data leakage
- Security vulnerability

### Solution Approach
Add an authorization layer that verifies the authenticated user belongs to the account that owns the entities being modified. Check this before executing the changeset, not just when reading data. Store the account context with the changeset and validate ownership at execution time.

---

## HIGH-05: No Temporary ID Resolution for Parent-Child Creates

**Severity:** 🟠 HIGH
**Location:** `lib/data/repositories/ChangeSetRepository.ts:86-92`

### Issue
If AI creates parent and child entities in the same changeset (e.g., new category + transaction using that category), execution fails because the child references a temporary ID that doesn't exist in the database yet.

### Impact
- Foreign key constraint violations
- Valid multi-step operations fail
- AI cannot complete logical operations that span related entities

### Solution Approach
Maintain an ID mapping table during execution. When creating parent entities, capture the database-generated ID and map it from the temporary ID. Before creating child entities, replace any temporary IDs in foreign key fields with the real IDs from the mapping table. This allows parent-child operations to execute atomically in the correct order.

---

## HIGH-06: Missing reviewedAt Timestamp

**Severity:** 🟠 HIGH
**Location:** `components/features/agent/AgentTab.tsx:283-326`, `lib/data/repositories/ChangeSetRepository.ts:115-119`

### Issue
The `reviewed_at` field is never populated when users approve or reject changesets. The database schema includes this field but it remains null.

### Impact
- Incomplete audit trail
- Cannot determine when decisions were made
- No way to calculate time from proposal to approval
- Compliance/auditing limitations

### Solution Approach
Update the changeset record with the current timestamp when transitioning to `approved` or `rejected` status. This should happen in the same transaction as the status update to maintain consistency. Add `reviewed_at` to both the approval execution path and the rejection handler.

---

## Summary Table

| ID | Issue | Severity | Impact | Complexity |
|----|-------|----------|--------|------------|
| HIGH-01 | No optimistic concurrency control | 🟠 HIGH | Lost updates | Medium |
| HIGH-02 | No business rule re-validation | 🟠 HIGH | Rule violations | Medium |
| HIGH-03 | Amount validation incomplete | 🟠 HIGH | Invalid data | Low |
| HIGH-04 | Missing authorization checks | 🟠 HIGH | Security risk | High |
| HIGH-05 | No temporary ID resolution | 🟠 HIGH | Execution failure | Medium |
| HIGH-06 | Missing reviewedAt timestamp | 🟠 HIGH | Audit incomplete | Low |

---

## Recommendations

### Fix Soon (Next Sprint)
- HIGH-03: Amount validation (low complexity, high impact)
- HIGH-06: reviewedAt timestamp (low complexity, audit requirement)
- HIGH-01: Optimistic concurrency (medium complexity, prevents data corruption)

### Plan and Design
- HIGH-04: Authorization layer (high complexity, requires security design)
- HIGH-05: Temporary ID resolution (medium complexity, requires execution redesign)
- HIGH-02: Business rule re-validation (medium complexity, requires validation framework)

---

**Next Steps:**
1. Prioritize HIGH-03 and HIGH-06 as quick wins
2. Design authorization strategy for HIGH-04
3. Plan execution engine improvements for HIGH-01, HIGH-02, HIGH-05
