import type { PROTO } from '../../../constants';
import type { GetAddress, Address, GetPublicKey, PublicKey } from '../../params';

// solanaGetPublicKey

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SolanaGetPublicKey extends GetPublicKey {}

export interface SolanaPublicKey extends PublicKey {
    node: PROTO.HDNodeType;
}

// solanaGetAddress

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SolanaGetAddress extends GetAddress {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SolanaAddress extends Address {}

// solanaSignTransaction

export interface SolanaSignTransaction {
    signerPath: string | number[];
    serializedTx: string;
}

export interface SolanaSignedTransaction {
    signature: string;
}
