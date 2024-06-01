/** @jsxImportSource @emotion/react */
import styles from './styles'

export default ({ setColorData, setTooltipData }) => {
  const basicMapOnClick = () => {
    setColorData({})
    setTooltipData({})
  }

  const colorfulMapOnClick = () => {
    setColorData({ '01': 'red' })
    setTooltipData({ '01': 'red' })
  }

  return (
    <div css={styles.buttons}>
      <button
        css={styles.button}
        onClick={basicMapOnClick}
      >
        Basic Map
      </button>

      <button
        css={styles.button}
        onClick={colorfulMapOnClick}
      >
        Colorful Map
      </button>
    </div>
  )
}
