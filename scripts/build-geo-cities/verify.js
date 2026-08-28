/*
 * Checks src/geoCities.js and src/projection.js against the Natural Earth
 * source it was generated from.
 *
 *   1. all 81 plates are present, with their expected city names
 *   2. the projected map fills the 1007x443 viewBox instead of collapsing
 *      onto one axis
 *   3. every province's Natural Earth label point falls inside one of that
 *      province's own simplified rings, and findProvince agrees
 *
 * Usage:
 *   node scripts/build-geo-cities/verify
 *   node scripts/build-geo-cities/verify --input path/to/ne.geojson
 *
 * Needs Node 18+ for fetch, and Node 22.12+ to read the ESM sources in src/.
 */

const path = require('path')

const cityList = require('./cityNames')
const { readTurkeyFeatures } = require('./source')

// src/ is ESM inside a CommonJS package; node warns about that on every import
process.removeAllListeners('warning')
process.on('warning', warning => {
  if (/Module type of file/.test(warning.message)) return
  process.stderr.write(`${warning.stack || warning.message}\n`)
})

const srcDir = path.join(__dirname, '..', '..', 'src')

const cityNames = Object.fromEntries(
  cityList.map(({ plate, city }) => [plate, city])
)

const failures = []

const check = (name, passed, detail) => {
  const mark = passed ? 'ok  ' : 'FAIL'
  process.stdout.write(`${mark} ${name}${detail ? ` — ${detail}` : ''}\n`)
  if (!passed) failures.push(name)
}

// ray casting; the ring is closed, so the wrapped edge is covered
const pointInRing = (point, ring) => {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const above = yi > y
    const otherAbove = yj > y
    const crossing = ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (above !== otherAbove && x < crossing) inside = !inside
  }
  return inside
}

const verify = async () => {
  const features = await readTurkeyFeatures()

  const geoCities = (await import(path.join(srcDir, 'geoCities.js'))).default
  const { findProvince } = await import(path.join(srcDir, 'locate.js'))
  const projection = await import(path.join(srcDir, 'projection.js'))
  const { projectPoint, geoPaths, viewBoxWidth, viewBoxHeight } = projection

  // 1. coverage
  const geoPlates = geoCities.map(city => city.plate).sort()
  const knownPlates = Object.keys(cityNames).sort()
  check(
    'geoCities has 81 provinces',
    geoCities.length === 81,
    `${geoCities.length} provinces`
  )
  check(
    'plates match the known city list',
    geoPlates.join() === knownPlates.join(),
    `${geoPlates.length} vs ${knownPlates.length}`
  )
  check(
    'city names match the known city list',
    geoCities.every(city => cityNames[city.plate] === city.city)
  )
  check(
    'every province has a name and at least one ring',
    geoCities.every(
      city =>
        city.city &&
        city.paths.length > 0 &&
        city.paths.every(ring => ring.length >= 4)
    )
  )
  check(
    'geoPaths draws every province',
    geoPaths.length === geoCities.length &&
      geoPaths.every(entry => /^M[-\d.,LMZ]*Z$/.test(entry.draw))
  )

  // 2. the projection fills the viewBox
  const box = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  }
  geoCities.forEach(city => {
    city.paths.forEach(ring => {
      ring.forEach(([longitude, latitude]) => {
        const { x, y } = projectPoint(longitude, latitude)
        box.minX = Math.min(box.minX, x)
        box.maxX = Math.max(box.maxX, x)
        box.minY = Math.min(box.minY, y)
        box.maxY = Math.max(box.maxY, y)
      })
    })
  })
  const width = box.maxX - box.minX
  const height = box.maxY - box.minY

  check(
    'projected width fills the viewBox',
    width > viewBoxWidth * 0.95 && width <= viewBoxWidth,
    `${width.toFixed(1)} of ${viewBoxWidth}`
  )
  check(
    'projected height fills the viewBox',
    height > viewBoxHeight * 0.9 && height <= viewBoxHeight,
    `${height.toFixed(1)} of ${viewBoxHeight}`
  )
  check(
    'projection stays inside the viewBox',
    box.minX >= 0 &&
      box.minY >= 0 &&
      box.maxX <= viewBoxWidth &&
      box.maxY <= viewBoxHeight,
    `x ${box.minX.toFixed(1)}..${box.maxX.toFixed(1)}, y ${box.minY.toFixed(
      1
    )}..${box.maxY.toFixed(1)}`
  )
  // a map flattened by a broken mercator conversion still passes a width check
  check(
    'aspect ratio is plausible for Turkey',
    width / height > 1.5 && width / height < 3.5,
    `${(width / height).toFixed(2)}:1`
  )

  // 3. label points land inside their own province
  const byPlate = new Map(geoCities.map(city => [city.plate, city]))
  const outside = []
  features.forEach(feature => {
    const city = byPlate.get(feature.plate)
    const point = [feature.properties.longitude, feature.properties.latitude]
    if (!city || !city.paths.some(ring => pointInRing(point, ring))) {
      outside.push(`${feature.plate} ${feature.properties.name}`)
    }
  })
  check(
    'every label point falls inside its own province',
    outside.length === 0,
    outside.length ? outside.join(', ') : `${features.length} provinces`
  )

  // the shipped lookup must agree with the independent test above
  const misresolved = features.filter(feature => {
    const found = findProvince(
      feature.properties.longitude,
      feature.properties.latitude
    )
    return !found || found.plate !== feature.plate
  })
  check(
    'findProvince resolves every label point to its own province',
    misresolved.length === 0,
    misresolved.length
      ? misresolved.map(f => f.plate).join(', ')
      : `${features.length} provinces`
  )
  check(
    'findProvince returns null outside Turkey',
    findProvince(23.7275, 37.9838) === null && findProvince(NaN, NaN) === null,
    'Athens and NaN both null'
  )

  // sanity spot check: a few well known coordinates land in the right province
  const spotChecks = [
    {
      name: 'İstanbul (Sultanahmet)',
      latitude: 41.0055,
      longitude: 28.9769,
      plate: '34'
    },
    {
      name: 'Ankara (Kızılay)',
      latitude: 39.9208,
      longitude: 32.8541,
      plate: '06'
    },
    {
      name: 'İzmir (Konak)',
      latitude: 38.4189,
      longitude: 27.1287,
      plate: '35'
    },
    {
      name: 'Antalya (Kaleiçi)',
      latitude: 36.8841,
      longitude: 30.7056,
      plate: '07'
    },
    { name: 'Van (Merkez)', latitude: 38.4942, longitude: 43.38, plate: '65' }
  ]
  const misplaced = spotChecks.filter(spot => {
    const city = byPlate.get(spot.plate)
    const found = findProvince(spot.longitude, spot.latitude)
    return (
      !city ||
      !city.paths.some(ring =>
        pointInRing([spot.longitude, spot.latitude], ring)
      ) ||
      !found ||
      found.plate !== spot.plate
    )
  })
  check(
    'known city centres land in the right province',
    misplaced.length === 0,
    misplaced.length
      ? misplaced.map(spot => spot.name).join(', ')
      : `${spotChecks.length} checked`
  )

  process.stdout.write(
    failures.length
      ? `\n${failures.length} check(s) failed\n`
      : '\nAll checks passed\n'
  )
  process.exit(failures.length ? 1 : 0)
}

verify().catch(error => {
  process.stderr.write(`${error.stack}\n`)
  process.exit(1)
})
