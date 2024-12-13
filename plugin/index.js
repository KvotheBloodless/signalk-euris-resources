/**
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
const bridgeUtils = require('./bridge_utilities')
const positionUtils = require('./position_utilities')
const loadingCache = require('@inventivetalent/loading-cache')
const time = require('@inventivetalent/time')
const schedule = require('node-schedule')

module.exports = function (app) {
    const plugin = {
        id: 'signalk-euris-resources',
        name: 'EuRIS Resources',
        description: 'This plugin creates a bridge between SignalK and EuRIS (European River Information Services). It gathers information from EuRIS and makes it available through the SignalK resources API for consumption.'
    }

    const sourceConfig = new Map()

    plugin.start = function (options) {
        if (options.includeLocks) {
            setupForLocks(options.cachingDurationMinutes)
        }
        if (options.includeBridges) {
            setupForBridges(options.cachingDurationMinutes)
        }

        setupOperatingTimesCache(options.cachingDurationMinutes)

        registerAsEurisResourcesProvider()
        registerAsNoteResourcesProvider()
    }

    plugin.stop = function () {
        for (const struct of sourceConfig.values()) {
            struct.detailsCache.end()
        }
        if (operatingTimesCache) {
            operatingTimesCacheDailyClearingJob.cancel()
            operatingTimesCache.end()
        }
    }

    plugin.schema = {
        title: 'EuRIS Resources',
        description: 'This plugin creates a bridge between SignalK and EuRIS (European River Information Services). It gathers information from EuRIS and makes it available through the SignalK resources API for consumption.',
        type: 'object',
        required: ['cachingDurationMinutes'],
        properties: {
            includeLocks: {
                type: 'boolean',
                title: 'Include locks',
                default: true
            },
            includeBridges: {
                type: 'boolean',
                title: 'Include bridges',
                default: true
            },
            cachingDurationMinutes: {
                type: 'number',
                title: 'How long to cache data from EuRIS in minutes (longer = less data trafic; shorter = more up to date data)',
                default: 60
            }
        }
    }

    function registerAsEurisResourcesProvider () {
        try {
            app.registerResourceProvider({
                type: 'EuRIS',
                methods: {
                    listResources: (query) => {
                        app.debug(`Incoming request to list EuRIS resources - query: ${JSON.stringify(query)}`)

                        const promises = []

                        for (const struct of sourceConfig.values()) {
                            // TODO: Position needs to be based on boat location or query (when available)
                            const promise = struct.listMethod(4.738073872791906, 46.73320999145508, 4.938073872791906, 46.93320999145508)
                                .then(entities => {
                                    return Promise.all(
                                        entities.map(entity => {
                                            return struct.detailsCache.get(entity.id)
                                                .then(details => {
                                                    return struct.resourceSetFormatter(entity.point, details)
                                                }, error => {
                                                    app.debug(`ERROR: ${error}`)
                                                    throw error
                                                })
                                        })
                                    )
                                }, error => {
                                    app.debug(`ERROR: ${error}`)
                                    throw error
                                })

                            promises.push(promise)
                        }

                        return Promise.all(promises)
                            .then((values) => {
                                const resources = {}
                                for (const struct of sourceConfig.values()) {
                                    resources[struct.id] = structuredClone(struct.resourceSetTemplate)
                                }

                                let index = 0
                                for (const struct of sourceConfig.values()) {
                                    values[index++].forEach((entity) => resources[struct.id].values.features.push(entity))
                                }

                                return resources
                            }, error => {
                                app.debug(`ERROR: ${error}`)
                                throw error
                            })
                    },
                    getResource: (id, property) => {
                        app.debug(`Incoming request to get EuRIS resource - ID: ${id}`)

                        for (const struct of sourceConfig.values()) {
                            if (struct.id === id) {
                                // TODO: Position needs to be based on boat location or query (when available)
                                return struct.listMethod(4.738073872791906, 46.73320999145508, 4.938073872791906, 46.93320999145508)
                                    .then(entities => {
                                        return Promise.all(
                                            entities.map(entity => {
                                                return struct.detailsCache.get(entity.id)
                                                    .then(details => {
                                                        return struct.resourceSetFormatter(entity.point, details)
                                                    }, error => {
                                                        app.debug(`ERROR: ${error}`)
                                                        throw error
                                                    })
                                            })
                                        )
                                    }, error => {
                                        app.debug(`ERROR: ${error}`)
                                        throw error
                                    }).then((entities) => {
                                        const resources = structuredClone(struct.resourceSetTemplate)
                                        entities.forEach((entity) => resources.values.features.push(entity))
                                        return resources
                                    }, error => {
                                        app.debug(`ERROR: ${error}`)
                                        throw error
                                    })
                            }
                        }

                        return Promise.reject(new Error(`No resource found using ID ${id}`))
                    },
                    setResource: (id, value) => {
                        throw (new Error('Not supported!'))
                    },
                    deleteResource: (id) => {
                        throw (new Error('Not supported!'))
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

                        if (query.position != null && query.distance != null) {
                            const bbox = positionUtils.positionToBbox(query.position, query.distance)

                            const promises = []

                            for (const struct of sourceConfig.values()) {
                                const promise = struct.listMethod(bbox[0], bbox[1], bbox[2], bbox[3])
                                    .then(entities => {
                                        return Promise.all(
                                            entities.map(entity => {
                                                return struct.detailsCache.get(entity.id)
                                                    .then(details => {
                                                        return struct.noteFormatter(entity.point, details, null)
                                                    }, error => {
                                                        app.debug(`ERROR: ${error}`)
                                                        throw error
                                                    })
                                                    .then(note => {
                                                        note.id = entity.id
                                                        note.$source = plugin.id
                                                        return note
                                                    }, error => {
                                                        app.debug(`ERROR: ${error}`)
                                                        throw error
                                                    })
                                            })
                                        )
                                    }, error => {
                                        app.debug(`ERROR: ${error}`)
                                        throw error
                                    })

                                promises.push(promise)
                            }

                            return Promise.all(promises)
                                .then(promises => {
                                    return promises.flat().reduce((map, obj) => {
                                        map[obj.id] = obj
                                        delete obj.id
                                        return map
                                    }, {})
                                }, error => {
                                    app.debug(`ERROR: ${error}`)
                                    throw error
                                })
                        } else {
                            app.debug(`WARN: Could not use provided query parameters - ${query}`)
                            throw (new Error('Not supported!'))
                        }
                    },
                    getResource: (id, property) => {
                        app.debug(`Incoming request to get note ${id}`)

                        for (const struct of sourceConfig.values()) {
                            if (struct.detailsCache.has(id)) {
                                return Promise.all([struct.detailsCache.get(id), operatingTimesCache.get(id)])
                                    .then((values) => {
                                        app.debug(`${JSON.stringify(values[1])}`)
                                        return struct.noteFormatter([0, 0], values[0], values[1])
                                    }, error => {
                                        app.debug(`ERROR: ${error}`)
                                        throw error
                                    })
                                    .then(resourceSet => {
                                        resourceSet.$source = plugin.id
                                        return resourceSet
                                    })
                            }
                        }
                    },
                    setResource: (id, value) => {
                        throw (new Error('Not supported!'))
                    },
                    deleteResource: (id) => {
                        throw (new Error('Not supported!'))
                    }
                }
            })
        } catch (error) {
            app.debug(`Cannot register as a resource provider ${error}`)
        }
    }

    function setupForLocks (cachingDurationMinutes) {
        sourceConfig.set('Locks', {
            id: 'a562d4bd-db15-4875-a262-e0b04e484e63',
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                lockId => {
                    app.debug(`Cache miss for lock ${lockId}`)
                    return client.lockDetails(app, lockId)
                        .then(details => {
                            return details
                        }, error => {
                            app.debug(`ERROR: ${error}`)
                            throw error
                        })
                }
            ),
            listMethod: client.listLocks,
            noteFormatter: lockUtils.toNoteFeature,
            resourceSetFormatter: lockUtils.toResourceSetFeature,
            resourceSetTemplate: {
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
        })
    }

    function setupForBridges (cachingDurationMinutes) {
        sourceConfig.set('Bridges', {
            id: 'bdfa494d-c947-438b-8f56-196e87216029',
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                bridgeId => {
                    app.debug(`Cache miss for bridge ${bridgeId}`)
                    return client.bridgeDetails(app, bridgeId)
                        .then(details => {
                            return details
                        }, error => {
                            app.debug(`ERROR: ${error}`)
                            throw error
                        })
                }
            ),
            listMethod: client.listBridges,
            noteFormatter: bridgeUtils.toNoteFeature,
            resourceSetFormatter: bridgeUtils.toResourceSetFeature,
            resourceSetTemplate: {
                type: 'ResourceSet',
                name: 'Bridges',
                description: 'European inland waterway bridges',
                styles: {
                    default: {
                        width: 7,
                        stroke: 'black',
                        fill: 'blue',
                        lineDash: [1, 0]
                    }
                },
                values: {
                    type: 'FeatureCollection',
                    features: [
                    ]
                }
            }
        })
    }

    let operatingTimesCache
    let operatingTimesCacheDailyClearingJob

    function setupOperatingTimesCache (cachingDurationMinutes) {
        operatingTimesCache = loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
            id => {
                app.debug(`Cache miss for operating times of ${id}`)
                return client.operatingTimes(app, id, new Date())
                    .then(details => {
                        return details
                    }, error => {
                        app.debug(`ERROR: ${error}`)
                        throw error
                    })
            }
        )
        operatingTimesCacheDailyClearingJob = schedule.scheduleJob({ hour: 0, minute: 0 }, () => {
            if (operatingTimesCache) {
                operatingTimesCache.invalidateAll()
            }
        })
    }

    return plugin
}
