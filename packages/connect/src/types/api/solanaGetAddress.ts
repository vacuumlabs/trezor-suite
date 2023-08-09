import type { Params, BundledParams, Response } from '../params';
import type { SolanaGetAddress, SolanaAddress } from './solana';

export declare function solanaGetAddress(params: Params<SolanaGetAddress>): Response<SolanaAddress>;
export declare function solanaGetAddress(
    params: BundledParams<SolanaGetAddress>,
): Response<SolanaAddress[]>;
