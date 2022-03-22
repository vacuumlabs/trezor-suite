import { Round, Alice, ArenaRound } from '../types';

type A = {
    utxos: {
        outpoint: string;
    }[];
};

export const selectRound = (
    alices: Alice[],
    arenas: ArenaRound[],
    rounds: Round[],
): ArenaRound | void => {
    const registeredInputs = arenas.flatMap(a => a.inputs);
    const availableInputs = alices.filter(a => !registeredInputs.includes(a.outpoint));
    if (!availableInputs.length) return;

    const roundCandidates = rounds.filter(r => r.phase === 0);
    const round = roundCandidates[0];
    if (!round) return;

    const name = Buffer.from('CoinJoinCoordinatorIdentifier');
    const len = Buffer.allocUnsafe(1);
    len.writeUInt8(name.length, 0);
    const commitmentData = Buffer.concat([len, name, Buffer.from(round.id, 'hex')]).toString('hex');

    const arena = arenas.find(r => r.id === round.id);
    const inputs = availableInputs.map(i => i.outpoint).concat(arena ? arena.inputs : []);

    return {
        ...arena,
        ...round,
        commitmentData,
        inputs,
    };
};
