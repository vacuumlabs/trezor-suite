import { connectionConfirmation } from '../arena/connectionConfirmation';
import { createServer } from '../../tests/server';

let server: ReturnType<typeof createServer> | undefined;

describe('Arena/connectionConfirmation', () => {
    beforeAll(() => {
        server = createServer();
    });

    beforeEach(() => {
        server?.removeAllListeners('test-request');
    });

    afterAll(() => {
        if (server) server.close();
    });

    it('try to confirm without aliceId', async () => {
        const response = await connectionConfirmation({
            round: {},
            inputs: [{ phase: 1, outpoint: 'AB01' }],
        } as any);
        expect(response).toMatchObject({ inputs: [{ phase: 1, error: /AB01/ }] });
    });

    it('confirmed', async () => {
        const response = await connectionConfirmation({
            round: {
                feeRate: 12345,
                coordinationFeeRate: {
                    rate: 0.003,
                    plebsDontPayThreshold: 1,
                },
            },
            inputs: [{ phase: 2, realAmountCredentials: {}, realVsizeCredentials: {} }],
        } as any);
        expect(response).toMatchObject({
            inputs: [
                {
                    phase: 3,
                    confirmedAmountCredentials: [{}, {}],
                },
            ],
        });
    });

    it('error in coordinator connection-confirmation', async () => {
        server?.on('test-request', (data, req, res) => {
            if (req.url?.includes('connection-confirmation')) {
                if (data.aliceId === '02') {
                    res.writeHead(404);
                    res.end();
                }
            }
            req.emit('test-response');
        });
        const response = await connectionConfirmation({
            round: {},
            inputs: [
                { phase: 2, aliceId: '01', realAmountCredentials: {}, realVsizeCredentials: {} },
                { phase: 2, aliceId: '02', realAmountCredentials: {}, realVsizeCredentials: {} },
                { phase: 2, aliceId: '03', realAmountCredentials: {}, realVsizeCredentials: {} },
            ],
        } as any);
        expect(response).toMatchObject({
            inputs: [{ phase: 3 }, { phase: 2, error: /connection-confirmation/ }, { phase: 3 }],
        });
    });
});
