// @flow

export class TimeoutError extends Error {
    statusCode: number

    constructor(timeout: number) {
        super('Request timeout client emulation: ' + (timeout / 1000) + 's')
        this.statusCode = 408
        this['__proto__'] = new.target.prototype
    }
}

export function timeoutPromise<D>(
    promise: Promise<D>,
    timeout?: number | void
): Promise<D> {
    if (!timeout) return promise
    const tm = timeout

    return Promise.race([
        promise,
        new Promise((resolve: (data: D) => void, reject: (err: any) => void) => {
            setTimeout(() => reject(new TimeoutError(tm)), tm)
        })
    ])
}
