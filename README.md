# Fetch builder

Lightweight and extremely customizable alternative to [superagent][superagent], [request][request], [axios][axios], [frisbee][frisbee].

RequestOptions builder toolkit for [whatwg-fetch][whatwg-fetch]. Easily create or extend custom fetcher options.

Features:

* Immutable
* Customizable and extendable options
* Placeholders in urls, custom params serializer and placeholder mapper
* Headers merging
* Composable postProcess handler

```js
// @flow
import 'isomorphic-fetch'
import querystring from 'querystring'
import {
    checkStatus,
    Fetcher,
    createSerializeParams
} from 'fetch-builder'
import type {FetchOptions} from 'fetch-builder'

// Fetcher with some defaults
const baseFetcher: Fetcher<any, any> = new Fetcher({
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru'
    },
    method: 'GET',
    // throws HttpError if fetch status not in range 200-300
    postProcess: checkStatus,
    serializeParams: createSerializeParams(querystring.stringify)
})

// Get json from response
const jsonFetcher: Fetcher<any, any> = baseFetcher.copy({
    // composed with baseFetcher.postProcess
    postProcess: (response: Promise<Response>) => response.then(r => r.json())
})

type User = {
    id: string;
    name: string;
}

// fetch user
const userPromise: Promise<User> = jsonFetcher.fetch({
    url: '/user/1',
})
// GET /api/user/1

// Or create custom user fetcher with placeholder as id
const userFetcher: Fetcher<User, {id: string, q: string}> = jsonFetcher.copy({
    url: '/user/:id',
})

userFetcher.fetch({
    params: {
        id: '1',
        q: '2'
    }
})
// GET /api/user/1?q=2

type Session = {
    isLogged: boolean;
}

const sessionFetcher: Fetcher<Session, void> = jsonFetcher.copy({
    url: '/session'
})

sessionFetcher.fetch()
// GET /api/session

const delSessionFetcher: Fetcher<Session, void> = sessionFetcher.copy({
    method: 'DELETE'
})

delSessionFetcher.fetch()
// DELETE /api/session


// Set default credentials
const authUserFetcher: Fetcher<User, {id: string}> = userFetcher.copy({
    headers: {
        'Auth': 'Token bla-bla'
    }
})

authUserFetcher.fetch({
    params: {
        id: '1'
    }
})
/*
GET /api/user/1
headers: {
    'Accept-Language': 'ru',
    'Auth': 'Token bla-bla'
}
*/

authUserFetcher.fetch({
    method: 'POST',
    body: {
        id: '1',
        name: 'test'
    },
    params: {
        id: '1'
    }
})
/*
POST /api/user/1
body: {id: 1, name: 'test'}
headers: {
    'Accept-Language': 'ru',
    'Auth': 'Token bla-bla'
}
*/
```

## Interface of Fetcher constructor

```js
// @flow
/**
 * Input args for Fetcher
 *
 * @example
{
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4'
    },
    method: 'GET',
    postProcess,
    serializeParams
}
 */
export type FetchOptions<Params: Object> = {
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
    params?: ?Params;

    /**
     * Params serializer function.
     *
     * @example
     function serializeParams(url: string, params: ?Object): string {
         const qStr: ?string = params ? querystring.stringify(params) : null
         return url + (qStr ? ('?' + qStr) : '')
     }
     */
    serializeParams?: ?SerializeParams;

    /**
     * Composable postProcess function.
     *
     * @example
     * function postProcess<Result>(response: Promise<Response>): Promise<Result> {
     *     return response.then(r => r.json())
     * }
     *
     * fetch(fullUrl, options).then(postProcess)
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

export interface IFetcher<Result, Params: Object> {
    /**
     * Request options.
     */
    options: RequestOptions;

    /**
     * Generated full url from baseUrl, url and params.
     */
    fullUrl: string;

    /**
     * Composable fetch result postProcess function.
     */
    postProcess: (response: Promise<Response>) => Promise<Result>;

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcess will be composed with existing postProcess.
     */
    copy<R, P: Object>(rec: FetchOptions<P>): IFetcher<R, P>;

    /**
     * Fetch data.
     *
     * Need fetch polyfill.
     */
    fetch(rec?: ?FetchOptions<Params>): Promise<Result>;
}
```

## License

[MIT][license-url]

[license-url]: LICENSE
[superagent]: https://github.com/visionmedia/superagent
[whatwg-fetch]: https://github.com/github/fetch
[frisbee]: https://github.com/glazedio/frisbee
[axios]: https://github.com/mzabriskie/axios
[request]: https://github.com/request/request
