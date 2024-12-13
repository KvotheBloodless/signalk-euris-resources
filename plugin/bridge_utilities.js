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

const handlebars = require('handlebars')
const helpers = require('helpers-for-handlebars')

helpers.math()
helpers.array()
helpers.comparison()

const simpleDescriptionTemplate = handlebars.compile(
    'H {{#if feature.height}}{{divide feature.height 100}}m{{else}}unknown{{/if}} * W {{#if feature.mwidthcm}}{{divide feature.mwidthcm 100}}m{{else}}unknown{{/if}}'
)

const richDescriptionTemplate = handlebars.compile(
`
<nr/>
<div>
    <table>
        <tr>
            <th>H</th>
            <th>W</th>
        </tr>
        <tr>
            <td>{{#if feature.height}}{{divide feature.height 100}}m{{else}}unknown{{/if}}</td>
            <td>{{#if feature.mwidthcm}}{{divide feature.mwidthcm 100}}m{{else}}unknown{{/if}}</td>
        </th>
    </table>
</div>
<nr/>
`
)

module.exports = {
    toNoteFeature: function (coordinates, details, _) {
        return {
            timetamp: new Date().toISOString(),
            name: details.feature.objectname,
            description: richDescriptionTemplate(details),
            position: {
                longitude: coordinates[0],
                latitude: coordinates[1]
            },
            url: `https://www.eurisportal.eu/visuris/api/Bridges/GetBridge?isrs=${details.feature.locode}`,
            mimeType: 'text/plain',
            properties: {
                readOnly: true
            }
        }
    },
    toResourceSetFeature: function (coordinates, details) {
        return {
            geometry: {
                type: 'Point',
                coordinates
            },
            properties: {
                name: details.feature.objectname,
                description: simpleDescriptionTemplate(details)
            }
        }
    }
}
