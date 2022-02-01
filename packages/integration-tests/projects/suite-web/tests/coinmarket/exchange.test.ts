// @group:coinmarket

describe('Coinmarket exchange', () => {
    beforeEach(() => {
        cy.task('startEmu', { wipe: true });
        cy.task('setupEmu', { needs_backup: false });
        cy.task('startBridge');

        cy.viewport(1024, 768).resetDb();
        cy.interceptInvityApi();
        cy.prefixedVisit('/');
        cy.passThroughInitialRun();
        cy.discoveryShouldFinish();
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        cy.getTestElement('@coinmarket/menu/wallet-coinmarket-exchange').click();
    });

    it('Should exchange crypto successfully', () => {
        cy.getTestElement('@coinmarket/exchange/crypto-input').type('0.005');
        // TODO: We need to connect to regtest blockchain so we can mock accounts as not empty and continue with exchange process
        // it will also need mocked exchange server API calls
    });

    it("Should remember form's values as a draft", () => {
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        cy.getTestElement('@coinmarket/menu/wallet-coinmarket-exchange').click();

        cy.prefixedVisit('/accounts/coinmarket/exchange/#/btc/0');
        cy.getTestElement('@coinmarket/exchange/fiat-input').type('1000');
        cy.prefixedVisit('/accounts');
        cy.getTestElement('@coinmarket/exchange/fiat-input').should('have.value', '1000');

        // TODO: rest of inputs
    });

    it('Should clear form draft', () => {
        cy.getTestElement('@coinmarket/exchange/fiat-input').type('1000');
        cy.getTestElement('(clear form button id)').click();
        cy.getTestElement('@coinmarket/exchange/fiat-input').should('have.value', '');

        // TODO: fill and reset rest of inputs
    });
});
