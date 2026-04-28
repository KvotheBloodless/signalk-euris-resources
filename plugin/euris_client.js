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

const REQUEST_TIMEOUT = 5000 // ms
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000
let eurisDownUntil = 0; // Timestamp until which EuRIS requests are skipped

axios.interceptors.request.use(request => {
  // console.log('Starting Request', JSON.stringify(request, null, 2))
  return request
}, error => {
  return Promise.reject(error)
})

axios.interceptors.response.use(response => {
  // console.log('Received Response', JSON.stringify(response.data, null, 2))
  return response
}, error => {
  return Promise.reject(error)
})

async function httpGetWithRetry (app, url, config, context) {
  // CIRCUIT BREAKER: skip requests while EuRIS is marked as down
  if (Date.now() < eurisDownUntil) {
    const untilLocal = new Date(eurisDownUntil).toLocaleString();
    app.debug(`EURIS skipped (circuit breaker active until ${untilLocal})`);
    return null;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        ...config
      });
      return response;
    } catch (error) {
      const msg = error && error.message ? error.message : error;

      if (attempt === MAX_RETRIES) {
        app.debug(`ERROR ${context} (giving up after ${attempt + 1} attempts): ${msg}`);

        // CIRCUIT BREAKER: mark EuRIS as down for 60 seconds
        eurisDownUntil = Date.now() + 60000;
        app.debug(`EURIS marked as DOWN for 60 seconds`);

        return null;
      } else {
        app.debug(`WARN ${context} attempt ${attempt + 1} failed: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  return null;
}

module.exports = {
  listBridges: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/api/arcgis/rest/services/bridgestatus/0/query`

    const response = await httpGetWithRetry(app, url, {
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
    }, `fetching bridge list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.features) return []
    return response.data.features.map((feature) => {
      return {
        id: feature.attributes.LOCODE,
        name: feature.attributes.OBJECTNAME,
        point: [feature.geometry.x, feature.geometry.y]
      }
    })
  },

  bridgeDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/BridgeAreas/GetBridgeArea`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        isrs: id
      }
    }, `fetching bridge details ${id}`)

    if (!response) return null
    return response.data
  },

  listLocks: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/api/arcgis/rest/services/lockstatus/0/query`

    const response = await httpGetWithRetry(app, url, {
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
    }, `fetching lock list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.features) return []
    return response.data.features.map((feature) => {
      return {
        id: feature.attributes.LOCODE,
        name: feature.attributes.OBJECTNAME,
        point: [feature.geometry.x, feature.geometry.y]
      }
    })
  },

  lockDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/Locks_v2/GetLock`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        isrs: id
      }
    }, `fetching lock details ${id}`)

    if (!response) return null
    return response.data
  },

  listBarrages: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObjects`

    const $filter = `function eq 'gatare' and lat gt ${y2.toFixed(8)} and lat lt ${y1.toFixed(8)} and lon gt ${x1.toFixed(8)} and lon lt ${x2.toFixed(8)}`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        $filter
      }
    }, `fetching barrage list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.items) return []
    return response.data.items.map((item) => {
      return {
        id: item.isrs,
        name: item.objectName,
        point: [item.lon, item.lat]
      }
    })
  },

  listRadioCallPoints: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObjects`

    const $filter = `function eq 'RDOCAL' and lat gt ${y2.toFixed(8)} and lat lt ${y1.toFixed(8)} and lon gt ${x1.toFixed(8)} and lon lt ${x2.toFixed(8)}`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        $filter
      }
    }, `fetching radio call point list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.items) return []
    return response.data.items.map((item) => {
      return {
        id: item.isrs,
        name: item.objectName,
        point: [item.lon, item.lat]
      }
    })
  },

  radioCallPointDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/Rdocal/GetRdocal`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        key: id
      }
    }, `fetching radio call point details ${id}`)

    if (!response) return null
    return response.data
  },

  listPorts: function (app, x1, y1, x2, y2) {
    return listRis(app, 'PRTAR', x1, y1, x2, y2)
  },

  listDocks: function (app, x1, y1, x2, y2) {
    return listRis(app, 'BER01', x1, y1, x2, y2)
  },

  listStructures: function (app, x1, y1, x2, y2) {
    return listRis(app, 'EXCNS', x1, y1, x2, y2)
  },

  listFuel: function (app, x1, y1, x2, y2) {
    return listRis(app, 'BU001', x1, y1, x2, y2)
  },

  listTurningBasins: function (app, x1, y1, x2, y2) {
    return listRis(app, 'TRNBS', x1, y1, x2, y2)
  },

  listTunnels: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObjects`

    const $filter = `function eq 'TUNNEL' and lat gt ${y2.toFixed(8)} and lat lt ${y1.toFixed(8)} and lon gt ${x1.toFixed(8)} and lon lt ${x2.toFixed(8)}`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        $filter
      }
    }, `fetching tunnel list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.items) return []
    return response.data.items.map((item) => {
      return {
        id: item.isrs,
        name: item.objectName,
        point: [item.lon, item.lat]
      }
    })
  },

  listGuages: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/api/arcgis/rest/services/hydrometeo/VER/0/query`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        f: 'json',
        returnGeometry: true,
        spatialRel: 'esriSpatialRelIntersects',
        geometry: JSON.stringify({
          xmin: longitudeToMercator(x1),
          ymin: latitudeToMercator(y2),
          xmax: longitudeToMercator(x2),
          ymax: latitudeToMercator(y1),
          spatialReference: {
            wkid: mercator
          }
        }),
        geometryType: 'esriGeometryEnvelope',
        inSR: wgs84,
        outSR: wgs84
      }
    }, `fetching gauge list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.features) return []
    return response.data.features.map((feature) => {
      return {
        id: feature.attributes.LocationParameterID,
        name: feature.attributes.Location,
        point: [feature.geometry.x, feature.geometry.y]
      }
    })
  },

  guageDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/Hydrometeo/GetHydrometeoItem`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        linkID: id
      }
    }, `fetching gauge details ${id}`)

    if (!response) return null
    return response.data
  },

  guageHistory: async function (app, id, days) {
    const url = `${baseUrl}/visuris/api/Hydrometeo/GetHydrometeoItemHistory`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        linkID: id,
        historicalDays: days
      }
    }, `fetching gauge history ${id} (${days} days)`)

    if (!response) return null
    return response.data
  },

  dockDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/Berths_v2/GetBerth`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        isrs: id
      }
    }, `fetching dock details ${id}`)

    if (!response) return null
    return response.data
  },

  risDetails: async function (app, id) {
    const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObject`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        isrs: id
      }
    }, `fetching RIS index details ${id}`)

    if (!response) return null
    return response.data
  },

  operatingTimes: async function (app, id, date) {
    const url = `${baseUrl}/visuris/api/OperationTimes/GetOperationEventsForDay`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        isrs: id,
        day: date.toISOString().split('T')[0]
      }
    }, `fetching operating times for ${id} on ${date.toISOString().split('T')[0]}`)

    if (!response) return null
    return response.data
  },

  listNoticesToSkippers: async function (app, x1, y1, x2, y2) {
    const url = `${baseUrl}/api/arcgis/rest/services/ntsV2/0/query`

    const now = Date.now()

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        f: 'json',
        where: '1=1',
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
        time: `${now},${now}`
      }
    }, `fetching notices to skippers list ${x1}, ${y1}, ${x2}, ${y2}`)

    if (!response || !response.data || !response.data.features) return []
    return response.data.features.map((feature) => {
      return {
        id: `${feature.attributes.NtSHeaderID}|${feature.attributes.NtSSectionID}`,
        name: `${feature.attributes.Title}`,
        point: [feature.geometry.x, feature.geometry.y],
        extra: {
          ntsNumber: feature.attributes.NtSNumber
        }
      }
    })
  },

  noticeToSkippersGeometry: async function (app, id) {
    const url = `${baseUrl}/api/arcgis/rest/services/ntsV2/3/query`

    const response = await httpGetWithRetry(app, url, {
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
    }, `fetching notices to skippers geometry ${id}`)

    if (!response || !response.data || !response.data.features) return []
    return response.data.features.map((feature) => {
      return {
        type: feature.attributes.Tooltip,
        geometry: feature.geometry
      }
    })
  },

  noticeToSkippersForObject: async function (app, id) {
    const url = `${baseUrl}/visuris/api/NtSV2/GetNtSMessagesForObjectId`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        objectId: id
      }
    }, `fetching notices to skippers for object ${id}`)

    if (!response) return null
    return response.data
  },

  noticeToSkippers: async function (app, id) {
    const url = `${baseUrl}/visuris/api/NtSV2/GetNtSMessage`

    const response = await httpGetWithRetry(app, url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      params: {
        identifier: id
      }
    }, `fetching notice to skippers ${id}`)

    if (!response) return null
    return response.data
  }
}

async function listRis (app, objectCode, x1, y1, x2, y2) {
  const url = `${baseUrl}/visuris/api/RisIndices_v2/GetRISIndexObjects`

  const $filter = `objectCode eq '${objectCode}' and lat gt ${y2.toFixed(8)} and lat lt ${y1.toFixed(8)} and lon gt ${x1.toFixed(8)} and lon lt ${x2.toFixed(8)}`

  const response = await httpGetWithRetry(app, url, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json'
    },
    params: {
      $filter
    }
  }, `fetching ${objectCode} list ${x1}, ${y1}, ${x2}, ${y2}`)

  if (!response || !response.data || !response.data.items) return []
  return response.data.items.map((item) => {
    return {
      id: item.isrs,
      name: item.objectName,
      point: [item.lon, item.lat]
    }
  })
}

const EARTHRADIUS = 6378137 // Earth radius in meters

function longitudeToMercator (lon) {
  // Convert longitude to X coordinate (meters)
  return lon * (Math.PI / 180) * EARTHRADIUS
}

function latitudeToMercator (lat) {
  // Convert latitude to Y coordinate (meters), with Mercator projection
  return Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI / 180) / 2)) * EARTHRADIUS
}
