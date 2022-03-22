import { EventEmitter } from 'events';
import * as coordinator from './coordinator';
import type { Round } from './types';

export interface OnStatusUpdate {
    rounds: Round[];
    changed: Round[];
}

interface Events {
    update: OnStatusUpdate;
    error: Error;
}

export declare interface Status {
    on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    off<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    emit<K extends keyof Events>(type: K, ...args: Events[K][]): boolean;
}

// TODO:
// - check if connected to desired backend (by blockhash?)
// - load initial state

export class Status extends EventEmitter {
    enabled = false;
    timestamp = 0;
    rounds: Round[] = [];
    private statusTimeout?: ReturnType<typeof setTimeout>;

    clearStatusTimeout() {
        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = undefined;
    }

    compareStatus = (next: Round[]) =>
        next.filter(nextRound => {
            const known = this.rounds.find(prevRound => prevRound.id === nextRound.id);
            if (!known) return true; // new phase
            if (nextRound.phase === known.phase + 1) return true; // expected update
            if (nextRound.phase !== known.phase)
                console.warn(
                    'Unexpected phase change:',
                    nextRound.id,
                    nextRound.phase,
                    known.phase,
                );
            return false;
        });

    async getStatus() {
        if (!this.enabled) return;
        const status = await coordinator.getStatus();
        const changed = this.compareStatus(status);
        this.rounds = status;
        this.timestamp = Date.now();
        this.statusTimeout = setTimeout(() => this.getStatus(), 1000); // TODO: find nearest deadline in rounds + add randomness
        if (changed.length) {
            this.emit('update', { rounds: status, changed });
            return status;
        }
    }

    start() {
        this.enabled = true;
        return this.getStatus();
    }

    stop() {
        this.enabled = false;
        this.removeAllListeners();
        this.clearStatusTimeout();
        this.rounds = [];
    }
}
