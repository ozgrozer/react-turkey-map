/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'
import { createRoot } from 'react-dom/client'

import BasicMap from './BasicMap'

const styles = {
  wrapper: css`
    width: 90%;
    margin: auto;
    h1 {
      padding: 10px 20px;
      margin-bottom: 50px;
      background-color: #eee;
    }
  `
}

const App = () => {
  return (
    <div css={styles.wrapper}>
      <h1>Basic Map</h1>
      <BasicMap />
    </div>
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
