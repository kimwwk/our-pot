import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

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
    await db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            description TEXT
        )
    `);

    // Get current version
    const result = await db.query('SELECT MAX(version) as current_version FROM schema_migrations');
    const currentVersion = result.values?.[0]?.current_version || 0;

    console.log(`Current DB Version: ${currentVersion}`);

    const isWeb = Capacitor.getPlatform() === 'web';

    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            console.log(`Applying migration ${migration.version}: ${migration.description}`);
            try {
                if (isWeb) {
                    // Web: use execute() which handles multiple statements
                    await db.execute(migration.up);
                } else {
                    // Mobile: use executeSet() with Statement Array Definition (SAD)
                    // Smart SQL parsing that handles BEGIN...END blocks in triggers
                    const cleanedSql = migration.up
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => !line.startsWith('--') && line.length > 0)
                        .join('\n');

                    const statements: { statement: string; values: any[] }[] = [];
                    let currentStatement = '';
                    let insideBeginEnd = false;

                    // Split by semicolons but respect BEGIN...END blocks
                    const lines = cleanedSql.split('\n');
                    for (const line of lines) {
                        currentStatement += line + '\n';

                        // Check if we're entering or leaving a BEGIN...END block
                        const upperLine = line.toUpperCase();
                        if (upperLine.includes('BEGIN')) {
                            insideBeginEnd = true;
                        }
                        if (upperLine.includes('END;')) {
                            insideBeginEnd = false;
                            // Statement is complete
                            const trimmed = currentStatement.trim();
                            if (trimmed) {
                                statements.push({ statement: trimmed, values: [] });
                            }
                            currentStatement = '';
                            continue;
                        }

                        // If not inside BEGIN...END and line ends with semicolon, it's a complete statement
                        if (!insideBeginEnd && line.trim().endsWith(';')) {
                            const trimmed = currentStatement.trim();
                            if (trimmed) {
                                statements.push({ statement: trimmed, values: [] });
                            }
                            currentStatement = '';
                        }
                    }

                    // Add any remaining statement
                    if (currentStatement.trim()) {
                        statements.push({ statement: currentStatement.trim(), values: [] });
                    }

                    if (statements.length > 0) {
                        await db.executeSet(statements, false);
                    }
                }

                await db.run(
                    'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
                    [migration.version, migration.description]
                );
                console.log(`Migration ${migration.version} applied successfully`);
            } catch (error: any) {
                console.error(`Failed to apply migration ${migration.version}:`, error);
                throw error;
            }
        }
    }

    console.log('Migrations complete');
}
