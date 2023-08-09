import type { PROTO } from '../../../constants';
import type { GetAddress, Address, GetPublicKey, PublicKey } from '../../params';

// solanaGetPublicKey

export interface SolanaGetPublicKey extends GetPublicKey {}

export interface SolanaPublicKey extends PublicKey {
    node: PROTO.HDNodeType;
}

// solanaGetAddress

export interface SolanaGetAddress extends GetAddress {}

export interface SolanaAddress extends Address {}

// solanaSignTransaction

export interface SolanaSignTransaction {
    signerPath: string | number[];
    serializedTx: string;
}

export interface SolanaSignedTransaction {
    signature: string;
}
