/** @jsxImportSource @emotion/react */
import React, { useState, useRef, useEffect, useCallback } from 'react'

import styles from './styles'
import {
  geoPaths,
  projectPoint,
  viewBoxWidth,
  viewBoxHeight
} from './projection'
import { findProvince } from './locate'
import {
  panBy,
  easeOut,
  approach,
  zoomAround,
  wheelZoomFactor,
  identityTransform,
  interpolateTransform
} from './transform'

// screen pixels; a viewBox unit threshold is far too tight to work as one
const dragThreshold = 3
const doubleClickZoom = 2
const doubleClickDuration = 250
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
const markerRadius = 5
const markerStrokeWidth = 1.5
const defaultMarkerColor = '#e2231a'

// treats a missing value as unplaceable rather than as 0
const toNumber = value => {
  if (value === null || value === undefined || value === '') return NaN
  return Number(value)
}

export default ({
  colorData: _colorData,
  showTooltip: _showTooltip,
  showCityTooltip: _showCityTooltip,
  showMarkerTooltip: _showMarkerTooltip,
  tooltipData: _tooltipData,
  zoomable: _zoomable,
  minZoom: _minZoom,
  maxZoom: _maxZoom,
  markers: _markers,
  clickableCities: _clickableCities,
  renderMarkerPopup,
  onCityClick,
  onMarkerClick
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
  const [transform, setTransform] = useState(identityTransform)
  const [dragging, setDragging] = useState(false)
  // { marker, point } for the marker whose popup is open, in map units
  const [popup, setPopup] = useState(null)

  const svgRef = useRef(null)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const transformRef = useRef(identityTransform)
  const clickSuppressedRef = useRef(false)
  // { zoom, point, at } — where the wheel wants to be, which the rendered
  // transform eases towards rather than snapping to
  const wheelRef = useRef(null)
  const zoomFrameRef = useRef(null)

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

  useEffect(() => {
    if (!dragging) return

    const handlePointerMove = event => {
      const drag = dragRef.current
      if (!drag) return
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

    const handlePointerUp = () => {
      const drag = dragRef.current
      // a drag that ends on a marker must not count as a click on it
      clickSuppressedRef.current = Boolean(drag && drag.moved)
      dragRef.current = null
      setDragging(false)
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
  }, [dragging, minZoom, maxZoom, commitTransform])

  useEffect(() => {
    return () => {
      cancelAnimation()
      cancelZoom()
    }
  }, [cancelAnimation, cancelZoom])

  const handlePointerDown = event => {
    if (!zoomable || event.button !== 0) return
    const rect = svgRef.current.getBoundingClientRect()
    cancelAnimation()
    // a drag must not fight a zoom that is still easing towards its target
    cancelZoom()
    clickSuppressedRef.current = false
    dragRef.current = {
      moved: false,
      pointerX: event.clientX,
      pointerY: event.clientY,
      origin: transformRef.current,
      // screen pixels to viewBox units
      scaleX: viewBoxWidth / rect.width,
      scaleY: viewBoxHeight / rect.height
    }
    setDragging(true)
  }

  const handleDoubleClick = event => {
    if (!zoomable) return
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

  const handleMouseOver = event => {
    const target = event.target

    if (target.tagName === 'circle') {
      const title = showMarkerTooltip
        ? target.getAttribute('data-marker-title')
        : null
      setTooltip(title ? <div css={styles.tooltipContent}>{title}</div> : '')
      return
    }

    if (target.tagName === 'path') {
      if (!showCityTooltip) {
        setTooltip('')
        return
      }
      const city = target.parentNode.getAttribute('data-city')
      const plate = target.parentNode.getAttribute('data-plate')
      const TooltipComponent = (
        <div css={styles.tooltipContent}>
          {city}
          {tooltipData[plate] ? `: ${tooltipData[plate]}` : ''}
        </div>
      )
      setTooltip(TooltipComponent)
    }
  }

  const handleMouseMove = event => {
    setPosition({ top: event.pageY + 25, left: event.pageX })
  }

  const handleMouseOut = () => {
    setTooltip('')
  }

  const handleClick = event => {
    if (clickSuppressedRef.current) return
    // any click that isn't on a marker dismisses the popup
    setPopup(null)
    if (!clickableCities) return
    if (event.target.tagName === 'path') {
      const parent = event.target.parentNode
      const city = parent.getAttribute('data-city')
      const plate = parent.getAttribute('data-plate')
      // id is whatever was clicked, which for a province is its plate
      const clicked = { id: plate, plate, city }
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
  const popupPosition = (() => {
    if (!popup || !renderMarkerPopup) return null
    const x = popup.point.x * transform.zoom + transform.x
    const y = popup.point.y * transform.zoom + transform.y
    // the svg clips the marker at the edge, so the popup has to go too
    if (x < 0 || x > viewBoxWidth || y < 0 || y > viewBoxHeight) return null
    return {
      left: `${(x / viewBoxWidth) * 100}%`,
      top: `${(y / viewBoxHeight) * 100}%`
    }
  })()

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
          key={marker.id !== undefined ? marker.id : key}
          css={styles.marker}
          // constant on screen whatever the zoom
          r={markerRadius / transform.zoom}
          data-marker-title={marker.title || undefined}
          style={{
            fill: marker.color || defaultMarkerColor,
            strokeWidth: markerStrokeWidth / transform.zoom
          }}
          onClick={onClick}
        />
      )
    })
    .filter(Boolean)

  return (
    <div>
      <div
        css={styles.tooltipCss}
        style={{ top: position.top, left: position.left }}
      >
        {tooltip}
      </div>

      <div css={styles.turkeyMapWrapper}>
        <svg
          ref={svgRef}
          version='1.1'
          onClick={handleClick}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          xmlns='http://www.w3.org/2000/svg'
          css={[
            styles.turkeyMap,
            zoomable && styles.zoomableMap,
            dragging && styles.draggingMap
          ]}
          {...(zoomable ? { onPointerDown: handlePointerDown } : {})}
          {...(zoomable ? { onDoubleClick: handleDoubleClick } : {})}
          {...(anyTooltip ? { onMouseOut: handleMouseOut } : {})}
          {...(anyTooltip ? { onMouseOver: handleMouseOver } : {})}
          {...(anyTooltip ? { onMouseMove: handleMouseMove } : {})}
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
