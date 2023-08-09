import type { Params, BundledParams, Response } from '../params';
import type { SolanaGetPublicKey, SolanaPublicKey } from './solana';

export declare function solanaGetPublicKey(
    params: Params<SolanaGetPublicKey>,
): Response<SolanaPublicKey>;
export declare function solanaGetPublicKey(
    params: BundledParams<SolanaGetPublicKey>,
): Response<SolanaPublicKey[]>;
