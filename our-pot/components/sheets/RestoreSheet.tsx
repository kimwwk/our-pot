"use client";

import { useState } from "react";
import { BaseSheet } from "@/components/common/BaseSheet";
import { Button } from "@/components/ui/button";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { toast } from "sonner";
import { Loader2, Upload, AlertTriangle, FileUp } from "lucide-react";
import { validateBackupFile, getBackupMetadata, importDatabase, type BackupMetadata } from "@/lib/data/import/db-backup-importer";
import { pickBackupFile } from "@/lib/platform/file-operations";
import { restartApp } from "@/lib/platform/app-restart";
import { isNativePlatform } from "@/lib/platform/platform-detect";
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

interface RestoreSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RestoreSheet({ isOpen, onClose }: RestoreSheetProps) {
    const { db } = useSQLite();
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ data: Uint8Array; name: string } | null>(null);
    const [metadata, setMetadata] = useState<BackupMetadata | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [loadingMetadata, setLoadingMetadata] = useState(false);

    const isNative = isNativePlatform();

    const handleSelectFile = async () => {
        try {
            const file = await pickBackupFile();
            if (!file) {
                // User cancelled
                return;
            }

            setLoadingMetadata(true);
            setSelectedFile(file);
            setConfirmed(false);

            // Validate and get metadata
            try {
                await validateBackupFile(file.data);
                const meta = await getBackupMetadata(file.data);
                setMetadata(meta);
                toast.success('Backup file validated successfully');
            } catch (error) {
                console.error('Validation failed:', error);
                toast.error(error instanceof Error ? error.message : 'Invalid backup file');
                setSelectedFile(null);
                setMetadata(null);
            } finally {
                setLoadingMetadata(false);
            }
        } catch (error) {
            console.error('File selection failed:', error);
            toast.error('Failed to select file');
            setLoadingMetadata(false);
        }
    };

    const handleRestore = async () => {
        if (!db || !selectedFile) {
            toast.error("Database or file not ready");
            return;
        }

        if (!confirmed) {
            toast.error("Please confirm that you understand this will replace all your data");
            return;
        }

        setIsRestoring(true);

        try {
            // Create SQLite connection for import
            const sqlite = new SQLiteConnection(CapacitorSQLite);

            // Import the database
            await importDatabase(sqlite, db, selectedFile.data);

            toast.success('Database restored successfully. Restarting...');

            // Wait a moment for the toast to show
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Restart the app
            await restartApp();
        } catch (error) {
            console.error('Restore failed:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to restore database');
            setIsRestoring(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <BaseSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Restore from Backup"
        >
            <div className="px-5 pb-6 space-y-6">
                {/* Warning Banner */}
                <div className="flex gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                            This will replace ALL your current data
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-200">
                            Make sure you have a backup of your current data before proceeding.
                        </p>
                    </div>
                </div>

                {/* File Selection */}
                {!selectedFile && (
                    <Button
                        onClick={handleSelectFile}
                        disabled={loadingMetadata}
                        className="w-full h-12 text-base"
                        variant="outline"
                    >
                        {loadingMetadata ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <FileUp className="mr-2 h-4 w-4" />
                                Select Backup File
                            </>
                        )}
                    </Button>
                )}

                {/* Selected File Info */}
                {selectedFile && metadata && (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">File:</span>
                                <span className="font-medium font-mono text-xs">{selectedFile.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Size:</span>
                                <span className="font-medium">{formatBytes(metadata.databaseSize)}</span>
                            </div>
                            <div className="border-t border-border/50 my-2"></div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">This backup contains:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Transactions:</span>
                                        <span className="ml-2 font-medium">{metadata.transactionCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Accounts:</span>
                                        <span className="ml-2 font-medium">{metadata.accountCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Members:</span>
                                        <span className="ml-2 font-medium">{metadata.memberCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Categories:</span>
                                        <span className="ml-2 font-medium">{metadata.categoryCount}</span>
                                    </div>
                                </div>
                                {metadata.oldestTransaction && metadata.newestTransaction && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Date range: {metadata.oldestTransaction} to {metadata.newestTransaction}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirmation Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">
                                I understand this will replace my current data and cannot be undone
                            </span>
                        </label>

                        {/* Restart Message */}
                        <div className="text-sm text-muted-foreground">
                            {isNative ? (
                                <p>ℹ️ The app will close after restore. Please reopen it to see your restored data.</p>
                            ) : (
                                <p>ℹ️ The page will refresh automatically after restore.</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setMetadata(null);
                                    setConfirmed(false);
                                }}
                                variant="outline"
                                className="flex-1"
                                disabled={isRestoring}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRestore}
                                disabled={!confirmed || isRestoring}
                                className="flex-1"
                            >
                                {isRestoring ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Restore Backup
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </BaseSheet>
    );
}
