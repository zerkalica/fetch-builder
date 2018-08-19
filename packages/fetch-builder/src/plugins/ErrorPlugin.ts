import {RequestOptionsExtra, FetcherPlugin} from '../PluginManager'
import {ServerErrorInfo, HttpError} from '../HttpError'

export class ErrorPlugin implements FetcherPlugin {
    createServerErrorInfo(data: string): ServerErrorInfo {
        return JSON.parse(data)
    }

    responseData(response: Response, extra: RequestOptionsExtra): Promise<any> | void {
        if (response.status < 400) return

        return response.text()
            .then((data: string) => {
                const serverInfo = this.createServerErrorInfo(data)
                throw new HttpError({
                    extra,
                    response,
                    serverInfo
                })
        })
    }
}
