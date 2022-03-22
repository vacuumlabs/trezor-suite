import type {
    Round,
    RoundPhase,
    ZeroCredentials,
    RegistrationData,
    Credentials,
} from './coordinator';

export enum AlicePhase {
    WaitingForRound = 0,
    WaitingForOwnershipProof = 1,
    InputRegistration = 2,
    ConnectionConfirmation = 3,
    OutputRegistration = 4,
    WaitingForWitness = 5,
    TransactionSigning = 6,
    Ended = 7,
}

export interface ArenaRound extends Round {
    inputs: string[]; // list of inputs (outpoints) registered for this round
    commitmentData?: string; // commitment data used for ownership proof and witness requests
    paymentRequest?: any;
    transactionData?: string;
}

export interface Arena {
    round: ArenaRound;
    inputs: Alice[];
}

export interface AliceBase {
    phase: AlicePhase;
    path: string;
    outpoint: string;
    amount: number;
    inputSize: number;
    outputSize: number;
    outputAddresses: (Address & { scriptPubKey: string })[];
    ownershipProof?: string;
    // new
    confirmedAmountCredentials: Credentials[];
    confirmedVsizeCredentials: Credentials[];
}

export interface AliceCandidate extends AliceBase {
    phase: AlicePhase.WaitingForRound | AlicePhase.WaitingForOwnershipProof;
    roundId?: undefined;
    aliceId?: string;
}

export interface AliceRegistered extends AliceBase {
    phase: AlicePhase.InputRegistration;
    aliceId: string;
    roundId: string;
    ownershipProof: string;
    availableAmount: number;
    realAmountCredentials: ZeroCredentials;
    realVsizeCredentials: ZeroCredentials;
}

export interface AliceConfirmed extends Omit<AliceRegistered, 'phase'> {
    phase: AlicePhase.ConnectionConfirmation | AlicePhase.WaitingForWitness;
    zeroAmountCredentials: ZeroCredentials;
    zeroVsizeCredentials: ZeroCredentials;
    confirmationData: RegistrationData;
}

export type Utxo = {
    type?: string; // taproot | p2sh ...
    path: string; // derivation path
    amount: number;
    txid: string;
    vout: number;
};

export type Address = {
    path: string;
    address: string;
};

export type Alice = AliceCandidate | AliceRegistered | AliceConfirmed;

export interface Alice0 {
    roundId: string;
    outpoint: string;
    aliceId: string;
    input: string;
    inputSize: number;
    outputSize: number;
    addresses: { address: string; path: string }[];
    outputs: { scriptPubKey: string; path: string; address: string }[];
    inputHash: string;
    amount: number;
    pendingPhase?: RoundPhase;
    commitmentData: string;
    utxo: Utxo;
    // round: Round;
    registrationData: any;
    confirmationData: any;
    zeroAmountCredentials: ZeroCredentials;
    realAmountCredentials: ZeroCredentials;
    zeroVsizeCredentials: ZeroCredentials;
    realVsizeCredentials: ZeroCredentials;
}
