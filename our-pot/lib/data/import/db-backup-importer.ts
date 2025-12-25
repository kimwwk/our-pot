import { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { runMigrations } from '../migrations/migrate';

/**
 * Recalculate account balances from transactions
 * This fixes any balance corruption from triggers firing during import
 */
async function recalculateBalances(db: SQLiteDBConnection): Promise<void> {
    try {
        console.log('[BALANCE FIX] Starting balance recalculation...');

        // Get all accounts
        const accountsResult = await db.query('SELECT id FROM accounts WHERE deleted_at IS NULL');
        const accounts = accountsResult.values || [];

        for (const account of accounts) {
            // Calculate balance from all non-deleted transactions
            const balanceResult = await db.query(`
                SELECT
                    SUM(CASE
                        WHEN type = 'DEPOSIT' THEN amount
                        WHEN type = 'EXPENSE' THEN -amount
                        ELSE 0
                    END) as calculated_balance
                FROM transactions
                WHERE account_id = ? AND deleted_at IS NULL
            `, [account.id]);

            const calculatedBalance = balanceResult.values?.[0]?.calculated_balance || 0;

            // Get current balance
            const currentResult = await db.query('SELECT balance FROM accounts WHERE id = ?', [account.id]);
            const currentBalance = currentResult.values?.[0]?.balance || 0;

            console.log(`[BALANCE FIX] Account ${account.id}: current=${currentBalance}, calculated=${calculatedBalance}`);

            // Update to correct balance
            await db.run(
                'UPDATE accounts SET balance = ?, updated_at = datetime("now") WHERE id = ?',
                [calculatedBalance, account.id]
            );

            console.log(`[BALANCE FIX] Updated account ${account.id} balance to ${calculatedBalance}`);
        }

        console.log('[BALANCE FIX] Balance recalculation complete');
    } catch (error) {
        console.error('[BALANCE FIX] Failed to recalculate balances:', error);
        throw error;
    }
}

export interface BackupMetadata {
    transactionCount: number;
    accountCount: number;
    memberCount: number;
    categoryCount: number;
    oldestTransaction: string | null;
    newestTransaction: string | null;
    databaseSize: number;
}

/**
 * Validate that a file is a valid backup file
 * For JSON-based backups, check the structure
 * @param fileData - The file data as Uint8Array
 * @returns true if valid, throws error if invalid
 */
export async function validateBackupFile(fileData: Uint8Array): Promise<boolean> {
    try {
        // Convert Uint8Array to string
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(fileData);

        console.log('[DEBUG] Backup file size:', fileData.length, 'bytes');
        console.log('[DEBUG] First 200 chars of JSON:', jsonString.substring(0, 200));

        // Try to parse as JSON
        const jsonData = JSON.parse(jsonString);

        console.log('[DEBUG] Parsed JSON top-level keys:', Object.keys(jsonData));
        console.log('[DEBUG] Full JSON structure:', JSON.stringify(jsonData, null, 2).substring(0, 500));

        // Check for required structure from SQLite exportToJson
        // exportToJson wraps everything in an 'export' object
        const exportData = jsonData.export || jsonData;

        if (!exportData.database || !exportData.tables) {
            console.error('[DEBUG] Missing required fields. Has database:', !!exportData.database, 'Has tables:', !!exportData.tables);
            console.error('[DEBUG] Available keys:', Object.keys(exportData));
            throw new Error('Invalid backup file format. Missing required fields.');
        }

        // Check for required tables
        const tables = exportData.tables.map((t: any) => t.name);
        console.log('[DEBUG] Found tables:', tables);

        const requiredTables = ['accounts', 'transactions', 'members', 'categories', 'changesets', 'change_requests'];

        for (const table of requiredTables) {
            if (!tables.includes(table)) {
                console.error('[DEBUG] Missing required table:', table);
                throw new Error(`Invalid backup file. Missing required table: ${table}`);
            }
        }

        console.log('[DEBUG] Validation passed successfully');
        return true;
    } catch (error) {
        console.error('[DEBUG] Validation error:', error);
        if (error instanceof Error) {
            throw new Error(`Invalid backup file: ${error.message}`);
        }
        throw new Error('Invalid backup file. Please select a valid OurPot backup file.');
    }
}

/**
 * Get metadata from a backup file without importing it
 * @param fileData - The file data as Uint8Array
 * @returns Backup metadata
 */
export async function getBackupMetadata(fileData: Uint8Array): Promise<BackupMetadata> {
    try {
        // Convert Uint8Array to string
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(fileData);

        // Parse as JSON
        const jsonData = JSON.parse(jsonString);

        // exportToJson wraps everything in an 'export' object
        const exportData = jsonData.export || jsonData;

        // Extract metadata from tables
        const transactionsTable = exportData.tables.find((t: any) => t.name === 'transactions');
        const accountsTable = exportData.tables.find((t: any) => t.name === 'accounts');
        const membersTable = exportData.tables.find((t: any) => t.name === 'members');
        const categoriesTable = exportData.tables.find((t: any) => t.name === 'categories');

        const transactions = transactionsTable?.values || [];
        const transactionCount = transactions.filter((t: any) => !t[transactions.findIndex((tx: any) => tx.deleted_at)]).length;

        // Find oldest and newest transaction dates
        let oldestTransaction: string | null = null;
        let newestTransaction: string | null = null;

        if (transactions.length > 0) {
            const dateIndex = transactionsTable.schema.findIndex((col: any) => col.column === 'date');
            const dates = transactions.map((t: any) => t[dateIndex]).filter(Boolean).sort();
            oldestTransaction = dates[0] || null;
            newestTransaction = dates[dates.length - 1] || null;
        }

        return {
            transactionCount: transactionCount || transactions.length,
            accountCount: accountsTable?.values?.length || 0,
            memberCount: membersTable?.values?.length || 0,
            categoryCount: categoriesTable?.values?.length || 0,
            oldestTransaction,
            newestTransaction,
            databaseSize: fileData.length,
        };
    } catch (error) {
        console.error('Failed to get backup metadata:', error);
        throw new Error('Failed to read backup file metadata.');
    }
}

/**
 * Import a database backup
 * This will close the current database, import the backup, and reopen
 * @param sqlite - SQLite connection
 * @param currentDb - Current database connection
 * @param fileData - The backup file data
 */
export async function importDatabase(
    sqlite: SQLiteConnection,
    currentDb: SQLiteDBConnection,
    fileData: Uint8Array
): Promise<void> {
    try {
        // Validate the backup file first
        await validateBackupFile(fileData);

        // Convert Uint8Array to string
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(fileData);

        // Parse the JSON to extract the export object
        const jsonData = JSON.parse(jsonString);
        const exportData = jsonData.export || jsonData;

        // Re-stringify just the export data for importFromJson
        // importFromJson expects {database, version, tables...} not {export: {...}}
        const importJsonString = JSON.stringify(exportData);

        console.log('[DEBUG IMPORT] Preparing to import. Export data keys:', Object.keys(exportData));
        console.log('[DEBUG IMPORT] Import JSON preview:', importJsonString.substring(0, 200));

        // Close current database
        await currentDb.close();

        // Delete the old database connection
        await sqlite.closeConnection('ourpot_db', false);

        // Import from JSON - this will create a new database with the imported data
        await sqlite.importFromJson(importJsonString);

        // Reconnect to the database
        const newDb = await sqlite.createConnection(
            'ourpot_db',
            false,
            'no-encryption',
            1,
            false
        );

        await newDb.open();

        // Run migrations to ensure schema is up to date
        // Note: We use triggers instead of partial indexes for constraints
        // because triggers survive the export/import process correctly
        console.log('Running migrations after restore...');
        await runMigrations(newDb);

        // Debug: Check what data was imported
        console.log('[DEBUG RESTORE] ========== RESTORE CHECK START ==========');

        const membersCheck = await newDb.query('SELECT id, name, is_kitty, deleted_at FROM members');
        console.log('[DEBUG RESTORE] Total members after import:', membersCheck.values?.length || 0);
        console.log('[DEBUG RESTORE] Members:', membersCheck.values?.map(m => ({
            name: m.name,
            is_kitty: m.is_kitty,
            deleted: !!m.deleted_at
        })));

        // Check for specific members
        const kittyMember = membersCheck.values?.find(m => m.is_kitty);
        console.log('[DEBUG RESTORE] Kitty member present:', !!kittyMember);
        if (!kittyMember) {
            console.error('[DEBUG RESTORE] ⚠️  KITTY MEMBER MISSING!');
        }

        const transactionsCheck = await newDb.query('SELECT id, type, amount, deleted_at FROM transactions');
        console.log('[DEBUG RESTORE] Total transactions:', transactionsCheck.values?.length || 0);

        const accountsCheck = await newDb.query('SELECT id, name, balance FROM accounts WHERE deleted_at IS NULL');
        console.log('[DEBUG RESTORE] Accounts before balance fix:', accountsCheck.values);

        // Fix balance corruption caused by triggers firing during import
        // The importFromJson inserts transactions which trigger balance updates,
        // but the accounts table already has the correct balance from the backup.
        // This causes double-counting, so we need to recalculate from scratch.
        console.log('Recalculating account balances...');
        await recalculateBalances(newDb);

        const accountsCheckAfter = await newDb.query('SELECT id, name, balance FROM accounts WHERE deleted_at IS NULL');
        console.log('[DEBUG RESTORE] Accounts after balance fix:', accountsCheckAfter.values);

        // Final member check
        const finalMembersCheck = await newDb.query('SELECT id, name, is_kitty, deleted_at FROM members');
        console.log('[DEBUG RESTORE] Final member count:', finalMembersCheck.values?.length || 0);
        console.log('[DEBUG RESTORE] Final members:', finalMembersCheck.values?.map(m => ({
            name: m.name,
            is_kitty: m.is_kitty
        })));
        console.log('[DEBUG RESTORE] ========== RESTORE CHECK END ==========');

        console.log('Database restored successfully');
    } catch (error) {
        console.error('Failed to import database:', error);
        throw new Error('Failed to restore database. Please try again.');
    }
}
