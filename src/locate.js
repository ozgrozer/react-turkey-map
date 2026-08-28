import geoCities from './geoCities.js'

// One flat list of rings with their bounds, built once at module level. The
// bounds let a lookup skip almost every ring without any ray casting.
const rings = []

geoCities.forEach(city => {
  city.paths.forEach(ring => {
    const bounds = {
      minLongitude: Infinity,
      maxLongitude: -Infinity,
      minLatitude: Infinity,
      maxLatitude: -Infinity
    }
    ring.forEach(([longitude, latitude]) => {
      if (longitude < bounds.minLongitude) bounds.minLongitude = longitude
      if (longitude > bounds.maxLongitude) bounds.maxLongitude = longitude
      if (latitude < bounds.minLatitude) bounds.minLatitude = latitude
      if (latitude > bounds.maxLatitude) bounds.maxLatitude = latitude
    })
    rings.push({ plate: city.plate, city: city.city, ring, ...bounds })
  })
})

// ray casting; the ring is closed, so the wrapped edge is covered
const pointInRing = (longitude, latitude, ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const above = ring[i][1] > latitude
    const otherAbove = ring[j][1] > latitude
    if (above === otherAbove) continue
    const crossing =
      ((ring[j][0] - ring[i][0]) * (latitude - ring[i][1])) /
        (ring[j][1] - ring[i][1]) +
      ring[i][0]
    if (longitude < crossing) inside = !inside
  }
  return inside
}

// the province a coordinate falls in, or null if it falls outside every one
export const findProvince = (longitude, latitude) => {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null

  for (const entry of rings) {
    const outside =
      longitude < entry.minLongitude ||
      longitude > entry.maxLongitude ||
      latitude < entry.minLatitude ||
      latitude > entry.maxLatitude
    if (outside) continue
    if (pointInRing(longitude, latitude, entry.ring)) {
      return { plate: entry.plate, city: entry.city }
    }
  }

  return null
}
