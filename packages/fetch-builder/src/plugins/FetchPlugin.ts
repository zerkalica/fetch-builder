import {RequestOptionsExtra, FetcherPlugin} from '../PluginManager'
import {timeoutPromise} from '../timeoutPromise'

export class FetchPlugin implements FetcherPlugin {
    fetch(extra: RequestOptionsExtra): Promise<Response | void> | void {
        return timeoutPromise(fetch(extra.url, extra.options), extra.timeout)
    }
}
