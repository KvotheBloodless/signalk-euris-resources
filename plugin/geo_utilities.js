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

module.exports = {
  line2Polygon: function (points, thickness) {
    // Convert points into json notation
    const arr = []
    for (let i = 0; i < points.length; i++) {
      const pt = points[i]
      arr.push({
        x: pt[0],
        y: pt[1]
      })
    }
    points = arr

    // Convert thickness into an array as needed
    if (!isArray(thickness)) {
      const t = thickness
      thickness = []
      for (let j = 0; j < points.length; j++) {
        thickness.push(t)
      }
    }

    let
      off; let off2
    const poly = []
    let isFirst; let isLast
    let prevA; let prevB
    let interA; let interB
    let p0a; let p1a; let p0b; let p1b

    for (let k = 0, kl = points.length - 1; k < kl; k++) {
      isFirst = !k
      isLast = (k === points.length - 2)

      off = getOffsets(points[k], points[k + 1], thickness[k])
      off2 = getOffsets(points[k], points[k + 1], thickness[k + 1])

      p0a = { x: points[k].x + off.x, y: points[k].y + off.y }
      p1a = { x: points[k + 1].x + off2.x, y: points[k + 1].y + off2.y }

      p0b = { x: points[k].x - off.x, y: points[k].y - off.y }
      p1b = { x: points[k + 1].x - off2.x, y: points[k + 1].y - off2.y }

      if (!isFirst) {
        interA = getIntersection(prevA[0], prevA[1], p0a, p1a)
        if (interA) {
          poly.unshift(interA)
        }
        interB = getIntersection(prevB[0], prevB[1], p0b, p1b)
        if (interB) {
          poly.push(interB)
        }
      }

      if (isFirst) {
        poly.unshift(p0a)
        poly.push(p0b)
      }

      if (isLast) {
        poly.unshift(p1a)
        poly.push(p1b)
      }

      if (!isLast) {
        prevA = [p0a, p1a]
        prevB = [p0b, p1b]
      }
    }

    for (let l = 0; l < poly.length; l++) {
      const pnt = poly[l]
      poly[l] = [pnt.x, pnt.y]
    }

    poly.push(poly[0])

    // There are a few situations that break the algorithm and cause it to output NaN points.
    // This is an easy fix to this.
    return sanitiseOuput(poly)
  }
}

function sanitiseOuput (points) {
  const cleaned = []

  for (let i = 0; i < points.length; i++) {
    if (!isNaN(points[i][0]) && !isNaN(points[i][1])) {
      cleaned.push(points[i])
    }
  }
  return cleaned
}

function getOffsets (a, b, thickness) {
  const
    dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const scale = thickness / (2 * len)

  return {
    x: -scale * dy,
    y: scale * dx
  }
}

function getIntersection (a1, b1, a2, b2) {
  // directional constants
  const
    k1 = (b1.y - a1.y) / (b1.x - a1.x)
  const k2 = (b2.y - a2.y) / (b2.x - a2.x)

  // if the directional constants are equal, the lines are parallel
  if (Math.abs(k1 - k2) < 0.00001) {
    return
  }

  // y offset constants for both lines
  const m1 = a1.y - k1 * a1.x
  const m2 = a2.y - k2 * a2.x

  // compute x
  const x = (m1 - m2) / (k2 - k1)

  // use y = k * x + m to get y coordinate
  const y = k1 * x + m1

  return { x, y }
}

function isArray (obj) {
  return (Object.prototype.toString.call(obj) === '[object Array]')
}
