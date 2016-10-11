// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import querystring from 'querystring'
import {spy} from 'sinon'

import {
    Fetcher,
    createSerializeParams
} from '../index'
import type {FetcherRec} from '../index'

describe('FetcherTest', () => {
    describe('base', () => {
        it('should create RequestOptions and fullUrl', () => {
            const options: FetcherRec<*> = {
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
                method: 'GET'
            }
            assert(baseOptions.fullUrl === options.baseUrl)
            assert.deepEqual(baseOptions.options, result)
        })

        it('should merge parameters in new instance', () => {
            const aOptions: FetcherRec<*> = {
                method: 'GET'
            }
            const bOptions: FetcherRec<*> = {
                method: 'POST'
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(a !== b)
            assert(b.options.method === 'POST')
        })

        it('should merge headers', () => {
            const aOptions: FetcherRec<*> = {
                headers: {
                    a: 'a1',
                    c: 'c1'
                }
            }
            const bOptions: FetcherRec<*> = {
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
            const aOptions: FetcherRec<*> = {
                postProcess: p1
            }
            const p2 = spy((v) => v + 2)
            const bOptions: FetcherRec<*> = {
                postProcess: p2
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            const result: Promise<any> = b.postProcess((1: any))

            assert(result === 4)
            assert(p1.calledWith(1))
            assert(p2.calledWith(2))
        })

        it('should build fullUrl', () => {
            const aOptions: FetcherRec<*> = {
                baseUrl: '/api'
            }
            const bOptions: FetcherRec<*> = {
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
            const aOptions: FetcherRec<*> = {
                baseUrl: '/api',
                serializeParams: createSerializeParams(querystring.stringify)
            }
            const bOptions: FetcherRec<*> = {
                url: '/user/:id/:id2',
                params: {
                    id: '1',
                    id2: '2'
                }
            }
            const a = new Fetcher(aOptions)
            const b = a.copy(bOptions)
            assert(b.fullUrl === '/api/user/1/2')
        })

        it('should build fullUrl with query', () => {
            const aOptions: FetcherRec<*> = {
                baseUrl: '/api',
                serializeParams: createSerializeParams(querystring.stringify)
            }
            const bOptions: FetcherRec<*> = {
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
            const aOptions: FetcherRec<*> = {
                baseUrl: '/api',
                serializeParams: createSerializeParams(
                    querystring.stringify,
                    new RegExp('<([\\w]+)>', 'g')
                )
            }
            const bOptions: FetcherRec<*> = {
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
            const aOptions: FetcherRec<*> = {
                baseUrl: '/api',
                serializeParams: (url: string, params: {[id: string]: string}) =>
                    url + JSON.stringify(params)
            }
            const bOptions: FetcherRec<*> = {
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
