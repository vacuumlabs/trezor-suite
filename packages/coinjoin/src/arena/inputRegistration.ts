import * as coordinator from '../coordinator';
import * as middleware from '../middleware';
import { getEvents } from '../utils';
import { Round, Alice, AlicePhase, Arena } from '../types';

const registerInput = async (round: Round, alice: Alice): Promise<Alice> => {
    if (!alice.ownershipProof)
        return {
            ...alice,
            phase: AlicePhase.WaitingForOwnershipProof,
            roundId: round.id,
        };

    if (alice.phase === AlicePhase.InputRegistration) return alice; // unexpected state

    const zeroAmountCredentials = await middleware.getZeroCredentials(
        round.amountCredentialIssuerParameters,
    );
    const zeroVsizeCredentials = await middleware.getZeroCredentials(
        round.vsizeCredentialIssuerParameters,
    );

    const registrationData = await coordinator.inputRegistration(
        round.id,
        alice.outpoint,
        alice.ownershipProof,
        zeroAmountCredentials,
        zeroVsizeCredentials,
    );
    // store aliceId immediately
    // it will be used id input unregistration in case if something goes wrong
    // alice.aliceId = registrationData.aliceId;

    const amountCredentials = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        registrationData.amountCredentials,
        zeroAmountCredentials.credentialsResponseValidation,
    );
    const vsizeCredentials = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        registrationData.vsizeCredentials,
        zeroVsizeCredentials.credentialsResponseValidation,
    );

    const { roundParameters } = getEvents('RoundCreated', round.coinjoinState.events)[0];

    const coordinatorFee =
        alice.amount > roundParameters.coordinationFeeRate.plebsDontPayThreshold &&
        !registrationData.isPayingZeroCoordinationFee
            ? Math.floor(roundParameters.coordinationFeeRate.rate * alice.amount)
            : 0;

    const miningFee = Math.floor((alice.inputSize * roundParameters.miningFeeRate) / 1000);
    const amount = alice.amount - coordinatorFee - miningFee;
    const vsize = roundParameters.maxVsizeAllocationPerAlice - alice.inputSize;

    const realAmountCredentials = await middleware.getRealCredentials(
        [amount, 0],
        amountCredentials,
        round.amountCredentialIssuerParameters,
        roundParameters.maxAmountCredentialValue,
    );
    const realVsizeCredentials = await middleware.getRealCredentials(
        [vsize, 0],
        vsizeCredentials,
        round.vsizeCredentialIssuerParameters,
        roundParameters.maxVsizeCredentialValue,
    );

    return {
        ...alice,
        phase: AlicePhase.InputRegistration,
        aliceId: registrationData.aliceId,
        registrationData,
        roundId: round.id,
        availableAmount: amount,
        availableVsize: vsize,
        realAmountCredentials,
        realVsizeCredentials,
    };
};

const skip = (alice: Alice, reason: string) => {
    console.warn('REASON!', reason);
    if (reason.message.includes('WrongPhase')) {
        return {
            ...alice,
            roundId: '',
            ownershipProof: '',
        };
    }
    return { alice, error: reason };
};

export const inputRegistration = async (arena: Arena): Promise<Arena> => {
    const inputs = await Promise.allSettled(
        arena.inputs.map(inp => registerInput(arena.round, inp)),
    ).then(result =>
        result.map((r, i) =>
            r.status === 'fulfilled' ? r.value : skip(arena.inputs[i], r.reason),
        ),
    );
    return {
        round: {
            ...arena.round,
            inputs: inputs.flatMap(i => (!i.roundId || i.error ? [] : i.outpoint)),
        },
        inputs,
    };
};
