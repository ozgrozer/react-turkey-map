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

// the inverse: which point of the map is sitting at this spot in the viewBox,
// so a tap can be pinned to the map rather than to the screen
export const unapplyTransform = (point, { zoom, x, y }) => ({
  x: (point.x - x) / zoom,
  y: (point.y - y) / zoom
})

export const interpolateTransform = (start, target, progress) => ({
  zoom: start.zoom + (target.zoom - start.zoom) * progress,
  x: start.x + (target.x - start.x) * progress,
  y: start.y + (target.y - start.y) * progress
})

// cubic ease out
export const easeOut = progress => 1 - Math.pow(1 - progress, 3)

// a mouse notch reports about 100 at once, a trackpad swipe a few units per
// event and a pinch smaller still, so each needs its own sensitivity
const scrollSensitivity = 0.01
const pinchSensitivity = 0.03
// one violent flick must not cross half the zoom range in a single event
const maxWheelDelta = 60

export const wheelZoomFactor = (deltaY, deltaMode, pinch) => {
  // firefox reports lines, some setups report pages, both in screen pixels
  const step = deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1
  const delta = Math.max(-maxWheelDelta, Math.min(maxWheelDelta, deltaY * step))
  return Math.exp(-delta * (pinch ? pinchSensitivity : scrollSensitivity))
}

// the fraction of the remaining distance to cover after `elapsed` ms, so the
// easing runs at the same speed whatever the frame rate
export const approach = (elapsed, timeConstant) =>
  1 - Math.exp(-elapsed / timeConstant)
