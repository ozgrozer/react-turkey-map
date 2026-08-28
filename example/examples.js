import markers from './markers'
import getCityColors from './getCityColors'
import populationByCities from './populationByCities'

const cityColors = getCityColors(populationByCities)

// each entry is a button in the dev app; props go straight to TurkeyMap
export default [
  {
    id: 'basic',
    label: 'Basic Map',
    props: {}
  },
  {
    id: 'colorful',
    label: 'Colorful Map',
    props: {
      colorData: cityColors,
      tooltipData: populationByCities
    }
  },
  {
    id: 'zoomable',
    label: 'Zoom, Pan & Markers',
    props: {
      markers,
      zoomable: true,
      colorData: cityColors,
      tooltipData: populationByCities
    }
  },
  {
    id: 'markers',
    label: 'Markers Only',
    // a plain map you can pan around, where only the markers respond
    markerPopup: true,
    props: {
      markers,
      zoomable: true,
      showCityTooltip: false,
      clickableCities: false
    }
  }
]
