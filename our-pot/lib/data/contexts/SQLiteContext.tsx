'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { isWeb } from '@/lib/platform/platform-detect';

interface SQLiteContextData {
    db: SQLiteDBConnection | null;
    isInitialized: boolean;
    error: Error | null;
}

const SQLiteContext = createContext<SQLiteContextData>({
    db: null,
    isInitialized: false,
    error: null,
});

export const useSQLite = () => useContext(SQLiteContext);

export const SQLiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<SQLiteDBConnection | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const sqliteRef = useRef<SQLiteConnection | null>(null);

    useEffect(() => {
        const initializeDB = async () => {
            try {
                const platform = Capacitor.getPlatform();
                console.log(`Initializing SQLite on platform: ${platform}`);

                const sqlite = new SQLiteConnection(CapacitorSQLite);
                sqliteRef.current = sqlite;

                if (platform === 'web') {
                    const { defineCustomElements } = await import('jeep-sqlite/loader');
                    defineCustomElements(window);

                    const jeepSqlite = document.createElement('jeep-sqlite');
                    document.body.appendChild(jeepSqlite);
                    await customElements.whenDefined('jeep-sqlite');

                    await sqlite.initWebStore();
                    console.log('Web store initialized');
                }

                const ret = await sqlite.checkConnectionsConsistency();
                const isConn = (await sqlite.isConnection('ourpot_db', false)).result;

                let database: SQLiteDBConnection;

                if (ret.result && isConn) {
                    database = await sqlite.retrieveConnection('ourpot_db', false);
                } else {
                    database = await sqlite.createConnection(
                        'ourpot_db',
                        false,
                        'no-encryption',
                        1,
                        false
                    );
                }

                await database.open();
                console.log('Database opened');

                // Run migrations
                const { runMigrations } = await import('@/lib/data/migrations/migrate');
                await runMigrations(database);

                // Initialize seed data if needed
                const { seedData } = await import('@/lib/data/seed/seed');
                await seedData(database);

                setDb(database);
                setIsInitialized(true);

            } catch (err: any) {
                console.error('SQLite initialization failed', err);
                setError(err);
                setIsInitialized(true); // Set to true even on error so UI can show error state
            }
        };

        initializeDB();

        // Cleanup typically handled by the platform or context unmount, 
        // but for a main app context we often keep it open.
        // If we needed to close:
        /*
        return () => {
            if (sqliteRef.current && db) {
                 sqliteRef.current.closeConnection('ourpot_db', false);
            }
        }
        */
    }, []);

    return (
        <SQLiteContext.Provider value={{ db, isInitialized, error }}>
            {children}
            {isWeb() && (
                <div style={{ display: 'none' }}>
                    {/* Placeholder for jeep-sqlite if needed explicitly in JSX,
                        but we appended it to body above.
                        Some setups prefer <jeep-sqlite /> here if types allow.
                    */}
                </div>
            )}
        </SQLiteContext.Provider>
    );
};
