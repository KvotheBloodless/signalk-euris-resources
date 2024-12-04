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
const positionUtils = require('./position_utilities')
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
        registerAsEurisResourcesProvider()
        registerAsNoteResourcesProvider()
    }

    plugin.stop = function () {
    }

    plugin.schema = {
        properties: {
            // plugin configuration goes here
        }
    }

    function registerAsEurisResourcesProvider () {
        try {
            app.registerResourceProvider({
                type: 'EuRIS',
                methods: {
                    listResources: (query) => {
                        app.debug(`Incoming request to list EuRIS resources - query: ${JSON.stringify(query)}`)

                        const locksPromise = client.listLocks(3.193813633335093, 43.33401037471581, 3.206870686219679, 43.32802576946635).then(ids => {
                            return Promise.all(
                                ids.map(lock => {
                                    return lockDetailsCache.get(lock.id).then(details => {
                                        return lockUtils.toResourceSetFeature(lock.point, details)
                                    })
                                })
                            )
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

    function registerAsNoteResourcesProvider () {
        try {
            app.registerResourceProvider({
                type: 'notes',
                methods: {
                    listResources: (query) => {
                        app.debug(`Incoming request to list note resources - query: ${JSON.stringify(query)}`)

                        const bbox = positionUtils.positionToBbox(query.position, query.distance)

                        const locksPromise = client.listLocks(bbox[0], bbox[1], bbox[2], bbox[3]).then(ids => {
                            return Promise.all(
                                ids.map(lock => {
                                    return lockDetailsCache.get(lock.id).then(details => {
                                        return lockUtils.toNoteFeature(lock.point, details)
                                    }).then(resourceSet => {
                                        resourceSet.id = lock.id
                                        resourceSet.$source = plugin.id
                                        return resourceSet
                                    })
                                })
                            )
                        })

                        return Promise.all([locksPromise]).then(promises => {
                            return promises.flat().reduce((map, obj) => {
                                map[obj.id] = obj
                                delete obj.id
                                return map
                            }, {})
                        })
                    },
                    getResource: (id, property) => {
                        app.debug(`Incoming request to get note ${id}`)
                        return lockDetailsCache.get(id).then(details => {
                            return lockUtils.toNoteFeature([0, 0], details)
                        }).then(resourceSet => {
                            resourceSet.$source = plugin.id
                            return resourceSet
                        })
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
