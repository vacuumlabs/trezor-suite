import { inputRegistration } from './inputRegistration';
import { connectionConfirmation } from './connectionConfirmation';
import { outputRegistration } from './outputRegistration';
import { transactionSigning } from './transactionSigning';
import * as utils from '../utils';
import { Arena, Round, ArenaRound, RoundPhase, Alice, RequestEvent } from '../types';

export const processArenas = (arenas: Arena[]) =>
    Promise.all(
        arenas.map(arena => {
            const { round, inputs } = arena;
            console.warn('processArenas...', round, inputs);
            if (round.phase === RoundPhase.InputRegistration) {
                return inputRegistration(arena);
            }
            if (round.phase === RoundPhase.ConnectionConfirmation) {
                return connectionConfirmation(arena);
            }
            if (round.phase === RoundPhase.OutputRegistration) {
                return outputRegistration(arena);
            }
            if (round.phase === RoundPhase.TransactionSigning) {
                return transactionSigning(arena);
            }
            if (round.phase === RoundPhase.Ended) {
                return Promise.resolve(arena);
            }
            return Promise.resolve(undefined);
        }),
    ).then(a => a.filter(r => !!r) as Arena[]);

export const getArenaRequests = (arenas: Arena[]) => {
    const txs: RequestEvent[] = arenas.flatMap(a => {
        if (a.round.phase === RoundPhase.InputRegistration) {
            const payload = a.inputs
                .filter(i => !i.ownershipProof)
                .map(i => ({
                    path: i.path,
                    outpoint: i.outpoint,
                    roundId: i.roundId,
                }));
            if (!payload.length) return [];
            return {
                type: 'ownership',
                round: a.round.id,
                inputs: payload,
                commitmentData: utils.getCommitmentData(a.round.id),
            };
        }

        if (a.round.phase === RoundPhase.TransactionSigning) {
            if (!a.inputs.find(i => !i.witness)) return [];
            const payload = a.round.txData;
            return { type: 'witness', round: a.round.id, ...payload };
        }

        return [];
    });
    return txs;
};
