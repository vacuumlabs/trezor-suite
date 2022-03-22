import { bufferutils, networks, address, script as bscript } from '@trezor/utxo-lib';
import type { CoinjoinStateEvent, Credentials } from './types';

export const getEvents = <T extends CoinjoinStateEvent['Type']>(
    type: T,
    events: CoinjoinStateEvent[],
) => events.filter(e => e.Type === type) as Extract<CoinjoinStateEvent, { Type: T }>[];

export const getCommitmentData = (id: string) => {
    const name = Buffer.from('CoinJoinCoordinatorIdentifier');
    const len = Buffer.allocUnsafe(1);
    len.writeUInt8(name.length, 0);
    return Buffer.concat([len, name, Buffer.from(id, 'hex')]).toString('hex');
};

export const getOutpoint = (utxo: any) => {
    const buf = Buffer.allocUnsafe(36);
    const b = new bufferutils.BufferWriter(buf);
    b.writeSlice(bufferutils.reverseBuffer(Buffer.from(utxo.txid, 'hex')));
    b.writeUInt32(utxo.vout);
    return buf.toString('hex');
};

export const compareOutpoint = (a: string, b: string) =>
    Buffer.from(a, 'hex').compare(Buffer.from(b, 'hex')) === 0;

export const sumCredentials = (c: Credentials[]) => c[0].value + c[1].value;

export const getExternalOutputSize = (scriptPubKey: string) => {
    const [OP] = scriptPubKey.split(' ');
    return OP === '0' ? 31 : 43;
};

export const getCoordinatorFee = () => {};

export const getExternalOutputAddress = (scriptPubKey: string) => {
    const [OP, hash] = scriptPubKey.split(' ');
    const script = bscript.fromASM(`OP_${OP} ${hash}`);
    return address.fromOutputScript(script, networks.regtest);
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
    return b.value - a.value;
};

// WalletWasabi/WalletWasabi/WabiSabi/Models/MultipartyTransaction/SigningState.cs
// merge outputs with the same scriptPubKey's
export const mergePubkeys = (outputs: Extract<CoinjoinStateEvent, { Type: 'OutputAdded' }>[]) =>
    outputs.reduce((a, item) => {
        const duplicates = outputs.filter(o => o.output.scriptPubKey === item.output.scriptPubKey);
        if (duplicates.length > 1) {
            if (a.find(o => o.output.scriptPubKey === item.output.scriptPubKey)) return a;
            const value = duplicates.reduce((a, b) => a + b.output.value, 0);
            return a.concat({ ...item, output: { ...item.output, value } });
        }
        return a.concat(item);
    }, [] as any[]);
