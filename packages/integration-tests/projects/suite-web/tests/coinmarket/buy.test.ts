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
    });

    it('Should buy crypto successfully', () => {
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
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
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        // Cannot easily check selected account for now. Rely on URI.
        cy.getTestElement('@coinmarket/buy/crypto-currency-select/input').contains('BTC');
    });

    it("Should remember form's values as a draft", () => {
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        cy.getTestElement('@coinmarket/buy/fiat-input').type('1000');
        cy.wait(1000);

        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        cy.getTestElement('@coinmarket/buy/fiat-input').should('equal', '1000');

        // TODO: rest of inputs
    });

    it('Should clear form draft', () => {
        // TODO: Need to set "clear form button id" in Suite
        // cy.getTestElement('@suite/menu/wallet-index').click();
        // cy.getTestElement('@wallet/menu/wallet-coinmarket-buy').click();
        // cy.getTestElement('@coinmarket/buy/fiat-input').type('1000');
        // cy.getTestElement('(clear form button id)').click();
        // cy.getTestElement('@coinmarket/buy/fiat-input').should('equal', '');
        // TODO: rest of inputs
    });
});
