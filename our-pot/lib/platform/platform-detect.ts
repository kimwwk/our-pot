import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

export const getPlatform = (): Platform => {
    return Capacitor.getPlatform() as Platform;
};

export const isNative = (): boolean => {
    return Capacitor.isNativePlatform();
};

export const isWeb = (): boolean => {
    return getPlatform() === 'web';
};
