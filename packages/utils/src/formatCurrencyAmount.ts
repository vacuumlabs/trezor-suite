export const formatCurrencyAmount = (amount: number, locale = 'en') => {
    if (
        typeof amount !== 'number' ||
        Number.isNaN(amount) ||
        !Number.isFinite(amount) ||
        amount > Number.MAX_SAFE_INTEGER
    ) {
        return;
    }

    return Intl.NumberFormat(locale, { style: 'decimal' }).format(amount);
};
