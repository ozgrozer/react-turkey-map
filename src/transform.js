import { viewBoxWidth, viewBoxHeight } from './projection.js'

export const identityTransform = { zoom: 1, x: 0, y: 0 }

// keeps the drawing covering the frame, so panning can never expose empty space
export const clampTransform = ({ zoom, x, y }, minZoom, maxZoom) => {
  const nextZoom = Math.min(Math.max(zoom, minZoom), maxZoom)
  return {
    zoom: nextZoom,
    x: Math.min(0, Math.max(viewBoxWidth * (1 - nextZoom), x)),
    y: Math.min(0, Math.max(viewBoxHeight * (1 - nextZoom), y))
  }
}

// zoom while keeping whatever sits under the given point under it
export const zoomAround = (point, nextZoom, current, minZoom, maxZoom) => {
  const zoom = Math.min(Math.max(nextZoom, minZoom), maxZoom)
  const ratio = zoom / current.zoom
  return clampTransform(
    {
      zoom,
      x: point.x - (point.x - current.x) * ratio,
      y: point.y - (point.y - current.y) * ratio
    },
    minZoom,
    maxZoom
  )
}

export const panBy = (origin, dx, dy, minZoom, maxZoom) => {
  return clampTransform(
    { zoom: origin.zoom, x: origin.x + dx, y: origin.y + dy },
    minZoom,
    maxZoom
  )
}

// where a point of the map ends up inside the viewBox
export const applyTransform = (point, { zoom, x, y }) => ({
  x: point.x * zoom + x,
  y: point.y * zoom + y
})

export const interpolateTransform = (start, target, progress) => ({
  zoom: start.zoom + (target.zoom - start.zoom) * progress,
  x: start.x + (target.x - start.x) * progress,
  y: start.y + (target.y - start.y) * progress
})

// cubic ease out
export const easeOut = progress => 1 - Math.pow(1 - progress, 3)

export const wheelZoomFactor = (deltaY, deltaMode) => {
  // firefox reports lines, some setups report pages
  const step = deltaMode === 1 ? 16 : deltaMode === 2 ? viewBoxHeight : 1
  return Math.pow(1.0015, -deltaY * step)
}
