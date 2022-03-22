// @group:coinjoin

describe('Coinjoin', () => {
    beforeEach(() => {
        cy.task('startEmu', { wipe: true, version: '2-master' });
        cy.task('setupEmu', {
            experimental_features: true,
            mnemonic: 'all all all all all all all all all all all all',
        });
        cy.task('startBridge');

        cy.viewport(1024, 768).resetDb();
        cy.prefixedVisit('/settings/coins');
        cy.passThroughInitialRun();

        cy.toggleDebugModeInSettings();

        // enable Regtest
        cy.getTestElement('@settings/wallet/network/regtest').click({ force: true });
        // cy.getTestElement('@settings/wallet/network/regtest/advance').click();
        // cy.getTestElement('@settings/advance/url').type('http://localhost:19121');
        // cy.getTestElement('@settings/advance/button/save').click({ force: true });

        // disable Bitcoin
        cy.getTestElement('@settings/wallet/network/btc').click({ force: true });

        // go to Wallet > Coinjoin
        cy.getTestElement('@suite/menu/wallet-index').click();
        cy.discoveryShouldFinish();

        cy.getTestElement('@wallet/menu/extra-dropdown').click();
        cy.getTestElement('@wallet/menu/wallet-coinjoin').click();

        // use faucet
        cy.getTestElement('@wallet/coinjoin/faucet/amount').type('2');
        cy.getTestElement('@wallet/coinjoin/faucet/send').click();
        // cy.getTestElement('@wallet/coinjoin/faucet/mine-block').click();
        cy.wait(1000);
        cy.getTestElement('@wallet/coinjoin/faucet/amount').clear();
        cy.getTestElement('@wallet/coinjoin/faucet/amount').type('3');
        cy.getTestElement('@wallet/coinjoin/faucet/send').click();
        // cy.getTestElement('@wallet/coinjoin/faucet/mine-block').click();
    });

    it('Successful', () => {
        // access from notification
        cy.getTestElement('@wallet/coinjoin/enable').click({ force: true });
        // confirm experimental features
        cy.getConfirmActionOnDeviceModal().task('pressYes');
        // confirm authorization screen 1
        cy.getConfirmActionOnDeviceModal().task('pressYes');
        // confirm authorization screen 2
        cy.getConfirmActionOnDeviceModal().task('pressYes');

        // wait for suitable round up to 1 minute
        cy.getTestElement('@wallet/coinjoin/status/available', { timeout: 60000 }).should('exist');

        // utxo should be visible
        // cy.getTestElement('@wallet/coinjoin/input-0', { timeout: 30000 }).should('exist');
        // register first input
        cy.getTestElement('@wallet/coinjoin/input-0').click({ force: true });
        // wait for input registration
        cy.get('[data-test*="@wallet/coinjoin/input-0/alice"]', { timeout: 10000 }).should('exist');
        // cy.getTestElement('@wallet/coinjoin/alice/*', { timeout: 10000 }).should('exist');
        // register second input
        cy.getTestElement('@wallet/coinjoin/input-1').click({ force: true });
    });
});
