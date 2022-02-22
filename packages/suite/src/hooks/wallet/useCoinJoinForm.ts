import { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector, useActions } from '@suite-hooks';
import { DEFAULT_VALUES } from '@wallet-constants/sendForm';
import { FormState as FormStateBase } from '@wallet-types/sendForm';
import { useCompose } from './form/useCompose';
import { useUtxoSelection } from './form/useUtxoSelection';
import type { AccountUtxo } from 'trezor-connect';
import * as coinjoinActions from '@wallet-actions/coinjoinActions';

export type Props = {
    finalize?: boolean;
};

type FormState = FormStateBase & {
    selectedUtxos: AccountUtxo[];
};

const useCoinJoinState = () => {
    const state = useSelector(state => ({
        selectedAccount: state.wallet.selectedAccount,
        fees: state.wallet.fees,
        transactions: state.wallet.transactions.transactions,
        coinjoin: state.wallet.coinjoin,
    }));

    return useMemo(() => {
        // do not calculate if currentState is already set (prevent re-renders)
        if (state.selectedAccount.status !== 'loaded') return;

        const { account, network } = state.selectedAccount;
        return {
            account,
            network,
            coinjoin: state.coinjoin,
            feeInfo: state.fees[account.symbol],
            formValues: {} as FormState, // TODO: remove type casting (options string[])
        };
    }, [state.coinjoin, state.fees, state.selectedAccount]);
};

export const useCoinJoin = (_props: Props) => {
    const actions = useActions({
        enable: coinjoinActions.enable,
        disable: coinjoinActions.disable,
        registerInput: coinjoinActions.registerInput,
    });

    // throttle state calculation
    const state = useCoinJoinState();

    // react-hook-form
    const useFormMethods = useForm<FormState>({ mode: 'onChange', shouldUnregister: false });
    const { reset, register, setValue, getValues, errors } = useFormMethods;

    // react-hook-form auto register custom form fields (without HTMLElement)
    useEffect(() => {
        register({ name: 'outputs', type: 'custom' });
        register({ name: 'setMaxOutputId', type: 'custom' });
        register({ name: 'options', type: 'custom' });
    }, [register]);

    // react-hook-form reset, set default values
    useEffect(() => {
        reset(state?.formValues);
    }, [state, reset]);

    // sub-hook
    const { isLoading, composeRequest, composedLevels, signTransaction } = useCompose({
        ...useFormMethods,
        state,
        defaultField: 'selectedFee',
    });

    // sub-hook
    const { toggleUtxoSelection } = useUtxoSelection({
        composeRequest,
        ...useFormMethods,
    });

    const typedRegister = useCallback(<T>(rules?: T) => register(rules), [register]);

    // state can be undefined (no account, should never happen)
    // ts requires at least account field to be present (validated by context type)
    const ctxState = state || { account: undefined };

    return {
        ...ctxState,
        setEnabled: (enabled: boolean) => (enabled ? actions.enable() : actions.disable()),
        isLoading,
        register: typedRegister,
        errors,
        setValue,
        getValues,
        composedLevels,
        toggleUtxoSelection,
        registerInput: actions.registerInput,
        composeRequest,
        signTransaction,
    };
};

// context accepts only valid state (non nullable account)
type CoinJoinContextValues = ReturnType<typeof useCoinJoin> &
    NonNullable<ReturnType<typeof useCoinJoinState>>;

export const CoinJoinContext = createContext<CoinJoinContextValues | null>(null);
CoinJoinContext.displayName = 'CoinJoinContext';

// Used across rbf form components
// Provide combined context of `react-hook-form` with custom values as CoinJoinContextValues
export const useCoinJoinContext = () => {
    const ctx = useContext(CoinJoinContext);
    if (ctx === null) throw Error('useCoinJoinContext used without Context');
    return ctx;
};
