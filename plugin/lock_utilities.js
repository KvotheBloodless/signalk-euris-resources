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
helpers.number()

handlebars.registerHelper('deltas', function (arr, prop) {
    return arr.map((heightString) => `${(parseInt(heightString) / 100).toFixed(1)}m`).join(prop)
})

handlebars.registerHelper('isoDateToTime', function (dateString) {
    return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
})

const simpleLockDescriptionTemplate = handlebars.compile(
    '{{length sublocks}} Basin(s) - Δ {{deltas (pluck sublocks "clHeight") "; "}} - {{compactLock2.contactPhone}}'
)

const richLockDescriptionTemplate = handlebars.compile(
    `
<hr/>
<div>
    <h4>📏 Dimensions</h4>
    <table>
        <tr>
            <th>Basin</th>
            <th>Δ</th>
            <th>L</th>
            <th>W</th>
        </tr>
    {{#eachIndex details.sublocks}}
        <tr>
            <td>{{plus index 1}}</td>
            <td>{{divide item.clHeight 100}}m</td>
            <td>{{divide item.mlengthcm 100}}m</td>
            <td>{{divide item.mwidthcm 100}}m</td>
        </th>
    {{/eachIndex}}
    </table>
</div>
{{#if operatingTimes}}
<hr/>
<div>
    <h4>Operating times today</h4>
    {{#each operatingTimes}}
        <p>
            {{isoDateToTime this.dateStart}} ► 🕐 {{isoDateToTime this.dateEnd}} {{this.statusMessage}}<br/>
            {{#eachIndex this.operationEventRemarks}}
                Remark {{plus index 1}}: {{item.remark}}<br/>
            {{/eachIndex}} 
        </p>
    {{/each}}
</div>
{{/if}}
{{#if details.compactLock2.contactPhone}}
<hr/>
<div>
    <h4>Contact</h4>
    📞 {{details.compactLock2.contactPhone}}
</div>
{{/if}}
<hr/>
`
)

module.exports = {
    toNoteFeature: function (coordinates, details, operatingTimes) {
        return {
            timetamp: new Date().toISOString(),
            name: details.compactLock2.objectName,
            description: richLockDescriptionTemplate({
                details,
                operatingTimes
            }),
            position: {
                longitude: coordinates[0],
                latitude: coordinates[1]
            },
            url: `https://www.eurisportal.eu/visuris/api/Locks_v2/GetLock?isrs=${details.compactLock2.locode}`,
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
                name: details.compactLock2.objectName,
                description: simpleLockDescriptionTemplate(details)
            }
        }
    }
}
