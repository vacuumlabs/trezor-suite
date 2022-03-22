import { EventEmitter } from 'events';
import { createDeferred, Deferred } from '@trezor/utils/createDeferred';
import { createAlice } from '../alice';
import { createAccount } from '../account';
import { selectRound } from './selectRound';
import { inputRegistration } from './inputRegistration';
import { connectionConfirmation } from './connectionConfirmation';
import { outputRegistration } from './outputRegistration';
import { transactionSigning } from './transactionSigning';
import { OnStatusUpdate } from '../status';
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

export const tryToRegister = (rounds: Round[], inputs: Alice[]) => {
    const roundCandidates = rounds.filter(r => r.phase === 0);
    const round = roundCandidates[0];
    const name = Buffer.from('CoinJoinCoordinatorIdentifier');
    const len = Buffer.allocUnsafe(1);
    len.writeUInt8(name.length, 0);

    const candidates = inputs.filter(i => i.phase === 0);

    if (candidates.length > 0 && roundCandidates.length > 0) {
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

interface Events {
    request: RequestEvent[];
    event: { type: string };
}

export declare interface ArenaController {
    on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    off<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    emit<K extends keyof Events>(type: K, ...args: Events[K][]): boolean;
}

export class ArenaController extends EventEmitter {
    inputs: Alice[] = [];
    arenas: ArenaRound[] = [];
    accounts: any[] = [];
    currentProcess?: Deferred<void>;
    processQueue: any[] = [];

    private updateInputs(inputs: Alice[]) {
        if (inputs.length < 1) return;
        this.inputs = this.inputs
            .filter(i => !inputs.find(ui => ui && ui.outpoint === i.outpoint)) // ui s undefined on registration
            .concat(inputs);

        this.emit('event', { type: 'update-inputs', inputs: this.inputs });
    }

    private updateArena(arenas: Arena[]) {
        if (arenas.length < 1) return;
        const newArenas = arenas.map(a => {
            this.updateInputs(a.inputs);
            this.emit('event', { type: 'update-arena', arena: a.round });
            return a.round;
        });
        this.arenas = this.arenas
            .filter(a => !newArenas.find(na => na.id === a.id))
            .concat(newArenas);
    }

    private async processAll(arenas: ArenaRound[]) {
        this.currentProcess = createDeferred();
        const result = await processArenas(arenas);
        this.updateArena(result);
        const requests = getArenaRequests(result);
        if (requests.length > 0) {
            this.emit('request', requests);
        }
        this.currentProcess.resolve();
        this.currentProcess = undefined;
    }

    addInput(rounds: Round[], { vin, addresses }: any) {
        const alice = createAlice(vin, addresses);
        this.updateInputs([alice]);
        // this.inputs.push(alice);
        this.onStatusUpdate({ rounds, changed: [] }); // TODO: better
    }

    resolveRequest(_rounds: Round[], requests: RequestEvent[]) {
        console.warn('RESOLVING REQUESTS', requests);
        const arenas = requests.map(ev => {
            if (ev.type === 'ownership') {
                const newAcc = ev.inputs.flatMap(i => {
                    console.log('...inp', i);
                    const known = this.inputs.find(inp => inp.outpoint === i.outpoint);
                    if (known) {
                        return {
                            ...known,
                            ownershipProof: i.ownershipProof,
                        };
                    }
                    return [];
                });
                this.updateInputs(newAcc);
            }

            if (ev.type === 'witness') {
                const newAcc = ev.inputs.flatMap(i => {
                    console.log('...inp', i);
                    const known = this.inputs.find(inp => inp.outpoint === i.outpoint);
                    if (known) {
                        return {
                            ...known,
                            witness: i.witness,
                            witnessIndex: i.witnessIndex,
                        };
                    }
                    return [];
                });
                this.updateInputs(newAcc);
            }

            return {
                round: this.arenas.find(a => a.id === ev.round),
                inputs: this.inputs.filter(i => i.roundId === ev.round),
            };
        });
        console.warn('RESOLVING REQUESTS arenas', arenas);

        this.processAll(arenas);
    }

    removeInput(vin: any) {
        this.inputs.filter(a => a.outpoint !== vin.outpoint);
    }

    async onStatusUpdate(event: OnStatusUpdate) {
        console.warn('onStatusUpdate', event, this.arenas);

        // wait for current process to finish
        if (this.currentProcess) {
            await this.currentProcess.promise;
        }
        // find all arenas assigned to changed rounds
        const arenasToProcess = event.changed.reduce((arr, round) => {
            const a = this.arenas.find(a => a.id === round.id);
            return arr.concat(a || []);
        }, [] as ArenaRound[]);

        // if there are no arenas to process try to create new arena
        if (arenasToProcess.length === 0) {
            const arena = selectRound(this.inputs, this.arenas, event.rounds);
            if (arena) {
                // this.updateArena([{ round: arena, inputs: [] }]);
                arenasToProcess.push(arena);
                console.warn('CREATE ARENA', arena);
            }

            // const candidate = tryToRegister(event.rounds, this.inputs);

            // if (candidate) {
            //     const known = this.arenas.find(r => r.id === candidate.round.id);
            //     const inputs = candidate.inputs.map(i => i.outpoint);
            //     const arena: ArenaRound = {
            //         ...known,
            //         ...candidate.round,
            //         inputs: known ? known.inputs.concat(inputs) : inputs,
            //     };
            //     this.updateArena([{ round: arena, inputs: [] }]);
            //     arenasToProcess.push(arena);
            //     console.warn('CREATE ARENA', arena);
            // }
        }

        if (arenasToProcess.length > 0) {
            const ar = arenasToProcess.map(arena => ({
                // merge old arena status with updated round
                round: { ...arena, ...event.rounds.find(r => r.id === arena.id) },
                inputs: this.inputs.filter(i => arena.inputs.indexOf(i.outpoint) > -1),
            }));

            this.processAll(ar);
        }

        console.warn('------>onStatusUpdate end');
    }

    registerAccount(account: any) {
        if (this.accounts.find(a => a.descriptor === account.descriptor)) {
            this.updateAccount(account);
        }
        const a = createAccount(account);
        this.accounts.push(a);
        this.updateInputs(a.inputs);
        // this.onStatusUpdate({ rounds, changed: [] }); // TODO: better
    }

    unregisterAccount(data: any) {}

    updateAccount(data: any) {}
}
