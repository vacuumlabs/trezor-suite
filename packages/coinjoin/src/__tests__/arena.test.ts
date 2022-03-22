import { joinInputsCredentials } from '../arena/outputRegistration';
import { createServer } from '../../tests/server';

// const ROUND = {
//     id: '0',
//     phase: 0,
//     coordinationFeeRate: {},
//     coinjoinState: { events: [] as any[] },
// };

// jest.mock('../coordinator', () => {
//     let tick = 0;
//     let phase = 0;
//     let status = [ROUND];
//     return {
//         getStatus: () => {
//             tick++;
//             if (tick % 2 === 0) {
//                 phase = tick / 2;
//                 status = status.map(r => ({ ...r, phase: r.phase + 1 }));
//                 status.push({ ...ROUND, id: tick.toString() });
//             }
//             return status;
//         },
//         inputRegistration: (roundId: any, outpoint: any) => {
//             console.warn('----> input Registration!', outpoint);
//             const round = status.find(r => r.id === roundId);
//             round?.coinjoinState.events.push({
//                 Type: 'InputAdded',
//                 coin: {
//                     outpoint,
//                     txOut: {
//                         scriptPubKey: 'string',
//                         value: 1,
//                     },
//                 },
//             });
//             round?.coinjoinState.events.push({
//                 Type: 'InputAdded',
//                 coin: {
//                     outpoint:
//                         '0007000000000000b8876504000000007c000000010000003c00000000000000b08c6504',
//                     txOut: {
//                         scriptPubKey:
//                             '0 95e2d98fa921d2a14057a41a09eb112613f95cb17905d2cd7e5322f6d9c7dfd9',
//                         value: 4,
//                     },
//                     ownershipProof: 'externalproof',
//                 },
//             });
//             return {};
//         },
//         connectionConfirmation: () => ({}),
//         credentialIssuance: () => ({
//             realAmountCredentials: 'credentialIssuance',
//             realVsizeCredentials: 'credentialIssuance',
//         }),
//         outputRegistration: (alice: any, output: any) => {
//             console.log('===>outputRegistration', alice, output);
//             const round = status.find(r => r.id === alice.roundId);
//             round?.coinjoinState.events.push({
//                 Type: 'OutputAdded',
//                 output: {
//                     scriptPubKey: output.scriptPubKey,
//                     value: 1,
//                 },
//             });
//             round?.coinjoinState.events.push({
//                 Type: 'OutputAdded',
//                 output: {
//                     scriptPubKey:
//                         '0 95e2d98fa921d2a14057a41a09eb112613f95cb17905d2cd7e5322f6d9c7dfd9',
//                     value: 2,
//                 },
//             });
//             return {};
//         },
//         readyToSign: () => ({}),
//         transactionSignature: () => Promise.resolve(),
//     };
// });

// jest.mock('../middleware', () => {
//     const tick = 0;
//     const phase = 0;
//     const status = [{ id: '00', phase: 0, coordinationFeeRate: {} }];
//     return {
//         getCredentials: (_b, data) => {
//             console.log('====> getCredentials', _b, data);
//             if (data === 'credentialIssuance') {
//                 return [{ value: 10 }, { value: 0 }];
//             }
//             return [];
//         },
//         getZeroCredentials: () => ({}),
//         getRealCredentials: (amounts, b) => {
//             console.log('-----> amounts', amounts);
//             return {};
//         },
//         getPaymentRequest: () => ({}),
//     };
// });

describe('Arena', () => {
    beforeAll(() => {
        createServer();
    });

    it('joinInputsCredentials', async () => {
        const cli = await joinInputsCredentials({
            round: {},
            inputs: [
                { aliceId: '1', newAmountCredentials: { value: 1 } },
                { aliceId: '2', newAmountCredentials: { value: 2 } },
                { aliceId: '3', newAmountCredentials: { value: 3 } },
                { aliceId: '4', newAmountCredentials: { value: 4 } },
            ],
        });
        console.log('CLI', cli);
    });
});
