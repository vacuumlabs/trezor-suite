import TrezorConnect, { AccountUtxo } from 'trezor-connect';
import { COINJOIN } from './constants';
import { addToast } from '@suite-actions/notificationActions';
import { payments, networks } from '@trezor/utxo-lib'; // TODO: in connect getOwnerShipProof
import * as wabisabi from '@suite/services/wabisabi';
import type { Dispatch, GetState } from '@suite-types';
import type { Round, Alice } from '@wallet-types/coinjoin';

export type CoinJoinAction =
    | {
          type: typeof COINJOIN.ENABLE | typeof COINJOIN.DISABLE;
          payload: {
              key: string;
              proof: string;
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

export const onStatusUpdate =
    (status: Round[] | null) => (dispatch: Dispatch, getState: GetState) => {
        const { coinjoin } = getState().wallet;
        if (!status) return;
        // Check if pending round did change
        const pending = coinjoin.rounds.filter(alice => alice.pendingPhase);
        // console.warn('PENDING', pending);
        const promises = pending.flatMap(alice => {
            const current = status.find(s => s.id === alice.roundId);
            // console.warn('CURRENT', current);
            if (current && current.phase >= alice.pendingPhase) {
                if (current.phase > alice.pendingPhase) {
                    console.warn('---> ERROR: unsynced');
                } else if (alice.pendingPhase === wabisabi.Phase.ConnectionConfirmation) {
                    return dispatch({
                        type: COINJOIN.CONNECTION_CONFIRMATION,
                        payload: {
                            ...alice,
                            pendingPhase: wabisabi.Phase.OutputRegistration,
                        },
                    });
                } else if (alice.pendingPhase === wabisabi.Phase.OutputRegistration) {
                    console.warn('OWNERS', current.coinjoinState.ownershipProofs);
                    return dispatch(registerOutputs(alice, current.coinjoinState.ownershipProofs));
                } else if (alice.pendingPhase === wabisabi.Phase.TransactionSigning) {
                    console.warn('SIGNING PHASE!!!!!');
                    return dispatch(sign(alice));
                } else if (alice.pendingPhase === wabisabi.Phase.Ended) {
                    console.warn('END!!!!!');
                }
            }
            return [];
        });
        Promise.all(promises);
    };

export const enable = () => async (dispatch: Dispatch, getState: GetState) => {
    const { coinjoin } = getState().wallet;
    const { account } = getState().wallet.selectedAccount;
    if (coinjoin.enabled || !account) return;

    // TODO: check if already enabled, some status fetch to trezor? fetch ownership for round 0
    // TODO: real params patch
    // @ts-ignore
    const auth = await TrezorConnect.authorizeCoinJoin({
        path: account.path,
        maxRounds: 3,
        maxCoordinatorFeeRate: 50000000,
        maxFeePerKvbyte: 200000,
        // maxTotalFee: 200000000, // 1516770
        // max_total_fee: 500000, // 1516770
        // fee_per_anonymity: 2516770,
        // feePerAnonymity: 600000000,
        coordinator: 'CoinJoinCoordinatorIdentifier',
        coin: account.symbol,
    });

    if (!auth.success) {
        dispatch(addToast({ type: 'discovery-error', error: auth.payload.error }));
        return;
    }

    // @ts-ignore
    // const proof = await TrezorConnect.getOwnershipProof({
    //     path: `${account.path}/0/0`,
    //     coin_name: account.symbol,
    //     user_confirmation: false,
    //     commitment_data: Buffer.concat([
    //         Buffer.from('CoinJoinCoordinatorIdentifier'),
    //         Buffer.from('00'),
    //     ]).toString('hex'),
    // });

    dispatch({
        type: COINJOIN.ENABLE,
        payload: {
            key: account.key,
            proof: 'proof.payload.ownership_proof',
        },
    });
};

// TODO: disable should be called on extra events like: disconnect device etc.
export const disable = () => (dispatch: Dispatch, getState: GetState) => {
    const { coinjoin } = getState().wallet;
    if (!coinjoin.enabled) return; // already disabled

    // TODO: unregister all registered output

    dispatch({
        type: COINJOIN.DISABLE,
    });
};

export const unregisterInput = (payload: Alice) => async (dispatch: Dispatch) => {
    try {
        await wabisabi.post(
            'input-unregistration',
            {
                roundId: payload.roundId,
                aliceId: payload.aliceId,
            },
            false,
        );

        dispatch({
            type: COINJOIN.UNREGISTER_INPUT,
            payload,
        });
    } catch (e) {
        //
    }
};

// const SIZE = {
//     normal: { input: 68, output: 31 },
//     taproot: { input: 59, output: 43 },
// };

// const INPUT_SIZE = 59; // bech32 69, mozna 68;
// const OUTPUT_SIZE = 34; // 43; // bech32 31

export const registerInput =
    (utxo: AccountUtxo) => async (dispatch: Dispatch, getState: GetState) => {
        const {
            coinjoin,
            selectedAccount: { account },
        } = getState().wallet;
        if (!coinjoin.enabled || !account) return; // already disabled

        const outpoint = wabisabi.getOutpoint(utxo);
        const inputSize = account.accountType === 'taproot' ? 58 : 68;
        const outputSize = account.accountType === 'taproot' ? 43 : 31;

        const alice = coinjoin.rounds.find(alice => alice.outpoint === outpoint);
        if (alice) {
            // already registered
            dispatch(unregisterInput(alice));
            return;
        }

        const round = coinjoin.status.find(
            r =>
                r.phase === wabisabi.Phase.InputRegistration &&
                Date.parse(r.inputRegistrationEnd) > Date.now() + 1000 * 30,
        );

        if (!round) {
            console.warn('No suitable rounds');
            return;
        }

        dispatch({
            type: COINJOIN.TRY_REGISTER_INPUT,
            payload: {
                outpoint,
                pendingPhase: wabisabi.Phase.InputRegistration,
            },
        });

        const name = Buffer.from('CoinJoinCoordinatorIdentifier');
        const len = Buffer.allocUnsafe(1);
        len.writeUInt8(name.length, 0);

        const commitmentData = Buffer.concat([len, name, Buffer.from(round.id, 'hex')]).toString(
            'hex',
        );

        console.warn(commitmentData);

        // @ts-ignore
        const proof = await TrezorConnect.getOwnershipProof({
            path: utxo.path,
            coin: account.symbol,
            userConfirmation: true,
            commitmentData,
            preauthorized: true,
        });

        if (!proof.success) {
            dispatch(addToast({ type: 'discovery-error', error: proof.payload.error }));
            return;
        }

        console.warn('PROOF!', proof);

        const { zeroCredentialsRequestData: zeroAmountCredentials } = await wabisabi.crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
            },
        );

        const { zeroCredentialsRequestData: zeroVsizeCredentials } = await wabisabi.crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            },
        );

        const registrationData = await wabisabi.post('input-registration', {
            roundId: round.id,
            input: outpoint,
            ownershipProof: proof.payload.ownership_proof,
            zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
            zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
        });

        const realAmountCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: round.amountCredentialIssuerParameters,
            registrationResponse: registrationData.amountCredentials,
            registrationValidationData: zeroAmountCredentials.credentialsResponseValidation,
        });

        const realVsizeCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            registrationResponse: registrationData.vsizeCredentials,
            registrationValidationData: zeroVsizeCredentials.credentialsResponseValidation,
        });

        const amountNumber = Number.parseInt(utxo.amount, 10);
        const coordinatorFee =
            amountNumber > round.coordinationFeeRate.plebsDontPayThreshold
                ? round.coordinationFeeRate.rate * amountNumber
                : 0;
        const txFee = (inputSize * round.feeRate) / 1000;
        const amount = amountNumber - coordinatorFee - txFee;

        const { realCredentialsRequestData: realAmountCredentials } = await wabisabi.crypto(
            'create-request',
            {
                amountsToRequest: [amount],
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
                maxCredentialValue: round.maxAmountCredentialValue,
                credentialsToPresent: realAmountCredentials1.credentials,
            },
        );
        const { realCredentialsRequestData: realVsizeCredentials } = await wabisabi.crypto(
            'create-request',
            {
                amountsToRequest: [round.maxVsizeAllocationPerAlice - inputSize],
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
                maxCredentialValue: round.maxVsizeCredentialValue,
                credentialsToPresent: realVsizeCredentials1.credentials,
            },
        );

        const reservedAddresses = getState().wallet.coinjoin.rounds.reduce(
            (c, r) => c.concat(r.addresses),
            [] as Alice['addresses'],
        );
        const notUsedAddresses = account.addresses!.change.filter(
            a => !a.transfers && !reservedAddresses.find(ra => ra.address === a.address),
        );

        console.warn('--reserved', reservedAddresses, notUsedAddresses);

        dispatch({
            type: COINJOIN.REGISTER_INPUT,
            payload: {
                outpoint,
                amount,
                roundId: round.id,
                aliceId: registrationData.aliceId,
                inputSize,
                outputSize,
                addresses: notUsedAddresses.slice(0, 5),
                commitmentData,
                ownershipProof: proof.payload.ownership_proof,
                pendingPhase: wabisabi.Phase.ConnectionConfirmation,
                utxo,
                round,
                registrationData,
                zeroAmountCredentials,
                zeroVsizeCredentials,
                realAmountCredentials,
                realVsizeCredentials,
            },
        });
    };

