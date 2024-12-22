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
    listBridges: async function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/bridgestatus/0/query`

        try {
            const response = await axios.get(url, {
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
            })
            return response.data.features.map((feature) => {
                return {
                    id: feature.attributes.LOCODE,
                    name: feature.attributes.OBJECTNAME,
                    point: [feature.geometry.x, feature.geometry.y],
                    type: 'bridge'
                }
            })
        } catch (error) {
            app.debug(`ERROR fetching bridge list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
    bridgeDetails: async function (app, id) {
        const url = `${baseUrl}/visuris/api/BridgeAreas/GetBridgeArea`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR fetching bridge details ${id} - ${error}`)
        }
    },
    listLocks: async function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/lockstatus/0/query`

        try {
            const response = await axios.get(url, {
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
            })
            return response.data.features.map((feature) => {
                return {
                    id: feature.attributes.LOCODE,
                    name: feature.attributes.OBJECTNAME,
                    point: [feature.geometry.x, feature.geometry.y],
                    type: 'lock'
                }
            })
        } catch (error) {
            app.debug(`ERROR fetching lock list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
    lockDetails: async function (app, id) {
        const url = `${baseUrl}/visuris/api/Locks_v2/GetLock`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching lock details ${id} - ${error}`)
        }
    },
    listBerthsWithoutTranshipment: function (app, x1, y1, x2, y2) {
        return listRis(app, 'berths_3', x1, y1, x2, y2)
    },
    listBerthsWithTranshipment: function (app, x1, y1, x2, y2) {
        return listRis(app, 'berths_1', x1, y1, x2, y2)
    },
    listFerryBerths: function (app, x1, y1, x2, y2) {
        return listRis(app, 'berths_9', x1, y1, x2, y2)
    },
    berthDetails: async function (app, id) {
        const url = `${baseUrl}/visuris/api/Berths_v2/GetBerth`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching berth details ${id} - ${error}`)
        }
    },
    risDetails: async function (app, id) {
        const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObject`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching RIS index details ${id} - ${error}`)
        }
    },
// ABOVE THIS LINE, REVIEWED, GOOD
    operatingTimes: async function (app, id, date) {
        const url = `${baseUrl}/visuris/api/OperationTimes/GetOperationEventsForDay`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    isrs: id,
                    day: date.toISOString().split('T')[0]
                }
            })
            return response.data
        } catch (error) {
            app.debug(`ERROR: fetching operating times for ${id} on ${date} - ${error}`)
        }
    },
    listNoticesToSkippers: async function (app, x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/ntsV2/0/query`

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    Accept: 'application/json'
                },
                params: {
                    f: 'json',
                    where: "1=1",
                    returnGeometry: true,
                    returnIdsOnly: false,
                    outFields: 'NtSHeaderID,NtSSectionID,Title',
                    spatialRel: 'esriSpatialRelIntersects',
                    geometryType: 'esriGeometryEnvelope',
                    outSR: wgs84,
                    geometry: JSON.stringify({
                        xmin: longitudeToMercator(x1),
                        ymin: latitudeToMercator(y1),
                        xmax: longitudeToMercator(x2),
                        ymax: latitudeToMercator(y2),
                        spatialReference: {
                            wkid: mercator
                        }
                    }),
                    time: `${Date.now()},${Date.now()}`
                }
            })
            return response.data.features.map((feature) => {
                return {
                    id: `${feature.attributes.NtSHeaderID}|${feature.attributes.NtSSectionID}`,
                    name: `${feature.attributes.Title}`,
                    point: [feature.geometry.x, feature.geometry.y],
                    type: 'notam'
                }
            })
        } catch (error) {
            app.debug(`ERROR fetching bridge list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
        }
    },
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

async function listRis(app, functionCode, x1, y1, x2, y2) {
    const url = `${baseUrl}/api/arcgis/rest/services/risindex/0/query`

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                Accept: 'application/json'
            },
            params: {
                f: 'json',
                returnGeometry: true,
                outFields: 'ISRS,OBJECTNAME,FNCTION',
                spatialRel: 'esriSpatialRelIntersects',
                geometryType: 'esriGeometryEnvelope',
                inSR: wgs84,
                outSR: wgs84,
                geometry: JSON.stringify({
                    xmin: longitudeToMercator(x1),
                    ymin: latitudeToMercator(y1),
                    xmax: longitudeToMercator(x2),
                    ymax: latitudeToMercator(y2),
                    spatialReference: {
                        wkid: mercator
                    }
                }),
                time: `${Date.now()},${Date.now()}`,
                where: `FNCTION = '${functionCode}'`
            }
        })
        return response.data.features.map((feature) => {
            return {
                id: feature.attributes.ISRS,
                name: feature.attributes.OBJECTNAME,
                point: [feature.geometry.x, feature.geometry.y],
                type: feature.attributes.FNCTION
            }
        })
    } catch (error) {
        app.debug(`ERROR fetching RIS index (${functionCode}) list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
    }
}

function degreeToRadians(ang) {

    return ang * (Math.PI/180.0)
}

function longitudeToMercator(lon) {
    var r_major = 6378137.000;
    return r_major * degreeToRadians(lon);
}

function latitudeToMercator(lat) {
    if (lat > 89.5)
        lat = 89.5;
    if (lat < -89.5)
        lat = -89.5;
    var r_major = 6378137.000;
    var r_minor = 6356752.3142;
    var temp = r_minor / r_major;
    var es = 1.0 - (temp * temp);
    var eccent = Math.sqrt(es);
    var phi = degreeToRadians(lat);
    var sinphi = Math.sin(phi);
    var con = eccent * sinphi;
    var com = .5 * eccent;
    con = Math.pow((1.0-con)/(1.0+con), com);
    var ts = Math.tan(.5 * (Math.PI*0.5 - phi))/con;
    var y = 0 - r_major * Math.log(ts);
    return y;
}
