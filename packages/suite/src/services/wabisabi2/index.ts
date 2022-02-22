// proxy
import { bufferutils } from '@trezor/utxo-lib'; // TODO: in connect getOwnerShipProof
import type {
    Round,
    Alice,
    CoinjoinStateEvent,
    IssuerParameter,
    Credentials,
} from '@wallet-types/coinjoin';

const WABISABI_URL = 'http://127.0.0.1:8081/WabiSabi/'; // proxy
const CRYPTOGRAPHY_URL = 'http://127.0.0.1:8081/Cryptography/';

export enum Phase {
    InputRegistration = 0,
    ConnectionConfirmation = 1,
    OutputRegistration = 2,
    TransactionSigning = 3,
    Ended = 4,
}

interface EventListener {
    (type: 'status', data: Round[]): void;
    (type: 'get-ownership', data: 1): void;
    (type: 'sign-transaction', data: boolean): void;
    (type: string, data: any): void;
}

// utils
const reverseBuffer = (buf: Buffer) => {
    const copy = Buffer.alloc(buf.length);
    buf.copy(copy);
    [].reverse.call(copy);
    return copy;
};

export const getEvents = <T extends CoinjoinStateEvent['Type']>(
    type: T,
    events: CoinjoinStateEvent[],
) => events.filter(e => e.Type === type) as Extract<CoinjoinStateEvent, { Type: T }>[];

