import {RequestOptionsExtra} from './PluginManager'

export interface ServerErrorInfo {
    code?: string | void
    id?: string | void
    userMessage?: string | void
}

export interface HttpErrorOptions {
    extra: RequestOptionsExtra
    parent?: Error | void
    response?: Response
    serverInfo?: ServerErrorInfo
}

export class HttpError extends Error {
    id: string
    message: string
    stack: string

    status: number | void
    code: string | void
    userMessage: string | void

    private extra: RequestOptionsExtra

    constructor({extra, parent, response, serverInfo}: HttpErrorOptions) {
        super(
            (parent
                ? (parent.message || parent.stack)
                : (response && response.statusText)
            ) || 'unknown'
        )

        if (parent) {
            this.status = (parent as any).status || null
            this.stack = parent.stack
        } else if (response) {
            this.status = response.status || null
        } else {
            this.status = null
        }

        this.userMessage = serverInfo && serverInfo.userMessage
        this.id = (serverInfo && serverInfo.id) || ('cli-' + String(Date.now()))
        this.code = (serverInfo && serverInfo.code)
        this.extra = extra
        this['__proto__'] = new.target.prototype
    }

    toJSON() {
        const extra = this.extra

        return {
            id: this.id,
            code: this.code,
            userMessage: this.userMessage,
            message: this.message,
            stack: this.stack,
            status: this.status,
            request: {
                id: extra.id,
                url: extra.url,
                method: extra.options.method || 'GET',
                body: extra.options.body ? String(extra.options.body) : null,
            }
        }
    }
}
