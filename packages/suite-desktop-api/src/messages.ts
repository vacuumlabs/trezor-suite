import { ExtractUndefined } from './methods';

export type SuiteThemeVariant = 'light' | 'dark' | 'system';

export interface Handshake {
    theme: SuiteThemeVariant;
    tor: boolean;
    userDir: string;
}

export interface UpdateInfo {
    version: string;
    releaseDate: string;
    isManualCheck?: boolean;
    downloadedFile?: string;
    prerelease?: boolean;
    changelog?: string;
}

export type UpdateProgress = Partial<{
    total: number;
    delta: number;
    transferred: number;
    percent: number;
    bytesPerSecond: number;
    verifying: boolean;
}>;

export type InvokeResult<Payload = undefined> = ExtractUndefined<Payload> extends undefined
    ? { success: true; payload?: Payload } | { success: false; error: string; code?: string }
    : { success: true; payload: Payload } | { success: false; error: string; code?: string };
