import produce from 'immer';
import * as COINJOIN from '@wallet-actions/constants/coinjoinConstants';
import type { CoinJoinAction } from '@wallet-actions/coinjoinActions';

export interface CoinJoinState {
    accounts: string[];
}

const initialState = {
    accounts: [],
};

const coinjoinReducer = (
    state: CoinJoinState = initialState,
    action: CoinJoinAction,
): CoinJoinState =>
    produce(state, draft => {
        switch (action.type) {
            case COINJOIN.ENABLE:
                draft.accounts.push(action.payload.key);
                break;

            // no default
        }
    });

export default coinjoinReducer;
