"use client";

import { useState, useEffect } from "react";
import { BaseSheet } from "@/components/common/BaseSheet";
import { Button } from "@/components/ui/button";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { toast } from "sonner";
import { Loader2, Download, Share2, AlertCircle } from "lucide-react";
import { exportDatabase, getDatabaseStats, createBackupFilename } from "@/lib/data/export/db-backup-exporter";
import { saveBackupFile, shareFile } from "@/lib/platform/file-operations";
import { isNativePlatform } from "@/lib/platform/platform-detect";

interface BackupSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BackupSheet({ isOpen, onClose }: BackupSheetProps) {
    const { db } = useSQLite();
    const [isExporting, setIsExporting] = useState(false);
    const [backupComplete, setBackupComplete] = useState(false);
    const [backupFileUri, setBackupFileUri] = useState<string | null>(null);
    const [backupFilename, setBackupFilename] = useState<string | null>(null);
    const [stats, setStats] = useState<{
        transactionCount: number;
        categoryCount: number;
        memberCount: number;
        accountCount: number;
    } | null>(null);

    const isNative = isNativePlatform();

    useEffect(() => {
        if (isOpen && db) {
            // Load database stats when sheet opens
            getDatabaseStats(db).then(setStats);

            // Reset backup state
            setBackupComplete(false);
            setBackupFileUri(null);
            setBackupFilename(null);
        }
    }, [isOpen, db]);

    const handleExport = async () => {
        if (!db) {
            toast.error("Database not initialized");
            return;
        }

        setIsExporting(true);

        try {
            // Export the database
            const dbData = await exportDatabase(db);

            // Create filename
            const filename = createBackupFilename();
            setBackupFilename(filename);

            // Save the file
            const fileUri = await saveBackupFile(dbData, filename);
            setBackupFileUri(fileUri);

            // Store last backup timestamp in localStorage
            localStorage.setItem('lastBackupDate', new Date().toISOString());

            setBackupComplete(true);
            toast.success(`Backup created: ${filename}`);

            // On web, file is already downloaded
            // On native, we can show share button
        } catch (error) {
            console.error('Backup failed:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create backup');
        } finally {
            setIsExporting(false);
        }
    };

    const handleShare = async () => {
        if (!backupFileUri || !backupFilename) return;

        try {
            await shareFile(backupFileUri, backupFilename);
        } catch (error) {
            console.error('Share failed:', error);
            toast.error('Failed to share backup file');
        }
    };

    const getLastBackupDate = () => {
        const lastBackup = localStorage.getItem('lastBackupDate');
        if (!lastBackup) return 'Never';

        const date = new Date(lastBackup);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
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
            title="Backup Database"
        >
            <div className="px-5 pb-6 space-y-6">
                {/* Database Info */}
                {stats && !backupComplete && (
                    <div className="space-y-3">
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Transactions:</span>
                                <span className="font-medium">{stats.transactionCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Members:</span>
                                <span className="font-medium">{stats.memberCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Categories:</span>
                                <span className="font-medium">{stats.categoryCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Last backup:</span>
                                <span className="font-medium">{getLastBackupDate()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warning about encryption */}
                {!backupComplete && (
                    <div className="flex gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                This backup is unencrypted
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                Store it securely. {isNative ? 'Use your cloud storage\'s encryption features for added security.' : 'Consider using encrypted cloud storage.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Platform-specific info */}
                {!backupComplete && (
                    <div className="text-sm text-muted-foreground">
                        {isNative ? (
                            <p>💡 After creating the backup, you can share it to Google Drive, Dropbox, or email.</p>
                        ) : (
                            <p>💡 The file will download to your browser's Downloads folder.</p>
                        )}
                    </div>
                )}

                {/* Success state */}
                {backupComplete && (
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                            <div className="text-green-600 dark:text-green-400 text-2xl">✓</div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Backup created successfully
                                </p>
                                <p className="text-xs text-green-800 dark:text-green-200 font-mono">
                                    {backupFilename}
                                </p>
                            </div>
                        </div>

                        {isNative && (
                            <Button
                                onClick={handleShare}
                                className="w-full h-12 text-base"
                                variant="outline"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share Backup
                            </Button>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                {!backupComplete && (
                    <Button
                        onClick={handleExport}
                        disabled={isExporting || !db}
                        className="w-full h-12 text-base"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating backup...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Create Backup
                            </>
                        )}
                    </Button>
                )}

                {backupComplete && (
                    <Button
                        onClick={onClose}
                        className="w-full h-12 text-base"
                        variant="outline"
                    >
                        Done
                    </Button>
                )}
            </div>
        </BaseSheet>
    );
}
