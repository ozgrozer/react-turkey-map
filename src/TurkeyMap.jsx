/** @jsxImportSource @emotion/react */
import { createPortal } from 'react-dom'
import React, { useState, useRef, useEffect, useCallback } from 'react'

import styles from './styles'
import { findProvince } from './locate'
import {
  geoPaths,
  projectPoint,
  viewBoxWidth,
  viewBoxHeight
} from './projection'
import {
  panBy,
  easeOut,
  approach,
  zoomAround,
  wheelZoomFactor,
  identityTransform,
  unapplyTransform,
  interpolateTransform
} from './transform'

// screen pixels; a viewBox unit threshold is far too tight to work as one
const dragThreshold = 3
const doubleClickZoom = 2
const doubleClickDuration = 250
// two fingers this close report a midpoint and a ratio that are mostly noise
const minPinchDistance = 1
// a touch double tap has to be recognised by hand, since a browser that has
// had its own double tap zoom taken away by touch-action does not always
// follow up with a dblclick
const doubleTapDelay = 300
// screen pixels between two taps for them to still count as a double tap
const doubleTapDistance = 30
// long enough to cover the dblclick that may follow a double tap we handled
const syntheticClickWindow = 500
// how quickly the rendered zoom chases the one the wheel has asked for; small
// enough to feel immediate, large enough to swallow a jittery first delta
const zoomTimeConstant = 70
// below this the next frame would not be visible, so the easing stops
const zoomSettleRatio = 1e-4
// a gap this long ends the gesture, so the next scroll starts from the screen
// rather than stacking onto a target nobody is chasing any more
const gestureIdle = 150
// a frame this late means the tab was hidden; easing across it would jump
const maxFrameGap = 100
// screen pixels, so a marker is the same size on a phone as on a desktop
const markerRadius = 5
const markerStrokeWidth = 1.5
const defaultMarkerColor = '#e2231a'

// the two fingers of a pinch: how far apart they are in screen pixels, and
// where their midpoint sits, which is the point the map has to hold still.
// only the first two pointers count, so a third finger changes nothing
const readPinch = (pointers, toPoint) => {
  const [a, b] = Array.from(pointers.values())
  return {
    distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    point: toPoint({
      clientX: (a.clientX + b.clientX) / 2,
      clientY: (a.clientY + b.clientY) / 2
    })
  }
}

// where a point of the map lands over the wrapper, as a percentage, or null
// once it has been carried outside the viewBox. html positioned this way keeps
// a constant screen size while still riding the pan and zoom
const anchorPosition = (point, transform) => {
  const x = point.x * transform.zoom + transform.x
  const y = point.y * transform.zoom + transform.y
  // the svg clips its contents at the edge, so anything anchored to them goes
  // at the same moment
  if (x < 0 || x > viewBoxWidth || y < 0 || y > viewBoxHeight) return null
  return {
    left: `${(x / viewBoxWidth) * 100}%`,
    top: `${(y / viewBoxHeight) * 100}%`
  }
}

// treats a missing value as unplaceable rather than as 0
const toNumber = value => {
  if (value === null || value === undefined || value === '') return NaN
  return Number(value)
}

