import {ExtractDataPlugin, ErrorPlugin, FetchPlugin} from './plugins'

export type RequestType = 'text' | 'json' | 'arrayBuffer' | 'blob' | 'formData'
export interface RequestOptionsExtra {
    id: string
    url: string
    type: RequestType
    timeout: number
    options: RequestInit
}

export interface FetcherPlugin {
    updateOptions?: (opts: RequestOptionsExtra) => RequestOptionsExtra | Promise<RequestOptionsExtra | void> | void
    fetch?: (extra: RequestOptionsExtra) => Promise<Response | void> | void
    responseData?: (response: Response, extra: RequestOptionsExtra) => void | Promise<any | void>
}

export class ResponseData<V> {
    constructor(public response: Response, public data: V) {}
}

const defaultPlugins: FetcherPlugin[] = [
    new FetchPlugin(),
    new ErrorPlugin(),
    new ExtractDataPlugin(),
]

export class PluginManager {
    private plugins: FetcherPlugin[]

    constructor(plugins: FetcherPlugin[] = []) {
        this.plugins = [...plugins, ...defaultPlugins]
    }

    private createResponseData(plugin: FetcherPlugin, response: Response, extra: RequestOptionsExtra) {
        return (normalized: any | void) => {
            return normalized === undefined && plugin.responseData
                ? plugin.responseData(response, extra)
                : normalized
        }
    }

    responseData(response: Response, extra: RequestOptionsExtra): Promise<ResponseData<any>> {
        let result: Promise<any> = Promise.resolve(undefined)
        for (let plugin of this.plugins) {
            if (plugin.responseData)
                result = result.then(this.createResponseData(plugin, response, extra))
        }

        return result.then(data => new ResponseData(response, data))
    }

    private createUpdater(plugin: FetcherPlugin) {
        return (prev: RequestOptionsExtra) => 
            Promise.resolve(plugin.updateOptions && plugin.updateOptions(prev))
                .then((next: RequestOptionsExtra | void) => next || prev)
    }

    updateOptions(extra: RequestOptionsExtra): Promise<RequestOptionsExtra> {
        let result: Promise<RequestOptionsExtra> = Promise.resolve(extra)
        for (let plugin of this.plugins) {
            if (plugin.updateOptions)
                result = result.then(this.createUpdater(plugin))
        }

        return result
    }

    private createFetch(plugin: FetcherPlugin, extra: RequestOptionsExtra) {
        return (prev: Response | void) => {
            return prev === undefined && plugin.fetch
                ? plugin.fetch(extra)
                : prev
        }
    }

    fetch(extra: RequestOptionsExtra): Promise<Response> {
        let result: Promise<Response | void> = Promise.resolve(undefined)
        for (let plugin of this.plugins) {
            if (plugin.fetch)
                result = result.then(this.createFetch(plugin, extra))
        }

        return result
            .then((resp: Response | void) => {
                if (resp === undefined) throw new Error('Need FetchPlugin' + extra)
                return resp
            }) as Promise<Response>
    }
}
