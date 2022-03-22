import { createAlice } from './alice';

export interface Account {
    descriptor: string;
    network: any;
    type: 'p2sh' | 'taproot';
    addresses: any[];
    utxos: any[];
}

export const createAccount = (a: any) => {
    console.log('createAccount', a);
    a.inputs = a.utxo.map(utxo =>
        createAlice(
            { type: a.accountType, ...utxo },
            a.addresses!.change.filter(ad => !ad.transfers),
        ),
    );

    return a;
};

export const analyzeAccount = () => {};

export class Account {
    constructor(a: any) {
        this.descriptor = a.descriptor;
        this.network = a.network;
        this.type = a.type;
        this.addresses = a.addresses;
        this.utxos = a.utxos;
    }

    update(a: any) {
        this.addresses = a.address;
        this.utxos = a.utxos;
    }
}
