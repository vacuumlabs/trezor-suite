/* eslint-disable no-await-in-loop */
import * as coordinator from '../coordinator';
import * as middleware from '../middleware';
import { getEvents, compareOutpoint, sumCredentials } from '../utils';
import { Arena, Round, AlicePhase } from '../types';

// join all my inputs credentials in to one
const joinInputsCredentials = async (arena: Arena) => {
    const { round, inputs } = arena;
    let amountCredentials = inputs[0].confirmedAmountCredentials;
    let vsizeCredentials = inputs[0].confirmedVsizeCredentials;
    for (let i = 1; i < inputs.length; i++) {
        const current = inputs[i];
        console.warn('joining', i);
        const realAmountCredentials = await middleware.getRealCredentials(
            [current.confirmedAmountCredentials[0].value, amountCredentials[0].value],
            [current.confirmedAmountCredentials[0], amountCredentials[0]],
            round.amountCredentialIssuerParameters,
            round.maxAmountCredentialValue,
        );
        const realVsizeCredentials = await middleware.getRealCredentials(
            // [current.confirmedVsizeCredentials[0].value, vsizeCredentials[0].value],
            // [current.confirmedVsizeCredentials[0], vsizeCredentials[0]],
            [vsizeCredentials[0].value, vsizeCredentials[1].value],
            [vsizeCredentials[0], vsizeCredentials[1]],
            round.vsizeCredentialIssuerParameters,
            round.maxVsizeCredentialValue,
        );

        const zeroAmountCredentials = await middleware.getZeroCredentials(
            round.amountCredentialIssuerParameters,
        );
        const zeroVsizeCredentials = await middleware.getZeroCredentials(
            round.vsizeCredentialIssuerParameters,
        );

        const joinedIssuance = await coordinator.credentialIssuance(
            round,
            realAmountCredentials,
            realVsizeCredentials,
            zeroAmountCredentials,
            zeroVsizeCredentials,
        );

        amountCredentials = await middleware.getCredentials(
            round.amountCredentialIssuerParameters,
            joinedIssuance.realAmountCredentials,
            realAmountCredentials.credentialsResponseValidation,
        );
        vsizeCredentials = await middleware.getCredentials(
            round.vsizeCredentialIssuerParameters,
            joinedIssuance.realVsizeCredentials,
            realVsizeCredentials.credentialsResponseValidation,
        );
    }

    return {
        amountCredentials,
        vsizeCredentials,
    };
};

const registerOutput = async (
    round: Round,
    outputSize: number,
    outputAddress: any,
    outputAmount: number,
    amountCredentials: any,
    vsizeCredentials: any,
) => {
    const availableAmount = sumCredentials(amountCredentials);
    const availableVsize = sumCredentials(vsizeCredentials);
    console.warn('AVAILABLE AMOUT!', vsizeCredentials, availableVsize);
    const issuanceAmountCredentials = await middleware.getRealCredentials(
        [outputAmount, availableAmount - outputAmount],
        amountCredentials,
        round.amountCredentialIssuerParameters,
        round.maxAmountCredentialValue,
    );
    const issuanceVsizeCredentials = await middleware.getRealCredentials(
        [outputSize, availableVsize - outputSize],
        vsizeCredentials,
        round.vsizeCredentialIssuerParameters,
        round.maxVsizeCredentialValue,
    );

    const zeroAmountCredentials = await middleware.getZeroCredentials(
        round.amountCredentialIssuerParameters,
    );
    const zeroVsizeCredentials = await middleware.getZeroCredentials(
        round.vsizeCredentialIssuerParameters,
    );

    const issuanceData = await coordinator.credentialIssuance(
        round,
        issuanceAmountCredentials,
        issuanceVsizeCredentials, // ATTACK: issuance granted
        zeroAmountCredentials,
        zeroVsizeCredentials,
    );

    const amountCredentialsOut = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        issuanceData.realAmountCredentials,
        issuanceAmountCredentials.credentialsResponseValidation,
    );
    const vsizeCredentialsOut = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        issuanceData.realVsizeCredentials,
        issuanceVsizeCredentials.credentialsResponseValidation,
    );

    const zeroAmountCredentialsOut = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        issuanceData.zeroAmountCredentials,
        zeroAmountCredentials.credentialsResponseValidation,
    );

    const zeroVsizeCredentialsOut = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        issuanceData.zeroVsizeCredentials,
        zeroVsizeCredentials.credentialsResponseValidation,
    );

    const outputAmountCredentials = await middleware.getRealCredentials(
        [0, 0],
        [amountCredentialsOut[0], zeroAmountCredentialsOut[0]],
        round.amountCredentialIssuerParameters,
        round.maxAmountCredentialValue,
    );
    const outputVsizeCredentials = await middleware.getRealCredentials(
        [vsizeCredentialsOut[0].value - outputSize, 0],
        [vsizeCredentialsOut[0], zeroVsizeCredentialsOut[0]],
        round.vsizeCredentialIssuerParameters,
        round.maxVsizeCredentialValue,
    );

    await coordinator.outputRegistration(
        round,
        outputAddress,
        outputAmountCredentials,
        outputVsizeCredentials,
    );

    return {
        amountCredentials: [amountCredentialsOut[1], zeroAmountCredentialsOut[1]],
        vsizeCredentials: [vsizeCredentialsOut[1], zeroVsizeCredentialsOut[1]],
    };
};

const decompose = async (arena: Arena, availableVsize: number, outputSize: number) => {
    const registeredInputs = getEvents('InputAdded', arena.round.coinjoinState.events);
    const internalAmounts: number[] = [];
    const externalAmounts: number[] = [];
    registeredInputs.forEach(i => {
        const isMine = arena.inputs.find(alice => compareOutpoint(alice.outpoint, i.coin.outpoint));
        if (isMine) {
            internalAmounts.push(i.coin.txOut.value);
        } else {
            externalAmounts.push(i.coin.txOut.value);
        }
    });
    const outputAmounts = await middleware.decomposeAmounts(
        arena.round,
        outputSize,
        availableVsize,
        internalAmounts,
        externalAmounts,
    );
    return outputAmounts;
};

export const outputRegistration = async (arena: Arena): Promise<Arena> => {
    const outputSize = arena.inputs.reduce((i, alice) => Math.max(alice.outputSize, i), 0);

    let { amountCredentials, vsizeCredentials } = await joinInputsCredentials(arena);
    const { round, inputs } = arena;
    const availableVsize = sumCredentials(vsizeCredentials);

    // const outputAmounts = await decompose(arena, availableVsize, outputSize);
    const outputAmounts = [86093442 + 86093442, 86093442 + 86093442, 86093442 + 69508796];
    console.warn('====> DECOMPOSED', outputAmounts, availableVsize);

    for (let i = 0; i < outputAmounts.length; i++) {
        console.warn('REGISTAAA', i, inputs[0].outputAddresses[i]);
        const r = await registerOutput(
            round,
            outputSize,
            inputs[0].outputAddresses[i],
            outputAmounts[i],
            amountCredentials,
            vsizeCredentials,
        );
        amountCredentials = r.amountCredentials;
        vsizeCredentials = r.vsizeCredentials;
    }
    await Promise.all(inputs.map(i => coordinator.readyToSign(i)));

    return {
        round: arena.round,
        inputs: arena.inputs.map(i => ({
            ...i,
            outputs: inputs[0].outputAddresses,
            phase: AlicePhase.OutputRegistration,
        })),
    };
};
