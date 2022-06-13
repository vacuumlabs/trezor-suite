import React from 'react';
import styled from 'styled-components';
import { H3, SelectBar, variables } from '@trezor/components';
import { useBitcoinAmountUnit } from '@wallet-hooks/useBitcoinAmountUnit';
import { Translation } from '@suite-components/Translation';
import { PROTO } from 'packages/connect/lib';

const StyledSelectBar = styled(SelectBar)`
    margin-bottom: 28px;

    ${variables.SCREEN_QUERY.MOBILE} {
        margin-top: 10px;
    }
`;

export const BitcoinAmountUnit = () => {
    const { bitcoinAmountUnit, setBitcoinAmountUnits, UNIT_OPTIONS } = useBitcoinAmountUnit();

    return (
        <StyledSelectBar
            label={
                <H3>
                    <Translation id="TR_BTC_UNITS" />
                </H3>
            }
            options={UNIT_OPTIONS}
            selectedOption={bitcoinAmountUnit}
            onChange={value => setBitcoinAmountUnits(value as PROTO.AmountUnit)}
            isInLine={false}
        />
    );
};
