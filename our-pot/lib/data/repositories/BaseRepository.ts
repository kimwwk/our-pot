import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export class BaseRepository {
    protected db: SQLiteDBConnection;

    constructor(db: SQLiteDBConnection) {
        this.db = db;
    }

    // Execute a query that returns multiple rows
    protected async executeQuery<T>(statement: string, values?: any[]): Promise<T[]> {
        try {
            const result = await this.db.query(statement, values);
            return (result.values as T[]) || [];
        } catch (error) {
            console.error(`Query failed: ${statement}`, error);
            throw error;
        }
    }

    // Execute a query that returns a single row
    protected async executeSingle<T>(statement: string, values?: any[]): Promise<T | null> {
        const results = await this.executeQuery<T>(statement, values);
        return results.length > 0 ? results[0] : null;
    }

    // Execute a non-query command (INSERT, UPDATE, DELETE)
    // Returns the changes count or lastId
    protected async executeNonQuery(statement: string, values?: any[]) {
        try {
            const result = await this.db.run(statement, values);
            return result.changes;
        } catch (error) {
            console.error(`Command failed: ${statement}`, error);
            throw error;
        }
    }

    // Transaction helpers
    public async beginTransaction() {
        await this.db.execute('BEGIN TRANSACTION');
    }

    public async commitTransaction() {
        await this.db.execute('COMMIT');
    }

    public async rollbackTransaction() {
        await this.db.execute('ROLLBACK');
    }
}
