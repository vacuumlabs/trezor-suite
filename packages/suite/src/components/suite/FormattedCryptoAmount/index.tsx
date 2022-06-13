import React from 'react';
import styled from 'styled-components';
import { HiddenPlaceholder, Sign } from '@suite-components';
import { formatCurrencyAmount } from '@trezor/utils';
import { NetworkSymbol } from '@wallet-types';
import { networkAmountToSatoshi } from '@wallet-utils/accountUtils';
import { isValuePositive, SignValue } from '@suite-components/Sign';
import { useBitcoinAmountUnit } from '@wallet-hooks/useBitcoinAmountUnit';
import { NETWORKS } from '@wallet-config';

const Value = styled.span`
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Symbol = styled.span<{ isLowerCase: boolean }>`
    text-transform: ${({ isLowerCase }) => !isLowerCase && 'uppercase'};
    word-break: initial;
`;

interface FormattedCryptoAmountProps {
    value: string | number;
    symbol: NetworkSymbol | undefined;
    signValue?: SignValue;
    disableHiddenPlaceholder?: boolean;
    isRawString?: boolean;
    'data-test'?: string;
    className?: string;
}

export const FormattedCryptoAmount = ({
    value,
    symbol,
    signValue,
    disableHiddenPlaceholder,
    isRawString,
    'data-test': dataTest,
    className,
}: FormattedCryptoAmountProps) => {
    const { areSatsDisplayed } = useBitcoinAmountUnit();

    const symbolFeatures = NETWORKS.find(network => network.symbol === symbol)?.features;
    const areSatsSupported = !!symbolFeatures?.includes('amount-unit');

    let formattedValue = value;
    const isSatoshis = areSatsSupported && areSatsDisplayed;

    if (isSatoshis) {
        formattedValue = formatCurrencyAmount(
            Number(networkAmountToSatoshi(String(value), symbol as NetworkSymbol)),
        ) as string;
    }

    if (isRawString) {
        return (
            <>
                {`${signValue ? `${isValuePositive(signValue) ? '+' : '-'}` : ''} ${formattedValue}
                ${isSatoshis ? 'sats' : symbol?.toUpperCase()}`}
            </>
        );
    }

    const content = (
        <span className={className}>
            {signValue && <Sign value={signValue} />}

            <Value data-test={dataTest}>{formattedValue}</Value>

            {symbol && (
                <Symbol isLowerCase={isSatoshis}>&nbsp;{isSatoshis ? 'sats' : symbol}</Symbol>
            )}
        </span>
    );

    if (disableHiddenPlaceholder) {
        return content;
    }

    return <HiddenPlaceholder className={className}>{content}</HiddenPlaceholder>;
};
