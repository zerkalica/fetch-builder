# Fetch builder

RequestOptions builder toolkit for [whatwg-fetch](https://github.github.io/fetch). Easily create or extend custom fetcher options.

Features:

* Customizable and extendable options
* Placeholders in urls, custom params serializer and placeholder mapper
* Headers merging
* postProcess function compose


## Simple fetch example

```js
// @flow
import 'isomorphic-fetch'
import querystring from 'querystring'
import {
    Fetcher,
    createSerializeParams
} from 'fetch-builder'
import type {FetchOptionsRec} from 'fetch-builder'

const baseFetcher = new Fetcher({
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru'
    },
    method: 'GET',
    serializeParams: createSerializeParams(querystring.stringify)
})

const userPromise = baseFetcher.fetch({
    url: '/user/1',
})

// Or create custom user fetcher with placeholder as id
const userFetcher = baseFetcher.copy({
    url: '/user/:id',
})

userFetcher.fetch({
    params: {
        id: 1
    }
})

const sessionFetcher = baseFetcher.copy({
    url: '/session'
})

const sessionPromise = sessionFetcher.fetch()
```

Builds custom options and use external fetch.

```js
// @flow
import 'isomorphic-fetch'
import querystring from 'querystring'
import {
    HttpError,
    checkStatus,
    Fetcher,
    createSerializeParams
} from 'fetch-builder'
import type {FetchOptionsRec} from 'fetch-builder'

const baseOptions = new Fetcher(({
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru'
    },
    method: 'GET',
    // throws HttpError if fetch status not in range 200-300
    postProcess: checkStatus,
    serializeParams: createSerializeParams(querystring.stringify)
}: FetchOptionsRec))

console.log(baseOptions.options.headers)
/*
{
    'Accept-Language': 'ru'
}
*/

const jsonOptions = baseOptions.copy({
    // composed with baseOptions.postProcess
    postProcess: (response: Response) => response.json()
})

const authOptions = jsonOptions.copy({
    headers: {
        'Auth': 'Token bla-bla'
    }
})

console.log(authOptions.options.headers)
/*
{
    'Accept-Language': 'ru',
    'Auth': 'Token bla-bla'
}
*/

const baseUserApi = authOptions.copy({
    url: '/user/:id'
})

const userGet = baseUserApi.copy({
    params: {
        id: '1',
        some: 'test'
    }
})
console.log(userGet.fullUrl)
// /api/user/1?some=test

// get user
userGet.fetch()
    .then((userData: Object) => {
        console.log(userData)
    })

const userPost = baseUserApi.copy({
    method: 'POST',
    params: {
        id: '1',
        some: 'test'
    }
})
userPost.fetch()
    .then((userData: Object) => {
        console.log(userData)
    })
```

## Interface of Fetcher constructor

```js
// @flow
/**
 * Input args for Fetcher
 *
 * @example
```js
{
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru'
    },
    method: 'GET',
    postProcess,
    serializeParams
}
```
 */
export type FetchOptionsRec = {
    /**
     * `baseUrl` will be prepended to `url`.
     *
     * Supported placeholders like `:id`.
     *
     * @example https://some-server.org/
     */
    baseUrl?: ?string;

    /**
     * Relative server url.
     *
     * Supported placeholders like `:id`.
     *
     * @example /user/:id
     */
    url?: ?string;

    /**
     * Url parameters key-value dict.
     *
     * If exists url placeholder with key, this value replaces url placeholder.
     * If no placeholder found - parameters adds as querystring.
     *
     * @example /user/:id/:some + {id: 1, some: 'test'} = /user/1?some=test
     */
    params?: ?StrDict;

    /**
     * Params serializer function.
     *
     * @example
     ```js
     //@flow
     function serializeParams(url: string, params: ?Object): string {
         const qStr: ?string = params ? querystring.stringify(params) : null
         return url + (qStr ? ('?' + qStr) : '')
     }
     ```
     */
    serializeParams?: ?SerializeParams;

    /**
     * Composable postProcess function.
     *
     * @example
     * ```js
     * // @flow
     *
     * function postProcess<V>(response: Response): Promise<V> {
     *     return response.json()
     * }
     *
     * fetch(fullUrl, options).then(postProcess)
     * ```
     */
    postProcess?: ?PostProcess;

    /**
     * Request body.
     *
     * Plain objects will be searilzed to json string.
     */
    body?: ?(Blob | FormData | URLSearchParams | string | Object);

    /**
     * Below parameters from RequestOptions
     *
     * @see RequestOptions in https://github.com/facebook/flow/blob/master/lib/bom.js
     */
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

export interface IFetchOptions {
    /**
     * Request options.
     */
    options: RequestOptions;

    /**
     * Generated full url from baseUrl, url and params.
     */
    fullUrl: string;

    /**
     * Composable fetch.then postProcess function.
     */
    postProcess: <V>(response: Response) => Promise<V>;

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcess will be composed with existing postProcess.
     */
    copy(rec: FetchOptionsRec): IFetchOptions;

    /**
     * Fetch data.
     *
     * Need fetch polyfill.
     */
    fetch(rec?: ?FetchOptionsRec): Promise<V>;
}
```
