import React from 'react';
import styled, { css } from 'styled-components';
import { Tooltip, variables } from '@trezor/components';
import { useBitcoinAmountUnit } from '@wallet-hooks/useBitcoinAmountUnit';
import { NetworkSymbol } from '@wallet-types';
import { Translation } from './Translation';

const SatoshisTag = styled.div`
    position: absolute;
    left: calc(100% + 8px);
    display: flex;
    height: 14px;
    color: ${({ theme }) => theme.TYPE_LIGHT_GREY};
    font-size: ${variables.FONT_SIZE.SMALL};
    font-weight: ${variables.FONT_WEIGHT.MEDIUM};
    opacity: 0;
    white-space: nowrap;
    transition: opacity 0.1s ease-in;
    pointer-events: none;

    div {
        margin-left: 2px;
        padding-top: 1px;
    }
`;

const Container = styled.div<{ isHoverable?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin: -2px 0 0 -12px;
    padding: 2px 12px;
    border-radius: 6px;
    transition: background 0.1s ease-in;

    ${({ isHoverable }) =>
        isHoverable &&
        css`
            cursor: pointer;

            ${variables.MEDIA_QUERY.HOVER} {
                :hover {
                    background: ${({ theme }) => theme.BG_GREY};

                    ${SatoshisTag} {
                        opacity: 1;
                    }
                }
            }
        `}
`;

interface AmountUnitSwitchWrapperProps {
    symbol?: NetworkSymbol;
    isActive?: boolean;
    children: React.ReactNode;
}

export const AmountUnitSwitchWrapper = ({
    symbol,
    isActive,
    children,
}: AmountUnitSwitchWrapperProps) => {
    const { areSatsDisplayed, toggleBitcoinAmountUnits, isSupportedByCurrentNetwork } =
        useBitcoinAmountUnit();

    const isEnabled = isActive || isSupportedByCurrentNetwork;

    return (
        <Tooltip
            disabled={!isEnabled}
            cursor="default"
            maxWidth={200}
            delay={[1200, 0]}
            placement="bottom"
            interactive={false}
            hideOnClick={false}
            content={<Translation id={areSatsDisplayed ? 'TR_TO_BTC' : 'TR_TO_SATOSHIS'} />}
        >
            <Container
                isHoverable={isEnabled}
                onClick={() => isEnabled && toggleBitcoinAmountUnits()}
                data-test={symbol ? `amount-unit-switch/${symbol}` : 'amount-unit-switch'}
            >
                {children}
            </Container>
        </Tooltip>
    );
};
