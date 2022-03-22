import { networks, address, script as bscript } from '@trezor/utxo-lib';
import * as coordinator from '../coordinator';
import * as middleware from '../middleware';
import * as utils from '../utils';
import { Arena, AlicePhase } from '../types';

const prepareTx = async (arena: Arena) => {
    const { round, inputs: myInputsInRound } = arena;
    const registeredInputs = utils.getEvents('InputAdded', round.coinjoinState.events); // round.coinjoinState.events.filter(e => e.Type === 'InputAdded');
    // const myInputsInRound = coinjoin.rounds.filter(alice => alice.roundId === round.id);

    const inputs = registeredInputs
        .sort((a, b) => utils.sortVinVout(a.coin.txOut, b.coin.txOut))
        .map(input => {
            const { index, hash } = utils.readOutpoint(input.coin.outpoint);
            const lc = Buffer.from(input.coin.outpoint, 'hex');
            const internal = myInputsInRound.find(
                a => Buffer.from(a.outpoint, 'hex').compare(lc) === 0,
            );
            if (internal) {
                return {
                    outpoint: internal.outpoint,
                    address_n: internal.path,
                    prev_hash: hash,
                    prev_index: index,
                    amount: input.coin.txOut.value,
                    // script_type: 'SPENDTAPROOT',
                    script_type: internal.type === 'taproot' ? 'SPENDTAPROOT' : 'SPENDWITNESS',
                } as const;
            }

            return {
                path: undefined,
                amount: input.coin.txOut.value,
                prev_hash: hash,
                prev_index: index,
                script_type: 'EXTERNAL',
                script_pubkey: `0014${input.coin.txOut.scriptPubKey.split(' ')[1]}`,
                ownership_proof: input.coin.ownershipProof,
                commitment_data: round.commitmentData,
            } as const;
        });

    console.warn('inputs', inputs);

    const registeredOutputs = utils.mergePubkeys(
        utils.getEvents('OutputAdded', round.coinjoinState.events),
    );
    const myOutputsInRound = myInputsInRound.flatMap(i => i.outputs);

    const outputs = registeredOutputs
        .sort((a, b) => utils.sortVinVout(a.output, b.output))
        .map(({ output }) => {
            const my = myOutputsInRound.find(o => output.scriptPubKey === o.scriptPubKey);

            if (my) {
                return {
                    address_n: my.path,
                    amount: output.value,
                    script_type:
                        myInputsInRound[0].type === 'taproot' ? 'PAYTOTAPROOT' : 'PAYTOWITNESS',
                    payment_req_index: 0,
                } as const;
            }

            const [OP, hash] = output.scriptPubKey.split(' ');
            const script = bscript.fromASM(`OP_${OP} ${hash}`);
            const destination = address.fromOutputScript(script, networks.regtest);

            return {
                address: destination,
                amount: output.value,
                script_type: 'PAYTOADDRESS',
                payment_req_index: 0,
            } as const;
        });

    // TODO: move this to coordinator
    const changeAddresses = outputs.flatMap(o => {
        if (o.address_n) {
            const my = myOutputsInRound.find(myo => myo.path === o.address_n);
            return my.address;
        }
        return [];
    });

    const paymentRequest = await middleware.getPaymentRequest(
        outputs.map(o => ({ ...o, address_n: null })),
        changeAddresses,
    );

    console.log(
        'outputs',
        outputs.map(i => ({ ...i, amount: i.amount.toString() })),
    );

    return {
        inputs,
        outputs,
        paymentRequest,
    };
};

export const transactionSigning = async (arena: Arena): Promise<Arena> => {
    console.log('...transactionSigning');
    const inputsWithoutWitness = arena.inputs
        .filter(i => !i.witness)
        .map(i => ({ ...i, phase: AlicePhase.WaitingForWitness }));
    if (inputsWithoutWitness.length > 0) {
        const inputs = arena.inputs.map(i => ({ ...i, phase: AlicePhase.WaitingForWitness }));
        const txData = await prepareTx(arena);
        return {
            round: {
                ...arena.round,
                txData,
            },
            inputs,
        };
    }

    const inputs = await Promise.all(
        arena.inputs.map(input =>
            coordinator.transactionSignature(input).then(() => ({
                ...input,
                phase: AlicePhase.Ended,
            })),
        ),
    );
    return {
        round: arena.round,
        inputs,
    };
};
