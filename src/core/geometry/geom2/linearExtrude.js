const { extrude } = require('./extrusionUtils')
const translate = require('../../../api/ops-transformations/translate')
const measureBounds = require('./measureBounds')

/** linear extrusion of the input 2d geometry
 * @param {Object} [options] - options for construction
 * @param {Float} [options.height=1] - height of the extruded geometry
 * @param {Integer} [options.slices=10] - number of intermediary steps/slices
 * @param {Integer} [options.twist=0] - angle (in degrees to twist the extusion by)
 * @param {Boolean} [options.center=false] - whether to center extrusion or not
 * @param {Geom2} baseGeom input 2d geometry
 * @returns {Geom2} new extruded geometry
 *
 * @example
 * const revolved = linearExtrude({height: 10}, rectangle())
 */
const linearExtrude = (params, baseGeom) => {
  const defaults = {
    height: 1,
    slices: 10,
    twist: 0,
    center: false
  }
  const { height, twist, slices, center } = Object.assign({}, defaults, params)

  let output = extrude(baseGeom, { offset: [0, 0, height], twistangle: twist, twiststeps: slices })
  if (center === true) {
    const outputBounds = measureBounds(output)
    const offset = (outputBounds[1].plus(outputBounds[0])).times(-0.5)
    output = translate(offset, output)
  }
  return output
}

module.exports = linearExtrude