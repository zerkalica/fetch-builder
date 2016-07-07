# Fetch builder

Immutable, RequestOptions builder for whatwg-fetch.

```js
// @flow
import 'isomorphic-fetch'
import {checkStatus, FetchOptions} from 'fetch-builder'
import type {FetchOptionsRec} from 'fetch-builder'
import querystring from 'querystring'

function postProcess<V>(response: Response): Promise<V> {
    checkStatus(response)
    return response.json()
}

function getQueryParams(params: ?Object): string {
    const qStr: ?string = params ? querystring.stringify(params) : null
    return qStr ? ('?' + qStr) : ''
}

const baseOptions = new FetchOptions(({
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4'
    },
    postProcess,
    getQueryParams
}: FetchOptionsRec))

console.log(baseOptions.options.headers)
/*
{
    'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4'
}
*/

const authOptions = baseOptions.copy({
    headers: {
        'Auth': 'Token bla-bla'
    }
})

console.log(authOptions.options.headers)
/*
{
    'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Auth': 'Token bla-bla'
}
*/

const baseUserApiOptions = authOptions.copy({
    url: '/user'
})
console.log(userApiOptions.fullUrl)
// /api/user

const userApiOptions = baseUserApiOptions.copy({
    params: {
        id: '1'
    }
})
console.log(userApiOptions.fullUrl)
// /api/user?id=1

fetch(userApiOptions.fullUrl, userApiOptions.options)
    .then(userApiOptions.postProcess)
    .then((userData: Object) => {
        console.log(userData)
    })
```

## Interface of constructor and copy

```js
// @flow
export interface FetchOptionsRec<V> {
    baseUrl?: ?string;
    url?: ?string;
    params?: ?StrDict;
    getQueryParams?: ?(params: ?Object) => string;
    postProcess?: ?(response: Response) => V;

    body?: ?(Blob | FormData | URLSearchParams | string | Object);
    cache?: ?CacheType;
    credentials?: ?CredentialsType;
    headers?: ?HeadersInit;
    integrity?: ?string;
    method?: ?MethodType;
    mode?: ?ModeType;
    redirect?: ?RedirectType;
    referrer?: ?string;
    referrerPolicy?: ?ReferrerPolicyType;
}
```
