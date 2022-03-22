import * as http from 'http';

// Mock coordinator and middleware responses

const DEFAULT = {
    'create-request': {
        realCredentialsRequestData: {},
    },
    'create-request-for-zero-amount': {
        zeroCredentialsRequestData: {
            credentialsRequest: {},
        },
    },
    'handle-response': {
        credentials: [{}, {}],
    },
    'decompose-amounts': { outputAmounts: [] },
    'payment-request': {},
    // coordinator
    status: {},
    'input-registration': {
        aliceId: Math.random().toString(),
    },
    'connection-confirmation': {
        realAmountCredentials: {
            credentialsRequest: {},
        },
        realVsizeCredentials: {
            credentialsRequest: {},
        },
    },
    'credential-issuance': {},
    'output-registration': {},
    'ready-to-sign': {},
    'transaction-signature': {},
};

const handleRequest: http.RequestListener = (req, res) => {
    if (res.writableEnded) return; // send default response if res.end wasn't called in test
    const url = req.url?.split('/').pop();
    const data = DEFAULT[url as keyof typeof DEFAULT] || {};

    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(data));
    res.end();
};

export const createServer = () => {
    const server = http.createServer((req, res) => {
        if (server.listenerCount('test-request') > 0) {
            let data = '';
            req.on('data', chunk => {
                data += chunk;
            });
            req.on('end', () => {
                server.emit('test-request', JSON.parse(data), req, res);
            });
            // notify test and wait for the response
            req.on('test-response', () => {
                handleRequest(req, res);
            });
        } else {
            handleRequest(req, res);
        }
    });
    server.listen(8081);
    return server;
};
