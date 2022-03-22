import { EventEmitter } from 'events';
import { inputRegistration } from './inputRegistration';
import { connectionConfirmation } from './connectionConfirmation';
import { outputRegistration } from './outputRegistration';
import { transactionSigning } from './transactionSigning';
import { OnStatusUpdate } from '../status';
import { Arena, Round, RoundPhase, Alice, AlicePhase } from '../types';

export const processArenas = (arenas: Arena[]) =>
    Promise.all(
        arenas.map(({ round, inputs }) => {
            console.warn('processing...', round);
            if (round.phase === RoundPhase.InputRegistration) {
                return Promise.all(inputs.map(a => inputRegistration(round, a)));
            }
            if (round.phase === RoundPhase.ConnectionConfirmation) {
                return Promise.all(inputs.map(a => connectionConfirmation(round, a)));
            }
            if (round.phase === RoundPhase.OutputRegistration) {
                return Promise.all(inputs.map(a => outputRegistration(round, a)));
            }
            if (round.phase === RoundPhase.TransactionSigning) {
                return transactionSigning(round, inputs);
            }
            if (round.phase === RoundPhase.Ended) {
                return Promise.resolve([]);
            }
            return Promise.resolve([]);
        }),
    ).then(a => a.flatMap(r => r));

export const getArenas = (event: OnStatusUpdate, inputs: Alice[]) =>
    event.changed
        .map(round => ({
            round,
            inputs: inputs.filter(a => a.roundId === round.id),
        }))
        .filter(r => r.inputs.length > 0);

export const tryToRegister = (rounds: Round[], inputs: Alice[]) => {
    const candidates: Alice[] = inputs
        .filter(i => i.phase === 0)
        .map(i => ({ ...i, phase: AlicePhase.WaitingForOwnershipProof }));
    const roundCandidates = rounds.filter(r => r.phase === 0);
    if (candidates.length > 0 && roundCandidates.length > 0) {
        const round = roundCandidates[0];
        const name = Buffer.from('CoinJoinCoordinatorIdentifier');
        const len = Buffer.allocUnsafe(1);
        len.writeUInt8(name.length, 0);

        const commitmentData = Buffer.concat([len, name, Buffer.from(round.id, 'hex')]).toString(
            'hex',
        );
        return {
            round,
            commitmentData,
            inputs: candidates,
        };
    }
};

type ArenaType = {
    id: string;
    commitmentData: string;
    transactionData?: string;
};

export class ArenaController extends EventEmitter {
    inputs: Alice[] = [];
    arenas: ArenaType[] = [];

    private updateInputs(inputs: Alice[]) {
        if (inputs.length < 1) return;
        this.inputs = this.inputs
            .filter(i => !inputs.find(ui => ui.outpoint === i.outpoint))
            .concat(inputs);
        this.emit('input', { type: 'update-inputs', inputs });
    }

    addInput(vin: any, addresses: any[]) {
        const alice = createAlice(vin, addresses.slice(this.instance.inputs.length, 5)); // TODO
        this.inputs.push(alice);
        // this.onStatusUpdate({ rounds: this.status.rounds, changed: [] }); // TODO: better
    }

    async addOwnershipProof(args: any) {
        const update: Alice[] = args.inputs.flatMap(i => {
            const alice = this.inputs.find(a => a.outpoint === i.outpoint);
            if (alice) {
                return {
                    ...alice,
                    ownershipProof: i.ownershipProof,
                };
            }
            return [];
        });
        this.updateInputs(update);

        const u2 = await processArenas([{ round: args.round, inputs: update }]);
        if (u2) {
            this.updateInputs(u2);
        }
    }

    addWitness() {
        // check if its not too late
    }

    removeInput(vin: any) {
        this.inputs.filter(a => a.outpoint !== vin.outpoint);
    }

    async onStatusUpdate(event: OnStatusUpdate) {
        const arenas = event.changed.reduce((arr, round) => {
            const a = this.arenas.find(a => a.id === round.id);
            return arr.concat(a || []);
        }, [] as ArenaType[]);

        if (arenas.length === 0) {
            const candidate = tryToRegister(event.rounds, this.inputs);
            if (candidate) {
                this.updateInputs(candidate.inputs);
                this.arenas.push({
                    id: candidate.round.id,
                    commitmentData: candidate.commitmentData,
                });
                arenas.concat([
                    {
                        id: candidate.round.id,
                        commitmentData: candidate.commitmentData,
                    },
                ]);
            }
        }

        if (arenas.length > 0) {
            const ar: Arena[] = arenas.map(a => ({
                round: event.rounds.find(r => r.id === a.id),
                inputs: this.inputs.filter(i => i.roundId === a.id),
            }));
            const result = await processArenas(ar);
            this.updateInputs(result);
        }
    }
}
