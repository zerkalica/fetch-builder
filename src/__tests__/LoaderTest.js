// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import {spy} from 'sinon'

import {
    Loader,
    Fetcher
} from '../index'
import type {FetcherRec} from '../index'

describe('LoaderTest', () => {
    it('custom loader', () => {
        const result = 'test'
        const fakeFetch = spy(() => Promise.resolve(result))
        const options: FetcherRec<*> = {
            baseUrl: '/api',
            headers: {
                'Accept-Language': 'ru'
            },
            cacheable: true,
            method: 'GET',
            fetchFn: fakeFetch
        }
        class MyLoader extends Loader {
            constructor() {
                const opts = new Fetcher(options)
                super(opts)
            }
        }

        const loader = new MyLoader()
        return loader.fetch()
            .then(() => {
                assert(fakeFetch.calledOnce)
            })
    })

    it('should call cacheable fetch once', () => {
        const result = 'test'
        const fakeFetch = spy(() => Promise.resolve(result))
        const options: FetcherRec<*> = {
            baseUrl: '/api',
            headers: {
                'Accept-Language': 'ru'
            },
            cacheable: true,
            method: 'GET',
            fetchFn: fakeFetch
        }
        const loader = new Loader(new Fetcher(options))
        return loader.fetch()
            .then(() => loader.fetch())
            .then(() => {
                assert(fakeFetch.calledOnce)
            })
    })

    it('should call fetch after reset', () => {
        const result = 'test'
        const fakeFetch = spy(() => Promise.resolve(result))
        const options: FetcherRec<*> = {
            baseUrl: '/api',
            headers: {
                'Accept-Language': 'ru'
            },
            cacheable: false,
            method: 'GET',
            fetchFn: fakeFetch
        }
        const loader = new Loader(new Fetcher(options))
        return loader.fetch()
            .then(() => loader.reset().fetch())
            .then(() => {
                assert(fakeFetch.calledTwice)
            })
    })
})
