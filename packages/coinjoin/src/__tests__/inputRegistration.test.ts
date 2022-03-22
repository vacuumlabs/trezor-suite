import { inputRegistration } from '../arena/inputRegistration';
import { createServer } from '../../tests/server';

let server: ReturnType<typeof createServer> | undefined;

describe('Arena/inputRegistration', () => {
    beforeAll(() => {
        server = createServer();
    });

    beforeEach(() => {
        server?.removeAllListeners('test-request');
    });

    afterAll(() => {
        if (server) server.close();
    });

    it('try to register without ownership proof', async () => {
        const response = await inputRegistration({
            round: {},
            inputs: [{ phase: 0 }],
        } as any);
        expect(response).toMatchObject({ inputs: [{ phase: 1 }] }); // waiting
    });

    it('register with coordinator fee', async () => {
        const response = await inputRegistration({
            round: {
                feeRate: 12345,
                coordinationFeeRate: {
                    rate: 0.003,
                    plebsDontPayThreshold: 1,
                },
            },
            inputs: [{ phase: 1, amount: 123456789, inputSize: 68, ownershipProof: '0101' }],
        } as any);
        expect(response).toMatchObject({
            inputs: [
                // 123456789 - ((68 * 12345) / 100) - (123456789 * 0.03)
                { phase: 2, availableAmount: 123085580 },
            ],
        });
    });

    it('register without coordinator fee (plebs)', async () => {
        const response = await inputRegistration({
            round: {
                feeRate: 12345,
                coordinationFeeRate: {
                    rate: 0.003,
                    plebsDontPayThreshold: 123456789, // same as amount
                },
            },
            inputs: [{ phase: 1, amount: 123456789, inputSize: 68, ownershipProof: '0101' }],
        } as any);
        expect(response).toMatchObject({
            inputs: [
                // 123456789 - ((68 * 12345) / 100)
                { phase: 2, availableAmount: 123455950 },
            ],
        });
    });

    it('register without coordinator fee (remix)', async () => {
        server?.on('test-request', (_data, req, res) => {
            if (req.url?.includes('input-registration')) {
                res.write(
                    JSON.stringify({
                        isPayingZeroCoordinationFee: true,
                    }),
                );
                res.end();
            }
            req.emit('test-response');
        });

        const response = await inputRegistration({
            round: {
                feeRate: 12345,
                coordinationFeeRate: {
                    rate: 0.003,
                    plebsDontPayThreshold: 1,
                },
            },
            inputs: [{ phase: 1, amount: 123456789, inputSize: 68, ownershipProof: '0101' }],
        } as any);
        expect(response).toMatchObject({
            inputs: [
                // 123456789 - ((68 * 12345) / 100)
                { phase: 2, availableAmount: 123455950 },
            ],
        });
    });

    it('error in coordinator input-registration', async () => {
        server?.on('test-request', (data, req, res) => {
            if (req.url?.includes('input-registration')) {
                if (data.ownershipProof === '0102') {
                    res.writeHead(404);
                    res.end();
                }
            }
            req.emit('test-response');
        });
        const response = await inputRegistration({
            round: {
                id: 'ABCD',
                coordinationFeeRate: {
                    plebsDontPayThreshold: 1,
                },
            },
            inputs: [
                { phase: 1, ownershipProof: '0101' },
                { phase: 1, ownershipProof: '0102' },
                { phase: 1, ownershipProof: '0103' },
            ],
        } as any);
        expect(response).toMatchObject({
            inputs: [{ phase: 2 }, { phase: 1, error: /input-registration/ }, { phase: 2 }],
        });
    });

    it('error in cryptography after successful registration (input should be unregistered while still can)', async () => {
        server?.on('test-request', (_data, req, res) => {
            if (req.url?.includes('handle-response')) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(404);
                res.end();
            }
            req.emit('test-response');
        });
        const response = await inputRegistration({
            round: {
                id: 'ABCD',
                coordinationFeeRate: {
                    plebsDontPayThreshold: 1,
                },
            },
            inputs: [{ phase: 1, ownershipProof: '0101' }],
        } as any);
        expect(response).toMatchObject({
            inputs: [
                {
                    phase: 1,
                    aliceId: expect.any(String), // aliceId is present
                    error: /handle-response/,
                },
            ],
        });
    });
});
