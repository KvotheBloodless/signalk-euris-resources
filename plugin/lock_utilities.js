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

const simpleDescriptionTemplate = handlebars.compile(
    '{{length sublocks}} Basin(s) - Δ {{deltas (pluck sublocks "clHeight") "; "}} - {{compactLock2.contactPhone}}'
)

const richDescriptionTemplate = handlebars.compile(
    `
<hr/>
<div>
<p>{{#if details.routeName}}{{details.routeName}}{{else}}{{details.compactLock2.waterwayName}}{{/if}}, km {{divide (toInt details.compactLock2.hectom) 10}}</p>
</div>
<hr/>
<div>
    <h4>Dimensions</h4>
    <table>
        <tr>
            <th>Basin</th>
            <th>Δ</th>
            <th>L</th>
            <th>W</th>
        </tr>
    {{#eachIndex details.sublocks}}
        <tr>
            <td>📐 {{plus index 1}}</td>
            <td>{{#if item.clHeight}}{{divide item.clHeight 100}}m{{else}}-{{/if}}</td>
            <td>{{#if item.mlengthcm}}{{divide item.mlengthcm 100}}{{else}}-{{/if}}m</td>
            <td>{{#if item.clWidth}}{{divide item.clWidth 100}}{{else}}-{{/if}}m</td>
        </th>
    {{/eachIndex}}
    </table>
</div>
{{#if noticesToSkippers}}
<div>
    {{#eachIndex noticesToSkippers}}
        <hr/>
        <h4>Notice to skippers {{plus index 1}}</h4>    
        {{> noticeToSkippers item }}
    {{/eachIndex}}
</div>
{{/if}}
{{#if operatingTimes}}
<hr/>
<div>
    <h4>Operating times today</h4>
    {{#each operatingTimes}}
        <p>
            {{> operatingTime this }}
        </p>
    {{/each}}
</div>
{{/if}}
<hr/>
<div>
    <h4>Contact {{details.facility.operator}}</h4>
    {{#if details.compactLock2.comcha}}📟 VHF {{details.compactLock2.comcha}}<br/>{{/if}}{{#if details.compactLock2.comname}} callsign {{details.compactLock2.comname}}<br/>{{/if}}
    {{#each details.facility.contacts}}
        {{#if this.mobiles}}📱 <a href="tel:{{this.mobiles}}">{{this.mobiles}}</a><br/>{{/if}}
        {{#if this.phones}}☎️ <a href="tel:{{this.phones}}">{{this.phones}}</a><br/>{{/if}}
        {{#if this.faxes}}📠 <a href="tel:{{this.faxes}}">{{this.faxes}}</a><br/>{{/if}}
        {{#if this.emails}}📧 <a href="mailto:{{this.emails}}">{{this.emails}}</a><br/>{{/if}}
        {{#if this.urls}}🌐 <a href="{{this.urls}}">{{this.urls}}</a><br/>{{/if}}
    {{/each}}
</div>
<hr/>
`
)

module.exports = {
    toNoteFeature: function (coordinates, details, operatingTimes, noticesToSkippers) {
        return {
            timetamp: new Date().toISOString(),
            name: details.compactLock2.objectName,
            description: richDescriptionTemplate({
                details,
                operatingTimes,
                noticesToSkippers
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
                description: simpleDescriptionTemplate(details)
            }
        }
    }
}
