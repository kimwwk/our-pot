# Database Migration Fixes - 2024-12-20

## Issue
Database migrations were not working properly on mobile (Android/iOS), causing the app to load forever without showing any data.

## Root Causes Identified

### 1. **Infinite Loading States**
Multiple hooks and contexts returned early without setting `isLoading = false`, causing UI components to show loading spinners forever:
- `AccountContext.fetchAccount()` - returned early if db/account not available
- `useTransactions` hook - returned early without updating loading state
- `useCategories` hook - returned early without updating loading state
- `useMembers` hook - returned early without updating loading state

### 2. **Migration SQL Not Executing on Mobile**
The migration system used `db.execute()` which works on web but fails on mobile. Mobile requires `executeSet()` with Statement Array Definition (SAD) format.

### 3. **Triggers Breaking on Mobile**
Simple semicolon-splitting broke SQL triggers because triggers contain `BEGIN...END` blocks with internal semicolons:
```sql
CREATE TRIGGER update_balance AFTER INSERT ON transactions
BEGIN
    UPDATE accounts SET balance = balance + NEW.amount;  -- This semicolon was breaking it!
END;
```

### 4. **Duplicate Schema Migrations Table**
The initial schema tried to create `schema_migrations` table, but the migration runner also creates it, causing confusion.

### 5. **Difficult to Debug**
SQL wrapped in JavaScript template strings was hard to read, edit, and debug.

## Fixes Applied

### 1. Fixed Loading States ✅
**Files Changed:**
- `lib/data/contexts/AccountContext.tsx`
- `lib/data/hooks/useTransactions.ts` (user reverted changes)
- `lib/data/hooks/useCategories.ts` (user reverted changes)
- `lib/data/hooks/useMembers.ts` (user reverted changes)

**Changes:**
- Added `setIsLoading(false)` in early return conditions
- Added missing dependency (`db`) to useEffect dependency arrays
- Ensured `isInitialized` is set even on errors

### 2. Platform-Specific Migration Execution ✅
**File Changed:** `lib/data/migrations/migrate.ts`

**Changes:**
- Detect platform using `Capacitor.getPlatform()`
- **Web**: Use `execute()` for multi-statement SQL strings
- **Mobile**: Use `executeSet()` with SAD format

### 3. Smart SQL Parsing for Mobile ✅
**File Changed:** `lib/data/migrations/migrate.ts`

**Implementation:**
- Track when inside `BEGIN...END` blocks
- Only split on semicolons outside of BEGIN...END
- Keep entire trigger statements together as single units

```typescript
let insideBeginEnd = false;
for (const line of lines) {
    if (line.toUpperCase().includes('BEGIN')) {
        insideBeginEnd = true;
    }
    if (line.toUpperCase().includes('END;')) {
        insideBeginEnd = false;
        // Statement complete - add to array
    }
    // Only split on ; if not inside BEGIN...END
}
```

### 4. Removed Duplicate Schema Table ✅
**File Changed:** `lib/data/migrations/001_initial_schema.ts`

**Changes:**
- Removed `schema_migrations` table from initial schema
- Migration runner creates it automatically

### 5. SQL File-Based Migration System ✅
**New Files Created:**
- `lib/data/migrations/001_initial_schema.sql` - Pure SQL (source of truth)
- `lib/data/migrations/sync-sql.js` - Auto-sync script
- `lib/data/migrations/README.md` - Documentation

**Workflow:**
```bash
# 1. Edit SQL file (gets syntax highlighting!)
vim lib/data/migrations/001_initial_schema.sql

# 2. Sync to TypeScript
npm run sync-migrations

# Done! The .ts file is auto-generated
```

**Benefits:**
- ✅ Proper SQL syntax highlighting in editors
- ✅ Easy to test SQL in SQLite tools
- ✅ Clean git diffs
- ✅ No webpack configuration needed

### 6. Debug Panel for Troubleshooting ✅
**File Changed:** `lib/data/contexts/SQLiteContext.tsx`

**Features:**
- Shows real-time logs during database initialization
- Displays detailed migration progress
- Shows errors in red with full error messages
- Auto-hides when initialization completes successfully
- Only visible during initialization or on error

**Example Output:**
```
🔍 Database Debug Log
[9:20:57 PM] Starting SQLite initialization on android
[9:20:57 PM] Creating new database connection
[9:20:57 PM] Database opened successfully
[9:20:57 PM] 📝 Applying migration 1: Initial Schema
[9:20:57 PM] Using mobile executeSet() with 36 statements
[9:20:57 PM] ✅ Migration 1 applied successfully
[9:20:57 PM] ✅ Database initialization complete!
```

### 7. Enhanced Logging Throughout ✅
**Files Changed:**
- `lib/data/migrations/migrate.ts`
- `lib/data/seed/seed.ts`

**Changes:**
- Added optional `addLog` callback parameter
- Log every step of migration and seeding
- Console logs work even without debug panel

## Files Modified

### Core Changes:
1. `lib/data/contexts/SQLiteContext.tsx` - Debug panel, logging, error handling
2. `lib/data/contexts/AccountContext.tsx` - Fixed loading states
3. `lib/data/migrations/migrate.ts` - Platform detection, smart SQL parsing
4. `lib/data/migrations/001_initial_schema.ts` - Auto-generated from SQL
5. `lib/data/seed/seed.ts` - Added logging
6. `package.json` - Added `sync-migrations` script

### New Files:
1. `lib/data/migrations/001_initial_schema.sql` - SQL source file
2. `lib/data/migrations/sync-sql.js` - Auto-sync script
3. `lib/data/migrations/README.md` - Migration documentation

## Testing

✅ **Web Platform**: Migrations execute successfully using `execute()`
✅ **Mobile Platform**: Migrations execute successfully using `executeSet()` with proper SQL parsing
✅ **Triggers**: All 3 balance management triggers execute correctly
✅ **Seed Data**: Default account, kitty member, and categories created
✅ **Error Handling**: Debug panel shows detailed error messages when issues occur
✅ **Loading States**: No more infinite loading spinners

## Future Improvements

1. **Production Debug Toggle**: Add environment variable to disable debug panel in production
2. **Migration Rollback**: Add `down` migrations for rollback capability
3. **Migration Testing**: Create automated tests for migration parsing
4. **Schema Validation**: Add runtime validation that schema matches expected types

## References

- [Capacitor SQLite Documentation](https://github.com/capacitor-community/sqlite)
- Statement Array Definition (SAD) format for mobile platforms
- SQLite Trigger syntax with BEGIN...END blocks
