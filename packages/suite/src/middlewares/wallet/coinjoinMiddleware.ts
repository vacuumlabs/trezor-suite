import type { MiddlewareAPI } from 'redux';
import TrezorConnect from 'trezor-connect';
import { CoinjoinClient } from '@trezor/coinjoin';
import { COINJOIN } from '@wallet-actions/constants';
// import * as coinjoinActions from '@wallet-actions/coinjoinActions';
import type { AppState, Action, Dispatch } from '@suite-types';

// const client = new WabiSabiClient();

const coinjoinMiddleware =
    (api: MiddlewareAPI<Dispatch, AppState>) =>
    (next: Dispatch) =>
    async (action: Action): Promise<Action> => {
        // propagate action to reducers
        next(action);

        if (action.type === 'COINJOIN.ENABLE-2') {
            const client = await CoinjoinClient.enable();
            api.dispatch({
                type: COINJOIN.UPDATE_STATUS,
                payload: client.status.rounds,
            });

            client.on('debug', console.warn);

            client.on('request', async data => {
                console.warn('handle request in suite', data);
                const responses = await Promise.all(
                    data.map(async request => {
                        if (request.event === 'ownership') {
                            console.warn(request.event, request.inputs);

                            const bundle = request.inputs.map(i => ({
                                path: i.path,
                                coin: 'regtest',
                                userConfirmation: true,
                                commitmentData: request.commitmentData,
                                preauthorized: true,
                            }));

                            console.warn('Get proof', request, bundle);
                            // @ts-ignore
                            const proof = await TrezorConnect.getOwnershipProof({
                                bundle,
                                // path: utxo.path,
                                // // coin: account.symbol,
                                // coin: 'regtest',
                                // userConfirmation: true,
                                // commitmentData: event.commitmentData,
                                // preauthorized: true,
                            });
                            console.warn('PROOF', proof);
                            if (proof.success) {
                                // dispatch(
                                //     addToast({ type: 'discovery-error', error: proof.payload.error }),
                                // );
                                return {
                                    ...request,
                                    inputs: request.inputs.map((input, index) => ({
                                        ...input,
                                        ownershipProof: proof.payload[index].ownership_proof,
                                    })),
                                };
                            }

                            // proof.payload.ownership_proof
                            // CoinjoinClient.addOwnershipProof({
                            //     ...event,
                            //     inputs: event.inputs.map((input, index) => ({
                            //         ...input,
                            //         ownershipProof: proof.payload[index].ownership_proof,
                            //     })),
                            // });
                        }
                        if (request.event === 'witness') {
                            console.warn(request.event, request.payload);

                            const signTx = await TrezorConnect.signTransaction({
                                inputs: request.inputs.map(i => ({
                                    ...i,
                                    amount: i.amount.toString(),
                                })),
                                outputs: request.outputs.map(i => ({
                                    ...i,
                                    amount: i.amount.toString(),
                                })),
                                paymentRequests: [request.paymentRequest],
                                coin: 'regtest',
                                // coin: account.symbol,
                                preauthorized: true,
                            });
                            console.warn('SIGNTX', signTx, request);
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
                        }

                        return request;
                    }),
                );

                console.warn('----> sending reponse', responses);

                CoinjoinClient.addOwnershipProof(responses);
            });

            client.on('request-ownership-proof', async event => {});

            client.on('status', event => {
                api.dispatch({
                    type: COINJOIN.UPDATE_STATUS,
                    payload: event.rounds,
                });
            });
        }

        // if (action.type === COINJOIN.DISABLE) {
        //     CoinjoinClient.disable();
        // }

        // Legacy code
        // if (COINJOIN.UPDATE_STATUS) {
        //     api.dispatch(coinjoinActions.onStatusUpdate(action.payload));
        // }

        return action;
    };

export default coinjoinMiddleware;