export const connectionConfirmation =
    (payload: Alice) => async (dispatch: Dispatch, getState: GetState) => {
        try {
            const { zeroCredentialsRequestData: zeroAmountCredentials } = await wabisabi.crypto(
                'create-request-for-zero-amount',
                {
                    credentialIssuerParameters: payload.round.amountCredentialIssuerParameters,
                },
            );

            const { zeroCredentialsRequestData: zeroVsizeCredentials } = await wabisabi.crypto(
                'create-request-for-zero-amount',
                {
                    credentialIssuerParameters: payload.round.vsizeCredentialIssuerParameters,
                },
            );

            const confirmationData = await wabisabi.post('connection-confirmation', {
                roundId: payload.roundId,
                aliceId: payload.aliceId,
                zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
                realAmountCredentialRequests: payload.realAmountCredentials.credentialsRequest,
                zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
                realVsizeCredentialRequests: payload.realVsizeCredentials.credentialsRequest,
            });

            dispatch({
                type: COINJOIN.INPUT_CONFIRMED,
                payload: {
                    ...payload,
                    pendingPhase: wabisabi.Phase.OutputRegistration,
                    confirmationData,
                    zeroAmountCredentials,
                    zeroVsizeCredentials,
                },
            });
        } catch (e) {
            console.warn('---CATCHERROR', e);
            dispatch(unregisterInput(payload));
        }

        //  console.warn('--->response', response);
    };

