import React from 'react';
import styled from 'styled-components';
import { useSelector } from '@suite-hooks';
import { CoinJoinStatus } from './CoinJoinStatus';
import { CoinJoinSetup } from './CoinJoinSetup';
import type { Account } from '@wallet-types';

const Wrapper = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    margin-bottom: 24px;
`;

interface Props {
    account: Account;
}

export const CoinJoinSummary = ({ account }: Props) => {
    const isEnabled = useSelector(state =>
        state.wallet.coinjoin.accounts.find(key => key === account.key),
    );

    return (
        <Wrapper>
            {isEnabled ? <CoinJoinStatus account={account} /> : <CoinJoinSetup account={account} />}
        </Wrapper>
    );
};
