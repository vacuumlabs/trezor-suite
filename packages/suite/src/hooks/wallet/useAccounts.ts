import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'src/hooks/suite';
import type { AccountAddress, AccountUtxo } from '@trezor/connect';
import * as accountUtils from '@suite-common/wallet-utils';
import type { Account, Discovery } from 'src/types/wallet';
import { useEnabledNetworks } from '../settings/useEnabledNetworks';

export const useAccounts = (discovery?: Discovery) => {
    const [accounts, setAccounts] = useState<Account[]>([]);

    const device = useSelector(state => state.suite.device);
    const accountsState = useSelector(state => state.wallet.accounts);

    // TODO(VL) remove this when we add Solana accounts properly
    const { enabledNetworks } = useEnabledNetworks();

    useEffect(() => {
        if (device) {
            const deviceAccounts = accountUtils.getAllAccounts(device.state, accountsState);
            const failedAccounts = discovery ? accountUtils.getFailedAccounts(discovery) : [];
            const sortedAccounts = accountUtils.sortByCoin(deviceAccounts.concat(failedAccounts));
            // TODO(VL) remove this when we add Solana accounts properly
            const mockSolanaAccount: Account = {
                deviceState: 'mppfZsE4ine4g2hcjuiAehPKANsS3zZ2ms@D32A733A1632F3457D42E393:0',
                index: 0,
                path: "m/84'/0'/0'",
                descriptor:
                    'zpub6qy39U3XHtW4hyk3JXs5UjThu1JAuJjAStCm8nPr9Bb13yX8nJNfX8hiQr56NC4CGnHfvzkiaaFZ7NRsoaUqYZRhkeCyjJM2qRz7ibDiRGh',
                key: 'zpub6qy39U3XHtW4hyk3JXs5UjThu1JAuJjAStCm8nPr9Bb13yX8nJNfX8hiQr56NC4CGnHfvzkiaaFZ7NRsoaUqYZRhkeCyjJM2qRz7ibDiRGh-btc-mppfZsE4ine4g2hcjuiAehPKANsS3zZ2ms@D32A733A1632F3457D42E393:0',
                accountType: 'normal' as const,
                symbol: 'sol' as const,
                empty: true,
                visible: true,
                balance: '0',
                availableBalance: '0',
                formattedBalance: '0',
                tokens: [],
                backendType: undefined,
                misc: undefined,
                marker: undefined,
                addresses: {
                    change: [],
                    used: [],
                    unused: [],
                },
                utxo: [] as AccountUtxo[],
                history: {
                    total: 0,
                    unconfirmed: 0,
                },
                metadata: {
                    key: 'xpub6CJWY8hgzXR71PModpHq4ZGhZ51H24kAcfAKZzc5PAqEwmtgGz3YH1PSNS9vNNkMTW44S3ZbfFYTLoCkNBeox64W1xp8ZUi4HyrpwQfrP4N',
                },
                networkType: 'solana',
                page: {
                    index: 1,
                    size: 25,
                    total: 1,
                },
            };

            if (enabledNetworks.includes('sol')) {
                sortedAccounts.push(mockSolanaAccount);
            }

            setAccounts(sortedAccounts);
        }
    }, [
        device,
        discovery,
        accountsState,
        enabledNetworks /* TODO(VL): remove this dependency, lint fix */,
    ]);

    return {
        accounts,
    };
};

export const useFastAccounts = () => {
    const device = useSelector(state => state.suite.device);
    const accounts = useSelector(state => state.wallet.accounts);

    const deviceAccounts = useMemo(
        () => (device ? accountUtils.getAllAccounts(device.state, accounts) : []),
        [accounts, device],
    );
    return deviceAccounts;
};

export const useAccountAddressDictionary = (account: Account | undefined) =>
    useMemo(() => {
        switch (account?.networkType) {
            case 'cardano':
            case 'bitcoin': {
                return (account?.addresses?.unused ?? [])
                    .concat(account?.addresses?.used ?? [])
                    .reduce((previous, current) => {
                        previous[current.address] = current;
                        return previous;
                    }, {} as { [address: string]: AccountAddress });
            }
            case 'ripple':
            case 'ethereum': {
                return {
                    [account.descriptor]: {
                        address: account.descriptor,
                        path: account.path,
                    },
                };
            }
            default:
                return {};
        }
    }, [
        account?.addresses?.unused,
        account?.addresses?.used,
        account?.descriptor,
        account?.networkType,
        account?.path,
    ]);
