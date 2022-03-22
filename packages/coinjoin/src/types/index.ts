import { AllowedScriptTypes } from './coordinator';

export * from './alice';
export * from './coordinator';

export interface CoinjoinSettings {
    network: 'regtest' | 'test' | 'btc';
    onStatus: () => any;
    onEvent: () => any;
    onRequest: (requests: RequestEvent[]) => Promise<RequestEvent[]>;
    state?: any; // TODO: cache for state (rounds inputs...)
    coordinator?: {
        name: string;
        url: string;
        middleware: string;
    };
}

export interface RegisterAccount {
    type: AllowedScriptTypes;
    network: CoinjoinSettings['network'];
    descriptor: string;
    addresses: any;
    utxos: any[];
    transactions: any[];
}

export interface UnregisterAccount {
    network: CoinjoinSettings['network'];
    descriptor: string;
}

export interface AddInput {
    network: CoinjoinSettings['network'];
    vin: any;
    addresses: any;
}

export interface Account {
    type: AllowedScriptTypes;
    addresses: any[];
    inputs: any[];
}

export type RequestEvent =
    | {
          type: 'ownership';
          round: string;
          inputs: { path: string; outpoint: string }[];
          commitmentData: string;
      }
    | {
          type: 'witness';
          round: string;
          inputs: any[];
          outputs: any[];
          paymentRequest: any;
      };

export type ResolveRequest = { type: 'ownership' } | { type: 'witness' };

export type RequestEventCallback = (response: ResolveRequest[]) => void;
