import type { MiddlewareAPI } from 'redux';
import { COINJOIN } from '@wallet-actions/constants';
import * as coinjoinActions from '@wallet-actions/coinjoinActions';
import { WabiSabiClient } from '@suite/services/wabisabi';
import type { AppState, Action, Dispatch } from '@suite-types';

const client = new WabiSabiClient();

const coinjoinMiddleware =
    (api: MiddlewareAPI<Dispatch, AppState>) =>
    (next: Dispatch) =>
    (action: Action): Action => {
        // propagate action to reducers
        next(action);

        switch (action.type) {
            case COINJOIN.ENABLE:
                console.warn('TRY to enable');
                client.enable();
                client.listener = (type, payload) => {
                    if (type === 'status') {
                        api.dispatch({
                            type: COINJOIN.UPDATE_STATUS,
                            payload,
                        });
                    }
                    // if (type === 'get-ownership') {
                    //     api.dispatch(coinjoinActions.getOwnershipProof(payload));
                    // }
                };
                console.warn('TRY to enabled?');
                break;
            case COINJOIN.DISABLE:
                client.disable();
                client.listener = undefined;
                break;
            case COINJOIN.TRY_REGISTER_INPUT:
                // api.dispatch(coinjoinActions.onStatusUpdate(action.payload));
                break;
            case COINJOIN.UPDATE_STATUS:
                api.dispatch(coinjoinActions.onStatusUpdate(action.payload));
                break;
            case COINJOIN.CONNECTION_CONFIRMATION:
                api.dispatch(coinjoinActions.connectionConfirmation(action.payload));
                break;
            default:
                break;
        }

        return action;
    };

export default coinjoinMiddleware;
