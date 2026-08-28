/** @jsxImportSource @emotion/react */

import styles from './styles'
import examples from './examples'

export default ({ current, setCurrent }) => {
  return (
    <div css={styles.buttons}>
      {examples.map(example => {
        return (
          <button
            key={example.id}
            css={styles.button}
            onClick={() => setCurrent(example)}
            style={example.id === current.id ? { fontWeight: 'bold' } : {}}
          >
            {example.label}
          </button>
        )
      })}
    </div>
  )
}
