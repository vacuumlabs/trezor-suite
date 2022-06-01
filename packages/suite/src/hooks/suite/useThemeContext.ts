import { useSelector } from '@suite-hooks';
import { getOsTheme } from '@suite-utils/env';
import { getThemeColors } from '@suite-utils/theme';

export const useThemeContext = () => {
    const theme = useSelector(state => state.suite.settings.theme);
    // NOTE-TODO: not sure if this is correct? theme is always set now
    const resolvedTheme = theme || {
        variant: getOsTheme(),
    };

    return getThemeColors(resolvedTheme);
};
