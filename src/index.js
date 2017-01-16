/* @flow */
/* eslint-env browser */
import Err from 'es6-error'

export type StrDict = {[id: string]: string}

/**
 * Bound values to url placeholders or add query string
 */
export type SerializeParams = (url: string, params: StrDict) => string

export type PostProcess<I, O> = (params: I) => O
export type Preprocess<Result, Params>
    = (req: IFetcher<Result, Params>) => Promise<IFetcher<Result, Params>>

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
export type FetcherRec<Params: Object> = {
    /**
     * `baseUrl` will be prepended to `url`.
     *
     * Supported placeholders like `:id`.
     *
     * @example https://some-serckkver.org/
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
     * function postProcess<Result>(response: Promise<Response>): Promise<Result> {
     *     return response.then(r => r.json)
     * }
     *
     * fetch(fullUrl, options).then(postProcess)
     * ```
     */
    postProcess?: ?PostProcess<*, *>;

    /**
     * Preprocess Request options before fetch
     *
     * @example
     * ```js
     * // @flow
     *
     * function preProcess<R, P>(opts: IFetcher<R, P>): Promise<IFetcher<R, P>> {
     *     return Promise.resolve(opts)
     * }
     *
     * preprocess(fetcher).then((f) => fetch(f.fullUrl, f.options).then(f.postProcess))
     * ```
     */
    preProcess?: ?Preprocess<*, *>;

    /**
     * Whatwg fetch function, default to global fetch
     */
    fetchFn?: ?FetchFn;

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
     * Composable fetch.then postProcess function.
     */
    postProcess: (response: Promise<Response>) => Promise<Result>;

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcess will be composed with existing postProcess.
     */
    copy<R, P: Object>(rec: FetcherRec<P>): IFetcher<R, P>;

    /**
     * Fetch data
     *
     */
    fetch(rec?: FetcherRec<*>): Promise<Result>;
}

function isFormData(val: Object): boolean {
    return (typeof FormData !== 'undefined') && (val instanceof FormData)
}

const toString = Object.prototype.toString
function isBlob(val: Object): boolean {
    return toString.call(val) === '[object Blob]'
}

