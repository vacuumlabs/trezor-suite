// @group:coinmarket

describe('Coinmarket buy', () => {
    beforeEach(() => {
        cy.task('startEmu', { wipe: true });
        cy.task('setupEmu', { needs_backup: false });
        cy.task('startBridge');

        cy.viewport(1024, 768).resetDb();
        cy.interceptInvityApi();
        cy.prefixedVisit('/');
        cy.passThroughInitialRun();
        cy.discoveryShouldFinish();
        // navigate to buy
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
    });

    it('Should buy crypto successfully', () => {
        cy.getTestElement('@coinmarket/buy/fiat-input').type('1000');
        cy.getTestElement('@coinmarket/buy/fiat-currency-select/input').click();
        cy.getTestElement('@coinmarket/buy/fiat-currency-select/option/usd').click();
        cy.getTestElement('@coinmarket/buy/country-select/input').click();
        cy.getTestElement('@coinmarket/buy/country-select/option/US').click();
        cy.getTestElement('@coinmarket/buy/show-offers-button').click();
        cy.getTestElement('@coinmarket/buy/offers/get-this-deal-button').first().click();
        cy.getTestElement('@coinmarket/buy/offers/buy-terms-agree-checkbox').click();
        cy.getTestElement('@coinmarket/buy/offers/buy-terms-confirm-button').click();
        cy.getTestElement('@coinmarket/buy/offers/confirm-on-trezor-button').click();
        cy.task('pressYes');

        // cy.getTestElement('@coinmarket/buy/offers/finish-transaction-button').click();
        // TODO: click buy button on mocked server
        // TODO: check the UI in suite for completed tx
    });

    it('Should show same crypto currency as it has been chosen (BTC)', () => {
        // Cannot easily check selected account for now. Rely on URI.
        cy.getTestElement('@coinmarket/buy/crypto-currency-select/input').contains('BTC');
    });

    it("Should remember form's values as a draft", () => {
        // TODO-test: set also country and verify that it is remembered

        cy.getTestElement('@coinmarket/buy/fiat-input').type('1000');
        cy.wait(1000);

        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        cy.getTestElement('@coinmarket/buy/fiat-input').should('have.value', '1000');
    });

    it('Should clear form draft', () => {
        // TODO-test: set fiat or crypto input, press clear button and verify that the form is empty
    });

    it('Should get error on non numeric value typed to fiat input', () => {
        // TODO-test: enter non numeric value to the fiat input field and verify that an error is shown
    });
});
