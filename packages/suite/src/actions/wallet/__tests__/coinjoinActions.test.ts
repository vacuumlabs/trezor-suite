import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import * as coinjoinActions from '../coinjoinActions';
import * as fixtures from '../__fixtures__/coinjoinActions';

jest.mock('@trezor/connect', () => global.JestMocks.getTrezorConnect({}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TrezorConnect = require('@trezor/connect').default;

export const getInitialState = () => ({
    suite: {
        locks: [],
        device: global.JestMocks.getSuiteDevice({ state: 'device-state', connected: true }),
    },
    modal: {},
});

type State = ReturnType<typeof getInitialState>;
const mockStore = configureStore<State, any>([thunk]);

const initStore = (state: State) => {
    const store = mockStore(state);
    store.subscribe(() => {
        const action = store.getActions().pop();
        store.getActions().push(action);
    });
    return store;
};

describe('coinjoinActions', () => {
    fixtures.createCoinJoinAccount.forEach(f => {
        it(`createCoinJoinAccount: ${f.description}`, async () => {
            const initialState = getInitialState();
            const store = initStore(initialState);
            TrezorConnect.setTestFixtures(f.connect);

            await store.dispatch(coinjoinActions.createCoinJoinAccount(f.params as any)); // params are incomplete

            expect(store.getActions().length).toBe(f.result.actions);
        });
    });

    fixtures.enableCoinJoin.forEach(f => {
        it(`enableCoinJoin: ${f.description}`, async () => {
            const initialState = getInitialState();
            const store = initStore(initialState);
            TrezorConnect.setTestFixtures(f.connect);

            await store.dispatch(coinjoinActions.enableCoinJoin(f.params as any)); // params are incomplete
            expect(store.getActions().length).toBe(f.result.actions);
        });
    });
});
