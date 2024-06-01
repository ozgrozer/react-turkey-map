/** @jsxImportSource @emotion/react */

import styles from './styles'
import getCityColors from './getCityColors'
import populationByCities from './populationByCities'

export default ({ setColorData, setTooltipData }) => {
  const cityColors = getCityColors(populationByCities)

  const basicMapOnClick = () => {
    setColorData({})
    setTooltipData({})
  }

  const colorfulMapOnClick = () => {
    setColorData(cityColors)
    setTooltipData(populationByCities)
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
