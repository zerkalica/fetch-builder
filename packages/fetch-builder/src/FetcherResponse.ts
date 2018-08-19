import {HttpError} from './HttpError'
import {RequestOptionsExtra, RequestType, ResponseData, PluginManager} from './PluginManager'

export interface FetcherResponseOptions {
    method: string
    url: string
    pm: PluginManager
    timeout?: number | void
    requestMap: Map<string, FetcherResponse>
    key: string
}

export type FetcherResponseClass = new(opts: FetcherResponseOptions) => FetcherResponse

const debugKey = Symbol('FetcherResponse')
export function getDebugInfo(p: Promise<any>): FetcherResponse | void {
    return p[debugKey]
}

export class FetcherResponse implements RequestOptionsExtra {
    protected pm: PluginManager
    protected ac: AbortController
    protected key: string
    protected requestMap: Map<string, FetcherResponse>

    timeout: number
    type: RequestType = 'text'
    id: string = String(Date.now())
    url: string
    options: RequestInit

    constructor(opts: FetcherResponseOptions) {
        this.pm = opts.pm
        this.ac = new AbortController()
        this.key = opts.key
        this.requestMap = opts.requestMap

        this.timeout = opts.timeout || 20000
        this.url = opts.url
        this.options = {method: opts.method, body: undefined}
    }

    toJSON() {
        return {
            id: this.id,
            url: this.url,
            type: this.type,
            method: this.options.method,
            body: String(this.options.body),
        }
    }

    toString() {
        return `#${this.id} ${this.options.method || 'GET'} ${this.url}`
    }

    protected cache: Promise<ResponseData<any>> | void = undefined

    protected result(body?: string | FormData | Object | void): Promise<ResponseData<any>> {
        const {pm, options} = this
        if (this.cache) return this.cache

        if (body) {
            options.body = body instanceof Object && !(body instanceof FormData)
                ? JSON.stringify(body)
                : body
        }

        this.ac.abort()
        this.ac = new AbortController()
        ;(options as any).abort = this.ac.signal

        const promise: Promise<ResponseData<any>> = this.cache = pm.updateOptions(this)
            .then((extra: RequestOptionsExtra) => {
                return pm.fetch(extra)
                    .then((response: Response) =>
                        pm.responseData(response, extra)
                            .catch((parent: Error) => {
                                throw parent instanceof HttpError
                                    ? parent
                                    : new HttpError({extra, parent, response})
                            })
                    )
                    .catch((parent: Error) => {
                        throw parent instanceof HttpError
                            ? parent
                            : new HttpError({extra, parent})
                    })
            })
            .catch((parent: Error) => {
                throw parent instanceof HttpError
                    ? parent
                    : new HttpError({extra: this, parent})
            })

        this.addDebugInfo(promise)

        return promise
    }

    reset() {
        this.ac.abort()
        this.cache = undefined
    }

    abort() {
        this.ac.abort()
        this.cache = undefined
    }

    protected addDebugInfo(target: Object) {
        target[debugKey] = this
    }

    get response(): Promise<Response> {
        return this.result().then(data => data.response)
    }

    get headers(): Promise<Headers> {
        return this.response.then(r => r.headers)
    }

    protected getData = (resData: ResponseData<any>) => resData.data

    text(body?: string | Object | FormData): Promise<string> {
        this.type = 'text'
        return this.result(body).then(this.getData)
    }

    json<V extends Object>(body?: string | Object | FormData): Promise<V> {
        this.type = 'json'
        return this.result(body).then(this.getData)
    }

    blob(body?: string | Object | FormData): Promise<Blob> {
        this.type = 'blob'
        return this.result(body).then(this.getData)
    }

    formData(body?: string | Object | FormData): Promise<FormData> {
        this.type = 'formData'
        return this.result(body).then(this.getData)
    }

    arrayBuffer(body?: string | Object | FormData): Promise<ArrayBuffer> {
        this.type = 'arrayBuffer'
        return this.result(body).then(this.getData)
    }

    destructor() {
        this.ac.abort()
        this.requestMap.delete(this.key)
    }
}
