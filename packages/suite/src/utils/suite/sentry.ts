import * as Sentry from '@sentry/minimal';
import type { Options, Event } from '@sentry/types';

const allowReportTag = 'allowReport';

/**
 * From paths like /Users/username/, C:\Users\username\, this matches /Users/ or \Users\ as first group
 * and text (supposed to be a username) between that and the next slash as second group.
 */
const startOfUserPathRegex = /([/\\][Uu]sers[/\\])([^/^\\]*)/g;

/**
 * Full user path could be part of reported error in some cases and we want to actively filter username out.
 * The user path could appear on multiple places in Sentry event (event.message, event.extra.arguments,
 * exception.values[0].value, breadcrumb.message). To filter it on all possible places, Sentry event
 * is stringified first, then username is redacted in the whole string and event is parsed back.
 *
 * In case of any issue during parsing, original error is reported just with extra redactUserPathFailed tag
 * to be able to see in Sentry if there are any issues in this approach.
 */
const redactUserPath = (event: Event) => {
    try {
        const eventAsString = JSON.stringify(event);
        const redactedString = eventAsString.replace(startOfUserPathRegex, '$1[redacted]');
        return JSON.parse(redactedString);
    } catch (error) {
        console.warn('Redacting user path failed', error);
        event.tags = {
            redactUserPathFailed: true, // to be able to see in Sentry if there are such an errors
            ...event.tags,
        };
        return event;
    }
};

export const beforeSend: Options['beforeSend'] = event => {
    // sentry events are skipped until user confirm analytics reporting
    const allowReport = event.tags?.[allowReportTag];
    if (allowReport === false) {
        return null;
    }
    // allow report error without breadcrumbs before confirm status is loaded (@storage/loaded)
    if (typeof allowReport === 'undefined') {
        delete event.breadcrumbs;
    }

    return redactUserPath(event);
};

export const beforeBreadcrumb: Options['beforeBreadcrumb'] = breadcrumb => {
    // filter out analytics requests and image fetche
    const isAnalytics =
        breadcrumb.category === 'fetch' &&
        breadcrumb.data?.url?.contains('data.trezor.io/suite/log');
    const isImageFetch =
        breadcrumb.category === 'xhr' && breadcrumb.data?.url?.contains('/assets/');

    if (isAnalytics || isImageFetch) {
        return null;
    }
    return breadcrumb;
};

export const allowSentryReport = (value: boolean) => {
    Sentry.configureScope(scope => {
        scope.setTag(allowReportTag, value);
    });
};

export const setSentryUser = (instanceId: string) => {
    Sentry.configureScope(scope => {
        scope.setUser({ id: instanceId });
    });
};

export const unsetSentryUser = () => {
    Sentry.configureScope(scope => {
        scope.setUser(null);
    });
};
