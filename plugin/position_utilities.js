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
  positionToBbox: function (position, distanceMeters) {
    const nwCoords = calculateNewPosition(position[0], position[1], -45, distanceMeters / 1000)
    const seCoords = calculateNewPosition(position[0], position[1], 135, distanceMeters / 1000)

    return [nwCoords.longitude, nwCoords.latitude, seCoords.longitude, seCoords.latitude]
  }
}

function calculateNewPosition (longitude, latitude, bearing, distanceKms) {
  const earthRadius = 6371 // Radius of the Earth in kilometers
  const latitudeRad = toRadians(latitude)
  const longitudeRad = toRadians(longitude)
  const bearingRad = toRadians(bearing)

  const newLatitudeRad = Math.asin(Math.sin(latitudeRad) * Math.cos(distanceKms / earthRadius) +
      Math.cos(latitudeRad) * Math.sin(distanceKms / earthRadius) * Math.cos(bearingRad))

  const newLongitudeRad = longitudeRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distanceKms / earthRadius) * Math.cos(latitudeRad),
    Math.cos(distanceKms / earthRadius) - Math.sin(latitudeRad) * Math.sin(newLatitudeRad))

  const newLatitude = toDegrees(newLatitudeRad)
  const newLongitude = toDegrees(newLongitudeRad)

  return { latitude: newLatitude, longitude: newLongitude }
}

function toRadians (degrees) {
  return degrees * Math.PI / 180
}

function toDegrees (radians) {
  return radians * 180 / Math.PI
}
