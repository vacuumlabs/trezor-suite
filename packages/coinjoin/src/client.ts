import * as request from './request';

export class WabiSabiClient {
    enabled = false;
    pending: PendingAlice[] = [];
    registered: Alice[] = [];
    status: Round[] = [];
    statusTimeout: ReturnType<typeof 

    private async getStatus() {
        if (!this.enabled) return;

        // stop timeout
        clearTimeout(this.statusTimeout);
        this.statusTimeout = undefined;

        try {
            this.status = await getStatus();
        } catch (e) {
            this.status = [];
        }

        this.emit('status', this.status);

        if (this.enabled) {
            this.analyzeStatus();
            // retry pending inputs
            this.pending.forEach(i => this.tryRegisterInput(i));

            const timeout = 5000; // TODO: calc optimal timeout
            this.statusTimeout = setTimeout(() => this.getStatus(), timeout);
        }
    }

    private updateRegistered(alice: Alice) {
        this.registered = this.registered.filter(r => r.aliceId !== alice.aliceId).concat(alice);
        return alice;
    }

    private analyzeStatus() {
        // Check if pending round did change
        const pending = this.registered.filter(r => r.pendingPhase);
        // console.warn('PENDING', pending);
        pending.forEach(alice => {
            const current = this.status.find(s => s.id === alice.roundId);
            // console.warn('CURRENT', current);
            if (current && current.phase >= alice.pendingPhase) {
                if (current.phase > alice.pendingPhase) {
                    console.warn('---> ERRORO: unsynced');
                    this.emit('round-error', {});
                } else if (alice.pendingPhase === Phase.ConnectionConfirmation) {
                    const payload = this.updateRegistered({
                        ...alice,
                        pendingPhase: Phase.OutputRegistration,
                    });
                    this.emit('connection-confirmation', payload);
                    // dispatch({
                    //     type: COINJOIN.CONNECTION_CONFIRMATION,
                    //     payload: {
                    //         ...alice,
                    //         pendingPhase: Phase.OutputRegistration,
                    //     },
                    // });
                } else if (alice.pendingPhase === Phase.OutputRegistration) {
                    const payload = this.updateRegistered({
                        ...alice,
                        ownershipProofs: current.coinjoinState.ownershipProofs,
                        pendingPhase: Phase.OutputRegistration,
                    });
                    this.emit('output-registration', payload);
                    // console.warn('OWNERS', current.coinjoinState.ownershipProofs);
                    // dispatch(registerOutputs(alice, current.coinjoinState.ownershipProofs));
                } else if (alice.pendingPhase === Phase.TransactionSigning) {
                    // console.warn('SIGNING PHASE!!!!!');
                    // dispatch(sign(alice));
                    const payload = this.updateRegistered({
                        ...alice,
                        pendingPhase: Phase.Ended,
                    });
                    this.emit('sing-tx', payload);
                } else if (alice.pendingPhase === Phase.Ended) {
                    console.warn('END!!!!!');
                    this.emit('round-success', alice);
                    // remove registration
                    this.registered = this.registered.filter(r => r.aliceId !== alice.aliceId);
                    // this.emit('round-error', {});
                }
            }
        });
    }

    private emit(...args: Parameters<EventListener>) {
        // private emit(...args: any) {
        if (this.listener) {
            this.listener(...args);
        }
    }

    enable() {
        this.enabled = true;
        this.getStatus();
    }

    disable() {
        this.enabled = false;
        clearTimeout(this.statusTimeout);
        this.statusTimeout = undefined;
        this.pending = [];
        this.registered = [];
    }

    // find best round for input
    tryRegisterInput(candidate: PendingAlice) {
        if (this.pending.find(i => i.input === candidate.input && i.ownershipRequested)) {
            return; // already requested
        }

        const round = this.status.find(
            r =>
                r.phase === Phase.InputRegistration &&
                new Date(r.inputRegistrationEnd).getTime() - Date.now() > 20000,
        );

        if (round) {
            this.pending = this.pending
                .filter(i => i.input !== candidate.input)
                .concat({
                    ...candidate,
                    ownershipRequested: true,
                });
            this.emit('get-ownership', {
                ...candidate,
                roundId: round.id,
            });
        } else {
            this.pending = this.pending.filter(i => i.input !== candidate.input).concat(candidate);
            this.emit('pending-registration', this.pending);
        }
    }

    unregisterInput(candidate: PendingAlice) {
        this.pending = this.pending.filter(i => i.input !== candidate.input);
    }

    async registerInput(candidate: Alice) {
        const round = this.status.find(r => r.id === candidate.roundId);
        if (!round) return;

        const { zeroCredentialsRequestData: zeroAmountCredentials } = await crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
            },
        );

        const { zeroCredentialsRequestData: zeroVsizeCredentials } = await crypto(
            'create-request-for-zero-amount',
            {
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            },
        );

        const registrationData = await post('input-registration', {
            roundId: round.id,
            input: candidate.input,
            ownershipProof: candidate.ownershipProofs,
            zeroAmountCredentialRequests: zeroAmountCredentials.credentialsRequest,
            zeroVsizeCredentialRequests: zeroVsizeCredentials.credentialsRequest,
        });

        // Calculate data used in next step: coinfirmation

        const { credentials: amountCredentialsToPresent } = await crypto('handle-response', {
            credentialIssuerParameters: round.amountCredentialIssuerParameters,
            registrationResponse: registrationData.amountCredentials,
            registrationValidationData: zeroAmountCredentials.credentialsResponseValidation,
        });

        const { credentials: vsizeCredentialsToPresent } = await crypto('handle-response', {
            credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
            registrationResponse: registrationData.vsizeCredentials,
            registrationValidationData: zeroVsizeCredentials.credentialsResponseValidation,
        });

        // const amount = Number.parseInt(input.amount, 10) - (69 * round.feeRate) / 1000;
        const amount = Number.parseInt(candidate.amount, 10) - (69 * round.feeRate) / 1000;

        const { realCredentialsRequestData: realAmountCredentials } = await crypto(
            'create-request',
            {
                amountsToRequest: [amount],
                credentialIssuerParameters: round.amountCredentialIssuerParameters,
                maxCredentialValue: round.maxAmountCredentialValue,
                credentialsToPresent: amountCredentialsToPresent,
            },
        );
        const { realCredentialsRequestData: realVsizeCredentials } = await crypto(
            'create-request',
            {
                amountsToRequest: [round.maxVsizeAllocationPerAlice - 69],
                credentialIssuerParameters: round.vsizeCredentialIssuerParameters,
                maxCredentialValue: round.maxVsizeCredentialValue,
                credentialsToPresent: vsizeCredentialsToPresent,
            },
        );

        const arena = {
            ...candidate,
            registrationData,
            realAmountCredentials,
            realVsizeCredentials,
        };

        this.emit('register-input', arena);
    }
}
