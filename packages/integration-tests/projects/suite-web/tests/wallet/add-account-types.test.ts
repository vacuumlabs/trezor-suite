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
        const coin = 'btc';
        const accountTypes = ['normal', 'taproot', 'segwit', 'legacy'];
        const accAdds = ['', ' (Taproot)', ' (Legacy Segwit)', ' (Legacy)'];
        let accountTypeAdd: string;
        let acctoAdd: string;
        //
        // Test execution
        //
        cy.getTestElement('@suite/menu/wallet-index', { timeout: 30000 }).click();

        accountTypes.forEach(accountType => {
            accountTypeAdd = `Bitcoin(${accountType})`;

            accAdds.forEach(accAdd => {
                acctoAdd = `Bitcoin${accAdd}`;
                if (accountType !== 'normal') {
                    cy.getTestElement('@account-menu/arrow').click({ multiple: true });
                }

                cy.get(
                    `[type="${accountType}"] > [data-test="@account-menu/${coin}/${accountType}/0"]`,
                ).then(specificAccounts => {
                    const numberOfAccounts1 = specificAccounts.length;

                    cy.createAccount(coin, acctoAdd);

                    cy.get(
                        `[type="${accountType}"] > [data-test="@account-menu/${coin}/${accountType}/0"]`,
                    ).then(specificAccounts => {
                        const numberOfAccounts2 = specificAccounts.length;

                        expect(numberOfAccounts2).to.be.equal(numberOfAccounts1 + 1);
                    });
                });
            });
        });
        cy.wait(5000);
        // @account-menu/taproot
        //
        // Assert
        //
    });
});
