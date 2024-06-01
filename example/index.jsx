import { createRoot } from 'react-dom/client'

// development
import TurkeyMap from './../src/TurkeyMap'

// build test
// import TurkeyMap from './../build/TurkeyMap'

// npm test
// import TurkeyMap from 'react-turkey-map'

const App = () => {
  const colorData = {
    '07': 'red',
    '06': 'green'
  }

  const tooltipData = {
    '07': '150',
    '06': '12'
  }

  return (
    <TurkeyMap
      colorData={colorData}
      tooltipData={tooltipData}
    />
  )
}

createRoot(document.getElementById('app'))
  .render(<App />)
