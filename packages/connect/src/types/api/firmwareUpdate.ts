import type { Params, Response } from '../params';

export interface FirmwareUpdateBinary {
    binary: ArrayBuffer;
}

export interface FirmwareUpdate {
    version: number[];
    btcOnly?: boolean;
    baseUrl?: string;
    intermediary?: boolean;
}

export interface FirmwareUpdated {
    hash: string;
    challenge: string;
}

export declare function firmwareUpdate(params: Params<FirmwareUpdate>): Response<FirmwareUpdated>;
export declare function firmwareUpdate(
    params: Params<FirmwareUpdateBinary>,
): Response<FirmwareUpdated>;
