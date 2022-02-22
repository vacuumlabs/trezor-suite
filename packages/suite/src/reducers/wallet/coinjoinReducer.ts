import produce from 'immer';
import { COINJOIN } from '@wallet-actions/constants';
import type { WalletAction } from '@wallet-types';
import type { Round, Alice } from '@wallet-types/coinjoin';

interface Arena {
    enabled: boolean;
    key: string;
    proof: string;
}

export type CoinjoinState = {
    enabled: boolean;
    arenas: Arena[];
    status: Round[];
    rounds: Alice[];
};

const initialState = {
    enabled: false,
    arenas: [],
    status: [],
    rounds: [],
};

const coinjoinReducer = (state: CoinjoinState = initialState, action: WalletAction) =>
    produce(state, draft => {
        switch (action.type) {
            case COINJOIN.ENABLE:
                return {
                    ...draft,
                    enabled: true,
                    // status: action.payload.status,
                };

            case COINJOIN.DISABLE:
                return initialState;

            case COINJOIN.UPDATE_STATUS:
                return {
                    ...draft,
                    status: action.payload,
                };

            case COINJOIN.TRY_REGISTER_INPUT:
                draft.rounds.push({
                    ...action.payload,
                    addresses: [],
                });
                return draft;

            case COINJOIN.REGISTER_INPUT:
                draft.rounds = draft.rounds
                    .filter(r => r.outpoint !== action.payload.outpoint)
                    .concat(action.payload);
                return draft;

            case COINJOIN.UNREGISTER_INPUT:
                draft.rounds = draft.rounds.filter(r => r.outpoint !== action.payload.outpoint);
                return draft;

            case COINJOIN.TRY_REGISTER_OUTPUT:
            case COINJOIN.TRY_SIGN_TX:
            case COINJOIN.CONNECTION_CONFIRMATION:
            case COINJOIN.INPUT_CONFIRMED:
            case COINJOIN.OUTPUT_CONFIRMED:
            case COINJOIN.TX_SIGNED:
                draft.rounds = draft.rounds
                    .filter(r => r.outpoint !== action.payload.outpoint)
                    .concat(action.payload);
                return draft;

            // no default
        }
    });

export default coinjoinReducer;
