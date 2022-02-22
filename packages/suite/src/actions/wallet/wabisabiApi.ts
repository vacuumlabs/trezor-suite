import TrezorConnect from 'trezor-connect';

// const WABISABI_URL = 'http://127.0.0.1:37127/WabiSabi/'; // CORS
const WABISABI_URL = 'http://127.0.0.1:8081/WabiSabi/'; // proxy

export const enableExperimental = async () => {
    const r = await TrezorConnect.applySettings({
        // @ts-ignore
        experimental_features: true,
    });
    console.warn('Auth', r);
};

export const authorize = async () => {
    // @ts-ignore
    const r = await TrezorConnect.authorizeCoinJoin({
        path: "m/84'/1'/0'",
        max_total_fee: 50000,
        fee_per_anonymity: 200,
        coordinator: 'CoinJoinCoordinatorIdentifier',
        coin_name: 'Regtest',
        // script_type: 'SPENDWITNESS',
    });
    console.warn('Auth', r);
    return r;
};

export const getOwnershipProof = async (utxo: any, roundId: any) => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt8(29, 0);

    // @ts-ignore
    const r = await TrezorConnect.getOwnershipProof({
        path: utxo.path,
        coin_name: 'Regtest',
        user_confirmation: true,
        commitment_data: Buffer.concat([
            Buffer.from('CoinJoinCoordinatorIdentifier'),
            roundId,
        ]).toString('hex'),
    });
    return r;
};

export const getOwnershipId = async () => {
    // @ts-ignore
    const r = await TrezorConnect.getOwnershipId({
        path: "m/84'/1'/0'/0/0",
        coin_name: 'Regtest',
    });
    console.warn('getOwnershipId', r);
};

export const getStatus = () =>
    fetch(`${WABISABI_URL}status`, {
        method: 'GET',
    }).then(r => r.json());

export const connectionConfirmation = (body: any) => {
    fetch(`${WABISABI_URL}connection-confirmation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
        .then(r => r.json())
        .then(console.log);
};

export const getZeroCredentials = (body: any) =>
    fetch(`http://127.0.0.1:8081/Cryptography/create-request-for-zero-amount`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(r => r.json());

export const getRealCredentials = (amounts: any[], issuer: any) =>
    fetch(`http://127.0.0.1:8081/Cryptography/create-request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            AmountsToRequest: amounts,
            CredentialIssuerParameters: issuer,
            CredentialsToPresent: [],
        }),
    }).then(r => r.json());

export const handleResponse = (data: any) =>
    fetch(`http://127.0.0.1:8081/Cryptography/handle-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            registrationValidationData: data,
        }),
    }).then(r => r.json());

export const inputRegistration = (body: any) =>
    fetch(`${WABISABI_URL}input-registration`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(r => r.json());

export const outputRegistration = () => {
    fetch(`${WABISABI_URL}output-registration`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roundId: {},
            script: {
                paymentScript: 'string',
                hash: {
                    scriptPubKey: 'string',
                },
                witHash: {
                    hashForLookUp: {
                        scriptPubKey: 'string',
                    },
                    scriptPubKey: 'string',
                },
            },
            amountCredentialRequests: {},
            vsizeCredentialRequests: {},
        }),
    })
        .then(r => r.json())
        .then(console.log);
};

export const credentialIssuance = () => {
    fetch(`${WABISABI_URL}credential-issuance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roundId: {},
            realAmountCredentialRequests: {},
            realVsizeCredentialRequests: {},
            zeroAmountCredentialRequests: {},
            zeroVsizeCredentialsRequests: {},
        }),
    })
        .then(r => r.json())
        .then(console.log);
};

export const inputUnregistration = () => {
    fetch(`${WABISABI_URL}input-unregistration`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roundId: {},
            aliceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
    })
        .then(r => r.json())
        .then(console.log);
};

export const transactionSignature = () => {
    fetch(`${WABISABI_URL}transaction-signature`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roundId: {},
            inputWitnessPairs: [
                {
                    inputIndex: 0,
                    witness: {},
                },
            ],
        }),
    })
        .then(r => r.json())
        .then(console.log);
};

export const readyToSign = () => {
    fetch(`${WABISABI_URL}ready-to-sign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roundId: {},
            aliceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
    })
        .then(r => r.json())
        .then(console.log);
};
