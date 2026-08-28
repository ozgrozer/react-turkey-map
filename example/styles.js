/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

export default {
  wrapper: css`
    width: 90%;
    margin: auto;
  `,
  buttons: css`
    gap: 10px;
    display: flex;
    margin-bottom: 50px;
  `,
  popup: css`
    color: #fff;
    font-size: 14px;
    background: #111;
    padding: 8px 16px;
    white-space: nowrap;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif;
  `,
  popupMeta: css`
    opacity: 0.7;
    font-size: 12px;
  `
}
