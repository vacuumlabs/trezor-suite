import { CoinjoinClient } from '../client';

const ROUND = {
    id: '0',
    phase: 0,
    coordinationFeeRate: {},
    coinjoinState: { events: [] as any[] },
};

jest.mock('../coordinator', () => {
    let tick = 0;
    let phase = 0;
    let status = [ROUND];
    return {
        getStatus: () => {
            tick++;
            if (tick % 2 === 0) {
                phase = tick / 2;
                status = status.map(r => ({ ...r, phase: r.phase + 1 }));
                status.push({ ...ROUND, id: tick.toString() });
            }
            return status;
        },
        inputRegistration: (roundId: any, outpoint: any) => {
            console.warn('----> input Registration!', outpoint);
            const round = status.find(r => r.id === roundId);
            round?.coinjoinState.events.push({
                Type: 'InputAdded',
                coin: {
                    outpoint,
                    txOut: {
                        scriptPubKey: 'string',
                        value: 1,
                    },
                },
            });
            round?.coinjoinState.events.push({
                Type: 'InputAdded',
                coin: {
                    outpoint:
                        '0007000000000000b8876504000000007c000000010000003c00000000000000b08c6504',
                    txOut: {
                        scriptPubKey:
                            '0 95e2d98fa921d2a14057a41a09eb112613f95cb17905d2cd7e5322f6d9c7dfd9',
                        value: 4,
                    },
                    ownershipProof: 'externalproof',
                },
            });
            return {};
        },
        connectionConfirmation: () => ({}),
        credentialIssuance: () => ({
            realAmountCredentials: 'credentialIssuance',
            realVsizeCredentials: 'credentialIssuance',
        }),
        outputRegistration: (alice: any, output: any) => {
            console.log('===>outputRegistration', alice, output);
            const round = status.find(r => r.id === alice.roundId);
            round?.coinjoinState.events.push({
                Type: 'OutputAdded',
                output: {
                    scriptPubKey: output.scriptPubKey,
                    value: 1,
                },
            });
            round?.coinjoinState.events.push({
                Type: 'OutputAdded',
                output: {
                    scriptPubKey:
                        '0 95e2d98fa921d2a14057a41a09eb112613f95cb17905d2cd7e5322f6d9c7dfd9',
                    value: 2,
                },
            });
            return {};
        },
        readyToSign: () => ({}),
        transactionSignature: () => Promise.resolve(),
    };
});

jest.mock('../middleware', () => {
    const tick = 0;
    const phase = 0;
    const status = [{ id: '00', phase: 0, coordinationFeeRate: {} }];
    return {
        getCredentials: (_b, data) => {
            console.log('====> getCredentials', _b, data);
            if (data === 'credentialIssuance') {
                return [{ value: 0 }, { value: 0 }];
            }
            return [];
        },
        getZeroCredentials: () => ({}),
        getRealCredentials: () => ({}),
        getPaymentRequest: () => ({}),
    };
});

describe('CoinjoinClient', () => {
    // it('enable/disable', async () => {
    //     const cli = await CoinjoinClient.enable();

    //     expect(cli.status.enabled).toBe(true);
    //     expect(cli.status.rounds).toMatchObject([{ id: '00' }, { id: '01' }]);

    //     CoinjoinClient.disable();
    //     expect(cli.status.enabled).toBe(false);
    //     expect(cli.status.rounds).toEqual([]);
    // });

    // it('status change', async () => {
    //     const listener = jest.fn();
    //     // api.downloadUpdate();
    //     // expect(spy).toBeCalledWith('update/download');

    //     const cli = await CoinjoinClient.enable();
    //     cli.on('status', listener);
    //     expect(listener).toBeCalledTimes(0); // it should not be emitted yet
    //     // wait few iterations
    //     await new Promise<void>(resolve => {
    //         setTimeout(() => {
    //             resolve();
    //         }, 5000);
    //     });

    //     expect(listener).toHaveBeenCalled();

    //     // expect(cli.status.enabled).toBe(true);
    //     // expect(cli.status.rounds).toMatchObject([{ id: '00' }, { id: '01' }]);

    //     // CoinjoinClient.disable();
    //     // expect(cli.status.enabled).toBe(false);
    //     // expect(cli.status.rounds).toEqual([]);
    // }, 100000);

    it('status change', async () => {
        // const listener = jest.fn();
        // api.downloadUpdate();
        // expect(spy).toBeCalledWith('update/download');

        const cli = await CoinjoinClient.enable();
        cli.on('event', e => console.log('debug event', e));
        cli.on('request', data => {
            console.warn('handle request in suite', data);
            const responses = data.map(request => {
                if (request.event === 'ownership') {
                    console.warn(request.event, request.inputs);
                    return {
                        ...request,
                        inputs: request.inputs.map(i => ({ ...i, ownershipProof: 'abcd' })),
                    };
                }
                if (request.event === 'witness') {
                    console.warn(request.event, request.payload);
                    return {
                        ...request,
                        inputs: request.inputs.map(i => ({
                            ...i,
                            witness: 'abcd',
                            witnessIndex: 1,
                        })),
                    };
                }

                return request;
            });

            CoinjoinClient.addOwnershipProof(responses);
        });
        cli.on('request-ownership-proof', data => {
            CoinjoinClient.addOwnershipProof(data);
        });
        CoinjoinClient.addInput({
            vin: { path: 'm44', type: 'taproot', txid: '55', vout: 7, amount: 1 },
            addresses: [
                { address: 'bcrt1p0wxg3r4ddwhdsze3ket8egal8caf4u5rflnlnun9tm2ekafgzc7se7tuts' },
                { address: 'bcrt1p0wxg3r4ddwhdsze3ket8egal8caf4u5rflnlnun9tm2ekafgzc7se7tuts' },
            ],
        });
        // cli.inputs.push({ round: '00', outpoint: 'AB' } as any);
        // wait few iterations
        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, 8000);
        });

        // expect(listener).toHaveBeenCalled();

        // expect(cli.status.enabled).toBe(true);
        // expect(cli.status.rounds).toMatchObject([{ id: '00' }, { id: '01' }]);

        // CoinjoinClient.disable();
        // expect(cli.status.enabled).toBe(false);
        // expect(cli.status.rounds).toEqual([]);
    }, 100000);
});
