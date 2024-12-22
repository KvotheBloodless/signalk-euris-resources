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
    'test'
)

const richDescriptionTemplate = handlebars.compile(
`
test
`
)

module.exports = {
    toNoteFeature: function (coordinates, details, operatingTimes, noticesToSkippers) {
        return {
            timetamp: new Date().toISOString(),
            name: details ? details.compactBerth2.objectname : 'Berth',
            description: richDescriptionTemplate({
                details,
                operatingTimes,
                noticesToSkippers
            }),
            position: {
                longitude: coordinates[0],
                latitude: coordinates[1]
            },
            url: `https://www.eurisportal.eu/visuris/api/Berths_v2/GetBerth?isrs=`,
            mimeType: 'text/plain',
            properties: {
                readOnly: true
            }
        }
    }
}