const getStatus = () =>
    fetch(`${WABISABI_URL}status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roundCheckpoints: [] }),
    })
        .then(r => r.json())
        .then(r => r.roundStates);

export const post = (url: string, body: any, parse = true) =>
    fetch(`${WABISABI_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(r => (parse ? r.json() : r));

export const CRYPTOGRAPHY = {
    'create-request': 'create-request',
    'zero-amount-request': 'create-request-for-zero-amount',
    'handle-response': 'handle-response',
    'decompose-amounts': 'decompose-amounts',
} as const;

export async function crypto(
    url: 'zero-amount-request',
    body: { credentialIssuerParameters: IssuerParameter },
): Promise<Credentials>;
export async function crypto(url: 'create-request', body: any): Promise<Credentials>;
export async function crypto(url: 'handle-response', body: any): Promise<any[]>;
export async function crypto(url: 'decompose-amounts', body: any): Promise<number[]>;

// export async function crypto(url: 'create-request-for-zero-amount', body: any): Promise<any>;
export async function crypto(url: keyof typeof CRYPTOGRAPHY, body: any) {
    const request = await fetch(`${CRYPTOGRAPHY_URL}${CRYPTOGRAPHY[url]}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const json = await request.json();
    if (url === 'create-request') {
        return json.realCredentialsRequestData;
    }
    if (url === 'zero-amount-request') {
        return json.zeroCredentialsRequestData;
    }
    if (url === 'handle-response') {
        return json.credentials;
    }
    if (url === 'decompose-amounts') {
        return json.outputAmounts;
    }
    return json;
}

export declare interface WabiSabiClient {
    statusTimeout?: ReturnType<typeof setTimeout>;
    listener?: EventListener;
}

type PendingAlice = {
    input: string;
    ownershipRequested?: boolean;
    ownershipProof?: string;
};

export class WabiSabiClient {
    enabled = false;
    pending: PendingAlice[] = [];
    registered: Alice[] = [];
    status: Round[] = [];

    private async getStatus() {
        if (!this.enabled) return;

        // stop timeout
        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = undefined;

        try {
            this.status = await getStatus();
        } catch (e) {
            this.status = [];
        }

        this.emit('status', this.status);

        if (this.enabled) {
            this.analyzeStatus();
            // retry pending inputs
            this.pending.forEach(i => this.tryRegisterInput(i));

            const timeout = 5000; // TODO: calc optimal timeout
            this.statusTimeout = setTimeout(() => this.getStatus(), timeout);
        }
    }

    private updateRegistered(alice: Alice) {
        this.registered = this.registered.filter(r => r.aliceId !== alice.aliceId).concat(alice);
        return alice;
    }

    private analyzeStatus() {
        // Check if pending round did change
        const pending = this.registered.filter(r => r.pendingPhase);
        // console.warn('PENDING', pending);
        pending.forEach(alice => {
            const current = this.status.find(s => s.id === alice.roundId);
            // console.warn('CURRENT', current);
            if (current && current.phase >= alice.pendingPhase) {
                if (current.phase > alice.pendingPhase) {
                    console.warn('---> ERRORO: unsynced');
                    this.emit('round-error', {});
                } else if (alice.pendingPhase === Phase.ConnectionConfirmation) {
                    const payload = this.updateRegistered({
                        ...alice,
                        pendingPhase: Phase.OutputRegistration,
                    });
                    this.emit('connection-confirmation', payload);
                    // dispatch({
                    //     type: COINJOIN.CONNECTION_CONFIRMATION,
                    //     payload: {
                    //         ...alice,
                    //         pendingPhase: Phase.OutputRegistration,
                    //     },
                    // });
                } else if (alice.pendingPhase === Phase.OutputRegistration) {
                    const payload = this.updateRegistered({
                        ...alice,
                        ownershipProofs: current.coinjoinState.ownershipProofs,
                        pendingPhase: Phase.OutputRegistration,
                    });
                    this.emit('output-registration', payload);
                    // console.warn('OWNERS', current.coinjoinState.ownershipProofs);
                    // dispatch(registerOutputs(alice, current.coinjoinState.ownershipProofs));
                } else if (alice.pendingPhase === Phase.TransactionSigning) {
                    // console.warn('SIGNING PHASE!!!!!');
                    // dispatch(sign(alice));
                    const payload = this.updateRegistered({
                        ...alice,
                        pendingPhase: Phase.Ended,
                    });
                    this.emit('sing-tx', payload);
                } else if (alice.pendingPhase === Phase.Ended) {
                    console.warn('END!!!!!');
                    this.emit('round-success', alice);
                    // remove registration
                    this.registered = this.registered.filter(r => r.aliceId !== alice.aliceId);
                    // this.emit('round-error', {});
                }
            }
        });
    }

    private emit(...args: Parameters<EventListener>) {
        // private emit(...args: any) {
        if (this.listener) {
            this.listener(...args);
        }
    }

    enable() {
        this.enabled = true;
        this.getStatus();
    }

    disable() {
        this.enabled = false;
        clearTimeout(this.statusTimeout);
        this.statusTimeout = undefined;
        this.pending = [];
        this.registered = [];
    }

    // find best round for input
    tryRegisterInput(candidate: PendingAlice) {
        if (this.pending.find(i => i.input === candidate.input && i.ownershipRequested)) {
            return; // already requested
        }

        const round = this.status.find(
            r =>
                r.phase === Phase.InputRegistration &&
                new Date(r.inputRegistrationEnd).getTime() - Date.now() > 20000,
        );

        if (round) {
            this.pending = this.pending
                .filter(i => i.input !== candidate.input)
                .concat({
                    ...candidate,
                    ownershipRequested: true,
                });
            this.emit('get-ownership', {
                ...candidate,
                roundId: round.id,
            });
        } else {
            this.pending = this.pending.filter(i => i.input !== candidate.input).concat(candidate);
            this.emit('pending-registration', this.pending);
        }
    }

    unregisterInput(candidate: PendingAlice) {
        this.pending = this.pending.filter(i => i.input !== candidate.input);
    }

    async registerInput(candidate: Alice) {
        const round = this.status.find(r => r.id === candidate.roundId);
        if (!round) return;

        const { zeroCredentialsRequestData: zeroAmountCredentials } = await crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
            },
        );

        const { zeroCredentialsRequestData: zeroVsizeCredentials } = await crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            },
        );

        const registrationData = await post('input-registration', {
            roundId: round.id,
            input: candidate.input,
            ownershipProof: candidate.ownershipProofs,
            zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
            zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
        });

        // Calculate data used in next step: coinfirmation

        const { credentials: amountCredentialsToPresent } = await crypto('handle-response', {
            credentialIssuerParameters: round.amountCredentialIssuerParameters,
            registrationResponse: registrationData.amountCredentials,
            registrationValidationData: zeroAmountCredentials.credentialsResponseValidation,
        });

        const { credentials: vsizeCredentialsToPresent } = await crypto('handle-response', {
            credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            registrationResponse: registrationData.vsizeCredentials,
            registrationValidationData: zeroVsizeCredentials.credentialsResponseValidation,
        });

        // const amount = Number.parseInt(input.amount, 10) - (69 * round.feeRate) / 1000;
        const amount = Number.parseInt(candidate.amount, 10) - (69 * round.feeRate) / 1000;

        const { realCredentialsRequestData: realAmountCredentials } = await crypto(
            'create-request',
            {
                amountsToRequest: [amount],
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
                maxCredentialValue: round.maxAmountCredentialValue,
                credentialsToPresent: amountCredentialsToPresent,
            },
        );
        const { realCredentialsRequestData: realVsizeCredentials } = await crypto(
            'create-request',
            {
                amountsToRequest: [round.maxVsizeAllocationPerAlice - 69],
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
                maxCredentialValue: round.maxVsizeCredentialValue,
                credentialsToPresent: vsizeCredentialsToPresent,
            },
        );

        const arena = {
            ...candidate,
            registrationData,
            realAmountCredentials,
            realVsizeCredentials,
        };

        this.emit('register-input', arena);
    }
}

// using System.Collections.Generic;

// namespace WalletWasabi.Helpers;

// public class ByteArrayComparer : IComparer<byte[]>
// {
// 	public static readonly ByteArrayComparer Comparer = new();

// 	public int Compare(byte[]? x, byte[]? y)
// 	{
// 		static int InternalCompare(byte[] left, byte[] right)
// 		{
// 			var min = left.Length < right.Length ? left.Length : right.Length;
// 			for (var i = 0; i < min; i++)
// 			{
// 				if (left[i] < right[i])
// 				{
// 					return -1;
// 				}
// 				if (left[i] > right[i])
// 				{
// 					return 1;
// 				}
// 			}
// 			return left.Length.CompareTo(right.Length);
// 		}

// 		return (x, y) switch
// 		{
// 			(null, null) => 0,
// 			(null, _) => 1,
// 			(_, null) => -1,
// 			({ } left, { } right) => InternalCompare(left, right)
// 		};
// 	}
// }

export const getOutpoint = (utxo: any) => {
    const buf = Buffer.allocUnsafe(36);
    const b = new bufferutils.BufferWriter(buf);
    b.writeSlice(reverseBuffer(Buffer.from(utxo.txid, 'hex')));
    b.writeUInt32(utxo.vout);
    return buf.toString('hex');
};

export const readOutpoint = (outpoint: string) => {
    const buf = Buffer.from(outpoint, 'hex');
    const b = new bufferutils.BufferReader(buf);
    const hash = bufferutils.reverseBuffer(b.readSlice(32)).toString('hex');
    const index = b.readUInt32();
    return { index, hash };
};

// WalletWasabi/WalletWasabi/Helpers/ByteArrayComparer.cs
const compareByteArray = (left: Buffer, right: Buffer) => {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    const min = Math.min(left.length, right.length);
    for (let i = 0; i < min; i++) {
        if (left[i] < right[i]) return -1;
        if (left[i] > right[i]) return 1;
    }
    return left.length - right.length;
};

type VinVout = {
    scriptPubKey: string;
    value: number;
};

// WalletWasabi/WalletWasabi/WabiSabi/Models/MultipartyTransaction/SigningState.cs
export const sortVinVout = (a: VinVout, b: VinVout) => {
    if (a.value === b.value)
        return compareByteArray(Buffer.from(b.scriptPubKey), Buffer.from(a.scriptPubKey));
    // if (a.value === b.value)
    //     return a.scriptPubKey.length - b.scriptPubKey.length;
    return b.value - a.value;
};
