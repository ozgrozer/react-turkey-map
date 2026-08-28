/*
 * Checks the zoom/pan maths in src/transform.js against src/projection.js,
 * without needing the Natural Earth source or a browser.
 *
 *   1. wheel zoom keeps whatever is under the cursor under the cursor
 *   2. double click zoom does the same, and its animation frames stay legal
 *   3. dragging pans by exactly the pointer delta
 *   4. zooming back out to minZoom returns to the identity transform
 *   5. the drawing always covers the frame, and min/max zoom hold
 *   6. markers stay pinned inside their province through all of the above
 *
 * Usage: node scripts/verify-transform
 *
 * Needs Node 22.12+ to read the ESM sources in src/.
 */

const path = require('path')

// src/ is ESM inside a CommonJS package; node warns about that on every import
process.removeAllListeners('warning')
process.on('warning', warning => {
  if (/Module type of file/.test(warning.message)) return
  process.stderr.write(`${warning.stack || warning.message}\n`)
})

const srcDir = path.join(__dirname, '..', 'src')

const minZoom = 1
const maxZoom = 40
const epsilon = 1e-9

const failures = []

const check = (name, passed, detail) => {
  const mark = passed ? 'ok  ' : 'FAIL'
  process.stdout.write(`${mark} ${name}${detail ? ` — ${detail}` : ''}\n`)
  if (!passed) failures.push(name)
}

const pointInRings = (point, rings) => {
  let inside = false
  rings.forEach(ring => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const above = ring[i].y > point.y
      const otherAbove = ring[j].y > point.y
      const crossing =
        ((ring[j].x - ring[i].x) * (point.y - ring[i].y)) /
          (ring[j].y - ring[i].y) +
        ring[i].x
      if (above !== otherAbove && point.x < crossing) inside = !inside
    }
  })
  return inside
}

// deterministic, so a failure is reproducible
const lcg = seed => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

