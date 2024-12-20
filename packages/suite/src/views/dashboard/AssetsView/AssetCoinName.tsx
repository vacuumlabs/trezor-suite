import styled from 'styled-components';

import { Network } from '@suite-common/wallet-config';
import { selectVisibleNonEmptyDeviceAccountsByNetworkSymbol } from '@suite-common/wallet-core';
import { Icon, SkeletonRectangle } from '@trezor/components';
import { spacingsPx, typography } from '@trezor/theme';

import { useSelector } from 'src/hooks/suite';

const WalletContent = styled.div`
    flex: 1;
`;

const CoinName = styled.div`
    ${typography.body};
`;
const Wallets = styled.div`
    display: flex;
    align-items: center;
    gap: ${spacingsPx.xxs};
    margin-top: ${spacingsPx.xxs};
`;
const WalletNumber = styled.div`
    color: ${({ theme }) => theme.textSubdued};
    font-variant-numeric: tabular-nums;
    ${typography.hint};
`;

type AssetCoinNameProps = {
    network: Network;
};

export const AssetCoinName = ({ network }: AssetCoinNameProps) => {
    const { symbol, name } = network;
    const selectedAccounts = useSelector(state =>
        selectVisibleNonEmptyDeviceAccountsByNetworkSymbol(state, symbol),
    );

    return (
        <WalletContent>
            <CoinName>{name}</CoinName>
            <Wallets>
                <Icon name="standardWallet" size={16} />
                <WalletNumber>{selectedAccounts.length}</WalletNumber>
            </Wallets>
        </WalletContent>
    );
};

type AssetCoinNameSkeletonProps = {
    animate?: boolean;
};

export const AssetCoinNameSkeleton = ({ animate }: AssetCoinNameSkeletonProps) => (
    <div>
        <CoinName>
            <SkeletonRectangle animate={animate} width={100} />
        </CoinName>
        <Wallets>
            <WalletNumber>
                <SkeletonRectangle animate={animate} width={60} />
            </WalletNumber>
        </Wallets>
    </div>
);
