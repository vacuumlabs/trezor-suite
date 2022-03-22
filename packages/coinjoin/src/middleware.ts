/* eslint-disable camelcase */
import fetch from 'cross-fetch';
import type {
    AllowedRange,
    IssuerParameter,
    ZeroCredentials,
    RealCredentials,
    Credentials,
    CredentialsResponseValidation,
} from './types';

const MIDDLEWARE_URL = 'http://127.0.0.1:8081/Cryptography/';

const request = (url: string, body: any) =>
    fetch(`${MIDDLEWARE_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // TODO: circuit header
        },
        body: JSON.stringify(body),
    }).then(r => {
        if (r.status === 200) {
            return r.json();
        }
        // console.warn('JEEERORO', r.statusText);
        throw new Error(`${url} ${r.statusText}`);
    });

export const getRealCredentials = async (
    amountsToRequest: number[],
    credentialsToPresent: Credentials[],
    credentialIssuerParameters: IssuerParameter,
    maxCredentialValue: number,
) => {
    const data = await request('create-request', {
        amountsToRequest,
        credentialIssuerParameters,
        maxCredentialValue,
        credentialsToPresent,
    });
    return data.realCredentialsRequestData as RealCredentials;
};

export const getZeroCredentials = async (issuer: IssuerParameter) => {
    const data = await request('create-request-for-zero-amount', {
        credentialIssuerParameters: issuer,
    });
    return data.zeroCredentialsRequestData as ZeroCredentials;
};

export const getCredentials = async (
    credentialIssuerParameters: IssuerParameter,
    registrationResponse: RealCredentials,
    registrationValidationData: CredentialsResponseValidation,
) => {
    const data = await request('handle-response', {
        credentialIssuerParameters,
        registrationResponse,
        registrationValidationData,
    });
    return data.credentials as Credentials[];
};

export const decomposeAmounts = async (
    constants: { feeRate: number; allowedOutputAmounts: AllowedRange },
    outputSize: number,
    availableVsize: number,
    internalAmounts: number[],
    externalAmounts: number[],
) => {
    const data = await request('decompose-amounts', {
        internalAmounts,
        externalAmounts,
        outputSize,
        availableVsize,
        constants,
        strategy: 'minimum_cost',
    });
    return data.outputAmounts as number[];
};

export const getPaymentRequest = (outputs: any, change_addresses: any) =>
    fetch('http://127.0.0.1:8081/payment-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            recipient_name: 'CoinJoinCoordinatorIdentifier',
            outputs,
            change_addresses,
        }),
    }).then(r => r.json());
