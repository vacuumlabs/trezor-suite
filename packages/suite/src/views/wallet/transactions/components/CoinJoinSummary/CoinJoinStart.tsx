import React from 'react';
import styled from 'styled-components';
import { Card, P, Button, variables } from '@trezor/components';
import { CoinBalance } from '@wallet-components';
import type { Account } from '@wallet-types';

const StatusCard = styled(Card)`
    flex: 2;
    margin-left: 24px;
`;

const Wrapper = styled.div`
    display: flex;
    flex-direction: row;
`;

const Left = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    padding-right: 24px;
`;

const Right = styled(Card)`
    flex: 2;
    border: 1px solid ${props => props.theme.STROKE_GREY};
    color: ${props => props.theme.TYPE_LIGHT_GREY};
    font-size: ${variables.FONT_SIZE.SMALL};
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

const Divider = styled.div`
    width: 100%;
    height: 1px;
    background: ${props => props.theme.STROKE_GREY};
    margin: 24px 0px;
`;

interface Props {
    account: Account;
    onContinue: () => any;
}

export const CoinJoinStart = ({ account, onContinue }: Props) => (
    <StatusCard>
        <Wrapper>
            <Left>
                <P>Anonymize non-private coins</P>
                <Button onClick={onContinue} icon="ARROW_RIGHT_LONG" alignIcon="right">
                    Continue
                </Button>
            </Left>
            <Right>
                <Row>
                    Not private:{' '}
                    <CoinBalance value={account.formattedBalance} symbol={account.symbol} />
                </Row>
                <Row>
                    Fees (5%) <CoinBalance value="-0.0002" symbol={account.symbol} />
                </Row>
                <Divider />
                <Row>
                    After CoinJoin{' '}
                    <CoinBalance value={account.formattedBalance} symbol={account.symbol} />
                </Row>
            </Right>
        </Wrapper>
    </StatusCard>
);
