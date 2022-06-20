// @group:suite
// @retry=2

describe('Add-account-types', () => {
    beforeEach(() => {
        cy.task('startEmu', { wipe: true });
        cy.task('setupEmu', {
            needs_backup: true,
            mnemonic: 'all all all all all all all all all all all all',
        });
        cy.task('startBridge');

        cy.viewport(1080, 1440).resetDb();
        cy.prefixedVisit('/');
        cy.passThroughInitialRun();
        cy.discoveryShouldFinish();
    });

    afterEach(() => {
        cy.task('stopEmu');
    });

    /* Test case
    1. Go to Account
    2. Add every account type
    3. Check new account type has been added
    */
    it('Add-account-types-BTC', () => {
        //
        // Test preparation
        //

        //
        // Test execution
        //
        cy.getTestElement('@suite/menu/wallet-index', { timeout: 30000 }).click();
        cy.getTestElement('@accounts/add-account').click();
        cy.getTestElement('@modal').should('be.visible');
        cy.getTestElement('@settings/wallet/network/btc').should('be.visible').click();
        cy.getTestElement('@add-account-type/blah/input').click();
        // cy.contains('$x//a[data-test*="@add-account-type/blah/input/"]', 'Taproot').click();
        cy.getTestElement('@add-account-type/blah/option/Bitcoin (Taproot)').click();
        cy.getTestElement('@add-account').click();
        cy.wait(5000);
        // '
        // Assert
        //
        // when graph becomes visible, discovery was finished
        //  cy.discoveryShouldFinish();
        //  cy.getTestElement('@dashboard/graph', { timeout: 30000 }).should('exist');
    });
});