// post('credential-issuance)

export const registerOutputs =
    (alice: Alice, PROOFS: any) => async (dispatch: Dispatch, getState: GetState) => {
        const {
            coinjoin,
            selectedAccount: { account },
        } = getState().wallet;

        const round = coinjoin.status.find(r => r.id === alice.roundId);
        const allInputs = coinjoin.rounds.filter(a => a.roundId === alice.roundId);

        allInputs.forEach(a => {
            dispatch({
                type: COINJOIN.TRY_REGISTER_OUTPUT,
                payload: {
                    ...a,
                    pendingPhase: wabisabi.Phase.TransactionSigning,
                },
            });
        });
        // const registeredOutputs = wabisabi.getEvents(
        //     'OutputAdded',
        //     round?.coinjoinState.events || [],
        // );
        // if (registeredOutputs.length < 1) {
        //     console.warn('--no outputs yet.....');
        //     return;
        // }

        // dispatch({
        //     type: COINJOIN.TRY_REGISTER_OUTPUT,
        //     payload: {
        //         ...alice,
        //         pendingPhase: wabisabi.Phase.TransactionSigning,
        //     },
        // });

        const realAmountCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.amountCredentialIssuerParameters,
            registrationResponse: alice.confirmationData.realAmountCredentials,
            registrationValidationData: alice.realAmountCredentials.credentialsResponseValidation,
        });

        const realVsizeCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.vsizeCredentialIssuerParameters,
            registrationResponse: alice.confirmationData.realVsizeCredentials,
            registrationValidationData: alice.realVsizeCredentials.credentialsResponseValidation,
        });

        const zeroAmountCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.amountCredentialIssuerParameters,
            registrationResponse: alice.confirmationData.zeroAmountCredentials,
            registrationValidationData: alice.zeroAmountCredentials.credentialsResponseValidation,
        });

        const zeroVsizeCredentials1 = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.vsizeCredentialIssuerParameters,
            registrationResponse: alice.confirmationData.zeroVsizeCredentials,
            registrationValidationData: alice.zeroVsizeCredentials.credentialsResponseValidation,
        });

        // const half = Math.floor(alice.amount / 2);

        // const firstKnowOutput = registeredOutputs[0].output.value + 3999; // feeRate * delka
        // const firstKnowOutput = registeredOutputs[0].output.value + 31 * round!.feeRate; // bech 32 feeRate * delka fee rrate: 129000
        const outputFee = (alice.outputSize * round!.feeRate) / 1000;
        // const firstKnowOutput = registeredOutputs[0].output.value + outputFee;
        const firstKnowOutput = alice.amount / 2 + outputFee;
        // const firstKnowOutput = 200000 + 3999;

        try {
            const decomposed = await wabisabi.crypto('decompose-amounts', {
                internalAmounts: [alice.amount],
                externalAmounts: allInputs
                    .filter(a => a.aliceId !== alice.aliceId)
                    .map(a => a.amount),
                outputSize: alice.outputSize,
                availableVsize: round!.maxVsizeAllocationPerAlice - alice.inputSize,
                constants: {
                    feeRate: round!.feeRate,
                    allowedOutputAmounts: round?.coinjoinState.parameters.allowedOutputAmounts,
                },
                strategy: 'minimum_cost',
            });
            console.log('DECOMPOSE', decomposed);
        } catch (e) {
            console.log('Decompose error', e);
        }

        console.warn('FIRST KNOWN!', alice.amount, firstKnowOutput, alice.amount - firstKnowOutput);

        const { realCredentialsRequestData: issuanceAmountCredentials } = await wabisabi.crypto(
            'create-request',
            {
                amountsToRequest: [firstKnowOutput, alice.amount - firstKnowOutput],
                // amountsToRequest: [firstKnowOutput, 500000000 - firstKnowOutput],
                credentialIssuerParameters: alice.round.amountCredentialIssuerParameters,
                maxCredentialValue: alice.round.maxAmountCredentialValue,
                credentialsToPresent: realAmountCredentials1.credentials,
            },
        );
        const { realCredentialsRequestData: issuanceVsizeCredentials } = await wabisabi.crypto(
            'create-request',
            {
                amountsToRequest: [
                    (alice.round.maxVsizeAllocationPerAlice - alice.inputSize) / 2,
                    (alice.round.maxVsizeAllocationPerAlice - alice.inputSize) / 2,
                ],
                credentialIssuerParameters: alice.round.vsizeCredentialIssuerParameters,
                maxCredentialValue: alice.round.maxVsizeCredentialValue,
                credentialsToPresent: realVsizeCredentials1.credentials,
            },
        );

        // await new Promise(resolve => setTimeout(resolve, 20000));

        const issuanceData = await wabisabi.post('credential-issuance', {
            roundId: alice.roundId,
            aliceId: alice.aliceId,
            zeroAmountCredentialRequests: alice.zeroAmountCredentials.credentialsRequest,
            realAmountCredentialRequests: issuanceAmountCredentials.credentialsRequest,
            zeroVsizeCredentialsRequests: alice.zeroVsizeCredentials.credentialsRequest, // Credential === Credentails
            realVsizeCredentialRequests: issuanceVsizeCredentials.credentialsRequest,
        });

        const outputRealAmountCredentials = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.amountCredentialIssuerParameters,
            registrationResponse: issuanceData.realAmountCredentials,
            registrationValidationData: issuanceAmountCredentials.credentialsResponseValidation,
        });

        const outputRealVsizeCredentials = await wabisabi.crypto('handle-response', {
            credentialIssuerParameters: alice.round.vsizeCredentialIssuerParameters,
            registrationResponse: issuanceData.realVsizeCredentials,
            registrationValidationData: issuanceVsizeCredentials.credentialsResponseValidation,
        });

        const promises = outputRealAmountCredentials.credentials.map(
            (c: any, i: any) =>
                new Promise(async resolve => {
                    const { realCredentialsRequestData: outputAmountCredentials } =
                        await wabisabi.crypto('create-request', {
                            amountsToRequest: [0],
                            credentialIssuerParameters:
                                alice.round.amountCredentialIssuerParameters,
                            maxCredentialValue: alice.round.maxAmountCredentialValue,
                            credentialsToPresent: [
                                outputRealAmountCredentials.credentials[i],
                                zeroAmountCredentials1.credentials[i],
                            ],
                        });
                    const { realCredentialsRequestData: outputVsizeCredentials } =
                        await wabisabi.crypto('create-request', {
                            amountsToRequest: [
                                outputRealVsizeCredentials.credentials[i].value - alice.outputSize,
                            ],
                            credentialIssuerParameters: alice.round.vsizeCredentialIssuerParameters,
                            maxCredentialValue: alice.round.maxVsizeCredentialValue,
                            credentialsToPresent: [
                                outputRealVsizeCredentials.credentials[i],
                                zeroVsizeCredentials1.credentials[i],
                            ],
                        });

                    const output = alice.addresses[i];

                    // OP_1: 51
                    const scriptPubKey =
                        account?.accountType === 'taproot'
                            ? `1 ${payments
                                  .p2tr({
                                      address: output.address,
                                      network: networks.regtest,
                                  })
                                  .hash?.toString('hex')}`
                            : `0 ${payments
                                  .p2wpkh({
                                      address: output.address,
                                      network: networks.regtest,
                                  })
                                  .hash?.toString('hex')}`;

                    await wabisabi.post(
                        'output-registration',
                        {
                            roundId: alice.roundId,
                            script: scriptPubKey,
                            amountCredentialRequests: outputAmountCredentials.credentialsRequest,
                            vsizeCredentialRequests: outputVsizeCredentials.credentialsRequest,
                        },
                        false,
                    );

                    resolve({ scriptPubKey, path: output.path, address: output.address });
                }),
        );

        const outputs = await Promise.all(promises);

        await wabisabi.post(
            'ready-to-sign',
            {
                roundId: alice.roundId,
                aliceId: alice.aliceId,
            },
            false,
        );

        dispatch({
            type: COINJOIN.OUTPUT_CONFIRMED,
            payload: {
                ...alice,
                ownershipProofs: PROOFS,
                outputs,
                pendingPhase: wabisabi.Phase.TransactionSigning,
            },
        });
    };

