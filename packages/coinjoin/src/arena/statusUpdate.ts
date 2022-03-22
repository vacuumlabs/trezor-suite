import { OnStatusUpdate } from '../status';
import { Alice } from '../types';

export const statusUpdate = async (event: OnStatusUpdate, inputs: Alice[]) =>
    event.changed
        .map(round => ({
            round,
            inputs: inputs.filter(a => a.roundId === round.id),
        }))
        .filter(r => r.inputs.length > 0);

export const tryRegistration = () => {};
