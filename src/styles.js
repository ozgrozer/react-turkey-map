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
    touch-action: none;
    user-select: none;
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
  markerPopup: css`
    position: absolute;
    /* centred over the pin and lifted clear of it */
    transform: translate(-50%, calc(-100% - 12px));
  `,
  tooltipCss: css`
    z-index: 2;
    position: absolute;
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
