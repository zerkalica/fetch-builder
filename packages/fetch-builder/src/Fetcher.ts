import {FetcherResponse, FetcherResponseClass} from './FetcherResponse'
import {PluginManager, FetcherPlugin} from './PluginManager'

export type UrlMap = [RegExp | string, string]

export interface FetcherOptions {
    timeout?: number | void
    plugins?: FetcherPlugin[]
    baseUrl?: string | UrlMap[]
    FetcherResponse?: FetcherResponseClass | void
}

export class Fetcher {
    private baseUrl: [RegExp, string][]
    protected timeout: number
    protected pm: PluginManager
    protected FetcherResponse: FetcherResponseClass

    constructor(opts: FetcherOptions) {
        const baseUrl = opts.baseUrl
        this.FetcherResponse = opts.FetcherResponse || FetcherResponse
        this.pm = new PluginManager(opts.plugins)
        this.baseUrl = baseUrl instanceof Array
            ? baseUrl.map(([mask, src]: UrlMap) => ([
                mask instanceof RegExp ? mask : new RegExp(mask),
                src
            ])) as [RegExp, string][]
            : [[new RegExp('.*'), baseUrl || '']]

        this.timeout = opts.timeout || 120000
    }

    protected fullUrl(url: string): string {
        const bu = this.baseUrl
        let baseUrl = ''
        for (let i = 0; i < bu.length; i++) {
            const [mask, base] = bu[i]
            if (mask.test(url)) {
                baseUrl = base
                break
            }
        }

        return baseUrl + url
    }

    private requestMap: Map<string, FetcherResponse> = new Map()

    protected request(method: string, url: string): FetcherResponse {
        const {requestMap, FetcherResponse} = this
        const key = `${method}.${url}`
        let response: FetcherResponse = requestMap.get(key)
        if (!response) {
            response = new FetcherResponse({
                method,
                url: this.fullUrl(url),
                pm: this.pm,
                timeout: this.timeout,
                requestMap,
                key
            })
            requestMap.set(key, response)
        }

        return response
    }

    post<V>(url: string): FetcherResponse {
        return this.request('POST', url)
    }

    get(url: string): FetcherResponse {
        return this.request('GET', url)
    }

    put(url: string): FetcherResponse {
        return this.request('PUT', url)
    }

    delete(url: string): FetcherResponse {
        return this.request('DELETE', url)
    }

    patch(url: string): FetcherResponse {
        return this.request('PATCH', url)
    }
}
