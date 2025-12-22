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
    // Use run() instead of execute() to avoid conflicts with Capacitor SQLite's internal transaction management
    public async beginTransaction() {
        try {
            await this.db.run('BEGIN TRANSACTION');
        } catch (error) {
            console.error('Failed to begin transaction:', error);
            throw error;
        }
    }

    public async commitTransaction() {
        try {
            await this.db.run('COMMIT');
        } catch (error) {
            console.error('Failed to commit transaction:', error);
            throw error;
        }
    }

    public async rollbackTransaction() {
        try {
            await this.db.run('ROLLBACK');
        } catch (error) {
            // Don't throw on rollback failure - we're already in error handling
            console.error('Failed to rollback transaction:', error);
        }
    }
}
