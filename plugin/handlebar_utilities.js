/**
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
const helpersForHandlebars = require('helpers-for-handlebars')

module.exports = {
    helpers: function () {
        
        helpersForHandlebars.string()
        helpersForHandlebars.number()
        helpersForHandlebars.math()
        helpersForHandlebars.array()
        helpersForHandlebars.comparison()

        handlebars.registerHelper('dateFormat', require('handlebars-dateformat'))

        handlebars.registerHelper('deltas', function (arr, prop) {
            return arr.map((heightString) => `${(parseInt(heightString) / 100).toFixed(1)}m`).join(prop)
        })
        
        handlebars.registerHelper('isoDateToTime', function (dateString) {
            return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        })

        handlebars.registerHelper('toInt', function(str) {
            return parseInt(str,10)
        })

        handlebars.registerPartial('operatingTime', 
            `
                🕐 {{isoDateToTime dateStart}} ► 🕐 {{isoDateToTime dateEnd}} {{statusMessage}}<br/>
                {{#eachIndex operationEventRemarks}}
                    Remark {{plus index 1}}: {{item.remark}}<br/>
                {{/eachIndex}} 
                {{#eachIndex operationEventTargetDirections}}
                    Direction {{plus index 1}}: {{item.fairwayDirectionCode}}<br/>
                {{/eachIndex}}
            `
        )

        handlebars.registerPartial('noticeToSkippers', 
            `
                <p>{{capitalize messageTypeMessage}}, published by {{originator}} on {{dateFormat dateIssue "MMMM Do YYYY, h:mm a"}}</p>
                <p>Valid from {{dateFormat dateStart "MMMM Do YYYY"}} to {{dateFormat dateEnd "MMMM Do YYYY"}}</p> 
                <p><b>{{capitalize title}}</b></p>
                <p>{{xml.RIS_Message.ftm.contents._text}}</p>
                <p>
                {{#each xml.RIS_Message.ftm.communication}}
                    <a href="{{this.number._text}}">{{this.label._text}}</a><br/>
                {{/each}}
                </p>
            `
        )
    }
}