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

const lockDescriptionTemplate = Handlebars.compile(`
<h3>{{compactLock2.objectName}}</h3>
<sup>{{routeName}} - {{compactLock2.waterwayName}} - {{facility.operator}} - {{country}}</sup><br/>
<sup>{{length sublocks}} Chamber(s)</sup><br/>
<h4>Contact</h4>
<p><label>Phone:</label><span>{{compactLock2.contactPhone}}</span></p>
{{#each sublocks}}
    <h4>Chamber {{@index}} Characteristics</h4>
    <p><label>Rise: </label><span>{{divide clHeight 100}}m</span></p>
    <p><label>Dimensions: </label><span>{{divide mlengthcm 100}}m by {{divide mwidthcm 100}}m</span></p>
{{/each}}
<br/>
`)

module.exports = {
    toResourceSetFeature: function (coordinates, details) {
        return {
            geometry: {
                type: 'Point',
                coordinates: coordinates
            },
            properties: {
                name: details.compactLock2.objectName,
                description: lockDescriptionTemplate(details)
            }
        }
    }
}


