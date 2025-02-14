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
const handlebarUtilities = require('./handlebar_utilities')
const positionUtils = require('./position_utilities')
const loadingCache = require('@inventivetalent/loading-cache')
const time = require('@inventivetalent/time')
const schedule = require('node-schedule')
const xml2js =  require("xml-js")

module.exports = function (app) {
    const ID_SEPARATOR = '@'

    const plugin = {
        id: 'signalk-euris-resources',
        name: 'European Inland Waterways Resources',
        description: 'This plugin creates a bridge between SignalK and EuRIS (European River Information Services). It gathers information from EuRIS and makes it available through the SignalK resources API for consumption.'
    }

    const sourceConfig = new Map()

    plugin.start = function (options) {

        handlebarUtilities.helpers()

        setupObjectOperatingTimesCache(options.cachingDurationMinutes)
        setupObjectNoticesToSkippersCache(options.cachingDurationMinutes)

        if (options.includeBridges) {
            setupForBridges(options.cachingDurationMinutes)
        }
        if (options.includeLocks) {
            setupForLocks(options.cachingDurationMinutes)
        }
        if (options.includePorts) {
            setupForPorts(options.cachingDurationMinutes)
        }
        if (options.includeDocks) {
            setupForDocks(options.cachingDurationMinutes)
        }
        if (options.includeNoticesToSkippers) {
            setupForNoticesToSkippers(options.cachingDurationMinutes)
        }
        if (options.includeRadioCalls) {
            setupForRadioCallPoints(options.cachingDurationMinutes)
        }

        registerAsNoteResourcesProvider()
    }

    plugin.stop = function () {
        for (const struct of sourceConfig.values()) {
            struct.detailsCache.end()
        }
        if (objectOperatingTimesCache) {
            objectOperatingTimesCacheDailyClearingJob.cancel()
            objectOperatingTimesCache.end()
        }
        if (objectNoticesToSkippersCache) {
            objectNoticesToSkippersCache.end()
        }
    }

    plugin.schema = {
        title: plugin.name,
        description: plugin.description,
        type: 'object',
        required: ['cachingDurationMinutes'],
        properties: {
            includeBridges: {
                type: 'boolean',
                title: 'Include bridges',
                default: true
            },
            includeLocks: {
                type: 'boolean',
                title: 'Include locks',
                default: true
            },
            includePorts: {
                type: 'boolean',
                title: 'Include ports',
                default: true
            },
            includeDocks: {
                type: 'boolean',
                title: 'Include docks',
                default: true
            },
            includeNoticesToSkippers: {
                type: 'boolean',
                title: 'Include notices to skippers',
                default: true
            },
            includeRadioCalls: {
                type: 'boolean',
                title: 'Include radio call points',
                default: true
            },
            cachingDurationMinutes: {
                type: 'number',
                title: 'How long to cache data from EuRIS in minutes (longer = less data trafic; shorter = more up to date data)',
                default: 60
            }
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
                                const promise = struct.listMethod(app, bbox[0], bbox[1], bbox[2], bbox[3]).then(entities => {
                                    return entities
                                }).then(entities => {
                                    return entities.map(entity => {

                                        app.debug(`ENTITY: ${JSON.stringify(entity)}`)

                                        return {
                                            id: `${entity.type}${ID_SEPARATOR}${entity.id}`,
                                            name: entity.name,
                                            position: {
                                                longitude: entity.point[0], 
                                                latitude: entity.point[1]
                                            },
                                            geometry :{
                                                type: 'LineString',
                                                coordinates: [[entity.point[0],entity.point[1]],[entity.point[0] + 0.2,entity.point[1] + 0.2]]  
                                            },
                                            mimeType: 'text/plain',
                                            properties: {
                                                readOnly: true,
                                                skIcon: struct.icon
                                            },
                                            timestamp: new Date().toISOString(),
                                            $source: plugin.id
                                        }
                                    })
                                })

                                promises.push(promise)
                            }

                            return Promise.all(promises).then(promises => {
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
                            app.debug(`WARN: Could not use provided query parameters - ${JSON.stringify(query)}`)
                            throw (new Error('Not supported!'))
                        }
                    },
                    getResource: (id, property) => {
                        app.debug(`Incoming request to get note ${id}`)

                        const parts = id.split(ID_SEPARATOR)
                        if(parts.length = 2) {
                            const config = sourceConfig.get(parts[0])
                            if(config !== undefined) {
                                return Promise.all([config.detailsCache.get(parts[1]), objectOperatingTimesCache.get(parts[1]), objectNoticesToSkippersCache.get(parts[1])]).then(values => {
                                    if(values[0] === null) {
                                        throw new Error(`Could not retrieve entity ${parts[1]}`)
                                    }

                                    // app.debug(`ENTITY ==> ${JSON.stringify(values[0])}`)

                                    if (Object.hasOwn(values[0], 'unLocode')) {
                                        // This is a fallback RIS object
                                        return handlebarUtilities.ris(config.icon, values[0], values[1], values[2])
                                    }

                                    app.debug(`ENTITY ==> ${JSON.stringify(values[0])}`)

                                    return config.formatter(config.icon, values[0], values[1], values[2])
                                }).then(note => {
                                    note.mimeType = 'text/plain',
                                    note.$source = plugin.id
                                    
                                    return note
                                }).catch((error) => {
                                    app.debug(`ERRORAA: ${error}`)
                                    throw error
                                })
                            }
                            else {
                                app.debug(`WARN: Could not find source config for ${parts[0]}`)
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
            app.debug(`Cannot register as a note resource provider ${error}`)
        }
    }

    function setupForBridges (cachingDurationMinutes) {
        sourceConfig.set('bridge', {
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                id => {
                    app.debug(`Cache miss for bridge ${id}`)
                    return client.bridgeDetails(app, id).then(details => {
                        if (details === null) {
                            // Generic fallback
                            return client.risDetails(app, id).then(details => {
                                return details
                            })
                        }

                        return details
                    }, error => {
                        app.debug(`ERROR: ${error}`)
                        throw error
                    })
                }
            ),
            listMethod: client.listBridges,
            formatter: handlebarUtilities.bridge,
            icon: 'bridge'
        })
    }

    function setupForLocks (cachingDurationMinutes) {
        sourceConfig.set('lock', {
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                id => {
                    app.debug(`Cache miss for lock ${id}`)
                    return client.lockDetails(app, id).then(details => {
                        if (details === null) {
                            // Generic fallback
                            return client.risDetails(app, id).then(details => {
                                return details
                            })
                        }

                        return details
                    }, error => {
                        app.debug(`ERROR: ${error}`)
                        throw error
                    })
                }
            ),
            listMethod: client.listLocks,
            formatter: handlebarUtilities.lock,
            icon: 'lock'
        })
    }

    function setupForPorts (cachingDurationMinutes) {
        sourceConfig.set('PRTAR', {
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                id => {
                    app.debug(`Cache miss for port ${id}`)
                    return client.risDetails(app, id)
                }
            ),
            listMethod: client.listPorts,
            formatter: handlebarUtilities.ris,
            icon: 'marina'
        })
    }

    function setupForDocks (cachingDurationMinutes) {
        sourceConfig.set('BER01', {
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                id => {
                    app.debug(`Cache miss for dock ${id}`)
                    return client.dockDetails(app, id).then(details => {
                        if (details === null) {
                            // Generic fallback
                            return client.risDetails(app, id).then(details => {
                                return details
                            })
                        }

                        return details
                    }, error => {
                        app.debug(`ERROR: ${error}`)
                        throw error
                    })                }
            ),
            listMethod: client.listDocks,
            formatter: handlebarUtilities.berthWithoutTranshipment,
            icon: 'dock'
        })
    }

    function setupForRadioCallPoints (cachingDurationMinutes) {
        sourceConfig.set('rdocal', {
            detailsCache: loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
                id => {
                    app.debug(`Cache miss for radio call point ${id}`)
                    return client.radioCallPointDetails(app, id)
                        .then(details => {
                            if (details === null) {
                                // Generic fallback
                                return client.risDetails(app, id).then(details => {
                                    return details
                                })
                            }

                            return details
                        }, error => {
                            app.debug(`ERROR: ${error}`)
                            throw error
                        })
                }
            ),
            listMethod: client.listRadioCallPoints,
            formatter: handlebarUtilities.radioCallPoint,
            icon: 'radio-call-point'
        })
    }

    function setupForNoticesToSkippers (cachingDurationMinutes) {
        sourceConfig.set('notam', {
            detailsCache: noticesToSkippersCache,
            listMethod: client.listNoticesToSkippers,
            formatter: handlebarUtilities.noticeToSkippers,
            icon: 'notice-to-mariners'
        })
    }

    let objectOperatingTimesCache
    let objectOperatingTimesCacheDailyClearingJob

    function setupObjectOperatingTimesCache (cachingDurationMinutes) {
        objectOperatingTimesCache = loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
            id => {
                app.debug(`Cache miss for operating times of ${id}`)
                return client.operatingTimes(app, id, new Date()).then(details => {
                    return details
                }, error => {
                    app.debug(`ERROR: ${error}`)
                    throw error
                })
            }
        )
        objectOperatingTimesCacheDailyClearingJob = schedule.scheduleJob({ hour: 0, minute: 0 }, () => {
            if (objectOperatingTimesCache) {
                objectOperatingTimesCache.invalidateAll()
            }
        })
    }

    let noticesToSkippersCache
    let objectNoticesToSkippersCache

    function setupObjectNoticesToSkippersCache (cachingDurationMinutes) {

        noticesToSkippersCache = loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
            id => {
                app.debug(`Cache miss for notice to skippers ${id}`)
                return client.noticeToSkippers(app, id).then(details => {
                    // The JSON contains a strange XMl string which we need to decode.
                    // Easiest way is to convert it to XML so that we can explore it as needed.
                    details.xml = xml2js.xml2js(details.xml.replaceAll('\"', '"'), {
                        compact: true,
                        spaces: 0
                    })
                    return details
                }, error => {
                    app.debug(`ERROR: ${error}`)
                    throw error
                })
            }
        )

        objectNoticesToSkippersCache = loadingCache.Caches.builder().expireAfterWrite(time.Time.minutes(cachingDurationMinutes)).buildAsync(
            id => {
                app.debug(`Cache miss for notice to skippers for object ${id}`)
                return client.noticeToSkippersForObject(app, id, new Date()).then(details => {
                    return Promise.all(
                        details.map(detail => {
                            return `${detail.headerID}|${detail.sectionId}`
                        }).map(ntsId => {
                            // We now go to our usual cache and grab the actual NtS
                            return noticesToSkippersCache.get(ntsId)
                        })
                    ).then((values) => {
                        return values
                    }).then((obj) => {
                        return obj
                    })
                }, error => {
                    app.debug(`ERROR: ${error}`)
                    throw error
                })
            }
        )
    }

    return plugin
}
