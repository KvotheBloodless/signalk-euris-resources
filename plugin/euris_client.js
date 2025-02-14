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

const axios = require('axios')
const { xml2json } = require('xml-js')

const baseUrl = 'https://www.eurisportal.eu'
const wgs84 = 4326 // WGS 84
const mercator = 102100
const userAgent = 'Signal K EuRIS Plugin'

axios.interceptors.request.use(request => {
    // console.log('Starting Request', JSON.stringify(request, null, 2))
    return request
}, error => {
    Promise.reject(error)
})
  
axios.interceptors.response.use(response => {
    // console.log('Received Response', JSON.stringify(response.data, null, 2))
    return response
}, error => {
    Promise.reject(error)
})

module.exports = {
    listBridges: function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/bridgestatus/0/query`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    f: 'json',
                    returnGeometry: true,
                    outFields: 'LOCODE,OBJECTNAME',
                    spatialRel: 'esriSpatialRelIntersects',
                    geometryType: 'esriGeometryEnvelope',
                    inSR: wgs84,
                    outSR: wgs84,
                    geometry: JSON.stringify({
                        xmin: x1,
                        ymin: y1,
                        xmax: x2,
                        ymax: y2,
                        spatialReference: {
                            wkid: wgs84
                        }
                    })
                }
            }).then(response => {
                return response.data.features.map((feature) => {
                    return {
                        id: feature.attributes.LOCODE,
                        name: feature.attributes.OBJECTNAME,
                        point: [feature.geometry.x, feature.geometry.y],
                        type: 'bridge'
                    }
                })
                
            })
        } catch (error) {
            app.debug(`ERROR fetching bridge list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
    bridgeDetails: function (app, id) {
        const url = `${baseUrl}/visuris/api/BridgeAreas/GetBridgeArea`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR fetching bridge details ${id} - ${error}`)
        }
    },
    listLocks: async function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/lockstatus/0/query`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    f: 'json',
                    returnGeometry: true,
                    outFields: 'LOCODE,OBJECTNAME',
                    spatialRel: 'esriSpatialRelIntersects',
                    geometryType: 'esriGeometryEnvelope',
                    inSR: wgs84,
                    outSR: wgs84,
                    geometry: JSON.stringify({
                        xmin: x1,
                        ymin: y1,
                        xmax: x2,
                        ymax: y2,
                        spatialReference: {
                            wkid: wgs84
                        }
                    })
                }
            }).then(response => {
                return response.data.features.map((feature) => {
                    return {
                        id: feature.attributes.LOCODE,
                        name: feature.attributes.OBJECTNAME,
                        point: [feature.geometry.x, feature.geometry.y],
                        type: 'lock'
                    }
                })
            })
        } catch (error) {
            app.debug(`ERROR fetching lock list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
    lockDetails: function (app, id) {
        const url = `${baseUrl}/visuris/api/Locks_v2/GetLock`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR: fetching lock details ${id} - ${error}`)
        }
    },
    listRadioCallPoints: function (app, x1, y1, x2, y2) {
        return listRis(app, 'RDCL1', x1, y1, x2, y2)
    },
    radioCallPointDetails: function(app, id) {
        const url = `${baseUrl}/visuris/api/Rdocal/GetRdocal`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    key: id
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR: fetching lock details ${id} - ${error}`)
        }
    },
    listPorts: function (app, x1, y1, x2, y2) {
        return listRis(app, 'PRTAR', x1, y1, x2, y2)
    }, 
    listDocks: function (app, x1, y1, x2, y2) {
        return listRis(app, 'BER01', x1, y1, x2, y2)
    }, 
    dockDetails: function (app, id) {
        const url = `${baseUrl}/visuris/api/Berths_v2/GetBerth`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR: fetching dock details ${id} - ${error}`)
        }
    },
    risDetails: function (app, id) {
        const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObject`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR: fetching RIS index details ${id} - ${error}`)
        }
    },
    operatingTimes: function (app, id, date) {
        const url = `${baseUrl}/visuris/api/OperationTimes/GetOperationEventsForDay`

        try {
            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id,
                    day: date.toISOString().split('T')[0]
                }
            }).then(response => {
                return response.data
            })
        } catch (error) {
            app.debug(`ERROR: fetching operating times for ${id} on ${date} - ${error}`)
        }
    },
    listNoticesToSkippers: function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/ntsV2/0/query`

        try {

            return axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    f: 'json',
                    where: "1=1",
                    returnGeometry: true,
                    returnIdsOnly: false,
                    outFields: 'NtSNumber,NtSHeaderID,NtSSectionID,Title',
                    spatialRel: 'esriSpatialRelIntersects',
                    geometryType: 'esriGeometryEnvelope',
                    outSR: wgs84,
                    geometry: JSON.stringify({
                        xmin: longitudeToMercator(x1),
                        ymin: latitudeToMercator(y2),
                        xmax: longitudeToMercator(x2),
                        ymax: latitudeToMercator(y1),
                        spatialReference: {
                            wkid: mercator
                        }
                    }),
                    time: `${Date.now()},${Date.now()}`
                }
            }).then(response => {

                return Promise.all(response.data.features.map((feature) => {
                    return noticeToSkippersGeometry(app, feature.attributes.NtSNumber).then(geometry => {
                        return {feature, geometry}
                    })
                }))
            }).then(featuresWithGeometry => {

                return featuresWithGeometry.map((featureWithGeometry) => {

                    return {
                        id: `${featureWithGeometry.feature.attributes.NtSHeaderID}|${featureWithGeometry.feature.attributes.NtSSectionID}`,
                        name: `${featureWithGeometry.feature.attributes.Title}`,
                        point: [featureWithGeometry.feature.geometry.x, featureWithGeometry.feature.geometry.y],
                        path: featureWithGeometry.geometry,
                        type: 'notam'
                    }
                })
            })
        } catch (error) {
            app.debug(`ERROR fetching bridge list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
