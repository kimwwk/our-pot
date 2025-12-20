import { SQLiteDBConnection } from '@capacitor-community/sqlite';

// Import schema file content directly (using raw-loader or similar if configured, but for now we'll stringify or fetch)
// Since we are in Next.js, reading files at runtime in client-side code (SQLiteContext) is tricky.
// Better to bundle the SQL as a string or import it.
// We will manually embed the SQL string here for simplicity in this artifact, 
// OR fetch it from the assets folder if we copied it there.
// A more robust way is to export the SQL string from a TS file.
// Let's assume we can fetch it or hardcode for now. 
// Actually, `001_initial_schema.sql` was created as a file. We can't easily "import" .sql files without config.
// I will create a TS wrapper for the schema to make it importable.

import initialSchema from './001_initial_schema';

export const migrations = [
    {
        version: 1,
        description: 'Initial Schema',
        up: initialSchema
    }
];

export async function runMigrations(db: SQLiteDBConnection) {
    console.log('Running migrations...');

    // Create migrations table if not exists
    await db.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            description TEXT
        );
    `);

    // Get current version
    const result = await db.query('SELECT MAX(version) as current_version FROM schema_migrations');
    const currentVersion = result.values?.[0]?.current_version || 0;

    console.log(`Current DB Version: ${currentVersion}`);

    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            console.log(`Applying migration ${migration.version}: ${migration.description}`);
            try {
                // Split queries by semicolon to execute them (?)
                // execute() allows multiple statements
                await db.execute(migration.up);

                await db.run(
                    'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
                    [migration.version, migration.description]
                );
                console.log(`Migration ${migration.version} applied successfully.`);
            } catch (error) {
                console.error(`Failed to apply migration ${migration.version}:`, error);
                throw error;
            }
        }
    }

    console.log('Migrations complete.');
}
