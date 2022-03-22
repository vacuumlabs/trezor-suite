import type { Round, Alice, CoinjoinStateEvent } from '@wallet-types/coinjoin';

const reverseBuffer = (buf: Buffer) => {
    const copy = Buffer.alloc(buf.length);
    buf.copy(copy);
    [].reverse.call(copy);
    return copy;
};

export const getEvents = <T extends CoinjoinStateEvent['Type']>(
    type: T,
    events: CoinjoinStateEvent[],
) => events.filter(e => e.Type === type) as Extract<CoinjoinStateEvent, { Type: T }>[];

export const getOutpoint = (utxo: any) => {
    const buf = Buffer.allocUnsafe(36);
    const b = new bufferutils.BufferWriter(buf);
    b.writeSlice(reverseBuffer(Buffer.from(utxo.txid, 'hex')));
    b.writeUInt32(utxo.vout);
    return buf.toString('hex');
};

export const readOutpoint = (outpoint: string) => {
    const buf = Buffer.from(outpoint, 'hex');
    const b = new bufferutils.BufferReader(buf);
    const hash = bufferutils.reverseBuffer(b.readSlice(32)).toString('hex');
    const index = b.readUInt32();
    return { index, hash };
};

// WalletWasabi/WalletWasabi/Helpers/ByteArrayComparer.cs
const compareByteArray = (left: Buffer, right: Buffer) => {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    const min = Math.min(left.length, right.length);
    for (let i = 0; i < min; i++) {
        if (left[i] < right[i]) return -1;
        if (left[i] > right[i]) return 1;
    }
    return left.length - right.length;
};

type VinVout = {
    scriptPubKey: string;
    value: number;
};

// WalletWasabi/WalletWasabi/WabiSabi/Models/MultipartyTransaction/SigningState.cs
export const sortVinVout = (a: VinVout, b: VinVout) => {
    if (a.value === b.value)
        return compareByteArray(Buffer.from(a.scriptPubKey), Buffer.from(b.scriptPubKey));
    // if (a.value === b.value) return a.scriptPubKey.length - b.scriptPubKey.length;
    return b.value - a.value;
};
