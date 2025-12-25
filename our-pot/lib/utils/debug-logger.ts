// Simple debug log storage
const MAX_LOGS = 200;
const debugLogs: Array<{ timestamp: string; type: string; message: string }> = [];

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Flag to prevent infinite loops
let isLogging = false;

// Override console methods to capture logs
console.log = (...args: any[]) => {
    if (!isLogging) {
        isLogging = true;
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        debugLogs.push({
            timestamp: new Date().toISOString(),
            type: 'log',
            message
        });

        // Keep only last MAX_LOGS entries
        if (debugLogs.length > MAX_LOGS) {
            debugLogs.shift();
        }
        isLogging = false;
    }
    originalConsoleLog.apply(console, args);
};

console.error = (...args: any[]) => {
    if (!isLogging) {
        isLogging = true;
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        debugLogs.push({
            timestamp: new Date().toISOString(),
            type: 'error',
            message
        });

        if (debugLogs.length > MAX_LOGS) {
            debugLogs.shift();
        }
        isLogging = false;
    }
    originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
    if (!isLogging) {
        isLogging = true;
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        debugLogs.push({
            timestamp: new Date().toISOString(),
            type: 'warn',
            message
        });

        if (debugLogs.length > MAX_LOGS) {
            debugLogs.shift();
        }
        isLogging = false;
    }
    originalConsoleWarn.apply(console, args);
};

export function getDebugLogs() {
    return [...debugLogs];
}

export function clearDebugLogs() {
    debugLogs.length = 0;
}
