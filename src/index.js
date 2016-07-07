/* @flow */

import Err from 'es6-error'

export type StrDict = {[id: string]: string}

function isFormData(val: Object): boolean {
    return (typeof FormData !== 'undefined') && (val instanceof FormData)
}

function isBlob(val: Object): boolean {
    return toString.call(val) === '[object Blob]'
}

function isURLSearchParams(val: Object): boolean {
    return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams
}

export function mergeHeaders(...headerSets: any[]): HeadersInit {
    const isSupported: boolean = typeof Headers !== 'undefined'
    let result: HeadersInit = isSupported ? new Headers() : {}

    for (let i = 0, l = headerSets.length; i < l; i++) {
        const headers: ?HeadersInit = headerSets[i]
        if (!headers || typeof headers !== 'object') {
            continue
        }

        if (isSupported && result instanceof Headers) {
            if (headers instanceof Headers) {
                const entries: [string, string][] = Array.from(headers.entries())
                for (let i = 0, l = entries.length; i < l; i++) {
                    const [k, v] = entries[i]
                    result.append(k, v)
                }
            } else {
                const entries: string[] = Object.keys(headers)
                for (let i = 0, l = entries.length; i < l; i++) {
                    result.append(entries[i], headers[entries[i]])
                }
            }
        } else {
            result = {...result, ...(headers: Object)}
        }
    }

    return result
}

export interface FetchOptions<V> {
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

export function checkStatus(response: Response): Response {
    if (response.status >= 200 && response.status < 300) {
        return response
    }
    throw new HttpError(response)
}

export class FetchBuilder<V = Request> {
    _baseUrl: string;
    _getQueryParams: ?(params: ?Object) => string;
    _url: string;
    _params: ?StrDict;

    options: RequestOptions;
    fullUrl: string;
    postProcess: (response: Response) => Promise<V>;

    constructor(rec?: FetchOptions = {}) {
        this._baseUrl = rec.baseUrl || '/'
        this._getQueryParams = rec.getQueryParams
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
                    headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
                } else {
                    (headers: Object)['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
                }
            }
        }

        this.options = {
            body: isPlainObject && body ? JSON.stringify(body) : body,
            headers,
            cache: rec.cache,
            credentials: rec.credentials,
            integrity: rec.integrity,
            method: rec.method,
            mode: rec.mode,
            redirect: rec.redirect,
            referrer: rec.referrer,
            referrerPolicy: rec.referrerPolicy
        }
        let paramStr: string = ''
        if (rec.params) {
            if (!this._getQueryParams) {
                throw new TypeError('params exists, but no getQueryParams method provided')
            }
            paramStr = this._getQueryParams(rec.params)
        }
        this.fullUrl = this._baseUrl + this._url + paramStr
    }

    copy(rec: FetchOptions): FetchBuilder {
        const headers: ?HeadersInit = this.options.headers
        return new FetchBuilder({
            baseUrl: this._baseUrl,
            getQueryParams: this._getQueryParams,
            postProcess: this.postProcess,
            url: this._url,
            ...this.options,
            ...rec,
            params: this._params
                ? {...this._params, ...rec.params || {}}
                : rec.params,
            headers: rec.headers ? mergeHeaders(headers, rec.headers) : headers
        })
    }
}
