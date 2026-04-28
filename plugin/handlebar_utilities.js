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
const fs = require('node:fs')
const path = require('node:path')

let compiledTemplates = {}

function initializeTemplates (basePath, resourceName = 'signalk-euris-resources') {
  const partialsDir = path.join(basePath, 'node_modules', `${resourceName}`, 'plugin', 'partials')
  const templatesDir = path.join(basePath, 'node_modules', `${resourceName}`, 'plugin', 'templates')

// Register partials
  handlebars.registerPartial('footer', fs.readFileSync(path.join(partialsDir, 'footer.hbsp'), 'utf-8'))
  handlebars.registerPartial('disclaimer', fs.readFileSync(path.join(partialsDir, 'disclaimer.hbsp'), 'utf-8'))
  handlebars.registerPartial('operatingTime', fs.readFileSync(path.join(partialsDir, 'operating_time.hbsp'), 'utf-8'))
  handlebars.registerPartial('noticeToSkippers', fs.readFileSync(path.join(partialsDir, 'notice_to_skippers.hbsp'), 'utf-8'))

  // Compile templates
  compiledTemplates = {
    ris: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'ris.hbs'), 'utf-8')),
    bridge: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'bridge.hbs'), 'utf-8')),
    lock: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'lock.hbs'), 'utf-8')),
    guage: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'guage.hbs'), 'utf-8')),
    berthWithoutTranshipment: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'berthWithoutTranshipment.hbs'), 'utf-8')),
    ferryBerth: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'ferryBerth.hbs'), 'utf-8')),
    radioCallPoint: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'radioCallPoint.hbs'), 'utf-8')),
    noticeToSkippers: handlebars.compile(fs.readFileSync(path.join(templatesDir, 'noticeToSkippers.hbs'), 'utf-8'))
  }
}

module.exports = {
  helpers: function (app) {
    // Initialize templates if not already done
    if (Object.keys(compiledTemplates).length === 0) {
      const basePath = app.config.configPath.replace(/\/config$/, '')
      initializeTemplates(basePath, 'signalk-euris-resources')
    }

    helpersForHandlebars.string()
    helpersForHandlebars.number()
    helpersForHandlebars.math()
    helpersForHandlebars.array()
    helpersForHandlebars.comparison()

    handlebars.registerHelper('dateFormat', require('handlebars-dateformat'))

    handlebars.registerHelper('deltas', function (arr, prop) {
      return arr.map((heightString) => `${(parseInt(heightString) / 100).toFixed(1)}m`).join(prop)
    })

    handlebars.registerHelper('berthCategory', function (categories) {
      return categories.split(',').map(s => {
        switch (s) {
          case '1':
            return 'Loading'
          case '2':
            return 'Unloading'
          case '3':
            return 'Overnight accomodation'
          case '4':
            return 'Push tow anchorage'
          case '5':
            return 'Anchorage for other vessels than push tows'
          case '6':
            return 'Fleeting area/waiting area'
          case '7':
            return 'First class landing'
          case '8':
            return 'Second class landing'
          case '9':
            return 'Passenger vessels'
          default:
            return ''
        }
      }).join(', ')
    })

    handlebars.registerHelper('berthAllowedCones', function (status) {
      return status.split(',').map(s => {
        switch (s) {
          case '1':
            return 'One blue light / cone'
          case '2':
            return 'Two blue lights / cones'
          case '3':
            return 'Three blue lights / cones'
          case '4':
            return 'No blue light / cone'
          case '5':
            return 'One red light / red cone top down'
          default:
            return ''
        }
      }).join(', ')
    })

    handlebars.registerHelper('berthStatus', function (status) {
      return status.split(',').map(s => {
        switch (s) {
          case '3':
            return 'Recommended'
          case '8':
            return 'Private'
          case '12':
            return 'Illuminated'
          case '14':
            return 'Public'
          case '16':
            return 'Watched'
          case '17':
            return 'Un-watched'
          default:
            return ''
        }
      }).join(', ')
    })

    handlebars.registerHelper('berthBank', function (bank) {
      switch (bank) {
        case 'LB':
          return 'Left bank'
        case 'RB':
          return 'Right bank'
        default:
          return ''
      }
    })

    handlebars.registerHelper('isoDateToTime', function (dateString) {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })

    handlebars.registerHelper('toInt', function (str) {
      return parseInt(str, 10)
    })

    handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this)
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this)
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this)
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this)
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this)
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this)
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this)
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this)
        case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this)
        case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this)
        default:
          return options.inverse(this)
      }
    })
  },
  ris: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.objectName,
      description: compiledTemplates.ris({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  guage: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: `${entity[0].parameterName} - ${entity[0].parameterName}`,
      description: compiledTemplates.guage({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  bridge: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.bridgeAreaHeight.name,
      description: compiledTemplates.bridge({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  lock: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.compactLock2.objectName,
      description: compiledTemplates.lock({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  berthWithoutTranshipment: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.compactBerth2.objectname,
      description: compiledTemplates.berthWithoutTranshipment({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  ferryBerth: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.compactBerth2.objectname,
      description: compiledTemplates.ferryBerth({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  berthWithTranshipment: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.compactBerth2.objectname,
      description: compiledTemplates.noticeToSkippers({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  radioCallPoint: function (icon, entity, operatingTimes, noticesToSkippers) {
    return {
      name: entity.objectName,
      description: compiledTemplates.radioCallPoint({
        entity,
        operatingTimes,
        noticesToSkippers
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  },
  noticeToSkippers: function (icon, entity, _, __) {
    return {
      name: entity.title,
      description: compiledTemplates.noticeToSkippers({
        entity,
        _,
        __
      }),
      properties: {
        readOnly: true,
        skIcon: icon
      }
    }
  }
}