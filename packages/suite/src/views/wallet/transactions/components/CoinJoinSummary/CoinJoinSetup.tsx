import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Button, Icon } from '@trezor/components';
import { enableCoinJoin } from '@wallet-actions/coinjoinActions';
import { useActions } from '@suite-hooks';
import { AnonymityGraph } from './AnonymityGraph';
import { CoinJoinStart } from './CoinJoinStart';
import { CoinJoinStatusDetail } from './CoinJoinStatusDetail';
import type { Account } from '@wallet-types';

const Wrapper = styled(Card)`
    width: 100%;
    flex-direction: column;
`;

const Content = styled.div`
    display: flex;
    flex-direction: row;
    padding-bottom: 24px;
`;

const Section = styled.div`
    padding: 10px;
`;

const SelectButton = styled(Button)<{ isActive?: boolean }>`
    width: 200px;
    height: 100px;
    background: transparent;
    border: 1px solid
        ${props => (!props.isActive ? props.theme.BG_SECONDARY : props.theme.TYPE_GREEN)};
`;

interface Props {
    account: Account;
}

export const CoinJoinSetup = ({ account }: Props) => {
    const [step, setStep] = useState(0);
    const [state, setState] = useState(0);
    const action = useActions({
        enableCoinJoin,
    });
    if (step === 0) {
        return (
            <>
                <AnonymityGraph account={account} />
                <CoinJoinStart account={account} onContinue={() => setStep(1)} />
            </>
        );
    }
    return (
        <Wrapper>
            <Content>
                <Section style={{ flex: 1 }}>
                    <SelectButton
                        isActive={state === 0}
                        variant="tertiary"
                        onClick={() => setState(0)}
                    >
                        Default
                        {state === 0 && <Icon icon="CHECK_ACTIVE" />}
                    </SelectButton>
                    <SelectButton
                        isActive={state === 1}
                        variant="tertiary"
                        onClick={() => setState(1)}
                    >
                        Speed
                        {state === 1 && <Icon icon="CHECK_ACTIVE" />}
                    </SelectButton>
                </Section>
                <Section>
                    <CoinJoinStatusDetail
                        account={account}
                        anonLevel={state ? 50 : 80}
                        rounds={state ? 8 : 10}
                        fee={state ? 3 : 10}
                        coordinatorFee="0.05%"
                    />
                </Section>
            </Content>
            <Button
                onClick={() => action.enableCoinJoin(account)}
                icon="ARROW_RIGHT_LONG"
                alignIcon="right"
            >
                Start coin join
            </Button>
        </Wrapper>
    );
};
