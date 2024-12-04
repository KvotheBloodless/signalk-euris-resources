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
const spatialRef = 4326 // WGS 84
const userAgent = 'Signal K EuRIS Plugin'

axios.interceptors.request.use(request => {
    // console.log('Starting Request', JSON.stringify(request, null, 2))
    return request
})

module.exports = {
    listLocks: function (x1, y1, x2, y2) {
        const url = `${baseUrl}/api/arcgis/rest/services/locks/0/query`

        return axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                Accept: 'application/json'
            },
            params: {
                f: 'json',
                returnGeometry: true,
                outFields: '*',
                spatialRel: 'esriSpatialRelIntersects',
                geometryType: 'esriGeometryEnvelope',
                inSR: spatialRef,
                outSR: spatialRef,
                geometry: JSON.stringify({
                    xmin: x1,
                    ymin: y1,
                    xmax: x2,
                    ymax: y2,
                    spatialReference: {
                        wkid: spatialRef
                    }
                })
            }
        })
            .then(response => {
                return response.data.features.map((feature) => {
                    return {
                        id: feature.attributes.LOCODE,
                        point: [feature.geometry.x, feature.geometry.y]
                    }
                })
            })
            .catch(error => {
                console.log(`ERROR fetching lock list ${x1}, ${y1}, ${x2}, ${y2} - ${error}`)
            })
    },
    lockDetails: function (id) {
        const url = `${baseUrl}/visuris/api/Locks_v2/GetLock`

        return axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                Accept: 'application/json'
            },
            params: {
                isrs: id
            }
        })
            .then(response => {
                return response.data
            })
            .catch(error => {
                console.log(`ERROR fetching lock details ${id} - ${error}`)
            })
    }
}
