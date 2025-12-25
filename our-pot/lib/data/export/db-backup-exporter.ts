import { SQLiteDBConnection } from '@capacitor-community/sqlite';

/**
 * Create a backup filename with timestamp
 * Format: ourpot-backup-YYYYMMDD-HHMMSS.db
 */
export function createBackupFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `ourpot-backup-${year}${month}${day}-${hours}${minutes}${seconds}.db`;
}

/**
 * Get the size of the database
 * @param db - SQLite database connection
 * @returns Size in bytes (approximate)
 */
export async function getDatabaseSize(db: SQLiteDBConnection): Promise<number> {
    try {
        // Query to get approximate database size
        // SQLite doesn't have a direct size query, so we estimate based on tables
        const result = await db.query('SELECT SUM(pgsize) as size FROM dbstat');
        if (result && result.values && result.values.length > 0) {
            return result.values[0].size || 0;
        }
        return 0;
    } catch (error) {
        console.warn('Could not determine database size:', error);
        // Return an estimate if query fails
        return 50000; // 50KB estimate
    }
}

/**
 * Export the database to a Uint8Array
 * @param db - SQLite database connection
 * @returns Database bytes as Uint8Array
 */
export async function exportDatabase(db: SQLiteDBConnection): Promise<Uint8Array> {
    try {
        // Use the exportToJson method and then convert back to SQLite format
        // Note: This is a simplified approach. In production, you might want to
        // use the native SQLite export functionality or copy the actual .db file

        // Debug: Check current data before export
        const membersCheck = await db.query('SELECT id, name, is_kitty, deleted_at FROM members');
        console.log('[DEBUG EXPORT] ========== BACKUP EXPORT START ==========');
        console.log('[DEBUG EXPORT] Total members in DB:', membersCheck.values?.length || 0);
        console.log('[DEBUG EXPORT] Members:', membersCheck.values?.map(m => ({
            name: m.name,
            is_kitty: m.is_kitty,
            deleted: !!m.deleted_at
        })));

        const transactionsCheck = await db.query('SELECT id, type, amount, deleted_at FROM transactions');
        console.log('[DEBUG EXPORT] Total transactions:', transactionsCheck.values?.length || 0);

        const accountsCheck = await db.query('SELECT id, name, balance FROM accounts WHERE deleted_at IS NULL');
        console.log('[DEBUG EXPORT] Accounts:', accountsCheck.values);

        // For now, we'll export as JSON and re-encode
        const jsonExport = await db.exportToJson('full');

        console.log('[DEBUG EXPORT] exportToJson returned type:', typeof jsonExport);
        console.log('[DEBUG EXPORT] exportToJson top-level keys:', Object.keys(jsonExport));

        // Check members table in export
        const exportData: any = jsonExport.export || jsonExport;
        const membersTable = exportData.tables?.find((t: any) => t.name === 'members');
        if (membersTable) {
            console.log('[DEBUG EXPORT] Members table in export:', {
                rowCount: membersTable.values?.length || 0,
                schema: membersTable.schema?.map((s: any) => s.column)
            });
            console.log('[DEBUG EXPORT] Exported member rows:', membersTable.values);
        } else {
            console.error('[DEBUG EXPORT] ⚠️  Members table NOT found in export!');
        }

        // Convert JSON export to string
        const jsonString = JSON.stringify(jsonExport);

        console.log('[DEBUG EXPORT] JSON string length:', jsonString.length);
        console.log('[DEBUG EXPORT] ========== BACKUP EXPORT END ==========');

        // Convert string to Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonString);

        console.log('[DEBUG EXPORT] Final Uint8Array size:', data.length, 'bytes');

        return data;
    } catch (error) {
        console.error('Failed to export database:', error);
        throw new Error('Failed to export database. Please try again.');
    }
}

/**
 * Get database statistics for UI display
 * @param db - SQLite database connection
 * @returns Object with transaction count and other stats
 */
export async function getDatabaseStats(db: SQLiteDBConnection): Promise<{
    transactionCount: number;
    categoryCount: number;
    memberCount: number;
    accountCount: number;
}> {
    try {
        const [transactions, categories, members, accounts] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM transactions WHERE deleted_at IS NULL'),
            db.query('SELECT COUNT(*) as count FROM categories WHERE deleted_at IS NULL'),
            db.query('SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL'),
            db.query('SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL'),
        ]);

        return {
            transactionCount: transactions.values?.[0]?.count || 0,
            categoryCount: categories.values?.[0]?.count || 0,
            memberCount: members.values?.[0]?.count || 0,
            accountCount: accounts.values?.[0]?.count || 0,
        };
    } catch (error) {
        console.error('Failed to get database stats:', error);
        return {
            transactionCount: 0,
            categoryCount: 0,
            memberCount: 0,
            accountCount: 0,
        };
    }
}
