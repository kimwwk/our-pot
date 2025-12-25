import { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

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

        // Try to parse as JSON
        const jsonData = JSON.parse(jsonString);

        // Check for required structure from SQLite exportToJson
        if (!jsonData.database || !jsonData.tables) {
            throw new Error('Invalid backup file format. Missing required fields.');
        }

        // Check for required tables
        const tables = jsonData.tables.map((t: any) => t.name);
        const requiredTables = ['accounts', 'transactions', 'members', 'categories', 'changesets', 'change_requests'];

        for (const table of requiredTables) {
            if (!tables.includes(table)) {
                throw new Error(`Invalid backup file. Missing required table: ${table}`);
            }
        }

        return true;
    } catch (error) {
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

        // Extract metadata from tables
        const transactionsTable = jsonData.tables.find((t: any) => t.name === 'transactions');
        const accountsTable = jsonData.tables.find((t: any) => t.name === 'accounts');
        const membersTable = jsonData.tables.find((t: any) => t.name === 'members');
        const categoriesTable = jsonData.tables.find((t: any) => t.name === 'categories');

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

        // Parse as JSON
        const jsonData = JSON.parse(jsonString);

        // Close current database
        await currentDb.close();

        // Delete the old database connection
        await sqlite.closeConnection('ourpot_db', false);

        // Import from JSON
        // The importFromJson will create a new database with the imported data
        await sqlite.importFromJson(jsonString);

        // Reconnect to the database
        const newDb = await sqlite.createConnection(
            'ourpot_db',
            false,
            'no-encryption',
            1,
            false
        );

        await newDb.open();

        console.log('Database restored successfully');
    } catch (error) {
        console.error('Failed to import database:', error);
        throw new Error('Failed to restore database. Please try again.');
    }
}
