/** @jsxImportSource @emotion/react */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import styles from './styles'
import Buttons from './Buttons'
import examples from './examples'
import MapComponent from './MapComponent'

const App = () => {
  const [current, setCurrent] = useState(examples[0])

  return (
    <div css={styles.wrapper}>
      <Buttons
        current={current}
        setCurrent={setCurrent}
      />

      <MapComponent
        key={current.id}
        example={current}
      />
    </div>
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
