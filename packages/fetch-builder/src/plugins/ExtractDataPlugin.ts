import {RequestOptionsExtra, FetcherPlugin} from '../PluginManager'

export class ExtractDataPlugin implements FetcherPlugin  {
    responseData(r: Response, extra: RequestOptionsExtra): Promise<any> | void {
        switch (extra.type) {
            case 'json':
                return r.status === 204
                    ? Promise.resolve({})
                    : r.text()
                        .then(data => data ? JSON.parse(data) : {})

            case 'arrayBuffer': return r.arrayBuffer()
            case 'blob': return r.blob()
            case 'formData': return r.formData()

            case 'text':
                return r.status === 204 ? Promise.resolve('') : r.text()

            default:
                return
        }
    }
}