export const trezorPaymentRequest = (outputs: any, change_addresses: any) =>
    fetch('http://127.0.0.1:8081/payment-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            recipient_name: 'CoinJoinCoordinatorIdentifier',
            outputs,
            change_addresses,
        }),
    }).then(r => r.json());

export const sign = (alice: Alice) => async (dispatch: Dispatch, getState: GetState) => {
    const {
        coinjoin,
        selectedAccount: { account },
    } = getState().wallet;
    const { device, locks } = getState().suite;
    if (locks.indexOf(2) >= 0) {
        console.warn('Device locked');
    }
    const round = coinjoin.status.find(r => r.id === alice.roundId);
    if (!round || !account) return;

    dispatch({
        type: COINJOIN.TRY_SIGN_TX,
        payload: {
            ...alice,
            pendingPhase: wabisabi.Phase.Ended,
        },
    });

    // const b2 = Buffer.allocUnsafe(4);
    // b2.writeUInt32LE(Buffer.from('CoinJoinCoordinatorIdentifier').length, 0);

    const registeredInputs = wabisabi.getEvents('InputAdded', round.coinjoinState.events); // round.coinjoinState.events.filter(e => e.Type === 'InputAdded');
    const myInputsInRound = coinjoin.rounds.filter(alice => alice.roundId === round.id);

    const inputs = registeredInputs
        .sort((a, b) => wabisabi.sortVinVout(a.coin.txOut, b.coin.txOut))
        .map((input, i) => {
            // const buf = Buffer.from(input.coin.outpoint, 'hex');
            // const b = new bufferutils.BufferReader(buf);
            // const hash = bufferutils.reverseBuffer(b.readSlice(32)).toString('hex');
            // const index = b.readUInt32();

            const { index, hash } = wabisabi.readOutpoint(input.coin.outpoint);
            const lc = input.coin.outpoint.toLowerCase();
            const internal = myInputsInRound.find(a => a.outpoint === lc);

            if (internal) {
                return {
                    address_n: internal.utxo.path as number[],
                    prev_hash: hash,
                    prev_index: index,
                    amount: input.coin.txOut.value,
                    script_type:
                        account.accountType === 'taproot' ? 'SPENDTAPROOT' : 'SPENDWITNESS',
                } as const;
            }

            return {
                // address_n: undefined,
                amount: input.coin.txOut.value,
                prev_hash: hash,
                prev_index: index,
                script_type: 'EXTERNAL',
                script_pubkey: `0014${input.coin.txOut.scriptPubKey.split(' ')[1]}`,
                ownership_proof: input.coin.ownershipProof,
                // commitment_data: fixedCommitmentData,
                commitment_data: alice.commitmentData,
            } as const;
        });

    console.warn('inputs', inputs);

    const registeredOutputs = wabisabi.getEvents('OutputAdded', round.coinjoinState.events);
    const myOutputsInRound = coinjoin.rounds
        .filter(a => a.roundId === round.id)
        .reduce((c, a) => c.concat(a.outputs), [] as Alice['outputs']);

    const outputs = registeredOutputs
        .sort((a, b) => wabisabi.sortVinVout(a.output, b.output))
        // .sort((a, b) => {
        //     if (a.output.value === b.output.value)
        //         return a.output.scriptPubKey.length - b.output.scriptPubKey.length;
        //     return b.output.value - a.output.value;
        // })
        .map(({ output }) => {
            // const my = alice.outputs.find(o => output.scriptPubKey === o.scriptPubKey);
            const my = myOutputsInRound.find(o => output.scriptPubKey === o.scriptPubKey);

            if (my) {
                return {
                    address_n: my.path,
                    amount: output.value,
                    script_type:
                        account.accountType === 'taproot' ? 'PAYTOTAPROOT' : 'PAYTOWITNESS',
                    payment_req_index: 0,
                } as const;
            }

            const [OP, hash] = output.scriptPubKey.split(' ');

            const { address } =
                OP === '1'
                    ? payments.p2tr({
                          hash: Buffer.from(hash, 'hex'),
                          network: networks.regtest,
                      })
                    : payments.p2wpkh({
                          hash: Buffer.from(hash, 'hex'),
                          network: networks.regtest,
                      });
            return {
                address: address!,
                amount: output.value,
                script_type: 'PAYTOADDRESS',
                payment_req_index: 0,
            } as const;
        });

    const changeAddresses = outputs.flatMap(o => {
        if (o.address_n) {
            const my = myOutputsInRound.find(myo => myo.path === o.address_n);
            return my.address;
        }
        return [];
    });

    const paymentRequest = await trezorPaymentRequest(
        outputs.map(o => ({ ...o, address_n: null })),
        changeAddresses,
    );

    console.log(
        'outputs',
        outputs.map(i => ({ ...i, amount: i.amount.toString() })),
    );

    const signTx = await TrezorConnect.signTransaction({
        inputs: inputs.map(i => ({ ...i, amount: i.amount.toString() })),
        outputs: outputs.map(i => ({ ...i, amount: i.amount.toString() })),
        paymentRequests: [paymentRequest],
        coin: account.symbol,
        preauthorized: true,
    });

    console.warn('SIGNED TX', signTx);

    if (!signTx.success) return;

    const txSignatures = signTx.payload.witnesses.flatMap((witness, inputIndex) => {
        if (witness === '00') return [];
        return {
            inputIndex,
            witness,
        };
    });

    txSignatures.forEach(sig => {
        wabisabi.post(
            'transaction-signature',
            {
                roundId: alice.roundId,
                inputIndex: sig.inputIndex,
                witness: sig.witness,
            },
            false,
        );
    });
};
