import TrezorConnect, { FeeLevel, TokenInfo } from '@trezor/connect';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import {
    FormState,
    PrecomposedTransactionFinal,
    ComposeActionContext,
    ExternalOutput,
    PrecomposedTransaction,
    PrecomposedLevels,
} from '@suite-common/wallet-types';
import { notificationsActions } from '@suite-common/toast-notifications';
import { Dispatch, GetState } from 'src/types/suite';
import {
    calculateMax,
    calculateSolFee,
    calculateTotal,
    formatAmount,
    getExternalComposeOutput,
    getLamportsFromSol,
} from '@suite-common/wallet-utils';
import BigNumber from 'bignumber.js';

// TODO(vl): Implement send-max
// TODO(vl), phase 2: Implement custom Prioritization Fees

// TODO(vl): Replace with appropriate call!
const getRecentBlockhash = async () => {
    const response = await fetch('https://api.devnet.solana.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getRecentBlockhash',
            params: [],
        }),
    });
    const { result } = await response.json();

    return result.value.blockhash;
};

// TODO(vl): Handle token transfers -- see ETH implementation
const calculate = (
    availableBalance: string,
    output: ExternalOutput,
    feeLevel: FeeLevel,
    token?: TokenInfo,
): PrecomposedTransaction => {
    // TODO(vl): handle prioritisation fee
    // 1, 0, 0 = discard prioritisation fee for now
    // Default args include the prioritisation fee
    const feeInSatoshi = calculateSolFee(1, 0, 0);
    let amount: string;
    let max: string | undefined;
    if (output.type === 'send-max' || output.type === 'send-max-noaddress') {
        max = calculateMax(availableBalance, feeInSatoshi);
        amount = max;
    } else {
        amount = output.amount;
    }

    // total SOL spent (amount + fee), in case of SPL token only the fee
    const totalSpent = new BigNumber(calculateTotal(token ? '0' : amount, feeInSatoshi));

    if (totalSpent.isGreaterThan(availableBalance)) {
        const error = token ? 'AMOUNT_NOT_ENOUGH_CURRENCY_FEE' : 'AMOUNT_IS_NOT_ENOUGH';
        // errorMessage declared later
        return { type: 'error', error, errorMessage: { id: error } } as const;
    }

    const payloadData = {
        type: 'nonfinal',
        totalSpent: token ? amount : totalSpent.toString(),
        max,
        fee: feeInSatoshi,
        feePerByte: feeLevel.feePerUnit,
        feeLimit: feeLevel.feeLimit,
        token,
        bytes: 0,
    } as const;

    if (output.type === 'send-max' || output.type === 'external') {
        return {
            ...payloadData,
            type: 'final',
            // compatibility with BTC PrecomposedTransaction from @trezor/connect
            transaction: {
                inputs: [],
                outputsPermutation: [0],
                outputs: [
                    {
                        address: output.address,
                        amount,
                        script_type: 'PAYTOADDRESS',
                    },
                ],
            },
        };
    }

    return payloadData;
};

export const composeTransaction =
    (formValues: FormState, formState: ComposeActionContext) => () => {
        const { account, network, feeInfo } = formState;
        const composeOutputs = getExternalComposeOutput(formValues, account, network);
        if (!composeOutputs) return; // no valid Output

        const { output, decimals } = composeOutputs;

        // TODO(vl): get custom fee limit from TrezorConnect.BlockchainEstimateFee
        const customFeeLimit: string | undefined = undefined; // FEE_PER_SIGNATURE.toString();

        // FeeLevels are read-only
        const levels = customFeeLimit ? feeInfo.levels.map(l => ({ ...l })) : feeInfo.levels;
        const predefinedLevels = levels.filter(l => l.label !== 'custom');
        // update predefined levels with customFeeLimit (gasLimit from data size or erc20 transfer)
        if (customFeeLimit) {
            predefinedLevels.forEach(l => (l.feeLimit = customFeeLimit));
        }
        // in case when selectedFee is set to 'custom' construct this FeeLevel from values
        if (formValues.selectedFee === 'custom') {
            predefinedLevels.push({
                label: 'custom',
                feePerUnit: formValues.feePerUnit,
                feeLimit: formValues.feeLimit,
                blocks: -1,
            });
        }

        const wrappedResponse: PrecomposedLevels = {};
        const response = predefinedLevels.map(level =>
            calculate(account.availableBalance, output, level),
        );
        response.forEach((tx, index) => {
            const feeLabel = predefinedLevels[index].label as FeeLevel['label'];
            wrappedResponse[feeLabel] = tx;
        });

        // format max (calculate sends it as satoshi)
        // update errorMessage values (symbol)
        Object.keys(wrappedResponse).forEach(key => {
            const tx = wrappedResponse[key];
            if (tx.type !== 'error') {
                tx.max = tx.max ? formatAmount(tx.max, decimals) : undefined;
                tx.estimatedFeeLimit = customFeeLimit;
            }
            if (tx.type === 'error' && tx.error === 'AMOUNT_NOT_ENOUGH_CURRENCY_FEE') {
                tx.errorMessage = {
                    id: 'AMOUNT_NOT_ENOUGH_CURRENCY_FEE',
                    values: { symbol: network.symbol.toUpperCase() },
                };
            }
        });

        return Promise.resolve(wrappedResponse);
    };

export const signTransaction =
    (formValues: FormState, transactionInfo: PrecomposedTransactionFinal) =>
    async (dispatch: Dispatch, getState: GetState) => {
        const { selectedAccount } = getState().wallet;
        const { device } = getState().suite;

        if (
            selectedAccount.status !== 'loaded' ||
            !device ||
            !transactionInfo ||
            transactionInfo.type !== 'final'
        )
            return;

        const { account, network } = selectedAccount;
        if (account.networkType !== 'solana' || !network.chainId) return;

        const blockhash = await getRecentBlockhash();

        const tx = new Transaction({
            blockhash,
            lastValidBlockHeight: 50,
            feePayer: new PublicKey(account.descriptor),
        }).add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(account.descriptor),
                toPubkey: new PublicKey(formValues.outputs[0].address),
                lamports: getLamportsFromSol(formValues.outputs[0].amount),
            }),
        );
        const serializedTx = tx.serializeMessage().toString('hex');

        const signature = await TrezorConnect.solanaSignTransaction({
            device: {
                path: device.path,
                instance: device.instance,
                state: device.state,
            },
            path: account.path,
            serializedTx,
        });

        if (!signature.success) {
            // catch manual error from ReviewTransaction modal
            if (signature.payload.error === 'tx-cancelled') return;
            dispatch(
                notificationsActions.addToast({
                    type: 'sign-tx-error',
                    error: signature.payload.error,
                }),
            );
            return;
        }

        tx.addSignature(
            new PublicKey(account.descriptor),
            Buffer.from(signature.payload.signature, 'hex'),
        );
        const signedTx = tx.serialize().toString('hex');

        return signedTx;
    };
