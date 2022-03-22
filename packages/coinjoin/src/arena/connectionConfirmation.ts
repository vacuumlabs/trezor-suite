import * as coordinator from '../coordinator';
import * as middleware from '../middleware';
import { Arena, Alice, AlicePhase } from '../types';

const confirmInput = async (round: Arena['round'], alice: Alice): Promise<Alice> => {
    if (alice.phase !== AlicePhase.InputRegistration) {
        throw new Error(`Trying to confirm unregistered input ${alice.outpoint}`);
    }

    const zeroAmountCredentials = await middleware.getZeroCredentials(
        round.amountCredentialIssuerParameters,
    );
    const zeroVsizeCredentials = await middleware.getZeroCredentials(
        round.vsizeCredentialIssuerParameters,
    );

    const confirmationData = await coordinator.connectionConfirmation(
        alice,
        alice.realAmountCredentials,
        alice.realVsizeCredentials,
        zeroAmountCredentials,
        zeroVsizeCredentials,
    );

    const confirmedAmountCredentials = await middleware.getCredentials(
        round.amountCredentialIssuerParameters,
        confirmationData.realAmountCredentials,
        alice.realAmountCredentials.credentialsResponseValidation,
    );
    const confirmedVsizeCredentials = await middleware.getCredentials(
        round.vsizeCredentialIssuerParameters,
        confirmationData.realVsizeCredentials,
        alice.realVsizeCredentials.credentialsResponseValidation,
    );

    return {
        ...alice,
        phase: AlicePhase.ConnectionConfirmation,
        confirmationData,
        confirmedAmountCredentials,
        confirmedVsizeCredentials,
    };
};

export const connectionConfirmation = async (arena: Arena): Promise<Arena> => {
    const inputs = await Promise.allSettled(
        arena.inputs.map(inp => confirmInput(arena.round, inp)),
    ).then(result =>
        result.map((r, i) =>
            r.status === 'fulfilled' ? r.value : { ...arena.inputs[i], error: r.reason },
        ),
    );
    return {
        round: arena.round,
        inputs,
    };
};
