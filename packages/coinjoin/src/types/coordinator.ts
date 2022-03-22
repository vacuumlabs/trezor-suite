export interface CredentialsResponseValidation {
    transcript: any;
    presented: any[];
    requested: any[];
}

export interface CredentialsRequestData {
    delta: number;
    presented: any[];
    requested: any[];
    proofs: any[];
}

export interface ZeroCredentials {
    credentialsRequest: CredentialsRequestData;
    credentialsResponseValidation: CredentialsResponseValidation;
}

export interface RealCredentials {
    credentialsRequest: CredentialsRequestData;
    credentialsResponseValidation: CredentialsResponseValidation;
}

export interface RealCredentials11 {
    issuedCredentials: { t: string; v: string }[];
    proofs: { publicNonces: string[]; responses: string[] };
}

// response of middleware/handle-response
export interface Credentials {
    value: number;
    randomness: string;
    mac: {
        t: string;
    };
}

export interface IssuerParameter {
    cw: string;
    i: string;
}

export interface IssuanceData {
    realAmountCredentials: ZeroCredentials;
    realVsizeCredentials: ZeroCredentials;
    zeroAmountCredentials: RealCredentials;
    zeroVsizeCredentials: RealCredentials;
}

export interface ConfirmationData {
    realAmountCredentials: RealCredentials;
    realVsizeCredentials: RealCredentials;
    zeroAmountCredentials: RealCredentials;
    zeroVsizeCredentials: RealCredentials;
}

export interface RegistrationData {
    aliceId: string;
    amountCredentials: RealCredentials;
    vsizeCredentials: RealCredentials;
    isPayingZeroCoordinationFee: boolean;
}

export interface CoordinatorFeeRate {
    rate: number;
    plebsDontPayThreshold: number;
}

export type CoinjoinStateEvent =
    | {
          Type: 'RoundCreated';
          roundParameters: {
              network: string;
              miningFeeRate: number;
              coordinationFeeRate: {
                  rate: number;
                  plebsDontPayThreshold: number;
              };
              maxSuggestedAmount: number;
              minInputCountByRound: number;
              maxInputCountByRound: number;
              allowedInputAmounts: AllowedRange;
              allowedOutputAmounts: AllowedRange;
              allowedInputScriptTypes: AllowedScriptTypes[];
              allowedOutputScriptTypes: AllowedScriptTypes[];
              standardInputRegistrationTimeout: string;
              connectionConfirmationTimeout: string;
              outputRegistrationTimeout: string;
              transactionSigningTimeout: string;
              blameInputRegistrationTimeout: string;
              minAmountCredentialValue: number;
              maxAmountCredentialValue: number;
              initialInputVsizeAllocation: number;
              maxVsizeCredentialValue: number;
              maxVsizeAllocationPerAlice: number;
              maxTransactionSize: number;
              minRelayTxFee: number;
          };
      }
    | {
          Type: 'InputAdded';
          coin: {
              outpoint: string;
              txOut: {
                  scriptPubKey: string; // format: "0 f23290d9f9be3d13a315b6febe29fc0786d34c96"
                  value: number;
              };
              ownershipProof: string;
          };
      }
    | {
          Type: 'OutputAdded';
          output: {
              scriptPubKey: string; // format: "0 76215d74689b52e41c1636e46df04bde793be57a"
              value: number;
          };
      };

export interface AllowedRange {
    min: number;
    max: number;
}
export type AllowedScriptTypes = 'p2wpkh' | 'taproot';

export interface CoinjoinState {
    Type: string; // TODO enum?
    events: CoinjoinStateEvent[];
}

export enum RoundPhase {
    InputRegistration = 0,
    ConnectionConfirmation = 1,
    OutputRegistration = 2,
    TransactionSigning = 3,
    Ended = 4,
}

export interface Round {
    id: string;
    blameOf: string;
    phase: RoundPhase;
    endRoundState: number; // TODO: enum?
    amountCredentialIssuerParameters: IssuerParameter;
    vsizeCredentialIssuerParameters: IssuerParameter;
    coinjoinState: CoinjoinState;
    inputRegistrationStart: string;
    inputRegistrationTimeout: string;
    inputRegistrationEnd: string;
}
