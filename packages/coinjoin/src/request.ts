import { WABISABI_URL, CRYPTOGRAPHY_URL } from './constants';

export const post = (url: string, body: any, parse = true) =>
    fetch(`${WABISABI_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(r => (parse ? r.json() : r));

export const crypto = (url: string, body: any) =>
    fetch(`${CRYPTOGRAPHY_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(r => r.json());
