import React from 'react';
import styled from 'styled-components';
import { Card, H3 } from '@trezor/components';
import { CoinJoinStatusDetail } from './CoinJoinStatusDetail';
import type { Account } from '@wallet-types';

const Wrapper = styled(Card)`
    width: 100%;
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

const Row = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

interface Props {
    account: Account;
}

export const CoinJoinStatus = ({ account }: Props) => (
    <Wrapper>
        <Left>
            <H3>Running coinjoin</H3>
            <Row>0.00012345 {account.symbol.toUpperCase()} left</Row>
            <Row>0 of 8 rounds done</Row>
        </Left>
        <CoinJoinStatusDetail
            account={account}
            anonLevel={80}
            rounds={8}
            fee={3}
            coordinatorFee="0.05%"
        />
    </Wrapper>
);
