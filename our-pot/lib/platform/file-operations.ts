import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNativePlatform } from './platform-detect';
import { toast } from 'sonner';

/**
 * Convert ArrayBuffer to base64 string
 * Required for Capacitor Filesystem on some platforms
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * For reading Capacitor Filesystem data
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Download a Blob in the browser
 * Creates a temporary anchor element to trigger download
 */
export function downloadBlobInBrowser(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Clean up the URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Save a backup file to device storage or download in browser
 * @param fileData - The file data as Uint8Array
 * @param filename - The filename to save
 * @returns The file URI (native) or blob URL (web)
 */
export async function saveBackupFile(
    fileData: Uint8Array,
    filename: string
): Promise<string> {
    if (isNativePlatform()) {
        // Native: Use Capacitor Filesystem
        try {
            const base64Data = arrayBufferToBase64(fileData.buffer);
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
            });
            return result.uri;
        } catch (error) {
            console.error('Failed to save backup file:', error);
            throw new Error('Failed to save backup file. Please check storage permissions.');
        }
    } else {
        // Web: Use browser download
        try {
            const blob = new Blob([fileData], { type: 'application/x-sqlite3' });
            downloadBlobInBrowser(blob, filename);
            const url = URL.createObjectURL(blob);
            return url; // Return temp URL
        } catch (error) {
            console.error('Failed to download backup file:', error);
            throw new Error('Failed to download backup file.');
        }
    }
}

/**
 * Share a file using native share sheet or show message on web
 * @param fileUri - The file URI (from saveBackupFile)
 * @param filename - The filename for sharing
 */
export async function shareFile(fileUri: string, filename: string): Promise<void> {
    if (isNativePlatform()) {
        // Native: Use Android share sheet
        try {
            await Share.share({
                title: 'Backup Database',
                text: 'OurPot database backup',
                url: fileUri,
                dialogTitle: 'Share backup file',
            });
        } catch (error) {
            console.error('Failed to share file:', error);
            // User might have cancelled, that's okay
            if (error && typeof error === 'object' && 'message' in error) {
                const message = (error as { message: string }).message;
                if (!message.includes('cancel')) {
                    throw new Error('Failed to share file.');
                }
            }
        }
    } else {
        // Web: Check for Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'OurPot Backup',
                    text: filename,
                });
            } catch (error) {
                // User cancelled or not supported
                console.log('Share cancelled or not supported');
            }
        } else {
            // File already downloaded, just show message
            toast.success('File downloaded to Downloads folder');
        }
    }
}

/**
 * Pick a backup file from device storage or browser file picker
 * @returns The file data and name, or null if cancelled
 */
export async function pickBackupFile(): Promise<{ data: Uint8Array; name: string } | null> {
    if (isNativePlatform()) {
        // Native: Use Capacitor Filesystem with file picker
        // Note: Capacitor doesn't have a built-in file picker, so we'll use
        // the native file picker through a different approach
        // For now, we'll implement a simple approach using the web input
        // This will be improved in the future with a proper native file picker
        return pickFileInBrowser();
    } else {
        // Web: Use HTML file input
        return pickFileInBrowser();
    }
}

/**
 * Pick a file using browser file input
 * Works on both web and native (as fallback)
 */
function pickFileInBrowser(): Promise<{ data: Uint8Array; name: string } | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,application/x-sqlite3,application/octet-stream';
        input.style.display = 'none';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve(null);
                return;
            }

            try {
                const arrayBuffer = await file.arrayBuffer();
                resolve({
                    data: new Uint8Array(arrayBuffer),
                    name: file.name,
                });
            } catch (error) {
                console.error('Failed to read file:', error);
                toast.error('Failed to read file');
                resolve(null);
            }

            // Clean up
            document.body.removeChild(input);
        };

        input.oncancel = () => {
            document.body.removeChild(input);
            resolve(null);
        };

        document.body.appendChild(input);
        input.click();
    });
}
