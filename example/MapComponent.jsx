/** @jsxImportSource @emotion/react */

// development
import TurkeyMap from './../src/TurkeyMap'
// build test
// import TurkeyMap from './../build/TurkeyMap'
// npm test
// import TurkeyMap from 'react-turkey-map'

import styles from './styles'

export default ({ example }) => {
  const onCityClick = ({ id, plate, city }) => {
    console.log('onCityClick', { id, plate, city })
  }

  const onMarkerClick = marker => {
    console.log('onMarkerClick', {
      id: marker.id,
      plate: marker.plate,
      city: marker.city
    })
  }

  // sticks to the marker through zoom and pan, because the map positions it
  const renderMarkerPopup = marker => {
    return (
      <div css={styles.popup}>
        <strong>{marker.title}</strong>
        <div css={styles.popupMeta}>
          {marker.city} ({marker.plate})
        </div>
      </div>
    )
  }

  return (
    <TurkeyMap
      {...example.props}
      onCityClick={onCityClick}
      onMarkerClick={onMarkerClick}
      renderMarkerPopup={example.markerPopup ? renderMarkerPopup : undefined}
    />
  )
}
