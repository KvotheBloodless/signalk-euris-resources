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
    'H {{#if feature.height}}{{divide feature.height 100}}m{{else}}-{{/if}} * W {{#if feature.mwidthcm}}{{divide feature.mwidthcm 100}}m{{else}}-{{/if}}'
)

const richDescriptionTemplate = handlebars.compile(
`
<hr/>
<div>
<p>{{#if details.feature.rT_NAME}}{{details.feature.rT_NAME}}{{else}}{{details.feature.wW_NAME}}{{/if}}, km {{divide (toInt details.feature.hectom) 10}}</p>
</div>
<hr/>
<div>
    <h4>Dimensions</h4>
    <table>
        <tr>
            <th></th>
            <th>H</th>
            <th>W</th>
        </tr>
        <tr>
            <td>📐</td>
            <td>{{#if details.feature.height}}{{divide details.feature.height 100}}m{{else}}-{{/if}}</td>
            <td>{{#if details.feature.mwidthcm}}{{divide details.feature.mwidthcm 100}}m{{else}}-{{/if}}</td>
        </th>
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
<nr/>
`
)

module.exports = {
    toNoteFeature: function (coordinates, details, operatingTimes, noticesToSkippers) {
        return {
            timetamp: new Date().toISOString(),
            name: details.feature.objectname,
            description: richDescriptionTemplate({
                details, 
                operatingTimes,
                noticesToSkippers
            }),
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
