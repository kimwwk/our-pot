import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

export const getPlatform = (): Platform => {
    return Capacitor.getPlatform() as Platform;
};

export const getPlatformName = (): string => {
    return Capacitor.getPlatform();
};

export const isNative = (): boolean => {
    return Capacitor.isNativePlatform();
};

export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

export const isWeb = (): boolean => {
    return getPlatform() === 'web';
};

export const isWebPlatform = (): boolean => {
    return getPlatform() === 'web';
};
