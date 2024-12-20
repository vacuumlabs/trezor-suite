import { ReactNode } from 'react';

import { Column } from '@trezor/components';
import { spacings } from '@trezor/theme';

export const Body = ({ children }: { children: ReactNode }) => (
    <Column gap={spacings.lg} alignItems="start">
        {children}
    </Column>
);

export const Section = ({ children }: { children: ReactNode }) => (
    <Column gap={spacings.xs} alignItems="start" flex="1">
        {children}
    </Column>
);
