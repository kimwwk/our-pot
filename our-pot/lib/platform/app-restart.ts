import { isNativePlatform } from './platform-detect';

/**
 * Restart the app after database restore
 * Native: Exits the app (user must reopen manually)
 * Web: Reloads the page
 */
export async function restartApp(): Promise<void> {
    if (isNativePlatform()) {
        // Native: Use Capacitor App plugin to exit
        try {
            const { App } = await import('@capacitor/app');
            await App.exitApp();
        } catch (error) {
            console.error('Failed to exit app:', error);
            // Fallback: show message to user
            alert('Please restart the app manually to complete the restore.');
        }
    } else {
        // Web: Reload the page
        window.location.reload();
    }
}
