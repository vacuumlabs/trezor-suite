import React from 'react';
import styled from 'styled-components';
import { Card, variables } from '@trezor/components';
import { CoinBalance } from '@wallet-components';
import type { Account } from '@wallet-types';

const Wrapper = styled(Card)`
    border: 1px solid ${props => props.theme.STROKE_GREY};
    color: ${props => props.theme.TYPE_LIGHT_GREY};
    font-size: ${variables.FONT_SIZE.SMALL};
`;

const Cell = styled(Card)`
    flex: 1;
    background: ${props => props.theme.BG_LIGHT_GREY};
    color: ${props => props.theme.TYPE_WHITE};
    margin-right: 10px;
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
    anonLevel: number;
    rounds: number;
    fee: number;
    coordinatorFee: string;
}

export const CoinJoinStatusDetail = ({
    account,
    anonLevel,
    rounds,
    fee,
    coordinatorFee,
}: Props) => (
    <Wrapper>
        <Row>
            <Cell>
                Amount: <CoinBalance value={account.formattedBalance} symbol={account.symbol} />
            </Cell>
            <Cell>Anonymity level: {anonLevel}</Cell>
        </Row>
        <Row>
            Max rounds: <span>{rounds}</span>
        </Row>
        <Row>
            Max mining fee: <span>{fee} sat/vbyte</span>
        </Row>
        <Divider />
        <Row>
            Coordinator fee per round: <span>{coordinatorFee}</span>
        </Row>
    </Wrapper>
);
