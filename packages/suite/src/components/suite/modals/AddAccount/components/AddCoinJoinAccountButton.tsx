import React from 'react';
import { Button, Tooltip } from '@trezor/components';
import { Translation } from '@suite-components';
import { createCoinJoinAccount } from '@wallet-actions/coinjoinActions';
import { useSelector, useActions } from '@suite-hooks';
import type { Network } from '@wallet-types';

interface Props {
    network: Network;
}

export const AddCoinJoinAccountButton = ({ network }: Props) => {
    const action = useActions({
        createCoinJoinAccount,
    });

    const { device, accounts } = useSelector(state => ({
        device: state.suite.device,
        accounts: state.wallet.accounts,
        debug: state.suite.settings.debug,
        enabledNetworks: state.wallet.settings.enabledNetworks,
    }));

    const coinjoinAccounts = accounts.filter(
        a =>
            a.deviceState === device?.state &&
            a.symbol === network.symbol &&
            a.accountType === network.accountType,
    );

    // TODO: disabled button (account already exists, no capability...)

    const isDisabled = coinjoinAccounts.length > 0;
    return (
        <Tooltip maxWidth={285} content={null}>
            <Button
                icon="PLUS"
                variant="primary"
                isDisabled={isDisabled}
                onClick={() => action.createCoinJoinAccount(network)}
            >
                <Translation id="TR_ADD_ACCOUNT" />
            </Button>
        </Tooltip>
    );
};
