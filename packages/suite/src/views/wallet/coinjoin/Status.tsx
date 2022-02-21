import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { P, Switch } from '@trezor/components';
import { Card, CollapsibleBox } from '@suite-components';
import { Row } from '@suite-components/Settings';
import * as W from '@wallet-actions/wabisabiApi';
import useInterval from 'react-use/lib/useInterval';
import { useCoinJoinContext } from '@wallet-hooks/useCoinJoinForm';

const StyledCard = styled(Card)`
    flex-direction: column;
    margin-bottom: 12px;
`;

const StyledRow = styled(Row)`
    display: flex;
    padding-top: 0;
    flex-direction: row;
`;

const Details = styled(Row)`
    display: flex;
    padding-top: 10px;
    flex-direction: column;
`;

const Counter = ({ deadline }: any) => {
    const [left, setLeft] = useState(deadline);
    useEffect(() => {
        const interval = setInterval(() => {
            const res = new Date(deadline).getTime() - Date.now();
            setLeft(res > 0 ? Math.floor(res / 1000) : 0);
        }, 100);
        return () => {
            clearInterval(interval);
        };
    }, [deadline]);
    const dataTest = `@wallet/coinjoin/status/${left > 30 ? 'available' : 'not-available'}`;
    return <span data-test={dataTest}>{left}</span>;
};

const Status = () => {
    const { coinjoin, setEnabled } = useCoinJoinContext();

    const toggleCoinJoin = () => {
        setEnabled(!coinjoin.enabled);
    };

    const rounds = coinjoin.status?.filter(round => round.phase !== 4) || [];

    return (
        <StyledCard largePadding>
            <StyledRow>
                CoinJoin status
                <Switch
                    onChange={toggleCoinJoin}
                    checked={coinjoin.enabled}
                    data-test="@wallet/coinjoin/enable"
                />
            </StyledRow>
            {rounds.length > 0 && (
                <>
                    {rounds.map(round => (
                        <Details key={round.id}>
                            <P>ID: {round.id}</P>
                            <P>phase: {round.phase}</P>
                            {/* <P>state: {round.coinjoinState.State}</P>
                            <P>Registred inputs: {round.coinjoinState.inputs.length}</P>
                            <P>Registred outputs: {round.coinjoinState.outputs.length}</P> */}
                            {round.phase > 0 ? (
                                <P style={{ color: '#ff0000' }}>CRITICAL PHASE</P>
                            ) : (
                                <P>
                                    Registration ends:{' '}
                                    <Counter deadline={round.inputRegistrationEnd} />
                                </P>
                            )}
                        </Details>
                    ))}
                </>
            )}
        </StyledCard>
    );
};

// {state && (
//     <Details>
//         <P>Id: {state.id}</P>
//         <P>Registration ends: {state.inputRegistrationEnd}</P>
//         <P>Registred inputs: {state.coinjoinState.inputs.length}</P>
//         <P>Min input value: {state.coinjoinState.parameters.allowedInputAmounts.min}</P>
//         {/* <P>Max input value: {response.coinjoinState.parameters.allowedInputAmounts.max}</P> */}
//         <P>
//             Min output value: {state.coinjoinState.parameters.allowedOutputAmounts.min}
//         </P>
//         {/* <P>Max output value: {response.coinjoinState.parameters.allowedOutputAmounts.max}</P> */}
//         <P>Fee rate: {state.coinjoinState.parameters.feeRate}</P>
//         <P>Min realy fee: {state.coinjoinState.parameters.minRelayTxFee}</P>
//     </Details>
// )}

export default Status;
