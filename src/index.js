/* @flow */

import Err from 'es6-error'

export type StrDict = {[id: string]: string}
export type PostProcess<I, O> = (params: I) => O

/**
 * Bound values to url placeholders or add query string
 */
export type SerializeParams = (url: string, params: StrDict) => string

/**
 * Input args for Fetcher
 *
 * @example
```js
{
    baseUrl: '/api',
    headers: {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4'
    },
    method: 'GET',
    postProcess,
    serializeParams
}
```
 */
export type FetchOptions = {
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

export interface IFetcher<V> {
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
    postProcess: (response: Response) => Promise<V>;

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcess will be composed with existing postProcess.
     */
    copy(rec: FetchOptions): IFetcher;

    /**
     * Fetch data.
     *
     * Need fetch polyfill.
     */
    fetch(rec?: ?FetchOptions): Promise<V>;
}

function isFormData(val: Object): boolean {
    return (typeof FormData !== 'undefined') && (val instanceof FormData)
}

function isBlob(val: Object): boolean {
    return toString.call(val) === '[object Blob]'
}

function isURLSearchParams(val: Object): boolean {
    return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams
}

function composePostProcess(fn1: PostProcess, fn2: PostProcess): PostProcess {
    return (params: any) => fn2(fn1(params))
}

/**
 * Merge headers objects.
 *
 * Uses global Headers class if exists.
 *
 * @example
 * ```js
 * // @flow
 * mergeHeaders({a: 1}, {a: 2, b: 3})
 * // If Headers not supported, result is object: {a: 2, b: 3}
 * // Else result is new Headers({a: 2, b: 3})
 * ```
 */
export function mergeHeaders(...headerSets: (?HeadersInit)[]): HeadersInit {
    const isSupported: boolean = typeof Headers !== 'undefined'
    let result: HeadersInit = isSupported ? new Headers() : {}

    for (let i = 0, l = headerSets.length; i < l; i++) {
        const headers: ?HeadersInit = headerSets[i]
        if (!headers || typeof headers !== 'object') {
            continue
        }

        if (isSupported && result instanceof Headers) {
            if (headers instanceof Headers && Array.from) {
                const entries: [string, string][] = Array.from(headers.entries())
                for (let j = 0, k = entries.length; j < k; j++) {
                    const [name, v] = entries[j]
                    result.append(name, v)
                }
            } else {
                const entries: string[] = Object.keys(headers)
                for (let j = 0, k = entries.length; j < k; j++) {
                    result.append(entries[j], headers[entries[j]])
                }
            }
        } else {
            result = {...result, ...(headers: Object)}
        }
    }

    return result
}

function pass(v: Response): any {
    return v
}

export class HttpError extends Err {
    response: Response;

    constructor(response: Response) {
        super(response.statusText)
        this.response = response
    }
}

/**
 * Check response status value and throw error if it not in 200-300 range.
 */
export function checkStatus(response: Response): Response {
    if (response.status >= 200 && response.status < 300) {
        return response
    }
    throw new HttpError(response)
}

function regExpMapString(replaceRegExp: RegExp, template: string, params: StrDict): {
    str: string,
    newParams: StrDict
} {
    const newParams: StrDict = {...params}
    const str: string = template.replace(replaceRegExp, (v, k: string) => {
        if (!params[k]) {
            throw new Error(`No parameter provided to params: ${k}`)
        }
        delete newParams[k]
        return params[k]
    })

    return {
        str,
        newParams
    }
}

const DEFAULT_MAP_REGEXP = new RegExp(':([\\w]+)', 'g')

/**
 * Create params serializer.
 */
export function createSerializeParams(
    stringify: (params: StrDict) => string,
    placeholderRegExp: RegExp = DEFAULT_MAP_REGEXP
): SerializeParams {
    function serializeParams(url: string, params: StrDict): string {
        const {str, newParams} = regExpMapString(placeholderRegExp, url, params)
        const qStr: string = stringify(newParams)

        return str + (qStr ? ('?' + qStr) : '')
    }

    return serializeParams
}

/**
 * Fetch options builder
 */
export class Fetcher<V> {
    _baseUrl: string;
    _serializeParams: ?SerializeParams;
    _url: string;
    _params: ?StrDict;

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
    postProcess: (response: Response) => Promise<V>;

    constructor(rec?: FetchOptions = {}) {
        this._baseUrl = rec.baseUrl || '/'
        this._serializeParams = rec.serializeParams
        this.postProcess = rec.postProcess || pass
        this._params = rec.params || null
        this._url = rec.url || ''

        let headers: ?HeadersInit = rec.headers || {}

        let isPlainObject: boolean = false
        const body = rec.body || null
        if (body && typeof body === 'object') {
            const isUrlSearchParams: boolean = isURLSearchParams(body)
            isPlainObject =
                !isFormData(body)
                && !isBlob(body)
                && !isUrlSearchParams

            if (isUrlSearchParams) {
                if (!headers) {
                    headers = {}
                }
                if (typeof Headers !== 'undefined' && headers instanceof Headers) {
                    if (!headers.has('Content-type')) {
                        headers.set(
                            'Content-Type',
                            'application/x-www-form-urlencoded;charset=utf-8'
                        )
                    }
                } else if (!(headers: Object)['Content-Type']) {
                    (headers: Object)['Content-Type']
                        = 'application/x-www-form-urlencoded;charset=utf-8'
                }
            }
        }

        this.options = {
            body: isPlainObject && body ? JSON.stringify(body) : body,
            headers,
            cache: rec.cache || null,
            credentials: rec.credentials || null,
            integrity: rec.integrity || null,
            method: rec.method || null,
            mode: rec.mode || null,
            redirect: rec.redirect || null,
            referrer: rec.referrer || null,
            referrerPolicy: rec.referrerPolicy || null
        }

        if (this._params) {
            if (!this._serializeParams) {
                throw new TypeError('params exists, but no serializeParams method provided')
            }
            this.fullUrl = this._serializeParams(this._baseUrl + this._url, this._params)
        } else {
            this.fullUrl = this._baseUrl + this._url
        }
    }

    fetch(params?: ?FetchOptions = {}): Promise<V> {
        const r: IFetcher<V> = params
            ? this.copy(params)
            : this

        return fetch(r.fullUrl, r.options).then(r.postProcess)
    }

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcess will be composed with existing postProcess.
     */
    copy(rec: FetchOptions): Fetcher<V> {
        const headers: ?HeadersInit = this.options.headers
        return new this.constructor({
            baseUrl: this._baseUrl,
            serializeParams: this._serializeParams,
            url: this._url,
            ...this.options,
            ...rec,
            postProcess: rec.postProcess
                ? composePostProcess(this.postProcess, rec.postProcess)
                : this.postProcess,
            params: this._params
                ? {...this._params, ...rec.params || {}}
                : rec.params,
            headers: rec.headers
                ? mergeHeaders(headers, rec.headers)
                : headers
        })
    }
}
if (0) ((new Fetcher()): IFetcher) // eslint-disable-line
