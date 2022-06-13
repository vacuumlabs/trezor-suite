import { formatCurrencyAmount } from '../src';

describe('formatCurrencyAmount', () => {
    it('formats with default locale', () => {
        const formattedValue = formatCurrencyAmount(123456789);

        expect(formattedValue).toStrictEqual('123,456,789');
    });

    it('formats with cs locale', () => {
        const formattedValue = formatCurrencyAmount(123456789, 'cs');

        expect(formattedValue).toStrictEqual('123 456 789');
    });

    it('fails with wrong values', () => {
        expect(formatCurrencyAmount(NaN)).toBeNull();
        expect(formatCurrencyAmount(Infinity)).toBeNull();
        expect(formatCurrencyAmount(Number.MIN_SAFE_INTEGER + 1)).toBeNull();
        // @ts-expect-error invalid arg
        expect(formatCurrencyAmount('asadff')).toBeNull();
    });
});
