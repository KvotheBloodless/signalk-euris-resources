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

const Handlebars = require('handlebars')
const helpers = require('helpers-for-handlebars')

helpers.math()
helpers.array()

Handlebars.registerHelper('join', function (array, sep, options) {
    return array.map(function (item) {
        return options.fn(item)
    }).join(sep)
})

const simpleLockDescriptionTemplate = Handlebars.compile(
    '{{length sublocks}} Basin(s) - {{#join sublocks "; "}}Δ {{#if clHeight}}{{divide clHeight 100}}m{{/if}}{{/join}} - {{compactLock2.contactPhone}}'
)

const richLockDescriptionTemplate = Handlebars.compile(
    `
<h3>{{compactLock2.objectName}}</h3>
<div>
{{length sublocks}} Basin(s)<br/>
{{#each sublocks}}
<p>
{{#if clHeight}}<label>Δ: </label><span>{{divide clHeight 100}}m</span>{{/if}}
{{#if mlengthcm}}<label>L: </label><span>{{divide mlengthcm 100}}m</span>{{/if}}
{{#if mwidthcm}}<label>W: </label><span>{{divide mwidthcm 100}}m</span>{{/if}}
</p>
{{/each}}
</div>
<h4>Contact</h4>
<div>
<p><label>Phone:</label><span>{{compactLock2.contactPhone}}</span></p>
</div>`
)

module.exports = {
    toNoteFeature: function (coordinates, details) {
        return {
            timetamp: new Date().toISOString(),
            name: details.compactLock2.objectName,
            description: richLockDescriptionTemplate(details),
            position: {
                longitude: coordinates[0],
                latitude: coordinates[1]
            },
            group: 'EuRIS_Lock',
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
