import fetch from 'cross-fetch';
import type {
    Round,
    Alice,
    ZeroCredentials,
    RealCredentials,
    ConfirmationData,
    IssuanceData,
    RegistrationData,
} from './types';

const WABISABI_URL = 'http://127.0.0.1:8081/WabiSabi/'; // proxy

const post = <R = void>(url: string, body: any, parse = true): Promise<R> =>
    fetch(`${WABISABI_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify(body),
    }).then(r => {
        if (r.status === 200) {
            return parse ? r.json() : r;
        }
        if (r.status === 500) {
            return r.json().then(json => {
                throw new Error(json.errorCode);
            });
        }
        throw new Error(`${url} ${r.statusText}`);
    });

export const getStatus = () =>
    post<{ roundStates: Round[] }>('status', {
        roundCheckpoints: [],
    }).then(r => r.roundStates);

export const inputRegistration = (
    roundId: string,
    input: string,
    ownershipProof: string,
    zeroAmountCredentials: ZeroCredentials,
    zeroVsizeCredentials: ZeroCredentials,
) =>
    post<RegistrationData>('input-registration', {
        roundId,
        input,
        ownershipProof,
        zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
        zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
    });

export const inputUnregistration = (alice: Alice) =>
    post(
        'input-unregistration',
        {
            roundId: alice.roundId,
            aliceId: alice.aliceId,
        },
        false,
    );

export const connectionConfirmation = (
    alice: Alice,
    realAmountCredentials: RealCredentials,
    realVsizeCredentials: RealCredentials,
    zeroAmountCredentials: ZeroCredentials,
    zeroVsizeCredentials: ZeroCredentials,
) =>
    post<ConfirmationData>('connection-confirmation', {
        roundId: alice.roundId,
        aliceId: alice.aliceId,
        zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
        realAmountCredentialRequests: realAmountCredentials.credentialsRequest,
        zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
        realVsizeCredentialRequests: realVsizeCredentials.credentialsRequest,
    });

export const credentialIssuance = (
    round: Round,
    realAmountCredentials: RealCredentials,
    realVsizeCredentials: RealCredentials,
    zeroAmountCredentials: ZeroCredentials,
    zeroVsizeCredentials: ZeroCredentials,
) =>
    post<IssuanceData>('credential-issuance', {
        roundId: round.id,
        realAmountCredentialRequests: realAmountCredentials.credentialsRequest,
        realVsizeCredentialRequests: realVsizeCredentials.credentialsRequest,
        zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
        zeroVsizeCredentialsRequests: zeroVsizeCredentials.credentialsRequest,
    });

export const outputRegistration = (
    round: Round,
    output: { scriptPubKey: string },
    amountCredentials: ZeroCredentials,
    vsizeCredentials: ZeroCredentials,
) =>
    post(
        'output-registration',
        {
            roundId: round.id,
            script: output.scriptPubKey,
            amountCredentialRequests: amountCredentials.credentialsRequest,
            vsizeCredentialRequests: vsizeCredentials.credentialsRequest,
        },
        false,
    );

export const readyToSign = (alice: Alice) =>
    post(
        'ready-to-sign',
        {
            roundId: alice.roundId,
            aliceId: alice.aliceId,
        },
        false,
    );

export const transactionSignature = (alice: Alice) =>
    post(
        'transaction-signature',
        {
            roundId: alice.roundId,
            inputIndex: alice.witnessIndex,
            witness: alice.witness,
        },
        false,
    );
