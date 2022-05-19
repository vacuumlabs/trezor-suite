import TrezorConnect from '@trezor/connect';
import * as COINJOIN from './constants/coinjoinConstants';
import { goto } from '../suite/routerActions';
import { addToast } from '../suite/notificationActions';
import { add as addTransaction } from './transactionActions';
import {
    create as createAccount,
    update as updateAccountInfo,
    updateAccount,
} from './accountActions';
import type { Dispatch, GetState } from '@suite-types';
import type { Account, Network } from '@wallet-types';

export type CoinJoinAction =
    | {
          type: typeof COINJOIN.LOAD;
          payload: {
              key: string;
              proof: string;
          };
      }
    | {
          type: typeof COINJOIN.ENABLE;
          payload: {
              key: string;
              deviceState: string;
          };
      };

export const createCoinJoinAccount =
    (network: Network) => async (dispatch: Dispatch, getState: GetState) => {
        if (network.accountType !== 'coinjoin') return;
        const { device } = getState().suite;

        // Disable safety_checks until Trezor FW will implement slip-0025
        // const safety =
        //     device?.features?.safety_checks !== 'PromptTemporarily'
        //         ? 'PromptTemporarily'
        //         : undefined;
        const exp = await TrezorConnect.applySettings({
            device,
            experimental_features: true,
            // safety_checks: safety,
        });
        if (!exp.success) {
            dispatch(addToast({ type: 'error', error: 'Experimental features not enabled' }));
            return;
        }

        const PATH = `m/86'/1'/21'`; // `m/10025'/1'/0'`  network.bip43Path

        // Get coinjoin account xpub
        const pk = await TrezorConnect.getPublicKey({
            device,
            useEmptyPassphrase: device?.useEmptyPassphrase,
            path: PATH,
            coin: network.symbol,
        });
        if (!pk.success) {
            dispatch(addToast({ type: 'error', error: 'Public key not given' }));
            return;
        }

        let account: Account;

        // Create empty account
        account = dispatch(
            createAccount(
                device!.state!,
                {
                    index: 0,
                    path: PATH,
                    accountType: network.accountType,
                    networkType: network.networkType,
                    coin: network.symbol,
                    derivationType: 0,
                },
                {
                    addresses: { change: [], used: [], unused: [] },
                    availableBalance: '0',
                    balance: '0',
                    descriptor: pk.payload.xpubSegwit || pk.payload.xpub,
                    empty: true,
                    history: { total: 0, tokens: undefined, unconfirmed: 0 },
                    legacyXpub: pk.payload.xpub,
                    page: { index: 1, size: 25, total: 1 },
                    utxo: [],
                },
            ),
        ).payload;

        // Make account visible and set "loading" flag
        account = dispatch(updateAccount({ ...account, visible: true, loading: 0 })).payload;

        // Switch to account
        dispatch(
            goto('wallet-index', {
                params: {
                    symbol: network.symbol,
                    accountType: network.accountType,
                    accountIndex: 0,
                },
            }),
        );

        const accountInfo = await TrezorConnect.getAccountInfo({
            descriptor: pk.payload.xpubSegwit || pk.payload.xpub,
            coin: network.symbol,
            details: 'txs',
        });

        if (!accountInfo.success) {
            console.log('No accountInfo');
            return;
        }

        // Temporary simulate account discovery by block filters
        let i = 0;
        const tick = () => {
            i += 10;
            if (i < 100) {
                account = dispatch(updateAccount({ ...account, loading: i })).payload;
                setTimeout(tick, 1000);
            } else {
                // Finish loading
                dispatch(
                    updateAccountInfo({ ...account, loading: undefined }, accountInfo.payload),
                );
                if (accountInfo.payload.history.transactions) {
                    dispatch(addTransaction(accountInfo.payload.history.transactions, account));
                }
            }
        };
        setTimeout(tick, 1000);
    };

export const enableCoinJoin =
    (account: Account) => async (dispatch: Dispatch, getState: GetState) => {
        if (account.accountType !== 'coinjoin') return;
        const { device } = getState().suite;

        const auth = await TrezorConnect.authorizeCoinJoin({
            device,
            path: account.path,
            maxRounds: 3, // desired anonim calc, from UI
            maxCoordinatorFeeRate: 50000000, // constant, from coordinator status
            maxFeePerKvbyte: 200000, // from UI
            coordinator: 'CoinJoinCoordinatorIdentifier',
            coin: account.symbol,
        });
        if (!auth.success) {
            dispatch(addToast({ type: 'error', error: 'Coinjoin not authorized' }));
            return;
        }

        dispatch({
            type: COINJOIN.ENABLE,
            payload: {
                deviceState: account.deviceState,
                key: account.key,
            },
        });
    };