export default ({
  onCityClick,
  onMarkerClick,
  minZoom: _minZoom,
  maxZoom: _maxZoom,
  renderMarkerPopup,
  markers: _markers,
  zoomable: _zoomable,
  colorData: _colorData,
  showTooltip: _showTooltip,
  tooltipData: _tooltipData,
  showCityTooltip: _showCityTooltip,
  clickableCities: _clickableCities,
  showMarkerTooltip: _showMarkerTooltip
}) => {
  const colorData = _colorData || {}
  const showTooltip = _showTooltip !== undefined ? _showTooltip : true
  // each kind of tooltip falls back to showTooltip, so it still works as the
  // switch for both
  const showCityTooltip =
    _showCityTooltip !== undefined ? _showCityTooltip : showTooltip
  // a popup on click makes the hover tooltip redundant, so it steps aside
  // unless it was asked for explicitly
  const showMarkerTooltip =
    _showMarkerTooltip !== undefined
      ? _showMarkerTooltip
      : showTooltip && !renderMarkerPopup
  const anyTooltip = showCityTooltip || showMarkerTooltip
  const tooltipData = _tooltipData || {}
  const zoomable = _zoomable !== undefined ? _zoomable : false
  const minZoom = _minZoom !== undefined ? _minZoom : 1
  const maxZoom = _maxZoom !== undefined ? _maxZoom : 40
  const markers = _markers || []
  const clickableCities =
    _clickableCities !== undefined ? _clickableCities : true

  const [tooltip, setTooltip] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  // where a tapped tooltip is pinned, in map units. a hovered one has no
  // anchor: it follows the pointer instead, which is already where it belongs
  const [tooltipAnchor, setTooltipAnchor] = useState(null)
  const [transform, setTransform] = useState(identityTransform)
  const [dragging, setDragging] = useState(false)
  // { marker, point } for the marker whose popup is open, in map units
  const [popup, setPopup] = useState(null)
  // viewBox units per screen pixel; the svg is width: 100%, so this is what
  // keeps the markers a constant size however wide the map is rendered
  const [unitsPerPixel, setUnitsPerPixel] = useState(1)

  const svgRef = useRef(null)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const transformRef = useRef(identityTransform)
  const clickSuppressedRef = useRef(false)
  // { zoom, point, at } — where the wheel wants to be, which the rendered
  // transform eases towards rather than snapping to
  const wheelRef = useRef(null)
  const zoomFrameRef = useRef(null)
  // every finger currently down, keyed by pointerId, in client coordinates
  const pointersRef = useRef(new Map())
  // { distance, point } from the last move, so a pinch applies the change
  // since the previous frame rather than since the gesture began
  const pinchRef = useRef(null)
  const lastTapRef = useRef(null)
  const touchZoomAtRef = useRef(0)
  // a tap has no pointer to follow afterwards, so its tooltip has to be
  // anchored to the map instead. the synthetic mouseover that opens it does
  // not say where it came from, so the pointer event before it is recorded
  const touchInputRef = useRef(false)

  // the ref mirrors the state so back to back wheel events compose correctly
  const commitTransform = useCallback(next => {
    transformRef.current = next
    setTransform(next)
  }, [])

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const cancelZoom = useCallback(() => {
    if (zoomFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomFrameRef.current)
      zoomFrameRef.current = null
    }
    wheelRef.current = null
  }, [])

  // wheel events arrive faster than frames and their first delta is often
  // noise, so they accumulate into a target that one rAF loop eases towards.
  // applying each event straight to the transform is what made a zoom in read
  // as a flick out followed by a zoom in
  const runZoomLoop = useCallback(() => {
    if (zoomFrameRef.current !== null) return
    let previous = window.performance.now()

    const step = now => {
      zoomFrameRef.current = null
      const gesture = wheelRef.current
      if (!gesture) return

      const current = transformRef.current
      const elapsed = Math.min(now - previous, maxFrameGap)
      previous = now

      const remaining = gesture.zoom - current.zoom
      const settled = Math.abs(remaining) <= current.zoom * zoomSettleRatio
      const zoom = settled
        ? gesture.zoom
        : current.zoom + remaining * approach(elapsed, zoomTimeConstant)

      commitTransform(
        zoomAround(gesture.point, zoom, current, minZoom, maxZoom)
      )

      if (settled) wheelRef.current = null
      else zoomFrameRef.current = window.requestAnimationFrame(step)
    }

    zoomFrameRef.current = window.requestAnimationFrame(step)
  }, [minZoom, maxZoom, commitTransform])

  // a css transition would leave the marker radii, which are derived from the
  // zoom, out of sync with the animation
  const animateTo = useCallback(
    target => {
      cancelAnimation()
      cancelZoom()
      const start = transformRef.current
      const startedAt = window.performance.now()

      const step = now => {
        const progress = Math.min((now - startedAt) / doubleClickDuration, 1)
        commitTransform(interpolateTransform(start, target, easeOut(progress)))
        frameRef.current =
          progress < 1 ? window.requestAnimationFrame(step) : null
      }

      frameRef.current = window.requestAnimationFrame(step)
    },
    [cancelAnimation, cancelZoom, commitTransform]
  )

  // event position in viewBox units
  const getPoint = useCallback(event => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * viewBoxWidth,
      y: ((event.clientY - rect.top) / rect.height) * viewBoxHeight
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!zoomable || !svg) return

    const handleWheel = event => {
      event.preventDefault()
      cancelAnimation()

      const now = window.performance.now()
      const gesture = wheelRef.current
      // a gesture still in flight keeps stacking onto its own target, so
      // spinning the wheel fast still travels far; a fresh one starts from
      // what is actually on screen
      const from =
        gesture && now - gesture.at < gestureIdle
          ? gesture.zoom
          : transformRef.current.zoom
      // a trackpad pinch arrives as ctrl+wheel with much smaller deltas than
      // the two finger scroll it shares an event with
      const factor = wheelZoomFactor(
        event.deltaY,
        event.deltaMode,
        event.ctrlKey
      )

      wheelRef.current = {
        at: now,
        // re-read every event so the map follows a pointer that moves mid
        // gesture; harmless while the zoom is unchanged, since the anchor
        // only matters once there is a ratio to apply it to
        point: getPoint(event),
        zoom: Math.min(Math.max(from * factor, minZoom), maxZoom)
      }

      runZoomLoop()
    }

    // react registers wheel listeners passively, so preventDefault only works
    // on a listener we add ourselves
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [zoomable, minZoom, maxZoom, getPoint, cancelAnimation, runZoomLoop])

  // screen pixels to viewBox units, read fresh so a map that has been resized
  // mid gesture still pans by the right amount
  const readScale = useCallback(() => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      scaleX: viewBoxWidth / rect.width,
      scaleY: viewBoxHeight / rect.height
    }
  }, [])

  // takes over panning with whichever finger is still down, so lifting one
  // finger out of a pinch leaves the map under the other one rather than
  // ending the gesture
  const startDrag = useCallback(
    (pointerId, pointer, moved) => {
      dragRef.current = {
        moved,
        pointerId,
        pointerX: pointer.clientX,
        pointerY: pointer.clientY,
        origin: transformRef.current,
        ...readScale()
      }
    },
    [readScale]
  )

  useEffect(() => {
    if (!dragging) return

    const handlePointerMove = event => {
      const pointers = pointersRef.current
      // a pointer that was never pressed on the map must not move it
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      })

      const pinch = pinchRef.current
      if (pinch && pointers.size >= 2) {
        const next = readPinch(pointers, getPoint)
        if (next.distance < minPinchDistance) return
        // the midpoint carries the pan and the spread carries the zoom, so
        // the two fingers keep whatever they grabbed under themselves
        const panned = panBy(
          transformRef.current,
          next.point.x - pinch.point.x,
          next.point.y - pinch.point.y,
          minZoom,
          maxZoom
        )
        commitTransform(
          zoomAround(
            next.point,
            (panned.zoom * next.distance) / pinch.distance,
            panned,
            minZoom,
            maxZoom
          )
        )
        // applied per frame rather than from the start of the gesture, so
        // clamping at an edge cannot make the fingers drift off the map
        pinchRef.current = next
        return
      }

      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (!drag.moved) {
        const dx = event.clientX - drag.pointerX
        const dy = event.clientY - drag.pointerY
        if (Math.hypot(dx, dy) <= dragThreshold) return
        drag.moved = true
        // pan from here rather than from the press, or the map jumps by the
        // threshold the moment the drag is recognised
        drag.pointerX = event.clientX
        drag.pointerY = event.clientY
        drag.origin = transformRef.current
      }
      commitTransform(
        panBy(
          drag.origin,
          (event.clientX - drag.pointerX) * drag.scaleX,
          (event.clientY - drag.pointerY) * drag.scaleY,
          minZoom,
          maxZoom
        )
      )
    }

    // a tap that neither panned nor pinched, so it can start or finish a
    // double tap
    const handleTap = event => {
      const now = window.performance.now()
      const last = lastTapRef.current
      const gap = last
        ? Math.hypot(event.clientX - last.clientX, event.clientY - last.clientY)
        : Infinity
      const near =
        last && now - last.at < doubleTapDelay && gap <= doubleTapDistance

      if (!near) {
        lastTapRef.current = {
          at: now,
          clientX: event.clientX,
          clientY: event.clientY
        }
        return
      }

      lastTapRef.current = null
      // a browser that also emits a dblclick for this tap would otherwise
      // zoom a second time
      touchZoomAtRef.current = now
      // the second tap is part of the zoom, not a click on what is under it
      clickSuppressedRef.current = true
      const current = transformRef.current
      animateTo(
        zoomAround(
          getPoint(event),
          current.zoom * doubleClickZoom,
          current,
          minZoom,
          maxZoom
        )
      )
    }

    const handlePointerUp = event => {
      const pointers = pointersRef.current
      if (!pointers.delete(event.pointerId)) return

      if (pinchRef.current) {
        if (pointers.size >= 2) {
          // a third finger lifting leaves two others still pinching, from
          // wherever they are now
          pinchRef.current = readPinch(pointers, getPoint)
          return
        }
        pinchRef.current = null
        // a pinch is never a click on whatever it happened to start on
        clickSuppressedRef.current = true
        lastTapRef.current = null
        const [remaining] = Array.from(pointers.entries())
        if (remaining) startDrag(remaining[0], remaining[1], true)
        else setDragging(false)
        return
      }

      const drag = dragRef.current
      const moved = Boolean(drag && drag.moved)
      // a drag that ends on a marker must not count as a click on it
      clickSuppressedRef.current = moved
      if (drag && drag.pointerId === event.pointerId) dragRef.current = null

      if (event.pointerType === 'touch' && event.type === 'pointerup') {
        if (moved) lastTapRef.current = null
        else handleTap(event)
      }

      if (pointers.size === 0) setDragging(false)
      // whatever is still down carries on, in case the first finger of a
      // pinch was the one that lifted before the second was recognised
      else if (!dragRef.current) {
        const [remaining] = Array.from(pointers.entries())
        startDrag(remaining[0], remaining[1], true)
      }
    }

    // tracked on window rather than through setPointerCapture on the svg:
    // capturing retargets the click that follows away from the marker, which
    // silently stops marker clicks from ever firing
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [
    dragging,
    minZoom,
    maxZoom,
    getPoint,
    startDrag,
    animateTo,
    commitTransform
  ])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const measure = () => {
      const { width } = svg.getBoundingClientRect()
      // a hidden or not yet laid out map measures 0, which would blow the
      // markers up to infinity
      if (width > 0) setUnitsPerPixel(viewBoxWidth / width)
    }

    measure()

    if (typeof window.ResizeObserver !== 'function') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    // the map can be resized by its container rather than by the window, so
    // this watches the element instead of listening for a window resize
    const observer = new window.ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimation()
      cancelZoom()
    }
  }, [cancelAnimation, cancelZoom])

  const handlePointerDown = event => {
    touchInputRef.current = event.pointerType === 'touch'
    if (!zoomable || event.button !== 0) return
    cancelAnimation()
    // a drag must not fight a zoom that is still easing towards its target
    cancelZoom()
    clickSuppressedRef.current = false

    const pointers = pointersRef.current
    // the primary pointer is the first finger of a gesture, so anything still
    // tracked here is a pointerup that never arrived. without this the map
    // stays stuck in a pinch it can never leave, and every later tap counts
    // as a second finger
    if (event.isPrimary) {
      pointers.clear()
      pinchRef.current = null
    }
    pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    })

    if (pointers.size >= 2) {
      // the second finger turns whatever was a drag into a pinch
      dragRef.current = null
      lastTapRef.current = null
      pinchRef.current = readPinch(pointers, getPoint)
    } else {
      startDrag(event.pointerId, event, false)
    }

    setDragging(true)
  }

  const handleDoubleClick = event => {
    if (!zoomable) return
    // a double tap we already zoomed for; some browsers follow it with a
    // dblclick as well, which would double the zoom again
    const since = window.performance.now() - touchZoomAtRef.current
    if (since < syntheticClickWindow) return
    const current = transformRef.current
    animateTo(
      zoomAround(
        getPoint(event),
        current.zoom * doubleClickZoom,
        current,
        minZoom,
        maxZoom
      )
    )
  }

  // client rather than page coordinates, because the tooltip is fixed to the
  // viewport
  const trackPointer = event => {
    // an anchored tooltip is pinned to the map, so it must not be dragged
    // along by the synthetic mousemove a tap leaves behind
    if (touchInputRef.current) return
    setPosition({ top: event.clientY + 25, left: event.clientX })
  }

  // what the thing under the pointer has to say, or null for nothing to show
  const tooltipFor = target => {
    if (target.tagName === 'circle') {
      const title = showMarkerTooltip
        ? target.getAttribute('data-marker-title')
        : null
      return title ? <div css={styles.tooltipContent}>{title}</div> : null
    }

    if (target.tagName === 'path' && showCityTooltip) {
      const city = target.parentNode.getAttribute('data-city')
      const plate = target.parentNode.getAttribute('data-plate')
      return (
        <div css={styles.tooltipContent}>
          {city}
          {tooltipData[plate] ? `: ${tooltipData[plate]}` : ''}
        </div>
      )
    }

    return null
  }

  const hideTooltip = () => {
    setTooltip('')
    setTooltipAnchor(null)
  }

  const handleMouseOver = event => {
    // a tap leaves synthetic mouse events behind, and the hover they imply
    // then lingers on whatever was tapped. the tap opens its own tooltip, so
    // these are noise
    if (touchInputRef.current) return

    const tag = event.target.tagName
    if (tag !== 'circle' && tag !== 'path') return
    // mouseover lands before the first mousemove, so without this the
    // tooltip would appear for a frame wherever the pointer last was
    trackPointer(event)
    setTooltipAnchor(null)
    setTooltip(tooltipFor(event.target) || '')
  }

  const handleMouseOut = () => {
    // the browser moves that lingering hover off the tapped city on its own
    // as the map slides under it, which would close a tooltip nobody dismissed
    if (touchInputRef.current) return
    hideTooltip()
  }

  // a tap has no pointer left to follow afterwards, so its tooltip is pinned
  // to the map instead and rides the pan and zoom with the city it names
  const showTapTooltip = event => {
    const content = tooltipFor(event.target)
    if (!content) {
      hideTooltip()
      return
    }
    setTooltip(content)
    setTooltipAnchor(unapplyTransform(getPoint(event), transformRef.current))
  }

  const handleClick = event => {
    if (clickSuppressedRef.current) return
    // any click that isn't on a marker dismisses the popup
    setPopup(null)
    // opens the tooltip on a city, and closes it again on a tap into the sea.
    // a pan or a pinch never gets here, so neither disturbs it
    if (touchInputRef.current) showTapTooltip(event)
    if (!clickableCities) return
    if (event.target.tagName === 'path') {
      const parent = event.target.parentNode
      const city = parent.getAttribute('data-city')
      const plate = parent.getAttribute('data-plate')
      const clicked = { plate, city }
      // the log is what this did before there was a callback to hand it to
      if (onCityClick) onCityClick(clicked, event)
      else console.log(clicked)
    }
  }

  // a marker click reports the province it landed in, the way a province
  // click does, alongside the marker the caller passed in
  const handleMarkerClick = (event, marker, longitude, latitude) => {
    event.stopPropagation()
    if (clickSuppressedRef.current) return
    // the click never reaches the svg, so the marker has to place its own
    // tooltip the way a province does
    if (touchInputRef.current) showTapTooltip(event)
    // both null for a marker that falls outside every province
    const { plate = null, city = null } =
      findProvince(longitude, latitude) || {}
    const clicked = { ...marker, plate, city }
    // anchored in map units, so it rides the transform like the marker does
    setPopup({ marker: clicked, point: projectPoint(longitude, latitude) })
    // same deal as a province click: log it until there's a callback for it
    if (onMarkerClick) onMarkerClick(clicked, event)
    else console.log(clicked)
  }

  // the popup is html over the map rather than inside the svg, so it keeps a
  // constant screen size; the position is a percentage of the viewBox, which
  // the wrapper matches exactly
  const popupPosition =
    popup && renderMarkerPopup ? anchorPosition(popup.point, transform) : null

  const anchoredTooltipPosition =
    tooltip && tooltipAnchor ? anchorPosition(tooltipAnchor, transform) : null

  const markerElements = markers
    .map((marker, key) => {
      const latitude = toNumber(marker.latitude)
      const longitude = toNumber(marker.longitude)
      // skip anything we can't place instead of throwing
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

      const { x, y } = projectPoint(longitude, latitude)
      const onClick = event =>
        handleMarkerClick(event, marker, longitude, latitude)

      return (
        <circle
          cx={x}
          cy={y}
          onClick={onClick}
          css={styles.marker}
          data-marker-title={marker.title || undefined}
          key={marker.id !== undefined ? marker.id : key}
          // constant on screen whatever the zoom or the rendered map width
          r={(markerRadius * unitsPerPixel) / transform.zoom}
          style={{
            // non-scaling-stroke already holds this at a constant screen
            // width, so dividing by the zoom as the radius does would shrink
            // the border away
            strokeWidth: markerStrokeWidth,
            fill: marker.color || defaultMarkerColor
          }}
        />
      )
    })
    .filter(Boolean)

  // on the body rather than inside the map, so a host that hasn't made its
  // own wrapper a containing block still gets the tooltip under the pointer.
  // an anchored tooltip goes in the wrapper instead, where the transform can
  // reach it
  const tooltipElement =
    tooltip && !tooltipAnchor && typeof document !== 'undefined'
      ? createPortal(
          <div
            css={styles.tooltipCss}
            style={{ top: position.top, left: position.left }}
          >
            {tooltip}
          </div>,
          document.body
        )
      : null

  return (
    <div>
      {tooltipElement}

      <div css={styles.turkeyMapWrapper}>
        <svg
          ref={svgRef}
          version='1.1'
          onClick={handleClick}
          xmlns='http://www.w3.org/2000/svg'
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          css={[
            styles.turkeyMap,
            zoomable && styles.zoomableMap,
            dragging && styles.draggingMap
          ]}
          onPointerDown={handlePointerDown}
          {...(zoomable ? { onDoubleClick: handleDoubleClick } : {})}
          {...(anyTooltip ? { onMouseOut: handleMouseOut } : {})}
          {...(anyTooltip ? { onMouseOver: handleMouseOver } : {})}
          {...(anyTooltip ? { onMouseMove: trackPointer } : {})}
        >
          <g
            {...(zoomable
              ? {
                  transform: `translate(${transform.x},${transform.y}) scale(${transform.zoom})`
                }
              : {})}
          >
            {geoPaths.map((city, key) => {
              return (
                <g
                  key={key}
                  id={city.plate}
                  data-city={city.city}
                  data-plate={city.plate}
                >
                  <path
                    d={city.draw}
                    css={[
                      styles.path,
                      !clickableCities && styles.inertPath,
                      zoomable && styles.zoomablePath
                    ]}
                    {...(colorData[city.plate]
                      ? { style: { fill: colorData[city.plate] } }
                      : {})}
                  />
                </g>
              )
            })}

            {markerElements}
          </g>
        </svg>

        {anchoredTooltipPosition ? (
          <div css={styles.anchoredTooltip} style={anchoredTooltipPosition}>
            {tooltip}
          </div>
        ) : null}

        {popupPosition ? (
          <div
            style={popupPosition}
            css={styles.markerPopup}
            onClick={event => event.stopPropagation()}
          >
            {renderMarkerPopup(popup.marker)}
          </div>
        ) : null}
      </div>
    </div>
  )
}