// ABOVE THIS LINE, REVIEWED, GOOD
    noticeToSkippersForObject: async function (app, id, date) {
        const url = `${baseUrl}/visuris/api/NtSV2/GetNtSMessagesForObjectId`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    objectId: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching notices to skippers for ${id} - ${error}`)
        }
    },
    noticeToSkippers: async function (app, id) {
        const url = `${baseUrl}/visuris/api/NtSV2/GetNtSMessage`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    identifier: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching operating times for ${id} on ${date} - ${error}`)
        }
    },
    listJunctions: function (app, x1, y1, x2, y2) {
        return listRis(app, 'junction', x1, y1, x2, y2)
    }, 
    listTerminals: function (app, x1, y1, x2, y2) {
        return listRis(app, 'termnl', x1, y1, x2, y2)
    },  
    listBuiltUpAreas: function (app, x1, y1, x2, y2) {
        return listRis(app, 'BUAARE', x1, y1, x2, y2)
    },    
    listDistanceMarkers: function (app, x1, y1, x2, y2) {
        return listRis(app, 'dismar', x1, y1, x2, y2)
    },    
    listRadioCallingPoints: function (app, x1, y1, x2, y2) {
        return listRisapp, ('rdocal', x1, y1, x2, y2)
    },    
    listFuelpumps: function (app, x1, y1, x2, y2) {
        return listRis(app, 'bunsta', x1, y1, x2, y2)
    },
    listHarbours: function (app, x1, y1, x2, y2) {
        return listRis(app, 'hrbare', x1, y1, x2, y2)
    },
    listTranshipmentBerths: function (app, x1, y1, x2, y2) {
        return listRis(app, 'berths_1', x1, y1, x2, y2)
    },
    listPassengerBerths: function (app, x1, y1, x2, y2) {
        return listRis(app, 'berths_9', x1, y1, x2, y2)
    },
    listAnchorageBerths: function (app, x1, y1, x2, y2) {
        return listRis(app, 'achbrt', x1, y1, x2, y2)
    },
    listPontoons: function (app, x1, y1, x2, y2) {
        return listRis(app, 'ponton', x1, y1, x2, y2)
    },
    listTurningBasins: function (app, x1, y1, x2, y2) {
        return listRis(app, 'trnbsn', x1, y1, x2, y2)
    },
    listWaterwayGuages: function (app, x1, y1, x2, y2) {
        return listRis(app, 'wtwgag', x1, y1, x2, y2)
    }
}

async function listRis(app, objectCode, x1, y1, x2, y2) {
    const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObjects`

    const $filter = `objectCode eq '${objectCode}' and lat gt ${y2.toFixed(8)} and lat lt ${y1.toFixed(8)} and lon gt ${x1.toFixed(8)} and lon lt ${x2.toFixed(8)}`
    app.debug(`Fetching from RIS index with filter [${$filter}]`)

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                Accept: 'application/json'
            },
            params: {
                $filter
            }
        })
        return response.data.items.map((item) => {
            return {
                id: item.isrs,
                name: item.objectName,
                point: [item.lon, item.lat],
                type: objectCode
            }
        })
    } catch (error) {
        app.debug(`ERROR fetching ${objectCode} list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
    }
}

function noticeToSkippersGeometry(app, id) {
    const url = `${baseUrl}/api/arcgis/rest/services/ntsV2/3/query`

    try {
        return axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                Accept: 'application/json'
            },
            params: {
                f: 'json',
                where: `NtsNumber IN('${id}')`,
                returnGeometry: true,
                spatialRel: 'esriSpatialRelIntersects',
                outFields: '',
                outSR: wgs84
            }
        }).then(response => {

            return response.data.features.map((feature) => {
                return {
                    type: feature.attributes.Tooltip,
                    geometry: feature.geometry
                }
            })
        })
    } catch (error) {
        app.debug(`ERROR fetching NtS geometry ${id} - ${error}`)
    }
}

const EARTHRADIUS = 6378137; // Earth radius in meters

function longitudeToMercator(lon) {
    // Convert longitude to X coordinate (meters)
    return lon * (Math.PI / 180) * EARTHRADIUS;
}

function latitudeToMercator(lat) {
    // Convert latitude to Y coordinate (meters), with Mercator projection
    return Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI / 180) / 2)) * EARTHRADIUS;
}
