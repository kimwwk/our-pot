# Database Migrations

This directory contains database migration files for the Our Pot application.

## File Structure

- `*.sql` - SQL schema files (source of truth, easy to edit with SQL syntax highlighting)
- `*.ts` - TypeScript files auto-generated from .sql files (used by the app at runtime)
- `migrate.ts` - Migration runner that executes migrations
- `sync-sql.js` - Script to sync .sql files to .ts files

## Workflow

### Creating a New Migration

1. **Create the SQL file** (e.g., `002_add_receipts.sql`):
   ```sql
   -- Add receipts table
   CREATE TABLE IF NOT EXISTS receipts (
       id TEXT PRIMARY KEY,
       transaction_id TEXT NOT NULL,
       image_url TEXT NOT NULL,
       FOREIGN KEY (transaction_id) REFERENCES transactions(id)
   );
   ```

2. **Generate the TypeScript file**:
   ```bash
   cd lib/data/migrations
   node sync-sql.js
   ```

3. **Register the migration** in `migrate.ts`:
   ```typescript
   import schema002 from './002_add_receipts';

   export const migrations = [
       { version: 1, description: 'Initial Schema', up: initialSchema },
       { version: 2, description: 'Add Receipts', up: schema002 },
   ];
   ```

### Editing an Existing Migration

1. Edit the `.sql` file (e.g., `001_initial_schema.sql`)
2. Run the sync script:
   ```bash
   node sync-sql.js
   ```
3. The corresponding `.ts` file will be automatically updated

## Why This Approach?

- ✅ **Easy to edit**: SQL files have proper syntax highlighting and formatting
- ✅ **Easy to debug**: Can test SQL directly in a SQLite tool
- ✅ **Version controlled**: Both .sql and .ts files are committed
- ✅ **No build config**: Works without webpack/bundler configuration
- ✅ **Works everywhere**: Generated .ts files work in web and mobile

## Platform Differences

The migration system automatically handles platform differences:
- **Web**: Uses `execute()` method which handles multi-statement SQL strings
- **Mobile**: Uses `executeSet()` with Statement Array Definition, parsing SQL into individual statements while respecting `BEGIN...END` blocks
