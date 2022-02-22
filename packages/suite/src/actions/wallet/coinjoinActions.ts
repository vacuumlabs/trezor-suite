import TrezorConnect, { AccountUtxo } from 'trezor-connect';
import { CoinjoinClient, Alice, Round, RequestEvent } from '@trezor/coinjoin';

import { COINJOIN } from './constants';
import { addToast } from '@suite-actions/notificationActions';
import type { Dispatch, GetState } from '@suite-types';
// import type { Round, Alice } from '@wallet-types/coinjoin';

export type CoinJoinAction =
    | {
          type: typeof COINJOIN.ENABLE | typeof COINJOIN.DISABLE;
          payload: {
              key: string;
              status: any;
          };
      }
    | {
          type: typeof COINJOIN.UPDATE_STATUS;
          payload: Round[];
      }
    | {
          type: typeof COINJOIN.TRY_REGISTER_INPUT;
          payload: any;
      }
    | {
          type: typeof COINJOIN.TRY_REGISTER_OUTPUT;
          payload: any;
      }
    | {
          type: typeof COINJOIN.TRY_SIGN_TX;
          payload: any;
      }
    | {
          type:
              | typeof COINJOIN.INPUT_CONFIRMED
              | typeof COINJOIN.OUTPUT_CONFIRMED
              | typeof COINJOIN.TX_SIGNED;
          payload: any;
      }
    | {
          type: typeof COINJOIN.REGISTER_INPUT;
          payload: Alice;
      }
    | {
          type: typeof COINJOIN.UNREGISTER_INPUT;
          payload: Alice;
      }
    | {
          type: typeof COINJOIN.CONNECTION_CONFIRMATION;
          payload: Alice;
      };

const getOwnershipProof = async (request: Extract<RequestEvent, { type: 'ownership' }>) => {
    const bundle = request.inputs.map(i => ({
        path: i.path,
        coin: 'regtest', // TODO
        userConfirmation: true,
        commitmentData: request.commitmentData,
        preauthorized: true,
    }));
    const proof = await TrezorConnect.getOwnershipProof({
        // device,
        bundle,
    });
    if (proof.success) {
        return {
            ...request,
            inputs: request.inputs.map((input, index) => ({
                ...input,
                ownershipProof: proof.payload[index].ownership_proof,
            })),
        };
    }
    return request;
};

const signCoinjoinTx = async (request: Extract<RequestEvent, { type: 'witness' }>) => {
    const signTx = await TrezorConnect.signTransaction({
        // device,
        inputs: request.inputs.map(i => ({
            ...i,
            amount: i.amount.toString(),
        })),
        outputs: request.outputs.map(i => ({
            ...i,
            amount: i.amount.toString(),
        })),
        paymentRequests: [request.paymentRequest],
        coin: 'regtest', // TODO
        preauthorized: true,
    });
    if (signTx.success) {
        return {
            ...request,
            inputs: request.inputs.map((i, index) => ({
                ...i,
                witness: signTx.payload.witnesses[index],
                witnessIndex: index,
            })),
        };
    }
    return request;
};

export const enable = () => async (dispatch: Dispatch, getState: GetState) => {
    const { coinjoin } = getState().wallet;
    const { account } = getState().wallet.selectedAccount;
    if (coinjoin.enabled || !account) return;

    try {
        CoinjoinClient.enable({
            network: 'regtest',
            // network: account.symbol,
            coordinator: 'CoinJoinCoordinatorIdentifier',
            onStatus: event => {
                console.log('CoinjoinStatus', event);
                dispatch({
                    type: COINJOIN.UPDATE_STATUS,
                    payload: event.rounds,
                });
            },
            onEvent: data => {
                console.log('CoinjoinEvent', data);
                if (data.type === 'update-inputs') {
                    data.inputs.forEach(i => {
                        if (i) {
                            // TOdO: should never be undefined
                            dispatch({
                                type: COINJOIN.REGISTER_INPUT,
                                payload: i,
                            });
                        }
                    });
                }
            },
            onRequest: (data: RequestEvent[]) =>
                Promise.all(
                    data.map(request => {
                        if (request.type === 'ownership') {
                            return getOwnershipProof(request);
                        }
                        if (request.type === 'witness') {
                            return signCoinjoinTx(request);
                        }
                        return request;
                    }),
                ),
        });
    } catch (error) {
        console.warn('===>CoinjoinError', error);
        dispatch(addToast({ type: 'coinjoin-error', error: error.message }));
        return;
    }

    // const maxCoordinatorFeeRate =
    //     client.status.rounds.reduce((f, r) => Math.max(f, r.coordinationFeeRate.rate), 0) *
    //     100000000 *
    //     1.5;

    // TODO: check if already authorized, some status fetch to trezor? fetch ownership for round 0?
    // TODO: real params from UI
    const auth = await TrezorConnect.authorizeCoinJoin({
        // device,
        path: account.path,
        maxRounds: 3, // desired anonim calc, from UI
        maxCoordinatorFeeRate: 50000000, // constant, from coordinator status
        // maxCoordinatorFeeRate, // constant, from coordinator status
        maxFeePerKvbyte: 200000, // from UI
        coordinator: 'CoinJoinCoordinatorIdentifier',
        coin: account.symbol,
    });

    if (!auth.success) {
        dispatch(addToast({ type: 'coinjoin-error', error: auth.payload.error }));
        return;
    }

    CoinjoinClient.registerAccount({
        ...account,
        network: 'regtest',
        maxRounds: 3, // desired anonim calc, from UI
        maxCoordinatorFeeRate: 50000000, // constant, from coordinator status
        maxFeePerKvbyte: 200000, // from UI
    });

    dispatch({
        type: COINJOIN.ENABLE,
        payload: {
            key: account.key,
            path: account.path,
            // status: client.status.rounds,
        },
    });
};

// TODO: disable should be called on extra events like: disconnect device, offline, sleep etc.
export const disable = () => (dispatch: Dispatch, getState: GetState) => {
    const { coinjoin } = getState().wallet;
    if (!coinjoin.enabled) return; // already disabled

    // TODO: unregister all registered output
    CoinjoinClient.disable('regtest');
    dispatch({
        type: COINJOIN.DISABLE,
    });
};

export const unregisterInput = (payload: Alice) => () => {
    CoinjoinClient.removeInput({ network: 'regrest', ...payload });
};

export const registerInput = (utxo: AccountUtxo) => (_dispatch: Dispatch, getState: GetState) => {
    const {
        coinjoin,
        selectedAccount: { account },
    } = getState().wallet;
    if (!coinjoin.enabled || !account) return;

    console.warn('REGISTAAAAAAAAAAAA');

    CoinjoinClient.addInput({
        network: 'regtest',
        type: account.accountType,
        vin: utxo,
        addresses: account.addresses!.change.filter(a => !a.transfers),
    });
};
