import { outputRegistration } from '../arena/outputRegistration';
import { createServer } from '../../tests/server';

let server: ReturnType<typeof createServer> | undefined;

describe('Arena/outputRegistration', () => {
    beforeAll(() => {
        server = createServer();
    });

    beforeEach(() => {
        server?.removeAllListeners('test-request');
    });

    afterAll(() => {
        if (server) server.close();
    });

    it('try to register', async () => {
        const response = await outputRegistration({
            round: {
                coinjoinState: {
                    events: [],
                    parameters: {
                        allowedOutputAmounts: 1,
                    },
                },
            },
            inputs: [
                {
                    phase: 1,
                    availableAmount: 100000,
                    confirmationData: {},
                    confirmedAmountCredentials: [{}, {}],
                    confirmedVsizeCredentials: [{}, {}],
                },
                // {
                //     phase: 1,
                //     availableAmount: 400000,
                //     confirmationData: {},
                //     confirmedAmountCredentials: [{}, {}],
                //     confirmedVsizeCredentials: [{}, {}],
                // },
            ],
        } as any);
        expect(response).toMatchObject({ inputs: [{ phase: 4, error: 'a' }] });
    });
});
