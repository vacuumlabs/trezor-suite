export const createCoinJoinAccount = [
    {
        description: 'invalid accountType',
        params: {
            accountType: 'segwit',
        },
        result: {
            actions: 0,
        },
    },
    {
        description: 'experimental features not enabled',
        connect: {
            success: false,
        },
        params: {
            accountType: 'coinjoin',
        },
        result: {
            actions: 1, // notification
        },
    },
    {
        description: 'public key not given',
        connect: [
            {
                success: true, // applySettings
            },
            {
                success: false, // getPublicKey
            },
        ],
        params: {
            accountType: 'coinjoin',
        },
        result: {
            actions: 1, // notification
        },
    },
    {
        description: 'success',
        connect: [
            {
                success: true, // applySettings
            },
            {
                success: true, // getPublicKey
                payload: {
                    xpub: 'legacy-xpub',
                    xpubSegwit: 'xpub',
                },
            },
            {
                success: true, // getAccountInfo
                payload: {
                    xpub: 'legacy-xpub',
                    xpubSegwit: 'xpub',
                },
            },
        ],
        params: {
            symbol: 'btc',
            networkType: 'bitcoin',
            accountType: 'coinjoin',
        },
        result: {
            actions: 2, // account-create + account-update actions
        },
    },
];

export const enableCoinJoin = [
    {
        description: 'invalid accountType',
        connect: {
            success: false,
        },
        params: {
            accountType: 'segwit',
        },
        result: {
            actions: 0,
        },
    },
    {
        description: 'not authorized',
        connect: {
            success: false,
        },
        params: {
            accountType: 'coinjoin',
        },
        result: {
            actions: 1, // notification
        },
    },
    {
        description: 'success',
        connect: {
            success: true,
        },
        params: {
            accountType: 'coinjoin',
        },
        result: {
            actions: 1, // enabled
        },
    },
];
