// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import querystring from 'querystring'
import {spy} from 'sinon'

import {
    Fetcher,
    createSerializeParams
} from '../index'
import type {FetchOptionsRec} from '../index'

describe('FetchOptionsTest', () => {
    describe('base', () => {
        it('should create RequestOptions and fullUrl', () => {
            const options: FetchOptionsRec = {
                baseUrl: '/api',
                headers: {
                    'Accept-Language': 'ru'
                },
                method: 'GET'
            }
            const baseOptions = new Fetcher(options)

            const result: RequestOptions = {
                body: null,
                headers: {
                    'Accept-Language': 'ru'
                },
                cache: null,
                credentials: null,
                integrity: null,
                method: 'GET',
                mode: null,
                redirect: null,
                referrer: null,
                referrerPolicy: null
            }
            assert(baseOptions.fullUrl === options.baseUrl)
            assert.deepEqual(baseOptions.options, result)
        })

        it('should merge parameters in new instance', () => {
            const aOptions: FetchOptionsRec = {
                method: 'GET'
            }
            const bOptions: FetchOptionsRec = {
                method: 'POST'
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(a !== b)
            assert(b.options.method === 'POST')
        })

        it('should merge headers', () => {
            const aOptions: FetchOptionsRec = {
                headers: {
                    a: 'a1',
                    c: 'c1'
                }
            }
            const bOptions: FetchOptionsRec = {
                headers: {
                    a: 'a2',
                    b: 'b1'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)

            assert.deepEqual(b.options.headers, {
                a: 'a2',
                b: 'b1',
                c: 'c1'
            })
        })

        it('should compose postProcess', () => {
            const p1 = spy((v) => v + 1)
            const aOptions: FetchOptionsRec = {
                postProcess: p1
            }
            const p2 = spy((v) => v + 2)
            const bOptions: FetchOptionsRec = {
                postProcess: p2
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            const result = b.postProcess((1: any))
            assert(result === 4)
            assert(p1.calledWith(1))
            assert(p2.calledWith(2))
        })

        it('should build fullUrl', () => {
            const aOptions: FetchOptionsRec = {
                baseUrl: '/api'
            }
            const bOptions: FetchOptionsRec = {
                url: '/user'
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/user')
        })
    })

    describe('serializeParams related', () => {
        it('should throw error if no createSerializeParams provided and params is set', () => {
            assert.throws(() =>
                new Fetcher({
                    params: {
                        a: '1'
                    }
                })
            )
        })

        it('should build fullUrl with template', () => {
            const aOptions: FetchOptionsRec = {
                baseUrl: '/api/:base',
                serializeParams: createSerializeParams(querystring.stringify)
            }
            const bOptions: FetchOptionsRec = {
                url: '/user/:id/:id2',
                params: {
                    base: 'root',
                    id: '1',
                    id2: '2'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/root/user/1/2')
        })

        it('should build fullUrl with query', () => {
            const aOptions: FetchOptionsRec = {
                baseUrl: '/api',
                serializeParams: createSerializeParams(querystring.stringify)
            }
            const bOptions: FetchOptionsRec = {
                url: '/user',
                params: {
                    id: '1',
                    id2: '2'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/user?id=1&id2=2')
        })

        it('should build fullUrl with custom placeholder RegExp', () => {
            const aOptions: FetchOptionsRec = {
                baseUrl: '/api',
                serializeParams: createSerializeParams(
                    querystring.stringify,
                    new RegExp('<([\\w]+)>', 'g')
                )
            }
            const bOptions: FetchOptionsRec = {
                url: '/user/<id>',
                params: {
                    id: '1',
                    id2: '2'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/user/1?id2=2')
        })

        it('should build fullUrl with custom serializeParams', () => {
            const aOptions: FetchOptionsRec = {
                baseUrl: '/api',
                serializeParams: (url: string, params: {[id: string]: string}) =>
                    url + JSON.stringify(params)
            }
            const bOptions: FetchOptionsRec = {
                url: '/user',
                params: {
                    id: '1',
                    id2: '2'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/user' + JSON.stringify(bOptions.params))
        })
    })
})
