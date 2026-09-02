/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

export default {
  turkeyMapWrapper: css`
    width: 100%;
    position: relative;
  `,
  turkeyMap: css`
    width: 100%;
    /* an inline svg picks up ~6px of line box slack under the drawing, which
       would stop the wrapper matching the viewBox */
    display: block;
  `,
  zoomableMap: css`
    /* the map handles its own pan and zoom, so the browser must not also
       scroll the page or run its own double tap zoom on top */
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    /* stops ios flashing a grey box over a province on every tap */
    -webkit-tap-highlight-color: transparent;
    cursor: grab;
  `,
  draggingMap: css`
    cursor: grabbing;
  `,
  path: css`
    fill: #bbb;
    stroke: #fff;
    cursor: pointer;
    stroke-width: 0.75;
    vector-effect: non-scaling-stroke;
    &:hover {
      fill: #aaa;
    }
  `,
  inertPath: css`
    /* no tooltip and no click, so no hover affordance either */
    cursor: default;
    &:hover {
      fill: #bbb;
    }
  `,
  zoomablePath: css`
    /* let the svg's grab cursor show through */
    cursor: inherit;
  `,
  marker: css`
    stroke: #fff;
    cursor: pointer;
    vector-effect: non-scaling-stroke;
  `,
  anchoredTooltip: css`
    z-index: 2;
    position: absolute;
    /* centred over the point that was tapped and lifted clear of the finger,
       which would otherwise be covering it */
    transform: translate(-50%, calc(-100% - 12px));
    /* it belongs to what is under it, so it must never take the next tap */
    pointer-events: none;
    /* the map is only as wide as the screen on a phone, so a long name has to
       be allowed to wrap rather than run off the edge */
    max-width: 80%;
  `,
  markerPopup: css`
    position: absolute;
    /* centred over the pin and lifted clear of it */
    transform: translate(-50%, calc(-100% - 12px));
  `,
  tooltipCss: css`
    z-index: 2;
    /* portalled onto the body and fixed to the viewport, so the tooltip lands
       in the right place whether or not the host has a positioned wrapper */
    position: fixed;
    /* it follows the pointer, so it must never become the pointer's target */
    pointer-events: none;
  `,
  tooltipContent: css`
    color: #fff;
    font-size: 14px;
    background: #000;
    padding: 8px 16px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
      'Segoe UI Symbol';
  `
}
