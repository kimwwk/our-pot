import { isNativePlatform } from './platform-detect';

export interface PlatformCapabilities {
    canShare: boolean;
    canPickFiles: boolean;
    canAccessFilesystem: boolean;
    canRestartApp: boolean;
}

export const getCapabilities = (): PlatformCapabilities => {
    const isNative = isNativePlatform();

    return {
        canShare: isNative || (typeof navigator !== 'undefined' && 'share' in navigator),
        canPickFiles: true, // Both platforms support file picking
        canAccessFilesystem: isNative,
        canRestartApp: true, // Native: exit app, Web: reload page
    };
};

export const canShareFiles = (): boolean => {
    return getCapabilities().canShare;
};

export const canAccessNativeFilesystem = (): boolean => {
    return getCapabilities().canAccessFilesystem;
};
