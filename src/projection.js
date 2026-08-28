import geoCities from './geoCities.js'

// the viewBox the drawn map in cities.js was authored against — the projected
// map reuses it so both projections are drop-in replacements for each other
export const viewBoxWidth = 1007
export const viewBoxHeight = 443

const padding = 8

// Web Mercator, with y converted back to degrees so both axes share a unit.
// Skip the conversion and the map flattens into a horizontal line.
export const mercatorY = latitude =>
  (Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * 180) / Math.PI

// bounds of the whole dataset, computed once at module level
const bounds = geoCities.reduce(
  (box, city) => {
    city.paths.forEach(ring => {
      ring.forEach(([longitude, latitude]) => {
        const y = mercatorY(latitude)
        if (longitude < box.minLongitude) box.minLongitude = longitude
        if (longitude > box.maxLongitude) box.maxLongitude = longitude
        if (y < box.minY) box.minY = y
        if (y > box.maxY) box.maxY = y
      })
    })
    return box
  },
  {
    minLongitude: Infinity,
    maxLongitude: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  }
)

const longitudeSpan = bounds.maxLongitude - bounds.minLongitude
const mercatorSpan = bounds.maxY - bounds.minY

const scale = Math.min(
  (viewBoxWidth - padding * 2) / longitudeSpan,
  (viewBoxHeight - padding * 2) / mercatorSpan
)

// centre what's left over on both axes
const offsetX = (viewBoxWidth - longitudeSpan * scale) / 2
const offsetY = (viewBoxHeight - mercatorSpan * scale) / 2

export const projectPoint = (longitude, latitude) => ({
  x: offsetX + (longitude - bounds.minLongitude) * scale,
  // svg y grows downwards, mercator y grows northwards
  y: offsetY + (bounds.maxY - mercatorY(latitude)) * scale
})

const round = value => Math.round(value * 100) / 100

const ringToPath = ring => {
  // the last point repeats the first, and Z closes the ring anyway
  const points = ring.slice(0, -1).map(([longitude, latitude]) => {
    const { x, y } = projectPoint(longitude, latitude)
    return `${round(x)},${round(y)}`
  })
  return `M${points.join('L')}Z`
}

// project every province once at module level, not on each render
export const geoPaths = geoCities.map(city => ({
  plate: city.plate,
  city: city.city,
  draw: city.paths.map(ringToPath).join('')
}))

export const projectionBounds = bounds
