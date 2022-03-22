import { EventEmitter } from 'events';
import { ArenaController } from './arena';
import { Status, OnStatusUpdate } from './status';
import { CoinjoinSettings, RegisterAccount, UnregisterAccount, AddInput } from './types';

interface Events {
    status: OnStatusUpdate;
    event: any;
    error: any;
}

export declare interface CoinjoinClient {
    on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    off<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): this;
    emit<K extends keyof Events>(type: K, ...args: Events[K][]): boolean;
}

export class CoinjoinClient extends EventEmitter {
    private static instance: Partial<Record<CoinjoinSettings['network'], CoinjoinClient>> = {};
    settings: CoinjoinSettings;
    arena: ArenaController;
    status: Status;

    constructor(settings: CoinjoinSettings) {
        super();
        this.settings = settings;
        this.arena = new ArenaController();
        this.arena.on('request', async event => {
            const response = await this.settings.onRequest(event);
            this.arena.resolveRequest(this.status.rounds, response);
        });
        this.arena.on('event', event => {
            this.emit('event', event);
        });
        this.status = new Status();
        this.status.on('update', event => {
            // this.status.clearStatusTimeout();
            this.arena.onStatusUpdate(event);
            if (event.changed.length > 0) {
                this.emit('status', event);
            }
        });
    }

    disable() {
        this.removeAllListeners();
        this.status.stop();
    }

    registerAccount(data: RegisterAccount) {
        this.arena.registerAccount(data);
        this.arena.onStatusUpdate({ rounds: this.status.rounds, changed: [] });
    }

    unregisterAccount(data: UnregisterAccount) {
        this.arena.unregisterAccount(data);
        this.arena.onStatusUpdate({ rounds: this.status.rounds, changed: [] });
    }

    updateAccount(data: RegisterAccount) {
        this.arena.updateAccount(data);
        this.arena.onStatusUpdate({ rounds: this.status.rounds, changed: [] });
    }

    addInput(data: AddInput) {
        this.arena.addInput(this.status.rounds, data);
    }

    static async enable(settings: CoinjoinSettings) {
        if (this.instance[settings.network]) return this.instance[settings.network];
        const instance = new CoinjoinClient(settings);
        instance.on('status', settings.onStatus);
        instance.on('event', settings.onEvent);

        await instance.status.start();
        this.instance[settings.network] = instance;
        return instance;
    }

    static disable(network: CoinjoinSettings['network']) {
        this.instance[network]?.disable();
        delete this.instance[network];
    }

    static registerAccount(data: RegisterAccount) {
        this.instance[data.network]?.registerAccount(data);
    }

    static unregisterAccount(data: UnregisterAccount) {
        this.instance[data.network]?.unregisterAccount(data);
    }

    static updateAccount(data: RegisterAccount) {
        this.instance[data.network]?.updateAccount(data);
    }

    static addInput(data: AddInput) {
        this.instance[data.network]?.addInput(data);
    }

    static removeInput(_vin: any) {
        // if (!this.instance.regtest) return;
        // this.instance.regtest.arena.removeInput(vin);
    }
}
