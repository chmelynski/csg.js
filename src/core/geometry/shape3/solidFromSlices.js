const poly3 = require('../poly3')
const { fromPolygons } = require('./fromPolygons')
// const { fnSortByIndex } = require('../../')

// FIXME: WHY is this for 3D polygons and not for 2D shapes ?
/**
 * Creates solid from slices (Polygon) by generating walls
 * @param {Object} options Solid generating options
 *  - numslices {Number} Number of slices to be generated
 *  - callback(t, slice) {Function} Callback function generating slices.
 *          arguments: t = [0..1], slice = [0..numslices - 1]
 *          return: Polygon or null to skip
 *  - loop {Boolean} no flats, only walls, it's used to generate solids like a tor
 *  @param {Polygon3} options base polygon
 */
const solidFromSlices = function (options, polygon) {
  let polygons = []
  let csg = null
  let prev = null
  let bottom = null
  let top = null
  let flipped = null

  let square = poly3.fromPoints([
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0]
  ])

  const defaults = {
    numSlices: 2,
    loop: false,
    fnCallback: function (t, slice) {
      return t === 0 || t === 1 ? poly3.translate([0, 0, t], square) : null
    }
  }
  const { numSlices, loop, fnCallback } = Object.assign({}, defaults, options)
  // bLoop = Boolean(options['loop'])

  for (let i = 0, iMax = numSlices - 1; i <= iMax; i++) {
    csg = fnCallback.call(polygon, i / iMax, i)
    if (csg) {
      if (!(csg instanceof Polygon)) {
        throw new Error('SolidFromSlices callback error: Polygon expected')
      }
      csg.checkIfConvex()

      if (prev) { // generate walls
        if (flipped === null) { // not generated yet
          flipped = prev.plane.signedDistanceToPoint(csg.vertices[0].pos) < 0
        }
        _addWalls(polygons, prev, csg, flipped)
      } else { // the first - will be a bottom
        bottom = csg
      }
      prev = csg
    } // callback can return null to skip that slice
  }
  top = csg

  if (loop) {
    let bSameTopBottom = bottom.vertices.length === top.vertices.length &&
                  bottom.vertices.every(function (v, index) {
                    return v.pos.equals(top.vertices[index].pos)
                  })
    // if top and bottom are not the same -
    // generate walls between them
    if (!bSameTopBottom) {
      _addWalls(polygons, top, bottom, flipped)
    } // else - already generated
  } else {
    // save top and bottom
    // TODO: flip if necessary
    polygons.unshift(flipped ? bottom : bottom.flipped())
    polygons.push(flipped ? top.flipped() : top)
  }
  return fromPolygons(polygons)
}

function fnSortByIndex (a, b) {
  return a.index - b.index
}

/**
 * @param walls Array of wall polygons
 * @param bottom Bottom polygon
 * @param top Top polygon
 */
const _addWalls = function (walls, bottom, top, bFlipped) {
  let bottomPoints = bottom.vertices.slice(0) // make a copy
  let topPoints = top.vertices.slice(0) // make a copy
  let color = top.shared || null

  // check if bottom perimeter is closed
  if (!bottomPoints[0].pos.equals(bottomPoints[bottomPoints.length - 1].pos)) {
    bottomPoints.push(bottomPoints[0])
  }

  // check if top perimeter is closed
  if (!topPoints[0].pos.equals(topPoints[topPoints.length - 1].pos)) {
    topPoints.push(topPoints[0])
  }
  if (bFlipped) {
    bottomPoints = bottomPoints.reverse()
    topPoints = topPoints.reverse()
  }

  let iTopLen = topPoints.length - 1
  let iBotLen = bottomPoints.length - 1
  let iExtra = iTopLen - iBotLen// how many extra triangles we need
  let bMoreTops = iExtra > 0
  let bMoreBottoms = iExtra < 0

  let aMin = [] // indexes to start extra triangles (polygon with minimal square)
  // init - we need exactly /iExtra/ small triangles
  for (let i = Math.abs(iExtra); i > 0; i--) {
    aMin.push({
      len: Infinity,
      index: -1
    })
  }

  let len
  if (bMoreBottoms) {
    for (let i = 0; i < iBotLen; i++) {
      len = bottomPoints[i].pos.distanceToSquared(bottomPoints[i + 1].pos)
      // find the element to replace
      for (let j = aMin.length - 1; j >= 0; j--) {
        if (aMin[j].len > len) {
          aMin[j].len = len
          aMin.index = j
          break
        }
      } // for
    }
  } else if (bMoreTops) {
    for (let i = 0; i < iTopLen; i++) {
      len = topPoints[i].pos.distanceToSquared(topPoints[i + 1].pos)
      // find the element to replace
      for (let j = aMin.length - 1; j >= 0; j--) {
        if (aMin[j].len > len) {
          aMin[j].len = len
          aMin.index = j
          break
        }
      } // for
    }
  } // if
  // sort by index
  aMin.sort(fnSortByIndex)
  let getTriangle = function addWallsPutTriangle (pointA, pointB, pointC, color) {
    return new Polygon([pointA, pointB, pointC], color)
  // return bFlipped ? triangle.flipped() : triangle;
  }

  let bpoint = bottomPoints[0]
  let tpoint = topPoints[0]
  let secondPoint
  let nBotFacet
  let nTopFacet // length of triangle facet side
  for (let iB = 0, iT = 0, iMax = iTopLen + iBotLen; iB + iT < iMax;) {
    if (aMin.length) {
      if (bMoreTops && iT === aMin[0].index) { // one vertex is on the bottom, 2 - on the top
        secondPoint = topPoints[++iT]
        // console.log('<<< extra top: ' + secondPoint + ', ' + tpoint + ', bottom: ' + bpoint);
        walls.push(getTriangle(
          secondPoint, tpoint, bpoint, color
        ))
        tpoint = secondPoint
        aMin.shift()
        continue
      } else if (bMoreBottoms && iB === aMin[0].index) {
        secondPoint = bottomPoints[++iB]
        walls.push(getTriangle(
          tpoint, bpoint, secondPoint, color
        ))
        bpoint = secondPoint
        aMin.shift()
        continue
      }
    }
    // choose the shortest path
    if (iB < iBotLen) { // one vertex is on the top, 2 - on the bottom
      nBotFacet = tpoint.pos.distanceToSquared(bottomPoints[iB + 1].pos)
    } else {
      nBotFacet = Infinity
    }
    if (iT < iTopLen) { // one vertex is on the bottom, 2 - on the top
      nTopFacet = bpoint.pos.distanceToSquared(topPoints[iT + 1].pos)
    } else {
      nTopFacet = Infinity
    }
    if (nBotFacet <= nTopFacet) {
      secondPoint = bottomPoints[++iB]
      walls.push(getTriangle(
        tpoint, bpoint, secondPoint, color
      ))
      bpoint = secondPoint
    } else if (iT < iTopLen) { // nTopFacet < Infinity
      secondPoint = topPoints[++iT]
      // console.log('<<< top: ' + secondPoint + ', ' + tpoint + ', bottom: ' + bpoint);
      walls.push(getTriangle(
        secondPoint, tpoint, bpoint, color
      ))
      tpoint = secondPoint
    };
  }
  return walls
}

module.exports = solidFromSlices