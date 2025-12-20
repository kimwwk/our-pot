export function formatCurrency(amountInCents: number, currency: string = 'GBP'): string {
    // Convert cents to decimal
    const amount = amountInCents / 100;

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function parseCurrency(displayAmount: string): number {
    // Remove non-numeric chars except dot and minus
    const clean = displayAmount.replace(/[^0-9.-]/g, '');
    const decimal = parseFloat(clean);
    if (isNaN(decimal)) return 0;
    // Round to nearest int
    return Math.round(decimal * 100);
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

export function formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
