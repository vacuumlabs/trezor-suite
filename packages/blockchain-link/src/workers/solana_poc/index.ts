import type { Response, AccountInfo } from '@trezor/blockchain-link-types';
import type * as MessageTypes from '@trezor/blockchain-link-types/lib/messages';
import { CustomError } from '@trezor/blockchain-link-types/lib/constants/errors';
import { BaseWorker, ContextType, CONTEXT } from '../baseWorker';
import { MESSAGES, RESPONSES } from '@trezor/blockchain-link-types/lib/constants';

type SolanaPocAPI = unknown;

type Context = ContextType<SolanaPocAPI>;
type Request<T> = T & Context;

const getAccountInfo = (request: Request<MessageTypes.GetAccountInfo>) => {
    const { payload } = request;

    // initial state (basic)
    // TODO(vl): replace with actual backend call
    const account: AccountInfo = {
        descriptor: payload.descriptor,
        balance: '0', // default balance
        availableBalance: '0', // default balance
        empty: true,
        history: {
            total: -1,
            unconfirmed: 0,
            transactions: undefined,
        },
    };
    return Promise.resolve({
        type: RESPONSES.GET_ACCOUNT_INFO,
        payload: account,
    } as const);
};

const getInfo = (request: Request<MessageTypes.GetInfo>) => {
    request.connect(); // TODO:(vl) just so the request is used for now
    const serverInfoMock = {
        testnet: false,
        blockHeight: 10000,
        blockHash: 'deadbeafdeadbeaf',
        shortcut: 'sol',
        url: 'TBD',
        name: 'solana_poc',
        version: '0.0.0',
        decimals: 9,
    };
    return {
        type: RESPONSES.GET_INFO,
        payload: { ...serverInfoMock },
    } as const;
};

const onRequest = (request: Request<MessageTypes.Message>) => {
    switch (request.type) {
        case MESSAGES.GET_ACCOUNT_INFO:
            return getAccountInfo(request);
        case MESSAGES.GET_INFO:
            return getInfo(request);
        default:
            throw new CustomError('worker_unknown_request', `+${request.type}`);
    }
};

class SolanaPocWorker extends BaseWorker<SolanaPocAPI> {
    private connected = false;

    protected isConnected(api: SolanaPocAPI | undefined): api is SolanaPocAPI {
        return !!api && this.connected; // TODO(vl): implement
    }

    tryConnect(url: string): Promise<SolanaPocAPI> {
        this.connected = true;
        this.post({ id: -1, type: RESPONSES.CONNECTED });
        return Promise.resolve(url); // TODO(vl): return an actual API
    }

    async messageHandler(event: { data: MessageTypes.Message }) {
        try {
            // skip processed messages
            if (await super.messageHandler(event)) return true;

            const request: Request<MessageTypes.Message> = {
                ...event.data,
                connect: () => this.connect(),
                post: (data: Response) => this.post(data),
                state: this.state,
            };

            const response = await onRequest(request);
            this.post({ id: event.data.id, ...response });
        } catch (error) {
            this.errorResponse(event.data.id, error);
        }
    }
}

// export worker factory used in src/index
export default function SolanaPoc() {
    return new SolanaPocWorker();
}

// TODO(vl): figure out what this does
if (CONTEXT === 'worker') {
    // Initialize module if script is running in worker context
    const module = new SolanaPocWorker();
    onmessage = module.messageHandler.bind(module);
}
