import React from 'react';
import styled from 'styled-components';
import { Card, FormattedCryptoAmount } from '@suite-components';
import { useCoinJoinContext } from '@wallet-hooks/useCoinJoinForm';
import { variables, RadioButton } from '@trezor/components';
import { formatNetworkAmount } from '@wallet-utils/accountUtils';
import { getOutpoint } from '@suite/services/wabisabi';

const StyledCard = styled(Card)`
    flex-direction: column;
`;

const Item = styled.div`
    display: flex;
    align-items: center;
    padding: 8px 0px;
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
`;

const DetailsRow = styled.div`
    font-weight: ${variables.FONT_WEIGHT.MEDIUM};
    font-size: ${variables.FONT_SIZE.SMALL};
    color: ${props => props.theme.TYPE_LIGHT_GREY};
`;

const InputRegistration = () => {
    const { account, coinjoin, registerInput } = useCoinJoinContext();

    if (!coinjoin.enabled) return null;

    const utxos = account.utxo!.map(u => {
        const outpoint = getOutpoint(u);
        const alice = coinjoin.rounds.find(r => r.outpoint === outpoint);
        return { ...u, alice, outpoint };
    });

    return (
        <StyledCard>
            {utxos.map((utxo, index) => (
                <Item key={utxo.outpoint}>
                    <RadioButton
                        onClick={() => registerInput(utxo)}
                        isChecked={!!utxo.alice}
                        data-test={`@wallet/coinjoin/input-${index}`}
                    />
                    <Details>
                        <FormattedCryptoAmount
                            value={formatNetworkAmount(utxo.amount, account.symbol)}
                            symbol={account.symbol}
                        />
                        <DetailsRow>Address: {utxo.address}</DetailsRow>
                        <DetailsRow>Path: {utxo.path}</DetailsRow>
                        {utxo.confirmations === 0 && (
                            <DetailsRow style={{ color: '#ff0000' }}>Unconfirmed</DetailsRow>
                        )}
                        {utxo.alice && (
                            <>
                                <DetailsRow>RoundId: {utxo.alice.roundId}</DetailsRow>
                                {utxo.alice.aliceId && (
                                    <DetailsRow
                                        data-test={`@wallet/coinjoin/input-${index}/alice/${utxo.alice.aliceId}`}
                                    >
                                        AliceId: {utxo.alice.aliceId}
                                    </DetailsRow>
                                )}
                                <DetailsRow>Phase: {utxo.alice.pendingPhase}</DetailsRow>
                            </>
                        )}
                    </Details>
                </Item>
            ))}
        </StyledCard>
    );
};

export default InputRegistration;
