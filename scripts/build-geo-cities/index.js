/*
 * Generates src/geoCities.js — real world province outlines in [lng, lat].
 *
 * Source: Natural Earth 10m admin-1 states/provinces
 *   https://github.com/nvkelso/natural-earth-vector
 *   geojson/ne_10m_admin_1_states_provinces.geojson (~40MB)
 * License: public domain (Natural Earth terms of use)
 *
 * Usage:
 *   node scripts/build-geo-cities            # downloads the source if needed
 *   node scripts/build-geo-cities --input path/to/ne.geojson
 *
 * The source is cached in scripts/build-geo-cities/.cache and is not committed.
 */

const fs = require('fs')
const path = require('path')

const cityList = require('./cityNames')
const { readTurkeyFeatures } = require('./source')

const outputFile = path.join(__dirname, '..', '..', 'src', 'geoCities.js')

// islets smaller than this (in square degrees) are dropped, unless a province
// has nothing bigger
const minRingArea = 0.002
// Douglas-Peucker tolerance, in degrees (~400m)
const simplifyEpsilon = 0.004
const coordinateDecimals = 4

// shoelace formula, absolute area in square degrees
const ringArea = ring => {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return Math.abs(sum) / 2
}

const perpendicularDistance = (point, start, end) => {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1])
  }
  const area = Math.abs(
    dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]
  )
  return area / Math.hypot(dx, dy)
}

const douglasPeucker = (points, epsilon) => {
  if (points.length < 3) return points

  let maxDistance = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    )
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance <= epsilon) {
    return [points[0], points[points.length - 1]]
  }

  const left = douglasPeucker(points.slice(0, index + 1), epsilon)
  const right = douglasPeucker(points.slice(index), epsilon)
  return left.slice(0, -1).concat(right)
}

// a closed ring is split at its two most distant points before simplifying, so
// Douglas-Peucker can't collapse it into a line through its own endpoints
const simplifyRing = (ring, epsilon) => {
  const open = ring.slice(0, -1)
  if (open.length < 4) return ring

  let farthest = 0
  let maxDistance = -1
  for (let i = 1; i < open.length; i++) {
    const distance = Math.hypot(
      open[i][0] - open[0][0],
      open[i][1] - open[0][1]
    )
    if (distance > maxDistance) {
      maxDistance = distance
      farthest = i
    }
  }

  const first = douglasPeucker(open.slice(0, farthest + 1), epsilon)
  const second = douglasPeucker(open.slice(farthest).concat([open[0]]), epsilon)
  return first.slice(0, -1).concat(second)
}

const round = value => {
  const factor = 10 ** coordinateDecimals
  return Math.round(value * factor) / factor
}

// rounding can leave neighbours sitting on the same coordinate
const roundRing = ring => {
  const rounded = []
  for (const point of ring) {
    const next = [round(point[0]), round(point[1])]
    const previous = rounded[rounded.length - 1]
    if (previous && previous[0] === next[0] && previous[1] === next[1]) continue
    rounded.push(next)
  }
  const first = rounded[0]
  const last = rounded[rounded.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    rounded.push([first[0], first[1]])
  }
  return rounded
}

const exteriorRings = geometry => {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(polygon => polygon[0])
  }
  throw new Error(`Unsupported geometry type ${geometry.type}`)
}

const cityNames = Object.fromEntries(
  cityList.map(({ plate, city }) => [plate, city])
)

const build = async () => {
  const features = await readTurkeyFeatures()
  process.stdout.write(`Found ${features.length} provinces\n`)

  const provinces = features.map(feature => {
    const rings = exteriorRings(feature.geometry)
      .map(ring => ({ ring, area: ringArea(ring) }))
      .sort((a, b) => b.area - a.area)
      // every province keeps its largest ring, however small it is
      .filter((entry, index) => index === 0 || entry.area >= minRingArea)
      .map(entry => {
        const simplified = simplifyRing(entry.ring, simplifyEpsilon)
        const rounded = roundRing(
          simplified.length >= 4 ? simplified : entry.ring
        )
        // a ring needs 3 distinct points plus the closing one to have any area
        return rounded.length >= 4 ? rounded : roundRing(entry.ring)
      })

    return {
      plate: feature.plate,
      city: cityNames[feature.plate] || feature.properties.name,
      paths: rings
    }
  })

  const missing = provinces.filter(province => !cityNames[province.plate])
  if (missing.length) {
    process.stdout.write(
      `Warning: no cities.js name for ${missing.map(p => p.plate).join(', ')}\n`
    )
  }

  const points = provinces.reduce((total, province) => {
    return total + province.paths.reduce((sum, ring) => sum + ring.length, 0)
  }, 0)

  const body = provinces
    .map(province => {
      const paths = province.paths
        .map(
          ring =>
            `      [${ring
              .map(point => `[${point[0]}, ${point[1]}]`)
              .join(', ')}]`
        )
        .join(',\n')
      return [
        '  {',
        `    plate: '${province.plate}',`,
        `    city: '${province.city}',`,
        '    paths: [',
        paths,
        '    ]',
        '  }'
      ].join('\n')
    })
    .join(',\n')

  const header = [
    '// Generated by scripts/build-geo-cities — do not edit by hand.',
    '//',
    '// Province outlines as [longitude, latitude] rings, simplified with',
    `// Douglas-Peucker at ${simplifyEpsilon} degrees and rounded to ${coordinateDecimals} decimals.`,
    '//',
    '// Source: Natural Earth 10m admin-1 states/provinces',
    '//   https://github.com/nvkelso/natural-earth-vector',
    '//   geojson/ne_10m_admin_1_states_provinces.geojson',
    '// License: public domain (Natural Earth terms of use)',
    ''
  ].join('\n')

  fs.writeFileSync(outputFile, `${header}export default [\n${body}\n]\n`)

  const size = fs.statSync(outputFile).size
  process.stdout.write(`Wrote ${outputFile}\n`)
  process.stdout.write(
    `${provinces.length} provinces, ${points} points, ${(size / 1024).toFixed(
      1
    )}KB\n`
  )
}

build().catch(error => {
  process.stderr.write(`${error.stack}\n`)
  process.exit(1)
})
