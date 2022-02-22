export type CoinjoinStateEvent =
    | {
          Type: 'InputAdded';
          coin: {
              outpoint: string;
              txOut: {
                  scriptPubKey: string; // "0 f23290d9f9be3d13a315b6febe29fc0786d34c96",
                  value: number;
              };
              ownershipProof: string;
          };
      }
    | {
          Type: 'OutputAdded';
          output: {
              scriptPubKey: string; // '0 76215d74689b52e41c1636e46df04bde793be57a';
              value: number;
          };
      };

export interface IssuerParameter {
    cw: string;
    i: string;
}

type AllowedRange = { min: number; max: number };

export interface Round {
    id: string;
    phase: number;
    feeRate: number;
    coordinationFeeRate: {
        rate: number;
        plebsDontPayThreshold: number;
    };
    amountCredentialIssuerParameters: IssuerParameter;
    vsizeCredentialIssuerParameters: IssuerParameter;
    coinjoinState: {
        Type: string;
        isFullySigned: boolean;
        events: CoinjoinStateEvent[];
        parameters: {
            allowedInputAmounts: AllowedRange;
            allowedInputScriptTypes: ('P2WPKH' | 'Taproot')[];
            allowedOutputAmounts: AllowedRange;
            allowedOutputScriptTypes: ('P2WPKH' | 'Taproot')[];
            coordinationFeeRate: {
                rate: number;
                plebsDontPayThreshold: number;
            };
        };
    };
    inputRegistrationStart: string;
    inputRegistrationEnd: string;
    outputRegistrationTimeout: string;
    transactionSigningTimeout: string;
    maxAmountCredentialValue: number;
    maxVsizeCredentialValue: number;
    maxVsizeAllocationPerAlice: number;
    wasTransactionBroadcast: boolean;
}

export interface Credentials {
    credentialsRequest: {
        delta: number;
        presented: any[];
        requested: any[];
        proofs: any[];
    };
    credentialsResponseValidation: {
        transcript: any;
        presented: any[];
        requested: any[];
    };
}

export interface Alice {
    outpoint: string;
    roundId: string;
    aliceId: string;
    input: string;
    inputSize: number;
    outputSize: number;
    addresses: { address: string; path: string }[];
    outputs: { scriptPubKey: string; path: string; address: string }[];
    inputHash: string;
    amount: number;
    pendingPhase: number;
    commitmentData: string;
    utxo: any;
    round: Round;
    registrationData: any;
    confirmationData: any;
    zeroAmountCredentials: Credentials;
    realAmountCredentials: Credentials;
    zeroVsizeCredentials: Credentials;
    realVsizeCredentials: Credentials;
}

export type WabiSabiUrl = 'a';
