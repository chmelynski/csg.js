const poly3 = require('../poly3')
const fromPolygons = require('./fromPolygons')

/**
 * Return a new Geom3 geometry with solid and empty space switched.
 * This source geometry is not modified.
 * @returns {Geom3} new Geom3 object
 * @example
 * let B = invert(A)
 */
const invert = geometry => {
  let flippedpolygons = geometry.polygons.map(polygon => poly3.flip(polygon))
  return fromPolygons(flippedpolygons)
  // TODO: flip properties?
}

module.exports = invert
