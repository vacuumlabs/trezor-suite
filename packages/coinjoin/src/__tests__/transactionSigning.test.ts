import { transactionSigning } from '../arena/transactionSigning';
import { createServer } from '../../tests/server';

let server: ReturnType<typeof createServer> | undefined;

describe('Arena/transactionSigning', () => {
    beforeAll(() => {
        server = createServer();
    });

    beforeEach(() => {
        server?.removeAllListeners('test-request');
    });

    afterAll(() => {
        if (server) server.close();
    });

    it('try to sign without witness', async () => {
        const response = await transactionSigning({
            round: {
                coinjoinState: {
                    events: [],
                },
            },
            inputs: [{ phase: 1 }],
        } as any);
        expect(response).toMatchObject({ inputs: [{ phase: 5 }] });
    });

    it('signed', async () => {
        const response = await transactionSigning({
            round: {
                coinjoinState: {
                    events: [],
                },
            },
            inputs: [{ phase: 5, witness: '0102' }],
        } as any);
        expect(response).toMatchObject({ inputs: [{ phase: 7 }] });
    });
});
