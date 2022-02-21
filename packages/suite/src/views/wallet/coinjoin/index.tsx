import React from 'react';
import { WalletLayout } from '@wallet-components';
import { useSelector } from '@suite-hooks';
import Status from './Status';
import InputRegistration from './InputRegistration';
import Faucet from './Faucet';
import { useCoinJoin, CoinJoinContext } from '@wallet-hooks/useCoinJoinForm';

const CoinJoin = () => {
    const selectedAccount = useSelector(state => state.wallet.selectedAccount);
    const sendContextValues = useCoinJoin({});

    if (!sendContextValues.account) {
        return <WalletLayout title="TR_ACCOUNT_DETAILS_HEADER" account={selectedAccount} />;
    }

    return (
        <WalletLayout
            title="TR_ACCOUNT_DETAILS_HEADER"
            account={selectedAccount}
            showEmptyHeaderPlaceholder
        >
            <CoinJoinContext.Provider value={sendContextValues}>
                <Status />
                <InputRegistration />
                <Faucet />
            </CoinJoinContext.Provider>
        </WalletLayout>
    );
};

export default CoinJoin;
