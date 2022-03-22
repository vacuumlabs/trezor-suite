import { payments, networks } from '@trezor/utxo-lib';
import { getOutpoint } from './utils';
import { Alice, AlicePhase, Utxo, Address, Arena, RoundPhase } from './types';

const getScriptPubKey = (address: string, type?: string) => {
    // OP_1: 51
    const scriptPubKey =
        type === 'taproot'
            ? `1 ${payments
                  .p2tr({
                      address,
                      network: networks.regtest,
                  })
                  .hash?.toString('hex')}`
            : `0 ${payments
                  .p2wpkh({
                      address,
                      network: networks.regtest,
                  })
                  .hash?.toString('hex')}`;
    return scriptPubKey;
};

export const createAlice = (utxo: Utxo, addresses: Address[]): Alice => {
    let inputSize = 68;
    let outputSize = 31;
    if (utxo.type === 'taproot') {
        inputSize = 58;
        outputSize = 43;
    }

    return {
        type: utxo.type,
        phase: 0,
        path: utxo.path,
        outpoint: getOutpoint(utxo),
        amount: utxo.amount,
        inputSize,
        outputSize,
        outputAddresses: addresses.map(a => ({
            ...a,
            scriptPubKey: getScriptPubKey(a.address, utxo.type),
        })),
    };
};

export const getOwnershipProofRequests = (arenas: Arena[]) =>
    arenas.flatMap(a =>
        a.inputs
            .filter(i => i.phase === AlicePhase.WaitingForOwnershipProof)
            .map(i => ({
                roundId: a.round.id,
                path: i.path,
            })),
    );

export const getArenaRequests = (arenas: Arena[]) => {
    const txs = arenas.flatMap(a => {
        if (a.round.phase === RoundPhase.InputRegistration) {
            const payload = a.inputs
                .filter(i => !i.ownershipProof)
                .map(i => ({
                    path: i.path,
                }));
            return { event: 'ownership', payload };
        }

        if (a.round.phase === RoundPhase.TransactionSigning) {
            const payload = a.inputs
                .filter(i => i.phase === AlicePhase.WaitingForWitness)
                .map(i => ({
                    roundId: a.round.id,
                    path: i.path,
                }));
            return { event: 'witness', payload };
        }

        return [];
    });
    return txs;
};

export class Alice1 {
    type: 'p2222' | 'Taproot';
    phase = 0;
    path: string;
    outpoint: string;
    amount: number;
    inputSize: number;
    outputSize: number;

    constructor(utxo: any) {
        this.type = '';
        this.phase = 0;
        this.path = utxo.path;
        this.outpoint = getOutpoint(utxo);
        this.amount = utxo.amount;
        this.inputSize = 1;
        this.outputSize = 1;
        // outputAddresses: addresses.map(a => ({
        //     ...a,
        //     scriptPubKey: getScriptPubKey(a.address, utxo.type),
        // })),
    }

    toString() {
        return {
            type: this.type,
        };
    }
}
