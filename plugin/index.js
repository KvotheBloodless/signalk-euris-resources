/*
 * MIT License
 *
 * Copyright (c) 2024 Paul Willems <paul.willems@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const client = require('./euris_client')
const lockUtils = require('./lock_utilities')
const loadingCache = require('@inventivetalent/loading-cache')
const time = require('@inventivetalent/time')

const eurisCachesDurationMinutes = 60

module.exports = function (app) {
    const plugin = {
        id: 'signalk-euris-resources',
        name: 'EuRIS Resources',
        description: 'Provides data from the EuRIS API as SignalK resources'
    }

    const lockDetailsCache = loadingCache.Caches.builder().expireAfterAccess(time.Time.minutes(eurisCachesDurationMinutes)).buildAsync(
        lockId => {
            app.debug(`Cache miss for lock ${lockId}`)
            return client.lockDetails(lockId)
        }
    )

    plugin.start = function (options) {
        registerAsCustomResourcesProvider()
    }

    plugin.stop = function () {
    }

    plugin.schema = {
        properties: {
            // plugin configuration goes here
        }
    }

    function registerAsCustomResourcesProvider () {
        try {
            app.registerResourceProvider({
                type: 'EuRIS',
                methods: {
                    listResources: (query) => {
                        app.debug(`Incoming request to list EuRIS resources - query: ${JSON.stringify(query)}`)

                        const locksPromise = client.listLocks(4.658717516383808, 46.96024231761558, 5.0305327978160115, 46.705876676409396).then(ids => {
                            return Promise.all(ids.map(lock => {
                                return lockDetailsCache.get(lock.id).then(details => {
                                    return lockUtils.toResourceSetFeature(lock.point, details)
                                })
                            })).then((values) => {
                                return values
                            })
                        })

                        return Promise.all([locksPromise]).then((values) => {
                            const resources = structuredClone(customResourcesTemplate)
                            values[0].forEach((lock) => resources[ids.Lock].values.features.push(lock))
                            return resources
                        })
                    },
                    getResource: (id, property) => {
                        app.debug(`Incoming request to get activecaptain resource - id: ${id}`)
                        throw (new Error('Not implemented!'))
                    },
                    setResource: (id, value) => {
                        throw (new Error('Not implemented!'))
                    },
                    deleteResource: (id) => {
                        throw (new Error('Not implemented!'))
                    }
                }
            })
        } catch (error) {
            app.debug(`Cannot register as a resource provider ${error}`)
        }
    }

    return plugin
}

const lockId = 'a562d4bd-db15-4875-a262-e0b04e484e63'

const ids = {
    Lock: lockId
}

const customResourcesTemplate = {
    [lockId]: {
        type: 'ResourceSet',
        name: 'Locks',
        description: 'European inland waterway locks',
        styles: {
            default: {
                width: 7,
                stroke: 'black',
                fill: 'yellow',
                lineDash: [1, 0]
            }
        },
        values: {
            type: 'FeatureCollection',
            features: [
            ]
        }
    }
}