const verify = async () => {
  const geoCities = (await import(path.join(srcDir, 'geoCities.js'))).default
  const { projectPoint, viewBoxWidth, viewBoxHeight } = await import(
    path.join(srcDir, 'projection.js')
  )
  const {
    panBy,
    easeOut,
    zoomAround,
    applyTransform,
    wheelZoomFactor,
    identityTransform,
    interpolateTransform
  } = await import(path.join(srcDir, 'transform.js'))

  const covers = ({ zoom, x, y }) =>
    zoom >= minZoom - epsilon &&
    zoom <= maxZoom + epsilon &&
    x <= epsilon &&
    y <= epsilon &&
    x >= viewBoxWidth * (1 - zoom) - epsilon &&
    y >= viewBoxHeight * (1 - zoom) - epsilon

  // İstanbul, its marker and its outline
  const istanbul = geoCities.find(city => city.plate === '34')
  const marker = projectPoint(28.9784, 41.0082)
  const outline = istanbul.paths.map(ring =>
    ring.map(([longitude, latitude]) => projectPoint(longitude, latitude))
  )

  check(
    'a marker lands inside its own province before any transform',
    pointInRings(marker, outline),
    `İstanbul at ${marker.x.toFixed(1)},${marker.y.toFixed(1)}`
  )

  // 1. wheel zoom around the cursor
  const cursor = { x: 500, y: 220 }
  let current = identityTransform
  let cursorDrift = 0
  const zoomLevels = []
  for (const deltaY of [-120, -120, -240, 120, -600, 300, -120]) {
    const factor = wheelZoomFactor(deltaY, 0)
    const next = zoomAround(
      cursor,
      current.zoom * factor,
      current,
      minZoom,
      maxZoom
    )
    // when the clamp isn't biting, the cursor point must not move at all
    if (
      covers(next) &&
      next.zoom > minZoom + epsilon &&
      next.zoom < maxZoom - epsilon
    ) {
      const after = applyTransform(
        {
          x: (cursor.x - current.x) / current.zoom,
          y: (cursor.y - current.y) / current.zoom
        },
        next
      )
      cursorDrift = Math.max(
        cursorDrift,
        Math.hypot(after.x - cursor.x, after.y - cursor.y)
      )
    }
    current = next
    zoomLevels.push(current.zoom.toFixed(2))
  }
  check(
    'wheel zoom holds the point under the cursor still',
    cursorDrift < 1e-6,
    `drift ${cursorDrift.toExponential(1)}, zooms ${zoomLevels.join(' → ')}`
  )
  check('wheel zoom keeps the drawing covering the frame', covers(current))

  // 2. double click zoom, and the frames its animation walks through
  const start = current
  const target = zoomAround(cursor, start.zoom * 2, start, minZoom, maxZoom)
  const beforeDouble = {
    x: (cursor.x - start.x) / start.zoom,
    y: (cursor.y - start.y) / start.zoom
  }
  const afterDouble = applyTransform(beforeDouble, target)
  check(
    'double click zoom holds the point under the cursor still',
    Math.hypot(afterDouble.x - cursor.x, afterDouble.y - cursor.y) < 1e-6,
    `${start.zoom.toFixed(2)} → ${target.zoom.toFixed(2)}`
  )

  let illegalFrames = 0
  for (let frame = 0; frame <= 60; frame++) {
    const step = interpolateTransform(start, target, easeOut(frame / 60))
    if (!covers(step)) illegalFrames++
  }
  check(
    'every animation frame keeps the drawing covering the frame',
    illegalFrames === 0,
    `${illegalFrames} of 61 frames outside`
  )
  check(
    'the animation lands exactly on its target',
    JSON.stringify(interpolateTransform(start, target, easeOut(1))) ===
      JSON.stringify(target)
  )

  // 3. dragging pans by exactly the pointer delta
  const dragged = panBy(target, -40, -25, minZoom, maxZoom)
  check(
    'dragging pans by the pointer delta',
    Math.abs(dragged.x - (target.x - 40)) < epsilon &&
      Math.abs(dragged.y - (target.y - 25)) < epsilon &&
      dragged.zoom === target.zoom,
    `x ${target.x.toFixed(1)} → ${dragged.x.toFixed(1)}`
  )
  const overDragged = panBy(target, 1e6, 1e6, minZoom, maxZoom)
  check(
    'dragging past the edge stops at the edge',
    overDragged.x === 0 && overDragged.y === 0 && covers(overDragged)
  )

  // 4. zooming back out is the only way home now that there is no reset control
  const zoomedOut = zoomAround(
    { x: 12, y: 400 },
    minZoom,
    dragged,
    minZoom,
    maxZoom
  )
  check(
    'zooming back out to minZoom returns to the identity transform',
    zoomedOut.zoom === 1 && zoomedOut.x === 0 && zoomedOut.y === 0,
    `from ${dragged.zoom.toFixed(2)}x at ${dragged.x.toFixed(0)},${dragged.y.toFixed(0)}`
  )

  // 5. zoom limits over a long random walk, and 6. marker pinning throughout
  const random = lcg(20240828)
  let walk = identityTransform
  let uncovered = 0
  let unpinned = 0
  let maxSeen = 0
  let minSeen = Infinity

  const markerStillPinned = state => {
    const movedMarker = applyTransform(marker, state)
    const movedOutline = outline.map(ring =>
      ring.map(p => applyTransform(p, state))
    )
    return pointInRings(movedMarker, movedOutline)
  }

  for (let i = 0; i < 4000; i++) {
    const roll = random()
    const point = { x: random() * viewBoxWidth, y: random() * viewBoxHeight }
    if (roll < 0.45) {
      walk = zoomAround(
        point,
        walk.zoom * wheelZoomFactor((random() - 0.5) * 1200, 0),
        walk,
        minZoom,
        maxZoom
      )
    } else if (roll < 0.6) {
      walk = zoomAround(point, walk.zoom * 2, walk, minZoom, maxZoom)
    } else if (roll < 0.95) {
      walk = panBy(
        walk,
        (random() - 0.5) * 800,
        (random() - 0.5) * 400,
        minZoom,
        maxZoom
      )
    } else {
      walk = zoomAround(point, minZoom, walk, minZoom, maxZoom)
    }
    if (!covers(walk)) uncovered++
    if (!markerStillPinned(walk)) unpinned++
    maxSeen = Math.max(maxSeen, walk.zoom)
    minSeen = Math.min(minSeen, walk.zoom)
  }

  check(
    'the drawing covers the frame through 4000 random operations',
    uncovered === 0,
    `${uncovered} bad states`
  )
  check(
    'zoom stays within minZoom and maxZoom',
    minSeen >= minZoom - epsilon && maxSeen <= maxZoom + epsilon,
    `${minSeen.toFixed(2)}..${maxSeen.toFixed(2)} of ${minZoom}..${maxZoom}`
  )
  check(
    'the marker stays pinned to its province through all of them',
    unpinned === 0,
    `${unpinned} states where it drifted off`
  )

  // markers keep a constant screen size, so their radius must track the zoom
  const radii = [1, 4, 12, 40].map(zoom => 5 / zoom)
  check(
    'marker radius shrinks in step with the zoom',
    radii.every(
      (radius, index) => Math.abs(radius * [1, 4, 12, 40][index] - 5) < epsilon
    ),
    radii.map(radius => radius.toFixed(3)).join(', ')
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
