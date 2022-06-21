import React from 'react';
import { analytics, EventType } from '@trezor/suite-analytics';
import { PROTO } from '@trezor/connect';

import { ActionColumn, ActionSelect, SectionItem, TextColumn } from '@suite-components/Settings';
import { Translation } from '@suite-components/Translation';
import { useAnchor } from '@suite-hooks/useAnchor';
import { SettingsAnchor } from '@suite-constants/anchors';
import { UNIT_ABBREVIATIONS, useBitcoinAmountUnit } from '@wallet-hooks/useBitcoinAmountUnit';

export const BitcoinAmountUnit = () => {
    const { bitcoinAmountUnit, setBitcoinAmountUnits, UNIT_LABELS, UNIT_OPTIONS } =
        useBitcoinAmountUnit();
    const { anchorRef, shouldHighlight } = useAnchor(SettingsAnchor.BitcoinAmountUnit);

    const handleUnitsChange = ({ value }: { value: PROTO.AmountUnit }) => {
        setBitcoinAmountUnits(value);
        analytics.report({
            type: EventType.SettingsGeneralChangeBitcoinUnit,
            payload: {
                unit: UNIT_ABBREVIATIONS[value],
            },
        });
    };

    return (
        <SectionItem
            data-test="@settings/btc-units"
            ref={anchorRef}
            shouldHighlight={shouldHighlight}
        >
            <TextColumn title={<Translation id="TR_BTC_UNITS" />} />
            <ActionColumn>
                <ActionSelect
                    hideTextCursor
                    useKeyPressScroll
                    noTopLabel
                    value={{
                        label: UNIT_LABELS[
                            bitcoinAmountUnit as PROTO.AmountUnit.BITCOIN | PROTO.AmountUnit.SATOSHI
                        ],
                        value: bitcoinAmountUnit,
                    }}
                    options={UNIT_OPTIONS}
                    onChange={handleUnitsChange}
                    data-test="@settings/btc-units-select"
                />
            </ActionColumn>
        </SectionItem>
    );
};
