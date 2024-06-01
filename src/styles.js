/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

export default {
  turkeyMapWrapper: css`
    width: 100%;
  `,
  turkeyMap: css`
    width: 100%;
  `,
  path: css`
    fill: #bbb;
    cursor: pointer;
    &:hover {
      fill: #aaa;
    }
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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  `
}