function isURLSearchParams(val: Object): boolean {
    return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams
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
            continue // eslint-disable-line
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

function compose<In1, Out1, Out2>(
    f1: (arg: In1) => Out1,
    f2: (arg: Out1) => Out2
): (arg: In1) => Out2 {
    return (arg: In1) => f2(f1(arg))
}

function pass<V>(arg: V): any {
    return arg
}

export type FetchFn = (url: string, options: RequestOptions) => Promise<Response>;

/**
 * Cacheable data loader
 */
export class Loader<Result> {
    _result: ?Promise<Result> = null
    _fetcher: ?IFetcher<Result, *>

    constructor(fetcher?: IFetcher<Result, *>) {
        this._fetcher = fetcher || null
    }

    _onError: (err: Error) => void = (err: Error) => {
        this.reset()
        throw err
    }

    fetch(): Promise<Result> {
        let result: ?Promise<Result> = this._result
        if (result) {
            return result
        }

        result = this._fetch(this._fetcher)
            .catch(this._onError)

        this._result = result

        return result
    }

    _fetch(fetcher?: ?IFetcher<Result, *>): Promise<Result> { // eslint-disable-line
        if (!fetcher) {
            throw new Error('Fetcher is not initialized')
        }

        return fetcher.fetch()
    }

    reset(): Loader<Result> {
        this._result = null
        return this
    }
}

function defaultGetKey(rec: FetcherRec<*>): string {
    const params: {[id: string]: string} = rec.params || {}
    return Object.keys(params).sort().map((key: string) => `${key}:${params[key]}`).join('.')
}

function callFetch<Result, Params: Object>(f: IFetcher<Result, Params>): Promise<Result> {
    return f.fetch()
}

/**
 * Fetch options builder
 */
export class Fetcher<Result, Params: Object> {
    _baseUrl: string
    _serializeParams: ?SerializeParams
    _url: string
    _params: ?Params
    _fetchFn: FetchFn

    /**
     * Request options.
     */
    options: RequestOptions

    /**
     * Generated full url from baseUrl, url and params.
     */
    fullUrl: string

    postProcess: (req: Promise<Response>) => Promise<Result>

    preProcess: ?Preprocess<Result, Params>;

    constructor(rec?: FetcherRec<Params> = {}) {
        this._baseUrl = rec.baseUrl || '/'
        this._serializeParams = rec.serializeParams
        this._params = rec.params || null
        this._url = rec.url || ''
        this.postProcess = rec.postProcess || pass
        this._fetchFn = rec.fetchFn || (typeof fetch === 'undefined' ? pass : fetch)
        this.preProcess = rec.preProcess || null
        let headers: ?HeadersInit = rec.headers || {}

        let isPlainObject: boolean = false
        const body = rec.body
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

        const options: RequestOptions = {
            body: isPlainObject && body ? JSON.stringify(body) : body,
            headers
        }
        if (rec.cache) options.cache = rec.cache
        if (rec.credentials) options.credentials = rec.credentials
        if (rec.integrity) options.integrity = rec.integrity
        if (rec.method) options.method = rec.method
        if (rec.mode) options.mode = rec.mode
        if (rec.redirect) options.redirect = rec.redirect
        if (rec.referrer) options.referrer = rec.referrer
        if (rec.referrerPolicy) options.referrerPolicy = rec.referrerPolicy

        this.options = options

        if (this._params) {
            if (!this._serializeParams) {
                throw new TypeError('params exists, but no serializeParams method provided')
            }
            this.fullUrl = this._baseUrl + this._serializeParams(this._url, this._params)
        } else {
            this.fullUrl = this._baseUrl + this._url
        }
    }

    /**
     * Create new copy of Fetcher with some options redefined.
     *
     * Headers will be merged with existing headers.
     * postProcessors will be composed with existing postProcessors.
     */
    copy<R, P: Object>(rec: FetcherRec<any>): IFetcher<R, P> {
        const headers: ?HeadersInit = this.options.headers
        return (new this.constructor({
            baseUrl: rec.baseUrl || this._baseUrl,
            serializeParams: this._serializeParams,
            url: this._url,
            ...this.options,
            ...rec,
            postProcess: rec.postProcess
                ? compose(this.postProcess, rec.postProcess)
                : this.postProcess,
            params: this._params
                ? {...this._params, ...rec.params || {}}
                : rec.params,
            headers: rec.headers
                ? mergeHeaders(headers, rec.headers)
                : headers
        }): any)
    }

    _fetch(f: IFetcher<Result, Params>): Promise<Result> {
        const result = this._fetchFn.call(null, f.fullUrl, f.options)
        return f.postProcess(result)
    }

    fetch(rec?: FetcherRec<*>): Promise<Result> {
        const opts: IFetcher<Result, Params> = rec
            ? this.copy(rec)
            : this

        return this.preProcess
            ? this.preProcess(opts).then(callFetch)
            : this._fetch(opts)
    }
}

if (0) ((new Fetcher(...(0: any))): IFetcher<*, *>) // eslint-disable-line

export class Repository<Result> {
    _loaders: Map<string, Loader<Result>>;
    _getKey: (params: FetcherRec<*>) => string;

    constructor(
        getKey?: ?(params: FetcherRec<*>) => string
    ) {
        this._loaders = new Map()
        this._getKey = getKey || defaultGetKey
    }

    fetch(params: FetcherRec<*>): Promise<Result> {
        const key: string = this._getKey(params)
        let loader: ?Loader<Result> = this._loaders.get(key)
        if (!loader) {
            loader = new Loader(new Fetcher(params))
            this._loaders.set(key, loader)
        }

        return loader.fetch()
    }

    _clearAll: (loader: Loader<Result>) => void = (loader: Loader<Result>) => {
        loader.reset()
    };

    reset(params?: FetcherRec<*>): Repository<Result> {
        if (!params) {
            this._loaders.forEach(this._clearAll)
            return this
        }

        const loader: ?Loader<Result> = this._loaders.get(this._getKey(params))
        if (loader) {
            loader.reset()
        }

        return this
    }
}
